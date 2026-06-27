const router = require('express').Router();
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { generateTxnCode } = require('../utils/txnCode');
const { getCreditAllowance } = require('../utils/creditScore');

router.use(authenticate);

router.post('/', async (req, res) => {
  const { member_id, payment_type, items, discount = 0, amount_tendered = 0 } = req.body;
  if (!items?.length) return res.status(400).json({ success: false, message: 'No items in cart' });
  if (!payment_type) return res.status(400).json({ success: false, message: 'payment_type required' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Validate and compute totals
    let subtotal = 0;
    const itemDetails = [];

    for (const item of items) {
      const [units] = await conn.query('SELECT * FROM product_units WHERE id=?', [item.product_unit_id]);
      if (!units.length) throw new Error(`Unit ${item.product_unit_id} not found`);
      const unit = units[0];

      const itemSubtotal = parseFloat(unit.selling_price) * parseFloat(item.quantity);
      subtotal += itemSubtotal;
      itemDetails.push({ unit, quantity: item.quantity, unit_price: unit.selling_price, subtotal: itemSubtotal });
    }

    const total_amount = parseFloat(subtotal) - parseFloat(discount);
    const change_amount = payment_type === 'cash' ? Math.max(0, parseFloat(amount_tendered) - total_amount) : 0;

    // Credit validation
    let member = null;
    if (payment_type === 'credit') {
      if (!member_id) throw new Error('Member required for credit purchases');
      const [members] = await conn.query('SELECT * FROM members WHERE id=? AND is_active=1', [member_id]);
      if (!members.length) throw new Error('Member not found');
      member = members[0];
      const { allowed, availableCredit, reason } = getCreditAllowance(member);
      if (!allowed) throw new Error(reason || 'Credit not allowed');
      if (total_amount > availableCredit) throw new Error(`Insufficient credit. Available: ₱${availableCredit.toFixed(2)}`);
    }

    // Generate transaction code
    const transaction_code = await generateTxnCode(conn);

    // Insert transaction
    const [txnResult] = await conn.query(
      `INSERT INTO transactions (transaction_code, cashier_id, member_id, payment_type, subtotal, discount, total_amount, amount_tendered, change_amount)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [transaction_code, req.user.id, member_id || null, payment_type, subtotal, discount, total_amount, amount_tendered, change_amount]
    );
    const txnId = txnResult.insertId;

    // Insert items and deduct stock
    for (const { unit, quantity, unit_price, subtotal: itemSub } of itemDetails) {
      await conn.query(
        'INSERT INTO transaction_items (transaction_id, product_unit_id, quantity, unit_price, subtotal) VALUES (?,?,?,?,?)',
        [txnId, unit.id, quantity, unit_price, itemSub]
      );

      // Determine which unit to deduct from
      let deductUnitId = unit.id;
      let deductQty = parseFloat(quantity);

      if (unit.unit_type === 'piece' && unit.parent_unit_id) {
        // Deduct from parent unit proportionally
        deductUnitId = unit.parent_unit_id;
        deductQty = parseFloat(quantity) / parseFloat(unit.pieces_per_unit);
      }

      const [deductUnits] = await conn.query('SELECT stock_quantity FROM product_units WHERE id=?', [deductUnitId]);
      if (!deductUnits.length) throw new Error('Stock unit not found');
      const newQty = Math.max(0, parseFloat(deductUnits[0].stock_quantity) - deductQty);
      await conn.query('UPDATE product_units SET stock_quantity=? WHERE id=?', [newQty, deductUnitId]);
      await conn.query(
        'INSERT INTO stock_logs (product_unit_id, change_type, quantity_change, quantity_after, reference_id, logged_by) VALUES (?,?,?,?,?,?)',
        [deductUnitId, 'sale', -deductQty, newQty, txnId, req.user.id]
      );
    }

    // Credit ledger update
    if (payment_type === 'credit' && member) {
      const newBalance = parseFloat(member.outstanding_balance) + total_amount;
      await conn.query('UPDATE members SET outstanding_balance=? WHERE id=?', [newBalance, member_id]);
      await conn.query(
        'INSERT INTO credit_ledger (member_id, transaction_id, entry_type, amount, balance_after, notes, created_by) VALUES (?,?,?,?,?,?,?)',
        [member_id, txnId, 'purchase', total_amount, newBalance, `Sale ${transaction_code}`, req.user.id]
      );
    }

    await conn.commit();

    // Return full transaction
    const [txnRows] = await pool.query(
      `SELECT t.*, u.name as cashier_name, m.full_name as member_name FROM transactions t
       JOIN users u ON t.cashier_id = u.id
       LEFT JOIN members m ON t.member_id = m.id
       WHERE t.id=?`, [txnId]
    );
    const [tItems] = await pool.query(
      `SELECT ti.*, p.name as product_name, pu.unit_label FROM transaction_items ti
       JOIN product_units pu ON ti.product_unit_id = pu.id
       JOIN products p ON pu.product_id = p.id
       WHERE ti.transaction_id=?`, [txnId]
    );

    res.status(201).json({ success: true, data: { ...txnRows[0], items: tItems } });
  } catch (err) {
    await conn.rollback();
    res.status(400).json({ success: false, message: err.message });
  } finally {
    conn.release();
  }
});

router.get('/', async (req, res) => {
  const { date, cashier_id, limit = 50, offset = 0 } = req.query;
  try {
    let where = [];
    const params = [];
    if (date) { where.push('DATE(t.transaction_date)=?'); params.push(date); }
    if (cashier_id) { where.push('t.cashier_id=?'); params.push(cashier_id); }
    const whereStr = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [rows] = await pool.query(
      `SELECT t.*, u.name as cashier_name, m.full_name as member_name
       FROM transactions t JOIN users u ON t.cashier_id=u.id
       LEFT JOIN members m ON t.member_id=m.id
       ${whereStr} ORDER BY t.transaction_date DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [txns] = await pool.query(
      `SELECT t.*, u.name as cashier_name, m.full_name as member_name FROM transactions t
       JOIN users u ON t.cashier_id=u.id
       LEFT JOIN members m ON t.member_id=m.id
       WHERE t.id=?`, [req.params.id]
    );
    if (!txns.length) return res.status(404).json({ success: false, message: 'Not found' });
    const [items] = await pool.query(
      `SELECT ti.*, p.name as product_name, pu.unit_label, pu.buying_price FROM transaction_items ti
       JOIN product_units pu ON ti.product_unit_id=pu.id
       JOIN products p ON pu.product_id=p.id
       WHERE ti.transaction_id=?`, [req.params.id]
    );
    res.json({ success: true, data: { ...txns[0], items } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
