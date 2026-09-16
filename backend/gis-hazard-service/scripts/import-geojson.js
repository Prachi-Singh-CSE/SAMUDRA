/**
 * Import official GeoJSON reference data into PostGIS.
 * Usage:
 *   node scripts/import-geojson.js imbl path/to/imbl.geojson
 *   node scripts/import-geojson.js harbors path/to/harbors.geojson
 *   node scripts/import-geojson.js restricted path/to/restricted.geojson
 *
 * This deliberately does NOT fabricate boundary geometry. Supply data from
 * the authoritative source approved by the team (e.g. NHO/Survey of India).
 */
const fs = require('fs');
const { pool } = require('../src/config/db');

const [layer, file] = process.argv.slice(2);
if (!['imbl', 'harbors', 'restricted', 'pfz'].includes(layer) || !file) {
  console.error('Usage: node scripts/import-geojson.js <imbl|harbors|restricted|pfz> <file.geojson>');
  process.exit(1);
}

function featuresOf(data) {
  if (data.type === 'FeatureCollection') return data.features;
  if (data.type === 'Feature') return [data];
  return [{ type: 'Feature', geometry: data, properties: {} }];
}

(async () => {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const features = featuresOf(data);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const feature of features) {
      const g = feature.geometry;
      if (!g) continue;
      const p = feature.properties || {};
      const geo = JSON.stringify(g);
      if (layer === 'imbl') {
        if (g.type !== 'LineString') continue;
        await client.query(`INSERT INTO imbl_boundary(name,source,geom) VALUES($1,$2,ST_SetSRID(ST_GeomFromGeoJSON($3),4326))`,
          [p.name || 'International Maritime Boundary Line', p.source || 'official-import', geo]);
      } else if (layer === 'harbors') {
        const point = g.type === 'Point' ? g : null;
        if (!point) continue;
        await client.query(`INSERT INTO safe_harbors(name,source,capacity_notes,geom) VALUES($1,$2,$3,ST_SetSRID(ST_GeomFromGeoJSON($4),4326))`,
          [p.name || p.harbor_name || 'Safe Harbor', p.source || 'official-import', p.capacity_notes || null, geo]);
      } else if (layer === 'restricted') {
        if (!['Polygon','MultiPolygon'].includes(g.type)) continue;
        await client.query(`INSERT INTO restricted_zones(name,zone_type,geom) VALUES($1,$2,ST_SetSRID(ST_GeomFromGeoJSON($3),4326))`,
          [p.name || 'Restricted Zone', p.zone_type || 'restricted', geo]);
      } else if (layer === 'pfz') {
        if (!['Polygon','MultiPolygon'].includes(g.type)) continue;
        await client.query(`INSERT INTO pfz_zones(name,confidence,source,geom) VALUES($1,$2,$3,ST_SetSRID(ST_GeomFromGeoJSON($4),4326))`,
          [p.name || 'PFZ', p.confidence ?? null, p.source || 'ocean-data-agent', geo]);
      }
    }
    await client.query('COMMIT');
    console.log(`Imported ${features.length} GeoJSON feature(s) into ${layer}.`);
  } catch (e) {
    await client.query('ROLLBACK'); throw e;
  } finally { client.release(); await pool.end(); }
})().catch(e => { console.error(e); process.exit(1); });
