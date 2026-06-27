const router = require('express').Router();
const pool = require('../config/db');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { getLimitRequestDecision } = require('../utils/creditScore');

router.use(authenticate);

router.post('/', async (req, res) => {
  const { member_id, requested_limit, reason } = req.body;
  if (!member_id || !requested_limit) return res.status(400).json({ success: false, message: 'member_id and requested_limit required' });
  try {
    const [existing] = await pool.query(
      "SELECT id FROM credit_limit_requests WHERE member_id=? AND status='pending'",
      [member_id]
    );
    if (existing.length) return res.status(400).json({ success: false, message: 'Already has a pending request' });

    const [members] = await pool.query('SELECT credit_score FROM members WHERE id=?', [member_id]);
    if (!members.length) return res.status(404).json({ success: false, message: 'Member not found' });

    const decision = getLimitRequestDecision(parseFloat(members[0].credit_score));
    let status = 'pending';
    if (decision === 'auto_reject') status = 'rejected';

    const [r] = await pool.query(
      'INSERT INTO credit_limit_requests (member_id, requested_limit, reason, status) VALUES (?,?,?,?)',
      [member_id, requested_limit, reason || null, status]
    );
    res.status(201).json({ success: true, data: { id: r.insertId, status, decision } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/', requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT clr.*, m.full_name, m.credit_score, m.current_credit_limit, u.name as reviewed_by_name
       FROM credit_limit_requests clr
       JOIN members m ON clr.member_id = m.id
       LEFT JOIN users u ON clr.reviewed_by = u.id
       ORDER BY clr.created_at DESC`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  const { action } = req.body; // 'approve' or 'reject'
  if (!['approve', 'reject'].includes(action)) return res.status(400).json({ success: false, message: 'action must be approve or reject' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [requests] = await conn.query('SELECT * FROM credit_limit_requests WHERE id=?', [req.params.id]);
    if (!requests.length) throw new Error('Request not found');
    const request = requests[0];
    if (request.status !== 'pending') throw new Error('Request already processed');

    const status = action === 'approve' ? 'approved' : 'rejected';
    await conn.query(
      'UPDATE credit_limit_requests SET status=?, reviewed_by=?, reviewed_at=NOW() WHERE id=?',
      [status, req.user.id, req.params.id]
    );

    if (action === 'approve') {
      await conn.query('UPDATE members SET current_credit_limit=? WHERE id=?', [request.requested_limit, request.member_id]);
    }

    await conn.commit();
    res.json({ success: true, data: { status } });
  } catch (err) {
    await conn.rollback();
    res.status(400).json({ success: false, message: err.message });
  } finally {
    conn.release();
  }
});

module.exports = router;
