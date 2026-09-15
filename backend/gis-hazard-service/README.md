# JalSetu — GIS, Hazard, Risk & Emergency Backend

Lavanya's module: **Node.js + Express + PostgreSQL/PostGIS**.

## What is implemented

- **GIS Agent**: PFZ, restricted zones, IMBL, safe harbors and hazard overlays as GeoJSON.
- **Route Agent**: nearest safe harbor and a blocker-aware heuristic route with collision checking.
- **Risk Agent**: 0–100 composite score using wave, wind, cyclone, lightning, hazard proximity and subsurface-confidence penalty. Upstream weather/ocean field aliases are normalized.
- **Hazard Agent**: AIS anomaly pre-screen, SAR inference adapter, persistence of SAR detections, and SAR↔AIS correlation.
- **Emergency/SOS**: GPS + nearest harbor persistence and authority-dashboard delivery status; IMBL dwell-time escalation uses the same delivery path.
- **Database**: complete PostGIS schema, spatial/time indexes and a GeoJSON importer for authoritative reference data.
- **Operational checks**: `/health` and `/api/gis/status`.

## Run locally

### 1. Start PostGIS

Docker is the simplest option:

```bash
docker compose up -d postgis
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

```bash
cp .env.example .env
```

Set the real values for the upstream services and authority receiver. Do **not** commit `.env` or API keys.

### 4. Create the schema

```bash
npm run db:init
```

### 5. Load authoritative GIS data

Do not fabricate an IMBL boundary. The importer accepts GeoJSON supplied by the team's approved authoritative source (e.g. NHO/Survey of India where applicable):

```bash
node scripts/import-geojson.js imbl path/to/imbl.geojson
node scripts/import-geojson.js harbors path/to/harbors.geojson
node scripts/import-geojson.js restricted path/to/restricted.geojson
node scripts/import-geojson.js pfz path/to/pfz.geojson
```

The importer supports `FeatureCollection`, `Feature`, and raw GeoJSON geometry.

### 6. Start service

```bash
npm start
# development:
npm run dev
```

Service: `http://localhost:5001`

## API

| Agent | Method | Endpoint | Purpose |
|---|---|---|---|
| Health | GET | `/health` | Process health |
| GIS | GET | `/api/gis/status` | DB/layer readiness |
| GIS | GET | `/api/gis/layers` | All map layers |
| GIS | GET | `/api/gis/pfz-zones` | PFZ GeoJSON |
| GIS | GET | `/api/gis/restricted-zones` | Restricted/protected GeoJSON |
| GIS | GET | `/api/gis/imbl-boundary` | IMBL GeoJSON |
| GIS | GET | `/api/gis/safe-harbors` | Harbor GeoJSON |
| GIS | GET | `/api/gis/hazards?sinceHours=72` | Recent hazards |
| Route | GET | `/api/route/nearest-harbor?lat=&lng=` | Nearest safe harbor |
| Route | POST | `/api/route/safe-route` | Avoid known blockers |
| Risk | GET | `/api/risk/score?lat=&lng=` | Composite marine risk |
| Hazard | GET | `/api/hazard/feed` | AIS + SAR hazard feed |
| Hazard | GET | `/api/hazard/ais-anomalies?sinceHours=6` | AIS anomaly screen |
| Hazard | POST | `/api/hazard/correlate` | SAR↔AIS correlation |
| Hazard | POST | `/api/hazard/sar-inference` | Trigger SAR service and persist returned detections |
| Hazard | POST | `/api/hazard/imbl-check` | IMBL proximity/dwell check |
| Emergency | POST | `/api/emergency/sos` | Create SOS + dashboard delivery |
| Emergency | GET | `/api/emergency/alerts?sinceHours=24` | Recent alerts |

## Risk contract

Preferred upstream response from Prachi's weather/ocean service:

```json
{
  "waveHeightM": 2.1,
  "windSpeedKts": 18,
  "cycloneDistanceKm": 120,
  "lightningRisk": 0.2,
  "subsurfaceConfidence": 0.82,
  "stale": false
}
```

The adapter also recognizes snake_case equivalents. Until the upstream service is actually connected, the service explicitly reports `dataStale: true` and marks the source as `default`; it does not present degraded values as live observations.

## Route limitation

The route implementation is a **demo-grade heuristic**: it checks the direct line against restricted/hazard polygons and searches multiple waypoint candidates until it finds a collision-free path. A true production marine route still needs a water-only routing graph/engine, as identified in the team backlog.

## SAR limitation

This service now has the integration and persistence side of SAR/U-Net. It does **not** contain a trained U-Net model. The Python service must return `detections` or `results` containing GeoJSON polygon geometry plus a `confidence` in `[0,1]`.

Example:

```json
{
  "detections": [
    {
      "geometry": {"type":"Polygon","coordinates":[...]},
      "confidence": 0.91,
      "source": "sentinel-1"
    }
  ]
}
```

## Authority dashboard limitation

The backend is ready to POST SOS/escalation payloads. The actual dashboard receiver URL and authentication credential must be supplied by the dashboard owner. If absent, alerts remain persisted in PostGIS and the API returns `dashboardDelivery.delivered: false`.

## Tests

```bash
npm test
```

Current unit tests cover the pure risk scoring/normalization functions. DB integration tests should be run after a PostGIS instance is available.

## Git / PR

```bash
git checkout -b lavanya-gis-backend
npm install
npm test
git add backend/gis-hazard-service
git commit -m "complete GIS hazard risk emergency backend"
git push origin lavanya-gis-backend
```

Then open the PR into Prachi's target branch.