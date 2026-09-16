import { fetchAisAnomalies, mergeVesselsWithAisAnomalies } from "./aisService";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:5000/api";

// ============================================================
// DEMO / FALLBACK DATA
// ============================================================

const userPosition = [15.1, 73.8];

const fishingZones = [
  {
    id: 1,
    name: "PFZ Alpha",
    position: [15.45, 72.9],
    score: 92,
    risk: "Low",
  },
  {
    id: 2,
    name: "PFZ Bravo",
    position: [14.7, 73.55],
    score: 86,
    risk: "Low",
  },
  {
    id: 3,
    name: "PFZ Charlie",
    position: [15.8, 74.15],
    score: 78,
    risk: "Medium",
  },
];

const vessels = [
  {
    id: 1,
    name: "Fishing Vessel",
    position: [15.25, 73.25],
  },
  {
    id: 2,
    name: "Commercial Vessel",
    position: [14.8, 74.45],
  },
  {
    id: 3,
    name: "Unknown Vessel",
    position: [15.65, 73.65],
    suspicious: true,
  },
];

const hazards = [
  {
    id: 1,
    name: "Moderate Wave Risk",
    type: "High-wave zone",
    position: [15.35, 73.9],
    severity: "moderate",
    status: "Detected 22 min ago",
    recommendedAction:
      "Avoid this area where possible.",
  },
];

const harbours = [
  {
    id: "vasai",
    name: "Vasai Safe Harbour",
    position: [15.02, 73.68],
    status: "Demo harbour reference",
  },
  {
    id: "mormugao",
    name: "Mormugao Harbour",
    position: [15.41, 73.8],
    status: "Demo harbour reference",
  },
];

const weatherRiskZones = [
  {
    id: "weather-ar14",
    name: "AR-14 weather-risk zone",
    center: [15.35, 73.9],
    radius: 50000,
    score: 57,
    status: "HIGH demo risk",
  },
];

const imblBoundary = [
  [16.5, 72.3],
  [16.5, 74.8],
  [13.8, 74.8],
  [13.8, 72.3],
];

const recommendedRoute = [
  userPosition,
  [15.25, 73.45],
  [15.45, 73.7],
  [15.65, 73.95],
];

// ============================================================
// EXISTING DEMO SNAPSHOT
// ============================================================

export function getMarineSnapshot() {
  return {
    mode: "demo",

    userPosition,

    fishingZones,

    vessels: vessels.map((vessel) => ({ ...vessel, ais: { source: "demo" } })),

    aisMode: "demo",

    hazards,

    harbours,

    weatherRiskZones,

    imblBoundary,

    recommendedRoute,

    ocean: {
      temperature: "27.2°C",
      wind: "18 km/h",
      waveHeight: "1.9 m",
    },

    updatedAt: "22 min ago",
  };
}

// ============================================================
// LIVE API HELPER
// ============================================================

async function fetchLiveAPI(endpoint, lat, lon) {
  const url =
    `${API_BASE_URL}${endpoint}` +
    `?lat=${encodeURIComponent(lat)}` +
    `&lon=${encodeURIComponent(lon)}`;

  console.log(`🌐 API Request: ${url}`);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `${endpoint} failed with HTTP ${response.status}`
    );
  }

  const result = await response.json();

  // Backend normally returns:
  // { success: true, data: {...} }

  return result?.data ?? result;
}

// Demo baseline values used to fill in `marine.ocean.wind` / `.waveHeight`
// whenever a live source failed — risk/alert calculations (written against
// the demo snapshot's shape) expect numbers here, never `undefined`.
const DEMO_WIND_KMH = 18;
const DEMO_WAVE_HEIGHT_M = 1.9;

// Mirrors the shape of dataSourceHealthService.getDataSourceHealth() but
// built from which live endpoints actually succeeded this call, so the UI
// (confidence score, degraded-mode badges) reflects real source health
// instead of always showing the static demo values.
function buildLiveDataSourceHealth(liveData, aisMode) {
  const entries = [
    { id: "imd", name: "IMD / Weather", ok: Boolean(liveData.weather) },
    { id: "ocean", name: "Ocean Data", ok: Boolean(liveData.ocean) },
    { id: "pfz", name: "PFZ / MOSDAC", ok: Boolean(liveData.pfz) },
    { id: "ais", name: "Vessel / AIS", ok: aisMode !== "unavailable" },
    { id: "marine-api", name: "Marine API", ok: Boolean(liveData.alerts) },
  ];

  const sources = entries.map(({ id, name, ok }) => ({
    id,
    name,
    status: ok ? "LIVE" : "UNAVAILABLE",
    lastUpdated: ok ? "Just now" : "Unavailable",
    ageMinutes: ok ? 0 : null,
    confidenceContribution: ok ? 1 : 0,
    message: ok
      ? `${name} is live.`
      : `${name} data unavailable. Information may be incomplete.`,
  }));

  const unavailable = sources.filter((source) => source.status === "UNAVAILABLE");
  const available = sources.filter((source) => source.status === "LIVE");
  const confidenceLevel = !unavailable.length
    ? "HIGH"
    : unavailable.length === sources.length
      ? "LOW"
      : "MEDIUM";

  return {
    mode: "live",
    sources,
    healthy: available.length,
    total: sources.length,
    unavailableCount: unavailable.length,
    staleCount: 0,
    confidenceLevel,
    degraded: unavailable.length > 0,
    message: unavailable.length
      ? "Some live marine data sources are currently unavailable."
      : "All live marine data sources are available.",
  };
}

