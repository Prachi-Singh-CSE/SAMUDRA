const turf = require('@turf/turf');
const { query } = require('../config/db');
const { toPoint, distanceKm } = require('../utils/turfHelpers');

/**
 * Route Agent
 * - Finds the nearest safe harbor to a given position (used by both the
 *   normal "safe route" query and the Emergency/SOS flow).
 * - Suggests a route that avoids restricted zones and known hazards.
 *   NOTE: this uses a straight-line/waypoint-detour approach rather than a
 *   full marine routing engine (e.g. OSRM with a water-only graph) — that's
 *   a reasonable v1 and the obvious next upgrade once you have more time.
 */

async function findNearestSafeHarbor({ lat, lng }) {
  const { rows } = await query(`
    SELECT id, name, capacity_notes, ST_AsGeoJSON(geom)::json AS geometry
    FROM safe_harbors
  `);

  if (!rows.length) return null;

  const from = toPoint({ lat, lng });
  const harborFeatures = turf.featureCollection(
    rows.map((r) => turf.point(r.geometry.coordinates, { id: r.id, name: r.name }))
  );

  const nearest = turf.nearestPoint(from, harborFeatures);
  const matched = rows.find((r) => r.id === nearest.properties.id);

  return {
    id: matched.id,
    name: matched.name,
    capacityNotes: matched.capacity_notes,
    location: { lat: nearest.geometry.coordinates[1], lng: nearest.geometry.coordinates[0] },
    distanceKm: turf.distance(from, nearest, { units: 'kilometers' })
  };
}

async function suggestSafeRoute({ origin, destination }) {
  const [restrictedZones, hazards] = await Promise.all([
    query(`SELECT id, name, ST_AsGeoJSON(geom)::json AS geometry FROM restricted_zones`),
    query(`SELECT id, ST_AsGeoJSON(geom)::json AS geometry FROM hazard_detections
           WHERE detected_at >= now() - interval '72 hours'`)
  ]);

  const straightLine = turf.lineString([
    [origin.lng, origin.lat],
    [destination.lng, destination.lat]
  ]);

  const blockers = [...restrictedZones.rows, ...hazards.rows].map((r) => ({
    id: r.id,
    name: r.name || 'hazard',
    geometry: r.geometry
  }));

  const intersected = blockers.filter((b) =>
    turf.booleanIntersects(straightLine, turf.feature(b.geometry))
  );

  if (intersected.length === 0) {
    return {
      status: 'clear',
      path: [origin, destination],
      distanceKm: distanceKm(origin, destination),
      avoided: []
    };
  }

  // Demo-grade detour: try a small set of waypoint candidates — offset to
  // either side of the direct line, at increasing distances — and use the
  // first one whose two legs are both collision-free against every known
  // blocker. This isn't a real water-only routing graph, but it beats a
  // single fixed detour and fails informatively if nothing nearby is clear.
  const originPt = turf.point([origin.lng, origin.lat]);
  const destPt = turf.point([destination.lng, destination.lat]);
  const midpoint = turf.midpoint(originPt, destPt);
  const bearing = turf.bearing(originPt, destPt);

  const OFFSET_SIDES = [90, -90]; // right, then left of the direct line
  const OFFSET_DISTANCES_KM = [10, 20, 35, 50];

  let candidatePath = null;
  let candidateBlockers = intersected;

  outer: for (const distance of OFFSET_DISTANCES_KM) {
    for (const side of OFFSET_SIDES) {
      const detourPoint = turf.destination(midpoint, distance, bearing + side, { units: 'kilometers' });
      const detour = { lat: detourPoint.geometry.coordinates[1], lng: detourPoint.geometry.coordinates[0] };

      const leg1 = turf.lineString([[origin.lng, origin.lat], [detour.lng, detour.lat]]);
      const leg2 = turf.lineString([[detour.lng, detour.lat], [destination.lng, destination.lat]]);

      const legBlockers = blockers.filter(
        (b) => turf.booleanIntersects(leg1, turf.feature(b.geometry)) || turf.booleanIntersects(leg2, turf.feature(b.geometry))
      );

      if (legBlockers.length === 0) {
        candidatePath = [origin, detour, destination];
        candidateBlockers = intersected; // what the direct line would have hit
        break outer;
      }
    }
  }

  if (!candidatePath) {
    // No candidate in the tried set cleared every blocker — return the
    // widest-offset detour anyway, flagged so the caller knows it's still
    // unresolved rather than silently presenting it as safe.
    const fallback = turf.destination(midpoint, OFFSET_DISTANCES_KM[OFFSET_DISTANCES_KM.length - 1], bearing + 90, { units: 'kilometers' });
    candidatePath = [origin, { lat: fallback.geometry.coordinates[1], lng: fallback.geometry.coordinates[0] }, destination];

    const totalDistanceKm = distanceKm(candidatePath[0], candidatePath[1]) + distanceKm(candidatePath[1], candidatePath[2]);
    return {
      status: 'unresolved_detour',
      path: candidatePath,
      distanceKm: totalDistanceKm,
      avoided: intersected.map((b) => ({ id: b.id, name: b.name })),
      note: 'No collision-free waypoint found within the tried offsets — a real routing engine is needed for this area.'
    };
  }

  const totalDistanceKm =
    distanceKm(candidatePath[0], candidatePath[1]) + distanceKm(candidatePath[1], candidatePath[2]);

  return {
    status: 'detoured',
    path: candidatePath,
    distanceKm: totalDistanceKm,
    avoided: candidateBlockers.map((b) => ({ id: b.id, name: b.name }))
  };
}

module.exports = { findNearestSafeHarbor, suggestSafeRoute };
