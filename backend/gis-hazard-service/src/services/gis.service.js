const { query } = require('../config/db');

/**
 * GIS Agent
 * Serves map layers (PFZ zones, restricted zones, IMBL boundary, hazards,
 * safe harbors) as GeoJSON for the frontend's Leaflet/MapLibre map.
 */

async function getPfzZonesGeoJSON() {
  const { rows } = await query(`
    SELECT id, name, confidence, source, updated_at,
           ST_AsGeoJSON(geom)::json AS geometry
    FROM pfz_zones
  `);
  return toFeatureCollection(rows);
}

async function getRestrictedZonesGeoJSON() {
  const { rows } = await query(`
    SELECT id, name, zone_type,
           ST_AsGeoJSON(geom)::json AS geometry
    FROM restricted_zones
  `);
  return toFeatureCollection(rows);
}

async function getImblBoundaryGeoJSON() {
  const { rows } = await query(`
    SELECT id, name, ST_AsGeoJSON(geom)::json AS geometry
    FROM imbl_boundary
  `);
  return toFeatureCollection(rows);
}

async function getSafeHarborsGeoJSON() {
  const { rows } = await query(`
    SELECT id, name, capacity_notes,
           ST_AsGeoJSON(geom)::json AS geometry
    FROM safe_harbors
  `);
  return toFeatureCollection(rows);
}

async function getHazardOverlayGeoJSON({ sinceHours = 72 } = {}) {
  const { rows } = await query(
    `
    SELECT id, hazard_type, confidence, sar_source, suspected_vessel_id,
           correlation_confidence, detected_at,
           ST_AsGeoJSON(geom)::json AS geometry
    FROM hazard_detections
    WHERE detected_at >= now() - ($1 || ' hours')::interval
    `,
    [sinceHours]
  );
  return toFeatureCollection(rows);
}

/**
 * Reports whether the DB is reachable and whether each reference layer has
 * been seeded, so the frontend/ops can tell "empty because nothing loaded
 * yet" apart from "broken connection" at a glance.
 */
async function getStatus() {
  const tables = {
    pfzZones: 'pfz_zones',
    restrictedZones: 'restricted_zones',
    imblBoundary: 'imbl_boundary',
    safeHarbors: 'safe_harbors',
    hazardDetections: 'hazard_detections'
  };

  try {
    const counts = {};
    for (const [key, table] of Object.entries(tables)) {
      const { rows } = await query(`SELECT COUNT(*)::int AS count FROM ${table}`);
      counts[key] = rows[0].count;
    }
    return {
      dbConnected: true,
      layers: counts,
      ready: counts.imblBoundary > 0 && counts.safeHarbors > 0
    };
  } catch (err) {
    return {
      dbConnected: false,
      error: err.message,
      ready: false
    };
  }
}

/** Combines all map layers into one payload — handy for initial map load. */
async function getAllLayers() {
  const [pfz, restricted, imbl, harbors, hazards] = await Promise.all([
    getPfzZonesGeoJSON(),
    getRestrictedZonesGeoJSON(),
    getImblBoundaryGeoJSON(),
    getSafeHarborsGeoJSON(),
    getHazardOverlayGeoJSON()
  ]);
  return { pfz, restricted, imbl, harbors, hazards };
}

function toFeatureCollection(rows) {
  return {
    type: 'FeatureCollection',
    features: rows.map((row) => {
      const { geometry, ...properties } = row;
      return { type: 'Feature', geometry, properties };
    })
  };
}

module.exports = {
  getStatus,
  getPfzZonesGeoJSON,
  getRestrictedZonesGeoJSON,
  getImblBoundaryGeoJSON,
  getSafeHarborsGeoJSON,
  getHazardOverlayGeoJSON,
  getAllLayers
};
