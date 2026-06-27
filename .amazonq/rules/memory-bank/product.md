# Product Overview — Tindahan POS System

## Purpose
A full-stack Point-of-Sale system tailored for Filipino sari-sari stores and carinderias. Handles sales, inventory, member credit, and reporting in a single integrated system.

## Target Users
- **Admin**: Full access — manages staff accounts, products, categories, reports, and settings
- **Cashier**: Operational access — processes sales, manages members, handles credit payments

## Key Features

### POS / Sales
- Product search with debounce
- Cart management (add, update quantity, remove)
- Cash and credit payment modes
- Receipt printing support
- Auto-generated transaction codes

### Inventory
- Per-product unit types: piece, pack, wholesale
- Restock logging with history
- Low-stock threshold alerts
- Product image uploads via Multer

### Members & Credit
- Credit scoring system (0–150 points)
- Credit limit management per member
- 4 payment modes: daily, monthly, bulk, full
- Automatic score adjustment on payment behavior
- Ledger history per member
- Credit request workflow (pending → approved/rejected)

### Reports
- Daily and monthly sales summaries
- Top products by revenue/quantity
- Sales breakdown by cashier
- Credit status overview
- Charts via Recharts

### Settings (Admin Only)
- Staff account creation and management
- Product category management
- Password changes

## Credit Score Rules
| Score     | Status    | Allowance                  |
|-----------|-----------|----------------------------|
| < 60      | Blocked   | No credit purchases        |
| 61–80     | Limited   | 50% of credit limit        |
| 81–100    | Good      | Full credit limit           |
| 101–150   | Excellent | Eligible for limit increase |

## Access
- App: http://localhost:5173
- API: http://localhost:5000
- Default admin: admin@pos.com / admin123
- Default cashier: cashier@pos.com / cashier123
