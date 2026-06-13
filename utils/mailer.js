const nodemailer = require('nodemailer');
require('dotenv').config();

const smtpHost = process.env.SMTP_HOST;
const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const smtpSecure = process.env.SMTP_SECURE === 'true';
const smtpFrom = process.env.SMTP_FROM || 'CampusOS <noreply@campusos.edu>';
const appUrl = process.env.APP_URL || 'http://localhost:3000';

let transporter;

if (smtpHost && smtpUser && smtpPass) {
  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: {
      user: smtpUser,
      pass: smtpPass
    }
  });
} else {
  // Console logging transporter fallback for easy dev testing
  transporter = {
    sendMail: async (options) => {
      console.log('\n==================================================');
      console.log('              [CampusOS OUTGOING MAIL]            ');
      console.log(`From:    ${smtpFrom}`);
      console.log(`To:      ${options.to}`);
      console.log(`Subject: ${options.subject}`);
      console.log('--------------------------------------------------');
      
      const verifyLinkMatch = options.html.match(/href="([^"]+verify-email[^"]+)"/);
      const resetLinkMatch = options.html.match(/href="([^"]+reset-password[^"]+)"/);
      if (verifyLinkMatch) {
        console.log(`Verification URL: ${verifyLinkMatch[1]}`);
      }
      if (resetLinkMatch) {
        console.log(`Reset Password URL: ${resetLinkMatch[1]}`);
      }
      console.log('--------------------------------------------------');
      console.log('HTML Content snippet:');
      console.log(options.html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 300) + '...');
      console.log('==================================================\n');
      return { messageId: 'console-log-transporter' };
    }
  };
}

const sendVerificationEmail = async (to, name, token) => {
  const verifyUrl = `${appUrl}/#/verify-email/${token}`;
  
  const html = `
    <div style="background-color: #0d0d0d; color: #e5e5e5; font-family: 'Inter', sans-serif; padding: 40px; border-radius: 8px; max-width: 600px; margin: 0 auto; border: 1px solid #c5a880;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #c5a880; font-family: 'Outfit', sans-serif; margin: 0; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase;">CampusOS</h1>
        <p style="font-size: 12px; color: #a3a3a3; font-family: monospace; text-transform: uppercase; margin-top: 5px; letter-spacing: 2px;">Verification Service</p>
      </div>
      <div style="background-color: #121212; padding: 30px; border-radius: 4px; border: 1px solid #262626;">
        <h2 style="color: #ffffff; font-family: 'Outfit', sans-serif; margin-top: 0;">Welcome, ${name}</h2>
        <p style="font-size: 14px; line-height: 1.6; color: #d4d4d4;">
          Your account has been provisioned on the CampusOS registry. To activate your access and lift security restrictions, please verify your email address.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyUrl}" style="background-color: #c5a880; color: #0d0d0d; text-decoration: none; padding: 12px 24px; font-weight: 600; font-size: 14px; border-radius: 4px; display: inline-block; letter-spacing: 0.5px;">Verify Email Address</a>
        </div>
        <p style="font-size: 12px; color: #a3a3a3; line-height: 1.5;">
          If the button above does not work, copy and paste this URL into your browser:<br>
          <span style="font-family: monospace; color: #c5a880; word-break: break-all;">${verifyUrl}</span>
        </p>
      </div>
      <div style="text-align: center; margin-top: 30px; font-size: 11px; color: #737373;">
        <p>This is an automated security transmission from CampusOS. Do not reply to this message.</p>
        <p>&copy; ${new Date().getFullYear()} CampusOS. All rights reserved.</p>
      </div>
    </div>
  `;

  return transporter.sendMail({
    from: smtpFrom,
    to,
    subject: 'Verify your CampusOS Account',
    html
  });
};

const sendPasswordResetEmail = async (to, name, token) => {
  const resetUrl = `${appUrl}/#/reset-password/${token}`;
  
  const html = `
    <div style="background-color: #0d0d0d; color: #e5e5e5; font-family: 'Inter', sans-serif; padding: 40px; border-radius: 8px; max-width: 600px; margin: 0 auto; border: 1px solid #c5a880;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #c5a880; font-family: 'Outfit', sans-serif; margin: 0; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase;">CampusOS</h1>
        <p style="font-size: 12px; color: #a3a3a3; font-family: monospace; text-transform: uppercase; margin-top: 5px; letter-spacing: 2px;">Identity Protection</p>
      </div>
      <div style="background-color: #121212; padding: 30px; border-radius: 4px; border: 1px solid #262626;">
        <h2 style="color: #ffffff; font-family: 'Outfit', sans-serif; margin-top: 0;">Password Reset Request</h2>
        <p style="font-size: 14px; line-height: 1.6; color: #d4d4d4;">
          A password recovery request was initiated for your CampusOS account. Click the button below to establish new credentials. This link will expire in 1 hour.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #c5a880; color: #0d0d0d; text-decoration: none; padding: 12px 24px; font-weight: 600; font-size: 14px; border-radius: 4px; display: inline-block; letter-spacing: 0.5px;">Reset Password</a>
        </div>
        <p style="font-size: 12px; color: #a3a3a3; line-height: 1.5;">
          If you did not request this, you can safely ignore this email. Your password will remain unchanged.
        </p>
        <p style="font-size: 12px; color: #a3a3a3; line-height: 1.5;">
          Copy-paste URL:<br>
          <span style="font-family: monospace; color: #c5a880; word-break: break-all;">${resetUrl}</span>
        </p>
      </div>
      <div style="text-align: center; margin-top: 30px; font-size: 11px; color: #737373;">
        <p>This is a secure authentication recovery transmission from CampusOS.</p>
        <p>&copy; ${new Date().getFullYear()} CampusOS. All rights reserved.</p>
      </div>
    </div>
  `;

  return transporter.sendMail({
    from: smtpFrom,
    to,
    subject: 'Reset your CampusOS Password',
    html
  });
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail
};
