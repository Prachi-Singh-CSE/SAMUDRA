const getINCOISWeatherData = async (lat, lon) => {
    try {
        const latitude = Number(lat);
        const longitude = Number(lon);

        // INCOIS Ocean State Forecast requires
        // official service/data access.
        // Keep this service ready for integration.

        return {
            location: {
                latitude,
                longitude
            },

            ocean: {
                waveHeight: null,
                wavePeriod: null,
                windSpeed: null,
                windDirection: null,
                seaSurfaceTemperature: null
            },

            source: "INCOIS",
            dataStatus: "unavailable",
            message: "INCOIS live data access not configured"
        };

    } catch (error) {
        console.error(
            "INCOIS Weather Service Error:",
            error.message
        );

        return {
            location: {
                latitude: Number(lat),
                longitude: Number(lon)
            },
            source: "INCOIS",
            dataStatus: "error"
        };
    }
};

module.exports = {
    getINCOISWeatherData
};