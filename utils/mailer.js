const nodemailer = require('nodemailer');
require('dotenv').config();

let emailHost = process.env.EMAIL_HOST || process.env.SMTP_HOST;
let emailPort = parseInt(process.env.EMAIL_PORT || process.env.SMTP_PORT || '587', 10);
let emailUser = process.env.EMAIL_USER || process.env.SMTP_USER;
let emailPassword = process.env.EMAIL_PASSWORD || process.env.SMTP_PASS;
let emailSecure = process.env.EMAIL_SECURE === 'true' || process.env.SMTP_SECURE === 'true';
const emailFrom = process.env.EMAIL_FROM || process.env.SMTP_FROM || 'CampusOS <noreply@campusos.edu>';
const appUrl = process.env.APP_URL || 'http://localhost:3000';

let providerName = 'custom';
const provider = (process.env.EMAIL_PROVIDER || '').toLowerCase();

// Auto-configure popular providers
if (process.env.BREVO_API_KEY && process.env.BREVO_USER) {
  emailHost = 'smtp-relay.brevo.com';
  emailPort = 587;
  emailUser = process.env.BREVO_USER;
  emailPassword = process.env.BREVO_API_KEY;
  emailSecure = false;
  providerName = 'brevo';
} else if (provider === 'brevo' && emailUser && emailPassword) {
  emailHost = 'smtp-relay.brevo.com';
  emailPort = 587;
  emailSecure = false;
  providerName = 'brevo';
} else if (process.env.RESEND_API_KEY) {
  emailHost = 'smtp.resend.com';
  emailPort = 587;
  emailUser = 'resend';
  emailPassword = process.env.RESEND_API_KEY;
  emailSecure = false;
  providerName = 'resend';
} else if (provider === 'resend' && emailPassword) {
  emailHost = 'smtp.resend.com';
  emailPort = 587;
  emailUser = 'resend';
  emailSecure = false;
  providerName = 'resend';
} else if (process.env.MAILTRAP_USER && process.env.MAILTRAP_PASS) {
  emailHost = 'sandbox.smtp.mailtrap.io';
  emailPort = 2525;
  emailUser = process.env.MAILTRAP_USER;
  emailPassword = process.env.MAILTRAP_PASS;
  emailSecure = false;
  providerName = 'mailtrap';
} else if (provider === 'mailtrap' && emailUser && emailPassword) {
  emailHost = 'sandbox.smtp.mailtrap.io';
  emailPort = 2525;
  emailSecure = false;
  providerName = 'mailtrap';
}

let transporter;
let isFallback = false;

// In-memory capture for development testing
let lastVerificationLink = null;
let lastPasswordResetLink = null;

if (emailHost && emailUser && emailPassword) {
  transporter = nodemailer.createTransport({
    host: emailHost,
    port: emailPort,
    secure: emailSecure,
    auth: {
      user: emailUser,
      pass: emailPassword
    }
  });
} else {
  isFallback = true;
  // Console logging transporter fallback for easy dev testing
  transporter = {
    sendMail: async (options) => {
      console.log('\n==================================================');
      console.log('              [CampusOS OUTGOING MAIL]            ');
      console.log(`From:    ${emailFrom}`);
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
    },
    verify: async () => {
      return true;
    }
  };
}

const verifySMTP = async () => {
  try {
    if (isFallback) {
      console.log('[Mailer] SMTP credentials are not configured. Falling back to Console mailer logging.');
      return true;
    }
    console.log(`[Mailer] Validating SMTP connection to ${emailHost}:${emailPort} using provider [${providerName}]...`);
    await transporter.verify();
    console.log(`[Mailer] SMTP connection verified successfully for [${providerName}]. Ready to send emails.`);
    return true;
  } catch (err) {
    console.error(`[Mailer Warning] SMTP connection validation failed for [${providerName}]:`, err.message);
    // Mark as fallback so the dev links endpoint is active if needed
    isFallback = true;
    return false;
  }
};

const getMailStatus = () => {
  return {
    isFallback,
    providerName: isFallback ? 'console-fallback' : providerName,
    lastVerificationLink,
    lastPasswordResetLink
  };
};

