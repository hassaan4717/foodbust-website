const db = require('./db');

exports.getAll = () =>
  db.query('SELECT * FROM products');

exports.getById = (id) =>
  db.query('SELECT * FROM products WHERE id = ?', [id]);

// exports.getBest = () =>
//   db.query(`SELECT p.* FROM products p
//             JOIN best_products bp ON bp.product_id = p.id`);

exports.updateById = ({ id, code, name, price, is_ready, gambar }) =>
  db.query(
    `UPDATE products SET code = ?, name = ?, price = ?, is_ready = ?, gambar = ? WHERE id = ?`,
    [code, name, price, is_ready, gambar, id]
  );
 
exports.deleteById = (id) =>
  db.query('DELETE FROM products WHERE id = ?', [id]);
 
exports.create = ({ id, code, name, price, is_ready, gambar }) =>
  db.query(
    'INSERT INTO products (id, code, name, price, is_ready, gambar) VALUES (?, ?, ?, ?, ?, ?)',
    [id, code, name, price, is_ready, gambar]
  );
  
