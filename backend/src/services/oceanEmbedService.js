const getOceanEmbedData = async (features) => {
    try {
        const modelUrl = process.env.OCEAN_EMBED_URL;

        // Model endpoint not configured yet
        if (!modelUrl) {
            return {
                model: "OceanEmbed",
                dataStatus: "unavailable",
                prediction: null,
                message:
                    "OceanEmbed model endpoint not configured"
            };
        }

        const response = await fetch(modelUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                latitude: features.latitude,
                longitude: features.longitude,

                surfaceData: {
                    seaSurfaceTemperature:
                        features.seaSurfaceTemperature,

                    seaSurfaceSalinity:
                        features.seaSurfaceSalinity,

                    seaLevelAnomaly:
                        features.seaLevelAnomaly,

                    currentU:
                        features.currentU,

                    currentV:
                        features.currentV,

                    windU:
                        features.windU,

                    windV:
                        features.windV
                }
            })
        });

        if (!response.ok) {
            throw new Error(
                `OceanEmbed HTTP ${response.status}`
            );
        }

        const data = await response.json();

        return {
            model: "OceanEmbed",
            dataStatus: "live",

            prediction: {
                temperature:
                    data.temperature ?? null,

                depths:
                    data.depths ?? null
            },

            retrievedAt:
                new Date().toISOString()
        };

    } catch (error) {

        console.error(
            "❌ OceanEmbed Service Error:",
            error.message
        );

        return {
            model: "OceanEmbed",
            dataStatus: "error",
            prediction: null,
            message: error.message
        };
    }
};

module.exports = {
    getOceanEmbedData
};