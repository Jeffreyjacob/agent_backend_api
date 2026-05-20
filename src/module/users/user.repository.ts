import { Prisma, Role, User } from "@prisma/client";
import { BaseRepository } from "../../shared/repository/baseRepository";
import { prisma } from "../../config/database";
import { IUpdateAgentPayload, IUpdateBuyerPayload } from "./user.interface";

export class UserRepositrory extends BaseRepository<Prisma.UserDelegate, User> {
  constructor() {
    super(prisma.user);
  }

  async findUserById(userId: string): Promise<User | null> {
    return await this.findById(userId);
  }

  async updateAgentInfo(
    userId: string,
    data: IUpdateAgentPayload,
  ): Promise<User | null> {
    return await this.update(
      { id: userId },
      {
        ...data,
      },
    );
  }

  async updateBuyerInfo(
    userId: string,
    data: IUpdateBuyerPayload,
  ): Promise<User | null> {
    return await this.update(
      { id: userId },
      {
        ...data,
      },
    );
  }

  async updatePassword(
    userId: string,
    newPassword: string,
  ): Promise<User | null> {
    return await this.update(
      { id: userId },
      {
        password: newPassword,
      },
    );
  }
}
