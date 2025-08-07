const Order = require('../models/orderModel');
const { v4: uuidv4 } = require('uuid');

exports.create = async (req, res) => {
  const { user_id, table_no, items } = req.body;
  
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'At least one item is required',duration: 3000 });
  }
  try {
    const orderId = uuidv4();
    await Order.createOrder({ id: orderId, user_id, table_no });

    const promises = items.map(item => {
      const orderItem = {
        id: uuidv4(),
        order_id: orderId,
        product_id: item.product_id,
        total_booking: item.total_booking,
        description: item.description
      };
      return Order.addItem(orderItem);
    });
    await Promise.all(promises);

    res.status(201).json({ id: orderId, user_id, table_no, items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Cannot create order',duration: 3000 });
  }
};

exports.listByUser = async (req, res) => {
  const { user_id } = req.query;
  if (!user_id) {
    return res.status(400).json({ message: 'Missing user_id',duration: 3000 });
  }
  try {
    const [rows] = await Order.getByUser(user_id);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Cannot fetch orders',duration: 3000 });
  }
};

exports.listAllPending = async (req, res) => {
  try {
    const [rows] = await Order.getAllPending();

    // Transform flat rows into grouped orders with items
    const grouped = [];
    const orderMap = new Map();

    for (const row of rows) {
      const existing = orderMap.get(row.order_id);

      const item = {
        id: row.product_id,
        name: row.product_name,
        price: row.price,
        code: row.code,
        total_booking: row.total_booking,
        description: row.description,
      };

      if (existing) {
        existing.items.push(item);
      } else {
        const newOrder = {
          id: row.order_id,
          table_no: row.table_no,
          created_at: row.created_at,
          user_name: row.user_name,
          email: row.email,
          items: [item],
        };
        orderMap.set(row.order_id, newOrder);
        grouped.push(newOrder);
      }
    }

    res.json(grouped);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Cannot fetch pending orders', duration: 3000 });
  }
};

// ✅ NEW: Pending orders by specific user
exports.listPendingByUser = async (req, res) => {
  const { user_id } = req.query;

  if (!user_id) {
    return res.status(400).json({ message: 'Missing user_id', duration: 3000 });
  }

  try {
    const [rows] = await Order.getPendingByUserId(user_id);
    const grouped = [];
    const orderMap = new Map();

    for (const row of rows) {
      const existing = orderMap.get(row.order_id);
      const item = {
        id: row.product_id,
        name: row.product_name,
        price: row.price,
        code: row.code,
        total_booking: row.total_booking,
        description: row.description,
      };
      if (existing) {
        existing.items.push(item);
      } else {
        const newOrder = {
          id: row.order_id,
          table_no: row.table_no,
          created_at: row.created_at,
          items: [item],
        };
        orderMap.set(row.order_id, newOrder);
        grouped.push(newOrder);
      }
    }

    res.json({ success: true, PendingOrder: grouped });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Cannot fetch pending orders', duration: 3000 });
  }
};

exports.processOrder = async (req, res) => {
  const { order_id } = req.params;
  if (!order_id) {
    return res.status(400).json({ message: 'Missing order_id', duration: 3000 });
  }
  try {
    await Order.deleteOrder(order_id);
    res.json({ message: 'Order processed (deleted)', duration: 3000 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Cannot process order', duration: 3000 });
  }
};




