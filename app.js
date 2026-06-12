/**
 * Express Application Configuration
 * Aggregates core security middlewares, body parsing, routers,
 * and configures fallback routes and error handlers.
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const studentRoutes = require('./routes/studentRoutes');
const errorHandler = require('./middlewares/errorMiddleware');

const app = express();

// Configure Helmet with custom Content Security Policy (CSP)
// This secures the app while allowing fonts and icons from trusted CDNs
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://kit.fontawesome.com", "https://cdn.jsdelivr.net"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://use.fontawesome.com", "https://cdn.jsdelivr.net"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "https://use.fontawesome.com"],
        imgSrc: ["'self'", "data:", "https://images.unsplash.com"],
        connectSrc: ["'self'", "https://ka-f.fontawesome.com"]
      }
    }
  })
);

// Enable Cross-Origin Resource Sharing (CORS)
app.use(cors());

// HTTP request logger middleware
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

// Parse incoming requests with JSON and URL-encoded payloads
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static assets from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Register student REST API routes
app.use('/students', studentRoutes);

// Catch-all route for non-existent API endpoints (404 Handler)
app.use('/api/*', (req, res, next) => {
  const error = new Error(`Resource not found - ${req.originalUrl}`);
  res.statusCode = 404;
  next(error);
});

// For any other non-API routes, fall back to index.html to support SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Centralized error handling middleware
app.use(errorHandler);

module.exports = app;
