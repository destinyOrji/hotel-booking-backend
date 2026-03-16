const getEmailVerificationTemplate = (name, verificationUrl) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
        .content { background: #f8f9fa; padding: 30px; }
        .button { display: inline-block; padding: 12px 30px; background: #2563eb; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to Hotel Booking!</h1>
        </div>
        <div class="content">
          <h2>Hello ${name},</h2>
          <p>Thank you for registering with Hotel Booking. To complete your registration, please verify your email address by clicking the button below:</p>
          <div style="text-align: center;">
            <a href="${verificationUrl}" class="button">Verify Email Address</a>
          </div>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #2563eb;">${verificationUrl}</p>
          <p>This link will expire in 24 hours.</p>
          <p>If you didn't create an account, please ignore this email.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Hotel Booking. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

const getPasswordResetTemplate = (name, resetUrl) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #ef4444; color: white; padding: 20px; text-align: center; }
        .content { background: #f8f9fa; padding: 30px; }
        .button { display: inline-block; padding: 12px 30px; background: #ef4444; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Password Reset Request</h1>
        </div>
        <div class="content">
          <h2>Hello ${name},</h2>
          <p>You requested to reset your password. Click the button below to create a new password:</p>
          <div style="text-align: center;">
            <a href="${resetUrl}" class="button">Reset Password</a>
          </div>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #ef4444;">${resetUrl}</p>
          <p>This link will expire in 10 minutes.</p>
          <p>If you didn't request a password reset, please ignore this email and your password will remain unchanged.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Hotel Booking. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

const getWelcomeTemplate = (name) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #10b981; color: white; padding: 20px; text-align: center; }
        .content { background: #f8f9fa; padding: 30px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Email Verified Successfully!</h1>
        </div>
        <div class="content">
          <h2>Welcome ${name}!</h2>
          <p>Your email has been successfully verified. You can now enjoy all the features of Hotel Booking:</p>
          <ul>
            <li>Browse and book luxury rooms</li>
            <li>Manage your bookings</li>
            <li>Access exclusive deals and promotions</li>
            <li>Update your profile and preferences</li>
          </ul>
          <p>Thank you for choosing Hotel Booking. We look forward to serving you!</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Hotel Booking. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

module.exports = {
  getEmailVerificationTemplate,
  getPasswordResetTemplate,
  getWelcomeTemplate
};
