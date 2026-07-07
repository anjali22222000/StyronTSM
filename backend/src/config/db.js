import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

// Aiven (and most managed MySQL hosts) require TLS. Set DB_SSL=true in .env
// for hosted DBs; leave unset for a local MySQL with no TLS.
const sslConfig =
  String(process.env.DB_SSL).toLowerCase() === "true"
    ? { rejectUnauthorized: false }
    : undefined;

export const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true,
  ssl: sslConfig,
});

export async function testConnection() {
  const conn = await pool.getConnection();
  await conn.ping();
  conn.release();
}
