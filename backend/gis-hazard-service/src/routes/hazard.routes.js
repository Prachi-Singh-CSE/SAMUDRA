const express = require('express');
const router = express.Router();
const hazardService = require('../services/hazard.service');
const aisAnomalyService = require('../services/aisAnomaly.service');
const imblService = require('../services/imbl.service');

// GET /api/hazard/feed -> AIS anomalies + SAR-confirmed hazards, last 72h
router.get('/feed', async (req, res, next) => {
  try {
    res.json(await hazardService.getProactiveHazardFeed());
  } catch (err) {
    next(err);
  }
});

// GET /api/hazard/ais-anomalies?sinceHours=6
router.get('/ais-anomalies', async (req, res, next) => {
  try {
    const sinceHours = req.query.sinceHours ? Number(req.query.sinceHours) : undefined;
    res.json(await aisAnomalyService.screenVesselAnomalies({ sinceHours }));
  } catch (err) {
    next(err);
  }
});

// POST /api/hazard/correlate -> run SAR-slick <-> AIS-vessel correlation over unlinked detections
router.post('/correlate', async (req, res, next) => {
  try {
    res.json(await hazardService.correlateSlicksWithAIS());
  } catch (err) {
    next(err);
  }
});

// POST /api/hazard/sar-inference  { bbox, sceneDate } -> trigger Python SAR service (if configured)
router.post('/sar-inference', async (req, res, next) => {
  try {
    const { bbox, sceneDate } = req.body;
    res.json(await hazardService.requestSarInference({ bbox, sceneDate }));
  } catch (err) {
    next(err);
  }
});

// POST /api/hazard/imbl-check  { vesselId, lat, lng } -> call on every incoming position fix
router.post('/imbl-check', async (req, res, next) => {
  try {
    const { vesselId, lat, lng } = req.body;
    if (!vesselId || lat === undefined || lng === undefined) {
      return res.status(400).json({ error: 'vesselId, lat and lng are required' });
    }
    const result = await imblService.checkImblProximity({ vesselId, lat: Number(lat), lng: Number(lng) });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
