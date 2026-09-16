const { getWeatherData } = require("./weatherService");
const { getOceanData } = require("./oceanService");
const { getSSSData } = require("./sssService");
const { getSLAData } = require("./slaService");

const getOceanModelInputs = async (lat, lon) => {
    try {
        const latitude = Number(lat);
        const longitude = Number(lon);

        const weatherData =
            await getWeatherData(latitude, longitude);

        const oceanData =
            await getOceanData(latitude, longitude);

        const sssData =
            await getSSSData(latitude, longitude);

        const slaData =
            await getSLAData(latitude, longitude);

        const temperature =
            oceanData.ocean?.seaSurfaceTemperature ?? null;

        const windSpeed =
            weatherData.weather?.windSpeed ?? null;

        const windDirection =
            weatherData.weather?.windDirection ?? null;

        // Convert wind speed + direction into U/V components
        let windU = null;
        let windV = null;

        if (
            Number.isFinite(windSpeed) &&
            Number.isFinite(windDirection)
        ) {
            const radians =
                windDirection * Math.PI / 180;

            windU =
                Number(
                    (windSpeed * Math.sin(radians))
                        .toFixed(3)
                );

            windV =
                Number(
                    (windSpeed * Math.cos(radians))
                        .toFixed(3)
                );
        }

        return {
            latitude,
            longitude,

            seaSurfaceTemperature:
                temperature,

            seaSurfaceSalinity:
                sssData.value,

            seaLevelAnomaly:
                slaData.value,

            currentU:
                slaData.currentU,

            currentV:
                slaData.currentV,

            windU,
            windV,

            source: {
                temperature:
                    "Open-Meteo Marine",

                wind:
                    "Open-Meteo Weather",

                SSS:
                    sssData.source,

                SLA:
                    slaData.source,

                currents:
                    slaData.source
            },

            dataStatus:
                temperature !== null ||
                    windU !== null ||
                    sssData.dataStatus === "live"
                    ? "partial"
                    : "unavailable",

            message:
                "SST, wind, SSS, SLA and surface current inputs connected where source data is available"
        };

    } catch (error) {

        console.error(
            "❌ Ocean Model Input Error:",
            error.message
        );

        return {
            latitude: Number(lat),
            longitude: Number(lon),
            dataStatus: "error",
            message: error.message
        };
    }
};

module.exports = {
    getOceanModelInputs
};