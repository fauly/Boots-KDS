const mysql = require('mysql2');
require('dotenv').config();

const connectDB = () => {
    const connection = mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    connection.connect(err => {
        if (err) {
            console.error('MySQL connection error:', err);
            return;
        }
        console.log('MySQL connected successfully');
    });

    return connection;
}

module.exports = connectDB;
