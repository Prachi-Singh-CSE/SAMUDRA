import { apiGet, apiPatch } from "./api";

export function normalizeAlert(alert = {}) {
  return {
    ...alert,
    id: alert.id || `alert-${Date.now()}`,
    type: alert.type || "HAZARD",
    severity: alert.severity || "Low",
    title: alert.title || "Marine alert",
    message: alert.message || "",
    location: alert.location || "Unknown",
    time: alert.time || alert.timestamp || new Date().toISOString(),
    timestamp: alert.time || alert.timestamp || new Date().toISOString(),
    recommendedAction: alert.recommendedAction || "",
    status: alert.status || "active",
    acknowledged: Boolean(alert.acknowledged),
    read: Boolean(alert.read),
    sources: Array.isArray(alert.sources) ? alert.sources : [],
    mapPath: alert.mapPath || "/map",
  };
}

export async function fetchLiveAlerts(lat, lon) {
  const json = await apiGet(`/alerts?lat=${lat}&lon=${lon}`);
  const data = json.data || {};

  return {
    ...data,
    alerts: Array.isArray(data.alerts) ? data.alerts.map(normalizeAlert) : [],
  };
}

export async function updateAlertState(id, action) {
  return apiPatch(`/alerts/${encodeURIComponent(id)}/${action}`);
}

export function backendUnavailableAlert() {
  return normalizeAlert({
    id: "source-backend",
    type: "DATA_SOURCE_UNAVAILABLE",
    severity: "Low",
    title: "Marine API unavailable",
    message:
      "The alert service could not be reached. Live condition alerts are not available.",
    location: "Platform",
    recommendedAction: "Start the backend and refresh this page.",
    sources: ["Marine API"],
    mapPath: "/intelligence",
  });
}

function alertRecord({
  id,
  type,
  severity,
  title,
  message,
  location,
  action,
  mapPath,
  sources,
}) {
  return {
    id,
    type,
    severity,
    title,
    message,
    location,
    timestamp: "Demo feed · 22 min ago",
    recommendedAction: action,
    mapPath,
    sources,
    status: "active",
    read: false,
    acknowledged: false,
  };
}

function getSeverity(level) {
  const order = {
    INFO: 1,
    CAUTION: 2,
    WARNING: 3,
    CRITICAL: 4,
  };

  return order[level] || 1;
}

