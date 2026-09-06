const mysql = require("mysql2/promise");
const { Sequelize } = require("sequelize");

/**
 * Creates and validates the MySQL connection and Sequelize instance.
 * Ensures the target database exists before the app starts using it.
 */
async function createSequelize() {
  try {
    const isProduction = process.env.NODE_ENV === 'production';
    const host = process.env.DB_HOST;
    const port = Number(process.env.DB_PORT || 3306);
    const user = process.env.DB_USER;
    const pass = process.env.DB_PASS;
    const dbName = process.env.DB_NAME;
    const missingVariables = ['DB_HOST', 'DB_USER', 'DB_PASS', 'DB_NAME'].filter((name) => {
      const value = process.env[name];

      if (value === undefined) {
        return true;
      }

      return isProduction ? value.trim() === '' : ['DB_HOST', 'DB_USER', 'DB_NAME'].includes(name) && value.trim() === '';
    });

    if (missingVariables.length > 0) {
      throw new Error(`${missingVariables.join(', ')} are required`);
    }

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
