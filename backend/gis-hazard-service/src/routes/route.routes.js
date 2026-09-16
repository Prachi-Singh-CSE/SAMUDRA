const express = require('express');
const router = express.Router();
const routeService = require('../services/route.service');

// GET /api/route/nearest-harbor?lat=..&lng=..
router.get('/nearest-harbor', async (req, res, next) => {
  try {
    const { lat, lng } = req.query;
    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ error: 'lat and lng query params are required' });
    }
    const result = await routeService.findNearestSafeHarbor({ lat: Number(lat), lng: Number(lng) });
    if (!result) return res.status(404).json({ error: 'No safe harbors found in database' });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/route/safe-route  { origin: {lat,lng}, destination: {lat,lng} }
router.post('/safe-route', async (req, res, next) => {
  try {
    const { origin, destination } = req.body;
    if (!origin || !destination) {
      return res.status(400).json({ error: 'origin and destination ({lat,lng}) are required' });
    }
    const result = await routeService.suggestSafeRoute({ origin, destination });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
