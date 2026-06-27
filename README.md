# Tindahan POS System

A full-stack Point-of-Sale system for Filipino sari-sari stores and carinderia.

## Tech Stack
- **Frontend**: React 19 + Vite, Tailwind CSS, React Router v7, Recharts, React Hook Form, Lucide React
- **Backend**: Node.js + Express.js, JWT auth, bcrypt, Multer, MySQL2
- **Database**: MySQL 8.0

## Project Structure
```
Another POS/
├── client/                  ← React 19 frontend (Vite)
│   └── src/
│       ├── api/axios.js     ← Centralized Axios instance (JWT injected here)
│       ├── components/      ← Shared UI (Layout)
│       ├── context/         ← AuthContext — global auth state
│       └── pages/           ← One file per page/feature
├── server/                  ← Express backend
│   ├── config/db.js         ← MySQL2 connection pool
│   ├── middleware/auth.js   ← JWT verify + requireAdmin guard
│   ├── routes/              ← One file per domain resource
│   └── utils/               ← Pure helpers (creditScore, txnCode)
├── database/
│   ├── migrations.sql       ← All table definitions
│   └── seed.sql             ← Sample data
└── .env.example
```

## Setup Instructions

### 1. Database
```sql
-- In MySQL client:
SOURCE /path/to/database/migrations.sql;
SOURCE /path/to/database/seed.sql;
```

### 2. Backend
```bash
cd server
cp ../.env.example .env
# Edit .env — set DB_PASSWORD and a strong JWT_SECRET
npm install
npm start
```

### 3. Frontend
```bash
cd client
npm install
npm run dev
```

App runs at: http://localhost:5173  
API runs at: http://localhost:5000

## Default Credentials
| Role    | Email             | Password    |
|---------|-------------------|-------------|
| Admin   | admin@pos.com     | admin123    |
| Cashier | cashier@pos.com   | cashier123  |

> **Important**: Change passwords after first login in Settings.

## Features

### POS / Sales
- Product search with 300ms debounce
- Per-product unit selection (piece / pack / wholesale) directly on the search results — no mode switching needed
- Cart management: add, update quantity, remove, clear all
- Discount field per transaction
- Cash payment with change computation
- Credit payment (member required; validates credit score and available limit)
- Receipt modal with print support
- Auto-generated transaction codes in `TXN-YYYYMMDD-XXXXXX` format

### Inventory
- Stock tracking per unit type (piece / pack / wholesale)
- Restock logging with history
- Low-stock threshold alerts
- Product image uploads via Multer

### Members & Credit
- Credit scoring system (0–150 points)
- Credit limit management per member
- 4 payment modes: daily, monthly, bulk, full
- Automatic score adjustment on payment behavior
- Ledger history per member
- Credit limit upgrade request workflow:
  - Members submit a request with desired limit and reason
  - Score ≥ 101 → **auto-approved**; score < 60 → **auto-rejected**; otherwise → **pending admin review**
  - Admin approves or rejects from the Credit Requests page

### Reports
- Daily and monthly sales summaries
- Top products by revenue/quantity
- Sales breakdown by cashier
- Credit status overview
- Charts via Recharts

### Settings *(Admin only)*
- Staff account creation and management
- Product category management
- Password changes

## Role-Based Access Control

| Page / Route      | Admin | Cashier |
|-------------------|-------|---------|
| Dashboard         | ✅    | ✅      |
| POS               | ✅    | ✅      |
| Inventory         | ✅    | ✅      |
| Members           | ✅    | ✅      |
| Member Detail     | ✅    | ✅      |
| Reports           | ✅    | ✅      |
| Credit Requests   | ✅    | ❌      |
| Settings          | ✅    | ❌      |

Access is enforced on **both** layers:
- **Frontend**: `ProtectedRoute` with `adminOnly` prop in `App.jsx`
- **Backend**: `requireAdmin` middleware in `server/middleware/auth.js`

## Credit Score Rules
| Score     | Status    | Credit Allowance            | Limit Request        |
|-----------|-----------|------------------------------|----------------------|
| < 60      | Blocked   | No credit purchases          | Auto-rejected        |
| 61 – 80   | Limited   | 50% of credit limit          | Pending admin review |
| 81 – 100  | Good      | Full credit limit             | Pending admin review |
| 101 – 150 | Excellent | Full credit limit             | Auto-approved        |

## Environment Variables (server/.env)
```
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=pos_system
JWT_SECRET=change_this_to_something_secure
JWT_EXPIRES_IN=8h
UPLOAD_PATH=./uploads
CLIENT_URL=http://localhost:5173
```

> In production, set `CLIENT_URL` to your frontend domain (e.g. `https://yourdomain.com`) and set `VITE_API_URL` in `client/.env` to your API domain.

## Screenshots

> Add screenshots here after running the app. Suggested pages to capture:
> - `/pos` — POS terminal with product unit selection and cart
> - `/inventory` — Stock table with low-stock badges
> - `/members` — Member list with credit scores
> - `/credit-requests` — Admin approval workflow
> - `/reports` — Charts and summary tables

<!-- Example:
![POS Terminal](docs/screenshots/pos.png)
![Credit Requests](docs/screenshots/credit-requests.png)
-->
