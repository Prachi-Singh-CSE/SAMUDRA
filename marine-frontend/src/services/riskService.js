function numericValue(value) {
  return Number.parseFloat(value) || 0;
}

function severityForScore(score) {
  if (score >= 75) return "SEVERE";
  if (score >= 50) return "HIGH";
  if (score >= 25) return "MODERATE";
  return "LOW";
}

function confidenceForSources(dataSourceHealth, updatedAt) {
  if (dataSourceHealth.confidenceLevel) {
    const scores = { HIGH: 92, MEDIUM: 72, LOW: 48 };
    return {
      level: dataSourceHealth.confidenceLevel,
      score: scores[dataSourceHealth.confidenceLevel] || 48,
    };
  }
  const healthyRatio = dataSourceHealth.total
    ? dataSourceHealth.healthy / dataSourceHealth.total
    : 0;
  const minutesOld = numericValue(updatedAt);

  if (healthyRatio >= 0.9 && minutesOld <= 15) return { level: "HIGH", score: 92 };
  if (healthyRatio >= 0.65 && minutesOld <= 45) return { level: "MEDIUM", score: 72 };
  return { level: "LOW", score: 48 };
}

function factor(name, points, evidence, impact) {
  return { name, points, evidence, impact };
}

export function calculateRisk(marineData, dataSourceHealth) {
  const wind = numericValue(marineData.ocean.wind);
  const waves = numericValue(marineData.ocean.waveHeight);
  const confidence = confidenceForSources(dataSourceHealth, marineData.updatedAt);
  const factors = [
    factor(
      "Wind",
      wind >= 35 ? 25 : wind >= 25 ? 18 : wind >= 15 ? 12 : 5,
      `${marineData.ocean.wind} sustained wind`,
      wind >= 25 ? "High" : "Moderate"
    ),
    factor(
      "Wave height",
      waves >= 3.5 ? 25 : waves >= 2.5 ? 20 : waves >= 1.5 ? 15 : 5,
      `${marineData.ocean.waveHeight} significant waves`,
      waves >= 2.5 ? "High" : "Moderate"
    ),
    factor("Cyclone / weather", 18, "Weather watch data is present in the demo feed", "High"),
    factor("Nearby hazards", marineData.hazards.length ? 12 : 0, `${marineData.hazards.length} hazard detected near the route`, marineData.hazards.length ? "Moderate" : "Low"),
    factor("Lightning", 0, "No lightning signal in the demo feed", "Low"),
  ];
  const score = Math.min(
    100,
    factors.reduce((total, current) => total + current.points, 0)
  );
  const severity = severityForScore(score);

  return {
    mode: "demo",
    score,
    severity,
    status: `${severity} RISK`,
    factors,
    confidence,
    warnings: [
      ...(confidence.level === "LOW" || confidence.level === "MEDIUM"
        ? ["Some intelligence sources are degraded or older than 15 minutes."]
        : []),
      ...(marineData.hazards.length ? ["A nearby marine hazard is present on the current route."] : []),
      ...(dataSourceHealth.message ? [dataSourceHealth.message] : []),
    ],
    recommendation:
      severity === "SEVERE"
        ? "Avoid departure and move toward the nearest safe harbour."
        : severity === "HIGH"
          ? "Avoid the requested departure if possible and use the safer route."
          : severity === "MODERATE"
            ? "Proceed only with caution and monitor conditions before departure."
            : "Conditions are suitable for departure with normal precautions.",
  };
}

export function getRiskAssessment(marineData, dataSourceHealth) {
  return calculateRisk(marineData, dataSourceHealth);
}