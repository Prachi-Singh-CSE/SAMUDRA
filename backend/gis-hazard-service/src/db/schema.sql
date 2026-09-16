-- Schema for Lavanya's GIS / Hazard / Risk / Emergency backend
-- Run once against your PostgreSQL + PostGIS database:
--   psql -d marine_intel -f src/db/schema.sql

CREATE EXTENSION IF NOT EXISTS postgis;

-- ---------------------------------------------------------------------
-- GIS layers: PFZ zones, restricted/protected boundaries, IMBL, harbors
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS pfz_zones (
  id SERIAL PRIMARY KEY,
  name TEXT,
  confidence NUMERIC,              -- passed downstream from Ocean Data Agent
  source TEXT DEFAULT 'ocean-data-agent',
  geom GEOMETRY(Polygon, 4326) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pfz_zones_geom ON pfz_zones USING GIST (geom);

CREATE TABLE IF NOT EXISTS restricted_zones (
  id SERIAL PRIMARY KEY,
  name TEXT,
  zone_type TEXT,                  -- e.g. 'marine_protected_area', 'naval_exercise'
  geom GEOMETRY(Polygon, 4326) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_restricted_zones_geom ON restricted_zones USING GIST (geom);

-- The IMBL boundary is static/slow-changing reference data (per project doc).
CREATE TABLE IF NOT EXISTS imbl_boundary (
  id SERIAL PRIMARY KEY,
  name TEXT DEFAULT 'International Maritime Boundary Line',
  source TEXT DEFAULT 'official-import',  -- provenance of the authoritative geometry (e.g. NHO/Survey of India)
  geom GEOMETRY(LineString, 4326) NOT NULL
);

CREATE TABLE IF NOT EXISTS safe_harbors (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  source TEXT DEFAULT 'official-import',
  geom GEOMETRY(Point, 4326) NOT NULL,
  capacity_notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_safe_harbors_geom ON safe_harbors USING GIST (geom);

-- ---------------------------------------------------------------------
-- Vessel tracking (AIS) — fed by an ingestion job hitting AISHub etc.
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS vessel_positions (
  id BIGSERIAL PRIMARY KEY,
  vessel_id TEXT NOT NULL,         -- MMSI or app user id for fishermen
  geom GEOMETRY(Point, 4326) NOT NULL,
  speed_knots NUMERIC,
  heading_deg NUMERIC,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vessel_positions_geom ON vessel_positions USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_vessel_positions_vessel_time ON vessel_positions (vessel_id, recorded_at DESC);

-- Tracks how long a vessel has continuously been inside the IMBL buffer,
-- so we can distinguish a brief drift from a sustained incursion.
CREATE TABLE IF NOT EXISTS imbl_dwell_tracking (
  vessel_id TEXT PRIMARY KEY,
  entered_buffer_at TIMESTAMPTZ,
  last_seen_in_buffer_at TIMESTAMPTZ,
  escalated BOOLEAN DEFAULT FALSE
);

-- ---------------------------------------------------------------------
-- Hazard detections (oil slicks from SAR, correlated with AIS)
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS hazard_detections (
  id SERIAL PRIMARY KEY,
  hazard_type TEXT DEFAULT 'oil_slick',
  geom GEOMETRY(Polygon, 4326) NOT NULL,
  detected_at TIMESTAMPTZ DEFAULT now(),
  confidence NUMERIC,
  sar_source TEXT DEFAULT 'sentinel-1',
  suspected_vessel_id TEXT,        -- filled in once AIS correlation runs
  correlation_confidence NUMERIC
);
CREATE INDEX IF NOT EXISTS idx_hazard_detections_geom ON hazard_detections USING GIST (geom);

-- ---------------------------------------------------------------------
-- Emergency / SOS alerts
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS sos_alerts (
  id SERIAL PRIMARY KEY,
  vessel_id TEXT NOT NULL,
  geom GEOMETRY(Point, 4326) NOT NULL,
  nearest_harbor_id INTEGER REFERENCES safe_harbors(id),
  alert_type TEXT DEFAULT 'manual_sos', -- 'manual_sos' | 'imbl_escalation'
  status TEXT DEFAULT 'sent',           -- 'sent' | 'acknowledged' | 'resolved'
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sos_alerts_geom ON sos_alerts USING GIST (geom);
