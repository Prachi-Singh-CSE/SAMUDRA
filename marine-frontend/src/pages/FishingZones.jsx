import {
  Waves,
  Thermometer,
  Wind,
  MapPin,
  Database,
  ChevronDown,
  Route,
} from "lucide-react";
import MarineLeafletMap from "../components/MarineLeafletMap";
import Sidebar from "../components/Sidebar";
import { useAppData } from "../state/useAppData";
import "./FishingZones.css";

// ---------------------------------------------------------------
// Formatting helpers — never fabricate a value; show "—" when the
// backend hasn't returned one instead of guessing.
// ---------------------------------------------------------------

function fmtNumber(value, digits = 1, unit = "") {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return "—";
  }
  return `${Number(value).toFixed(digits)}${unit}`;
}

function fmtCoord(position) {
  if (!Array.isArray(position) || position.length < 2) return "— , —";
  const [lat, lon] = position;
  const latDir = lat >= 0 ? "N" : "S";
  const lonDir = lon >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lon).toFixed(4)}° ${lonDir}`;
}

function uniqueSources(...lists) {
  const flat = lists.flat().filter(Boolean);
  return [...new Set(flat)];
}

function FishingZones() {
  const { state } = useAppData();
  const { pfz, chlorophyll, weather, ocean, location, loading, error } = state;

  // The PFZ agent scores ONE point (the user's current position) per
  // call, not multiple candidate zones — so only "Your Position" below
  // is live. Zones B/C stay as clearly-labelled demo comparisons until
  // a multi-point PFZ endpoint exists on the backend.
  const liveTemperature =
    weather?.weather?.temperature ?? pfz?.factors?.seaSurfaceTemperature ?? ocean?.ocean?.seaSurfaceTemperature;

  const liveWave = pfz?.factors?.waveHeight ?? ocean?.ocean?.waveHeight ?? weather?.ocean?.waveHeight;

  const liveChlorophyllValue = pfz?.chlorophyll?.value ?? chlorophyll?.value;
  const liveChlorophyllUnit = pfz?.chlorophyll?.unit ?? chlorophyll?.unit ?? "mg/m³";

  const livePotential = pfz?.fishingPotential ?? "—";
  const liveRecommendation = pfz?.recommendation ?? "—";
  const liveConfidence = pfz?.confidence != null ? `${pfz.confidence}%` : "—";

  const liveSources = uniqueSources(
    pfz?.ocean?.sources,
    pfz?.weather?.sources,
    weather?.sources,
    ocean?.sources
  );

  const dataStatusLabel =
    error ? "OFFLINE — LAST KNOWN" : loading ? "LOADING…" : pfz?.dataHealth?.status || "LIVE";

  return (
    <div className="zones-page">

      <Sidebar />

      <main className="zones-content">

        {/* Page heading */}
        <div className="zones-header">
          <div>
            <div className="page-label">
              <Waves size={14} />
              MARINE INTELLIGENCE
            </div>

            <h1>Fishing Zones</h1>

            <p>
              AI-ranked fishing zones based on ocean,
              weather and marine conditions.
            </p>
          </div>

          <div className="location-info">
            <MapPin size={15} />
            <span>Your location</span>
            <strong>{fmtCoord(location?.position)}</strong>
          </div>
        </div>


        {/* Main layout */}
        <div className="zones-layout">

          {/* LEFT — MAP */}
          <section className="zones-map-panel">

            <div className="map-toolbar">

              <button className="map-filter active">
                All Zones
              </button>

              <button className="map-filter">
                High Potential
              </button>

              <button className="map-filter">
                Safe Only
              </button>

            </div>

<div className="zones-map">
  <MarineLeafletMap
    fishing={true}
    vesselsVisible={false}
    hazardsVisible={false}
    ocean={false}
    imbl={false}
    route={false}
    safeOnly={true}
    highPotentialOnly={true}
  />
</div>

            <div className="map-footer">

              <span>
                Showing your live position plus 2 demo
                comparison zones
              </span>

              <div className="data-sources">
                <span>
                  <Database size={12} />
                  {dataStatusLabel}
                </span>

                {liveSources.length > 0 ? (
                  liveSources.map((source) => (
                    <span key={source}>{source}</span>
                  ))
                ) : (
                  <span>MOSDAC</span>
                )}
              </div>

            </div>

          </section>


          {/* RIGHT — ZONES */}
          <section className="zone-list">

            <div className="zone-list-header">

              <div>
                <div className="page-label">
                  TOP RECOMMENDATIONS
                </div>

                <h2>
                  Best fishing zones near you
                </h2>
              </div>

              <button className="sort-button">
                Best overall
                <ChevronDown size={14} />
              </button>

            </div>


            {/* Live zone — your current position */}
            <ZoneCard
              name="Your Position"
              distance="Live · current position"
              potential={livePotential}
              safety={liveRecommendation}
              confidence={liveConfidence}
              temperature={fmtNumber(liveTemperature, 1, "°C")}
              wave={fmtNumber(liveWave, 1, " m")}
              chlorophyll={
                liveChlorophyllValue != null
                  ? `${fmtNumber(liveChlorophyllValue, 2)} ${liveChlorophyllUnit}`
                  : "—"
              }
              best
            />


            {/* Why this position is ranked here */}
            <div className="why-card">

              <div className="why-header">
                <div>
                  <Waves size={15} />
                  Why this position is ranked here
                </div>

                <ChevronDown size={15} />
              </div>

              <ul>
                <li>
                  Sea surface temperature:{" "}
                  {fmtNumber(pfz?.factors?.seaSurfaceTemperature, 1, "°C")}
                </li>

                <li>
                  Wind speed: {fmtNumber(pfz?.factors?.windSpeed, 1, " km/h")}
                </li>

                <li>
                  Wave height: {fmtNumber(pfz?.factors?.waveHeight, 1, " m")}
                </li>

                <li>
                  Chlorophyll concentration:{" "}
                  {liveChlorophyllValue != null
                    ? `${fmtNumber(liveChlorophyllValue, 2)} ${liveChlorophyllUnit}`
                    : "—"}
                </li>

                <li>
                  Data freshness: {pfz?.dataHealth?.status || "—"}
                </li>
              </ul>

              <div className="confidence-row">
                <div>
                  <span>CONFIDENCE</span>
                  <strong>{liveConfidence}</strong>
                </div>

                <div className="confidence-bar">
                  <div
                    style={{
                      width: pfz?.confidence != null ? `${pfz.confidence}%` : "0%",
                    }}
                  ></div>
                </div>
              </div>

              <div className="source-row">
                {liveSources.length > 0 ? (
                  liveSources.map((source) => <span key={source}>{source}</span>)
                ) : (
                  <span>—</span>
                )}
              </div>

              <div className="zone-actions">

                <button className="view-route">
                  <Route size={15} />
                  View Route
                </button>

                <button className="show-map">
                  Show on map
                </button>

              </div>

            </div>


            {/* Zone B — demo comparison (backend doesn't yet score
                multiple candidate points in one call) */}
            <ZoneCard
              name="Zone B"
              distance="27 km away"
              potential="VERY HIGH"
              safety="LOW"
              confidence="84%"
              temperature="27.9°C"
              wave="3.1 m"
              chlorophyll="1.24 mg/m³ · high"
              demo
            />


            {/* Zone C — demo comparison */}
            <ZoneCard
              name="Zone C"
              distance="34 km away"
              potential="HIGH"
              safety="HIGH"
              confidence="79%"
              temperature="26.8°C"
              wave="1.6 m"
              chlorophyll="0.72 mg/m³"
              demo
            />

          </section>

        </div>

      </main>

    </div>
  );
}


/* ---------------- ZONE CARD ---------------- */

function ZoneCard({
  name,
  distance,
  potential,
  safety,
  confidence,
  temperature,
  wave,
  chlorophyll,
  best = false,
  demo = false,
}) {
  return (
    <div className={`zone-card ${best ? "best-zone" : ""}`}>

      <div className="zone-card-heading">

        <div className="zone-name">
          <span className="zone-icon">
            <Waves size={14} />
          </span>

          <strong>{name}</strong>

          {best && (
            <span className="best-badge">
              BEST OVERALL
            </span>
          )}

          {demo && (
            <span
              className="best-badge"
              style={{ background: "#3a4a55" }}
              title="Static comparison zone — not from a live backend call"
            >
              DEMO
            </span>
          )}
        </div>

        <span className="distance">
          {distance}
        </span>

      </div>


      <div className="zone-stats">

        <Stat
          label="POTENTIAL"
          value={potential}
          type="potential"
        />

        <Stat
          label="SAFETY"
          value={safety}
          type="safety"
        />

        <Stat
          label="CONFIDENCE"
          value={confidence}
          type="confidence"
        />

      </div>


      <div className="zone-weather">

        <span>
          <Thermometer size={13} />
          {temperature}
        </span>

        <span>
          <Waves size={13} />
          {wave}
        </span>

        <span>
          Chlorophyll {chlorophyll}
        </span>

      </div>

    </div>
  );
}


/* ---------------- STAT ---------------- */

function Stat({
  label,
  value,
  type,
}) {
  return (
    <div className="stat-box">

      <span>{label}</span>

      <strong className={`stat-${type}`}>
        {value}
      </strong>

    </div>
  );
}

export default FishingZones;