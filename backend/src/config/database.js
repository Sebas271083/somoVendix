import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

function parseDbUrl(raw) {
  try {
    const u = new URL(raw);
    return {
      host:     u.hostname,
      port:     parseInt(u.port || '3306'),
      user:     decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      database: u.pathname.replace(/^\//, ''),
    };
  } catch {
    return null;
  }
}

// DATABASE_URL tiene prioridad — lo proveen Railway, Render, Fly.io, etc.
const urlCreds = process.env.DATABASE_URL ? parseDbUrl(process.env.DATABASE_URL) : null;

const DB_NAME = urlCreds?.database
  || process.env.DB_NAME
  || process.env.MYSQL_DATABASE
  || process.env.MYSQLDATABASE
  || 'pos_papelera';

const poolConfig = urlCreds
  ? {
      ...urlCreds,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      timezone: '-03:00',
      ssl: { rejectUnauthorized: false },
    }
  : {
      host:     process.env.DB_HOST,
      port:     parseInt(process.env.DB_PORT || '3306'),
      user:     process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      timezone: '-03:00',
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    };

const source = urlCreds ? 'DATABASE_URL' : 'DB_* vars';
console.log(`[DB pool] ${poolConfig.user}@${poolConfig.host}:${poolConfig.port}/${DB_NAME} (via ${source})`);

const pool = mysql.createPool(poolConfig);

export { DB_NAME };

export const query = async (sql, params) => {
  const [rows] = await pool.execute(sql, params);
  return rows;
};

export const getConnection = () => pool.getConnection();

export default pool;
