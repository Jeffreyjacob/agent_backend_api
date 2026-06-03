import bcrypt from "bcryptjs";
import { env } from "./config/env";
import { userRepo } from "./container";
import { logger } from "./config/logger";

async function main() {
  const hashPassword = await bcrypt.hash(env.ADMIN_PASSWORD, env.BCRYPT_ROUNDS);

  await userRepo.upsert({
    where: { email: env.ADMIN_EMAIL },
    update: {},
    create: {
      email: env.ADMIN_EMAIL,
      password: hashPassword,
      firstName: "Super",
      lastName: "Admin",
      role: "ADMIN",
      emailVerifed: true,
      isActive: true,
    },
  });

  logger.info("admin user seeded");
}

main().catch(console.error);
