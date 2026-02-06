const mysql = require('mysql2/promise');
const {Sequelize} = require('sequelize');

async function createSequelize() {
    
    const host = process.env.DB_HOST || 'localhost';
    const port = Number(process.env.DB_PORT || 3306);
    const user = process.env.DB_USER || 'root';
    const pass = process.env.DB_PASS || '';
    const dbName = process.env.DB_NAME || 'toys';

    const connection = await mysql.createConnection({host, port, user, password: pass});
    
    await connection.query(
        `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8_unicode_ci;`
    );
    await connection.end();

    const sequelize = new Sequelize(dbName, user, pass, {
        host,
        port,
        dialect: 'mysql',
        logging: false
    });
    return sequelize;
}

module.exports = {createSequelize};