const {
    getSubsurfaceData
} = require("../services/subsurfaceService");

const getSubsurface = async (req, res) => {
    try {
        const { lat, lon } = req.query;

        const data = await getSubsurfaceData(lat, lon);

        return res.status(200).json({
            success: true,
            data
        });

    } catch (error) {
        console.error(
            "Subsurface Controller Error:",
            error.message
        );

        return res.status(500).json({
            success: false,
            message: "Unable to fetch subsurface data"
        });
    }
};

module.exports = {
    getSubsurface
};