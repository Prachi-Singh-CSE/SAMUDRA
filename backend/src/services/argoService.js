const axios = require("axios");

const ARGO_URL =
    "https://erddap.ifremer.fr/erddap/tabledap/ArgoFloats.csv";

const getArgoData = async (lat, lon) => {
    try {
        const latitude = Number(lat);
        const longitude = Number(lon);

        const latMin = latitude - 2;
        const latMax = latitude + 2;
        const lonMin = longitude - 2;
        const lonMax = longitude + 2;

        const query =
            `platform_number,cycle_number,latitude,longitude,time,pres,temp,psal` +
            `&latitude>=${latMin}` +
            `&latitude<=${latMax}` +
            `&longitude>=${lonMin}` +
            `&longitude<=${lonMax}`;

        const url = `${ARGO_URL}?${query}`;

        console.log("🌊 Argo request:", url);

        const response = await axios.get(url, {
            timeout: 20000,
            responseType: "text"
        });

        const text = response.data;

        console.log("📡 Argo response received");
        console.log("📦 Argo response size:", text.length);

        const lines = text
            .trim()
            .split("\n")
            .filter(Boolean);

        if (lines.length < 2) {
            return {
                location: {
                    latitude,
                    longitude
                },
                profiles: [],
                profileCount: 0,
                rawObservationCount: 0,
                source: "Argo Ifremer ERDDAP",
                dataStatus: "unavailable",
                message: "No nearby Argo observations found"
            };
        }

        const headers = lines[0]
            .split(",")
            .map(header => header.trim());

        const rows = lines.slice(1).map(line => {
            const values = line.split(",");
            const row = {};

            headers.forEach((header, index) => {
                row[header] = values[index] ?? null;
            });

            return row;
        });

        console.log(
            "✅ Argo rows parsed:",
            rows.length
        );

        // ------------------------------------
        // Convert observations
        // ------------------------------------

        const observations = rows
            .map(row => ({
                platformNumber:
                    row.platform_number,

                cycleNumber:
                    row.cycle_number,

                latitude:
                    Number(row.latitude),

                longitude:
                    Number(row.longitude),

                time:
                    row.time,

                depth:
                    Number(row.pres),

                temperature:
                    Number(row.temp),

                salinity:
                    Number(row.psal)
            }))
            .filter(obs =>
                obs.platformNumber &&
                obs.cycleNumber &&
                Number.isFinite(obs.latitude) &&
                Number.isFinite(obs.longitude) &&
                Number.isFinite(obs.depth) &&
                Number.isFinite(obs.temperature) &&
                Number.isFinite(obs.salinity)
            );

        // ------------------------------------
        // Fast no-data cutoff
        // ------------------------------------

        if (observations.length === 0) {
            return {
                location: {
                    latitude,
                    longitude
                },
                profiles: [],
                profileCount: 0,
                rawObservationCount: rows.length,
                source: "Argo Ifremer ERDDAP",
                dataStatus: "unavailable",
                message: "No valid Argo measurements found"
            };
        }

        // ------------------------------------
        // Group by FLOAT + CYCLE
        // ------------------------------------

        const profileGroups = new Map();

        observations.forEach(obs => {

            const profileKey =
                `${obs.platformNumber}_${obs.cycleNumber}`;

            if (!profileGroups.has(profileKey)) {
                profileGroups.set(profileKey, {
                    platformNumber:
                        obs.platformNumber,

                    cycleNumber:
                        obs.cycleNumber,

                    latitude:
                        obs.latitude,

                    longitude:
                        obs.longitude,

                    time:
                        obs.time,

                    observations: []
                });
            }

            profileGroups
                .get(profileKey)
                .observations
                .push(obs);
        });

        console.log(
            "🧩 Argo unique profiles:",
            profileGroups.size
        );

        // ------------------------------------
        // Find nearest profiles
        // ------------------------------------

        const profiles = Array.from(
            profileGroups.values()
        );

        profiles.forEach(profile => {

            profile.distance =
                Math.sqrt(
                    Math.pow(
                        profile.latitude -
                        latitude,
                        2
                    ) +
                    Math.pow(
                        profile.longitude -
                        longitude,
                        2
                    )
                );
        });

        profiles.sort(
            (a, b) =>
                a.distance - b.distance
        );

        // Keep nearest 5 complete profiles
        const selectedProfiles =
            profiles.slice(0, 5);

        // ------------------------------------
        // Convert each profile into
        // standard depth observations
        // ------------------------------------

        const standardDepths = [
            0,
            5,
            10,
            20,
            30,
            50,
            75,
            100,
            125,
            150,
            200,
            300,
            500,
            700,
            1000
        ];

        const processedProfiles =
            selectedProfiles.map(profile => {

                const observations =
                    profile.observations
                        .sort(
                            (a, b) =>
                                a.depth - b.depth
                        );

                const depthProfiles =
                    standardDepths.map(
                        targetDepth => {

                            let nearest =
                                null;

                            let smallestDifference =
                                Infinity;

                            observations.forEach(
                                obs => {

                                    const difference =
                                        Math.abs(
                                            obs.depth -
                                            targetDepth
                                        );

                                    if (
                                        difference <
                                        smallestDifference
                                    ) {
                                        nearest = obs;

                                        smallestDifference =
                                            difference;
                                    }
                                }
                            );

                            // Don't use an observation
                            // if it is too far from
                            // requested depth.
                            if (
                                !nearest ||
                                smallestDifference > 15
                            ) {
                                return {
                                    depth:
                                        targetDepth,

                                    temperature:
                                        null,

                                    salinity:
                                        null
                                };
                            }

                            return {
                                depth:
                                    targetDepth,

                                temperature:
                                    nearest.temperature,

                                salinity:
                                    nearest.salinity
                            };
                        }
                    );

                return {
                    platformNumber:
                        profile.platformNumber,

                    cycleNumber:
                        profile.cycleNumber,

                    latitude:
                        profile.latitude,

                    longitude:
                        profile.longitude,

                    time:
                        profile.time,

                    distance:
                        Number(
                            profile.distance.toFixed(3)
                        ),

                    depthProfiles
                };
            });

        return {
            location: {
                latitude,
                longitude
            },

            profiles:
                processedProfiles,

            profileCount:
                processedProfiles.length,

            rawObservationCount:
                rows.length,

            source:
                "Argo Ifremer ERDDAP",

            dataStatus:
                processedProfiles.length > 0
                    ? "live"
                    : "unavailable",

            retrievedAt:
                new Date().toISOString()
        };

    } catch (error) {

        console.error(
            "❌ Argo Service Error:",
            error.response?.data ||
            error.message
        );

        return {
            location: {
                latitude: Number(lat),
                longitude: Number(lon)
            },

            profiles: [],

            profileCount: 0,

            source:
                "Argo Ifremer ERDDAP",

            dataStatus:
                "error",

            message:
                error.response?.data ||
                error.message
        };
    }
};

module.exports = {
    getArgoData
};