const router = require('express').Router();
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { calculateNewScore } = require('../utils/creditScore');

router.use(authenticate);

router.post('/pay', async (req, res) => {
  const { member_id, payment_mode, amount_paid, payment_date, notes } = req.body;
  if (!member_id || !payment_mode || !amount_paid || !payment_date) {
    return res.status(400).json({ success: false, message: 'member_id, payment_mode, amount_paid, payment_date required' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [members] = await conn.query('SELECT * FROM members WHERE id=?', [member_id]);
    if (!members.length) throw new Error('Member not found');
    const member = members[0];

    const isFullPay = payment_mode === 'full';
    const actualAmount = isFullPay ? parseFloat(member.outstanding_balance) : parseFloat(amount_paid);
    if (actualAmount <= 0) throw new Error('No outstanding balance');
    if (actualAmount > parseFloat(member.outstanding_balance)) throw new Error('Payment exceeds balance');

    const newBalance = parseFloat(member.outstanding_balance) - actualAmount;
    const newScore = calculateNewScore(parseFloat(member.credit_score), 'on_time', isFullPay);

    await conn.query(
      'UPDATE members SET outstanding_balance=?, credit_score=? WHERE id=?',
      [newBalance, newScore, member_id]
    );
    await conn.query(
      'INSERT INTO credit_payments (member_id, payment_mode, amount_paid, payment_date, received_by, notes) VALUES (?,?,?,?,?,?)',
      [member_id, payment_mode, actualAmount, payment_date, req.user.id, notes || null]
    );
    await conn.query(
      'INSERT INTO credit_ledger (member_id, entry_type, amount, balance_after, notes, created_by) VALUES (?,?,?,?,?,?)',
      [member_id, 'payment', -actualAmount, newBalance, `${payment_mode} payment${notes ? ': ' + notes : ''}`, req.user.id]
    );

    await conn.commit();
    res.json({ success: true, data: { new_balance: newBalance, new_score: newScore } });
  } catch (err) {
    await conn.rollback();
    res.status(400).json({ success: false, message: err.message });
  } finally {
    conn.release();
  }
});

router.get('/summary/:memberId', async (req, res) => {
  try {
    const [members] = await pool.query(
      `SELECT m.*, ROUND(m.current_credit_limit - m.outstanding_balance, 2) as available_credit
       FROM members m WHERE m.id=?`,
      [req.params.memberId]
    );
    if (!members.length) return res.status(404).json({ success: false, message: 'Member not found' });

    const [payments] = await pool.query(
      `SELECT cp.*, u.name as received_by_name FROM credit_payments cp
       JOIN users u ON cp.received_by=u.id
       WHERE cp.member_id=? ORDER BY cp.payment_date DESC LIMIT 10`,
      [req.params.memberId]
    );

    res.json({ success: true, data: { ...members[0], recent_payments: payments } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
