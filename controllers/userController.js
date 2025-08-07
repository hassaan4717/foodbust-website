const User = require('../models/userModel');
const { v4: uuidv4 } = require('uuid');

exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const [rows] = await User.findByEmail(email);
    const user = rows[0];
    if (!user || user.password !== password) {
      return res.status(401).json({ message: 'Invalid credentials',duration: 1000 });
    }
    res.json({ id: user.id, name: user.name, email: user.email });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error',duration: 3000 });
  }
};

exports.signup = async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const [rows] = await User.findByEmail(email);
    if (name == '' && email == '' && password == '')
    {
     return res.status(400).json({ message: 'fields are empty' }); 
    }
    else if (rows.length && name != '' && email != '' && password != '') {
      return res.status(400).json({ message: 'Email already registered'});
    }
    const id = uuidv4();
    await User.create({ id, name, email, password });
    res.status(201).json({ id, name, email });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error',duration: 3000 });
  }
};

exports.listAllUsers = async (req, res) => {
  try {
    const [rows] = await User.getAll();
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Cannot fetch users', duration: 3000 });
  }
};
