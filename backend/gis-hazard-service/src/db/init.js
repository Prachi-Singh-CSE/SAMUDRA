// Applies schema.sql to the configured database.
// Usage: npm run db:init
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');

async function init() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  console.log('[db:init] Applying schema.sql ...');
  await pool.query(sql);
  console.log('[db:init] Done. PostGIS tables are ready.');
  await pool.end();
}

init().catch((err) => {
  console.error('[db:init] Failed:', err);
  process.exit(1);
});
