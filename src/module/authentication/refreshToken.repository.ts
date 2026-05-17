import { Prisma, RefreshToken } from "@prisma/client";
import { BaseRepository } from "../../shared/repository/baseRepository";
import { prisma } from "../../config/database";

export class RefreshTokenRepository extends BaseRepository<
  Prisma.RefreshTokenDelegate,
  RefreshToken
> {
  constructor() {
    super(prisma.refreshToken);
  }

  async createRefreshToken(
    userId: string,
    token: string,
    expiresAt: Date,
  ): Promise<RefreshToken> {
    return this.create({ userId, token, expiresAt });
  }

  async findRefreshToken(refreshToken: string): Promise<RefreshToken | null> {
    return this.findOne({
      token: refreshToken,
    });
  }

  async deleteRefreshToken(token: string): Promise<void> {
    await this.delete({
      token,
    });
  }

  async deleteAllUserRefreshToken(userId: string): Promise<{ count: number }> {
    return this.deleteMany({
      userId,
    });
  }
}
