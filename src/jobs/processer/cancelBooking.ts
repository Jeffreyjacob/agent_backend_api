import { Job } from "bullmq";
import { ICancelBooking } from "../workers/cancelBooking";
import { BookingRepository } from "../../module/bookings/booking.repository";
import { ensureIdempotency } from "../../shared/utils/jobIdempotency";
import { BadRequestError, NotFoundError } from "../../shared/error";
import { getEmailQueue } from "../queues/email";
import { UserRepositrory } from "../../module/users/user.repository";
import { cancelBuyerBookingEmail } from "../../shared/utils/emailTemplate/cancelBuyerBooking";

export const cancelBookingProcesser = async (
  job: Job<ICancelBooking>,
  bookingRepo: BookingRepository,
  userRepo: UserRepositrory,
) => {
  try {
    const { bookingId, buyerId, propertyTitle, propertyAddress } = job.data;
    const canProceed = await ensureIdempotency(job?.id as string);
    if (!canProceed) return;

    const result = await bookingRepo.findOne({
      id: bookingId,
      buyerId,
    });

    if (!result) throw new NotFoundError("unable to find booking");

    if (result.status !== "PENDING") return;

    const updateBooking = await bookingRepo.cancelBooking(bookingId, buyerId, {
      cancelReason: "agent did not confirmed booking on time",
    });

    if (!updateBooking) throw new BadRequestError("unable to cancel booking");

    const buyer = await userRepo.findById(buyerId);

    if (!buyer) throw new NotFoundError("unable to find buyer");

    const emailQueue = getEmailQueue();
    await emailQueue.add("email", {
      email: buyer.email,
      subject: "Booking cancelled",
      html: cancelBuyerBookingEmail({
        buyerName: `${buyer.firstName} ${buyer.lastName}`,
        bookingId: result.buyerId,
        viewingDate: result.startTime.toISOString(),
        viewingTime: "",
        cancelledAt: new Date().toISOString(),
        propertyTitle,
        propertyAddress,
      }),
    });
  } catch (err: any) {
    throw err;
  }
};
