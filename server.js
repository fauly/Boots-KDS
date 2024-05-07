const express = require('express');
const crypto = require('crypto');
const bodyParser = require('body-parser');

const connectDB = require('./db');
const db = connectDB();

const app = express();
// Middleware to capture raw body
app.use(bodyParser.json({
    verify: (req, res, buf) => {
        req.rawBody = buf.toString();
    }
}));

app.use(express.static('public'));

const SIGNATURE_KEY = process.env.SQUARE_SIGNATURE_KEY; // Your Square Signature Key

// Helper function to verify Square's webhook signature
function isValidSignature(req) {
    const signature = req.headers['x-square-signature'];
    const url = `https://${req.headers.host}${req.originalUrl}`;
    const hmac = crypto.createHmac('sha256', SIGNATURE_KEY);
    hmac.update(url + req.rawBody);  // Use raw body for hashing
    const calculatedSignature = hmac.digest('base64');
    return signature === calculatedSignature;
}

app.post('/api/orders', (req, res) => {
    if (!isValidSignature(req)) {
        console.error('Failed signature verification');
        return res.status(401).send('Unauthorized');
    }

    console.log('Received verified webhook:', req.body);
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
    res.status(200).send('Webhook processed');
});

app.get('*', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on HTTPS port ${PORT}`);
});
