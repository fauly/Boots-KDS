const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const connectDB = require('./db');
const db = connectDB();

// Example query
db.query('SELECT * FROM orders', (err, results) => {
    if (err) throw err;
    console.log(results);
});

db.end();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

app.get('*', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

io.on('connection', (socket) => {
  console.log('New client connected');
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

app.post('/api/orders', express.json(), (req, res) => {
    console.log('Webhook received:', req.body);

    // Process the webhook payload
    if(req.body.type === "order.updated") { // Check the type of event
        const orderDetails = req.body.data; // Assuming 'data' contains order details
        // Store order details in the database
        const query = 'INSERT INTO orders (order_id, items, status) VALUES (?, ?, ?)';
        db.query(query, [orderDetails.id, JSON.stringify(orderDetails.items), 'incomplete'], (err, results) => {
            if (err) {
                console.error('Failed to insert order:', err);
                return res.status(500).send('Database error');
            }
            console.log('Order inserted:', results);
            res.status(200).send('Webhook processed');
        });
    } else {
        res.status(200).send('Event type not handled');
    }
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
