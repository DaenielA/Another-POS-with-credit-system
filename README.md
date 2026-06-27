# Tindahan POS System

A full-stack Point-of-Sale system for Filipino sari-sari stores and carinderia.

## Tech Stack
- **Frontend**: React 18 + Vite, Tailwind CSS, React Router v6, Recharts, React Hook Form, Lucide React
- **Backend**: Node.js + Express.js, JWT auth, bcrypt, Multer, MySQL2
- **Database**: MySQL 8.0

## Project Structure
```
pos-system/
├── client/        ← React frontend (Vite)
├── server/        ← Express backend
├── database/
│   ├── migrations.sql   ← All table definitions
│   └── seed.sql         ← Sample data
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
- **POS**: Product search with debounce, cart management, cash/credit payments, receipt print
- **Inventory**: Stock tracking per unit type (piece/pack/wholesale), restock logging, low-stock alerts
- **Members**: Credit scoring system (0–150), credit limit management, ledger history
- **Credit**: 4 payment modes (daily/monthly/bulk/full), automatic score adjustment
- **Reports**: Daily, monthly, top products, by cashier, credit status with charts
- **Settings**: Staff account management, product categories (admin only)

## Credit Score Rules
| Score     | Status    | Credit Allowance          |
|-----------|-----------|---------------------------|
| < 60      | Blocked   | No credit purchases       |
| 61 – 80   | Limited   | 50% of credit limit       |
| 81 – 100  | Good      | Full credit limit         |
| 101 – 150 | Excellent | Eligible for limit increase|

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
```
