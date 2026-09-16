const getIMDAlerts = async (lat, lon) => {
    try {
        const latitude = Number(lat);
        const longitude = Number(lon);

        // Validate coordinates
        if (
            !Number.isFinite(latitude) ||
            !Number.isFinite(longitude)
        ) {
            return {
                source: "IMD",
                dataStatus: "error",
                alerts: [],
                location: {
                    latitude,
                    longitude
                },
                message: "Invalid coordinates"
            };
        }

        const apiKey = process.env.IMD_API_KEY;

        // IMD access is not configured yet
        if (!apiKey) {
            return {
                source: "IMD",
                dataStatus: "unavailable",
                alerts: [],
                location: {
                    latitude,
                    longitude
                },
                alertTypes: [
                    "cyclone",
                    "lightning"
                ],
                message:
                    "IMD API key not configured"
            };
        }

        /*
         * Real IMD alert integration will be added here
         * after the official alert endpoint and API
         * authentication flow are configured.
         *
         * Expected alert format:
         *
         * {
         *   id,
         *   type,
         *   title,
         *   severity,
         *   description,
         *   issuedAt,
         *   expiresAt,
         *   location,
         *   source
         * }
         */

        return {
            source: "IMD",
            dataStatus: "unavailable",
            alerts: [],
            location: {
                latitude,
                longitude
            },
            alertTypes: [
                "cyclone",
                "lightning"
            ],
            message:
                "IMD alert endpoint not configured"
        };

    } catch (error) {

        console.error(
            "❌ IMD Alert Service Error:",
            error.message
        );

        return {
            source: "IMD",
            dataStatus: "error",
            alerts: [],
            location: {
                latitude: Number(lat),
                longitude: Number(lon)
            },
            message:
                "Unable to process IMD alerts"
        };
    }
};

module.exports = {
    getIMDAlerts
};