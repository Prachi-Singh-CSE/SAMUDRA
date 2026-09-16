const express = require("express");
const router = express.Router();

const { callPythonService } = require("../services/pythonService");

router.get("/health", async (req, res) => {
    try {
        const data = await callPythonService(
            "/health",
            {},
            "GET"
        );

        res.json({
            success: true,
            nodeService: "connected",
            pythonService: data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Python service connection failed",
            error: error.message
        });
    }
});


router.post("/ocean", async (req, res) => {
    try {
        const data = await callPythonService(
            "/ocean/process",
            req.body,
            "POST"
        );

        res.json({
            success: true,
            nodeService: "connected",
            pythonService: data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Python ocean service failed",
            error: error.message
        });
    }
});


router.post("/weather", async (req, res) => {
    try {
        const { temperature, windSpeed, waveHeight } = req.body;

        if (
            temperature !== undefined &&
            typeof temperature !== "number"
        ) {
            return res.status(400).json({
                success: false,
                message: "Temperature must be a number"
            });
        }

        if (
            windSpeed !== undefined &&
            typeof windSpeed !== "number"
        ) {
            return res.status(400).json({
                success: false,
                message: "Wind speed must be a number"
            });
        }

        if (
            waveHeight !== undefined &&
            typeof waveHeight !== "number"
        ) {
            return res.status(400).json({
                success: false,
                message: "Wave height must be a number"
            });
        }

        const data = await callPythonService(
            "/weather/process",
            req.body,
            "POST"
        );

        res.json({
            success: true,
            nodeService: "connected",
            pythonService: data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Python weather service failed",
            error: error.message
        });
    }
});


module.exports = router;