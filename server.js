const express = require('express');
const crypto = require('crypto');
const bodyParser = require('body-parser');
require('dotenv').config();
const { Client, Environment } = require('square');

console.log(process.env.SQUARE_ACCESS_TOKEN);

const squareClient = new Client({
    accessToken: process.env.SQUARE_ACCESS_TOKEN,
    environment: Environment.Production,
});

const db = require('./db');

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

// async function retrieveCustomer(customerID) {
//     try {
//         const { result } = await squareClient.customersApi.retrieveCustomer(customerID);
//         console.log('Customer retrieved:', result.customer);
//         return result.customer;
//     } catch (error) {
//         console.error('Error retrieving customer from Square:', error);
//         throw error;
//     }
// }

function bigInt(key, value) {
    if (typeof value === 'bigint') { // Check if the value is a BigInt
        return value.toString(); // Convert BigInt to string
    } else {
        return value; // Return the value unchanged
    }
}

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
            const givenName = JSON.stringify(order.ticketName);
            const lineItems = JSON.stringify(order.lineItems, bigInt);
            const query = 'INSERT INTO orders (order_id, given_name, line_items, status, created_at) VALUES (?, ?, ?, ?, NOW())';
            console.log('Given Name:', givenName);
            console.log('Line Items:', lineItems);
            db.query(query, [orderId, givenName, lineItems, 'incomplete'], (err, results) => {
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


app.get('/api/getOrders', async (req, res) => {
    try {
        const [results] = await db.query('SELECT * FROM orders WHERE status = "incomplete" ORDER BY created_at DESC');
        const orders = results.map(order => ({
            ...order,
            line_items: JSON.parse(order.line_items) // Parse line_items
        }));
        console.log('Orders fetched:', orders);
        res.json(orders);
    } catch (err) {
        console.error('Failed to fetch orders:', err);
        res.status(500).send('Database error');
    }
});

app.post('/api/markComplete', async (req, res) => {
    const orderId = req.body.orderId;
    try {
        const [results] = await db.query('UPDATE orders SET status = "complete" WHERE order_id = ?', [orderId]);
        console.log('Order marked as complete:', results);
        res.json({ success: true, message: 'Order marked as complete', orderId });
    } catch (err) {
        console.error('Failed to mark order as complete:', err);
        res.status(500).send('Database error');
    }
});

app.get('*', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on HTTPS port ${PORT}`);
});