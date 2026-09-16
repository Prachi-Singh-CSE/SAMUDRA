const express = require('express');
const router = express.Router();
const emergencyService = require('../services/emergency.service');

// POST /api/emergency/sos  { vesselId, lat, lng }
router.post('/sos', async (req, res, next) => {
  try {
    const { vesselId, lat, lng } = req.body;
    if (!vesselId || lat === undefined || lng === undefined) {
      return res.status(400).json({ error: 'vesselId, lat and lng are required' });
    }
    const alert = await emergencyService.triggerSOS({ vesselId, lat: Number(lat), lng: Number(lng) });
    res.status(201).json(alert);
  } catch (err) {
    next(err);
  }
});

// GET /api/emergency/alerts?sinceHours=24 -> for the authority dashboard's own polling/history view
router.get('/alerts', async (req, res, next) => {
  try {
    const sinceHours = req.query.sinceHours ? Number(req.query.sinceHours) : undefined;
    res.json(await emergencyService.getRecentAlerts({ sinceHours }));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
