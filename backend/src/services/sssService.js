const axios = require("axios");
const {
    getCache,
    getStaleCache,
    setCache
} = require("./cacheService");
const { checkDataHealth } = require("../utils/dataHealth");

const DATASET = "noaacwSMAPsssDaily";

const BASE_URL =
    `https://coastwatch.noaa.gov/erddap/griddap/${DATASET}.csv`;

const getSSSData = async (lat, lon) => {
    const latitude = Number(lat);
    const longitude = Number(lon);
    const cacheKey = `sss:${latitude}:${longitude}`;

    try {
        if (
            !Number.isFinite(latitude) ||
            !Number.isFinite(longitude)
        ) {
            throw new Error("Invalid coordinates");
        }

        // =========================
        // CACHE CHECK
        // =========================

        const cachedData = getCache(cacheKey);

        if (cachedData) {
            console.log("⚡ SSS data served from fresh cache");
            return cachedData;
        }

        /*
         * NOAA SMAP SSS:
         * 0.25° grid
         *
         * Search nearby grid cells because
         * satellite products can contain NaN
         * over individual cells.
         */

        const baseLat =
            Math.round(latitude * 4) / 4;

        const baseLon =
            Math.round(longitude * 4) / 4;

        const offsets = [
            [0, 0],
            [0, 1],
            [0, -1],
            [1, 0],
            [-1, 0],
            [1, 1],
            [1, -1],
            [-1, 1],
            [-1, -1]
        ];

        for (const [latOffset, lonOffset] of offsets) {

            const gridLat =
                baseLat + latOffset * 0.25;

            const gridLon =
                baseLon + lonOffset * 0.25;

            /*
             * ERDDAP's "(last)" keyword always resolves to the
             * most recent available timestep, so we no longer
             * need to hardcode a date here.
             */
            const query =
                `sss[(last)][(0)][(${gridLat})][(${gridLon})]`;

            const url =
                `${BASE_URL}?${encodeURIComponent(query)}`;

            console.log(
                "🌊 NOAA SSS request:",
                gridLat,
                gridLon
            );

            try {

                const response =
                    await axios.get(url, {
                        timeout: 10000,
                        responseType: "text"
                    });

                const text =
                    response.data;

                const lines =
                    text
                        .trim()
                        .split("\n")
                        .filter(Boolean);

                if (lines.length < 2) {
                    continue;
                }

                const headers =
                    lines[0]
                        .split(",")
                        .map(value => value.trim());

                const values =
                    lines[1]
                        .split(",")
                        .map(value => value.trim());

                const sssIndex =
                    headers.findIndex(
                        header =>
                            header.toLowerCase() === "sss"
                    );

                if (sssIndex === -1) {
                    continue;
                }

                const value =
                    Number(values[sssIndex]);

                /*
                 * Skip NaN / missing satellite cells.
                 */

                if (!Number.isFinite(value)) {
                    console.log(
                        "⚠️ Missing SSS at:",
                        gridLat,
                        gridLon
                    );

                    continue;
                }

                console.log(
                    "✅ Valid SSS found:",
                    value
                );

                const result = {
                    value:
                        Number(value.toFixed(3)),

                    unit:
                        "PSU",

                    source:
                        "NOAA SMAP",

                    dataStatus:
                        "live",

                    requestedLocation: {
                        latitude,
                        longitude
                    },

                    dataLocation: {
                        latitude: gridLat,
                        longitude: gridLon
                    },

                    retrievedAt:
                        new Date().toISOString()
                };

                setCache(cacheKey, result);

                return result;

            } catch (cellError) {

                console.log(
                    "⚠️ SSS cell unavailable:",
                    gridLat,
                    gridLon,
                    cellError.message
                );

                continue;
            }
        }

        /*
         * No valid nearby satellite cell found.
         * Fall back to stale cache before giving up.
         */

        const noCellStale = getStaleCache(cacheKey);

        if (noCellStale) {
            console.log(
                `⚠️ No live SSS cell found. Serving stale cache (${noCellStale.ageMinutes} minutes old)`
            );

            const staleHealth = checkDataHealth(
                noCellStale.data.retrievedAt
            );

            return {
                ...noCellStale.data,
                dataStatus: "stale",
                cacheStatus: "stale",
                staleAgeMinutes: noCellStale.ageMinutes,
                dataHealth: {
                    ...staleHealth,
                    status: "STALE"
                },
                message: "Live NOAA SMAP SSS unavailable. Showing cached data."
            };
        }

        return {
            value: null,

            unit:
                "PSU",

            source:
                "NOAA SMAP",

            dataStatus:
                "unavailable",

            requestedLocation: {
                latitude,
                longitude
            },

            reason:
                "No valid NOAA SMAP SSS value found in nearby grid cells",

            retrievedAt:
                new Date().toISOString()
        };

    } catch (error) {

        console.error(
            "❌ NOAA SSS Error:",
            error.message
        );

        const staleCache = getStaleCache(cacheKey);

        if (staleCache) {
            console.log(
                `⚠️ Live SSS call failed. Serving stale cache (${staleCache.ageMinutes} minutes old)`
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
                message: "Live NOAA SMAP SSS unavailable. Showing cached data."
            };
        }

        return {
            value: null,

            unit:
                "PSU",

            source:
                "NOAA SMAP",

            dataStatus:
                "error",

            reason:
                error.message,

            latitude:
                Number(lat),

            longitude:
                Number(lon)
        };
    }
};

module.exports = {
    getSSSData
};