/**
 * Student Controller
 * Directs request payloads to the model layer and formats standardized responses.
 * Utilizes async/await syntax and wraps code in try/catch blocks to ensure all exceptions
 * are forwarded to the centralized error middleware.
 */

const studentModel = require('../models/studentModel');

class StudentController {
  /**
   * @route   POST /students
   * @desc    Create a new student
   * @access  Public
   */
  async createStudent(req, res, next) {
    try {
      const { name, email, department, year } = req.body;
      
      const newStudent = await studentModel.create({
        name,
        email,
        department,
        year: parseInt(year, 10)
      });

      return res.status(201).json({
        success: true,
        message: 'Student record created successfully',
        data: newStudent
      });
    } catch (error) {
      // Pass the error to the centralized error handling middleware
      next(error);
    }
  }

  /**
   * @route   GET /students
   * @desc    Get all students
   * @access  Public
   */
  async getAllStudents(req, res, next) {
    try {
      const students = await studentModel.findAll();
      
      return res.status(200).json({
        success: true,
        count: students.length,
        data: students
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   GET /students/:id
   * @desc    Get a student by unique ID
   * @access  Public
   */
  async getStudentById(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const student = await studentModel.findById(id);

      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Student not found'
        });
      }

      return res.status(200).json({
        success: true,
        data: student
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   PUT /students/:id
   * @desc    Update student details
   * @access  Public
   */
  async updateStudent(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const { name, email, department, year } = req.body;

      const updatedStudent = await studentModel.update(id, {
        name,
        email,
        department,
        year: parseInt(year, 10)
      });

      if (!updatedStudent) {
        return res.status(404).json({
          success: false,
          message: 'Student not found'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Student record updated successfully',
        data: updatedStudent
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   DELETE /students/:id
   * @desc    Delete a student record
   * @access  Public
   */
  async deleteStudent(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const isDeleted = await studentModel.delete(id);

      if (!isDeleted) {
        return res.status(404).json({
          success: false,
          message: 'Student not found'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Student record deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}

// Export a singleton instance of the controller
module.exports = new StudentController();
