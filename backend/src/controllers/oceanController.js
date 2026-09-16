const {
    getOceanSituation
} = require("../agents/oceanAgent");


const getOcean = async (req, res) => {

    try {

        const {
            lat,
            lon
        } = req.query;


        const oceanData = await getOceanSituation(
            lat,
            lon
        );


        return res.status(200).json({
            success: true,
            data: oceanData
        });

    } catch (error) {

        console.error(
            "Ocean Controller Error:",
            error.message
        );


        return res.status(500).json({
            success: false,
            message: "Unable to fetch ocean data"
        });
    }
};


module.exports = {
    getOcean
};