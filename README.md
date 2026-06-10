# 🎓 Student Management System API

[![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-v4-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![MySQL](https://img.shields.io/badge/MySQL-v8-4479A1?logo=mysql&logoColor=white)](https://www.mysql.com/)
[![REST API](https://img.shields.io/badge/REST--API-Standard-orange)](#api-endpoints-table)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A production-grade REST API backend for managing student records. This project is built using the **Model-View-Controller (MVC)** architectural pattern to showcase clean code practices, input sanitization, database connection pooling, centralized error propagation, and graceful process shutdown lifecycles—key competencies for a **Software Delivery Engineer** role.

---

## 📌 Project Overview

This backend application handles student record management with enterprise-level robustness. It serves as a reference for how to structure a RESTful service to protect against OWASP vulnerabilities, maintain separation of concerns, optimize database resource utilization, and ensure smooth developer operations (DevOps) and deployments.

---

## 📝 Resume Highlights

* **Engineered a Production-Grade REST API**: Developed a student management service using **Node.js**, **Express.js**, and **MySQL** structured around the **MVC** architecture, utilizing parameterized SQL statements to safeguard against SQL Injection (OWASP Top 10).
* **Implemented Strict Validator Guards**: Built request schema validation using `express-validator`, incorporating custom asynchronous integrity checks to enforce email uniqueness and data bounds (academic years 1-6) directly at the router level.
* **Designed Highly Resilient Lifecycles**: Optimized DB connection efficiency via MySQL connection pooling (`mysql2/promise`), and implemented active process signal interception (`SIGINT`, `SIGTERM`) for clean database connection releases and graceful application shutdown.

---

## 🚀 Key Features

* **MVC Design Pattern**: Clean separation between database schemas/models, business workflows (controllers), and validation/routing boundaries.
* **Database Connection Pooling**: Built with `mysql2/promise` using pooled resources to minimize handshake overhead and scale efficiently.
* **Automatic Schema Initializer**: Server automatically boots, creates the database, and provisions table schemas and indexes if they are missing.
* **Strict Input Validation & Sanitization**: Integrates `express-validator` schema guards to trim parameters and normalize email casing.
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
* **Utilities**: dotenv, morgan, cors, helmet
* **Development Tool**: nodemon (Hot-reloading server)

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

The SQL structure features secondary indexes to optimize query execution and constraints to maintain data integrity:

```sql
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

* **CHECK (year >= 1 AND year <= 6)**: Prevents garbage data insertion.
* **UNIQUE (email)**: Enforces email integrity.
* **INDEX idx_email, idx_department**: Accelerates index-scans for common queries.

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

## 🛠️ Installation & Running Locally

1. **Configure credentials** in the local `.env` file:
   ```env
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the application**:
   ```bash
   npm run dev
   ```
   *(Note: The server will automatically connect to MySQL, create the `student_db` schema, and provision the tables—no manual SQL import required).*

---

## 🔮 Future Enhancements

To align with modern Software Delivery principles, future versions will incorporate:

1. **Containerization**: Define `Dockerfile` and `docker-compose.yml` to package the Node app and MySQL database, simplifying environment provisioning.
2. **Database Migrations**: Adopt Knex.js or Sequelize migrations for version-controlled database schema changes, removing manual SQL scripting.
3. **CI/CD Pipeline**: Write a GitHub Actions workflow to run automated code checks and integration test scripts on every pull request.
4. **Secure Authentication**: Introduce JWT authentication and Role-Based Access Control (RBAC) to restrict update/delete actions to administrators.
5. **OpenAPI / Swagger Integration**: Generate interactive API documentation available at a `/api-docs` endpoint for client developers.
