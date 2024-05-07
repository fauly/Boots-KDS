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

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
