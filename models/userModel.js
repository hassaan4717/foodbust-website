const db = require('./db');

exports.findByEmail = (email) =>
  db.query('SELECT * FROM users WHERE email = ?', [email]);

exports.create = ({ id, name, email, password }) =>
  db.query('INSERT INTO users (id, name, email, password) VALUES (?, ?, ?, ?)', [id, name, email, password]);

exports.getAll = () =>
  db.query('SELECT id, name, email FROM users');
