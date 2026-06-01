export const subscriptionActiveEmail = (data: {
  firstName: string;
  plan: string;
  trialEndDate: string;
  maxProperties: number;
  maxFeaturedListings: number;
}) => {
  return `
    <!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Subscription Activated</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background-color:#27ae60;padding:32px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Subscription Activated 🎉</h1>
              <p style="margin:8px 0 0;color:#d5f5e3;font-size:14px;">Welcome to ${data.plan} — your account is ready</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 16px;color:#333333;font-size:16px;">Hi <strong>${data.firstName}</strong>,</p>

              <p style="margin:0 0 24px;color:#555555;font-size:15px;line-height:1.6;">
                Your <strong>${data.plan}</strong> subscription is now active. You have full access to all features included in your plan. Here's a summary of what's available to you.
              </p>

              <!-- Plan Badge -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td align="center">
                    <span style="display:inline-block;background-color:#eafaf1;color:#27ae60;font-size:14px;font-weight:700;padding:10px 28px;border-radius:20px;border:1px solid #a9dfbf;text-transform:uppercase;letter-spacing:1px;">
                      ${data.plan}
                    </span>
                  </td>
                </tr>
              </table>

              <!-- Plan Limits -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9f9f9;border:1px solid #eeeeee;border-radius:6px;margin:0 0 24px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 16px;color:#999999;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Your Plan Includes</p>

                    <!-- Max Properties -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 12px;">
                      <tr>
                        <td style="padding:12px 16px;background-color:#ffffff;border:1px solid #eeeeee;border-radius:6px;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td>
                                <p style="margin:0;color:#555555;font-size:14px;">🏠 Property Listings</p>
                              </td>
                              <td align="right">
                                <p style="margin:0;color:#27ae60;font-size:16px;font-weight:700;">${data.maxProperties}</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- Max Featured Listings -->
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:12px 16px;background-color:#ffffff;border:1px solid #eeeeee;border-radius:6px;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td>
                                <p style="margin:0;color:#555555;font-size:14px;">⭐ Featured Listings</p>
                              </td>
                              <td align="right">
                                <p style="margin:0;color:#27ae60;font-size:16px;font-weight:700;">${data.maxFeaturedListings}</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Trial End Date -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fef9e7;border-left:4px solid #e67e22;border-radius:4px;margin:0 0 28px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0;color:#e67e22;font-size:14px;line-height:1.6;">
                      <strong>⏳ Trial Period:</strong> Your free trial ends on <strong>${data.trialEndDate}</strong>. After this date your subscription will automatically renew and you will be charged based on your selected plan.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0;color:#555555;font-size:14px;line-height:1.6;">
                If you have any questions about your subscription or need assistance, please don't hesitate to contact our support team.
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
                © ${new Date().getFullYear()} Jet  Real Estate. All rights reserved.
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
