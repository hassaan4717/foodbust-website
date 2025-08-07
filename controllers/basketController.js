const Basket = require('../models/basketModel');
const { v4: uuidv4 } = require('uuid');

exports.list = async (req, res) => {
  const userId = req.query.user_id;
  if (!userId) {
    return res.status(400).json({ message: 'Missing user_id',duration: 3000 });
  }
  try {
    const [rows] = await Basket.getAllByUser(userId);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Cannot fetch basket',duration: 3000 });
  }
};

exports.add = async (req, res) => {
  const { user_id, product_id, total_booking, description } = req.body;
  const id = uuidv4();
  try {
    await Basket.add({ id, user_id, product_id, total_booking, description });
    res.status(201).json({ id, user_id, product_id, total_booking, description });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Cannot add to basket',duration: 3000 });
  }
};

exports.remove = async (req, res) => {
  const { id } = req.params;
  try {
    await Basket.remove(id);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Cannot remove from basket',duration: 3000 });
  }
};
