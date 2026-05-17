-- DropIndex
DROP INDEX "User_emailOtp_emailVerifed_emailOtpExpiresAt_idx";

-- CreateIndex
CREATE INDEX "User_email_emailOtp_emailVerifed_emailOtpExpiresAt_idx" ON "User"("email", "emailOtp", "emailVerifed", "emailOtpExpiresAt");
