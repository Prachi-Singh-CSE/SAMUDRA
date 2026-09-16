const {
    getWeatherSituation
} = require("../agents/weatherAgent");


const getWeather = async (req, res) => {

    try {

        const {
            lat,
            lon
        } = req.query;


        const weatherData = await getWeatherSituation(
            lat,
            lon
        );


        return res.status(200).json({
            success: true,
            data: weatherData
        });

    } catch (error) {

        console.error(
            "Weather Controller Error:",
            error.message
        );


        return res.status(500).json({
            success: false,
            message: "Unable to fetch weather data"
        });
    }
};


module.exports = {
    getWeather
};