import { Prisma, Subscription, SubscriptionStatus } from "@prisma/client";
import { prisma } from "../../config/database";
import { BaseRepository } from "../../shared/repository/baseRepository";

export class SubscriptionRepository extends BaseRepository<
  Prisma.SubscriptionDelegate,
  Subscription
> {
  constructor() {
    super(prisma.subscription);
  }

  async findByUser(userId: string): Promise<Subscription | null> {
    return this.findOne({ userId });
  }

  async findByStripeSubscriptionId(
    stripeSubscriptionId: string,
  ): Promise<Subscription | null> {
    return this.findOne({ stripeSubscriptionId });
  }

  async findActiveSubscriptions(): Promise<Subscription[]> {
    const result = await this.findMany({
      where: {
        status: {
          in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL],
        },
        stripeSubscriptionId: { not: null },
      },
    });

    return result.data;
  }

  async syncFromStripe(
    stripeSubscriptionId: string,
    data: Partial<Subscription>,
  ): Promise<Subscription | null> {
    return this.update({ stripeSubscriptionId }, data);
  }
}
