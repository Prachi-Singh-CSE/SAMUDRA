const express = require("express");

const {
    getSubsurface
} = require("../controllers/subsurfaceController");

const validateCoordinates =
    require("../middleware/validateCoordinates");

const router = express.Router();

router.get(
    "/",
    validateCoordinates,
    getSubsurface
);

module.exports = router;