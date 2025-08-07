const db = require('./db');

exports.getAllByUser = (userId) =>
  db.query('SELECT * FROM baskets WHERE user_id = ?', [userId]);

exports.add = ({ id, user_id, product_id, total_booking, description }) =>
  db.query('INSERT INTO baskets VALUES (?, ?, ?, ?, ?)', [id, user_id, product_id, total_booking, description]);

exports.remove = (id) =>
  db.query('DELETE FROM baskets WHERE id = ?', [id]);
