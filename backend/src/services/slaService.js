const axios = require("axios");
const NetCDFReader = require("netcdfjs");
const {
    getCache,
    getStaleCache,
    setCache
} = require("./cacheService");
const { checkDataHealth } = require("../utils/dataHealth");

const COLLECTION_ID =
    "C3085229833-POCLOUD";

const HARMONY_URL =
    `https://harmony.earthdata.nasa.gov/` +
    `${COLLECTION_ID}/ogc-api-coverages/1.0.0/` +
    `collections/all/coverage/rangeset`;

const getSLAData = async (lat, lon) => {
    const latitude = Number(lat);
    const longitude = Number(lon);
    const cacheKey = `sla:${latitude}:${longitude}`;

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
            console.log("⚡ SLA data served from fresh cache");
            return cachedData;
        }

        const token =
            process.env.NASA_EARTHDATA_TOKEN;

        if (!token) {
            return {
                value: null,
                currentU: null,
                currentV: null,

                unit: "m",
                currentUnit: "m/s",

                source:
                    "NASA PO.DAAC NeurOST",

                dataStatus:
                    "unavailable",

                location: {
                    latitude,
                    longitude
                },

                dataset:
                    "NEUROST_SSH-SST_L4_V2024.0",

                message:
                    "NASA Earthdata token not configured"
            };
        }

        const delta = 0.05;

        const minLat =
            latitude - delta;

        const maxLat =
            latitude + delta;

        const minLon =
            longitude - delta;

        const maxLon =
            longitude + delta;

        const params = new URLSearchParams();

        params.append(
            "subset",
            `lat(${minLat}:${maxLat})`
        );

        params.append(
            "subset",
            `lon(${minLon}:${maxLon})`
        );

        params.append(
            "rangeSubset",
            "sla,ugos,vgos"
        );

        params.append(
            "maxResults",
            "1"
        );

        params.append(
            "format",
            "application/x-netcdf4"
        );

        const url =
            `${HARMONY_URL}?${params.toString()}`;

        console.log(
            "🌊 NASA NeurOST request:",
            url
        );

        const response =
            await axios.get(url, {
                headers: {
                    Authorization:
                        `Bearer ${token}`
                },

                responseType:
                    "arraybuffer",

                timeout: 30000
            });

        console.log(
            "📦 NASA NetCDF received:",
            response.data.byteLength,
            "bytes"
        );

        const reader =
            new NetCDFReader(response.data);

        const variables =
            reader.variables;

        console.log(
            "📊 NetCDF variables:",
            variables.map(
                variable => variable.name
            )
        );

        const slaVariable =
            reader.variables.find(
                variable =>
                    variable.name === "sla"
            );

        const uVariable =
            reader.variables.find(
                variable =>
                    variable.name === "ugos"
            );

        const vVariable =
            reader.variables.find(
                variable =>
                    variable.name === "vgos"
            );

        if (
            !slaVariable ||
            !uVariable ||
            !vVariable
        ) {
            throw new Error(
                "Required NeurOST variables not found"
            );
        }

        const slaValues =
            reader.getDataVariable(
                slaVariable
            );

        const uValues =
            reader.getDataVariable(
                uVariable
            );

        const vValues =
            reader.getDataVariable(
                vVariable
            );

        const sla =
            getFirstValidValue(slaValues);

        const currentU =
            getFirstValidValue(uValues);

        const currentV =
            getFirstValidValue(vValues);

        const result = {
            value: sla,

            currentU,

            currentV,

            unit: "m",

            currentUnit: "m/s",

            source:
                "NASA PO.DAAC NeurOST",

            dataStatus:
                "live",

            location: {
                latitude,
                longitude
            },

            dataset:
                "NEUROST_SSH-SST_L4_V2024.0",

            retrievedAt:
                new Date().toISOString()
        };

        setCache(cacheKey, result);

        return result;

    } catch (error) {
        console.error(
            "❌ NASA SLA Service Error:",
            error.message
        );

        const staleCache = getStaleCache(cacheKey);

        if (staleCache) {
            console.log(
                `⚠️ Live NASA SLA call failed. Serving stale cache (${staleCache.ageMinutes} minutes old)`
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
                message: "Live NASA SLA unavailable. Showing cached data."
            };
        }

        return {
            value: null,

            currentU: null,

            currentV: null,

            unit: "m",

            currentUnit: "m/s",

            source:
                "NASA PO.DAAC NeurOST",

            dataStatus:
                "error",

            location: {
                latitude: Number(lat),
                longitude: Number(lon)
            },

            dataset:
                "NEUROST_SSH-SST_L4_V2024.0",

            message:
                error.message
        };
    }
};


const getFirstValidValue = (values) => {

    if (!values) {
        return null;
    }

    for (const value of values) {

        const number =
            Number(value);

        if (
            Number.isFinite(number)
        ) {
            return number;
        }
    }

    return null;
};


module.exports = {
    getSLAData
};