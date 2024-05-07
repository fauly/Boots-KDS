const express = require('express');
const crypto = require('crypto');
const bodyParser = require('body-parser');
const { Client, Environment } = require('square');

const squareClient = new Client({
    accessToken: process.env.SQUARE_ACCESS_TOKEN,
    environment: Environment.Sandbox, // Use Environment.Sandbox for testing
});

const connectDB = require('./db');
const db = connectDB();

const app = express();

app.use(bodyParser.json({
    verify: (req, res, buf) => {
        req.rawBody = buf.toString();
    }
}));

app.use(express.static('public'));

async function retrieveOrder(orderId) {
    try {
        const { result } = await squareClient.ordersApi.retrieveOrder(orderId);
        console.log(result);
        // Process the order details as needed
        return result.order;
    } catch (error) {
        console.error('Error retrieving order from Square:', error);
        throw error;
    }
}

const insertOrder = async (orderDetails) => {
    const order = await retrieveOrder(orderDetails.order_id);
    const lineItems = JSON.stringify(order.line_items);
    const query = 'INSERT INTO orders (order_id, line_items, status, created_at) VALUES (?, ?, ?, NOW())';

    db.query(query, [order.id, lineItems, 'incomplete'], (err, results) => {
        if (err) {
            console.error('Failed to insert order:', err);
            return;
        }
        console.log('Order inserted:', results);
    });
};

app.post('/api/orders', (req, res) => {
    console.log('Received webhook:', req.body);

    // Check the type of the event
    if (req.body.type === "order.created") {
        const orderDetails = req.body.data.object.order_created;
        const query = 'INSERT INTO orders (order_id, items, status, created_at) VALUES (?, ?, ?, NOW())';
        
        // Insert order details into the database
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

app.post('/api/markComplete', (req, res) => {
    const orderId = req.body.orderId;
    const query = 'UPDATE orders SET status = "complete" WHERE order_id = ?';

    db.query(query, [orderId], (err, results) => {
        if (err) {
            console.error('Failed to mark order as complete:', err);
            return res.status(500).send('Database error');
        }
        console.log('Order marked as complete:', results);
        res.json({ success: true, message: 'Order marked as complete', orderId });
    });
});


app.get('*', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on HTTPS port ${PORT}`);
});