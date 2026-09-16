const { getArgoData } = require("./argoService");
const { getOceanModelInputs } = require("./oceanInputService");
const { getOceanEmbedData } = require("./oceanEmbedService");

const {
    calculateRMSE,
    calculateMAE,
    calculateBias,
    calculateCorrelation
} = require("../utils/validation");

const getSubsurfaceData = async (lat, lon) => {
    try {
        const latitude = Number(lat);
        const longitude = Number(lon);

        // --------------------------------------------------
        // 1. Get independent Argo observations
        // --------------------------------------------------
        const argoData = await getArgoData(
            latitude,
            longitude
        );

        // --------------------------------------------------
        // 2. Get surface inputs for OceanEmbed
        // --------------------------------------------------
        const modelInputs = await getOceanModelInputs(
            latitude,
            longitude
        );

        // --------------------------------------------------
        // 3. Send surface inputs to OceanEmbed
        // --------------------------------------------------
        const oceanEmbedData = await getOceanEmbedData(
            modelInputs
        );

        // --------------------------------------------------
        // 4. Select nearest Argo profile
        // --------------------------------------------------
        let depthProfiles = [];

        if (
            argoData &&
            Array.isArray(argoData.profiles) &&
            argoData.profiles.length > 0
        ) {
            const nearestProfile = argoData.profiles[0];

            if (Array.isArray(nearestProfile.depthProfiles)) {
                depthProfiles = nearestProfile.depthProfiles;
            }
        }

        // --------------------------------------------------
        // 5. Validation
        // Compare OceanEmbed predictions against
        // independent Argo observations
        // --------------------------------------------------

        let validation = {
            temperature: {
                RMSE: null,
                MAE: null,
                Bias: null,
                correlation: null
            },
            status: "pending",
            message:
                "OceanEmbed prediction unavailable for validation"
        };

        if (
            oceanEmbedData &&
            oceanEmbedData.dataStatus === "live" &&
            oceanEmbedData.prediction
        ) {
            const actual = [];
            const predicted = [];

            const prediction =
                oceanEmbedData.prediction;

            const predictedTemperatures =
                prediction.temperature;

            const predictedDepths =
                prediction.depths;

            // ----------------------------------------------
            // Case 1:
            // OceanEmbed returns:
            // temperature: [27.1, 26.9, 26.5]
            // depths:      [0, 10, 20]
            // ----------------------------------------------

            if (
                Array.isArray(predictedTemperatures) &&
                Array.isArray(predictedDepths)
            ) {
                depthProfiles.forEach((profile) => {
                    const actualTemperature =
                        Number(profile.temperature);

                    const actualDepth =
                        Number(profile.depth);

                    if (
                        !Number.isFinite(actualTemperature) ||
                        !Number.isFinite(actualDepth)
                    ) {
                        return;
                    }

                    const predictionIndex =
                        predictedDepths.findIndex(
                            (depth) =>
                                Number(depth) === actualDepth
                        );

                    if (predictionIndex === -1) {
                        return;
                    }

                    const predictedTemperature =
                        Number(
                            predictedTemperatures[
                                predictionIndex
                            ]
                        );

                    if (
                        !Number.isFinite(
                            predictedTemperature
                        )
                    ) {
                        return;
                    }

                    actual.push(actualTemperature);
                    predicted.push(
                        predictedTemperature
                    );
                });
            }

            // ----------------------------------------------
            // Case 2:
            // OceanEmbed returns:
            // temperature: {
            //   "0": 27.1,
            //   "10": 26.9,
            //   "20": 26.5
            // }
            // ----------------------------------------------

            else if (
                predictedTemperatures &&
                typeof predictedTemperatures === "object" &&
                !Array.isArray(predictedTemperatures)
            ) {
                depthProfiles.forEach((profile) => {
                    const actualTemperature =
                        Number(profile.temperature);

                    const actualDepth =
                        Number(profile.depth);

                    if (
                        !Number.isFinite(actualTemperature) ||
                        !Number.isFinite(actualDepth)
                    ) {
                        return;
                    }

                    const predictedTemperature =
                        Number(
                            predictedTemperatures[
                                actualDepth
                            ]
                        );

                    if (
                        !Number.isFinite(
                            predictedTemperature
                        )
                    ) {
                        return;
                    }

                    actual.push(actualTemperature);
                    predicted.push(
                        predictedTemperature
                    );
                });
            }

            // ----------------------------------------------
            // Calculate validation metrics
            // ----------------------------------------------

            if (actual.length > 0) {
                validation = {
                    temperature: {
                        RMSE: calculateRMSE(
                            actual,
                            predicted
                        ),

                        MAE: calculateMAE(
                            actual,
                            predicted
                        ),

                        Bias: calculateBias(
                            actual,
                            predicted
                        ),

                        correlation:
                            calculateCorrelation(
                                actual,
                                predicted
                            )
                    },

                    status: "ready",

                    matchedObservations:
                        actual.length,

                    message:
                        `Validation completed using ${actual.length} matched depth observations`
                };
            } else {
                validation = {
                    temperature: {
                        RMSE: null,
                        MAE: null,
                        Bias: null,
                        correlation: null
                    },

                    status: "pending",

                    matchedObservations: 0,

                    message:
                        "OceanEmbed is live but no matching Argo depth observations were found"
                };
            }
        }

        // --------------------------------------------------
        // 6. Determine overall data status
        // --------------------------------------------------

        let overallDataStatus = "partial";

        if (
            argoData?.dataStatus === "live" &&
            oceanEmbedData?.dataStatus === "live"
        ) {
            overallDataStatus = "live";
        } else if (
            argoData?.dataStatus === "error" &&
            oceanEmbedData?.dataStatus === "error"
        ) {
            overallDataStatus = "error";
        }

        // --------------------------------------------------
        // 7. Final response
        // --------------------------------------------------

        return {
            location: {
                latitude,
                longitude
            },

            depthProfiles,

            modelInputs: {
                seaSurfaceTemperature:
                    modelInputs.seaSurfaceTemperature ?? null,

                seaSurfaceSalinity:
                    modelInputs.seaSurfaceSalinity ?? null,

                seaLevelAnomaly:
                    modelInputs.seaLevelAnomaly ?? null,

                currentU:
                    modelInputs.currentU ?? null,

                currentV:
                    modelInputs.currentV ?? null,

                windU:
                    modelInputs.windU ?? null,

                windV:
                    modelInputs.windV ?? null,

                dataStatus:
                    modelInputs.dataStatus ?? "unknown"
            },

            argo: {
                source:
                    argoData?.source ?? "Argo",

                dataStatus:
                    argoData?.dataStatus ?? "unknown",

                rawObservationCount:
                    argoData?.rawObservationCount ?? 0,

                profileCount:
                    argoData?.profileCount ?? 0
            },

            oceanEmbed:
                oceanEmbedData,

            source:
                "Argo / OceanEmbed",

            dataStatus:
                overallDataStatus,

            message:
                oceanEmbedData?.dataStatus === "live"
                    ? "Subsurface temperature prediction generated by OceanEmbed and validated against Argo observations where depth matches are available"
                    : "Argo observations available; OceanEmbed model pending and some surface inputs may be unavailable",

            validation
        };
    } catch (error) {
        console.error(
            "❌ Subsurface Service Error:",
            error.message
        );

        return {
            location: {
                latitude: Number(lat),
                longitude: Number(lon)
            },

            depthProfiles: [],

            source:
                "Argo / OceanEmbed",

            dataStatus:
                "error",

            message:
                "Unable to process subsurface data",

            validation: {
                temperature: {
                    RMSE: null,
                    MAE: null,
                    Bias: null,
                    correlation: null
                },

                status:
                    "error",

                message:
                    error.message
            }
        };
    }
};

module.exports = {
    getSubsurfaceData
};