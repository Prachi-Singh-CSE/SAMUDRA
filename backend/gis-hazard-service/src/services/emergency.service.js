const axios = require('axios');
const { query } = require('../config/db');
require('dotenv').config();

/**
 * Emergency / SOS backend
 * One tap -> packages GPS location + nearest safe harbor -> pushes to the
 * authority dashboard. Also the shared push path used by the IMBL
 * dwell-time auto-escalation (imbl.service.js), per the project doc's
 * "reuses Route Agent + dashboard infra" design.
 */

const DASHBOARD_URL = process.env.AUTHORITY_DASHBOARD_WEBHOOK_URL;
const DASHBOARD_API_KEY = process.env.AUTHORITY_DASHBOARD_API_KEY;

// Lazy require to avoid a circular require with route.service at module load time.
function getRouteService() {
  return require('./route.service');
}

async function triggerSOS({ vesselId, lat, lng }) {
  const { findNearestSafeHarbor } = getRouteService();
  const nearestHarbor = await findNearestSafeHarbor({ lat, lng });

  const { rows } = await query(
    `INSERT INTO sos_alerts (vessel_id, geom, nearest_harbor_id, alert_type, status)
     VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326), $4, 'manual_sos', 'sent')
     RETURNING id, created_at`,
    [vesselId, lng, lat, nearestHarbor ? nearestHarbor.id : null]
  );

  const dashboardDelivery = await pushToAuthorityDashboard({
    alertType: 'manual_sos',
    vesselId,
    location: { lat, lng },
    nearestHarbor,
    sosAlertId: rows[0].id
  });

  return {
    sosAlertId: rows[0].id,
    vesselId,
    location: { lat, lng },
    nearestHarbor,
    createdAt: rows[0].created_at,
    dashboardDelivery
  };
}

/** Shared push used by both manual SOS and automatic IMBL escalation. */
async function pushToAuthorityDashboard(payload) {
  if (!DASHBOARD_URL) {
    console.warn('[emergency.service] AUTHORITY_DASHBOARD_WEBHOOK_URL not set — logging alert instead of pushing:', payload);
    return { delivered: false, reason: 'no dashboard URL configured' };
  }
  try {
    await axios.post(DASHBOARD_URL, payload, {
      headers: DASHBOARD_API_KEY ? { Authorization: `Bearer ${DASHBOARD_API_KEY}` } : {},
      timeout: 5000
    });
    return { delivered: true };
  } catch (err) {
    console.error('[emergency.service] Failed to push alert to authority dashboard:', err.message);
    return { delivered: false, reason: err.message };
  }
}

async function getRecentAlerts({ sinceHours = 24 } = {}) {
  const { rows } = await query(
    `
    SELECT id, vessel_id, alert_type, status, created_at,
           ST_Y(geom) AS lat, ST_X(geom) AS lng, nearest_harbor_id
    FROM sos_alerts
    WHERE created_at >= now() - ($1 || ' hours')::interval
    ORDER BY created_at DESC
    `,
    [sinceHours]
  );
  return rows;
}

module.exports = { triggerSOS, pushToAuthorityDashboard, getRecentAlerts };
