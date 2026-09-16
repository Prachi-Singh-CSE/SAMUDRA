const {
    getWeatherData
} = require("../services/weatherService");


const getWeatherSituation = async (lat, lon) => {

    const weatherData = await getWeatherData(lat, lon);

    let safetyScore = 100;
    let safetyStatus = "SAFE";

    const windSpeed = weatherData.weather.windSpeed;
    const waveHeight = weatherData.ocean.waveHeight;


    // Wind safety logic
    if (windSpeed > 30) {
        safetyScore -= 30;
    } else if (windSpeed > 20) {
        safetyScore -= 15;
    }


    // Wave safety logic
    if (waveHeight > 3) {
        safetyScore -= 30;
    } else if (waveHeight > 2) {
        safetyScore -= 15;
    }


    // Determine final status
    if (safetyScore < 60) {
        safetyStatus = "DANGER";
    } else if (safetyScore < 80) {
        safetyStatus = "CAUTION";
    }


    return {
        ...weatherData,

        safety: {
            score: safetyScore,
            status: safetyStatus
        }
    };
};


module.exports = {
    getWeatherSituation
};