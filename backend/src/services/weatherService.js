const { getIMDWeatherData } = require("./imdWeatherService");
const { getINCOISWeatherData } = require("./incoisWeatherService");
const { callPythonService } = require("./pythonService");
const {
    getCache,
    getStaleCache,
    setCache
} = require("./cacheService");
const { checkDataHealth } = require("../utils/dataHealth");


const getWeatherData = async (lat, lon) => {
    const latitude = Number(lat);
    const longitude = Number(lon);
    const cacheKey = `weather:${latitude}:${longitude}`;

    try {

        // =========================
        // COORDINATE VALIDATION
        // =========================

        if (
            !Number.isFinite(latitude) ||
            !Number.isFinite(longitude)
        ) {
            throw new Error(
                "Latitude and longitude must be valid numbers"
            );
        }

        if (latitude < -90 || latitude > 90) {
            throw new Error(
                "Latitude must be between -90 and 90"
            );
        }

        if (longitude < -180 || longitude > 180) {
            throw new Error(
                "Longitude must be between -180 and 180"
            );
        }



        // =========================
        // CACHE CHECK
        // =========================

        const cachedData = getCache(cacheKey);

        if (cachedData) {
            console.log("⚡ Weather data served from fresh cache");
            return cachedData;
        }


        // =========================
        // SOURCE DATA
        // =========================

        const [
            imdData,
            incoisData
        ] = await Promise.all([
            getIMDWeatherData(latitude, longitude),
            getINCOISWeatherData(latitude, longitude)
        ]);

        // =========================
        // LIVE WEATHER API
        // =========================

        const weatherUrl =
            `https://api.open-meteo.com/v1/forecast` +
            `?latitude=${latitude}` +
            `&longitude=${longitude}` +
            `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,weather_code` +
            `&wind_speed_unit=kmh`;

        // =========================
        // LIVE MARINE API
        // =========================

        const marineUrl =
            `https://marine-api.open-meteo.com/v1/marine` +
            `?latitude=${latitude}` +
            `&longitude=${longitude}` +
            `&current=wave_height,wave_period,wave_direction,sea_surface_temperature`;

        // =========================
        // API REQUESTS
        // =========================

        const [
            weatherResponse,
            marineResponse
        ] = await Promise.all([
            fetch(weatherUrl),
            fetch(marineUrl)
        ]);

        if (!weatherResponse.ok || !marineResponse.ok) {
            throw new Error("Live weather API request failed");
        }

        const weather = await weatherResponse.json();
        const marine = await marineResponse.json();

        // =========================
        // FORMAT RESPONSE
        // =========================

        const result = {
            location: {
                latitude,
                longitude
            },

            weather: {
                temperature:
                    weather.current?.temperature_2m ?? null,

                condition: "Live",

                windSpeed:
                    weather.current?.wind_speed_10m ?? null,

                windDirection:
                    weather.current?.wind_direction_10m ?? null,

                humidity:
                    weather.current?.relative_humidity_2m ?? null,

                weatherCode:
                    weather.current?.weather_code ?? null
            },

            ocean: {
                waveHeight:
                    marine.current?.wave_height ?? null,

                wavePeriod:
                    marine.current?.wave_period ?? null,

                waveDirection:
                    marine.current?.wave_direction ?? null,

                seaTemperature:
                    marine.current?.sea_surface_temperature ?? null
            },

            imd: imdData,

            incois: incoisData,

            sources: [
                "Open-Meteo Weather",
                "Open-Meteo Marine",
                "IMD",
                "INCOIS"
            ],

            updatedAt: new Date().toISOString(),
            dataStatus: "live",
            cacheStatus: "fresh"
        };

        // =========================
        // SAVE IN CACHE
        // =========================

        setCache(cacheKey, result);



        if (
            result.weather?.temperature == null &&
            result.weather?.windSpeed == null &&
            result.ocean?.waveHeight == null
        ) {
            result.pythonAnalysis = {
                success: false,
                module: "weather",
                safety: "UNKNOWN",
                score: null,
                message: "Insufficient weather data for safety analysis"
            };

            return result;
        }


        try {
            const pythonResult = await callPythonService(
                "/weather/process",
                {
                    temperature: result.weather?.temperature,
                    windSpeed: result.weather?.windSpeed,
                    waveHeight: result.ocean?.waveHeight
                },
                "POST"
            );

            result.pythonAnalysis = pythonResult;

        } catch (error) {
            console.error("Python Weather Service Error:", error.message);

            result.pythonAnalysis = {
                success: false,
                module: "weather",
                safety: "UNKNOWN",
                score: null,
                message: "Python analysis service unavailable"
            };
        }

        return result;


    }



    catch (error) {
        console.error(
            "Weather Service Error:",
            error.message
        );

        const staleCache = getStaleCache(cacheKey);

        if (staleCache) {
            console.log(
                `⚠️ Live API failed. Serving stale cache (${staleCache.ageMinutes} minutes old)`
            );

            const staleHealth = checkDataHealth(
                staleCache.data.updatedAt
            );

            return {
                ...staleCache.data,
                dataStatus: "stale",
                cacheStatus: "stale",
                staleAgeMinutes: staleCache.ageMinutes,
                dataHealth: {
                    ...staleHealth,
                    status: "STALE"
                },
                message: "Live weather unavailable. Showing cached data."
            };
        }


        // =========================
        // NO FAKE LIVE DATA
        // =========================

        return {
            location: {
                latitude,
                longitude
            },

            weather: {
                temperature: null,
                condition: null,
                windSpeed: null,
                windDirection: null,
                humidity: null,
                weatherCode: null
            },

            ocean: {
                waveHeight: null,
                wavePeriod: null,
                waveDirection: null,
                seaTemperature: null
            },

            sources: [],

            updatedAt: new Date().toISOString(),

            dataStatus: "error",

            message: "Weather data temporarily unavailable"
        };
    }
};

module.exports = {
    getWeatherData
};