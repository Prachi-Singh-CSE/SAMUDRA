const express = require("express");

const {
    getChlorophyll
} = require("../controllers/chlorophyllController");

const validateCoordinates =
    require("../middleware/validateCoordinates");

const router = express.Router();

router.get(
    "/",
    validateCoordinates,
    getChlorophyll
);

module.exports = router;