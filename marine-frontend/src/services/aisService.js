import { gisApi } from "./api";

// ============================================================
// AIS — real integration with gis-hazard-service
// ============================================================
//
// There is no "give me every vessel's live position" endpoint on the
// backend — only the fast-cadence anomaly screen described in the
// project doc (AIS signal gaps, sudden stops, erratic course changes),
// served from GET /api/hazard/ais-anomalies, and the combined feed at
// GET /api/hazard/feed (same anomalies + SAR-confirmed oil-slick
// hazards from the last 72h). This module wraps both and normalizes
// failures to `null` so callers can decide how to degrade instead of
// throwing and breaking the map.

/**
 * Fetches raw AIS anomalies from the last `sinceHours` hours.
 * Each anomaly: { vesselId, type, detail, at, location: { lat, lng } }.
 * Returns `null` (not an empty array) on failure, so callers can tell
 * "no anomalies right now" apart from "couldn't reach the service".
 */
export async function fetchAisAnomalies({ sinceHours = 6 } = {}) {
  try {
    const { data } = await gisApi.get("/hazard/ais-anomalies", {
      params: { sinceHours },
    });
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.warn("⚠️ AIS anomaly fetch failed:", error.message);
    return null;
  }
}

/**
 * Fetches the combined hazard feed: { aisAnomalies, sarConfirmedHazards }.
 * Returns `null` on failure.
 */
export async function fetchHazardFeed() {
  try {
    const { data } = await gisApi.get("/hazard/feed");
    return data;
  } catch (error) {
    console.warn("⚠️ Hazard feed fetch failed:", error.message);
    return null;
  }
}

/**
 * Turns a flat anomaly list into one marker per vessel (its most recent
 * anomaly), shaped to match the `vessels` entries the map components
 * already render.
 */
function anomaliesToVessels(anomalies) {
  const latestByVessel = new Map();

  // Rows come back ordered oldest -> newest per vessel (see
  // aisAnomaly.service.js), so the last write per vesselId wins.
  for (const anomaly of anomalies) {
    if (
      !anomaly?.vesselId ||
      !Number.isFinite(anomaly?.location?.lat) ||
      !Number.isFinite(anomaly?.location?.lng)
    ) {
      continue;
    }
    latestByVessel.set(anomaly.vesselId, anomaly);
  }

  return Array.from(latestByVessel.entries()).map(([vesselId, anomaly]) => ({
    id: `ais-${vesselId}`,
    name: `Vessel ${vesselId}`,
    position: [anomaly.location.lat, anomaly.location.lng],
    suspicious: true,
    ais: {
      source: "live",
      anomalyType: anomaly.type,
      detail: anomaly.detail,
      at: anomaly.at,
    },
  }));
}

/**
 * Merges live AIS anomalies into the vessel list used by the map.
 *  - `anomalies === null`  → service unreachable: keep the demo vessels
 *    untouched so the map isn't empty, each tagged `ais.source: "demo"`.
 *  - `anomalies === []`    → service reachable, nothing flagged right
 *    now: still tag demo vessels so the UI can say "no anomalies" truthfully
 *    without implying they're a live confirmed contact.
 *  - otherwise             → append live vessel markers built from the
 *    anomalies, alongside the demo contacts.
 */
export function mergeVesselsWithAisAnomalies(demoVessels, anomalies) {
  const taggedDemoVessels = demoVessels.map((vessel) => ({
    ...vessel,
    ais: vessel.ais || { source: "demo" },
  }));

  if (!Array.isArray(anomalies)) {
    return { vessels: taggedDemoVessels, mode: "unavailable" };
  }

  if (anomalies.length === 0) {
    return { vessels: taggedDemoVessels, mode: "live" };
  }

  return {
    vessels: [...taggedDemoVessels, ...anomaliesToVessels(anomalies)],
    mode: "live",
  };
}