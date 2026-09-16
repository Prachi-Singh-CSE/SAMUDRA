// Duration a vessel must remain inside the IMBL buffer zone (or beyond it)
// before the on-app warning escalates to the authority dashboard. Kept short
// for demo pacing; a production build would tune this against real GPS
// polling intervals.
export const IMBL_DWELL_THRESHOLD_SECONDS = 20;

function statusForDistance(distanceKm) {
  if (distanceKm <= 1) return "CRITICAL";
  if (distanceKm <= 2) return "WARNING";
  if (distanceKm <= 5) return "CAUTION";
  return "SAFE";
}

export function evaluateIMBLSafety({ routeId = "safer", marineData }) {
  const routeData = routeId === "fastest"
    ? { distanceKm: 1.8, estimatedMinutes: 11 }
    : { distanceKm: 6.4, estimatedMinutes: 38 };
  const status = statusForDistance(routeData.distanceKm);

  // `approaching` just means "inside the buffer right now" — a single
  // distance check. It is NOT the same as an authority escalation, which
  // additionally requires staying inside the buffer for
  // IMBL_DWELL_THRESHOLD_SECONDS (tracked as a dwell timer in
  // AppDataProvider). This is what separates a brief drift through the
  // buffer from a sustained or intentional incursion.
  const approaching = status !== "SAFE";

  return {
    mode: "demo",
    status,
    distanceKm: routeData.distanceKm,
    estimatedMinutes: routeData.estimatedMinutes,
    approaching,
    location: marineData.userPosition,
    warning: status === "SAFE"
      ? "Your selected route remains outside the demo IMBL warning range."
      : "Your vessel is approaching the IMBL demo boundary.",
    recommendedAction: status === "SAFE"
      ? "Remain within the selected safe operating area."
      : "Change route and remain within the safe operating area.",
    disclaimer: "Demo safety calculation; this is not an official live maritime boundary feed.",
  };
}