export function evaluateMarineAlerts(marineData = {}, dataSourceHealth = { sources: [] }, imbl, language = "en") {
  const alerts = [];

  const ocean = marineData.ocean || {};
  const hazards = Array.isArray(marineData.hazards) ? marineData.hazards : [];
  const vessels = Array.isArray(marineData.vessels) ? marineData.vessels : [];

  const wind = Number.parseFloat(ocean.wind) || 0;
  const waves = Number.parseFloat(ocean.waveHeight) || 0;
  const lightning = Boolean(ocean.lightning);
  const cyclone = Boolean(ocean.cyclone);

  const isHi = language === "hi";
  const isMr = language === "mr";

  // --------------------------------------------------
  // WEATHER / OCEAN ALERTS
  // --------------------------------------------------

  if (cyclone) {
    alerts.push(
      alertRecord({
        id: "cyclone-ar14",
        type: "CYCLONE",
        severity: "CRITICAL",
        title: isHi ? "चक्रवात संबंधी समुद्री जोखिम" : isMr ? "चक्रीवादळ संबंधित सागरी धोका" : "Cyclone-related marine risk",
        message: isHi
          ? "समुद्री डेटासेट में चक्रवात की स्थिति मौजूद है। परिस्थितियों के पुनर्मूल्यांकन तक रवाना होने से बचें।"
          : isMr
          ? "समुद्री डेटासेटमध्ये चक्रीवादळाची परिस्थिती आहे. परिस्थिती पुन्हा तपासली जाईपर्यंत निघणे टाळा."
          : "Cyclone conditions are present in the demo marine dataset. Departure should be avoided until conditions are reassessed.",
        location: isHi ? "सेक्टर AR-14" : isMr ? "सेक्टर AR-14" : "Sector AR-14",
        action: isHi
          ? "जोखिम आकलन की समीक्षा करें और गंभीर परिस्थितियों में रवाना न हों।"
          : isMr
          ? "धोका मूल्यांकनाचे पुनरावलोकन करा आणि गंभीर परिस्थितीत निघणे टाळा."
          : "Review the risk assessment and avoid departure during severe conditions.",
        mapPath: "/map?focus=hazard",
        sources: ["IMD / Weather", "Ocean Data"],
      })
    );
  }

  if (lightning) {
    alerts.push(
      alertRecord({
        id: "lightning-ar14",
        type: "LIGHTNING",
        severity: "WARNING",
        title: isHi ? "बिजली गिरने का जोखिम" : isMr ? "वीज पडण्याचा धोका" : "Lightning risk detected",
        message: isHi
          ? "वर्तमान समुद्री स्थिति में बिजली की गतिविधि मौजूद है।"
          : isMr
          ? "सध्याच्या सागरी स्थितीत विजेची हालचाल दिसत आहे."
          : "Lightning activity is present in the current demo marine conditions.",
        location: isHi ? "सेक्टर AR-14" : isMr ? "सेक्टर AR-14" : "Sector AR-14",
        action: isHi
          ? "खुले क्षेत्रों से बचें और रवाना होने से पहले सुरक्षा स्थिति की समीक्षा करें।"
          : isMr
          ? "उघड्या भागांपासून दूर राहा आणि निघण्यापूर्वी सुरक्षा परिस्थिती तपासा."
          : "Avoid exposed areas and review the latest safety conditions before departure.",
        mapPath: "/map?focus=hazard",
        sources: ["IMD / Weather"],
      })
    );
  }

  if (waves >= 1.5) {
    alerts.push(
      alertRecord({
        id: "high-waves-ar14",
        type: "HIGH_WAVES",
        severity: waves >= 2.5 ? "WARNING" : "CAUTION",
        title: isHi ? "मार्ग में ऊँची लहरों की स्थिति" : isMr ? "मार्गावर उंच लाटांची परिस्थिती" : "High-wave conditions along route",
        message: isHi
          ? `अनुशंसित मार्ग पर ${ocean.waveHeight} की लहरें मौजूद हैं।`
          : isMr
          ? `शिफारस केलेल्या मार्गावर ${ocean.waveHeight} च्या लाटा आहेत.`
          : `${ocean.waveHeight} waves are present along the recommended route.`,
        location: isHi ? "सेक्टर AR-14" : isMr ? "सेक्टर AR-14" : "Sector AR-14",
        action: isHi
          ? "सुरक्षित मार्ग का उपयोग करें और परिस्थितियों पर नज़र रखें।"
          : isMr
          ? "सुरक्षित मार्ग वापरा आणि परिस्थितीवर लक्ष ठेवा."
          : "Use the safer route and monitor conditions.",
        mapPath: "/map?focus=hazard",
        sources: ["IMD / Weather", "Ocean Data"],
      })
    );
  }

  if (wind >= 15) {
    alerts.push(
      alertRecord({
        id: "strong-wind-ar14",
        type: "STRONG_WIND",
        severity: wind >= 30 ? "WARNING" : "CAUTION",
        title: isHi ? "तेज हवा की स्थिति" : isMr ? "जोराच्या वाऱ्याची परिस्थिती" : "Strong wind conditions",
        message: isHi
          ? `वर्तमान मार्ग के पास ${ocean.wind} तेज हवा दर्ज की गई है।`
          : isMr
          ? `सध्याच्या मार्गाजवळ ${ocean.wind} तीव्र वारा नोंदवला गेला आहे.`
          : `${ocean.wind} wind is recorded near the current route.`,
        location: isHi ? "सेक्टर AR-14" : isMr ? "सेक्टर AR-14" : "Sector AR-14",
        action: isHi
          ? "रवाना होने से पहले जोखिम आकलन की जाँच करें।"
          : isMr
          ? "निघण्यापूर्वी धोका मूल्यांकनाची तपासणी करा."
          : "Check the risk assessment before departure.",
        mapPath: "/intelligence",
        sources: ["IMD / Weather"],
      })
    );
  }

  // --------------------------------------------------
  // MARINE HAZARDS
  // --------------------------------------------------

  hazards.forEach((hazard) => {
    const isOilSlick = hazard.type === "Oil Slick";

    alerts.push(
      alertRecord({
        id: `hazard-${hazard.id}`,
        type: isOilSlick ? "OIL_SLICK" : "HAZARD",
        severity:
          hazard.severity === "critical"
            ? "CRITICAL"
            : hazard.severity === "high"
              ? "WARNING"
              : "CAUTION",
        title: isHi
          ? (isOilSlick ? "तेल का रिसाव पाया गया" : hazard.name)
          : isMr
          ? (isOilSlick ? "तेल गळती आढळली" : hazard.name)
          : hazard.name,
        message:
          hazard.recommendedAction ||
          (isHi
            ? "इस क्षेत्र में एक समुद्री खतरा पहचाना गया है।"
            : isMr
            ? "या भागात सागरी धोका ओळखला गेला आहे."
            : "A marine hazard has been identified in this area."),
        location: Array.isArray(hazard.position)
          ? hazard.position.join(", ")
          : isHi ? "समुद्री क्षेत्र" : isMr ? "सागरी क्षेत्र" : "Marine area",
        action:
          hazard.recommendedAction ||
          (isHi
            ? "समुद्री मानचित्र पर खतरे की समीक्षा करें।"
            : isMr
            ? "नकाशावर धोक्याचे पुनरावलोकन करा."
            : "Review the hazard on the marine map."),
        mapPath: "/map?focus=hazard",
        sources: ["Ocean Data", "AIS"],
      })
    );
  });

  // --------------------------------------------------
  // VESSEL / AIS ALERT
  // --------------------------------------------------

  const suspiciousVessel = vessels.find((vessel) => vessel.suspicious);

  if (suspiciousVessel) {
    alerts.push(
      alertRecord({
        id: `vessel-${suspiciousVessel.id}`,
        type: "VESSEL_ACTIVITY",
        severity: "WARNING",
        title: isHi ? "संदिग्ध पोत गतिविधि" : isMr ? "संशयास्पद जहाज हालचाल" : "Suspicious vessel activity",
        message: isHi
          ? "एक पोत संपर्क का AIS सहसंबंध अधूरा है।"
          : isMr
          ? "एका जहाज संपर्काचा AIS सहसंबंध अपूर्ण आहे."
          : "A demo vessel contact does not have a complete AIS correlation.",
        location: Array.isArray(suspiciousVessel.position)
          ? suspiciousVessel.position.join(", ")
          : isHi ? "समुद्री क्षेत्र" : isMr ? "सागरी क्षेत्र" : "Marine area",
        action: isHi ? "मानचित्र पर पोत गतिविधि देखें।" : isMr ? "नकाशावर जहाजाची हालचाल पहा." : "Review vessel activity on the map.",
        mapPath: "/map?focus=vessel",
        sources: ["Vessel / AIS"],
      })
    );
  }

  // --------------------------------------------------
  // IMBL
  // --------------------------------------------------

  if (imbl && imbl.status && imbl.status !== "SAFE") {
    const imblSeverity =
      imbl.status === "CRITICAL"
        ? "CRITICAL"
        : imbl.status === "WARNING"
          ? "WARNING"
          : "CAUTION";

    alerts.push(
      alertRecord({
        id: "imbl-safety",
        type: "IMBL",
        severity: imblSeverity,
        title: isHi ? "IMBL सुरक्षा चेतावनी" : isMr ? "IMBL सुरक्षा इशारा" : "IMBL demo safety warning",
        message: imbl.warning,
        location: Array.isArray(imbl.location)
          ? imbl.location.join(", ")
          : "IMBL demo boundary",
        action: imbl.recommendedAction,
        mapPath: "/map?focus=imbl",
        sources: ["GPS", "Demo boundary calculation"],
      })
    );
  }

  // --------------------------------------------------
  // DATA SOURCE HEALTH / DEGRADED MODE
  // --------------------------------------------------

  const sources = Array.isArray(dataSourceHealth.sources)
    ? dataSourceHealth.sources
    : [];

  sources
    .filter((source) =>
      ["STALE", "CACHED", "UNAVAILABLE"].includes(source.status)
    )
    .forEach((source) => {
      const unavailable = source.status === "UNAVAILABLE";

      alerts.push(
        alertRecord({
          id: `source-health-${source.id}`,
          type: unavailable
            ? "DATA_SOURCE_UNAVAILABLE"
            : "DATA_SOURCE_STALE",
          severity: unavailable ? "WARNING" : "CAUTION",
          title: isHi
            ? `${source.name} ${unavailable ? "अनुपलब्ध" : "पुराना डेटा"}`
            : isMr
            ? `${source.name} ${unavailable ? "अनुपलब्ध" : "जुनोटा डेटा"}`
            : `${source.name} ${source.status.toLowerCase()}`,
          message:
            source.message ||
            (isHi
              ? `${source.name} वर्तमान में ${unavailable ? "अनुपलब्ध" : "पुराना"} है।`
              : isMr
              ? `${source.name} सध्या ${unavailable ? "अनुपलब्ध" : "जुना"} आहे.`
              : `${source.name} is currently ${source.status.toLowerCase()}.`),
          location: isHi ? "प्लेटफॉर्म डेटा सेवाएं" : isMr ? "प्लॅटफॉर्म डेटा सेवा" : "Platform data services",
          action: unavailable
            ? (isHi
                ? "उपलब्ध जानकारी के साथ जारी रखें और सिफारिशों को कम विश्वास स्तर वाला मानें।"
                : "Continue with available information and treat recommendations as lower confidence.")
            : (isHi
                ? "उपलब्ध डेटा का उपयोग करें लेकिन इसकी ताज़गी का ध्यान रखें।"
                : "Use the available data while considering its freshness."),
          mapPath: "/intelligence",
          sources: [source.name],
        })
      );
    });

  // --------------------------------------------------
  // DEDUPLICATION
  // --------------------------------------------------

  const uniqueAlerts = Array.from(
    new Map(alerts.map((alert) => [alert.id, alert])).values()
  );

  // Highest severity alerts first
  return uniqueAlerts.sort(
    (a, b) => getSeverity(b.severity) - getSeverity(a.severity)
  );
}

export function getAuthorityAlerts() {
  return [
    {
      id: "sos-demo",
      type: "SOS",
      title: "Emergency SOS Alert",
      location: "Sector AR-14",
      time: "2 min ago",
      severity: "CRITICAL",
      status: "Active",
    },
    {
      id: "imbl-escalation",
      type: "IMBL",
      title: "IMBL Boundary Warning",
      location: "Sector AR-09",
      time: "8 min ago",
      severity: "WARNING",
      status: "Escalated",
    },
  ];
}