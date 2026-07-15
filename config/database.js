const mysql = require("mysql2/promise");
const { Sequelize } = require("sequelize");

/**
 * Creates and validates the MySQL connection and Sequelize instance.
 * Ensures the target database exists before the app starts using it.
 */
async function createSequelize() {
  try {
    const host = process.env.DB_HOST || "localhost";
    const port = Number(process.env.DB_PORT || 3306);
    const user = process.env.DB_USER || "root";
    const pass = process.env.DB_PASS || "";
    const dbName = process.env.DB_NAME || "toys";

    // Create the database if it does not exist yet.
    // const connection = await mysql.createConnection({
    //   host,
    //   port,
    //   user,
    //   password: pass,
    // });

    // await connection.query(
    //   `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8 COLLATE utf8_unicode_ci;`
    // );

    // await connection.end();

    // Initialize Sequelize after the database is ready.
    const sequelize = new Sequelize(dbName, user, pass, {
      host,
      port,
      dialect: "mysql",
      logging: false,
    });

    // Verify that Sequelize can connect successfully.
    await sequelize.authenticate();
    console.log("Database connected");

    return sequelize;
  } catch (error) {
    console.error("Database connection error:", error);
    process.exit(1);
  }
}

module.exports = { createSequelize };
