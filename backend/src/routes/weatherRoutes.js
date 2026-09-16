const express = require("express");

const {
    getWeather
} = require("../controllers/weatherController");

const validateCoordinates = require("../middleware/validateCoordinates");


const router = express.Router();


router.get(
    "/",
    validateCoordinates,
    getWeather
);


module.exports = router;