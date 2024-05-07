const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  items: [{ name: String, quantity: Number }],
  status: { type: String, default: 'incomplete' },
  timestamp: { type: Date, default: Date.now }
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
