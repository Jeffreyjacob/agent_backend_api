import { Role } from "@prisma/client";
import { AuthRepository } from "./auth.repository";
import { RefreshTokenRepository } from "./refreshToken.repository";
import {
  IAgentRegisterPayload,
  IAuthMessageResponse,
  IBuyerRegistrationPayload,
  IForgetPasswordPayload,
  ILoginPayload,
  ILoginResponse,
  IRefreshTokenResponse,
  IResendOtpPayload,
  IResetPasswordPayload,
  IVerifyEmailPayload,
} from "./auth.interface";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  TooManyRequestsError,
  UnauthorizedError,
} from "../../shared/error";
import {
  generateOtp,
  generateToken,
  hashToken,
} from "../../shared/utils/helper";
import { getEmailQueue } from "../../jobs/queues/email";
import {
  resetPasswordEmailTemplate,
  verifyEmailTemplate,
} from "../../shared/utils/emailTemplate/verifyEmail";
import { logger } from "../../config/logger";
import bcrypt from "bcryptjs";
import { env } from "../../config/env";
import { redis } from "../../config/redis";
import { generateAccessToken } from "../../shared/utils/tokenUtil";
import jwt from "jsonwebtoken";

export class AuthService {
  constructor(
    private readonly authRepo: AuthRepository,
    private refreshTokenRepo: RefreshTokenRepository,
  ) {}

