import { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { ResponseHelper } from "../../shared/utils/apiResponse";
import { setRefreshToken } from "../../shared/utils/tokenUtil";
import { env } from "../../config/env";

export class AuthController {
  constructor(private readonly service: AuthService) {}

  async registerBuyer(req: Request, res: Response): Promise<void> {
    const result = await this.service.registerBuyer(req.body as any);
    req.log?.info("buyer created successfully");
    ResponseHelper.created(res, "", result.message);
  }

  async registerAgent(req: Request, res: Response): Promise<void> {
    const result = await this.service.registerAgent(req.body as any);
    req.log?.info("agent created successfully");
    ResponseHelper.created(res, "", result.message);
  }

  async verifyEmail(req: Request, res: Response): Promise<void> {
    const result = await this.service.verifyEmail(req.body as any);
    req.log?.info("user email has been verifed");
    ResponseHelper.success(res, "", 200, result.message);
  }

  async resendEmailOtp(req: Request, res: Response): Promise<void> {
    const result = await this.service.resendVerifyEmail(req.body as any);
    req.log?.info("email otp has been sent");
    ResponseHelper.success(res, "", 200, result.message);
  }

  async login(req: Request, res: Response): Promise<void> {
    const result = await this.service.login(req.body as any);
    req.log?.info(
      { userId: result.user.id, email: result.user.email },
      "user logged in",
    );
    setRefreshToken({
      res,
      refreshToken: result.refreshToken,
      expiresAt: env.REFRESHTOKEN_EXPIRES_IN,
    });

    ResponseHelper.success(
      res,
      { user: result.user, accessToken: result.accessToken },
      201,
      "user logged in",
    );
  }

  async forgetPassword(req: Request, res: Response): Promise<void> {
    const result = await this.service.forgetPassword(req.body as any);
    req.log?.info("user request password reset");
    ResponseHelper.success(res, "", 200, result.message);
  }

  async resetPassword(req: Request, res: Response): Promise<void> {
    const result = await this.service.resetPassword(req.body as any);
    req.log?.info("reset password successfully!");
    ResponseHelper.success(res, "", 200, result.message);
  }

  async refreshToken(req: Request, res: Response): Promise<void> {
    const refreshToken = req.cookies[env.REFRESHTOKEN_NAME];
    const result = await this.service.refreshToken(refreshToken);
    setRefreshToken({
      res,
      refreshToken: result.refreshToken,
      expiresAt: env.REFRESHTOKEN_EXPIRES_IN,
    });
    ResponseHelper.success(
      res,
      { accessToken: result.accessToken },
      200,
      "Access token refreshed",
    );
  }

  async logout(req: Request, res: Response): Promise<void> {
    const refreshToken = req.cookies[env.REFRESHTOKEN_NAME];
    const result = await this.service.logout(req.token!, refreshToken);
    res.clearCookie(env.REFRESHTOKEN_NAME);
    req.log?.info("user logged out");
    ResponseHelper.success(res, "", 200, result.message);
  }
}
