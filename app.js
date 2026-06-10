/**
 * Express Application Configuration
 * Aggregates core security middlewares, body parsing, routers,
 * and configures fallback routes and error handlers.
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const studentRoutes = require('./routes/studentRoutes');
const errorHandler = require('./middlewares/errorMiddleware');

const app = express();

// Set up security HTTP headers (Helmet)
app.use(helmet());

// Enable Cross-Origin Resource Sharing (CORS)
app.use(cors());

// HTTP request logger middleware
// Logs minimal dev style logs in non-production, standard apache logs in production
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

// Parse incoming requests with JSON payloads
app.use(express.json());

// Parse URL-encoded payloads (useful for form submissions)
app.use(express.urlencoded({ extended: true }));

// Base / Sanity check route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to the Student Management System REST API.',
    documentation: 'See README.md for endpoint specifications.'
  });
});

// Register student routes
app.use('/students', studentRoutes);

// Catch-all route for non-existent endpoints (404 Handler)
app.use((req, res, next) => {
  const error = new Error(`Resource not found - ${req.originalUrl}`);
  res.statusCode = 404;
  next(error);
});

// Centralized error handling middleware
app.use(errorHandler);

module.exports = app;
