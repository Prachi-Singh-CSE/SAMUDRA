const express = require("express");

const {
    getAlerts,
    acknowledgeAlert,
    markAlertRead,
    dismissAlert
} = require("../controllers/alertController");

const validateCoordinates =
    require("../middleware/validateCoordinates");

const router = express.Router();

router.patch("/:id/acknowledge", acknowledgeAlert);
router.patch("/:id/read", markAlertRead);
router.patch("/:id/dismiss", dismissAlert);

router.get(
    "/",
    validateCoordinates,
    getAlerts
);

module.exports = router;