// ============================================================
// LIVE MARINE DATA
// ============================================================

export async function getLiveMarineSnapshot(
  lat,
  lon
) {
  console.log(
    "🌊 Loading live marine data:",
    lat,
    lon
  );

  const endpoints = {
    weather: "/weather",
    ocean: "/ocean",
    pfz: "/pfz",
    chlorophyll: "/chlorophyll",
    sss: "/sss",
    subsurface: "/subsurface",
    alerts: "/alerts",
  };

  const entries = Object.entries(endpoints);

  const [results, aisAnomalies] = await Promise.all([
    Promise.allSettled(
      entries.map(async ([key, endpoint]) => {
        const data = await fetchLiveAPI(
          endpoint,
          lat,
          lon
        );

        return {
          key,
          data,
        };
      })
    ),
    // Separate microservice (gis-hazard-service, not the main API), and
    // not lat/lon-scoped — it screens whatever vessel_positions rows
    // exist in the last `sinceHours` window. Never throws: `null` means
    // "couldn't reach it", `[]` means "reachable, nothing flagged".
    fetchAisAnomalies({ sinceHours: 6 }),
  ]);

  const liveData = {};

  results.forEach((result, index) => {
    const [key] = entries[index];

    if (result.status === "fulfilled") {
      liveData[key] = result.value.data;

      console.log(
        `✅ Live ${key} data loaded`
      );
    } else {
      liveData[key] = null;

      console.warn(
        `⚠️ Live ${key} failed:`,
        result.reason?.message ||
          result.reason
      );
    }
  });

  // ==========================================================
  // LIVE WEATHER
  // ==========================================================

  const weather = liveData.weather;

  // ==========================================================
  // LIVE OCEAN
  // ==========================================================

  const ocean = liveData.ocean;

  // ==========================================================
  // LIVE PFZ
  // ==========================================================

  const pfz = liveData.pfz;

  // ==========================================================
  // LIVE AIS
  // ==========================================================

  const { vessels: liveVessels, mode: aisMode } = mergeVesselsWithAisAnomalies(
    vessels,
    aisAnomalies
  );

  if (aisMode === "unavailable") {
    console.warn("⚠️ Live AIS unavailable — showing demo vessel contacts only");
  } else {
    console.log(`✅ Live AIS data loaded (${aisAnomalies.length} anomal${aisAnomalies.length === 1 ? "y" : "ies"})`);
  }

  // ==========================================================
  // MARINE SNAPSHOT (risk / IMBL / alert calculations are all written
  // against this shape — see getMarineSnapshot() above)
  // ==========================================================

  const marine = {
    mode: "live",

    userPosition: [lat, lon],

    fishingZones,

    vessels: liveVessels,

    aisMode,

    hazards,

    harbours,

    weatherRiskZones,

    imblBoundary,

    recommendedRoute,

    ocean: {
      wind: weather?.windSpeed ?? DEMO_WIND_KMH,
      waveHeight: ocean?.waveHeight ?? DEMO_WAVE_HEIGHT_M,
      temperature:
        weather?.temperature ??
        ocean?.seaSurfaceTemperature ??
        null,
      lightning: false,
      cyclone: false,
    },

    updatedAt: new Date().toISOString(),
  };

  const dataSources = buildLiveDataSourceHealth(liveData, aisMode);

  // ==========================================================
  // RETURN COMPLETE MARINE SNAPSHOT
  // ==========================================================

  return {
    marine,

    // Live backend data (raw, for pages that want the unprocessed feed)
    weather,

    ocean,

    pfz,

    chlorophyll:
      liveData.chlorophyll,

    sss: liveData.sss,

    subsurface:
      liveData.subsurface,

    backendAlerts:
      liveData.alerts,

    dataSources,

    // Useful summary for UI
    liveSummary: {
      temperature:
        weather?.temperature ??
        ocean?.seaSurfaceTemperature ??
        null,

      wind:
        weather?.windSpeed ??
        null,

      waveHeight:
        ocean?.waveHeight ??
        null,

      fishingPotential:
        pfz?.fishingPotential ??
        null,

      recommendation:
        pfz?.recommendation ??
        null,

      confidence:
        pfz?.confidence ??
        null,

      dataHealth:
        pfz?.dataHealth ??
        null,
    },

    updatedAt:
      new Date().toISOString(),
  };
}