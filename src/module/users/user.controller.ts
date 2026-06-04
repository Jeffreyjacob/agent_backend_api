import { Request, Response } from "express";
import { UserService } from "./user.service";
import { ResponseHelper } from "../../shared/utils/apiResponse";

export class UserController {
  constructor(private readonly service: UserService) {}

  async getUser(req: Request, res: Response): Promise<void> {
    const result = await this.service.getUser(req.user?.userId!);
    ResponseHelper.success(res, result, 200, "User fetched");
  }

  async updateBuyer(req: Request, res: Response): Promise<void> {
    const result = await this.service.updateBuyerProfile(
      req.user?.userId!,
      req.body as any,
    );
    req.log?.info({ userId: result.id }, "user profile updated");
    ResponseHelper.success(res, result, 200, "user updated successfully!");
  }

  async updateAgent(req: Request, res: Response): Promise<void> {
    const result = await this.service.updateAgentProfile(
      req.user?.userId!,
      req.body as any,
    );
    req.log?.info({ userId: result.id }, "user profile updated");
    ResponseHelper.success(res, result, 200, "user updated successfully!");
  }

  async changePassword(req: Request, res: Response): Promise<void> {
    await this.service.changePassword(req.user?.userId!, req.body as any);
    req.log?.info("user change password");
    ResponseHelper.success(res, "", 200, "password changed successfully!");
  }
}
