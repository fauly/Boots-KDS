const express = require('express');
const crypto = require('crypto');
const bodyParser = require('body-parser');
const http = require('http');
const socketIo = require('socket.io');

const connectDB = require('./db');
const db = connectDB();

const app = express();
const server = http.createServer(app);
const io = socketIo(server); // Setup Socket.IO

app.use(bodyParser.json({
    verify: (req, res, buf) => {
        req.rawBody = buf.toString();
    }
}));

app.use(express.static('public'));

// WebSocket connection
io.on('connection', (socket) => {
    console.log('New client connected');

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

// Fetch orders and emit to connected clients
function fetchAndEmitOrders() {
    const query = 'SELECT * FROM orders WHERE status = "incomplete" ORDER BY created_at DESC';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Failed to fetch orders:', err);
            return;
        }
        io.emit('order data', results); // Emitting order data to all connected clients
    });
}

app.post('/api/orders', (req, res) => {
    console.log('Received webhook:', req.body);

    // Assuming the data received matches the schema you've outlined
    if (req.body.type === "order.created") {
        const orderDetails = req.body.data.object.order_created;

        const query = 'INSERT INTO orders (order_id, items, status, created_at) VALUES (?, ?, ?, ?)';
        db.query(query, [orderDetails.order_id, JSON.stringify(orderDetails), 'incomplete', orderDetails.created_at], (err, results) => {
            if (err) {
                console.error('Failed to insert order:', err);
                return res.status(500).send('Database error');
            }
            console.log('Order inserted:', results);
            res.status(200).send('Webhook processed');
        });
    } else {
        console.log('Event type not handled:', req.body.type);
        res.status(200).send('Event type not handled');
    }
    fetchAndEmitOrders(); // Fetch and emit after processing new order
    res.status(200).send('Order processed');
});

app.get('/api/getOrders', (req, res) => {
    const query = 'SELECT * FROM orders WHERE status = "incomplete" ORDER BY created_at DESC';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Failed to fetch orders:', err);
            return res.status(500).send('Database error');
        }
        console.log('Orders fetched:', results);
        res.json(results);
    });
});


app.get('*', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on HTTPS port ${PORT}`);
});