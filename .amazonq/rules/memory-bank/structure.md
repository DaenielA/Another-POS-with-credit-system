# Project Structure — Tindahan POS System

## Directory Layout
```
Another POS/
├── client/                    ← React 19 frontend (Vite)
│   ├── public/                ← Static assets (favicon, icons)
│   ├── src/
│   │   ├── api/
│   │   │   └── axios.js       ← Axios instance with base URL + auth interceptor
│   │   ├── components/
│   │   │   └── Layout.jsx     ← Shared nav/sidebar wrapper for authenticated pages
│   │   ├── context/
│   │   │   └── AuthContext.jsx← Global auth state (user, token, login/logout)
│   │   ├── pages/
│   │   │   ├── members/       ← Member sub-pages (if any)
│   │   │   ├── POS.jsx        ← Main sales terminal
│   │   │   ├── Inventory.jsx  ← Stock and product unit management
│   │   │   ├── Members.jsx    ← Member list and credit limits
│   │   │   ├── MemberDetail.jsx← Ledger and credit history per member
│   │   │   ├── CreditRequests.jsx← Approve/reject credit requests
│   │   │   ├── Dashboard.jsx  ← Summary metrics
│   │   │   ├── Reports.jsx    ← Charts and tabular reports
│   │   │   ├── Settings.jsx   ← Staff + category management (admin)
│   │   │   └── Login.jsx      ← Auth entry point
│   │   ├── App.jsx            ← Route definitions + role-based guards
│   │   └── main.jsx           ← ReactDOM entry point
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── package.json
│
├── server/                    ← Node.js + Express backend
│   ├── config/
│   │   └── db.js              ← MySQL2 connection pool
│   ├── middleware/
│   │   └── auth.js            ← JWT verify middleware + role guard
│   ├── routes/
│   │   ├── auth.js            ← Login, token issuance
│   │   ├── users.js           ← Staff CRUD (admin only)
│   │   ├── products.js        ← Product + category CRUD, image upload
│   │   ├── inventory.js       ← Stock levels, restock, product-unit CRUD
│   │   ├── transactions.js    ← Sale creation, cart processing
│   │   ├── members.js         ← Member CRUD, credit limit
│   │   ├── credit.js          ← Credit ledger, payment processing
│   │   ├── creditRequests.js  ← Request workflow (pending/approved/rejected)
│   │   └── reports.js         ← Aggregated SQL queries for reports
│   ├── utils/
│   │   ├── creditScore.js     ← Score adjustment logic
│   │   └── txnCode.js         ← Transaction code generator
│   ├── uploads/               ← Multer file storage (product images)
│   ├── server.js              ← Express app bootstrap + route mounting
│   └── package.json
│
├── database/
│   ├── migrations.sql         ← All table definitions (DDL)
│   └── seed.sql               ← Sample data (admin/cashier users, products)
│
└── .env.example               ← Environment variable template
```

## Architecture Patterns

### Frontend
- **Context + hook pattern**: `AuthContext` provides auth state; pages consume via `useAuth()` hook
- **Centralized API client**: Single Axios instance in `api/axios.js` attaches JWT to every request
- **Page-level data fetching**: Each page owns its own `useEffect` fetch calls — no global state library
- **Role-based routing**: `App.jsx` wraps routes with role checks using auth context

### Backend
- **Route-per-resource**: One file per domain (products, members, credit, etc.) mounted in `server.js`
- **Pool-based DB access**: `db.js` exports a `mysql2` promise pool; routes call `pool.query()` directly
- **Inline SQL**: Raw SQL strings used directly in route handlers — no ORM
- **Utility modules**: Shared logic (credit scoring, txn codes) extracted to `utils/`
- **Single error handler**: Global Express error middleware at bottom of `server.js`

### Data Flow
```
React Page → axios.js (+ JWT header) → Express Route → pool.query(SQL) → MySQL
                                      ↓
                              utils/creditScore.js (on payment)
                              utils/txnCode.js     (on sale)
```
