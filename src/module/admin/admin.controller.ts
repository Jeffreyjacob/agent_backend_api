import { Request, Response } from "express";
import { AdminService } from "./admin.service";
import { ResponseHelper } from "../../shared/utils/apiResponse";

export class AdminController {
  constructor(private readonly service: AdminService) {}

  async getUsers(req: Request, res: Response): Promise<void> {
    const result = await this.service.getUsers(req.query as any);
    ResponseHelper.success(res, result.data, 200, "users fetched", {
      total: result.total,
      page: result.page,
      totalPages: result.totalPages,
    });
  }

  async getUserById(req: Request, res: Response): Promise<void> {
    const result = await this.service.getUserById(req.params.id as string);
    ResponseHelper.success(res, result, 200, "user fetched");
  }

  async updateUserStatus(req: Request, res: Response): Promise<void> {
    const { isActive } = req.body;
    const result = await this.service.updateUserStatus(
      req.params.id as string,
      isActive,
    );
    req.log?.info(
      { userId: req.params.id, isActive },
      "admin updated user status",
    );

    ResponseHelper.success(res, "", 200, result.message);
  }

  async getProperties(req: Request, res: Response): Promise<void> {
    const result = await this.service.getProperties(req.query as any);
    ResponseHelper.success(res, result.data, 200, "properties fetched", {
      total: result.total,
      page: result.page,
      totalPages: result.totalPages,
    });
  }

  async updatePropertyStatus(req: Request, res: Response): Promise<void> {
    const { status } = req.body;
    const result = await this.service.updatePropertyStatus(
      req.params.id as string,
      status,
    );
    req.log?.info(
      { propertyId: req.params.id, status },
      "admin updated property status",
    );
    ResponseHelper.success(res, "", 200, result.message);
  }

  async getBookings(req: Request, res: Response): Promise<void> {
    const result = await this.service.getBookings(req.query as any);
    ResponseHelper.success(res, result.data, 200, "bookings fetched", {
      total: result.total,
      page: result.page,
      totalPages: result.totalPages,
    });
  }

  async getSubscriptions(req: Request, res: Response): Promise<void> {
    const result = await this.service.getSubscription(req.query as any);
    ResponseHelper.success(res, result.data, 200, "subscriptions fetched", {
      total: result.total,
      page: result.page,
      totalPages: result.totalPages,
    });
  }

  // Payments
  async getPayments(req: Request, res: Response): Promise<void> {
    const result = await this.service.getPayments(req.query as any);
    ResponseHelper.success(res, result.data, 200, "payments fetched", {
      total: result.total,
      page: result.page,
      totalPages: result.totalPages,
    });
  }

  // Webhooks
  async getWebhooks(req: Request, res: Response): Promise<void> {
    const result = await this.service.getWebhooks(req.query as any);
    ResponseHelper.success(res, result.data, 200, "webhooks fetched", {
      total: result.total,
      page: result.page,
      totalPages: result.totalPages,
    });
  }

  async replayWebhook(req: Request, res: Response): Promise<void> {
    const result = await this.service.replayWebhook(
      req.params.eventId as string,
    );
    req.log?.info({ eventId: req.params.eventId }, "admin replayed webhook");
    ResponseHelper.success(res, "", 200, result.message);
  }

  async deleteWebhook(req: Request, res: Response): Promise<void> {
    await this.service.deleteWebhook(req.params.eventId as string);
    req.log?.info({ eventId: req.params.eventId }, "admin deleted webhook");
    ResponseHelper.noContent(res);
  }

  async getOverview(req: Request, res: Response): Promise<void> {
    const result = await this.service.getOverview();
    ResponseHelper.success(res, result, 200, "overview fetched");
  }

  async getRevenueAnalytics(req: Request, res: Response): Promise<void> {
    const months = req.query.months
      ? Number(req.query.months)
      : new Date().getMonth();
    const result = await this.service.getRevenueAnalytices(months);
    ResponseHelper.success(res, result, 200, "revenue analytics fetched");
  }
}
