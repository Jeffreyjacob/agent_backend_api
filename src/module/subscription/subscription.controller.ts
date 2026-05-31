import { Request, Response } from "express";
import { SubscriptionService } from "./subscription.service";
import { ResponseHelper } from "../../shared/utils/apiResponse";

export class SubscriptionController {
  constructor(private readonly service: SubscriptionService) {}

  async setupIntent(req: Request, res: Response): Promise<void> {
    const result = await this.service.setupIntent(req.user?.userId as string);
    req.log?.info({ userId: req.user?.userId }, "user created setup intent");
    ResponseHelper.success(res, result, 200, "Setup intent created");
  }

  async confirmSubscriptionTrial(req: Request, res: Response): Promise<void> {
    const result = await this.service.confirmSubscription(
      req.user?.userId as string,
      req.body as any,
    );
    req.log?.info(
      { userId: req.user?.userId, subscriptionPlan: result.plan },
      "user confirm subscription trial",
    );
    ResponseHelper.success(
      res,
      result,
      200,
      "Subscription trial has been confirmed",
    );
  }

  async resubscribe(req: Request, res: Response): Promise<void> {
    const result = await this.service.resubscribe(
      req.user?.userId as string,
      req.body as any,
    );
    req.log?.info(
      { userId: req.user?.userId, subscriptionPlan: req.body.plan },
      "user resubscribe",
    );
    ResponseHelper.success(res, "", 200, result.message);
  }

  async getSubscription(req: Request, res: Response): Promise<void> {
    const result = await this.service.getMySubscription(
      req.user?.userId as string,
    );
    ResponseHelper.success(res, result, 200, "Subscription Fetched");
  }

  async cancelSubscription(req: Request, res: Response): Promise<void> {
    const result = await this.service.cancelSubscription(
      req.user?.userId as string,
      req.body as any,
    );
    req.log?.info({ userId: req.user?.userId }, "user cancel subscription");
    ResponseHelper.success(res, "", 200, result.message);
  }

  async resumeSubscription(req: Request, res: Response): Promise<void> {
    const result = await this.service.resumeSubscription(
      req.user?.userId as string,
    );
    req.log?.info(
      { userId: req.user?.userId as string },
      "user resume subscription",
    );
    ResponseHelper.success(res, result, 200, "Subscription has been resumed");
  }

  async changePlan(req: Request, res: Response): Promise<void> {
    const result = await this.service.changePlan(
      req.user?.userId as string,
      req.body as any,
    );
    req.log?.info(
      { userId: req.user?.userId, subscriptionPlan: result.plan },
      "user change subscription plan",
    );
  }

  async initiatePaymentMethod(req: Request, res: Response): Promise<void> {
    const result = await this.service.initiatePaymentMethod(
      req.user?.userId as string,
    );
    req.log?.info({ userId: req.user?.userId }, "user initiate payment method");
    ResponseHelper.success(res, result, 200, "Payment has been initiated");
  }

  async confirmAddPaymentMethod(req: Request, res: Response): Promise<void> {
    const result = await this.service.confirmAddPaymentMethod(
      req.user?.userId as string,
      req.body as any,
    );
    req.log?.info(
      { userId: req.user?.userId, paymentMethodId: req.body.paymenMethodId },
      "payment method has been confirmed",
    );
    ResponseHelper.success(res, "", 200, result.message);
  }

  async setDefaultPaymentMethod(req: Request, res: Response): Promise<void> {
    const result = await this.service.setDefaultPaymentMethod(
      req.user?.userId as string,
      req.body as any,
    );
    req.log?.info(
      {
        userId: req.user?.userId,
        paymentMethodId: req.body.paymenMethodId,
      },
      "payment method has been set to default",
    );
    ResponseHelper.success(res, "", 200, result.message);
  }

  async deletePaymentMethod(req: Request, res: Response): Promise<void> {
    const result = await this.service.deletePaymentMethod(
      req.user?.userId as string,
      req.body as any,
    );
    req.log?.info(
      {
        userId: req.user?.userId,
        paymentMethodId: req.body.paymenMethodId,
      },
      "payment method has been deleted",
    );
    ResponseHelper.noContent(res);
  }

  async getCustomerCards(req: Request, res: Response): Promise<void> {
    const result = await this.service.getCustomerCards(
      req.user?.userId as string,
    );
    ResponseHelper.success(
      res,
      {
        data: result,
      },
      200,
      "user payment method has been fetched",
    );
  }
}
