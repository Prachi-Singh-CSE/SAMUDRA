const express = require("express");

const {
    getSSS
} = require("../controllers/sssController");

const validateCoordinates =
    require("../middleware/validateCoordinates");

const router = express.Router();

router.get(
    "/",
    validateCoordinates,
    getSSS
);

module.exports = router;