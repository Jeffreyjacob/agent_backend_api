import Stripe from "stripe";
import { stripe } from "../../config/stripe";
import { env } from "../../config/env";
import { logger } from "../../config/logger";
import { UnauthorizedError } from "../../shared/error";
import { prisma } from "../../config/database";
import { redis } from "../../config/redis";
import { SubscriptionRepository } from "../subscription/subscription.repository";
import {
  Prisma,
  SubscriptionDuration,
  SubscriptionStatus,
} from "@prisma/client";
import { UserRepositrory } from "../users/user.repository";
import { getSubscriptionQueue } from "../../jobs/queues/subscription";
import { getEmailQueue } from "../../jobs/queues/email";
import { trialEndingEmail } from "../../shared/utils/emailTemplate/trialEndingEmail";
import { generateSubscriptionCycleId } from "../../shared/utils/helper";
import { PropertyRepository } from "../property/property.repository";
import { PaymentRepository } from "./payment.repository";
import { IGetPaymentPayload, IPaymentListResponse } from "./payment.interface";
import { WebHookEventRepository } from "./webhookEvent.repository";
import { FeaturedListingRepository } from "../property/featuredProperty.repository";
import { PLAN_LIMITS } from "../../shared/constants/subscriptionPlans";

export class PaymentWebhookService {
  constructor(
    private readonly paymentRepo: PaymentRepository,
    private readonly subscriptionRepo: SubscriptionRepository,
    private readonly userRepo: UserRepositrory,
    private readonly propertyRepo: PropertyRepository,
    private readonly webhookEventRepo: WebHookEventRepository,
    private readonly featuredListingRepo: FeaturedListingRepository,
  ) {}

