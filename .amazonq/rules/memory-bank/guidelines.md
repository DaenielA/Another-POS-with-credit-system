# Development Guidelines — Tindahan POS System

## Code Quality Standards

### Naming Conventions
- React components: PascalCase (`ReceiptModal`, `MemberModal`, `ProtectedRoute`)
- Functions and variables: camelCase (`addToCart`, `placeOrder`, `groupProductUnits`)
- Database columns and API response keys: snake_case (`full_name`, `credit_score`, `unit_label`)
- CSS utility classes: Tailwind only — no custom CSS except `App.css` for global utilities (`btn-primary`, `btn-secondary`, `input`)
- Short variable names acceptable in narrow scopes: `q`, `t`, `r`, `m`, `u`

### File Conventions
- Frontend: `.jsx` for all React files; ESM imports
- Backend: `.js` for all Node files; CommonJS (`require`/`module.exports`)
- One route file per domain resource, one component per file

---

## Frontend Patterns

### API Calls
Always use the centralized Axios instance from `api/axios.js` — never `fetch` or a raw axios import.

```js
import api from '../api/axios';
api.get('/products/search?q=' + query);
api.post('/transactions', payload);
```

### Debounced Search
Use `setTimeout` / `clearTimeout` inside `useEffect` with a 300ms delay. Return the cleanup function.

```js
useEffect(() => {
  if (!query.trim()) { setResults([]); return; }
  const t = setTimeout(() => {
    api.get(`/endpoint?q=${query}`).then(r => setResults(r.data.data)).catch(() => {});
  }, 300);
  return () => clearTimeout(t);
}, [query]);
```

### State Management
- No global state library. Use `useState` + `useEffect` per page.
- `AuthContext` is the only global state — provides `user`, `isAdmin`, `login()`, `logout()`.
- Consume auth via `useAuth()` hook.

### Error Handling in Components
Store error as a string in component state. Read from `err.response?.data?.message` with a fallback.

```js
} catch (err) {
  setError(err.response?.data?.message || 'Operation failed');
} finally {
  setLoading(false);
}
```

### Modal Pattern
Modals are co-located in the same file as the page that uses them (e.g., `ReceiptModal` and `MemberModal` in `POS.jsx`). They receive only the data they need and an `onClose` callback. They render with `fixed inset-0 bg-black/60` overlay.

### Currency Formatting
Always use `parseFloat(value).toFixed(2)` with `₱` prefix. Never use `toLocaleString` for amounts.

```js
₱{parseFloat(item.subtotal).toFixed(2)}
```

### Role-Based Access
Use `ProtectedRoute` with `adminOnly` prop in `App.jsx`. Inside pages, use `isAdmin` from `useAuth()` to conditionally show UI elements.

```jsx
<ProtectedRoute adminOnly><Layout><Settings /></Layout></ProtectedRoute>
```

### Tailwind Class Conventions
- Reusable element classes (`btn-primary`, `btn-secondary`, `input`) are defined globally — use these instead of repeating utility chains
- Conditional classes via template literals: `` `text-sm ${condition ? 'text-red-500' : 'text-green-500'}` ``
- Layout: flex-based two-panel layouts common in POS/Inventory pages

---

## Backend Patterns

### Route Structure
Every route file follows this pattern:

```js
const router = require('express').Router();
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');

router.use(authenticate); // apply to all routes in file

router.get('/', async (req, res) => { ... });
// ...

module.exports = router;
```

### Response Shape
All responses use a consistent envelope. Always include `success` boolean.

```js
// Success
res.json({ success: true, data: rows });
res.status(201).json({ success: true, data: { id: result.insertId } });

// Error
res.status(400).json({ success: false, message: 'Reason here' });
res.status(500).json({ success: false, message: err.message });
```

### Database Queries
Use `pool.query()` for simple queries. Use `pool.getConnection()` with explicit `beginTransaction` / `commit` / `rollback` / `release` for multi-step writes.

```js
// Simple
const [rows] = await pool.query('SELECT ...', [params]);

// Transaction
const conn = await pool.getConnection();
try {
  await conn.beginTransaction();
  await conn.query('INSERT ...', [...]);
  await conn.commit();
} catch (err) {
  await conn.rollback();
  res.status(500).json({ success: false, message: err.message });
} finally {
  conn.release();
}
```

### Input Validation
Validate required fields at the top of the handler before any DB work. Return 400 immediately.

```js
if (!name) return res.status(400).json({ success: false, message: 'Name required' });
```

### Dynamic UPDATE Queries
Build `SET` clauses dynamically using arrays to avoid overwriting unchanged fields.

```js
const updates = [], params = [];
if (name)    { updates.push('name=?');     params.push(name); }
if (req.file){ updates.push('image_url=?');params.push(`/uploads/${req.file.filename}`); }
if (!updates.length) return res.status(400).json({ success: false, message: 'Nothing to update' });
params.push(req.params.id);
await pool.query(`UPDATE table SET ${updates.join(',')} WHERE id=?`, params);
```

### Soft Deletes
Products (and similar entities) use `is_active = 0` for deletion rather than `DELETE`.

```js
await pool.query('UPDATE products SET is_active=0 WHERE id=?', [req.params.id]);
```

### File Uploads (Multer)
Configure storage with `diskStorage`, store in `UPLOAD_PATH` env var, filename is `Date.now()-originalname`. Limit file size to 5MB. Serve via `express.static('/uploads')`.

### Utility Functions
Extract reusable business logic to `server/utils/`. Keep utilities pure — input params in, computed result out, no DB calls.

```js
// utils/creditScore.js
const calculateNewScore = (currentScore, paymentStatus, isFullPay = false) => { ... };
module.exports = { calculateNewScore, getCreditAllowance, getLimitRequestDecision };
```

### Optional WHERE Clauses in Reports
Build `WHERE` clause conditionally when date range filters are optional.

```js
let where = '', params = [];
if (start && end) { where = 'WHERE DATE(t.transaction_date) BETWEEN ? AND ?'; params.push(start, end); }
await pool.query(`SELECT ... FROM ... ${where} GROUP BY ...`, params);
```

### Data Aggregation in Backend
Use SQL-level aggregation (`GROUP BY`, `SUM`, `COUNT`, `COALESCE`) instead of JavaScript post-processing. Co-locate result shaping helpers (like `groupProductUnits`) at the bottom of the route file.

---

## Architecture Rules
1. Never bypass `api/axios.js` on the frontend — JWT injection depends on it
2. Never call the DB from `utils/` — keep utilities pure
3. Admin-only routes must use `adminOnly` prop on `ProtectedRoute` in `App.jsx` AND enforce role in the backend middleware when needed
4. Transaction-safe multi-row inserts must use `getConnection()` + explicit transaction
5. All monetary values are stored and transmitted as decimals; always `parseFloat()` before arithmetic on the frontend
