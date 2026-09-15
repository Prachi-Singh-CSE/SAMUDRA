require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const gisRoutes = require('./routes/gis.routes');
const routeRoutes = require('./routes/route.routes');
const riskRoutes = require('./routes/risk.routes');
const hazardRoutes = require('./routes/hazard.routes');
const emergencyRoutes = require('./routes/emergency.routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'gis-hazard-risk-emergency-service', time: new Date().toISOString() });
});

// Lavanya's module: GIS, Route, Risk, Hazard, Emergency agents
app.use('/api/gis', gisRoutes);
app.use('/api/route', routeRoutes);
app.use('/api/risk', riskRoutes);
app.use('/api/hazard', hazardRoutes);
app.use('/api/emergency', emergencyRoutes);

app.use((req, res) => {
  res.status(404).json({ error: `No route for ${req.method} ${req.originalUrl}` });
});

app.use(errorHandler);

// Default 5001, not 5000: the main Node backend (backend/server.js) already
// defaults to 5000, and the frontend's gisApi client (marine-frontend/src/
// services/api.js) points at 5001 by default. Keeping this in sync avoids a
// silent port collision when both services are started with their defaults.
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`[gis-hazard-service] listening on port ${PORT}`);
});

module.exports = app;