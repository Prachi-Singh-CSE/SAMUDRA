const validateCoordinates = (req, res, next) => {

    const lat = Number(req.query.lat);
    const lon = Number(req.query.lon);


    if (Number.isNaN(lat) || Number.isNaN(lon)) {
        return res.status(400).json({
            success: false,
            message: "Latitude and longitude must be numbers"
        });
    }


    if (lat < -90 || lat > 90) {
        return res.status(400).json({
            success: false,
            message: "Latitude must be between -90 and 90"
        });
    }


    if (lon < -180 || lon > 180) {
        return res.status(400).json({
            success: false,
            message: "Longitude must be between -180 and 180"
        });
    }


    next();
};


module.exports = validateCoordinates;