const turf = require('@turf/turf');
const { query } = require('../config/db');
const { pushToAuthorityDashboard } = require('./emergency.service');
require('dotenv').config();

/**
 * IMBL boundary proximity alerts — two-tier per the project doc:
 *  1. Immediate on-app warning as soon as a vessel's GPS enters the
 *     configurable buffer zone around the static IMBL line.
 *  2. Automatic escalation to the authority dashboard if the vessel
 *     remains inside the buffer (or crosses it) beyond a duration
 *     threshold — distinguishing brief drift from sustained incursion.
 * Pure GIS/software: distance check + a timer, no new API needed.
 */

const BUFFER_METERS = Number(process.env.IMBL_BUFFER_METERS) || 1852; // ~1 nautical mile default
const DWELL_ESCALATION_SECONDS = Number(process.env.IMBL_DWELL_ESCALATION_SECONDS) || 300;

let cachedBufferZone = null; // built once from imbl_boundary, reused across checks

async function getImblBufferZone() {
  if (cachedBufferZone) return cachedBufferZone;
  const { rows } = await query(`SELECT ST_AsGeoJSON(geom)::json AS geometry FROM imbl_boundary LIMIT 1`);
  if (!rows.length) throw new Error('No IMBL boundary geometry found — seed imbl_boundary table first');
  const line = turf.feature(rows[0].geometry);
  cachedBufferZone = turf.buffer(line, BUFFER_METERS, { units: 'meters' });
  return cachedBufferZone;
}

/**
 * Call this on every incoming vessel position fix.
 * Returns { inBuffer, warning, escalated } describing what happened.
 */
async function checkImblProximity({ vesselId, lat, lng }) {
  const bufferZone = await getImblBufferZone();
  const point = turf.point([lng, lat]);
  const inBuffer = turf.booleanPointInPolygon(point, bufferZone);

  const { rows: existing } = await query(
    `SELECT * FROM imbl_dwell_tracking WHERE vessel_id = $1`,
    [vesselId]
  );
  const record = existing[0];

  if (!inBuffer) {
    // Vessel is clear — reset any dwell tracking so a future entry starts fresh.
    if (record) {
      await query(`DELETE FROM imbl_dwell_tracking WHERE vessel_id = $1`, [vesselId]);
    }
    return { inBuffer: false, warning: false, escalated: false };
  }

  const now = new Date();

  if (!record) {
    await query(
      `INSERT INTO imbl_dwell_tracking (vessel_id, entered_buffer_at, last_seen_in_buffer_at, escalated)
       VALUES ($1, $2, $2, FALSE)`,
      [vesselId, now]
    );
    return { inBuffer: true, warning: true, escalated: false, dwellSeconds: 0 };
  }

  const dwellSeconds = (now - new Date(record.entered_buffer_at)) / 1000;
  await query(
    `UPDATE imbl_dwell_tracking SET last_seen_in_buffer_at = $2 WHERE vessel_id = $1`,
    [vesselId, now]
  );

  if (dwellSeconds >= DWELL_ESCALATION_SECONDS && !record.escalated) {
    await query(`UPDATE imbl_dwell_tracking SET escalated = TRUE WHERE vessel_id = $1`, [vesselId]);
    const dashboardDelivery = await pushToAuthorityDashboard({
      alertType: 'imbl_escalation',
      vesselId,
      location: { lat, lng },
      dwellSeconds
    });
    return { inBuffer: true, warning: true, escalated: true, dwellSeconds, dashboardDelivery };
  }

  return { inBuffer: true, warning: true, escalated: record.escalated, dwellSeconds };
}

module.exports = { checkImblProximity, BUFFER_METERS, DWELL_ESCALATION_SECONDS };
