const getINCOISAlerts = async (lat, lon) => {
    try {
        const latitude = Number(lat);
        const longitude = Number(lon);

        // Validate coordinates
        if (
            !Number.isFinite(latitude) ||
            !Number.isFinite(longitude)
        ) {
            return {
                source: "INCOIS SAMUDRA",
                dataStatus: "error",
                alerts: [],
                location: {
                    latitude,
                    longitude
                },
                message: "Invalid coordinates"
            };
        }

        /*
         * INCOIS SAMUDRA alert integration.
         *
         * Real-time INCOIS alert access will be connected
         * after the official service endpoint/access method
         * is configured.
         *
         * Expected alert types may include:
         * - Cyclone
         * - High waves
         * - Storm surge
         * - Tsunami
         * - Ocean hazards
         */

        return {
            source: "INCOIS SAMUDRA",
            dataStatus: "unavailable",
            alerts: [],
            location: {
                latitude,
                longitude
            },
            alertTypes: [
                "cyclone",
                "high_waves",
                "storm_surge",
                "tsunami",
                "ocean_hazards"
            ],
            message:
                "INCOIS SAMUDRA alert service not configured"
        };

    } catch (error) {

        console.error(
            "❌ INCOIS Alert Service Error:",
            error.message
        );

        return {
            source: "INCOIS SAMUDRA",
            dataStatus: "error",
            alerts: [],
            location: {
                latitude: Number(lat),
                longitude: Number(lon)
            },
            message:
                "Unable to process INCOIS alerts"
        };
    }
};

module.exports = {
    getINCOISAlerts
};