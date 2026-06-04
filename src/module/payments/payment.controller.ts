import { Request, Response } from "express";
import { PaymentWebhookService } from "./payment.service";
import { ResponseHelper } from "../../shared/utils/apiResponse";

export class PaymentController {
  constructor(private readonly service: PaymentWebhookService) {}

  async getPayments(req: Request, res: Response): Promise<void> {
    const result = await this.service.getPayments(
      req.user?.userId as string,
      req.query as any,
    );
    ResponseHelper.success(
      res,
      result.data,
      200,
      "payment fetched",
      result.meta,
    );
  }
  async handleWebhook(req: Request, res: Response): Promise<void> {
    const signature = req.headers["stripe-signature"] as string;
    const rawBody = req.body as Buffer;
    await this.service.handleWebhook(signature, rawBody);
    res.status(200).json({ recieved: true });
  }
}
