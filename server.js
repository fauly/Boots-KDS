const express = require('express');
const crypto = require('crypto');
const bodyParser = require('body-parser');
const { Client, Environment } = require('square');

print(process.env.SQUARE_ACCESS_TOKEN);

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
        console.log('Order retrieved:', result.order);
        return result.order;
    } catch (error) {
        console.error('Error retrieving order from Square:', error);
        throw error;
    }
}

const insertOrder = async (orderDetails) => {
    const orderId = orderDetails.id; // Ensure this is the correct path to the order ID
    if (!orderId) {
        console.error('Order ID not found in the details:', orderDetails);
        return; // Exit if no order ID is found to prevent further errors
    }
    
    try {
        const order = await retrieveOrder(orderId);
        const lineItems = JSON.stringify(order.line_items); // Storing line items as JSON string
        const query = 'INSERT INTO orders (order_id, line_items, status, created_at) VALUES (?, ?, ?, NOW())';
        
        db.query(query, [orderId, lineItems, 'incomplete'], (err, results) => {
            if (err) {
                console.error('Failed to insert order:', err);
                return;
            }
            console.log('Order inserted:', results);
        });
    } catch (error) {
        console.error('Failed to process order:', error);
    }
};

app.post('/api/orders', async (req, res) => {
    console.log('Received webhook:', req.body);

    if (req.body.type === "order.created" && req.body.data && req.body.data.object && req.body.data.object.order_created) {
        const orderDetails = req.body.data.object.order_created;
        const orderId = orderDetails.order_id; // Correctly accessing the order_id

        if (!orderId) {
            console.log('Order ID is missing in the received data:', orderDetails);
            return res.status(400).send('Order ID missing');
        }

        try {
            const order = await retrieveOrder(orderId);
            const lineItems = JSON.stringify(order.line_items); // Storing line items as JSON string
            const query = 'INSERT INTO orders (order_id, line_items, status, created_at) VALUES (?, ?, ?, NOW())';
        
            db.query(query, [orderId, lineItems, 'incomplete'], (err, results) => {
                if (err) {
                    console.error('Failed to insert order:', err);
                    return res.status(500).send('Database error');
                }
                console.log('Order inserted:', results);
                res.status(200).send('Webhook processed');
            });
        } catch (error) {
            console.error('Failed to process order:', error);
            res.status(500).send('Error processing order');
        }
    } else {
        console.log('Event type not handled or missing order details:', req.body.type);
        res.status(400).send('Event type not handled or missing order details');
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