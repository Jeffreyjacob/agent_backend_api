export const bookingCancelledAgentEmail = (data: {
  agentName: string;
  bookingId: string;
  buyerName: string;
  propertyTitle: string;
  propertyAddress: string;
  viewingDate: string;
  viewingTime: string;
  cancelReason?: string;
}) => {
  return `
    <!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Booking Cancelled by Buyer</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background-color:#c0392b;padding:32px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Booking Cancelled</h1>
              <p style="margin:8px 0 0;color:#f5b7b1;font-size:14px;">A buyer has cancelled their viewing request</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 16px;color:#333333;font-size:16px;">Hi <strong>${data.agentName}</strong>,</p>

              <p style="margin:0 0 24px;color:#555555;font-size:15px;line-height:1.6;">
                A buyer has <strong style="color:#c0392b;">cancelled</strong> their property viewing booking. The time slot is now available for other buyers to schedule a viewing.
              </p>

              <!-- Buyer Info -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f4f8;border-radius:6px;margin:0 0 20px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0 0 8px;color:#999999;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Cancelled By</p>
                    <p style="margin:0;color:#333333;font-size:15px;"><strong>${data.buyerName}</strong></p>
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

                    <p style="margin:0 0 4px;color:#999999;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Viewing Date & Time</p>
                    <p style="margin:0;color:#333333;font-size:15px;">${data.viewingDate} at ${data.viewingTime}</p>
                  </td>
                </tr>
              </table>

              <!-- Cancel Reason -->
              ${
                data.cancelReason
                  ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fff5f5;border-left:4px solid #c0392b;border-radius:4px;margin:0 0 24px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0 0 6px;color:#c0392b;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Reason for Cancellation</p>
                    <p style="margin:0;color:#555555;font-size:14px;line-height:1.6;">${data.cancelReason}</p>
                  </td>
                </tr>
              </table>
              `
                  : ""
              }

              <!-- Info Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#eaf4fb;border-left:4px solid #2980b9;border-radius:4px;margin:0 0 28px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0;color:#2471a3;font-size:14px;line-height:1.6;">
                      <strong>📅 What's next?</strong> The time slot for this viewing is now free. Other buyers may book a viewing for this property through the app.
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
