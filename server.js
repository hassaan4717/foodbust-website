// server.js
require('dotenv').config();                // Load .env variables
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Middleware
app.use(cors());                           // Enable CORS
app.use(express.json());                   // Parse JSON bodies

// 📦 MySQL connection is initialized in models/db.js
//    This file imports the pool when controllers/models use it.
//    No need to do anything else here.

// 🛣️ Route Imports
const userRoutes    = require('./routes/userRoutes');
const productRoutes = require('./routes/productRoutes');
const basketRoutes  = require('./routes/basketRoutes');
const orderRoutes   = require('./routes/orderRoutes');

// 🔁 Routes Middleware
app.use('/users',    userRoutes);         // /users/login and /users/signup
app.use('/products', productRoutes);      // /products, /products/best, /products/:id
app.use('/baskets',  basketRoutes);       // /baskets?user_id=... GET, POST, DELETE
app.use('/orders',   orderRoutes);        // /orders?user_id=... GET, POST

// 🌎 Root Route (health check or API welcome)
app.get('/', (req, res) => {
  res.send('🍽️ FoodBust Backend is up and running!');
});

// ⚠️ 404 Handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// 🔁 Global Error Handler (optional)
app.use((err, req, res, next) => {
  console.error('❗ Server Error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

// const path = require('path');
// app.use(express.static(path.join(__dirname, 'dist')));
// app.get('*', (req, res) => {
//   res.sendFile(path.join(__dirname, 'dist', 'index.html'));
// });

// 🚀 Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
