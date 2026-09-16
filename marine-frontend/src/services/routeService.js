import { gisApi } from "./api";

// ============================================================
// DEMO / FALLBACK DATA
// ============================================================

const routes = [
  {
    id: "fastest",
    name: "FASTEST ROUTE",
    distanceKm: 31,
    duration: "1h 20m",
    risk: "HIGH",
    path: [[15.1, 73.8], [15.25, 73.45], [15.45, 73.7], [15.65, 73.95]],
    destination: "Zone A",
  },
  {
    id: "safer",
    name: "SAFER ROUTE",
    distanceKm: 36,
    duration: "1h 32m",
    risk: "LOW",
    recommended: true,
    path: [[15.1, 73.8], [15.18, 73.55], [15.32, 73.5], [15.02, 73.68]],
    destination: "Vasai Safe Harbour",
  },
];

export function getRouteOptions() {
  return { mode: "demo", routes };
}

export function selectRoute(routeId) {
  return routes.find((route) => route.id === routeId) || routes[1];
}

// ============================================================
// LIVE ROUTE + RISK INTEGRATION — gis-hazard-service
// ============================================================
//
// The backend has no single "give me two named routes" endpoint. Instead
// it exposes the building blocks a real route screen needs:
//   - GET  /api/route/nearest-harbor  → real nearest safe harbor from the DB
//   - POST /api/route/safe-route      → a path that detours around
//                                        restricted zones / recent hazards
//   - GET  /api/risk/score            → a 0-100 composite risk score driven
//                                        by live wave/wind/cyclone/hazard data
// This module calls all three for each of the app's two named routes
// ("fastest" -> a fixed demo waypoint, "safer" -> the real nearest harbor)
// and replaces the old fixed "HIGH"/"LOW" strings with the computed risk.
// Any call that fails leaves that specific route on its demo fallback
// instead of breaking the page.

const AVERAGE_SPEED_KMH = 22; // rough small-fishing-vessel cruising speed, for duration estimates

// Matches the old hardcoded "fastest route" endpoint, kept as a fixed demo
// waypoint since there's no real "Zone A" destination in the database.
const FASTEST_DESTINATION = { lat: 15.65, lng: 73.95 };
const DEMO_SAFE_HARBOUR = { lat: 15.02, lng: 73.68, name: "Vasai Safe Harbour" };

function formatDuration(distanceKm) {
  const totalMinutes = Math.round((distanceKm / AVERAGE_SPEED_KMH) * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

async function fetchRiskForPoint({ lat, lng }) {
  try {
    const { data } = await gisApi.get("/risk/score", { params: { lat, lng } });
    return data; // { compositeScore, riskLevel, subScores, inputs }
  } catch (error) {
    console.warn("⚠️ Route risk score fetch failed:", error.message);
    return null;
  }
}

async function fetchSafeRoute({ origin, destination }) {
  try {
    const { data } = await gisApi.post("/route/safe-route", { origin, destination });
    return data; // { status, path: [{lat,lng}...], distanceKm, avoided, note? }
  } catch (error) {
    console.warn("⚠️ Safe-route fetch failed:", error.message);
    return null;
  }
}

async function fetchNearestSafeHarbor({ lat, lng }) {
  try {
    const { data } = await gisApi.get("/route/nearest-harbor", { params: { lat, lng } });
    return data; // { id, name, location: {lat,lng}, distanceKm, capacityNotes }
  } catch (error) {
    // Also hit on a real 404 ("no safe harbors seeded yet") — same fallback.
    console.warn("⚠️ Nearest safe harbor fetch failed:", error.message);
    return null;
  }
}

// Backend path points are {lat,lng}; react-leaflet wants [lat, lng] pairs.
function pathToLatLngPairs(path) {
  return path.map((point) => [point.lat, point.lng]);
}

function buildLiveRoute(demoRoute, { destinationName, riskResult, safeRouteResult }) {
  if (!riskResult && !safeRouteResult) {
    return { ...demoRoute, mode: "demo" };
  }

  const distanceKm = safeRouteResult
    ? Math.round(safeRouteResult.distanceKm * 10) / 10
    : demoRoute.distanceKm;

  return {
    ...demoRoute,
    mode: "live",
    path: safeRouteResult ? pathToLatLngPairs(safeRouteResult.path) : demoRoute.path,
    distanceKm,
    duration: formatDuration(distanceKm),
    destination: destinationName || demoRoute.destination,
    risk: riskResult ? riskResult.riskLevel.toUpperCase() : demoRoute.risk,
    riskScore: riskResult ? riskResult.compositeScore : undefined,
    riskInputs: riskResult ? riskResult.inputs : undefined,
    avoided: safeRouteResult?.avoided || [],
    routeStatus: safeRouteResult?.status,
    routeNote: safeRouteResult?.note,
  };
}

/**
 * Computes live versions of both named routes from the current position.
 * Falls back per-route to the original demo values (tagged `mode: "demo"`)
 * when the backend is unreachable, so route planning never breaks — it
 * just quietly stops being "live" until the service comes back.
 */
export async function getLiveRouteOptions({ position }) {
  const [lat, lng] = position;
  const origin = { lat, lng };

  const harbor = await fetchNearestSafeHarbor(origin);
  const saferDestination = harbor
    ? { lat: harbor.location.lat, lng: harbor.location.lng }
    : { lat: DEMO_SAFE_HARBOUR.lat, lng: DEMO_SAFE_HARBOUR.lng };
  const saferDestinationName = harbor ? harbor.name : DEMO_SAFE_HARBOUR.name;

  const [fastestSafeRoute, fastestRisk, saferSafeRoute, saferRisk] = await Promise.all([
    fetchSafeRoute({ origin, destination: FASTEST_DESTINATION }),
    fetchRiskForPoint(FASTEST_DESTINATION),
    fetchSafeRoute({ origin, destination: saferDestination }),
    fetchRiskForPoint(saferDestination),
  ]);

  const fastestDemo = routes.find((route) => route.id === "fastest");
  const saferDemo = routes.find((route) => route.id === "safer");

  const liveFastest = buildLiveRoute(fastestDemo, {
    destinationName: "Zone A",
    riskResult: fastestRisk,
    safeRouteResult: fastestSafeRoute,
  });

  const liveSafer = buildLiveRoute(saferDemo, {
    destinationName: saferDestinationName,
    riskResult: saferRisk,
    safeRouteResult: saferSafeRoute,
  });

  // Recommend whichever route scores lower risk when both came back live;
  // otherwise keep the original "safer is recommended by default" behavior.
  const bothScored =
    Number.isFinite(liveFastest.riskScore) && Number.isFinite(liveSafer.riskScore);
  const fastestIsSafer = bothScored && liveFastest.riskScore <= liveSafer.riskScore;

  const finalFastest = {
    ...liveFastest,
    recommended: bothScored ? fastestIsSafer : liveFastest.recommended,
  };
  const finalSafer = {
    ...liveSafer,
    recommended: bothScored ? !fastestIsSafer : true,
  };

  const anyLive = finalFastest.mode === "live" || finalSafer.mode === "live";

  return {
    mode: anyLive ? "live" : "demo",
    routes: [finalFastest, finalSafer],
  };
}