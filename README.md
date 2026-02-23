# Payment Control API

##  Description

This is a robust backend API for a Payment Control system, built with Node.js and Express. It provides secure user authentication, role management, and payment processing capabilities, following modern best practices and a clean architecture.

##  Features

-   **User Authentication:** Secure registration, login, JWT Access & Refresh Tokens, and Password Recovery.
-   **Password Security:** Strong password policies and hashing with `bcryptjs`.
-   **Security:** Enhanced security with Global & Specific Rate Limiting (`express-rate-limit`), `helmet` (HTTP headers), and `cors`.
-   **Database:** Integration with MySQL using `Sequelize` ORM.
-   **Validation:** Request validation and parameter checking using `express-validator`.
-   **Error Handling:** Advanced global error interception for ORM and JWT exceptions.
-   **Query Builder:** Built-in `ApiFeatures` utility for clean pagination, sorting, and filtering.
-   **Logging:** Detailed logging with `winston`.
-   **API Documentation:** Interactive API documentation with Swagger.
-   **Testing:** Unit and integration testing setup with `jest` and `supertest`.
-   **File Uploads:** Support for file uploads via `multer`.
-   **Invoice Management:** Full CRUD operations for "Facturas" linked to the user.

##  Technologies Used

-   **Node.js**
-   **Express.js**
-   **MySQL**
-   **Sequelize**
-   **JWT (jsonwebtoken)**
-   **Bcryptjs**
-   **Nodemailer** (Email Services)
-   **Express Rate Limit**
-   **Winston** (Logging)
-   **Swagger** (Documentation)
-   **Jest** (Testing)

##  Getting Started

### Prerequisites

-   **Node.js** (v14 or higher)
-   **npm**
-   **MySQL Server**

### Installation

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/EnriqueKloosterman/payment_control_server.git
    cd payment-control
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Environment Configuration:**

    Create a `.env` file in the root directory based on the `.env.example` file:

    ```bash
    cp .env.example .env
    ```

    Update the `.env` file with your specific configuration:

    ```env
    PORT=3000
    NODE_ENV=development
    
    # Database Configuration
    DB_HOST=localhost
    DB_USER=root
    DB_PASSWORD=your_password
    DB_NAME=payment_control
    DB_NAME_TEST=payment_control_test
    
    # JWT Configuration
    JWT_SECRET=your_super_secret_key
    JWT_EXPIRES_IN=1d
    JWT_REFRESH_SECRET=your_refresh_secret_key
    JWT_REFRESH_EXPIRES_IN=7d

    # SMTP Configuration (For Password Recovery)
    SMTP_HOST=sandbox.smtp.mailtrap.io
    SMTP_PORT=2525
    SMTP_EMAIL=your_mailtrap_user
    SMTP_PASSWORD=your_mailtrap_password
    FROM_EMAIL=noreply@paymentcontrol.com
    FROM_NAME=PaymentControl
    ```

4.  **Database Setup:**

    Ensure your MySQL server is running and create the databases defined in your `.env` file (`payment_control` and `payment_control_test`).

###  Running the Application

-   **Development Mode:**
    Runs the application with `nodemon` for hot-reloading.

    ```bash
    npm run dev
    ```

-   **Production Mode:**

    ```bash
    npm start
    ```

The server will start on port `3000` (or the port defined in your `.env`).

##  API Documentation

Once the server is running, you can access the full API documentation via Swagger UI at:

```
http://localhost:3000/api-docs
```

##  Testing

The application uses **Jest** and **Supertest** to ensure reliability and correctness. Testing is divided into two categories:

-   **Unit Tests (`tests/unit/`)**: Validates the isolated logic of Controllers and Middlewares. Mock dependencies are used to simulate database behaviour and third-party modules.
-   **Integration Tests (`tests/integration/`)**: Tests complete request-response cycles, ensuring routing, middlewares, and controllers work cohesively using Supertest.

### Running the Tests

To run the entire test suite:

```bash
npm test
```

### Covered Components
- **Controllers**: `auth.controller`, `user.controller`, `facturas.controller`
- **Middlewares**: `auth.middleware`, `validate.middleware`
- **Routes (Integration)**: Auth endpoints (`/register`, `/login`), Facturas endpoints (CRUD, stats)

##  Project Structure

```
payment-control/
├── src/
│   ├── config/         # Configuration files (DB, Logger, Swagger)
│   ├── controllers/    # Request handlers
│   ├── middlewares/    # Custom middlewares (Auth, Validation, Rate Limit)
│   ├── models/         # Sequelize models
│   ├── routes/         # API route definitions
│   ├── services/       # Background jobs (Cron)
│   ├── utils/          # Utilities (ApiFeatures, ErrorResponse, Email Service)
│   └── app.js          # Express app setup
├── tests/              # Test files
├── uploads/            # Directory for file uploads
├── .env.example        # Environment variable template
├── index.js            # Entry point
└── package.json        # Project metadata and dependencies
```

##  License

This project is licensed under the ISC License.
