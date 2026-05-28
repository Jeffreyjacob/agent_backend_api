import { Job } from "bullmq";
import { SubscriptionService } from "../../module/subscription/subscription.service";
import { logger } from "../../config/logger";

interface SubscriptionJobData {
  subscriptionId?: string;
  userId: string;
  featuredListingId?: string;
}

export const createSubscriptionProcessor = (
  subscriptionService: SubscriptionService,
) => {
  return async (job: Job<SubscriptionJobData>) => {
    switch (job.name) {
      case "gracePeriodExpired":
        {
          const { userId } = job.data;
          if (userId) return;
          logger.info(
            { userId },
            "Grace period expired - deactivating listing",
          );

          await subscriptionService.
        }
        break;
    }
  };
};
