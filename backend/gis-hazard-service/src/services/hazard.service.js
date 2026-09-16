const axios = require('axios');
const turf = require('@turf/turf');
const { query } = require('../config/db');
const { screenVesselAnomalies } = require('./aisAnomaly.service');
require('dotenv').config();

/**
 * Hazard Agent
 * Two-speed hazard detection per the project doc:
 *  1. Fast: AIS anomaly pre-screen (screenVesselAnomalies) — near real-time.
 *  2. Slow, high-precision: SAR oil-slick detections (Sentinel-1, U-Net).
 *     The actual U-Net inference is expected to run as a separate Python
 *     service (SAR_INFERENCE_SERVICE_URL) — this module either calls that
 *     service or reads pre-scored results already written to
 *     hazard_detections by an ingestion job, then correlates slicks with
 *     nearby AIS vessel tracks to flag a likely responsible/nearby vessel.
 */

const SAR_INFERENCE_SERVICE_URL = process.env.SAR_INFERENCE_SERVICE_URL;
const CORRELATION_RADIUS_KM = 5; // vessel within this radius of a slick is "nearby"

/** Pulls unresolved slick detections that don't yet have a vessel correlation. */
async function getUncorrelatedSlicks() {
  const { rows } = await query(`
    SELECT id, ST_Y(ST_Centroid(geom)) AS lat, ST_X(ST_Centroid(geom)) AS lng, detected_at
    FROM hazard_detections
    WHERE hazard_type = 'oil_slick' AND suspected_vessel_id IS NULL
  `);
  return rows;
}

/** Correlates each un-linked slick with the nearest vessel track around the detection time. */
async function correlateSlicksWithAIS() {
  const slicks = await getUncorrelatedSlicks();
  const results = [];

  for (const slick of slicks) {
    const { rows: nearbyVessels } = await query(
      `
      SELECT vessel_id,
             ST_Y(geom) AS lat, ST_X(geom) AS lng,
             recorded_at,
             ST_Distance(geom::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) / 1000.0 AS distance_km
      FROM vessel_positions
      WHERE recorded_at BETWEEN $3::timestamptz - interval '6 hours' AND $3::timestamptz + interval '6 hours'
      ORDER BY distance_km ASC
      LIMIT 5
      `,
      [slick.lng, slick.lat, slick.detected_at]
    );

    const candidate = nearbyVessels.find((v) => v.distance_km <= CORRELATION_RADIUS_KM);

    if (candidate) {
      await query(
        `UPDATE hazard_detections
         SET suspected_vessel_id = $1, correlation_confidence = $2
         WHERE id = $3`,
        [candidate.vessel_id, confidenceFromDistance(candidate.distance_km), slick.id]
      );
      results.push({
        hazardId: slick.id,
        suspectedVesselId: candidate.vessel_id,
        distanceKm: candidate.distance_km,
        correlationConfidence: confidenceFromDistance(candidate.distance_km)
      });
    } else {
      results.push({ hazardId: slick.id, suspectedVesselId: null, note: 'no vessel within correlation radius' });
    }
  }

  return results;
}

function confidenceFromDistance(distanceKm) {
  // Closer vessel = higher confidence. Linear falloff to 0 at CORRELATION_RADIUS_KM.
  return Math.round((1 - distanceKm / CORRELATION_RADIUS_KM) * 100) / 100;
}

/** Optionally triggers a fresh SAR inference pass via the Python service, if configured,
 * and persists any returned detections into hazard_detections. */
async function requestSarInference({ bbox, sceneDate }) {
  if (!SAR_INFERENCE_SERVICE_URL) {
    return { triggered: false, reason: 'SAR_INFERENCE_SERVICE_URL not configured — using existing hazard_detections rows' };
  }
  try {
    const { data } = await axios.post(
      `${SAR_INFERENCE_SERVICE_URL}/infer`,
      { bbox, sceneDate },
      { timeout: 15000 }
    );
    const detections = data.detections || data.results || [];
    const persisted = await persistSarDetections(detections);
    return { triggered: true, result: data, persisted };
  } catch (err) {
    console.warn('[hazard.service] SAR inference service call failed:', err.message);
    return { triggered: false, reason: err.message };
  }
}

/**
 * Writes SAR/U-Net inference results into hazard_detections. Expects each
 * detection to carry a GeoJSON Polygon/MultiPolygon `geometry` and a
 * `confidence` in [0,1]; an optional `source` overrides the default
 * 'sentinel-1' provenance tag. Malformed entries are skipped rather than
 * failing the whole batch.
 */
async function persistSarDetections(detections = []) {
  const saved = [];
  for (const detection of detections) {
    const geometry = detection.geometry;
    if (!geometry || !['Polygon', 'MultiPolygon'].includes(geometry.type)) {
      console.warn('[hazard.service] skipping SAR detection with missing/invalid geometry');
      continue;
    }
    const { rows } = await query(
      `INSERT INTO hazard_detections (hazard_type, geom, confidence, sar_source)
       VALUES ('oil_slick', ST_SetSRID(ST_GeomFromGeoJSON($1), 4326), $2, $3)
       RETURNING id, detected_at`,
      [JSON.stringify(geometry), detection.confidence ?? null, detection.source || 'sentinel-1']
    );
    saved.push({ id: rows[0].id, detectedAt: rows[0].detected_at, confidence: detection.confidence ?? null });
  }
  return saved;
}

/** Combined proactive hazard feed: recent SAR-confirmed slicks + fresh AIS anomalies. */
async function getProactiveHazardFeed() {
  const [anomalies, slicks] = await Promise.all([
    screenVesselAnomalies({ sinceHours: 6 }),
    query(`
      SELECT id, hazard_type, confidence, suspected_vessel_id, correlation_confidence,
             detected_at, ST_Y(ST_Centroid(geom)) AS lat, ST_X(ST_Centroid(geom)) AS lng
      FROM hazard_detections
      WHERE detected_at >= now() - interval '72 hours'
    `)
  ]);

  return {
    aisAnomalies: anomalies,
    sarConfirmedHazards: slicks.rows
  };
}

module.exports = {
  correlateSlicksWithAIS,
  requestSarInference,
  getProactiveHazardFeed
};
