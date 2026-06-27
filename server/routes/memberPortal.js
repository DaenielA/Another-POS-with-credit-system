const router = require('express').Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const authenticateMember = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'No token provided' });
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== 'member') return res.status(403).json({ success: false, message: 'Not a member token' });
    req.member = decoded;
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

// Login with phone + PIN
router.post('/login', async (req, res) => {
  const { phone, pin } = req.body;
  if (!phone || !pin) return res.status(400).json({ success: false, message: 'Phone and PIN required' });
  try {
    const [members] = await pool.query(
      'SELECT * FROM members WHERE phone=? AND is_active=1',
      [phone]
    );
    if (!members.length) return res.status(401).json({ success: false, message: 'Invalid phone or PIN' });
    const member = members[0];
    if (!member.pin) return res.status(401).json({ success: false, message: 'PIN not set. Please contact the store.' });
    const valid = await bcrypt.compare(pin, member.pin);
    if (!valid) return res.status(401).json({ success: false, message: 'Invalid phone or PIN' });
    const token = jwt.sign(
      { id: member.id, name: member.full_name, phone: member.phone, type: 'member' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.json({ success: true, data: { token, member: { id: member.id, full_name: member.full_name, phone: member.phone } } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get own profile
router.get('/me', authenticateMember, async (req, res) => {
  try {
    const [members] = await pool.query(
      `SELECT id, full_name, phone, address, credit_score, current_credit_limit,
        outstanding_balance, membership_date,
        ROUND(current_credit_limit - outstanding_balance, 2) as available_credit
       FROM members WHERE id=?`,
      [req.member.id]
    );
    if (!members.length) return res.status(404).json({ success: false, message: 'Member not found' });
    res.json({ success: true, data: members[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get own ledger
router.get('/ledger', authenticateMember, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT cl.*, t.transaction_code, u.name as created_by_name
       FROM credit_ledger cl
       LEFT JOIN transactions t ON cl.transaction_id = t.id
       JOIN users u ON cl.created_by = u.id
       WHERE cl.member_id=? ORDER BY cl.created_at DESC LIMIT 30`,
      [req.member.id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get own loans
router.get('/loans', authenticateMember, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT cl.*, u.name as created_by_name FROM cash_loans cl
       JOIN users u ON cl.created_by = u.id
       WHERE cl.member_id=? ORDER BY cl.created_at DESC`,
      [req.member.id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Submit credit limit request
router.post('/credit-request', authenticateMember, async (req, res) => {
  const { requested_limit, reason } = req.body;
  if (!requested_limit) return res.status(400).json({ success: false, message: 'requested_limit required' });
  try {
    const [existing] = await pool.query(
      "SELECT id FROM credit_limit_requests WHERE member_id=? AND status='pending'",
      [req.member.id]
    );
    if (existing.length) return res.status(400).json({ success: false, message: 'You already have a pending request' });

    const [members] = await pool.query('SELECT credit_score, current_credit_limit FROM members WHERE id=?', [req.member.id]);
    const member = members[0];

    if (parseFloat(requested_limit) <= parseFloat(member.current_credit_limit)) {
      return res.status(400).json({ success: false, message: 'Requested limit must be higher than current limit' });
    }

    const score = parseFloat(member.credit_score);
    let status = 'pending';
    if (score < 60) status = 'rejected';

    const [r] = await pool.query(
      'INSERT INTO credit_limit_requests (member_id, requested_limit, reason, status) VALUES (?,?,?,?)',
      [req.member.id, requested_limit, reason || null, status]
    );
    res.status(201).json({ success: true, data: { id: r.insertId, status } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get own credit requests
router.get('/credit-requests', authenticateMember, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT clr.*, u.name as reviewed_by_name FROM credit_limit_requests clr
       LEFT JOIN users u ON clr.reviewed_by = u.id
       WHERE clr.member_id=? ORDER BY clr.created_at DESC`,
      [req.member.id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = { router, authenticateMember };
