-- Database Schema for Student Management System
-- Database name: student_db (Can be customized via environment variables)

CREATE DATABASE IF NOT EXISTS student_db;
USE student_db;

-- Table structure for table `students`
CREATE TABLE IF NOT EXISTS students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    department VARCHAR(100) NOT NULL,
    year INT NOT NULL CHECK (year >= 1 AND year <= 6),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Add indexes on fields that will be queried frequently or need performance optimization
    INDEX idx_email (email),
    INDEX idx_department (department)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
