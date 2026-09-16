const express = require("express");
const cors = require("cors");


require("dotenv").config();

const sssRoutes =
    require("./routes/sssRoutes");
const errorHandler = require("./middleware/errorHandler");
const weatherRoutes = require("./routes/weatherRoutes");
const oceanRoutes = require("./routes/oceanRoutes");
const pfzRoutes = require("./routes/pfzRoutes");
const chlorophyllRoutes =
    require("./routes/chlorophyllRoutes");
const alertRoutes = require("./routes/alertRoutes");
const subsurfaceRoutes =
    require("./routes/subsurfaceRoutes");
const pythonRoutes = require("./routes/pythonRoutes");


const app = express();


// =========================
// Middleware
// =========================

app.use(cors());

app.use(express.json());


// =========================
// Health / Test Route
// =========================

app.get("/", (req, res) => {

    res.status(200).json({
        success: true,
        message: "Marine Intelligence API is running 🌊"
    });

});


// =========================
// Weather Routes
// =========================

app.use(
    "/api/weather",
    weatherRoutes
);



// =========================
// Ocean Routes
// =========================

app.use(
    "/api/ocean",
    oceanRoutes
);

// =========================
// PFZ Routes
// =========================

app.use(
    "/api/pfz",
    pfzRoutes
);

// =========================
// chlorophyll Routes
// =========================


app.use(
    "/api/chlorophyll",
    chlorophyllRoutes
);

// =========================
// alerts Routes
// =========================


app.use(
    "/api/alerts",
     alertRoutes
);

// =========================
// subsurface Routes
// =========================


app.use(
    "/api/subsurface",
    subsurfaceRoutes
);

// sss route 

app.use(
    "/api/sss",
    sssRoutes
);

// python route 
app.use(
    "/api/python",
    pythonRoutes
    );

// =========================
// 404 Route
// =========================

app.use((req, res) => {

    res.status(404).json({
        success: false,
        message: "Route not found"
    });

});

// =========================
// Global Error Handler
// =========================

app.use(errorHandler);


module.exports = app;