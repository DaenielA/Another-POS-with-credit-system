const router = require('express').Router();
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/daily', async (req, res) => {
  const { date = new Date().toISOString().slice(0, 10) } = req.query;
  try {
    const [summary] = await pool.query(
      `SELECT COUNT(*) as total_transactions, COALESCE(SUM(total_amount),0) as total_sales,
       COALESCE(SUM(discount),0) as total_discounts
       FROM transactions WHERE DATE(transaction_date)=?`, [date]
    );
    const [items] = await pool.query(
      `SELECT SUM(ti.quantity) as total_items,
       SUM((ti.unit_price - pu.buying_price) * ti.quantity) as total_profit
       FROM transaction_items ti
       JOIN product_units pu ON ti.product_unit_id = pu.id
       JOIN transactions t ON ti.transaction_id = t.id
       WHERE DATE(t.transaction_date)=?`, [date]
    );
    res.json({ success: true, data: { date, ...summary[0], ...items[0] } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/monthly', async (req, res) => {
  const { month = new Date().toISOString().slice(0, 7) } = req.query; // YYYY-MM
  try {
    const [daily] = await pool.query(
      `SELECT DATE(transaction_date) as date, COUNT(*) as transactions,
       SUM(total_amount) as sales
       FROM transactions WHERE DATE_FORMAT(transaction_date, '%Y-%m')=?
       GROUP BY DATE(transaction_date) ORDER BY date`, [month]
    );
    const [totals] = await pool.query(
      `SELECT COUNT(*) as total_transactions, COALESCE(SUM(total_amount),0) as total_sales,
       SUM((ti.unit_price - pu.buying_price)*ti.quantity) as total_profit
       FROM transactions t
       JOIN transaction_items ti ON t.id = ti.transaction_id
       JOIN product_units pu ON ti.product_unit_id = pu.id
       WHERE DATE_FORMAT(t.transaction_date,'%Y-%m')=?`, [month]
    );
    res.json({ success: true, data: { month, daily, ...totals[0] } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/top-products', async (req, res) => {
  const { limit = 10, start, end } = req.query;
  try {
    let where = '';
    const params = [];
    if (start && end) { where = 'WHERE DATE(t.transaction_date) BETWEEN ? AND ?'; params.push(start, end); }
    const [rows] = await pool.query(
      `SELECT p.name, pu.unit_label, SUM(ti.quantity) as total_qty,
       SUM(ti.subtotal) as total_revenue,
       SUM((ti.unit_price - pu.buying_price) * ti.quantity) as total_profit
       FROM transaction_items ti
       JOIN product_units pu ON ti.product_unit_id = pu.id
       JOIN products p ON pu.product_id = p.id
       JOIN transactions t ON ti.transaction_id = t.id
       ${where}
       GROUP BY p.id, pu.id ORDER BY total_qty DESC LIMIT ?`,
      [...params, parseInt(limit)]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/cashier', async (req, res) => {
  const { start, end } = req.query;
  try {
    let where = '';
    const params = [];
    if (start && end) { where = 'WHERE DATE(t.transaction_date) BETWEEN ? AND ?'; params.push(start, end); }
    const [rows] = await pool.query(
      `SELECT u.name as cashier, COUNT(t.id) as transactions,
       COALESCE(SUM(t.total_amount),0) as total_sales
       FROM transactions t JOIN users u ON t.cashier_id = u.id
       ${where}
       GROUP BY t.cashier_id ORDER BY total_sales DESC`,
      params
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/credit-status', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT m.id, m.full_name, m.phone, m.outstanding_balance, m.current_credit_limit,
       m.credit_score, ROUND(m.current_credit_limit - m.outstanding_balance, 2) as available_credit,
       (SELECT MAX(cp.payment_date) FROM credit_payments cp WHERE cp.member_id = m.id) as last_payment_date
       FROM members m WHERE m.outstanding_balance > 0 AND m.is_active = 1
       ORDER BY m.outstanding_balance DESC`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/week', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT DATE(transaction_date) as date, COALESCE(SUM(total_amount),0) as sales, COUNT(*) as transactions
       FROM transactions
       WHERE transaction_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
       GROUP BY DATE(transaction_date) ORDER BY date`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/dashboard', async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const [[todaySales]] = await pool.query(
      `SELECT COALESCE(SUM(total_amount),0) as sales, COUNT(*) as transactions FROM transactions WHERE DATE(transaction_date)=?`, [today]
    );
    const [[lowStock]] = await pool.query(
      `SELECT COUNT(*) as count FROM product_units pu JOIN products p ON pu.product_id=p.id WHERE pu.stock_quantity<=pu.low_stock_threshold AND p.is_active=1`
    );
    const [[overdueCredit]] = await pool.query(
      `SELECT COUNT(*) as count FROM members WHERE outstanding_balance > 0 AND is_active=1`
    );
    res.json({ success: true, data: { today_sales: todaySales.sales, today_transactions: todaySales.transactions, low_stock_count: lowStock.count, members_with_balance: overdueCredit.count } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
