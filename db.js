const mysql = require('mysql2');

let pool;

const getPool = () => {
    return pool;
}

const initDB = () => {
    pool = mysql.createPool({
        connectionLimit: 100,
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT,
        password: process.env.DB_PASS
    })
    console.log('Connected to DB')
}

module.exports = { initDB, getPool }