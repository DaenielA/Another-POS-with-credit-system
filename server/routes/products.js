const router = require('express').Router();
const pool = require('../config/db');
const multer = require('multer');
const path = require('path');
const { authenticate } = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, process.env.UPLOAD_PATH || './uploads'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

router.use(authenticate);

router.get('/search', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.json({ success: true, data: [] });
  try {
    const [rows] = await pool.query(
      `SELECT p.id, p.name, p.image_url, c.name as category,
        pu.id as unit_id, pu.unit_label, pu.unit_type, pu.selling_price, pu.buying_price,
        pu.stock_quantity, pu.low_stock_threshold, pu.pieces_per_unit, pu.parent_unit_id
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN product_units pu ON p.id = pu.product_id
       WHERE p.name LIKE ? AND p.is_active = 1
       ORDER BY p.name`,
      [`%${q}%`]
    );
    const products = groupProductUnits(rows);
    res.json({ success: true, data: products });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/low-stock', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.name as product_name, pu.id, pu.unit_label, pu.stock_quantity, pu.low_stock_threshold
       FROM product_units pu JOIN products p ON pu.product_id = p.id
       WHERE pu.stock_quantity <= pu.low_stock_threshold AND p.is_active = 1`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.id, p.name, p.image_url, p.is_active, p.created_at, c.name as category, c.id as category_id,
        pu.id as unit_id, pu.unit_label, pu.unit_type, pu.selling_price, pu.buying_price,
        pu.stock_quantity, pu.low_stock_threshold, pu.pieces_per_unit, pu.parent_unit_id
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN product_units pu ON p.id = pu.product_id
       WHERE p.is_active = 1
       ORDER BY p.name`
    );
    res.json({ success: true, data: groupProductUnits(rows) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/', upload.single('image'), async (req, res) => {
  const { name, category_id, units } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'Product name required' });
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const image_url = req.file ? `/uploads/${req.file.filename}` : null;
    const [result] = await conn.query(
      'INSERT INTO products (name, category_id, image_url) VALUES (?, ?, ?)',
      [name, category_id || null, image_url]
    );
    const productId = result.insertId;
    const parsedUnits = typeof units === 'string' ? JSON.parse(units) : (units || []);
    const unitIds = {};
    // Insert non-piece units first
    for (const u of parsedUnits) {
      if (u.unit_type !== 'piece') {
        const [ur] = await conn.query(
          'INSERT INTO product_units (product_id, unit_label, unit_type, buying_price, selling_price, stock_quantity, low_stock_threshold, pieces_per_unit) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [productId, u.unit_label, u.unit_type, u.buying_price, u.selling_price, u.stock_quantity || 0, u.low_stock_threshold || 5, u.pieces_per_unit || 1]
        );
        unitIds[u.unit_label] = ur.insertId;
      }
    }
    // Insert piece units with parent reference
    for (const u of parsedUnits) {
      if (u.unit_type === 'piece') {
        const parentId = u.parent_label ? unitIds[u.parent_label] : null;
        await conn.query(
          'INSERT INTO product_units (product_id, unit_label, unit_type, buying_price, selling_price, stock_quantity, low_stock_threshold, pieces_per_unit, parent_unit_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [productId, u.unit_label, u.unit_type, u.buying_price, u.selling_price, u.stock_quantity || 0, u.low_stock_threshold || 5, u.pieces_per_unit || 1, parentId]
        );
      }
    }
    await conn.commit();
    res.status(201).json({ success: true, data: { id: productId } });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ success: false, message: err.message });
  } finally {
    conn.release();
  }
});

router.put('/:id', upload.single('image'), async (req, res) => {
  const { name, category_id } = req.body;
  try {
    const updates = [];
    const params = [];
    if (name) { updates.push('name=?'); params.push(name); }
    if (category_id !== undefined) { updates.push('category_id=?'); params.push(category_id || null); }
    if (req.file) { updates.push('image_url=?'); params.push(`/uploads/${req.file.filename}`); }
    if (!updates.length) return res.status(400).json({ success: false, message: 'Nothing to update' });
    params.push(req.params.id);
    await pool.query(`UPDATE products SET ${updates.join(',')} WHERE id=?`, params);
    res.json({ success: true, message: 'Product updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('UPDATE products SET is_active=0 WHERE id=?', [req.params.id]);
    res.json({ success: true, message: 'Product deactivated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Categories
router.get('/categories/all', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM categories ORDER BY name');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/categories', async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'Name required' });
  try {
    const [r] = await pool.query('INSERT INTO categories (name, description) VALUES (?, ?)', [name, description || null]);
    res.status(201).json({ success: true, data: { id: r.insertId } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/categories/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM categories WHERE id=?', [req.params.id]);
    res.json({ success: true, message: 'Category deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

function groupProductUnits(rows) {
  const map = {};
  for (const row of rows) {
    if (!map[row.id]) {
      map[row.id] = { id: row.id, name: row.name, category: row.category, category_id: row.category_id, image_url: row.image_url, is_active: row.is_active, units: [] };
    }
    if (row.unit_id) {
      map[row.id].units.push({
        id: row.unit_id, unit_label: row.unit_label, unit_type: row.unit_type,
        selling_price: row.selling_price, buying_price: row.buying_price,
        stock_quantity: row.stock_quantity, low_stock_threshold: row.low_stock_threshold,
        pieces_per_unit: row.pieces_per_unit, parent_unit_id: row.parent_unit_id,
      });
    }
  }
  return Object.values(map);
}

module.exports = router;
