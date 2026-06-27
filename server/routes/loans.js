const router = require('express').Router();
const pool = require('../config/db');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.use(authenticate);

// Get all loans (admin) or loans for a specific member
router.get('/', requireAdmin, async (req, res) => {
  const { member_id, status } = req.query;
  try {
    let where = 'WHERE 1=1';
    const params = [];
    if (member_id) { where += ' AND cl.member_id=?'; params.push(member_id); }
    if (status) { where += ' AND cl.status=?'; params.push(status); }
    const [rows] = await pool.query(
      `SELECT cl.*, m.full_name, m.credit_score, u.name as created_by_name
       FROM cash_loans cl
       JOIN members m ON cl.member_id = m.id
       JOIN users u ON cl.created_by = u.id
       ${where}
       ORDER BY cl.created_at DESC`,
      params
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get loans for a specific member
router.get('/member/:memberId', async (req, res) => {
  try {
    const [loans] = await pool.query(
      `SELECT cl.*, u.name as created_by_name FROM cash_loans cl
       JOIN users u ON cl.created_by = u.id
       WHERE cl.member_id=? ORDER BY cl.created_at DESC`,
      [req.params.memberId]
    );
    const [payments] = await pool.query(
      `SELECT lp.*, u.name as received_by_name FROM loan_payments lp
       JOIN users u ON lp.received_by = u.id
       WHERE lp.member_id=? ORDER BY lp.payment_date DESC`,
      [req.params.memberId]
    );
    res.json({ success: true, data: { loans, payments } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Create a new loan (lend money to member)
router.post('/', requireAdmin, async (req, res) => {
  const { member_id, amount, due_date, notes } = req.body;
  if (!member_id || !amount) return res.status(400).json({ success: false, message: 'member_id and amount required' });
  if (parseFloat(amount) <= 0) return res.status(400).json({ success: false, message: 'Amount must be greater than 0' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [members] = await conn.query('SELECT * FROM members WHERE id=? AND is_active=1', [member_id]);
    if (!members.length) throw new Error('Member not found');
    const member = members[0];

    if (parseFloat(member.credit_score) < 60) throw new Error('Member credit score is too low to borrow (below 60)');

    const [r] = await conn.query(
      'INSERT INTO cash_loans (member_id, amount, balance, due_date, notes, created_by) VALUES (?,?,?,?,?,?)',
      [member_id, parseFloat(amount), parseFloat(amount), due_date || null, notes || null, req.user.id]
    );

    // Log to credit ledger
    const newBalance = parseFloat(member.outstanding_balance) + parseFloat(amount);
    await conn.query(
      'UPDATE members SET outstanding_balance=? WHERE id=?',
      [newBalance, member_id]
    );
    await conn.query(
      'INSERT INTO credit_ledger (member_id, entry_type, amount, balance_after, notes, created_by) VALUES (?,?,?,?,?,?)',
      [member_id, 'purchase', parseFloat(amount), newBalance, `Cash loan #${r.insertId}${notes ? ': ' + notes : ''}`, req.user.id]
    );

    await conn.commit();
    res.status(201).json({ success: true, data: { id: r.insertId, balance: parseFloat(amount) } });
  } catch (err) {
    await conn.rollback();
    res.status(400).json({ success: false, message: err.message });
  } finally {
    conn.release();
  }
});

// Record a loan repayment
router.post('/:loanId/pay', async (req, res) => {
  const { amount_paid, payment_date, notes } = req.body;
  if (!amount_paid || !payment_date) return res.status(400).json({ success: false, message: 'amount_paid and payment_date required' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [loans] = await conn.query('SELECT * FROM cash_loans WHERE id=?', [req.params.loanId]);
    if (!loans.length) throw new Error('Loan not found');
    const loan = loans[0];
    if (loan.status === 'paid') throw new Error('Loan is already fully paid');

    const paying = parseFloat(amount_paid);
    if (paying <= 0) throw new Error('Amount must be greater than 0');
    if (paying > parseFloat(loan.balance)) throw new Error(`Payment exceeds remaining balance of ₱${parseFloat(loan.balance).toFixed(2)}`);

    const newLoanBalance = parseFloat(loan.balance) - paying;
    const newAmountPaid = parseFloat(loan.amount_paid) + paying;
    const newStatus = newLoanBalance <= 0 ? 'paid' : 'active';

    await conn.query(
      'UPDATE cash_loans SET balance=?, amount_paid=?, status=? WHERE id=?',
      [newLoanBalance, newAmountPaid, newStatus, loan.id]
    );
    await conn.query(
      'INSERT INTO loan_payments (loan_id, member_id, amount_paid, payment_date, received_by, notes) VALUES (?,?,?,?,?,?)',
      [loan.id, loan.member_id, paying, payment_date, req.user.id, notes || null]
    );

    // Update member outstanding balance and credit ledger
    const [members] = await conn.query('SELECT outstanding_balance FROM members WHERE id=?', [loan.member_id]);
    const newMemberBalance = Math.max(0, parseFloat(members[0].outstanding_balance) - paying);
    await conn.query('UPDATE members SET outstanding_balance=? WHERE id=?', [newMemberBalance, loan.member_id]);
    await conn.query(
      'INSERT INTO credit_ledger (member_id, entry_type, amount, balance_after, notes, created_by) VALUES (?,?,?,?,?,?)',
      [loan.member_id, 'payment', -paying, newMemberBalance, `Loan repayment for loan #${loan.id}${notes ? ': ' + notes : ''}`, req.user.id]
    );

    await conn.commit();
    res.json({ success: true, data: { loan_balance: newLoanBalance, member_balance: newMemberBalance, status: newStatus } });
  } catch (err) {
    await conn.rollback();
    res.status(400).json({ success: false, message: err.message });
  } finally {
    conn.release();
  }
});

module.exports = router;
