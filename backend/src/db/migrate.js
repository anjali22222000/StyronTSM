// Runs all .sql files in /migrations in order, against MySQL.
// Usage: npm run migrate
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, "..", "..", "migrations");

async function run() {
  const sslConfig =
    String(process.env.DB_SSL).toLowerCase() === "true"
      ? { rejectUnauthorized: false }
      : undefined;

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true,
    ssl: sslConfig,
  });

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  // Error codes that mean "this bit of schema is already there" — safe to
  // skip so migrations can be re-run after a partial failure without manual
  // cleanup. Real errors (bad SQL, missing table, etc.) still abort.
  const ALREADY_APPLIED_CODES = new Set([
    "ER_DUP_FIELDNAME",     // ADD COLUMN that already exists
    "ER_TABLE_EXISTS_ERROR",// CREATE TABLE without IF NOT EXISTS, already there
    "ER_DUP_KEYNAME",       // ADD INDEX/KEY that already exists
    "ER_DUP_ENTRY",         // re-inserting a row that's already there (e.g. seed data)
  ]);

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    console.log(`Applying migration: ${file}`);
    try {
      await connection.query(sql);
    } catch (err) {
      if (ALREADY_APPLIED_CODES.has(err.code)) {
        console.log(
          `  ⚠️  Skipping ${file} — already applied previously (${err.code}: ${err.sqlMessage || err.message}).`
        );
        continue;
      }
      throw err;
    }
  }

  console.log("All migrations applied successfully.");
  await connection.end();
}

run().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
