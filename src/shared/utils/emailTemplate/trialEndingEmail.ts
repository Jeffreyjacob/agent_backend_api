export const trialEndingEmail = (data: {
  firstName: string;
  trialEndDate: string;
  plan: string;
  price: number;
}) => {
  return `
    <!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Trial Ending Soon</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background-color:#e67e22;padding:32px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Your Trial is Ending Soon ⏳</h1>
              <p style="margin:8px 0 0;color:#fdebd0;font-size:14px;">Take action before your trial expires</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 16px;color:#333333;font-size:16px;">Hi <strong>${data.firstName}</strong>,</p>

              <p style="margin:0 0 24px;color:#555555;font-size:15px;line-height:1.6;">
                Your free trial is coming to an end. To continue enjoying uninterrupted access to all your features, your subscription will <strong>automatically renew</strong> on the date below.
              </p>

              <!-- Trial End Details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9f9f9;border:1px solid #eeeeee;border-radius:6px;margin:0 0 24px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 4px;color:#999999;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Current Plan</p>
                    <p style="margin:0 0 16px;color:#333333;font-size:15px;font-weight:600;">${data.plan}</p>

                    <p style="margin:0 0 4px;color:#999999;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Trial Ends On</p>
                    <p style="margin:0 0 16px;color:#e67e22;font-size:16px;font-weight:700;">${data.trialEndDate}</p>

                    <p style="margin:0 0 4px;color:#999999;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Amount Due After Trial</p>
                    <p style="margin:0;color:#333333;font-size:15px;font-weight:600;">$${data.price.toFixed(2)} / month</p>
                  </td>
                </tr>
              </table>

              <!-- Warning Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fef9e7;border-left:4px solid #e67e22;border-radius:4px;margin:0 0 24px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0;color:#e67e22;font-size:14px;line-height:1.6;">
                      <strong>⚠️ What happens after your trial ends?</strong> Your account will automatically be charged <strong>$${data.price.toFixed(2)}</strong> and your <strong>${data.plan}</strong> subscription will continue. If you wish to cancel, please do so before <strong>${data.trialEndDate}</strong>.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Info Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#eaf4fb;border-left:4px solid #2980b9;border-radius:4px;margin:0 0 28px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0;color:#2471a3;font-size:14px;line-height:1.6;">
                      <strong>💡 Enjoying the trial?</strong> No action is needed — your subscription will continue automatically and you will retain access to all your data and settings.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0;color:#555555;font-size:14px;line-height:1.6;">
                If you have any questions about your subscription or billing, please don't hesitate to contact our support team.
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
                © ${new Date().getFullYear()} Jet Real Estate . All rights reserved.
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
