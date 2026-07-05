# Medical Store Management System (MSMS)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-green.svg)](https://nodejs.org/)
[![React Version](https://img.shields.io/badge/React-19.0.0-61dafb.svg)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v3-38bdf8.svg)](https://tailwindcss.com/)
[![Database](https://img.shields.io/badge/Database-MongoDB-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)

A modern, production-grade **Medical Store Management System (MSMS)** built using the MERN stack (MongoDB, Express, React, Node.js). Designed for pharmacies and medical stores, it provides end-to-end management of inventory, supplier purchases, client sales (POS) with FIFO batch tracking, thermal billing, analytics, and robust user management (RBAC).

---

## 🚀 Key Features

### 📦 1. Inventory & FIFO-Based Batch Tracking
*   **FIFO (First-In, First-Out) Tracking**: Automatically tracks stock at the batch level. Outflows (sales) consume stock from the oldest batches first.
*   **Expiry & Price Tracking**: Each batch maintains its unique batch number, expiry date, purchase price (cost price), and selling price.
*   **Near-Expiry Warnings**: Highlight medicines approaching expiration in real-time.
*   **Prevent Negative Stock**: Real-time validation blocks sales when requested quantities exceed available stock.

### 💼 2. Point of Sale (POS) & Thermal Receipts
*   **Interactive Billing**: Easily add items, search medicines, and record sales transactions.
*   **Thermal Receipt Printing**: Generates standard 80mm format layouts for print commands on sale completion.
*   **Stock Inflows & Outflows**: Instantly deducts batch-level quantities on checkout and manages customer records.

### 📊 3. Analytics Dashboard & Reports
*   **Recharts Dashboard**: Rich charts (Area & Pie charts) displaying daily/monthly sales data, medicine categories distribution, and critical stock metrics.
*   **Comprehensive Reports**: Distinct tabs for Daily Sales, Monthly Sales, Stock Report, and Expiry Report.
*   **CSV Exports**: One-click download of report data to Excel/CSV.
*   **Alerts Drawer**: Topbar notification bell and slide-out panel for immediate warnings on low-stock items and near-expiry batches.

### 🛡️ 4. Advanced User Management & RBAC
*   **Role-Based Access Control (RBAC)**: Support for `super_admin`, `admin`, and `pharmacist` roles.
*   **Centralized Control**: `super_admin` can create new users, disable/enable user accounts, change roles, reset passwords, and view system-wide user stats.
*   **Security First**: JWT-based session handling with access and refresh tokens, secure password hashing using `bcryptjs`, and robust API protection middleware.
*   **Profile Management**: Personalized profile settings, profile picture upload links, and password change flows.

---

## 🛠️ Tech Stack

### Frontend
*   **Core**: React 19 (Functional Components & Context API)
*   **Build Tool**: Vite
*   **Routing**: React Router v7
*   **Styling**: Tailwind CSS, React Icons
*   **Data Visualization**: Recharts
*   **HTTP Client**: Axios (with interceptors for automated JWT refresh)

### Backend
*   **Core**: Node.js & Express
*   **Database**: MongoDB (Mongoose ODM)
*   **Auth**: JWT (Access Token & HTTP-only/Local Refresh Tokens), bcryptjs
*   **Logging & Utilities**: Nodemon (development)

---

## 📁 Directory Structure

```text
msms-project/
├── backend/
│   ├── config/             # Database connection setup
│   ├── controllers/        # Express request handlers (auth, users, medicines, sales, etc.)
│   ├── middleware/         # Auth verification and RBAC control (protect, authorize)
│   ├── models/             # Mongoose schemas (User, Medicine, Supplier, Customer, Sale, Purchase)
│   ├── routes/             # Express API endpoints
│   ├── utils/              # Helper utilities (e.g., database batch migration scripts)
│   ├── .env                # Backend environment configuration
│   ├── server.js           # Server entry point
│   └── seed.js             # Seeding initial super_admin and demo data
└── frontend/
    ├── public/             # Static public assets
    ├── src/
    │   ├── api/            # API services and Axios setup
    │   ├── assets/         # App-wide images and assets
    │   ├── components/     # Reusable layout and drawer components
    │   ├── context/        # Global Auth and State contexts
    │   ├── pages/          # Pages (Dashboard, Inventory, POS, Reports, Profile, Management)
    │   ├── App.jsx         # App router and layouts configuration
    │   └── main.jsx        # Frontend entry point
```

---

## ⚙️ Installation & Configuration

### Prerequisites
*   [Node.js](https://nodejs.org/) (v18.0.0 or higher)
*   [MongoDB](https://www.mongodb.com/) (Local installation or MongoDB Atlas URI)

### Setup Backend

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `backend/` directory:
   ```env
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/msms
   JWT_SECRET=your_super_secret_jwt_key
   JWT_EXPIRE=24h
   FRONTEND_URL=http://localhost:5173

   # Optional Email Setup (For Password Reset)
   # EMAIL_HOST=smtp.gmail.com
   # EMAIL_PORT=587
   # EMAIL_USER=your_email@gmail.com
   # EMAIL_PASS=your_app_password
   ```
4. Run the seed script to populate the database with initial Admin credentials, Medicines, Suppliers, and Customers:
   ```bash
   npm run seed
   ```
   *Note: This script will output the default `super_admin` credentials to use on first login.*
5. Start the backend development server:
   ```bash
   npm run dev
   ```

### Setup Frontend

1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Open your browser and navigate to the local address (typically `http://localhost:5173`).

---

## 🔑 Default Credentials (from Seed)

During the seeding process (`npm run seed`), the system creates a default super administrator account:
*   **Email**: `admin@msms.com`
*   **Password**: `Admin@123`

*(Please change this password immediately after your first login via the Profile settings page.)*

---

## 📡 API Endpoints List

All routes are protected by a JWT bearer token except the public authentication routes.

### Auth Endpoints (`/api/auth`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Login user, issues JWT & local refresh token | Public |
| `POST` | `/api/auth/refresh` | Refresh access token using refresh token | Public |
| `POST` | `/api/auth/forgot-password` | Send password reset email token | Public |
| `POST` | `/api/auth/reset-password/:token` | Reset password using secret token | Public |
| `POST` | `/api/auth/logout` | Revoke session and log out | Protected |
| `GET` | `/api/auth/profile` | Retrieve profile of the logged-in user | Protected |
| `PUT` | `/api/auth/profile` | Update profile information | Protected |
| `PUT` | `/api/auth/change-password` | Change account password | Protected |

### User Management Endpoints (`/api/users`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/users/stats` | Retrieve metrics and active user stats | Super Admin |
| `GET` | `/api/users` | List all users | Super Admin |
| `POST` | `/api/users` | Register a new user with defined roles | Super Admin |
| `GET` | `/api/users/:id` | View user by ID | Super Admin |
| `PUT` | `/api/users/:id` | Update user details | Super Admin |
| `DELETE` | `/api/users/:id` | Hard delete a user account | Super Admin |
| `PATCH` | `/api/users/:id/status` | Toggle user active status (active/inactive) | Super Admin |
| `PUT` | `/api/users/:id/role` | Change user's access role | Super Admin |
| `PUT` | `/api/users/:id/reset-password` | Explicitly reset a user's password | Super Admin |

### Inventory & Stock Endpoints (`/api/medicines`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/medicines` | Retrieve list of medicines (supports query searches) | Protected |
| `POST` | `/api/medicines` | Create/Add new medicine | Protected |
| `PUT` | `/api/medicines/:id` | Update medicine inventory details | Protected |
| `DELETE` | `/api/medicines/:id` | Remove a medicine from the catalog | Protected |

### Supplier & Customer Endpoints (`/api/suppliers` & `/api/customers`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/suppliers` | List all suppliers | Protected |
| `POST` | `/api/suppliers` | Create new supplier | Protected |
| `GET` | `/api/customers` | List all customers | Protected |
| `POST` | `/api/customers` | Add new customer info | Protected |

### Transactions & Sales Endpoints (`/api/sales` & `/api/purchases`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/sales` | List all completed sales | Protected |
| `POST` | `/api/sales` | Record new sale (POS check-out, FIFO deducts) | Protected |
| `GET` | `/api/purchases` | Retrieve supplier purchase history | Protected |
| `POST` | `/api/purchases` | Add purchase (Inflows, adds new batches) | Protected |

### Analytics & Reports Endpoints (`/api/reports`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/reports/daily-sales` | Get current day's billing metrics | Protected |
| `GET` | `/api/reports/monthly-sales` | Get sales grouped monthly for charts | Protected |
| `GET` | `/api/reports/stock` | Get details of low-stock medicines | Protected |
| `GET` | `/api/reports/expiry` | Get listing of expired/near-expiry batches | Protected |

---

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🤝 Contributing

1. Fork the project.
2. Create your feature branch: `git checkout -b feature/NewFeature`
3. Commit your changes: `git commit -m 'feat: add some NewFeature'`
4. Push to the branch: `git push origin feature/NewFeature`
5. Open a Pull Request.
