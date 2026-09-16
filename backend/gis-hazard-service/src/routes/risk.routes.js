const express = require('express');
const router = express.Router();
const riskService = require('../services/risk.service');

// GET /api/risk/score?lat=..&lng=..
router.get('/score', async (req, res, next) => {
  try {
    const { lat, lng } = req.query;
    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ error: 'lat and lng query params are required' });
    }
    const result = await riskService.computeMarineRiskScore({ lat: Number(lat), lng: Number(lng) });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
