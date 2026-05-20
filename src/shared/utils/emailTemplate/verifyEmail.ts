export const verifyEmailTemplate = (otp: string, firstName: string) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Hi ${firstName},</h2>
      <p>Your verification code is:</p>
      <h1 style="letter-spacing: 8px; color: #2E75B6;">${otp}</h1>
      <p>This code expires in 15 minutes.</p>
      <p>If you didn't request this, ignore this email.</p>
    </div>
  `;
};

export const resetPasswordEmailTemplate = (
  resetUrl: string,
  firstName: string,
): string => {
  return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Hi ${firstName},</h2>
      <p>Here is your reset password link belowe:</p>
      <a href="${resetUrl}" style="background: #2E75B6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Reset Password</a>
      <p>This link expires in 1 hour</p>
      <p>If you didn't request this, ignore this email.</p>
    </div>
    `;
};
