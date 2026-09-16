const express = require('express');
const router = express.Router();
const gisService = require('../services/gis.service');

// GET /api/gis/status -> DB connectivity + whether reference layers are seeded
router.get('/status', async (req, res, next) => {
  try {
    const status = await gisService.getStatus();
    res.status(status.dbConnected ? 200 : 503).json(status);
  } catch (err) {
    next(err);
  }
});

// GET /api/gis/layers -> all layers combined (for initial map load)
router.get('/layers', async (req, res, next) => {
  try {
    const layers = await gisService.getAllLayers();
    res.json(layers);
  } catch (err) {
    next(err);
  }
});

router.get('/pfz-zones', async (req, res, next) => {
  try {
    res.json(await gisService.getPfzZonesGeoJSON());
  } catch (err) {
    next(err);
  }
});

router.get('/restricted-zones', async (req, res, next) => {
  try {
    res.json(await gisService.getRestrictedZonesGeoJSON());
  } catch (err) {
    next(err);
  }
});

router.get('/imbl-boundary', async (req, res, next) => {
  try {
    res.json(await gisService.getImblBoundaryGeoJSON());
  } catch (err) {
    next(err);
  }
});

router.get('/safe-harbors', async (req, res, next) => {
  try {
    res.json(await gisService.getSafeHarborsGeoJSON());
  } catch (err) {
    next(err);
  }
});

router.get('/hazards', async (req, res, next) => {
  try {
    const sinceHours = req.query.sinceHours ? Number(req.query.sinceHours) : undefined;
    res.json(await gisService.getHazardOverlayGeoJSON({ sinceHours }));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
