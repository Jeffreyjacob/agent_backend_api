import { BadRequestError, NotFoundError } from "../../shared/error";
import { UserRepositrory } from "./user.repository";
import {
  IChangePassword,
  IGetUserProfileResponse,
  IUpdateAgentPayload,
  IUpdateAgentResponse,
  IUpdateBuyerPayload,
  IUpdateBuyerResponse,
} from "./user.interface";
import bcrypt from "bcryptjs";
import { env } from "../../config/env";

export class UserService {
  constructor(private readonly userRepo: UserRepositrory) {}

  async getUser(userId: string): Promise<IGetUserProfileResponse> {
    const user = await this.userRepo.findUserById(userId);
    if (!user) throw new NotFoundError("unable to find user");
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      defaultViewingDuration:
        user.role === "AGENT" ? user.defaultViewingDuration : null,
      isActive: user.isActive,
    };
  }

  async updateBuyerProfile(
    userId: string,
    data: IUpdateBuyerPayload,
  ): Promise<IUpdateBuyerResponse> {
    const updateUser = await this.userRepo.updateBuyerInfo(userId, data);

    if (!updateUser) throw new BadRequestError("unable to update user profile");
    return {
      id: updateUser.id,
      firstName: updateUser.firstName,
      lastName: updateUser.lastName,
    };
  }

  async updateAgentProfile(
    userId: string,
    data: IUpdateAgentPayload,
  ): Promise<IUpdateAgentResponse> {
    const updateUser = await this.userRepo.updateAgentInfo(userId, data);
    if (!updateUser) throw new BadRequestError("unbale to update user");
    return {
      id: updateUser.id,
      firstName: updateUser.firstName,
      lastName: updateUser.lastName,
      defaultViewingDuration: updateUser.defaultViewingDuration,
    };
  }

  async changePassword(
    userId: string,
    data: IChangePassword,
  ): Promise<{ message: string }> {
    const user = await this.userRepo.findById(userId);

    if (!user) throw new NotFoundError("unable to find user");

    const comparePassword = await bcrypt.compare(
      data.currentPassword,
      user.password,
    );

    if (!comparePassword)
      throw new BadRequestError("Incorrect current password");

    const newHashedPassword = await bcrypt.hash(
      data.newPassword,
      env.BCRYPT_ROUNDS,
    );

    const updateUser = await this.userRepo.updatePassword(
      user.id,
      newHashedPassword,
    );

    if (!updateUser) throw new BadRequestError("unable to update password");

    return {
      message: "Password changed successfully!",
    };
  }
}
