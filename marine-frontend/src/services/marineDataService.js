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

    vessels,

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

  const results = await Promise.allSettled(
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
  );

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
  // RETURN COMPLETE MARINE SNAPSHOT
  // ==========================================================

  return {
    mode: "live",

    userPosition: [lat, lon],

    // Existing UI data
    fishingZones,

    vessels,

    hazards,

    harbours,

    weatherRiskZones,

    imblBoundary,

    recommendedRoute,

    // Live backend data
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

    // Useful summary for UI
    liveSummary: {
      temperature:
        weather?.temperature ??
        ocean?.temperature ??
        null,

      wind:
        weather?.wind ??
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