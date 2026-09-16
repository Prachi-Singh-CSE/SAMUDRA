const axios = require("axios");
const { getWeatherData } = require("./weatherService");
const { applyStoredState } = require("./alertStateStore");
const {
    generateConditionAlerts,
    generateUnavailableAlert,
    generateGisAlerts
} = require("./alertGenerator");

function isUnavailable(status) {
    return status === "unavailable" || status === "error";
}

async function fetchGisSnapshot(lat, lon) {
    const base = (process.env.GIS_HAZARD_SERVICE_URL || "").trim();
    if (!base) {
        return { configured: false };
    }

    const snapshot = {
        configured: true,
        slicks: [],
        anomalies: [],
        imbl: null,
        feedError: null,
        imblError: null
    };

    try {
        const feed = await axios.get(`${base.replace(/\/$/, "")}/api/hazard/feed`, {
            timeout: 4000
        });
        snapshot.slicks = Array.isArray(feed.data?.sarConfirmedHazards)
            ? feed.data.sarConfirmedHazards
            : [];
        snapshot.anomalies = Array.isArray(feed.data?.aisAnomalies)
            ? feed.data.aisAnomalies
            : [];
    } catch (error) {
        snapshot.feedError = error.message;
    }

    try {
        const imblRes = await axios.post(
            `${base.replace(/\/$/, "")}/api/hazard/imbl-check`,
            {
                vesselId: process.env.IMBL_VESSEL_ID || "current-user",
                lat: Number(lat),
                lng: Number(lon)
            },
            { timeout: 4000 }
        );
        snapshot.imbl = imblRes.data;
    } catch (error) {
        snapshot.imblError = error.message;
    }

    return snapshot;
}

const getAlertData = async (lat, lon) => {
    const latitude = Number(lat);
    const longitude = Number(lon);
    const place = `${latitude.toFixed(2)}°N, ${longitude.toFixed(2)}°E`;

    try {
        const [weatherData, gis] = await Promise.all([
            getWeatherData(latitude, longitude),
            fetchGisSnapshot(latitude, longitude)
        ]);

        const alerts = [];

        if (weatherData.dataStatus === "error") {
            alerts.push(generateUnavailableAlert({
                id: "source-open-meteo",
                sourceName: "Open-Meteo Weather / Marine",
                message: weatherData.message || "Live weather and wave data could not be reached.",
                location: place
            }));
        } else {
            alerts.push(...generateConditionAlerts({
                lat: latitude,
                lon: longitude,
                weather: weatherData.weather || {},
                ocean: weatherData.ocean || {}
            }));
        }

        if (isUnavailable(weatherData.imd?.dataStatus)) {
            alerts.push(generateUnavailableAlert({
                id: "source-imd",
                sourceName: "IMD",
                message:
                    weatherData.imd?.message ||
                    "IMD cyclone and lightning alert feed is not available.",
                location: place
            }));
        }

        if (isUnavailable(weatherData.incois?.dataStatus)) {
            alerts.push(generateUnavailableAlert({
                id: "source-incois",
                sourceName: "INCOIS",
                message:
                    weatherData.incois?.message ||
                    "INCOIS marine alert feed is not available.",
                location: place
            }));
        }

        if (gis.configured && gis.feedError) {
            alerts.push(generateUnavailableAlert({
                id: "source-gis-hazards",
                sourceName: "GIS hazard feed",
                message: `Oil-slick and vessel-activity feed could not be reached: ${gis.feedError}`,
                location: place
            }));
        } else if (gis.configured) {
            alerts.push(...generateGisAlerts({
                lat: latitude,
                lon: longitude,
                slicks: gis.slicks,
                anomalies: gis.anomalies,
                imbl: gis.imbl
            }));
        }

        if (gis.configured && gis.imblError) {
            alerts.push(generateUnavailableAlert({
                id: "source-imbl",
                sourceName: "GIS IMBL check",
                message: `IMBL proximity check could not be completed: ${gis.imblError}`,
                location: place
            }));
        }

        const uniqueAlerts = Array.from(
            new Map(alerts.map((alert) => [alert.id, alert])).values()
        ).map(applyStoredState);

        const rank = { Low: 1, Medium: 2, High: 3 };
        uniqueAlerts.sort((a, b) => (rank[b.severity] || 0) - (rank[a.severity] || 0));

        const highestSeverity = uniqueAlerts.reduce((highest, alert) => {
            return (rank[alert.severity] || 0) > (rank[highest] || 0)
                ? alert.severity
                : highest;
        }, "Low");

        return {
            location: {
                latitude,
                longitude
            },
            alerts: uniqueAlerts,
            alertCount: uniqueAlerts.length,
            highestSeverity: uniqueAlerts.length ? highestSeverity : "NONE",
            cycloneTrackingAvailable: false,
            gisHazardsConfigured: Boolean(gis.configured),
            generatedAt: new Date().toISOString()
        };
    } catch (error) {
        console.error("❌ Alert Service Error:", error.message);

        const fallback = generateUnavailableAlert({
            id: "source-alert-engine",
            sourceName: "Alert engine",
            message: "Unable to generate marine alerts right now.",
            location: place
        });

        return {
            location: {
                latitude,
                longitude
            },
            alerts: [applyStoredState(fallback)],
            alertCount: 1,
            highestSeverity: "Low",
            cycloneTrackingAvailable: false,
            gisHazardsConfigured: false,
            generatedAt: new Date().toISOString(),
            dataStatus: "error"
        };
    }
};

module.exports = {
    getAlertData
};
