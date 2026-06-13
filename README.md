# CampusOS - Premium Student Directory

CampusOS is a sleek, modern, and portfolio-grade Student Directory and registry application built using Node.js, Express, and MySQL. It features an interactive dashboard, clean analytics, and responsive student profiling. 

Designed with an editorial, minimalist aesthetic inspired by modern design agencies, CampusOS aims to present academic administration tools with maximum craftsmanship.

![CampusOS Dashboard](screenshots/dashboard.png)

## Features

* **Interactive Dashboard**: A modular grid featuring enrollment growth trends (Line Chart) and department distributions (Doughnut Chart) that automatically adjust theme styling based on system preferences.
* **Student Catalog**: An elegant catalog showing student profile cards with outlined department and year tags.
* **Notion-Style Drawer**: Clicking a student's card slides out a clean, product-spec-inspired profile detail panel.
* **Full CRUD Operations**:
  * **Register**: Create new student profiles with robust client-side and server-side validation.
  * **Modify**: Update student details inline.
  * **Dismiss**: Safely delete student records after confirming with a modal check.
* **Security & Performance**: Uses parameter-bound MySQL prepared statements to secure inputs against SQL injection and utilizes connection pooling for optimal database lifecycles.
* **Resilient Fallbacks**: The system remains functional even if external resources (like Chart.js) fail to load, showing helpful placeholder messages rather than throwing runtime errors.

## Tech Stack

* **Frontend**: HTML5, Vanilla CSS3 (Custom transitions, prefers-color-scheme responsive dark/light styling, flexbox/grid layout), JavaScript (Modern ES6 SPA Hash Router)
* **Backend**: Node.js & Express.js
* **Database**: MySQL (using `mysql2` connection pool)
* **Visualizations**: Chart.js (CDN-delivered with local runtime fallback checks)

---

## Getting Started

### Prerequisites
* [Node.js](https://nodejs.org/) installed
* [MySQL Server](https://www.mysql.com/) running locally

### 1. Clone & Install
```bash
git clone https://github.com/harshithcheripally16-ui/student-management-system-nodejs-mysql.git
cd student-management-system-nodejs-mysql
npm install
```

### 2. Configure Environment variables
Create a `.env` file in the root directory (using `.env.example` as a template) and add your local MySQL credentials:
```env
PORT=3000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=your_mysql_username
DB_PASSWORD=your_mysql_password
DB_NAME=student_db
```

### 3. Initialize & Start
Run the start command. The server will automatically connect to MySQL, verify the connection pool, create the `student_db` database if it doesn't exist, and create the required table structures:
```bash
npm start
```

Once running, visit `http://localhost:3000` in your web browser.

---

## API Endpoints

* `GET /students` - Retrieves all student records.
* `GET /students/:id` - Retrieves details of a specific student.
* `POST /students` - Creates a new student profile (validated).
* `PUT /students/:id` - Updates an existing student profile.
* `DELETE /students/:id` - Removes a student record by ID.

## Author

**Harshith Cheripally**
* GitHub: [@harshithcheripally16-ui](https://github.com/harshithcheripally16-ui)
