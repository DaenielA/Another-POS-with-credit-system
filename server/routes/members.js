const router = require('express').Router();
const pool = require('../config/db');
const multer = require('multer');
const { authenticate } = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, process.env.UPLOAD_PATH || './uploads'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

router.use(authenticate);

router.get('/', async (req, res) => {
  const { q } = req.query;
  try {
    let sql = `SELECT m.*, 
      ROUND(m.current_credit_limit - m.outstanding_balance, 2) as available_credit
      FROM members m WHERE m.is_active=1`;
    const params = [];
    if (q) { sql += ' AND (m.full_name LIKE ? OR m.phone LIKE ?)'; params.push(`%${q}%`, `%${q}%`); }
    sql += ' ORDER BY m.full_name';
    const [rows] = await pool.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/', upload.single('id_photo'), async (req, res) => {
  const { full_name, phone, address } = req.body;
  if (!full_name) return res.status(400).json({ success: false, message: 'Full name required' });
  try {
    const id_photo_url = req.file ? `/uploads/${req.file.filename}` : null;
    const [r] = await pool.query(
      'INSERT INTO members (full_name, phone, address, id_photo_url, membership_date) VALUES (?,?,?,?,CURDATE())',
      [full_name, phone || null, address || null, id_photo_url]
    );
    res.status(201).json({ success: true, data: { id: r.insertId } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [members] = await pool.query(
      `SELECT m.*, ROUND(m.current_credit_limit - m.outstanding_balance, 2) as available_credit FROM members m WHERE m.id=?`,
      [req.params.id]
    );
    if (!members.length) return res.status(404).json({ success: false, message: 'Member not found' });
    res.json({ success: true, data: members[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/:id', upload.single('id_photo'), async (req, res) => {
  const { full_name, phone, address } = req.body;
  try {
    const updates = [];
    const params = [];
    if (full_name) { updates.push('full_name=?'); params.push(full_name); }
    if (phone !== undefined) { updates.push('phone=?'); params.push(phone); }
    if (address !== undefined) { updates.push('address=?'); params.push(address); }
    if (req.file) { updates.push('id_photo_url=?'); params.push(`/uploads/${req.file.filename}`); }
    if (!updates.length) return res.status(400).json({ success: false, message: 'Nothing to update' });
    params.push(req.params.id);
    await pool.query(`UPDATE members SET ${updates.join(',')} WHERE id=?`, params);
    res.json({ success: true, message: 'Member updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/:id/ledger', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT cl.*, t.transaction_code, u.name as created_by_name FROM credit_ledger cl
       LEFT JOIN transactions t ON cl.transaction_id = t.id
       JOIN users u ON cl.created_by = u.id
       WHERE cl.member_id=? ORDER BY cl.created_at DESC`,
      [req.params.id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/:id/payments', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT cp.*, u.name as received_by_name FROM credit_payments cp
       JOIN users u ON cp.received_by = u.id
       WHERE cp.member_id=? ORDER BY cp.payment_date DESC`,
      [req.params.id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Set member PIN (admin sets it for the member)
router.post('/:id/set-pin', async (req, res) => {
  const { pin } = req.body;
  if (!pin || pin.length < 4) return res.status(400).json({ success: false, message: 'PIN must be at least 4 digits' });
  try {
    const hashed = await require('bcrypt').hash(pin, 10);
    await pool.query('UPDATE members SET pin=? WHERE id=?', [hashed, req.params.id]);
    res.json({ success: true, message: 'PIN set successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
