
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const sslConfig = process.env.DB_SSL_CA_PATH
  ? {
      ca: fs.readFileSync(process.env.DB_SSL_CA_PATH, "utf8"),
      rejectUnauthorized: true,
    }
  : process.env.DB_SSL_CA
    ? {
        ca: process.env.DB_SSL_CA,
        rejectUnauthorized: true,
      }
    : undefined;

export const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "stockpilot",
  port: Number(process.env.DB_PORT) || 3306,

  ...(sslConfig ? { ssl: sslConfig } : {}),

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});
