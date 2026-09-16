const express = require("express");

const {
    getOcean
} = require("../controllers/oceanController");

const validateCoordinates = require("../middleware/validateCoordinates");


const router = express.Router();


router.get(
    "/",
    validateCoordinates,
    getOcean
);


module.exports = router;