  async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, env.BCRYPT_ROUNDS);
  }

  async comparedPassword(
    candidatePassword: string,
    password: string,
  ): Promise<boolean> {
    return await bcrypt.compare(candidatePassword, password);
  }

  private async registerUser(
    data: IBuyerRegistrationPayload,
    role: Role,
  ): Promise<IAuthMessageResponse> {
    const userAlreadyExist = await this.authRepo.exists({ email: data.email });
    if (userAlreadyExist)
      throw new ConflictError("user with email already exist");

    const otp = generateOtp();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    const hashed = await this.hashPassword(data.password);

    const user = await this.authRepo.create({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      password: hashed,
      emailOtp: otp,
      emailOtpExpiresAt: expiresAt,
      role,
    });

    try {
      const emailQueue = getEmailQueue();
      await emailQueue.add("email", {
        email: user.email,
        subject: "verify Email",
        html: verifyEmailTemplate(otp, user.firstName),
      });
    } catch (error: any) {
      logger.warn({ err: error }, "unable to add email job to queue");
    }

    return {
      message: "User accout has been created successfully",
    };
  }

  async registerBuyer(
    data: IBuyerRegistrationPayload,
  ): Promise<IAuthMessageResponse> {
    return this.registerUser(data, Role.BUYER);
  }

  async registerAgent(
    data: IAgentRegisterPayload,
  ): Promise<IAuthMessageResponse> {
    return this.registerUser(data, Role.AGENT);
  }

  async verifyEmail(data: IVerifyEmailPayload): Promise<IAuthMessageResponse> {
    const user = await this.authRepo.findByEmailAndOtp(data.email, data.otp);
    if (!user) throw new UnauthorizedError("Invalid token");

    if (user.emailOtpExpiresAt && new Date(user.emailOtpExpiresAt) < new Date())
      throw new UnauthorizedError("Expired token");

    if (user.emailVerifed) throw new BadRequestError("user has been verified");

    await this.authRepo.update(
      { id: user.id },
      {
        emailVerifed: true,
        emailOtpExpiresAt: null,
        emailOtp: null,
      },
    );

    return {
      message: "User email has been verified",
    };
  }

  async resendVerifyEmail(
    data: IResendOtpPayload,
  ): Promise<IAuthMessageResponse> {
    const user = await this.authRepo.findByEmail(data.email);
    if (!user) throw new NotFoundError("unable to find user");

    if (user.emailVerifed)
      throw new BadRequestError("user email already verified");

    const cooldownkey = `cooldown:resendOtp:${user.id}`;
    const cooldown = await redis.get(cooldownkey);

    if (cooldown) {
      const remainingTtl = await redis.ttl(cooldownkey);
      throw new TooManyRequestsError(
        `Please wait ${remainingTtl} second before requesting again`,
      );
    }

    const otp = generateOtp();
    const otpExpiresAt = new Date();
    otpExpiresAt.setMinutes(otpExpiresAt.getMinutes() + 15);

    await this.authRepo.update(
      { id: user.id },
      {
        emailOtp: otp,
        emailOtpExpiresAt: otpExpiresAt,
      },
    );

    try {
      const emailQueue = getEmailQueue();
      await emailQueue.add("email", {
        email: user.email,
        subject: "Verify Email",
        html: verifyEmailTemplate(otp, user.firstName),
      });
    } catch (err: any) {
      logger.warn({ err }, "unable to add email job to queue");
    }

    await redis.set(cooldownkey, "1", "EX", 15 * 60);

    return {
      message: "Otp has been sent to your email",
    };
  }

  async login(data: ILoginPayload): Promise<ILoginResponse> {
    const user = await this.authRepo.findByEmail(data.email);

    if (!user)
      throw new UnauthorizedError("Invalid credentials, Please try again");

    const compare = await this.comparedPassword(data.password, user.password);

    if (!compare)
      throw new UnauthorizedError("Invalid credentials, Please try again");

    if (!user.emailVerifed)
      throw new UnauthorizedError("email has not been verified");

    if (!user.isActive)
      throw new UnauthorizedError("useer is disable, Please contact admin ");

    const accessToken = generateAccessToken(user);
    const refreshToken = generateToken();
    const refreshTokenExpiresAt = new Date();
    refreshTokenExpiresAt.setDate(
      refreshTokenExpiresAt.getDate() + env.REFRESHTOKEN_EXPIRES_IN,
    );

    await this.refreshTokenRepo.create({
      userId: user.id,
      token: hashToken(refreshToken),
      expiresAt: refreshTokenExpiresAt,
    });

    await this.authRepo.update({ id: user.id }, { lastLogin: new Date() });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      accessToken,
      refreshToken,
    };
  }

  async forgetPassword(
    data: IForgetPasswordPayload,
  ): Promise<IAuthMessageResponse> {
    const user = await this.authRepo.findByEmail(data.email);

    if (!user)
      return {
        message:
          "A link would be sent to your email, if this email belong to an account in our system",
      };

    const cooldownKey = `cooldown:forgetPassword:${user.id}`;
    const onCooldown = await redis.get(cooldownKey);

    if (onCooldown) {
      const remainingTtl = await redis.ttl(cooldownKey);
      throw new TooManyRequestsError(
        `Please wait ${Math.ceil(remainingTtl / 60)} minutes before requesting again`,
      );
    }

    const resetToken = generateToken();
    const hashed = hashToken(resetToken);

    const resetTokenExpiresAt = new Date();
    resetTokenExpiresAt.setHours(resetTokenExpiresAt.getHours() + 1);

    await this.authRepo.update(
      { id: user.id },
      { resetToken: hashed, resetTokenExpiresAt },
    );

    const url = `${env.FRONTENDURL}/reset-password?token=${resetToken}`;

    try {
      const emailQueue = getEmailQueue();
      await emailQueue.add("email", {
        email: user.email,
        subject: "Forget Password Link",
        html: resetPasswordEmailTemplate(url, user.firstName),
      });
    } catch (error: any) {
      logger.warn({ err: error }, "unable to add email job to queue");
    }

    await redis.set(cooldownKey, "1", "EX", 60 * 60);

    return {
      message:
        "A link would be sent to your email, if this email belong to an account in our system",
    };
  }

  async resetPassword(
    data: IResetPasswordPayload,
  ): Promise<IAuthMessageResponse> {
    const user = await this.authRepo.findByResetToken(
      hashToken(data.resetToken),
    );

    if (!user)
      throw new UnauthorizedError("Invalid reset token, Please try again");

    if (
      user.resetTokenExpiresAt &&
      new Date(user.resetTokenExpiresAt) < new Date()
    )
      throw new UnauthorizedError("Expired reset token,Please try again");

    const hash = await this.hashPassword(data.newPassword);
    await this.authRepo.update(
      { id: user.id },
      {
        password: hash,
        resetToken: null,
        resetTokenExpiresAt: null,
      },
    );

    await this.refreshTokenRepo.deleteAllUserRefreshToken(user.id);

    return {
      message: "Password has been resetted successfully!",
    };
  }

  async refreshToken(refreshToken: string): Promise<IRefreshTokenResponse> {
    const findRefreshToken = await this.refreshTokenRepo.findRefreshToken(
      hashToken(refreshToken),
    );
    if (!findRefreshToken) throw new UnauthorizedError("Invalid refresh token");
    if (
      findRefreshToken.expiresAt &&
      new Date(findRefreshToken.expiresAt) < new Date()
    )
      throw new UnauthorizedError("Expired Refresh token");

    const user = await this.authRepo.findById(findRefreshToken.userId);
    if (!user) throw new NotFoundError("unable to find user");

    const accessToken = generateAccessToken(user);
    const newRefreshToken = generateToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + env.REFRESHTOKEN_EXPIRES_IN);

    await this.refreshTokenRepo.deleteRefreshToken(findRefreshToken.token);
    await this.refreshTokenRepo.create({
      token: hashToken(newRefreshToken),
      userId: user.id,
      expiresAt,
    });

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(
    accessToken: string,
    refreshToken: string,
  ): Promise<IAuthMessageResponse> {
    await this.refreshTokenRepo.deleteRefreshToken(hashToken(refreshToken));

    const decoded = jwt.decode(accessToken) as { exp: number };
    const remainingSeconds = decoded.exp - Math.floor(Date.now() / 1000);

    if (remainingSeconds > 0) {
      try {
        await redis.set(
          `BlacklistToken:${accessToken}`,
          "1",
          "EX",
          remainingSeconds,
        );
      } catch (error: any) {
        logger.warn({ err: error }, "unable to blacklist token");
      }
    }

    return {
      message: "user has been logged out",
    };
  }
}
