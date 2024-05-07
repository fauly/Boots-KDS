const express = require('express');
const crypto = require('crypto');
const bodyParser = require('body-parser');

const connectDB = require('./db');
const db = connectDB();

const app = express();
app.use(bodyParser.json());
app.use(express.static('public'));

const SQUARE_SIGNATURE_KEY = process.env.SQUARE_SIGNATURE_KEY; // Your Square Signature Key

app.post('/api/orders', (req, res) => {
    const signature = req.headers['x-square-signature'];
    const url = 'https://' + req.headers.host + req.originalUrl; // Full URL to your webhook endpoint
    const stringBody = JSON.stringify(req.body);

    if (!verifySignature(stringBody, signature, SQUARE_SIGNATURE_KEY, url)) {
        return res.status(401).send('Signature verification failed');
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

function verifySignature(body, signature, key, url) {
    const stringToSign = url + body;
    const hmac = crypto.createHmac('sha1', key);
    const hash = hmac.update(stringToSign).digest('base64');
    return hash === signature;
}

app.get('/', (req, res) => {
    res.send('Hello World!');
  });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on HTTPS port ${PORT}`);
});
