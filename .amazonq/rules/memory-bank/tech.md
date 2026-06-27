# Tech Stack — Tindahan POS System

## Frontend (`client/`)
| Layer | Technology | Version |
|---|---|---|
| Framework | React | ^19.2.7 |
| Build Tool | Vite | ^8.1.0 |
| Styling | Tailwind CSS | ^3.4.19 |
| Routing | React Router DOM | ^7.18.0 |
| HTTP Client | Axios | ^1.18.1 |
| Forms | React Hook Form | ^7.80.0 |
| Charts | Recharts | ^3.9.0 |
| Icons | Lucide React | ^1.21.0 |
| Linter | oxlint | ^1.69.0 |
| Module System | ESM (`"type": "module"`) | — |

## Backend (`server/`)
| Layer | Technology | Version |
|---|---|---|
| Runtime | Node.js | — |
| Framework | Express | ^5.2.1 |
| Database Driver | mysql2 | ^3.22.5 |
| Auth | jsonwebtoken | ^9.0.3 |
| Password Hashing | bcrypt | ^6.0.0 |
| File Uploads | multer | ^2.2.0 |
| ID Generation | uuid | ^14.0.1 |
| Env Config | dotenv | ^17.4.2 |
| CORS | cors | ^2.8.6 |
| Module System | CommonJS (`"type": "commonjs"`) | — |

## Database
- MySQL 8.0
- Connection via `mysql2` promise pool (`server/config/db.js`)
- Schema defined in `database/migrations.sql`
- Sample data in `database/seed.sql`

## Environment Variables (`server/.env`)
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

## Development Commands

### Backend
```bash
cd server
npm start        # production — node server.js
npm run dev      # development — nodemon server.js
```

### Frontend
```bash
cd client
npm run dev      # Vite dev server → http://localhost:5173
npm run build    # Production build
npm run preview  # Preview production build
npm run lint     # oxlint static analysis
```

### Database Setup
```sql
SOURCE /path/to/database/migrations.sql;
SOURCE /path/to/database/seed.sql;
```

## Key Configuration Files
- `client/vite.config.js` — Vite + React plugin setup
- `client/tailwind.config.js` — Tailwind content paths
- `client/postcss.config.js` — PostCSS for Tailwind
- `client/.oxlintrc.json` — Linting rules
- `server/config/db.js` — MySQL pool creation
- `server/middleware/auth.js` — JWT verification + role enforcement