  async handleWebhook(signature: string, rawBody: Buffer): Promise<void> {
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        env.STRIPE_WEBHOOK_SECRET,
      );
    } catch (err: any) {
      logger.error({ err }, "Webhook signature verification failed");
      throw new UnauthorizedError("Invalid webhook signature");
    }

    const eventkey = `webhook:processed:${event.id}`;
    const alreadyProcessed = await redis.get(eventkey);
    if (alreadyProcessed) return;
    const existingEvent = await this.webhookEventRepo.findByEventId(event.id);

    if (existingEvent?.status === "PROCESSED") {
      logger.info({ eventId: event.id }, "Webhook already processed, skipping");
      return;
    }

    await this.webhookEventRepo.eventUpsert({
      eventId: event.id,
      eventType: event.type,
      payload: event.data.object as any,
      status: "PENDING",
    });

    try {
      switch (event.type) {
        case "customer.subscription.created":
          await this.handleSubscriptionCreated(
            event.data.object as Stripe.Subscription,
          );
          break;
        case "customer.subscription.updated":
          await this.handleSubscriptionUpdated(
            event.data.object as Stripe.Subscription,
          );
          break;
        case "customer.subscription.deleted":
          await this.handleStripeDeleted(
            event.data.object as Stripe.Subscription,
          );
          break;
        case "invoice.paid":
          await this.handleInvoicePaid(event.data.object as Stripe.Invoice);
          break;
        case "invoice.payment_failed":
          await this.handleInvoicePaymentFailed(
            event.data.object as Stripe.Invoice,
          );
          break;
        case "customer.subscription.trial_will_end":
          await this.handleTrialWillEnd(
            event.data.object as Stripe.Subscription,
          );
          break;
        case "payment_intent.succeeded":
          await this.handleFeaturedListingPayment(
            event.data.object as Stripe.PaymentIntent,
          );
          break;

        case "payment_intent.payment_failed":
          await this.handeFeaturedListingPaymentFailed(
            event.data.object as Stripe.PaymentIntent,
          );
          break;

        default:
          logger.info(
            { eventType: event.type },
            "unhandled webhook event type",
          );
      }

      await redis.set(eventkey, "1", "EX", 84600);
      await this.webhookEventRepo.updateStatus(event.id, "PROCESSED");
    } catch (error: any) {
      await this.webhookEventRepo
        .updateStatus(event.id, "FAILED", error.message)
        .catch(() => {});

      if (this.isTransientError(error)) {
        logger.warn(
          { err: error, eventId: event.id },
          "Transient webhook error",
        );
      }

      logger.fatal(
        { err: error, eventId: event.id, eventType: event.type },
        "Permantent webhook failure - manuel intevention required",
      );
    }
  }

  private async handleSubscriptionCreated(
    sub: Stripe.Subscription,
  ): Promise<void> {
    const existing = await this.subscriptionRepo.findOne({
      stripeSubscriptionId: sub.id,
    });

    if (!existing) {
      logger.warn(
        { stripeSubscriptionId: sub.id },
        "Subscription created in stripe",
      );
    }
  }

  private async handleSubscriptionUpdated(
    sub: Stripe.Subscription,
  ): Promise<void> {
    const subscription = await this.subscriptionRepo.findOne({
      stripeSubscriptionId: sub.id,
    });

    if (!subscription) {
      logger.warn(
        { stripeSubscriptionId: sub.id },
        "Subscription not found for update event",
      );
    }

    const statusMap: Record<string, SubscriptionStatus> = {
      active: SubscriptionStatus.ACTIVE,
      trialing: SubscriptionStatus.TRIAL,
      past_due: SubscriptionStatus.PAST_DUE,
      cancelled: SubscriptionStatus.CANCELLED,
      unpaid: SubscriptionStatus.PAST_DUE,
    };

    const newStatus = statusMap[sub.status] ?? subscription?.status;

    const item = sub.items.data[0];

    await this.subscriptionRepo.update(
      {
        id: subscription?.id,
      },
      {
        status: newStatus,
        currentPeriodStart: new Date(item.current_period_start * 1000),
        currentPeriodEnd: new Date(item.current_period_end * 1000),
      },
    );
  }

  private async handleStripeDeleted(sub: Stripe.Subscription): Promise<void> {
    const subscription = await this.subscriptionRepo.findOne({
      stripeSubscriptionId: sub.id,
    });

    if (!subscription) return;

    const user = await this.userRepo.findOne({
      id: subscription.userId,
    });

    const cancelledByAgent =
      sub.cancellation_details?.reason === "cancellation_requested";
    const cancalledByStripe =
      sub.cancellation_details?.reason === "payment_failed";

    if (cancalledByStripe) {
      logger.warn(
        { subscriptionId: subscription.id },
        "Subscription canlled due to payment failure",
      );

      await this.subscriptionRepo.update(
        {
          id: subscription.id,
        },
        {
          status: SubscriptionStatus.CANCELLED,
          cancelledAt: new Date(),
          gracePeriodEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          dunningFinalFailedAt: cancalledByStripe ? new Date() : null,
        },
      );

      try {
        const subQueue = getSubscriptionQueue();
        const gracePeriodDelay = 7 * 24 * 60 * 60 * 1000;

        await subQueue.add(
          "gracePeriodExpired",
          {
            subscriptionId: subscription.id,
            userId: subscription.userId,
          },
          {
            delay: gracePeriodDelay,
          },
        );
      } catch (error: any) {
        logger.warn({ err: error }, "unable to schedule grace preiod job");
      }

      if (user) {
        try {
          const emailQueue = getEmailQueue();
          await emailQueue.add("email", {
            email: user.email,
            subject: "Your subscription has been cancelled",
            html: `<p>Dear ${user.firstName}, your subscription has been cancelled. You have a 7-day grace period to subscribe again before your listings are deactivated.</p>`,
          });
        } catch (error: any) {
          logger.warn({ err: error }, "unable to send cancellation email");
        }
      }
    }

    await this.subscriptionRepo.update(
      {
        id: subscription.id,
      },
      {
        status: SubscriptionStatus.CANCELLED,
        cancelledAt: new Date(),
        dunningFinalFailedAt: cancalledByStripe ? new Date() : null,
      },
    );

    if (user) {
      try {
        const emailQueue = getEmailQueue();
        await emailQueue.add("email", {
          email: user.email,
          subject: "Your subscription has been cancelled",
          html: `<p>Dear ${user.firstName}, your subscription has been cancelled. All your listing are now inactive, Please subscribe to continue using our features</p>`,
        });
      } catch (error: any) {
        logger.warn({ err: error }, "unable to send cancellation email");
      }
    }
  }

  private async handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
    const subscriptionId = invoice.parent?.subscription_details?.subscription;
    if (!subscriptionId) return;

    const subscription = await this.subscriptionRepo.findOne({
      stripeSubscriptionId: subscriptionId as string,
    });

    if (!subscription) return;

    invoice.lines.data[0].period.end;
    const newPeriodStart = new Date(invoice.lines.data[0].period.start * 1000);
    const newPeriodEnd = new Date(invoice.lines.data[0].period.end * 1000);

    const subscriptionCycleId = generateSubscriptionCycleId(
      subscriptionId as string,
      newPeriodStart,
    );

    const planLimit = PLAN_LIMITS[subscription.plan];

    const durationMap: Record<SubscriptionDuration, number> = {
      [SubscriptionDuration.MONTHLY]: 1,
      [SubscriptionDuration.QUARTERLY]: 3,
      [SubscriptionDuration.HALF_YEAR]: 6,
    };

    await this.subscriptionRepo.update(
      {
        id: subscription.id,
      },
      {
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: newPeriodStart,
        currentPeriodEnd: newPeriodEnd,
        maxProperties:
          subscription.plan === "BASIC"
            ? (planLimit.maxProperties ??
              1 * durationMap[subscription.duration])
            : null,
        maxFeatureListings:
          planLimit.maxFeaturedListings * durationMap[subscription.duration],
        dunningAttempts: 0,
        subscriptionCycleId,
        dunningLastAttempts: null,
        gracePeriodEnd: null,
      },
    );

    await prisma.packageRecord.create({
      data: {
        userId: subscription.userId,
        subscriptionId: subscription.id,
        stripeSubscriptionid: subscriptionId as string,
        subscriptionCycleId,
        plan: subscription.plan,
        isTrial: false,
        startDate: newPeriodEnd,
        endDate: newPeriodEnd,
      },
    });

    await this.paymentRepo.create({
      userId: subscription.userId,
      subscriptionId: subscription.id,
      type: "SUBSCRIPTION",
      status: "SUCCEEDED",
      amount: invoice.amount_paid / 100,
      currency: invoice.currency,
      stripePaymentId: invoice.id,
      description: `${subscription.plan} subscription - ${newPeriodStart.toLocaleDateString()}`,
    });

    if (subscription.status === SubscriptionStatus.PAST_DUE) {
      await this.propertyRepo.updateMany({
        where: {
          agentId: subscription.userId,
          status: "INACTIVE",
        },
        data: {
          status: "ACTIVE",
        },
      });

      const user = await this.userRepo.findOne({
        id: subscription.userId,
      });

      if (user) {
        try {
          const emailQueue = getEmailQueue();
          await emailQueue.add("email", {
            email: user.email,
            subject: "Payment recieved - Thank you !",
            html: `<p>Dear ${user.firstName}, we received your payment of $${invoice.amount_paid / 100} for your ${subscription.plan} subscription.</p>`,
          });
        } catch (err: any) {
          logger.warn({ err }, "unable to send receipt email");
        }
      }
    }
  }

  private async handleInvoicePaymentFailed(
    invoice: Stripe.Invoice,
  ): Promise<void> {
    const subscriptionId = invoice.parent?.subscription_details?.subscription;
    if (!subscriptionId) return;

    const subscription = await this.subscriptionRepo.findOne({
      stripeSubscriptionId: subscriptionId as string,
    });

    if (!subscription) return;

    const newDunningAttempts = (subscription.dunningAttempts ?? 0) + 1;

    await this.subscriptionRepo.update(
      {
        id: subscription.id,
      },
      {
        status: SubscriptionStatus.PAST_DUE,
        dunningAttempts: newDunningAttempts,
        dunningLastAttempts: new Date(),
      },
    );

    await this.paymentRepo.create({
      userId: subscription.userId,
      subscriptionId: subscription.id,
      type: "SUBSCRIPTION",
      status: "FAILED",
      amount: invoice.amount_paid / 100,
      currency: invoice.currency,
      description: `Failed payment attempt ${newDunningAttempts}`,
    });

    const user = await this.userRepo.findOne({
      id: subscription.userId,
    });

    if (user) {
      try {
        const emailQueue = getEmailQueue();
        await emailQueue.add("email", {
          email: user.email,
          subject: "Payment failed — Please update your card",
          html: `<p>Dear ${user.firstName}, we were unable to process your payment. This is attempt ${newDunningAttempts}. Please update your payment method to avoid service interruption.</p>`,
        });
      } catch (err: any) {
        logger.warn({ err }, "unable to send payment failed email");
      }
    }
  }

  private async handleTrialWillEnd(sub: Stripe.Subscription): Promise<void> {
    const subscription = await this.subscriptionRepo.findOne({
      stripeSubscriptionId: sub.id,
    });

    if (!subscription) return;

    const user = await this.userRepo.findOne({
      id: subscription?.userId,
    });

    if (user) {
      try {
        const emailQueue = getEmailQueue();
        await emailQueue.add("email", {
          email: user.email,
          subject: "Your free trial ends in 3 days",
          html: trialEndingEmail({
            firstName: user.firstName,
            trialEndDate: new Date(sub.trial_end! * 1000).toLocaleDateString(
              "en-GB",
            ),
            plan: subscription.plan,
            price: subscription.price,
          }),
        });
      } catch (error: any) {
        logger.warn({ err: error }, "unable to send trial ending email");
      }
    }
  }

  private async handleFeaturedListingPayment(
    paymentIntent: Stripe.PaymentIntent,
  ): Promise<void> {
    const { propertyId, agentId, type } = paymentIntent.metadata;

    if (type !== "featured_listing") {
      logger.info("skipped payment Intent ");
      return;
    }
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const featured = await prisma.$transaction(async (tx) => {
      const featuredListing = await tx.featuredListing.create({
        data: {
          propertyId,
          agentId,
          status: "ACTIVE",
          amountPaid: paymentIntent.amount / 100,
          stripePaymentId: paymentIntent.id,
          startDate: new Date(),
          expiresAt,
        },
      });

      await tx.property.update({
        where: { id: propertyId },
        data: { featured: true },
      });

      await tx.payment.create({
        data: {
          userId: agentId,
          type: "FEATURED_LISTING",
          status: "SUCCEEDED",
          amount: paymentIntent.amount / 100,
          currency: paymentIntent.currency,
          stripePaymentId: paymentIntent.id,
          description: `Featured listing payment`,
        },
      });

      const subscription = await tx.subscription.findFirst({
        where: { userId: agentId },
      });

      if (subscription) {
        await tx.packageRecord.update({
          where: { subscriptionCycleId: subscription.subscriptionCycleId! },
          data: {
            featuredListingsUsed: { increment: 1 },
          },
        });
      }

      return featuredListing;
    });

    try {
      const subQueue = getSubscriptionQueue();
      const expiryDelay = expiresAt.getTime() - Date.now();

      const expiryJob = await subQueue.add(
        "featuredListingExpired",
        {
          propertyId,
          agentId,
        },
        {
          delay: expiryDelay,
        },
      );

      await this.featuredListingRepo.update(
        {
          id: featured.id,
        },
        {
          expiryJobId: expiryJob.id,
        },
      );
    } catch (error: any) {
      logger.warn(
        { err: error },
        "unable to schedule featured listing expiry job",
      );
    }

    const user = await this.userRepo.findById(agentId);
    const property = await this.propertyRepo.findById(propertyId);

    if (user && property) {
      try {
        const emailQueue = getEmailQueue();
        await emailQueue.add("email", {
          email: user.email,
          subject: "Your property is now featured!",
          html: `<p>Dear ${user.firstName}, your property "${property.title}" is now featured for 30 days.</p>`,
        });
      } catch (err: any) {
        logger.warn({ err }, "unable to send featured listing email");
      }
    }
  }

  private async handeFeaturedListingPaymentFailed(
    paymentIntent: Stripe.PaymentIntent,
  ): Promise<void> {
    if (paymentIntent.metadata.type !== "featured_listing") return;

    const { agentId, propertyId } = paymentIntent.metadata;

    await this.paymentRepo.create({
      userId: agentId,
      type: "FEATURED_LISTING",
      status: "FAILED",
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
      description: "Failed featured listing payment",
    });

    const user = await this.userRepo.findById(agentId);
    if (user) {
      try {
        const emailQueue = getEmailQueue();
        await emailQueue.add("email", {
          email: user.email,
          subject: "Featured listing payment failed",
          html: `<p>Dear ${user.firstName}, your featured listing payment failed. Please try again.</p>`,
        });
      } catch (err: any) {
        logger.warn({ err }, "unable to send payment failed email");
      }
    }
  }

  private isTransientError(err: any): boolean {
    if (err instanceof Prisma.PrismaClientInitializationError) return true;
    if (err instanceof Prisma.PrismaClientRustPanicError) return true;
    if (err instanceof Prisma.PrismaClientKnownRequestError) return false;
    if (err instanceof Prisma.PrismaClientValidationError) return false;

    return true;
  }

  async getPayments(
    userId: string,
    data: IGetPaymentPayload,
  ): Promise<IPaymentListResponse> {
    return await this.paymentRepo.getPayments(userId, data);
  }
}
