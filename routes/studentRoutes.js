/**
 * Student Router
 * Defines Express routes and binds validations and controller operations.
 */

const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const {
  validateCreateStudent,
  validateUpdateStudent,
  validateStudentId
} = require('../middlewares/validationMiddleware');

// Route for fetching all students and creating a new student
router.route('/')
  .get(studentController.getAllStudents)
  .post(validateCreateStudent, studentController.createStudent);

// Routes for operating on individual student records by ID
router.route('/:id')
  .get(validateStudentId, studentController.getStudentById)
  .put(validateUpdateStudent, studentController.updateStudent)
  .delete(validateStudentId, studentController.deleteStudent);

module.exports = router;
