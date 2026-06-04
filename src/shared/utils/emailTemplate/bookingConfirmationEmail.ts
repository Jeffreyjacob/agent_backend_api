export const bookingConfirmedBuyerEmail = (data: {
  buyerName: string;
  bookingId: string;
  agentName: string;
  agentEmail: string;
  propertyTitle: string;
  propertyAddress: string;
  viewingDate: string;
  viewingTime: string;
}) => {
  return `
    <!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Booking Confirmed</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background-color:#27ae60;padding:32px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Booking Confirmed ✓</h1>
              <p style="margin:8px 0 0;color:#d5f5e3;font-size:14px;">Your property viewing has been confirmed</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 16px;color:#333333;font-size:16px;">Hi <strong>${data.buyerName}</strong>,</p>

              <p style="margin:0 0 24px;color:#555555;font-size:15px;line-height:1.6;">
                Great news! Your property viewing request has been <strong style="color:#27ae60;">confirmed by the agent</strong>. Please find your booking details below.
              </p>

              <!-- Booking Details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9f9f9;border:1px solid #eeeeee;border-radius:6px;margin:0 0 24px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 4px;color:#999999;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Booking Reference</p>
                    <p style="margin:0 0 16px;color:#333333;font-size:15px;font-weight:600;">#${data.bookingId}</p>

                    <p style="margin:0 0 4px;color:#999999;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Property</p>
                    <p style="margin:0 0 16px;color:#333333;font-size:15px;">${data.propertyTitle}</p>

                    <p style="margin:0 0 4px;color:#999999;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Address</p>
                    <p style="margin:0 0 16px;color:#333333;font-size:15px;">${data.propertyAddress}</p>

                    <p style="margin:0 0 4px;color:#999999;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Viewing Date & Time</p>
                    <p style="margin:0;color:#333333;font-size:15px;font-weight:600;">${data.viewingDate} at ${data.viewingTime}</p>
                  </td>
                </tr>
              </table>

              <!-- Agent Info -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f4f8;border-radius:6px;margin:0 0 24px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0 0 8px;color:#999999;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Your Agent</p>
                    <p style="margin:0 0 4px;color:#333333;font-size:15px;"><strong>${data.agentName}</strong></p>
                    <p style="margin:0;color:#555555;font-size:14px;">${data.agentEmail}</p>
                  </td>
                </tr>
              </table>

              <!-- Info Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#eafaf1;border-left:4px solid #27ae60;border-radius:4px;margin:0 0 28px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0;color:#1e8449;font-size:14px;line-height:1.6;">
                      <strong>📅 Reminder:</strong> Please arrive on time for your viewing. If you need to reschedule or cancel, kindly do so as early as possible by contacting your agent directly.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0;color:#555555;font-size:14px;line-height:1.6;">
                If you have any questions or need assistance, please don't hesitate to contact our support team.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f9f9f9;border-top:1px solid #eeeeee;padding:24px 40px;text-align:center;">
              <p style="margin:0 0 8px;color:#999999;font-size:13px;">
                This is an automated message, please do not reply to this email.
              </p>
              <p style="margin:0;color:#999999;font-size:13px;">
                © ${new Date().getFullYear()} Jet Real Estate. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};
