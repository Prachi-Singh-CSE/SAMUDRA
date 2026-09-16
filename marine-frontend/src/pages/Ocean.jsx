import { useState } from "react";
import { Waves, Thermometer, ChevronDown, Database } from "lucide-react";
import Sidebar from "../components/Sidebar";
import { useAppData } from "../state/useAppData";
import "./Ocean.css";

// ---------------------------------------------------------------
// Formatting helpers — show "—" instead of guessing when the
// backend hasn't returned a value.
// ---------------------------------------------------------------

function fmtNumber(value, digits = 1, unit = "") {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return "—";
  }
  return `${Number(value).toFixed(digits)}${unit}`;
}

// Turn a temperature into a visual bar width (30%-100%) relative to
// the warmest/coolest reading in the current profile, purely for the
// existing bar-chart look — this does not change or invent the value
// shown next to it.
function widthForTemperature(temp, min, max) {
  if (!Number.isFinite(temp) || !Number.isFinite(min) || !Number.isFinite(max) || max === min) {
    return "50%";
  }
  const ratio = (temp - min) / (max - min);
  const pct = 30 + ratio * 70;
  return `${Math.max(30, Math.min(100, pct)).toFixed(0)}%`;
}

export default function Ocean() {
  const [showReasoning, setShowReasoning] = useState(false);
  const { state } = useAppData();
  const { subsurface, sss, ocean, weather, loading, error } = state;

  // ---------------------------------------------------------------
  // Build the depth-profile table: row 0 is the live surface reading
  // (SST from /api/ocean or /api/weather, SSS from /api/sss). Rows
  // below come from /api/subsurface (Argo observations + OceanEmbed
  // model, already merged server-side).
  // ---------------------------------------------------------------

  const surfaceTemperature =
    ocean?.ocean?.seaSurfaceTemperature ?? weather?.ocean?.seaTemperature ?? null;

  const surfaceSalinity = sss?.value ?? null;

  const subsurfaceRows = Array.isArray(subsurface?.depthProfiles)
    ? subsurface.depthProfiles
    : [];

  const allTemps = [
    surfaceTemperature,
    ...subsurfaceRows.map((row) => Number(row.temperature)),
  ].filter((value) => Number.isFinite(value));

  const minTemp = allTemps.length ? Math.min(...allTemps) : null;
  const maxTemp = allTemps.length ? Math.max(...allTemps) : null;

  const profileData = [
    {
      key: "surface",
      depth: "Surface",
      temperature: fmtNumber(surfaceTemperature, 1, "°C"),
      salinity: fmtNumber(surfaceSalinity, 1, " PSU"),
      width: widthForTemperature(surfaceTemperature, minTemp, maxTemp),
    },
    ...subsurfaceRows.map((row, index) => ({
      key: `depth-${row.depth ?? index}`,
      depth: Number.isFinite(row.depth) ? `${row.depth} m` : `Row ${index + 1}`,
      temperature: fmtNumber(row.temperature, 1, "°C"),
      salinity: fmtNumber(row.salinity, 1, " PSU"),
      width: widthForTemperature(Number(row.temperature), minTemp, maxTemp),
    })),
  ];

  // Deepest available reading drives the right-hand "prediction" card,
  // same as the original design's 50 m example.
  const deepest = subsurfaceRows.length
    ? subsurfaceRows[subsurfaceRows.length - 1]
    : null;

  const correlation = subsurface?.validation?.temperature?.correlation;
  const validationStatus = subsurface?.validation?.status;
  const predictionConfidence =
    validationStatus === "ready" && Number.isFinite(correlation)
      ? `${Math.max(0, Math.min(100, correlation * 100)).toFixed(0)}%`
      : "—";

  const dataStatusLabel = error
    ? "OFFLINE — LAST KNOWN"
    : loading
    ? "LOADING…"
    : subsurface?.dataStatus
    ? subsurface.dataStatus.toUpperCase()
    : "—";

  return (
    <div className="samudra-ocean-page">

      <Sidebar />

      <div className="samudra-ocean-content">

        {/* HEADER */}

        <div className="samudra-ocean-header">

          <div className="samudra-ocean-heading">
            <h1>Ocean Intelligence</h1>

            <p>
              Below-surface temperature and salinity structure near your
              position. Rows below the surface come from Argo
              observations and the OceanEmbed model, not direct
              measurements.
            </p>
          </div>

          <div className="samudra-ocean-status">

            <span className="samudra-fresh">
              <span className="samudra-fresh-dot"></span>
              {dataStatusLabel}
            </span>

            <span className="samudra-updated">
              {subsurface?.location
                ? `Near ${subsurface.location.latitude.toFixed(2)}, ${subsurface.location.longitude.toFixed(2)}`
                : "Awaiting position"}
            </span>

            <span className="samudra-tag">
              AI PROTOTYPE
            </span>

            <span className="samudra-tag">
              OCEAN MODEL
            </span>

          </div>

        </div>


        {/* MAIN CONTENT */}

        <div className="samudra-ocean-layout">

          {/* LEFT SIDE */}

          <div className="samudra-profile-card">

            <div className="samudra-card-header">

              <div className="samudra-card-icon">
                <Waves size={15} />
              </div>

              <div>
                <h2>Vertical ocean profile</h2>
                <p>Select a depth to inspect conditions</p>
              </div>

            </div>


            <div className="samudra-profile-table">

              {profileData.map((item) => (
                <div
                  className="samudra-profile-row"
                  key={item.key}
                >

                  <div className="samudra-depth">
                    {item.depth}
                  </div>

                  <div className="samudra-profile-middle">

                    <div className="samudra-profile-values">
                      <span>{item.temperature}</span>
                      <span className="samudra-separator">·</span>
                      <span>{item.salinity}</span>
                    </div>

                    <div className="samudra-profile-track">
                      <div
                        className="samudra-profile-fill"
                        style={{
                          width: item.width,
                        }}
                      ></div>
                    </div>

                  </div>

                  <div
                    className={
                      item.key === "surface"
                        ? "samudra-type samudra-observed"
                        : "samudra-type samudra-prediction"
                    }
                  >
                    {item.key === "surface" ? "LIVE" : "ARGO / MODEL"}
                  </div>

                </div>
              ))}

              {profileData.length === 1 && (
                <p className="samudra-profile-note">
                  No subsurface depth profile is available for this
                  position yet.
                </p>
              )}

            </div>


            <p className="samudra-profile-note">
              Values below the surface are Argo observations and
              OceanEmbed model output, not direct measurements. Use
              alongside on-board observation.
            </p>

          </div>


          {/* RIGHT SIDE */}

          <div className="samudra-ocean-right">

            {/* DEPTH CARD */}

            <div className="samudra-prediction-card">

              <div className="samudra-prediction-header">

                <div className="samudra-prediction-title">

                  <div className="samudra-card-icon">
                    <Thermometer size={15} />
                  </div>

                  <div>
                    <h2>
                      Depth: {deepest && Number.isFinite(deepest.depth) ? `${deepest.depth} m` : "—"}
                    </h2>
                    <p>{subsurface?.source || "Argo / OceanEmbed"}</p>
                  </div>

                </div>

                <span className="samudra-prediction-label">
                  AI PREDICTION
                </span>

              </div>


              <div className="samudra-value-grid">

                <div className="samudra-value-box">
                  <span>TEMPERATURE</span>
                  <strong>{fmtNumber(deepest?.temperature, 1, "°C")}</strong>
                </div>

                <div className="samudra-value-box">
                  <span>SALINITY</span>
                  <strong>{fmtNumber(deepest?.salinity, 1, " PSU")}</strong>
                </div>

              </div>


              <div className="samudra-confidence">

                <div className="samudra-confidence-top">
                  <span>PREDICTION CONFIDENCE</span>
                  <strong>{predictionConfidence}</strong>
                </div>

                <div className="samudra-confidence-track">
                  <div
                    style={{
                      width:
                        predictionConfidence !== "—" ? predictionConfidence : "0%",
                    }}
                  ></div>
                </div>
              </div>


              <button
                className="samudra-reasoning-button"
                onClick={() =>
                  setShowReasoning(!showReasoning)
                }
              >

                <span>
                  <Waves size={12} />
                  How was this predicted?
                </span>

                <ChevronDown
                  size={13}
                  className={
                    showReasoning
                      ? "samudra-arrow-open"
                      : ""
                  }
                />

              </button>


              {showReasoning && (
                <div className="samudra-reasoning">

                  <p>
                    {subsurface?.message ||
                      "The model combines recent surface observations, Argo float profiles and OceanEmbed's current ocean-model output to estimate subsurface temperature and salinity."}
                  </p>

                  <div>
                    <span>Argo observations</span>
                    <strong>
                      {subsurface?.argo?.profileCount ?? 0} profile(s)
                    </strong>
                  </div>

                  <div>
                    <span>Matched depth points</span>
                    <strong>
                      {subsurface?.validation?.matchedObservations ?? 0}
                    </strong>
                  </div>

                  <div>
                    <span>OceanEmbed status</span>
                    <strong>
                      {subsurface?.oceanEmbed?.dataStatus || "unknown"}
                    </strong>
                  </div>

                </div>
              )}

            </div>


            {/* VALIDATION CARD — real RMSE/MAE/Bias from the backend,
                replacing the earlier fabricated 5-day chart which the
                API has no data to support. */}

            <div className="samudra-chart-card">

              <div className="samudra-chart-header">

                <div className="samudra-chart-icon">
                  <Database size={14} />
                </div>

                <div>
                  <h2>Model validation</h2>
                  <p>
                    OceanEmbed vs Argo, matched depth observations
                  </p>
                </div>

              </div>

              {subsurface?.validation?.status === "ready" ? (
                <div className="samudra-value-grid">
                  <div className="samudra-value-box">
                    <span>RMSE</span>
                    <strong>
                      {fmtNumber(subsurface.validation.temperature.RMSE, 2, "°C")}
                    </strong>
                  </div>

                  <div className="samudra-value-box">
                    <span>MAE</span>
                    <strong>
                      {fmtNumber(subsurface.validation.temperature.MAE, 2, "°C")}
                    </strong>
                  </div>

                  <div className="samudra-value-box">
                    <span>BIAS</span>
                    <strong>
                      {fmtNumber(subsurface.validation.temperature.Bias, 2, "°C")}
                    </strong>
                  </div>

                  <div className="samudra-value-box">
                    <span>CORRELATION</span>
                    <strong>
                      {fmtNumber(subsurface.validation.temperature.correlation, 2)}
                    </strong>
                  </div>
                </div>
              ) : (
                <p className="samudra-profile-note">
                  {subsurface?.validation?.message ||
                    "Validation pending — no matching Argo depth observations for this position yet."}
                </p>
              )}

              <div className="samudra-chart-sources">
                <span>ARGO</span>
                <span>OCEANEMBED</span>
              </div>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}