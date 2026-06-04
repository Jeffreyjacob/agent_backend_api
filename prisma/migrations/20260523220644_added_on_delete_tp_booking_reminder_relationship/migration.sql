-- DropForeignKey
ALTER TABLE "BookingReminderJob" DROP CONSTRAINT "BookingReminderJob_bookingId_fkey";

-- AddForeignKey
ALTER TABLE "BookingReminderJob" ADD CONSTRAINT "BookingReminderJob_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
