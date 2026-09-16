const { Pool } = require('pg');
require('dotenv').config();

// Single shared connection pool for all PostGIS queries in this service.
const pool = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT) || 5432,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  max: 10,
  idleTimeoutMillis: 30000
});

pool.on('error', (err) => {
  // Don't crash the whole service on an idle client error — log and move on.
  console.error('[db] Unexpected error on idle PostGIS client:', err.message);
});

async function query(text, params) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;
  if (duration > 200) {
    console.warn(`[db] slow query (${duration}ms): ${text.slice(0, 80)}...`);
  }
  return result;
}

module.exports = { pool, query };
