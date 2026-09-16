const getIMDWeatherData = async (lat, lon) => {
    try {
        const latitude = Number(lat);
        const longitude = Number(lon);

        // IMD API requires a registered API access setup.
        // Until credentials are available, return unavailable status.

        return {
            location: {
                latitude,
                longitude
            },

            weather: {
                temperature: null,
                windSpeed: null,
                windDirection: null,
                humidity: null
            },

            source: "IMD",
            dataStatus: "unavailable",
            message: "IMD API access requires registered credentials"
        };

    } catch (error) {
        console.error(
            "IMD Weather Service Error:",
            error.message
        );

        return {
            location: {
                latitude: Number(lat),
                longitude: Number(lon)
            },
            source: "IMD",
            dataStatus: "error"
        };
    }
};

module.exports = {
    getIMDWeatherData
};