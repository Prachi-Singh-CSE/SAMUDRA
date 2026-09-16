const express = require("express");

const {
    getPFZ
} = require("../controllers/pfzController");

const validateCoordinates =
    require("../middleware/validateCoordinates");


const router = express.Router();


router.get(
    "/",
    validateCoordinates,
    getPFZ
);


module.exports = router;