const { getOceanData } = require("../services/oceanService");
const { getWeatherData } = require("../services/weatherService");
const { getChlorophyllData } = require("../services/chlorophyllService");
const { checkDataHealth } = require("../utils/dataHealth");

const getPFZRecommendation = async (lat, lon) => {
    try {
        const latitude = Number(lat);
        const longitude = Number(lon);

        const [oceanData, weatherData, chlorophyllData] =
            await Promise.all([
                getOceanData(latitude, longitude),
                getWeatherData(latitude, longitude),
                getChlorophyllData(latitude, longitude)
            ]);

        let score = 50;

        // Ocean condition
        const sst =
            oceanData.ocean?.seaSurfaceTemperature;

        if (Number.isFinite(sst)) {
            if (sst >= 26 && sst < 31) {
                score += 20;
            } else if (sst >= 31) {
                score -= 10;
            }
        }

        // Wind condition
        const windSpeed =
            weatherData.weather?.windSpeed;

        if (Number.isFinite(windSpeed)) {
            if (windSpeed < 20) {
                score += 10;
            } else if (windSpeed > 30) {
                score -= 20;
            }
        }

        // Wave condition
        const waveHeight =
            oceanData.ocean?.waveHeight;

        if (Number.isFinite(waveHeight)) {
            if (waveHeight < 2) {
                score += 10;
            } else if (waveHeight > 3) {
                score -= 20;
            }
        }

        // Chlorophyll condition
        const chlorophyll =
            chlorophyllData.value;

        if (Number.isFinite(chlorophyll)) {
            if (chlorophyll >= 1) {
                score += 15;
            } else if (chlorophyll >= 0.5) {
                score += 8;
            } else if (chlorophyll < 0.2) {
                score -= 10;
            }
        }

        // Data freshness
        const health = checkDataHealth(
            oceanData.updatedAt
        );

        if (health.status === "AGING") {
            score -= 5;
        }

        if (health.status === "STALE") {
            score -= 15;
        }

        score = Math.max(0, Math.min(100, score));

        let recommendation = "MODERATE";

        if (score >= 80) {
            recommendation = "HIGH";
        } else if (score < 50) {
            recommendation = "LOW";
        }

        return {
            location: {
                latitude,
                longitude
            },

            recommendation,

            fishingPotential:
                recommendation === "HIGH"
                    ? "GOOD"
                    : recommendation === "MODERATE"
                    ? "MODERATE"
                    : "LOW",

            confidence: score,

            factors: {
                seaSurfaceTemperature: sst ?? null,
                windSpeed: windSpeed ?? null,
                waveHeight: waveHeight ?? null,
                chlorophyll: chlorophyll ?? null
            },

            chlorophyll: {
                value: chlorophyllData.value ?? null,
                unit: chlorophyllData.unit ?? "mg/m³",
                source: chlorophyllData.source ?? null,
                dataStatus:
                    chlorophyllData.dataStatus ?? "unknown"
            },

            ocean: oceanData,
            weather: weatherData,

            dataHealth: health,

            generatedAt: new Date().toISOString()
        };

    } catch (error) {
        console.error(
            "❌ PFZ Agent Error:",
            error.message
        );

        return {
            recommendation: "UNKNOWN",
            fishingPotential: "UNKNOWN",
            confidence: 0,
            dataStatus: "error",
            message: "PFZ recommendation temporarily unavailable"
        };
    }
};

module.exports = {
    getPFZRecommendation
};