# 🎓 Academix: Full-Stack Student SaaS Platform

[![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-v4-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![MySQL](https://img.shields.io/badge/MySQL-v8-4479A1?logo=mysql&logoColor=white)](https://www.mysql.com/)
[![GSAP](https://img.shields.io/badge/Animations-GSAP-green)](https://greensock.com/gsap/)
[![Chart.js](https://img.shields.io/badge/Charts-Chart.js-ff6384)](https://www.chartjs.org/)
[![REST API](https://img.shields.io/badge/REST--API-Standard-orange)](#-api-endpoints)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A portfolio-grade, full-stack student record management SaaS platform inspired by Linear, Stripe, and Apple Human Interface Guidelines. Built with **Node.js**, **Express.js**, **MySQL**, **GSAP**, and **Chart.js**, featuring a responsive **Single Page Application (SPA)** frontend dashboard styled with premium **vanilla CSS3** (utilizing dark mode and glassmorphism layouts).

This repository is structured to showcase enterprise software delivery engineering principles: MVC architecture, database connection pooling, auto-setup query parsing, client/server-side validation, GSAP-driven transitions, Chart.js analytics, and graceful signal terminations.

---

## 📌 Project Overview

This SaaS web application provides administrators with a complete dashboard workspace to manage student records. It has been built with a strong focus on premium UI/UX design (replacing traditional tables with profile grids and slide-out drawers), advanced data visualization, security (mitigating SQL Injection and XSS attacks), and reliability (graceful database pool shutdowns).

The backend serves a polished client-side dashboard SPA that syncs dynamically with the REST endpoints using an asynchronous HTTP client.

---

## 📝 Resume Highlights (ATS-Friendly)

* **Engineered a Full-Stack Web Application**: Developed a Student Management System using **Node.js**, **Express.js**, and **MySQL** with a responsive **Vanilla JS** SPA dashboard, implementing **MVC architecture** and parameterized SQL queries to optimize separation of concerns and mitigate SQL injection vectors.
* **Implemented Asynchronous Validation & Security**: Configured request validation pipelines using `express-validator` and custom middleware to verify email uniqueness in the database prior to controller dispatch, while deploying **Helmet CSP headers** to sanitize assets.
* **Optimized Database Resources & Lifecycles**: Built resilient connection pooling via `mysql2/promise` with auto-schema provisioning, and programmed signal listeners (`SIGINT`/`SIGTERM`) to enforce graceful pool closures, preventing memory leaks and orphaned connections.

---

## 🚀 Features

* **SaaS Landing Page**: A landing page featuring a hero tagline, animated stat counters, capability cards, and transition triggers.
* **Single Page Application (SPA)**: Dynamic view swapping using hash-based routing (`#/dashboard`, `#/students`) avoiding full-page reloads.
* **Interactive Profile Grid**: Replaced standard table rows with card widgets featuring initials badges, department badges, and academic years.
* **Notion-Style Slide-Out Drawer**: Clicking a student card transitions a floating profile drawer from the right edge with smooth GSAP slide curves, presenting student properties and quick actions.
* **Chart.js Visualizations**: Premium dashboard displaying a line chart of enrollment growth trends and a doughnut chart of department allocations using neon gradient colors.
* **GSAP Micro-Animations**: Interacts with page loading, scroll entries, drawer openings, and button hovers to create staggered load-in and smooth scale animations.
* **Automatic Schema Initializer**: Server automatically boots, creates the database, and provisions table schemas and indexes if they are missing, stripping comments first to ensure error-free imports.
* **Deduplicated Toasts**: Advanced toast notification system that filters out duplicate active messages, preventing notification spam.
* **Absolute Empty States**: Features custom screens for empty database states ("No students found") and empty search filter results.
* **Graceful Termination**: Closes active database pool connections when the server intercepts shutdown signals.
* **Production Hardened**: Integrated with `helmet` for secure HTTP response headers and `cors` for cross-origin compliance.

---

## 🛠️ Tech Stack

* **Backend Runtime**: Node.js (v18.x+)
* **Web Framework**: Express.js
* **Database Engine**: MySQL (v8.0+)
* **Query Client**: mysql2 (Promise-wrapped)
* **Request Validation**: express-validator
* **Frontend Animation**: GSAP (GreenSock Animation Platform)
* **Data Visualization**: Chart.js
* **Frontend Core**: HTML5, CSS3 (Vanilla Dark Glassmorphism), JavaScript (ES6 SPA Router)
* **HTTP Styling Utilities**: Font Awesome 6 (Icons), Google Fonts (Outfit & Inter)
* **Security & Loggers**: helmet, cors, morgan, dotenv

---

## 📐 Architecture

The application implements a strict Model-View-Controller (MVC) architectural pattern. The static SPA frontend is hosted directly from the Express static asset pipeline.

```
       +-------------------------------------------------------------+
       |                         BROWSER                             |
       |  +-------------------+              +--------------------+  |
       |  |   SPA View (HTML) |              |  JS Router/API     |  |
       |  +---------+---------+              +---------+----------+  |
       +------------|----------------------------------|-------------+
                    | (Serves Static)                  | (REST Requests)
                    v                                  v
       +-------------------------------------------------------------+
       |                      EXPRESS SERVER                         |
       |  +-------------------+              +--------------------+  |
       |  |  Static Assets    |              |  Routes / Guards   |  |
       |  +-------------------+              +---------+----------+  |
       |                                               |             |
       |                                               v             |
       |                                     +--------------------+  |
       |                                     |    Controllers     |  |
       |                                     +---------+----------+  |
       +-----------------------------------------------|-------------+
                                                       v
                                             +--------------------+
                                             |       Models       |
                                             +---------+----------+
                                                       |
                                                       v (Pool Query)
                                             +--------------------+
                                             |     MYSQL DB       |
                                             +--------------------+
```

---

## 📁 Folder Structure

```
├── config/
│   └── db.js               # Database pool, startup connection testing, and auto-init
├── controllers/
│   └── studentController.js # Extracts payloads, calls models, and formats REST responses
├── models/
│   └── studentModel.js     # Manages raw parameterized SQL queries on MySQL
├── routes/
│   └── studentRoutes.js    # Routes URIs to validation guards and controller handlers
├── middlewares/
│   ├── errorMiddleware.js  # Environment-aware global error formatting & SQL exception parser
│   └── validationMiddleware.js # Payload type-checking and async email uniqueness checks
├── db/
│   └── schema.sql          # SQL script containing database schemas and indexes
├── public/                 # Static Frontend SPA Assets
│   ├── index.html          # Main HTML layout wrapper
│   ├── css/
│   │   └── styles.css      # Premium custom dark-theme stylesheet
│   └── js/
│       ├── api.js          # Asynchronous HTTP API consumer client
│       └── app.js          # SPA hash router, metrics calculators, and state controllers
├── screenshots/
│   └── dashboard.png       # UI preview mockup for recruiter review
├── .env                    # Local environment variables (ignored in Git)
├── .env.example            # Sample environment variables template
├── app.js                  # Setup Express middlewares, security plugins, and routing
├── server.js               # Bootstrapping entry point and graceful process hooks
├── package.json            # Node project dependencies and execution scripts
└── README.md               # Extensive developer guide and API documentation
```

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

---

## 📊 API Endpoints

All endpoints expect and return JSON payloads (`Content-Type: application/json`).

| Method | Endpoint | Request Body Constraints | Description | Standard Status Code |
|:---|:---|:---|:---|:---|
| **GET** | `/` | None | Serves the frontend SPA | `200 OK` |
| **GET** | `/students` | None | Retrieve all student records (Newest first) | `200 OK` |
| **GET** | `/students/:id` | Path parameter `id` (positive integer) | Retrieve a single student's details by ID | `200 OK` / `404 Not Found` |
| **POST** | `/students` | `{ name, email, department, year }` | Create a new student record (Verifies email uniqueness) | `201 Created` / `400 Bad Request` |
| **PUT** | `/students/:id` | `{ name, email, department, year }` | Update an existing student record (Validates unique email) | `200 OK` / `400 Bad Request` / `404` |
| **DELETE**| `/students/:id` | Path parameter `id` (positive integer) | Permanently delete a student record | `200 OK` / `404 Not Found` |

---

## 📸 Screenshots Section

### Portal Dashboard Layout
Below is a visual preview of the dark-mode glassmorphic SaaS interface, featuring Chart.js line and doughnut chart components, KPI metrics widgets, and sidebar layouts:

![Academix Dashboard Preview](screenshots/dashboard.png)

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

## 🛠️ Installation Guide & Running Locally

### Prerequisites
* **Node.js** (v18.x+)
* **MySQL Server** (Running locally or as a remote instance)

### 1. Configure the local database environment
Open the [.env](file:///C:/Student_management/.env) file in your project folder and verify that the database credentials match your local MySQL server setup:
```env
DB_USER=root
DB_PASSWORD=your_mysql_password
```
*(Leave `DB_PASSWORD` blank if you do not have a password set on your local MySQL root account).*

### 2. Install NPM packages
```bash
npm install
```

### 3. Run the application
* **Development Mode** (Runs using `nodemon` for file watch and auto-restart):
  ```bash
  npm run dev
  ```
* **Production Mode** (Standard entry execution):
  ```bash
  npm start
  ```

*(Note: The server will automatically connect to MySQL, create the `student_db` schema, and provision the tables—no manual SQL import required).*

---

## 🔮 Future Enhancements

To align with modern Software Delivery principles, future versions will incorporate:

1. **Containerization**: Define `Dockerfile` and `docker-compose.yml` to package the Node app and MySQL database, simplifying environment provisioning and staging.
2. **Database Migrations**: Adopt Knex.js or Sequelize migrations for version-controlled database schema changes, removing manual SQL scripting.
3. **CI/CD Pipeline**: Write a GitHub Actions workflow to run automated code checks and integration test scripts on every pull request.
4. **Secure Authentication**: Introduce JWT authentication and Role-Based Access Control (RBAC) to restrict update/delete actions to administrators.
5. **OpenAPI / Swagger Integration**: Generate interactive API documentation available at a `/api-docs` endpoint for client developers.
6. **Logging Aggregation**: Implement Winston or Bunyan loggers to route logs to central systems like Datadog or ELK stack.
