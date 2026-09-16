const { query } = require('../config/db');
require('dotenv').config();

/**
 * Fast-cadence AIS anomaly pre-screening ("going dark").
 * Runs against recent vessel_positions rows to flag:
 *  - AIS signal gaps beyond AIS_GAP_THRESHOLD_SECONDS
 *  - Sudden stops (speed drop beyond AIS_SPEED_DROP_THRESHOLD_KNOTS)
 *  - Erratic course changes (heading delta > 90 deg between consecutive fixes)
 *
 * This is the fast, lower-precision signal described in the project doc —
 * it flags suspicion between Sentinel-1 SAR passes (every 6-12 days), and
 * gets confirmed/visually verified once SAR imagery becomes available
 * (see hazard.service.js).
 */

const GAP_THRESHOLD_SECONDS = Number(process.env.AIS_GAP_THRESHOLD_SECONDS) || 900;
const SPEED_DROP_THRESHOLD_KNOTS = Number(process.env.AIS_SPEED_DROP_THRESHOLD_KNOTS) || 2;

async function screenVesselAnomalies({ sinceHours = 6 } = {}) {
  const { rows } = await query(
    `
    SELECT vessel_id,
           ST_Y(geom) AS lat, ST_X(geom) AS lng,
           speed_knots, heading_deg, recorded_at
    FROM vessel_positions
    WHERE recorded_at >= now() - ($1 || ' hours')::interval
    ORDER BY vessel_id, recorded_at ASC
    `,
    [sinceHours]
  );

  const byVessel = groupBy(rows, 'vessel_id');
  const anomalies = [];

  for (const [vesselId, fixes] of Object.entries(byVessel)) {
    for (let i = 1; i < fixes.length; i++) {
      const prev = fixes[i - 1];
      const curr = fixes[i];
      const gapSeconds = (new Date(curr.recorded_at) - new Date(prev.recorded_at)) / 1000;

      if (gapSeconds >= GAP_THRESHOLD_SECONDS) {
        anomalies.push({
          vesselId,
          type: 'ais_gap',
          detail: `AIS signal gap of ${Math.round(gapSeconds / 60)} min`,
          at: curr.recorded_at,
          location: { lat: curr.lat, lng: curr.lng }
        });
      }

      if (
        prev.speed_knots !== null &&
        curr.speed_knots !== null &&
        prev.speed_knots - curr.speed_knots >= SPEED_DROP_THRESHOLD_KNOTS &&
        curr.speed_knots < 1
      ) {
        anomalies.push({
          vesselId,
          type: 'sudden_stop',
          detail: `Speed dropped from ${prev.speed_knots}kt to ${curr.speed_knots}kt`,
          at: curr.recorded_at,
          location: { lat: curr.lat, lng: curr.lng }
        });
      }

      if (prev.heading_deg !== null && curr.heading_deg !== null) {
        const delta = headingDelta(prev.heading_deg, curr.heading_deg);
        if (delta > 90) {
          anomalies.push({
            vesselId,
            type: 'erratic_course_change',
            detail: `Heading changed by ${Math.round(delta)}\u00b0`,
            at: curr.recorded_at,
            location: { lat: curr.lat, lng: curr.lng }
          });
        }
      }
    }
  }

  return anomalies;
}

function headingDelta(a, b) {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

function groupBy(rows, key) {
  return rows.reduce((acc, row) => {
    (acc[row[key]] = acc[row[key]] || []).push(row);
    return acc;
  }, {});
}

module.exports = { screenVesselAnomalies };
