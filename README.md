# 🎓 Student Management System API

[![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-v4-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![MySQL](https://img.shields.io/badge/MySQL-v8-4479A1?logo=mysql&logoColor=white)](https://www.mysql.com/)
[![REST API](https://img.shields.io/badge/REST--API-Standard-orange)](#api-endpoints-table)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A production-grade, highly secure, and performance-optimized REST API backend for managing student records. This project is built using the **Model-View-Controller (MVC)** architectural pattern to showcase clean code practices, input sanitization, database connection pooling, centralized error propagation, and graceful process shutdown lifecycles—key competencies for a **Software Delivery Engineer** role.

---

## 📌 Project Overview

This backend application handles student record management with enterprise-level robustness. It serves as an excellent reference for how to structure a RESTful service to protect against common OWASP vulnerabilities, maintain separation of concerns, optimize database resource utilization, and ensure smooth developer operations (DevOps) and deployments.

---

## 📝 Resume Highlights

* **Engineered a Production-Grade REST API**: Developed a robust Student Management API using **Node.js**, **Express.js**, and **MySQL** structured around the **MVC** architecture, utilizing parameterized SQL statements to safeguard against SQL Injection (OWASP Top 10).
* **Implemented Strict Validator Guards**: Built strict request schema validation using `express-validator`, incorporating custom asynchronous integrity checks to enforce email uniqueness and data bounds (academic years 1-6) directly at the router level.
* **Designed Highly Resilient Lifecycles**: Optimized DB connection efficiency via MySQL connection pooling (`mysql2/promise`), and implemented active process signal interception (`SIGINT`, `SIGTERM`) for clean database connection releases and graceful application shutdown.

---

## 🚀 Key Features

* **MVC Design Pattern**: Clean separation between database schemas/models, business workflows (controllers), and validation/routing boundaries.
* **Database Connection Pooling**: Built with `mysql2/promise` using pooled resources. Minimizes handshake overhead and scales efficiently under high concurrent requests.
* **Fail-Fast Boot Diagnostics**: Application verifies database credentials and connectivity before launching the HTTP server port listener.
* **Strict Input Validation & Sanitization**: Integrates `express-validator` schema guards. Prevents bad payload states and sanitizes inputs (e.g., lowercase email normalization).
* **Asynchronous Integrity Checks**: Validation middleware checks email uniqueness directly in the database before passing control to routers.
* **Robust SQL Injection Mitigation**: Exclusively utilizes parameterized (prepared) statements for all database interactions.
* **Graceful Lifecycles**: Gracefully intercepts termination signals (`SIGINT`, `SIGTERM`) to shut down connections cleanly and release the MySQL database pool.
* **Centralized Error Propagation**: Catches exceptions globally, formatting responses to consumers while hiding raw stack traces in production to prevent metadata leakage.
* **Production Hardened**: Integrated with `helmet` for secure HTTP response headers and `cors` for cross-origin compliance.

---

## 🛠️ Tech Stack

* **Runtime Environment**: Node.js (v18.x+)
* **Web Framework**: Express.js
* **Database Engine**: MySQL (v8.0+)
* **Query Client**: mysql2 (Promise-wrapped)
* **Request Validation**: express-validator
* **Utilities**: dotenv (Environment isolation), morgan (HTTP logging), cors (Cross-Origin Resource Sharing), helmet (HTTP headers security)
* **Development Tool**: nodemon (Hot-reloading server)

---

## 📁 Folder Structure

The project layout follows a strict MVC separation of concerns to allow developers to build, deploy, and maintain components independently:

```
student-management-system/
├── config/
│   └── db.js               # Database pool and startup diagnostic connectivity testing
├── controllers/
│   └── studentController.js # Extracts payloads, triggers models, and returns REST responses
├── models/
│   └── studentModel.js     # Manages raw parameterized SQL queries on MySQL
├── routes/
│   └── studentRoutes.js    # Routes URIs to validation guards and controller handlers
├── middlewares/
│   ├── errorMiddleware.js  # Environment-aware global error formatting
│   └── validationMiddleware.js # Payload type-checking and async email uniqueness checks
├── db/
│   └── schema.sql          # SQL script to initialize DB, tables, constraints, and indexes
├── .env                    # Local environment config variables (ignored in Git)
├── .env.example            # Sample environment variables for setup reference
├── app.js                  # Setup Express middlewares, security plugins, and base routes
├── server.js               # Bootstrapping entry point and graceful process hooks
├── package.json            # Node project dependencies and execution scripts
└── README.md               # Extensive developer guide and API documentation
```

---

## 📊 API Endpoints Table

All endpoints expect and return JSON payloads (`Content-Type: application/json`).

| Method | Endpoint | Request Body Constraints | Description | Standard Status Code |
|:---|:---|:---|:---|:---|
| **GET** | `/` | None | API Root (Service sanity check) | `200 OK` |
| **GET** | `/students` | None | Retrieve all student records (Newest first) | `200 OK` |
| **GET** | `/students/:id` | Path parameter `id` (positive integer) | Retrieve a single student's details by ID | `200 OK` / `404 Not Found` |
| **POST** | `/students` | `{ name, email, department, year }` | Create a new student record (Verifies email uniqueness) | `201 Created` / `400 Bad Request` |
| **PUT** | `/students/:id` | `{ name, email, department, year }` | Update an existing student record (Validates unique email) | `200 OK` / `400 Bad Request` / `404` |
| **DELETE**| `/students/:id` | Path parameter `id` (positive integer) | Permanently delete a student record | `200 OK` / `404 Not Found` |

---

## 🗄️ Database Schema

The SQL structure (defined in [db/schema.sql](file:///C:/Student_management/db/schema.sql)) features secondary indexes to optimize query execution and constraints to maintain data integrity:

```sql
CREATE DATABASE IF NOT EXISTS student_db;
USE student_db;

CREATE TABLE IF NOT EXISTS students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    department VARCHAR(100) NOT NULL,
    year INT NOT NULL CHECK (year >= 1 AND year <= 6),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Optimized indexing for lookup performance
    INDEX idx_email (email),
    INDEX idx_department (department)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

* **CHECK (year >= 1 AND year <= 6)**: Prevents garbage data insertion at the database level.
* **UNIQUE (email)**: Enforces email integrity.
* **INDEX idx_email, idx_department**: Accelerates index-scans for common queries, improving endpoint response latency.

---

## ⚙️ Environment Variables

The application reads configurations from a local `.env` file. Copy the template:

```bash
cp .env.example .env
```

| Variable Name | Description | Default Value | Role |
|:---|:---|:---|:---|
| `PORT` | Local network port the HTTP server binds to | `3000` | Deployment config |
| `NODE_ENV` | Mode of operation (`development` or `production`) | `development` | Dictates logging detail & stack traces |
| `DB_HOST` | Host address of the MySQL Database Server | `127.0.0.1` | Network routing |
| `DB_PORT` | Network port MySQL server listens on | `3306` | Network routing |
| `DB_USER` | Username used to login to MySQL | `root` | Authenticator |
| `DB_PASSWORD` | Password associated with the database user | *Empty* | Authenticator |
| `DB_NAME` | Schema target name | `student_db` | Target partition |
| `DB_CONNECTION_LIMIT`| Maximum active connections in the pool | `10` | Database scaling control |

---

## 🛠️ Installation Steps

Follow these steps to deploy and run the service locally:

### 1. Configure the Database
Ensure your MySQL Server is running. Execute the schema script via CLI command:
```bash
mysql -u root -p < db/schema.sql
```

### 2. Configure Environment Variables
Copy and modify settings:
```bash
cp .env.example .env
```
Ensure the database credentials match your local MySQL configuration.

### 3. Install NPM Packages
```bash
npm install
```

---

## 🏃 Running Locally

* **Development Mode** (Runs using `nodemon` for file watch and auto-restart):
  ```bash
  npm run dev
  ```
* **Production Mode** (Standard entry execution):
  ```bash
  npm start
  ```

Once running, verify connectivity using `curl`:
```bash
curl http://localhost:3000/
```
Output:
```json
{
  "success": true,
  "message": "Welcome to the Student Management System REST API.",
  "documentation": "See README.md for endpoint specifications."
}
```

---

## 🔮 Future Enhancements

To align with modern Software Delivery principles, future versions will incorporate:

1. **Containerization**: Define `Dockerfile` and `docker-compose.yml` to package the Node app and MySQL database, simplifying environment provisioning.
2. **Database Migrations**: Adopt Knex.js or Sequelize migrations for version-controlled database schema changes, removing manual SQL scripting.
3. **CI/CD pipeline**: Write a GitHub Actions workflow to run automated code checks and integration test scripts on every pull request.
4. **Secure Authentication**: Introduce JWT authentication and Role-Based Access Control (RBAC) to restrict update/delete actions to administrators.
5. **OpenAPI / Swagger Integration**: Generate interactive API documentation available at a `/api-docs` endpoint for client developers.
6. **Logging Aggregation**: Implement Winston or Bunyan loggers to route logs to central systems like Datadog or ELK stack.
