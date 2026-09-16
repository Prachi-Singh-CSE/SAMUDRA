const {
    getPFZRecommendation
} = require("../agents/pfzAgent");


const getPFZ = async (req, res) => {

    try {

        const {
            lat,
            lon
        } = req.query;


        const recommendation =
            await getPFZRecommendation(lat, lon);


        return res.status(200).json({
            success: true,
            data: recommendation
        });

    } catch (error) {

        console.error(
            "PFZ Controller Error:",
            error.message
        );


        return res.status(500).json({
            success: false,
            message: "Unable to generate PFZ recommendation"
        });
    }
};


module.exports = {
    getPFZ
};