// MySQL connection pool helper
// Requires environment variables: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
// Example table schema:
//
// CREATE TABLE users (
//   id INT AUTO_INCREMENT PRIMARY KEY,
//   username VARCHAR(191) NOT NULL UNIQUE,
//   password_hash VARCHAR(255) NOT NULL,
//   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
// );

const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'pulse_link',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function query(sql, params) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

// Ensure the users table exists (convenience for local dev)
(async function ensureSchema() {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(191) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  } catch (err) {
    // Log but don't crash here; connection errors will surface elsewhere
    // console.error('Error ensuring DB schema:', err);
  }
})();

module.exports = { pool, query };
