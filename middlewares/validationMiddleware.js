/**
 * Validation Middleware for Student Operations
 * Utilizes 'express-validator' for schema checking and sanitization.
 * Prevents execution of bad data and SQL Injection by strictly validating input schemas.
 */

const { body, param, validationResult } = require('express-validator');
const studentModel = require('../models/studentModel');

/**
 * Standard utility middleware to process results of validation chains.
 * Returns 400 Bad Request with parsed errors if validation checks fail.
 */
const validateResults = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map(err => ({
        field: err.path, // 'path' contains the field name in express-validator v7+
        message: err.msg
      }))
    });
  }
  next();
};

// Validation rules for Creating a Student
const validateCreateStudent = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ max: 100 }).withMessage('Name must not exceed 100 characters'),
  
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .isLength({ max: 100 }).withMessage('Email must not exceed 100 characters')
    .normalizeEmail()
    .custom(async (email) => {
      const student = await studentModel.findByEmail(email);
      if (student) {
        throw new Error('Email is already registered');
      }
      return true;
    }),

  body('department')
    .trim()
    .notEmpty().withMessage('Department is required')
    .isLength({ max: 100 }).withMessage('Department must not exceed 100 characters'),

  body('year')
    .notEmpty().withMessage('Year is required')
    .isInt({ min: 1, max: 6 }).withMessage('Year must be an integer between 1 and 6'),

  validateResults
];

// Validation rules for Updating a Student
const validateUpdateStudent = [
  param('id')
    .isInt({ min: 1 }).withMessage('Student ID must be a positive integer'),

  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ max: 100 }).withMessage('Name must not exceed 100 characters'),
  
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .isLength({ max: 100 }).withMessage('Email must not exceed 100 characters')
    .normalizeEmail()
    .custom(async (email, { req }) => {
      const studentId = parseInt(req.params.id, 10);
      const student = await studentModel.findByEmail(email);
      // If email exists on another student, fail validation
      if (student && student.id !== studentId) {
        throw new Error('Email is already registered to another student');
      }
      return true;
    }),

  body('department')
    .trim()
    .notEmpty().withMessage('Department is required')
    .isLength({ max: 100 }).withMessage('Department must not exceed 100 characters'),

  body('year')
    .notEmpty().withMessage('Year is required')
    .isInt({ min: 1, max: 6 }).withMessage('Year must be an integer between 1 and 6'),

  validateResults
];

// Validation rules for identifying a Student by URL ID parameter (Get by ID, Delete)
const validateStudentId = [
  param('id')
    .isInt({ min: 1 }).withMessage('Student ID must be a positive integer'),
  validateResults
];

module.exports = {
  validateCreateStudent,
  validateUpdateStudent,
  validateStudentId
};
