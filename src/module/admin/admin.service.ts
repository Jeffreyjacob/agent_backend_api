import { PropertyStatus, Role } from "@prisma/client";
import { BadRequestError, NotFoundError } from "../../shared/error";
import { PaymentWebhookService } from "../payments/payment.service";
import { SubscriptionService } from "../subscription/subscription.service";
import { UserRepositrory } from "../users/user.repository";
import {
  IGetBookingsQuery,
  IGetPaymentsQuery,
  IGetPropertiesQuery,
  IGetSubscriptionsQuery,
  IGetUserQuery,
  IGetWebhooksQuery,
} from "./admin.interface";
import { AdminRepository } from "./admin.repository";
import { logger } from "../../config/logger";
import { PropertyRepository } from "../property/property.repository";
import { WebHookEventRepository } from "../payments/webhookEvent.repository";

export class AdminService {
  constructor(
    private readonly adminRepo: AdminRepository,
    private readonly webhookService: PaymentWebhookService,
    private readonly subscriptionService: SubscriptionService,
    private readonly userRepo: UserRepositrory,
    private readonly propertyRepo: PropertyRepository,
    private readonly webhookRepo: WebHookEventRepository,
  ) {}

  async getUsers(query: IGetUserQuery) {
    return this.adminRepo.getUsers(query);
  }

  async getUserById(userId: string) {
    const user = await this.adminRepo.getUserById(userId);
    if (!user) throw new NotFoundError("unable to find user");
    return user;
  }

  async updateUserStatus(userId: string, isActive: boolean) {
    const user = await this.userRepo.findById(userId);

    if (!user) throw new NotFoundError("unable to find user");

    if (user.role === Role.ADMIN)
      throw new BadRequestError("Cannot deactivate admin accounts");

    await this.userRepo.update(
      {
        id: userId,
      },
      {
        isActive,
      },
    );

    if (!isActive && user.role === Role.AGENT) {
      await this.subscriptionService.deactivateAgentListings(userId);
      logger.info({ userId }, "Agent deactivated  - listing deactivated");
    }

    return {
      message: isActive
        ? "user account activated successfully"
        : "User account deactivated successfully",
    };
  }

  async getProperties(query: IGetPropertiesQuery) {
    return this.adminRepo.getProperties(query);
  }

  async updatePropertyStatus(propertyId: string, status: PropertyStatus) {
    const property = await this.propertyRepo.findById(propertyId);

    if (!property) throw new NotFoundError("unable to find property");

    await this.propertyRepo.update(
      {
        id: propertyId,
      },
      {
        status,
      },
    );

    logger.info(
      {
        propertyId,
        status,
        adminAction: true,
      },
      "Admin updated property status",
    );

    return {
      message: `Property status updated to ${status}`,
    };
  }

  async getBookings(query: IGetBookingsQuery) {
    return this.adminRepo.getBooking(query);
  }

  async getSubscription(query: IGetSubscriptionsQuery) {
    return this.adminRepo.getSubscriptions(query);
  }

  async getPayments(query: IGetPaymentsQuery) {
    return this.adminRepo.getPayments(query);
  }

  async getWebhooks(query: IGetWebhooksQuery) {
    return this.adminRepo.getWebhooks(query);
  }

  async replayWebhook(eventId: string): Promise<{ message: string }> {
    const webhookEvent = await this.webhookRepo.findByEventId(eventId);

    if (!webhookEvent) throw new NotFoundError("webhook event not found");

    if (webhookEvent.status === "PROCESSED") {
      throw new BadRequestError("Webhook already processed successfully");
    }

    await this.webhookRepo.update(
      {
        eventId,
      },
      {
        status: "PENDING",
      },
    );

    await this.webhookService.reprocessStoredEvent(
      eventId,
      webhookEvent.eventType,
      webhookEvent.payload,
    );

    logger.info({ eventId, adminAction: true }, "Admin replayed webhook");

    return { message: "Webhook replayed successfully" };
  }

  async deleteWebhook(eventId: string): Promise<void> {
    const webhook = await this.webhookRepo.findByEventId(eventId);

    if (!webhook) throw new NotFoundError("webhook not found");

    await this.webhookRepo.delete({ eventId });
  }

  async getOverview() {
    return this.adminRepo.getOverview();
  }

  async getRevenueAnalytices(months?: number) {
    return this.adminRepo.getRevenueAnalytics(months);
  }
}
