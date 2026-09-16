/**
 * Builds alert objects from already-fetched condition snapshots.
 * Thresholds match backend/src/agents/weatherAgent.js (wind 20/30 km/h, waves 2/3 m).
 */

const WIND_MEDIUM_KMH = 20;
const WIND_HIGH_KMH = 30;
const WAVE_MEDIUM_M = 2;
const WAVE_HIGH_M = 3;

function locationLabel(lat, lon) {
    if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lon))) {
        return "Unknown location";
    }
    return `${Number(lat).toFixed(2)}°N, ${Number(lon).toFixed(2)}°E`;
}

function makeAlert({
    id,
    type,
    severity,
    title,
    message,
    location,
    recommendedAction,
    sources = [],
    mapPath = "/map"
}) {
    return {
        id,
        type,
        severity,
        title,
        message,
        location,
        time: new Date().toISOString(),
        recommendedAction,
        status: "active",
        acknowledged: false,
        read: false,
        sources,
        mapPath
    };
}

function severityFromThreshold(value, medium, high) {
    if (value >= high) return "High";
    if (value >= medium) return "Medium";
    return "Low";
}

function thunderstormAlert(weatherCode) {
    const code = Number(weatherCode);
    if (!Number.isFinite(code)) return null;
    if (code === 95) {
        return { severity: "Medium", label: "Thunderstorm conditions" };
    }
    if (code === 96 || code === 99) {
        return { severity: "High", label: "Severe thunderstorm with hail" };
    }
    return null;
}

function generateConditionAlerts({ lat, lon, weather = {}, ocean = {} }) {
    const alerts = [];
    const place = locationLabel(lat, lon);
    const wind = weather.windSpeed;
    const waves = ocean.waveHeight;

    if (Number.isFinite(wind) && wind >= WIND_MEDIUM_KMH) {
        const severity = severityFromThreshold(wind, WIND_MEDIUM_KMH, WIND_HIGH_KMH);
        alerts.push(makeAlert({
            id: `strong-wind-${Number(lat).toFixed(2)}-${Number(lon).toFixed(2)}`,
            type: "STRONG_WIND",
            severity,
            title: "Strong wind",
            message: `Wind speed is ${wind} km/h at this location.`,
            location: place,
            recommendedAction:
                severity === "High"
                    ? "Avoid departure if possible and stay near shelter."
                    : "Check conditions before leaving and reduce exposure.",
            sources: ["Open-Meteo Weather"],
            mapPath: "/intelligence"
        }));
    }

    if (Number.isFinite(waves) && waves >= WAVE_MEDIUM_M) {
        const severity = severityFromThreshold(waves, WAVE_MEDIUM_M, WAVE_HIGH_M);
        alerts.push(makeAlert({
            id: `high-waves-${Number(lat).toFixed(2)}-${Number(lon).toFixed(2)}`,
            type: "HIGH_WAVES",
            severity,
            title: "High waves",
            message: `Significant wave height is ${waves} m at this location.`,
            location: place,
            recommendedAction:
                severity === "High"
                    ? "Avoid open water and move toward the nearest safe harbour."
                    : "Use a safer route and monitor wave conditions.",
            sources: ["Open-Meteo Marine"],
            mapPath: "/map?focus=hazard"
        }));
    }

    const storm = thunderstormAlert(weather.weatherCode);
    if (storm) {
        alerts.push(makeAlert({
            id: `lightning-${Number(lat).toFixed(2)}-${Number(lon).toFixed(2)}`,
            type: "LIGHTNING",
            severity: storm.severity,
            title: "Lightning / thunderstorm",
            message: `${storm.label} (weather code ${weather.weatherCode}) are reported near this location.`,
            location: place,
            recommendedAction: "Stay off exposed decks and delay departure until the storm has passed.",
            sources: ["Open-Meteo Weather"],
            mapPath: "/map?focus=hazard"
        }));
    }

    return alerts;
}

function generateUnavailableAlert({ id, sourceName, message, location }) {
    return makeAlert({
        id,
        type: "DATA_SOURCE_UNAVAILABLE",
        severity: "Low",
        title: `${sourceName} unavailable`,
        message,
        location,
        recommendedAction: "Continue with available sources and treat recommendations as lower confidence.",
        sources: [sourceName],
        mapPath: "/intelligence"
    });
}

function generateGisAlerts({ lat, lon, slicks = [], anomalies = [], imbl = null }) {
    const alerts = [];
    const place = locationLabel(lat, lon);

    slicks.forEach((slick) => {
        const slickPlace = locationLabel(slick.lat, slick.lng);
        alerts.push(makeAlert({
            id: `oil-slick-${slick.id}`,
            type: "OIL_SLICK",
            severity: Number(slick.confidence) >= 0.7 ? "High" : "Medium",
            title: "Oil slick detected",
            message: slick.suspected_vessel_id
                ? `A SAR oil-slick detection is correlated with vessel ${slick.suspected_vessel_id}.`
                : "A SAR oil-slick detection is present near this sector.",
            location: slickPlace,
            recommendedAction: "Avoid the slick area and report the hazard if you are nearby.",
            sources: ["GIS hazard detections"],
            mapPath: "/map?focus=hazard"
        }));
    });

    anomalies.forEach((anomaly, index) => {
        const loc = anomaly.location || {};
        alerts.push(makeAlert({
            id: `vessel-${anomaly.vesselId || index}-${anomaly.type || "activity"}`,
            type: "VESSEL_ACTIVITY",
            severity: anomaly.type === "ais_gap" ? "High" : "Medium",
            title: "Unusual vessel activity",
            message: anomaly.detail || "An AIS anomaly was flagged near this sector.",
            location: locationLabel(loc.lat, loc.lng),
            recommendedAction: "Review vessel activity on the map before approaching the area.",
            sources: ["GIS AIS screening"],
            mapPath: "/map?focus=vessel"
        }));
    });

    if (imbl && imbl.warning) {
        alerts.push(makeAlert({
            id: `imbl-${Number(lat).toFixed(2)}-${Number(lon).toFixed(2)}`,
            type: "IMBL",
            severity: imbl.escalated ? "High" : "Medium",
            title: imbl.escalated
                ? "IMBL escalation — sustained boundary proximity"
                : "IMBL proximity warning",
            message: imbl.escalated
                ? `Vessel has remained inside the IMBL buffer for ${Math.round(imbl.dwellSeconds || 0)} seconds.`
                : "The vessel is inside the IMBL buffer zone.",
            location: place,
            recommendedAction: "Change course and remain in safe operating waters.",
            sources: ["GIS IMBL check"],
            mapPath: "/map?focus=imbl"
        }));
    }

    return alerts;
}

module.exports = {
    generateConditionAlerts,
    generateUnavailableAlert,
    generateGisAlerts,
    WIND_MEDIUM_KMH,
    WIND_HIGH_KMH,
    WAVE_MEDIUM_M,
    WAVE_HIGH_M
};
