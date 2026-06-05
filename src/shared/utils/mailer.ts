import { env } from "../../config/env";
import { logger } from "../../config/logger";
import { Resend } from "resend";

const resend = new Resend(env.RESEND_API_KEY);

export const sendMails = async ({
  to,
  subject,
  message,
  html,
}: {
  to: string;
  subject: string;
  message?: string;
  html?: any;
}) => {
  try {
    await resend.emails.send({
      from: env.EMAIL_FROM,
      to,
      subject,
      ...(message && { text: message }),
      ...(html && { html }),
    });
  } catch (error: any) {
    logger.error({ err: error }, "Unable to send email");
    throw error;
  }
};
