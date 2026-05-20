import { Prisma, User } from "@prisma/client";
import { BaseRepository } from "../../shared/repository/baseRepository";
import { prisma } from "../../config/database";

export class AuthRepository extends BaseRepository<Prisma.UserDelegate, User> {
  constructor() {
    super(prisma.user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.findOne({ email });
  }

  async findByEmailAndOtp(email: string, otp: string): Promise<User | null> {
    return this.findOne({
      email,
      emailOtp: otp,
    });
  }

  async findByResetToken(resetToken: string): Promise<User | null> {
    return this.findOne({
      resetToken,
    });
  }
}
