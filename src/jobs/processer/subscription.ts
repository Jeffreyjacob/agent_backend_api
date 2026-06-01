import { Job } from "bullmq";
import { SubscriptionService } from "../../module/subscription/subscription.service";
import { logger } from "../../config/logger";
import { UserRepositrory } from "../../module/users/user.repository";
import { getEmailQueue } from "../queues/email";
import { SubscriptionRepository } from "../../module/subscription/subscription.repository";
import { prisma } from "../../config/database";
import { stripe } from "../../config/stripe";
import { SubscriptionStatus } from "@prisma/client";

interface SubscriptionJobData {
  subscriptionId?: string;
  userId: string;
  featuredListingId?: string;
}

export const createSubscriptionProcessor = (
  subscriptionService: SubscriptionService,
  subscriptionRepo: SubscriptionRepository,
  userRepo: UserRepositrory,
) => {
  return async (job: Job<SubscriptionJobData>) => {
    switch (job.name) {
      case "gracePeriodExpired": {
        const { userId } = job.data;
        if (userId) return;
        logger.info({ userId }, "Grace period expired - deactivating listing");

        await subscriptionService.deactivateAgentListings(userId);

        const user = await userRepo.findById(userId);
        if (user) {
          try {
            const emailQueue = getEmailQueue();
            await emailQueue.add("email", {
              email: user.email,
              subject: "Your listing have been deactived",
              html: `<p>Dear ${user.firstName}, your subscription grace period has ended. All your listings have been deactivated. Please renew your subscription to reactivate them.</p>`,
            });
          } catch (err: any) {
            logger.warn({ err }, "unable to send grace period email");
          }
        }
        break;
      }

      case "trialEndingReminder": {
        const { subscriptionId, userId } = job.data;

        if (!subscriptionId || !userId) return;

        const user = await userRepo.findById(userId);
        const subscription = await subscriptionRepo.findById(subscriptionId);

        if (user && subscription) {
          try {
            const emailQueue = getEmailQueue();
            await emailQueue.add("email", {
              email: user.email,
              subject: "Your free trial ends in 3 days",
              html: `<p>Dear ${user.firstName}, your ${subscription.plan} free trial ends in 3 days. You will be charged $${subscription.price}/month automatically.</p>`,
            });
          } catch (error: any) {
            logger.warn({ err: error }, "unable to send trial reminder email");
          }
        }
        break;
      }

      case "featuredListingExpired": {
        const { featuredListingId } = job.data;
        if (!featuredListingId) return;

        await prisma.$transaction(async (tx) => {
          const featured = await tx.featuredListing.findUnique({
            where: { id: featuredListingId },
          });

          if (!featured || featured.status !== "ACTIVE") return;

          await tx.featuredListing.update({
            where: { id: featuredListingId },
            data: { status: "EXPIRED" },
          });

          await tx.property.update({
            where: { id: featured.propertyId },
            data: { featured: false },
          });
        });
        logger.info({ featuredListingId }, "featured listing expired");
        break;
      }

      case "reconcileSubscriptions": {
        logger.info("Stating nightly subscription reconciliation");

        const activeSubscriptions = await subscriptionRepo.findMany({
          where: {
            status: { in: ["ACTIVE", "TRIAL"] },
            stripeSubscriptionId: { not: null },
          },
        });

        let syncedCount = 0;
        let errorCount = 0;

        for (const sub of activeSubscriptions.data) {
          try {
            const stripeSub = await stripe.subscriptions.retrieve(
              sub.stripeSubscriptionId!,
            );

            const statusMap: Record<string, SubscriptionStatus> = {
              active: "ACTIVE",
              trialing: "TRIAL",
              past_due: "PAST_DUE",
              cancelled: "CANCELLED",
              incomplete: "INCOMPLETE",
            };

            const stripeStatus = statusMap[stripeSub.status] ?? sub.status;

            if (stripeStatus !== sub.status) {
              logger.warn(
                {
                  subscriptionId: sub.id,
                  dbStatus: sub.status,
                  stripeStatus,
                },
                "Status mismatch found - syncing",
              );

              await subscriptionRepo.update(
                {
                  id: sub.id,
                },
                {
                  status: stripeStatus,
                  currentPeriodEnd: new Date(
                    stripeSub.items.data[0].current_period_start * 1000,
                  ),
                  currentPeriodStart: new Date(
                    stripeSub.items.data[0].current_period_end * 1000,
                  ),
                },
              );

              syncedCount++;
            }
          } catch (error: any) {
            logger.error(
              { err: error, subscriptionId: sub.id },
              "Reconciliation error for subscription",
            );
          }

          logger.info(
            {
              total: activeSubscriptions.total,
              synced: syncedCount,
              errors: errorCount,
            },
            "Reconciliation complete",
          );

          break;
        }
      }
    }
  };
};
