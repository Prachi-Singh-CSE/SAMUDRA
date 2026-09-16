const test = require('node:test');
const assert = require('node:assert/strict');
const risk = require('../src/services/risk.service');

test('risk sub-scores stay in 0..100', () => {
  assert.equal(risk.scoreWave(6), 100);
  assert.equal(risk.scoreWind(50), 100);
  assert.equal(risk.scoreCyclone(50), 100);
  assert.equal(risk.scoreCyclone(500), 0);
  assert.equal(risk.scoreLightning(1), 100);
  assert.equal(risk.scoreHazardProximity(2), 100);
  assert.equal(risk.scoreHazardProximity(30), 0);
  assert.equal(risk.scoreConfidencePenalty(1), 0);
});

test('weather/ocean contract normalizes common field aliases', () => {
  const x = risk.normalizeWeatherOceanContext({wave_height_m: 2, wind_speed_kts: 20, lightning_risk: 0.4, subsurface_confidence: 0.8});
  assert.deepEqual(x, {waveHeightM:2, windSpeedKts:20, cycloneDistanceKm:null, lightningRisk:0.4, subsurfaceConfidence:0.8, stale:false});
});
