const router = require('express').Router();
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.post('/', async (req, res) => {
  const { product_unit_id, quantity, notes } = req.body;
  if (!product_unit_id || !quantity || quantity <= 0) {
    return res.status(400).json({ success: false, message: 'product_unit_id and positive quantity required' });
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [units] = await conn.query('SELECT * FROM product_units WHERE id=?', [product_unit_id]);
    if (!units.length) throw new Error('Product unit not found');
    const unit = units[0];
    const newQty = parseFloat(unit.stock_quantity) + parseFloat(quantity);
    await conn.query('UPDATE product_units SET stock_quantity=? WHERE id=?', [newQty, product_unit_id]);
    await conn.query(
      'INSERT INTO stock_logs (product_unit_id, change_type, quantity_change, quantity_after, notes, logged_by) VALUES (?,?,?,?,?,?)',
      [product_unit_id, 'restock', quantity, newQty, notes || null, req.user.id]
    );
    await conn.commit();
    res.json({ success: true, data: { new_stock: newQty } });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ success: false, message: err.message });
  } finally {
    conn.release();
  }
});

router.get('/logs', async (req, res) => {
  const { product_unit_id, limit = 100 } = req.query;
  try {
    let query = `SELECT sl.*, p.name as product_name, pu.unit_label, u.name as logged_by_name
      FROM stock_logs sl
      JOIN product_units pu ON sl.product_unit_id = pu.id
      JOIN products p ON pu.product_id = p.id
      JOIN users u ON sl.logged_by = u.id`;
    const params = [];
    if (product_unit_id) { query += ' WHERE sl.product_unit_id=?'; params.push(product_unit_id); }
    query += ` ORDER BY sl.created_at DESC LIMIT ${parseInt(limit)}`;
    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/alerts', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.name as product_name, p.id as product_id, pu.id, pu.unit_label, pu.stock_quantity, pu.low_stock_threshold
       FROM product_units pu JOIN products p ON pu.product_id = p.id
       WHERE pu.stock_quantity <= pu.low_stock_threshold AND p.is_active = 1
       ORDER BY pu.stock_quantity ASC`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Product unit CRUD
router.post('/units', async (req, res) => {
  const { product_id, unit_label, unit_type, buying_price, selling_price, stock_quantity, low_stock_threshold, pieces_per_unit, parent_unit_id } = req.body;
  if (!product_id || !unit_label || !unit_type || !buying_price || !selling_price) {
    return res.status(400).json({ success: false, message: 'Required fields missing' });
  }
  try {
    const [r] = await pool.query(
      'INSERT INTO product_units (product_id, unit_label, unit_type, buying_price, selling_price, stock_quantity, low_stock_threshold, pieces_per_unit, parent_unit_id) VALUES (?,?,?,?,?,?,?,?,?)',
      [product_id, unit_label, unit_type, buying_price, selling_price, stock_quantity || 0, low_stock_threshold || 5, pieces_per_unit || 1, parent_unit_id || null]
    );
    res.status(201).json({ success: true, data: { id: r.insertId } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/units/:id', async (req, res) => {
  const { buying_price, selling_price, low_stock_threshold, unit_label, pieces_per_unit } = req.body;
  try {
    const updates = [];
    const params = [];
    if (buying_price !== undefined) { updates.push('buying_price=?'); params.push(buying_price); }
    if (selling_price !== undefined) { updates.push('selling_price=?'); params.push(selling_price); }
    if (low_stock_threshold !== undefined) { updates.push('low_stock_threshold=?'); params.push(low_stock_threshold); }
    if (unit_label) { updates.push('unit_label=?'); params.push(unit_label); }
    if (pieces_per_unit !== undefined) { updates.push('pieces_per_unit=?'); params.push(pieces_per_unit); }
    if (!updates.length) return res.status(400).json({ success: false, message: 'Nothing to update' });
    params.push(req.params.id);
    await pool.query(`UPDATE product_units SET ${updates.join(',')} WHERE id=?`, params);
    res.json({ success: true, message: 'Unit updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/units/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM product_units WHERE id=?', [req.params.id]);
    res.json({ success: true, message: 'Unit deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
