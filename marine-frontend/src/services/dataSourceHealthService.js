const baseSources = [
  {
    id: "imd",
    name: "IMD / Weather",
    status: "CACHED",
    lastUpdated: "22 min ago",
    ageMinutes: 22,
    confidenceContribution: 0.82,
    message: "Weather conditions are available from cached demo data.",
  },
  {
    id: "ocean",
    name: "Ocean Data",
    status: "CACHED",
    lastUpdated: "22 min ago",
    ageMinutes: 22,
    confidenceContribution: 0.82,
    message: "Ocean conditions are available from cached demo data.",
  },
  {
    id: "pfz",
    name: "PFZ / MOSDAC",
    status: "CACHED",
    lastUpdated: "22 min ago",
    ageMinutes: 22,
    confidenceContribution: 0.82,
    message: "Fishing-zone intelligence is cached demo data.",
  },
  {
    id: "ais",
    name: "Vessel / AIS",
    status: "STALE",
    lastUpdated: "22 min ago",
    ageMinutes: 22,
    confidenceContribution: 0.55,
    message: "Vessel information may be incomplete because AIS data is stale.",
  },
  {
    id: "marine-api",
    name: "Marine API",
    status: "CACHED",
    lastUpdated: "22 min ago",
    ageMinutes: 22,
    confidenceContribution: 0.82,
    message: "Marine API is represented by cached demo data.",
  },
];

function readDeveloperOverrides() {
  if (typeof globalThis === "undefined") return {};
  return globalThis.__SAMUDRA_DEMO_SOURCE_STATUS__ || {};
}

export function getDataSourceHealth(overrides = readDeveloperOverrides()) {
  const sources = baseSources.map((source) => ({
    ...source,
    ...(overrides[source.id] ? { status: overrides[source.id] } : {}),
    ...(overrides[source.id] === "UNAVAILABLE"
      ? {
          lastUpdated: "Unavailable",
          ageMinutes: null,
          confidenceContribution: 0,
          message: `${source.name} data unavailable. Information may be incomplete.`,
        }
      : overrides[source.id] === "STALE"
        ? {
            message: `${source.name} data is stale. Information may be incomplete.`,
          }
        : {}),
  }));
  const unavailable = sources.filter((source) => source.status === "UNAVAILABLE");
  const stale = sources.filter((source) => source.status === "STALE");
  const available = sources.filter((source) => ["LIVE", "CACHED"].includes(source.status));
  const confidenceLevel = unavailable.length ? "LOW" : stale.length ? "MEDIUM" : "HIGH";

  return {
    mode: "demo",
    sources,
    healthy: available.length,
    total: sources.length,
    unavailableCount: unavailable.length,
    staleCount: stale.length,
    confidenceLevel,
    degraded: unavailable.length > 0 || stale.length > 0,
    message: unavailable.length
      ? "Some marine data is currently unavailable or outdated."
      : stale.length
        ? "Some marine data is currently outdated."
        : "Demo marine data sources are available.",
  };
}

export function setDemoSourceStatus(sourceId, status) {
  if (typeof globalThis === "undefined") return;
  globalThis.__SAMUDRA_DEMO_SOURCE_STATUS__ = {
    ...readDeveloperOverrides(),
    [sourceId]: status,
  };
}