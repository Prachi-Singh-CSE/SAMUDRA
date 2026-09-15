const {
    getCache,
    getStaleCache,
    setCache
} = require("./cacheService");
const { checkDataHealth } = require("../utils/dataHealth");

const DATASET = "noaacwNPPN20VIIRSDINEOFDaily";

const NOAA_URL =
    `https://coastwatch.noaa.gov/erddap/griddap/${DATASET}.csv`;

const getChlorophyllData = async (lat, lon) => {
    const latitude = Number(lat);
    const longitude = Number(lon);
    const cacheKey = `chlorophyll:${latitude}:${longitude}`;

    try {
        // =========================
        // CACHE CHECK
        // =========================

        const cachedData = getCache(cacheKey);

        if (cachedData) {
            console.log("⚡ Chlorophyll data served from fresh cache");
            return cachedData;
        }

        // NOAA endpoint
        // NOTE: NOAA may be unavailable from local network.
        // We keep a fallback so PFZ does not break.

        const controller = new AbortController();

        const timeout = setTimeout(() => {
            controller.abort();
        }, 8000);

        /*
         * ERDDAP supports the special keyword "(last)" for the
         * time dimension, which always resolves to the most
         * recent timestep available in the dataset — so we no
         * longer need to hardcode a date.
         */
        const query =
            `chlor_a[(last)][(${latitude})][(${longitude})]`;

        const url =
            `${NOAA_URL}?${encodeURIComponent(query)}`;

        const response = await fetch(url, {
            signal: controller.signal
        });

        clearTimeout(timeout);

        if (!response.ok) {
            throw new Error(
                `NOAA HTTP ${response.status}`
            );
        }

        const text = await response.text();

        const lines = text
            .trim()
            .split("\n")
            .filter(Boolean);

        if (lines.length < 3) {
            throw new Error("No NOAA chlorophyll data");
        }

        const headers = lines[0].split(",");
        const values = lines[2].split(",");

        const chlorophyllIndex =
            headers.findIndex(
                h => h.trim() === "chlor_a"
            );

        const timeIndex =
            headers.findIndex(
                h => h.trim().startsWith("time")
            );

        if (chlorophyllIndex === -1) {
            throw new Error("chlor_a not found");
        }

        const value =
            Number(values[chlorophyllIndex]);

        if (!Number.isFinite(value)) {
            throw new Error("NOAA returned NaN");
        }

        // The actual timestamp ERDDAP resolved "(last)" to,
        // read back from the response instead of assumed.
        const resolvedDate =
            timeIndex !== -1
                ? values[timeIndex]?.trim()
                : null;

        const result = {
            value: Number(value.toFixed(3)),
            unit: "mg/m³",
            source: "NOAA CoastWatch VIIRS NRT DINEOF",
            dataStatus: "live",
            date: resolvedDate,
            retrievedAt: new Date().toISOString()
        };

        setCache(cacheKey, result);

        return result;

    } catch (error) {

        console.log(
            "⚠️ NOAA Chlorophyll unavailable:",
            error.message
        );

        const staleCache = getStaleCache(cacheKey);

        if (staleCache) {
            console.log(
                `⚠️ Live NOAA call failed. Serving stale cache (${staleCache.ageMinutes} minutes old)`
            );

            const staleHealth = checkDataHealth(
                staleCache.data.retrievedAt
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
                message: "Live NOAA chlorophyll unavailable. Showing cached data."
            };
        }

        // Safe fallback for development/demo
        return {
            value: 0.8,
            unit: "mg/m³",
            source: "Demo Fallback",
            dataStatus: "fallback",
            reason: "NOAA chlorophyll service unavailable",
            retrievedAt: new Date().toISOString()
        };
    }
};

module.exports = {
    getChlorophyllData
};