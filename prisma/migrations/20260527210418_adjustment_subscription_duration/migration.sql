/*
  Warnings:

  - The values [YEARLY] on the enum `SubscriptionDuration` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "SubscriptionDuration_new" AS ENUM ('MONTHLY', 'QUARTERLY', 'HALF_YEAR');
ALTER TABLE "Subscription" ALTER COLUMN "duration" TYPE "SubscriptionDuration_new" USING ("duration"::text::"SubscriptionDuration_new");
ALTER TYPE "SubscriptionDuration" RENAME TO "SubscriptionDuration_old";
ALTER TYPE "SubscriptionDuration_new" RENAME TO "SubscriptionDuration";
DROP TYPE "SubscriptionDuration_old";
COMMIT;
