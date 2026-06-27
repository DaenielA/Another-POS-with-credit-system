USE pos_system;

-- Admin user (password: admin123)
INSERT INTO users (name, email, password, role_id) VALUES
('Admin User', 'admin@pos.com', '$2b$10$tEJuRwZOUPT4rdpJqLpHIOziICq8lbDLD.lXsOed3Ubu.CboUBIUK', 1);

-- Cashier user (password: cashier123)
INSERT INTO users (name, email, password, role_id) VALUES
('Maria Santos', 'cashier@pos.com', '$2b$10$bDfp5Ks5XEXhXw1xpw9/ze0KQhx1HiV6b/hnsFeQZsY8m0LJGv88e', 2);

-- Categories
INSERT INTO categories (name, description) VALUES
('Food', 'Canned goods, snacks, and dry foods'),
('Beverages', 'Drinks, juices, and water'),
('Condiments', 'Sauces, seasonings, and cooking essentials'),
('Personal Care', 'Hygiene and grooming products'),
('Household', 'Cleaning and home supplies');

-- Products with units
INSERT INTO products (name, category_id) VALUES ('Lucky Me Pancit Canton', 1);
INSERT INTO product_units (product_id, unit_label, unit_type, buying_price, selling_price, stock_quantity, low_stock_threshold, pieces_per_unit) VALUES
(1, 'Box (6pcs)', 'wholesale', 55.00, 65.00, 20, 3, 6),
(1, 'Piece', 'piece', 9.00, 12.00, 120, 10, 1);
UPDATE product_units SET parent_unit_id = (SELECT id FROM (SELECT id FROM product_units WHERE product_id=1 AND unit_type='wholesale') t) WHERE product_id=1 AND unit_type='piece';

INSERT INTO products (name, category_id) VALUES ('Coca-Cola', 2);
INSERT INTO product_units (product_id, unit_label, unit_type, buying_price, selling_price, stock_quantity, low_stock_threshold, pieces_per_unit) VALUES
(2, 'Case (24pcs)', 'wholesale', 480.00, 550.00, 5, 2, 24),
(2, 'Piece', 'piece', 20.00, 25.00, 120, 24, 1);
UPDATE product_units SET parent_unit_id = (SELECT id FROM (SELECT id FROM product_units WHERE product_id=2 AND unit_type='wholesale') t) WHERE product_id=2 AND unit_type='piece';

INSERT INTO products (name, category_id) VALUES ('Ajinomoto', 3);
INSERT INTO product_units (product_id, unit_label, unit_type, buying_price, selling_price, stock_quantity, low_stock_threshold, pieces_per_unit) VALUES
(3, 'Pack (10sachets)', 'pack', 25.00, 30.00, 30, 5, 10),
(3, 'Sachet', 'piece', 2.50, 4.00, 300, 50, 1);
UPDATE product_units SET parent_unit_id = (SELECT id FROM (SELECT id FROM product_units WHERE product_id=3 AND unit_type='pack') t) WHERE product_id=3 AND unit_type='piece';

INSERT INTO products (name, category_id) VALUES ('Safeguard Soap', 4);
INSERT INTO product_units (product_id, unit_label, unit_type, buying_price, selling_price, stock_quantity, low_stock_threshold, pieces_per_unit) VALUES
(4, 'Dozen', 'wholesale', 480.00, 600.00, 3, 1, 12),
(4, 'Bar', 'piece', 40.00, 55.00, 36, 6, 1);
UPDATE product_units SET parent_unit_id = (SELECT id FROM (SELECT id FROM product_units WHERE product_id=4 AND unit_type='wholesale') t) WHERE product_id=4 AND unit_type='piece';

INSERT INTO products (name, category_id) VALUES ('Eden Cheese', 1);
INSERT INTO product_units (product_id, unit_label, unit_type, buying_price, selling_price, stock_quantity, low_stock_threshold, pieces_per_unit) VALUES
(5, 'Box (24pcs)', 'wholesale', 1200.00, 1500.00, 2, 1, 24),
(5, 'Pack (165g)', 'pack', 55.00, 70.00, 48, 5, 1);

-- Sample member
INSERT INTO members (full_name, phone, address, membership_date) VALUES
('Juan dela Cruz', '09171234567', 'Block 1 Lot 2, Sample Street, Manila', CURDATE()),
('Ana Reyes', '09281234567', 'Block 3 Lot 5, Sample Village, Quezon City', CURDATE());
