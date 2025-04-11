# Login System with Role-Based Access Control

A full-stack application with React frontend and Node.js/MySQL backend implementing a login system with role-based access control.

## Features

- User authentication with email and password
- Role-based access control (Admin, User, Viewer)
- Secure password hashing with bcrypt
- JWT-based authentication
- Protected routes based on user roles
- Last login tracking
- Modern and responsive UI

## Prerequisites

- Node.js (v14 or higher)
- MySQL (v5.7 or higher)
- npm (Node Package Manager)

## Setup

1. **Database Setup**
   - Create a MySQL database using the schema in `server/database/schema.sql`
   - Configure database connection in `server/config/db.js` or use environment variables

2. **Environment Variables**
   Create a `.env` file in the root directory with the following variables:
   ```
   DB_HOST=localhost
   DB_USER=your_username
   DB_PASSWORD=your_password
   DB_NAME=gateentry
   JWT_SECRET=your_jwt_secret
   PORT=5000
   ```

3. **Install Dependencies**
   ```bash
   # Install server dependencies
   npm install

   # Install client dependencies
   cd client
   npm install
   ```

4. **Running the Application**
   ```bash
   # Start the server (from root directory)
   npm run server

   # Start the client (from client directory)
   npm start
   ```

   The application will be available at:
   - Frontend: http://localhost:3000
   - Backend: http://localhost:5000

## Usage

1. Access the login page at http://localhost:3000
2. Enter your email and password
3. Upon successful login, you'll be redirected based on your role:
   - Admin: /admin
   - User: /dashboard
   - Viewer: /viewer

## Security Features

- Passwords are hashed using bcrypt
- JWT-based authentication
- Protected routes based on user roles
- SQL injection prevention using prepared statements
- CORS enabled for security
