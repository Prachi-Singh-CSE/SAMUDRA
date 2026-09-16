const { getSSSData } = require("../services/sssService");

const getSSS = async (req, res) => {
    try {
        const { lat, lon } = req.query;

        const data = await getSSSData(lat, lon);

        return res.status(200).json({
            success: true,
            data
        });

    } catch (error) {
        console.error(
            "SSS Controller Error:",
            error.message
        );

        return res.status(500).json({
            success: false,
            message: "Unable to fetch SSS data"
        });
    }
};

module.exports = {
    getSSS
};