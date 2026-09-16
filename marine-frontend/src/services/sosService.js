export function getSOSDetails() {
  return {
    mode: "demo",
    contact: { name: "Ramesh Kolekar", relationship: "Family contact" },
    vessel: { name: "Sagar Rani", registration: "IND-KL-2291", crew: 5 },
  };
}

export function prepareSOSAlert(details = {}) {
  return {
    status: "LOCALLY_RECORDED",
    transmitted: false,
    transmissionStatus: "NOT_TRANSMITTED",
    createdAt: new Date().toISOString(),
    details,
  };
}

export function createSOSEvent(details = {}) {
  const event = prepareSOSAlert(details);

  return {
    ...event,
    id: `SOS-DEMO-${Date.now()}`,
    type: "SOS",
    severity: "CRITICAL",
    acknowledgementStatus: "ACTIVE",
    locationStatus: details.locationStatus || "DEMO_FALLBACK",
    location: details.location || null,
    vessel: details.vessel || null,
    user: details.user || null,
  };
}

export function acknowledgeSOSEvent(event) {
  return { ...event, acknowledgementStatus: "ACKNOWLEDGED" };
}