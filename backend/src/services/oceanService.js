const { getCache, setCache } = require("./cacheService");
const { callPythonService } = require("./pythonService");

const getOceanData = async (lat, lon) => {
    try {
        const latitude = Number(lat);
        const longitude = Number(lon);

        const cacheKey = `ocean:${latitude}:${longitude}`;
        const cachedData = getCache(cacheKey);

        if (cachedData) {
            console.log("⚡ Ocean data served from cache");
            return cachedData;
        }

        const marineUrl =
            `https://marine-api.open-meteo.com/v1/marine` +
            `?latitude=${latitude}` +
            `&longitude=${longitude}` +
            `&current=sea_surface_temperature,wave_height,wave_period,wave_direction`;

        const response = await fetch(marineUrl);

        if (!response.ok) {
            throw new Error("Ocean API request failed");
        }

        const marine = await response.json();

        const result = {
            location: {
                latitude,
                longitude
            },

            ocean: {
                seaSurfaceTemperature:
                    marine.current?.sea_surface_temperature ?? null,

                waveHeight:
                    marine.current?.wave_height ?? null,

                wavePeriod:
                    marine.current?.wave_period ?? null,

                waveDirection:
                    marine.current?.wave_direction ?? null,

                chlorophyll: null
            },

            units: {
                seaSurfaceTemperature: "°C",
                waveHeight: "m",
                wavePeriod: "s",
                waveDirection: "°",
                chlorophyll: "mg/m³"
            },

            sources: [
                "Open-Meteo Marine"
            ],

            updatedAt: new Date().toISOString(),

            dataStatus: "live"
        };

        // Python Ocean Analysis
        try {
            const pythonResult = await callPythonService(
                "/ocean/process",
                {
                    seaSurfaceTemperature:
                        result.ocean.seaSurfaceTemperature,

                    waveHeight:
                        result.ocean.waveHeight,

                    chlorophyll:
                        result.ocean.chlorophyll
                },
                "POST"
            );

            result.pythonAnalysis = pythonResult;

        } catch (error) {
            console.error(
                "Python Ocean Service Error:",
                error.message
            );

            result.pythonAnalysis = {
                success: false,
                module: "ocean",
                condition: "UNKNOWN",
                score: null,
                message: "Python analysis service unavailable"
            };
        }

        setCache(cacheKey, result);

        return result;

    } catch (error) {
        console.error(
            "Ocean Service Error:",
            error.message
        );

        return {
            location: {
                latitude: Number(lat),
                longitude: Number(lon)
            },

            ocean: {
                seaSurfaceTemperature: 27.4,
                waveHeight: 1.9,
                wavePeriod: 7,
                waveDirection: null,
                chlorophyll: null
            },

            units: {
                seaSurfaceTemperature: "°C",
                waveHeight: "m",
                wavePeriod: "s",
                waveDirection: "°",
                chlorophyll: "mg/m³"
            },

            sources: [
                "Demo Fallback"
            ],

            updatedAt: new Date().toISOString(),

            dataStatus: "fallback",

            pythonAnalysis: {
                success: false,
                module: "ocean",
                condition: "UNKNOWN",
                score: null,
                message: "Ocean data unavailable"
            }
        };
    }
};

module.exports = {
    getOceanData
};