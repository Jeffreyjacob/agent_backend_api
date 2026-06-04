// src/seed.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { env } from "./config/env";

const prisma = new PrismaClient();

async function main() {
  console.log("Running seed...");

  // upsert = update if exists, create if not
  // this makes the seed safe to run multiple times
  const admin = await prisma.user.upsert({
    where: {
      email: env.ADMIN_EMAIL,
    },
    update: {},
    // update is empty — if admin exists, don't change anything
    create: {
      email: env.ADMIN_EMAIL,
      password: await bcrypt.hash(env.ADMIN_PASSWORD, env.BCRYPT_ROUNDS),
      role: "ADMIN",
      firstName: "Admin",
      lastName: "User",
    },
  });

  console.log("Admin user ready:", admin.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
