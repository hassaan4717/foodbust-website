const db = require('./db');

exports.createOrder = ({ id, user_id, table_no }) =>
  db.query('INSERT INTO orders (id, user_id, table_no) VALUES (?, ?, ?)', [id, user_id, table_no]);

exports.addItem = ({ id, order_id, product_id, total_booking, description }) =>
  db.query('INSERT INTO order_items VALUES (?, ?, ?, ?, ?)', [id, order_id, product_id, total_booking, description]);

exports.getByUser = (userId) =>
  db.query(`SELECT o.*, oi.*
            FROM orders o
            JOIN order_items oi ON oi.order_id = o.id
            WHERE o.user_id = ?`, [userId]);

exports.getAllPending = () =>
  db.query(`
    SELECT 
      o.id AS order_id,
      o.table_no,
      o.created_at,
      u.name AS user_name,
      u.email,
      p.id AS product_id,                -- ✅ ADD THIS
      p.name AS product_name,
      p.price,
      p.code,
      oi.total_booking,
      oi.description
    FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    JOIN users u ON o.user_id = u.id
    JOIN products p ON oi.product_id = p.id
    ORDER BY o.created_at DESC
  `);

exports.getPendingByUserId = (userId) =>
  db.query(`
    SELECT 
      o.id AS order_id,
      o.table_no,
      o.created_at,
      p.id AS product_id,
      p.name AS product_name,
      p.price,
      p.code,
      oi.total_booking,
      oi.description
    FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    JOIN products p ON oi.product_id = p.id
    WHERE o.user_id = ?
    ORDER BY o.created_at DESC
  `, [userId]);

exports.deleteOrder = async (orderId) => {
  // Delete order items first to maintain foreign key integrity
  await db.query('DELETE FROM order_items WHERE order_id = ?', [orderId]);
  await db.query('DELETE FROM orders WHERE id = ?', [orderId]);
};


