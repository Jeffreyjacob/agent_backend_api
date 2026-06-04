import { Job } from "bullmq";
import { ensureIdempotency } from "../../shared/utils/jobIdempotency";
import { sendMails } from "../../shared/utils/mailer";

interface IEmail {
  email: string;
  subject: string;
  html?: any;
  message?: string;
}

export const emailProcesser = async (job: Job<IEmail>) => {
  const { email, subject, html, message } = job.data;
  const canProceed = await ensureIdempotency(job?.id!, "email");
  if (!canProceed) return;
  await sendMails({
    to: email,
    subject,
    ...(html && { html }),
    ...(message && { message }),
  });
};
