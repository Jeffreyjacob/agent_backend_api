/*
  Warnings:

  - You are about to drop the column `reminderJobId` on the `Booking` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Booking" DROP COLUMN "reminderJobId";

-- CreateTable
CREATE TABLE "BookingReminderJob" (
    "id" TEXT NOT NULL,
    "reminderJobId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,

    CONSTRAINT "BookingReminderJob_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "BookingReminderJob" ADD CONSTRAINT "BookingReminderJob_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
