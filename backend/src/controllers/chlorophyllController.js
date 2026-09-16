const {
    getChlorophyllData
} = require("../services/chlorophyllService");

const getChlorophyll = async (req, res) => {
    try {
        const { lat, lon } = req.query;

        const data =
            await getChlorophyllData(lat, lon);

        return res.status(200).json({
            success: true,
            data
        });

    } catch (error) {
        console.error(
            "Chlorophyll Controller Error:",
            error.message
        );

        return res.status(500).json({
            success: false,
            message: "Unable to fetch chlorophyll data"
        });
    }
};

module.exports = {
    getChlorophyll
};