const sendVerificationEmail = async (to, name, token) => {
  const verifyUrl = `${appUrl}/#/verify-email/${token}`;
  lastVerificationLink = verifyUrl;
  console.log(`[Mailer] Capture verification link for ${to}: ${verifyUrl}`);
  console.log(`[Mailer] Attempting to send verification email to: ${to}...`);
  
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

  try {
    const info = await transporter.sendMail({
      from: emailFrom,
      to,
      subject: 'Verify your CampusOS Account',
      html
    });
    console.log(`[Mailer] Verification email sent successfully to: ${to} (MessageId: ${info.messageId})`);
    return info;
  } catch (err) {
    console.error(`[Mailer Error] Failed to send verification email to: ${to}. Error: ${err.message}`);
    throw err;
  }
};

const sendPasswordResetEmail = async (to, name, token) => {
  const resetUrl = `${appUrl}/#/reset-password/${token}`;
  lastPasswordResetLink = resetUrl;
  console.log(`[Mailer] Capture password reset link for ${to}: ${resetUrl}`);
  console.log(`[Mailer] Attempting to send password reset email to: ${to}...`);
  
  const html = `
    <div style="background-color: #0d0d0d; color: #e5e5e5; font-family: 'Inter', sans-serif; padding: 40px; border-radius: 8px; max-width: 600px; margin: 0 auto; border: 1px solid #c5a880;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #c5a880; font-family: 'Outfit', sans-serif; margin: 0; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase;">CampusOS</h1>
        <p style="font-size: 12px; color: #a3a3a3; font-family: monospace; text-transform: uppercase; margin-top: 5px; letter-spacing: 2px;">Identity Protection</p>
      </div>
      <div style="background-color: #121212; padding: 30px; border-radius: 4px; border: 1px solid #262626;">
        <h2 style="color: #ffffff; font-family: 'Outfit', sans-serif; margin-top: 0;">Password Reset Request</h2>
        <p style="font-size: 14px; line-height: 1.6; color: #d4d4d4;">
          A password reset was requested for your administrative account. Please click the button below to establish new credentials.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #c5a880; color: #0d0d0d; text-decoration: none; padding: 12px 24px; font-weight: 600; font-size: 14px; border-radius: 4px; display: inline-block; letter-spacing: 0.5px;">Reset Password</a>
        </div>
        <p style="font-size: 12px; color: #a3a3a3; line-height: 1.5;">
          This link will expire in 1 hour. If you did not make this request, you can safely ignore this email.
        </p>
      </div>
      <div style="text-align: center; margin-top: 30px; font-size: 11px; color: #737373;">
        <p>This is an automated security transmission from CampusOS. Do not reply to this message.</p>
        <p>&copy; ${new Date().getFullYear()} CampusOS. All rights reserved.</p>
      </div>
    </div>
  `;

  try {
    const info = await transporter.sendMail({
      from: emailFrom,
      to,
      subject: 'Reset your CampusOS Password',
      html
    });
    console.log(`[Mailer] Password reset email sent successfully to: ${to} (MessageId: ${info.messageId})`);
    return info;
  } catch (err) {
    console.error(`[Mailer Error] Failed to send password reset email to: ${to}. Error: ${err.message}`);
    throw err;
  }
};

const sendTestEmail = async (to) => {
  console.log(`[Mailer] Attempting to send SMTP diagnostics test email to: ${to}...`);
  const html = `
    <div style="background-color: #0d0d0d; color: #e5e5e5; font-family: 'Inter', sans-serif; padding: 40px; border-radius: 8px; max-width: 600px; margin: 0 auto; border: 1px solid #c5a880;">
      <h1 style="color: #c5a880; font-family: 'Outfit', sans-serif; text-align: center;">CampusOS</h1>
      <p style="text-align: center; font-size: 14px; margin-top: 20px;">This is a diagnostic test email to verify your SMTP mail delivery configuration is fully functional.</p>
    </div>
  `;
  try {
    const info = await transporter.sendMail({
      from: emailFrom,
      to,
      subject: 'CampusOS SMTP Diagnostic Test',
      html
    });
    console.log(`[Mailer] Diagnostic test email sent successfully to: ${to} (MessageId: ${info.messageId})`);
    return info;
  } catch (err) {
    console.error(`[Mailer Error] Failed to send test email to: ${to}. Error: ${err.message}`);
    throw err;
  }
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendTestEmail,
  verifySMTP,
  getMailStatus
};
