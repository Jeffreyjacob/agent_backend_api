export const agentBookingNotificationEmail = (data: {
  agentName: string;
  bookingId: string;
  buyerName: string;
  buyerEmail: string;
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
  <title>New Viewing Request</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background-color:#2c3e50;padding:32px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">New Viewing Request</h1>
              <p style="margin:8px 0 0;color:#bdc3c7;font-size:14px;">A buyer wants to view your property</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 16px;color:#333333;font-size:16px;">Hi <strong>${data.agentName}</strong>,</p>

              <p style="margin:0 0 24px;color:#555555;font-size:15px;line-height:1.6;">
                You have received a new property viewing request. Please <strong>confirm or decline</strong> within <strong style="color:#e67e22;">48 hours</strong> via the app — the booking will be automatically cancelled if no action is taken.
              </p>

              <!-- Buyer Info -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f4f8;border-radius:6px;margin:0 0 20px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0 0 8px;color:#999999;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Buyer Information</p>
                    <p style="margin:0 0 4px;color:#333333;font-size:15px;"><strong>${data.buyerName}</strong></p>
                    <p style="margin:0;color:#555555;font-size:14px;">${data.buyerEmail}</p>
                  </td>
                </tr>
              </table>

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

                    <p style="margin:0 0 4px;color:#999999;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Requested Viewing Date & Time</p>
                    <p style="margin:0;color:#333333;font-size:15px;font-weight:600;">${data.viewingDate} at ${data.viewingTime}</p>
                  </td>
                </tr>
              </table>

              <!-- Warning Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fef9e7;border-left:4px solid #e67e22;border-radius:4px;margin:0 0 28px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0;color:#e67e22;font-size:14px;line-height:1.6;">
                      <strong>⏰ Action Required:</strong> Please log in to the app and confirm or decline this booking within 48 hours. If no action is taken, the booking will be automatically cancelled and the buyer will be notified.
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
