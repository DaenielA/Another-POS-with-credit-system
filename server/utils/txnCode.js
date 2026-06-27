const pool = require('../config/db');

// Generate TXN-YYYYMMDD-XXXXXX
const generateTxnCode = async (conn) => {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `TXN-${dateStr}-`;
  const [rows] = await conn.query(
    `SELECT transaction_code FROM transactions WHERE transaction_code LIKE ? ORDER BY id DESC LIMIT 1`,
    [`${prefix}%`]
  );
  const lastNum = rows.length ? parseInt(rows[0].transaction_code.split('-')[2]) : 0;
  return `${prefix}${String(lastNum + 1).padStart(6, '0')}`;
};

module.exports = { generateTxnCode };
