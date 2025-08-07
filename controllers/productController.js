const Product = require('../models/productModel');
const { v4: uuidv4 } = require('uuid');

exports.list = async (req, res) => {
  try {
    const [rows] = await Product.getAll();
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Cannot fetch products',duration: 3000 });
  }
};

exports.details = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await Product.getById(id);
    res.json(rows[0] || null);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Cannot fetch product',duration: 3000 });
  }
};

// exports.best = async (req, res) => {
//   try {
//     const [rows] = await Product.getBest();
//     res.json(rows);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: 'Cannot fetch best products',duration: 3000 });
//   }
// };

exports.update = async (req, res) => {
  const { id } = req.params;
  const { code, name, price, is_ready, gambar } = req.body;

  if (!code || !name || price == null || is_ready == null || !gambar) {
    return res.status(400).json({ message: 'All fields are required', duration: 3000 });
  }

  try {
    await Product.updateById({ id, code, name, price, is_ready, gambar });
    res.json({ message: 'Product updated successfully', duration: 3000 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Cannot update product', duration: 3000 });
  }
};

exports.remove = async (req, res) => {
  const { id } = req.params;

  try {
    await Product.deleteById(id);
    res.json({ message: 'Product deleted successfully', duration: 3000 });
  } catch (err) {
    console.error('❌ Error deleting product:', err);
    res.status(500).json({ message: 'Cannot delete product', duration: 3000 });
  }
};

exports.create = async (req, res) => {
  const { code, name, price, is_ready, gambar } = req.body;

  if (!code || !name || price == null || is_ready == null || !gambar) {
    return res.status(400).json({ message: 'All fields are required', duration: 3000 });
  }

  try {
    const id = uuidv4(); // Generate unique ID for the new product
    await Product.create({ id, code, name, price, is_ready, gambar });
    res.status(201).json({ message: 'Product created successfully', id, duration: 3000 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Cannot create product', duration: 3000 });
  }
};



