const router = require('express').Router();
const bcrypt = require('bcrypt');
const pool = require('../config/db');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.use(authenticate);

router.get('/', requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.email, u.is_active, u.created_at, r.name as role
       FROM users u JOIN roles r ON u.role_id = r.id ORDER BY u.created_at DESC`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) return res.status(400).json({ success: false, message: 'All fields required' });
  try {
    const [roles] = await pool.query('SELECT id FROM roles WHERE name = ?', [role]);
    if (!roles.length) return res.status(400).json({ success: false, message: 'Invalid role' });
    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password, role_id) VALUES (?, ?, ?, ?)',
      [name, email, hash, roles[0].id]
    );
    res.status(201).json({ success: true, data: { id: result.insertId } });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ success: false, message: 'Email already exists' });
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  const { name, email, role, is_active, password } = req.body;
  try {
    const updates = [];
    const params = [];
    if (name) { updates.push('name=?'); params.push(name); }
    if (email) { updates.push('email=?'); params.push(email); }
    if (role) {
      const [roles] = await pool.query('SELECT id FROM roles WHERE name = ?', [role]);
      if (roles.length) { updates.push('role_id=?'); params.push(roles[0].id); }
    }
    if (is_active !== undefined) { updates.push('is_active=?'); params.push(is_active); }
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      updates.push('password=?'); params.push(hash);
    }
    if (!updates.length) return res.status(400).json({ success: false, message: 'No fields to update' });
    params.push(req.params.id);
    await pool.query(`UPDATE users SET ${updates.join(',')} WHERE id=?`, params);
    res.json({ success: true, message: 'User updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await pool.query('UPDATE users SET is_active=0 WHERE id=?', [req.params.id]);
    res.json({ success: true, message: 'User deactivated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
