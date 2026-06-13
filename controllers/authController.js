const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');
const mailer = require('../utils/mailer');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'campusos_secret_key_development_only';

class AuthController {
  /**
   * @route   POST /auth/register
   * @desc    Register a new administrative user
   * @access  Public
   */
  async register(req, res, next) {
    try {
      const { name, email, password } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Please provide name, email, and password.'
        });
      }

      // Check if user already exists
      const existingUser = await userModel.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'An account is already registered with this email address.'
        });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Generate verification token (signed JWT, expires in 24 hours)
      const verificationToken = jwt.sign({ email }, JWT_SECRET, { expiresIn: '24h' });

      // Create unverified user
      const newUser = await userModel.create({
        name,
        email,
        password_hash: passwordHash,
        verification_token: verificationToken
      });

      // Send verification email (asynchronous fallback)
      try {
        await mailer.sendVerificationEmail(email, name, verificationToken);
      } catch (mailErr) {
        console.error('[Mailer Error] Failed to send registration verification email:', mailErr.message);
        // Do not crash registration if mailer fails in dev; print warning
      }

      const { password_hash, ...safeUser } = newUser;

      return res.status(201).json({
        success: true,
        message: 'Account registered successfully. Please verify your email address to activate all features.',
        data: safeUser
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   POST /auth/login
   * @desc    Authenticate user & return JWT token
   * @access  Public
   */
  async login(req, res, next) {
    try {
      const { email, password, rememberMe } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Please enter both email and password.'
        });
      }

      // Find user
      const user = await userModel.findByEmail(email);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email address or password.'
        });
      }

      // Verify password
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email address or password.'
        });
      }

      // Generate session token (Remember Me expands expiry to 30 days)
      const tokenExpiry = rememberMe ? '30d' : '2h';
      const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: tokenExpiry });

      const { password_hash, ...safeUser } = user;

      return res.status(200).json({
        success: true,
        message: 'Login successful.',
        token,
        data: safeUser
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   POST /auth/verify-email
   * @desc    Confirm email verification using token
   * @access  Public
   */
  async verifyEmail(req, res, next) {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'Verification token is required.'
        });
      }

      // Verify signed token structure and expiry
      try {
        jwt.verify(token, JWT_SECRET);
      } catch (err) {
        return res.status(400).json({
          success: false,
          message: 'Verification link is invalid or has expired.'
        });
      }

      // Check DB for matching token
      const user = await userModel.findByVerificationToken(token);
      if (!user) {
        return res.status(400).json({
          success: false,
          message: 'Verification link is invalid or has already been used.'
        });
      }

      // Update user verification status
      await userModel.update(user.id, {
        is_verified: 1,
        verification_token: null
      });

      return res.status(200).json({
        success: true,
        message: 'Email address verified successfully. Your account is now fully active.'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   POST /auth/resend-verification
   * @desc    Resend registration verification email
   * @access  Public (unverified logged-in users can trigger this)
   */
  async resendVerification(req, res, next) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email address is required.'
        });
      }

      const user = await userModel.findByEmail(email);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'No account found with this email address.'
        });
      }

      if (user.is_verified) {
        return res.status(400).json({
          success: false,
          message: 'Account is already verified.'
        });
      }

      // Generate new token and save
      const verificationToken = jwt.sign({ email }, JWT_SECRET, { expiresIn: '24h' });
      await userModel.update(user.id, { verification_token: verificationToken });

      // Send email
      try {
        await mailer.sendVerificationEmail(email, user.name, verificationToken);
      } catch (mailErr) {
        console.error('[Mailer Error] Failed to resend verification email:', mailErr.message);
      }

      return res.status(200).json({
        success: true,
        message: 'Verification link has been resent. Please check your inbox.'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   POST /auth/forgot-password
   * @desc    Generate password reset token & email recovery link
   * @access  Public
   */
  async forgotPassword(req, res, next) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email address is required.'
        });
      }

      const user = await userModel.findByEmail(email);
      // To prevent account enumeration, return success even if email is not found
      if (!user) {
        return res.status(200).json({
          success: true,
          message: 'If that email exists in our system, we have sent a password recovery link.'
        });
      }

      // Generate reset token (expires in 1 hour)
      const resetToken = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '1h' });
      await userModel.update(user.id, { reset_token: resetToken });

      // Mail reset link
      try {
        await mailer.sendPasswordResetEmail(email, user.name, resetToken);
      } catch (mailErr) {
        console.error('[Mailer Error] Failed to send password reset email:', mailErr.message);
      }

      return res.status(200).json({
        success: true,
        message: 'If that email exists in our system, we have sent a password recovery link.'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   POST /auth/reset-password
   * @desc    Reset password using recovery token
   * @access  Public
   */
  async resetPassword(req, res, next) {
    try {
      const { token, password } = req.body;

      if (!token || !password) {
        return res.status(400).json({
          success: false,
          message: 'Password and reset token are required.'
        });
      }

      // Verify token signature and expiration
      try {
        jwt.verify(token, JWT_SECRET);
      } catch (err) {
        return res.status(400).json({
          success: false,
          message: 'Password recovery link has expired or is invalid.'
        });
      }

      // Find user by reset token
      const user = await userModel.findByResetToken(token);
      if (!user) {
        return res.status(400).json({
          success: false,
          message: 'Password recovery link is invalid or has already been used.'
        });
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(password, 10);

      // Save new password and clear the reset token
      await userModel.update(user.id, {
        password_hash: passwordHash,
        reset_token: null
      });

      return res.status(200).json({
        success: true,
        message: 'Password has been reset successfully. You can now log in with your new credentials.'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   GET /auth/me
   * @desc    Get current authenticated user session details
   * @access  Private
   */
  async getMe(req, res, next) {
    try {
      // req.user was populated by requireAuth middleware
      return res.status(200).json({
        success: true,
        data: req.user
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
