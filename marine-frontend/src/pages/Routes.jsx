import { useState } from "react";
import {
  Navigation,
  Anchor,
  Shield,
  Sparkles,
  Clock3,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import MarineLeafletMap from "../components/MarineLeafletMap";
import Sidebar from "../components/Sidebar";
import { useAppData } from "../state/useAppData";
import "./Routes.css";

export default function Routes() {
  const { state, selectRoute } = useAppData();
  const selectedRoute = state.selectedRouteId;
  const routeOptions = state.routes.routes;
  const fastestRoute = routeOptions.find((route) => route.id === "fastest");
  const saferRoute = routeOptions.find((route) => route.id === "safer");
  const [showReasoning, setShowReasoning] = useState(true);

  const riskClass = (risk) =>
    risk === "LOW" ? "risk-low" : risk === "MODERATE" ? "risk-moderate" : "risk-high";

  return (
    <div className="routes-page">
      <Sidebar />

      <main className="routes-main">

        {/* TOP INFO */}
        <div className="routes-topbar">
          <div className="route-breadcrumb">
            <span>Current location</span>
            <span className="arrow">→</span>
            <span>{fastestRoute.destination} (planned destination)</span>
            <span className="arrow">→</span>
            <span>{saferRoute.destination}</span>
          </div>

          <span className="prepared-badge">
            {state.routeChangeReason
              ? `${state.routeChangeReason} / PREPARED DATA`
              : state.routes.mode === "live"
                ? "LIVE / PREPARED DATA"
                : "DEMO / PREPARED DATA"}
          </span>
        </div>

        <div className="routes-layout">

          {/* ================= MAP ================= */}
          <div className="route-map-panel">
  <MarineLeafletMap
    fishing={false}
    vesselsVisible={false}
    hazardsVisible={true}
    ocean={true}
    imbl={true}
    route={true}
  />
</div>

          {/* ================= RIGHT PANEL ================= */}
          <section className="routes-sidebar">

            {/* FASTEST ROUTE */}
            <div
              className={`route-card fastest-card ${
                    selectedRoute === fastestRoute.id ? "route-selected" : ""
              }`}
            >
              <div className="route-card-header">
                <div>
                  <div className="route-title-row">
                    <h2>FASTEST ROUTE</h2>
                    {fastestRoute.recommended && (
                      <span className="recommended">
                        ✓ RECOMMENDED
                      </span>
                    )}
                  </div>

                  <div className="route-meta">
                    <span>{fastestRoute.distanceKm} km</span>
                    <span>
                      <Clock3 size={13} />
                      {fastestRoute.duration}
                    </span>

                    <span>
                      Risk
                      <b className={riskClass(fastestRoute.risk)}>{fastestRoute.risk}</b>
                    </span>
                  </div>
                </div>

                <button
                  className="select-route-btn"
                  onClick={() => selectRoute(fastestRoute.id)}
                >
                  {selectedRoute === fastestRoute.id ? "Selected" : "Select"}
                </button>
              </div>

              <ul className="route-points danger-points">
                <li>
                  Crosses the 2.8 m high-wave zone for 11 km
                </li>
                <li>
                  Passes 4.2 km from the detected debris field
                </li>
              </ul>
            </div>

            {/* SAFER ROUTE */}
            <div
              className={`route-card safer-card ${
                    selectedRoute === saferRoute.id ? "route-selected" : ""
              }`}
            >
              <div className="route-card-header">
                <div>
                  <div className="route-title-row">
                    <h2>SAFER ROUTE</h2>
                    {saferRoute.recommended && (
                      <span className="recommended">
                        ✓ RECOMMENDED
                      </span>
                    )}
                  </div>

                  <div className="route-meta">
                    <span>{saferRoute.distanceKm} km</span>

                    <span>
                      <Clock3 size={13} />
                      {saferRoute.duration}
                    </span>

                    <span>
                      Risk
                      <b className={riskClass(saferRoute.risk)}>{saferRoute.risk}</b>
                    </span>
                  </div>
                </div>

                <button
                  className="selected-route-btn"
                  onClick={() => selectRoute(saferRoute.id)}
                >
                  {selectedRoute === saferRoute.id ? "Selected" : "Select"}
                </button>
              </div>

              <ul className="route-points safe-points">
                <li>
                  Avoids the high-wave zone entirely
                </li>
                <li>
                  Keeps 14 km clearance from the detected hazard
                </li>
                <li>
                  Stays within 22 km of a safe harbour at all times
                </li>
              </ul>
            </div>

            {/* WHY SAFER ROUTE */}
            <div className="reasoning-card">

              <div className="reasoning-header">
                <div className="reasoning-icon">
                  <Shield size={17} />
                </div>

                <h2>Why the safer route?</h2>
              </div>

              <p className="reasoning-description">
                Recommended because it avoids a high-wave zone
                and keeps greater distance from the detected hazard.
              </p>

              <button
                className="reasoning-toggle"
                onClick={() => setShowReasoning(!showReasoning)}
              >
                <span>
                  <Sparkles size={15} />
                  View reasoning
                </span>

                {showReasoning ? (
                  <ChevronUp size={15} />
                ) : (
                  <ChevronDown size={15} />
                )}
              </button>

              {showReasoning && (
                <div className="reasoning-content">

                  <div className="reasoning-point">
                    <span></span>
                    <p>
                      Fastest route crosses 11 km of a 2.8 m
                      wave field
                    </p>
                  </div>

                  <div className="reasoning-point">
                    <span></span>
                    <p>
                      Safer route keeps 14 km clearance from
                      the debris field
                    </p>
                  </div>

                  <div className="reasoning-point">
                    <span></span>
                    <p>
                      Only 12 extra minutes for a HIGH → LOW
                      risk change
                    </p>
                  </div>

                  <div className="reasoning-point">
                    <span></span>
                    <p>
                      Safer route stays within 22 km of a
                      harbour throughout
                    </p>
                  </div>

                  <div className="reasoning-point">
                    <span></span>
                    <p>
                      IMBL clearance improves from 1.8 km
                      to 6.4 km
                    </p>
                  </div>

                  <div className="reasoning-footer">

                    <div className="source-tags">
                      <span>INCOIS</span>
                      <span>IMD</span>
                      <span>OCEAN MODEL</span>
                      <span>GPS</span>
                    </div>

                    <div className="confidence">
                      <div className="confidence-label">
                        <span>CONFIDENCE</span>
                        <strong>89%</strong>
                      </div>

                      <div className="confidence-bar">
                        <div style={{ width: "89%" }}></div>
                      </div>
                    </div>

                  </div>

                </div>
              )}

            </div>

            {/* ACTIONS */}
            <div className="route-actions">

              <button className="start-navigation">
                <Navigation size={16} />
                Start Navigation
              </button>

              <button className="harbour-button">
                <Anchor size={16} />
                Nearest Safe Harbour
              </button>

            </div>

            {/* DATA SOURCES */}
            <div className="bottom-source-tags">
              <span>INCOIS</span>
              <span>IMD</span>
              <span>GPS</span>
            </div>

          </section>
        </div>
      </main>
    </div>
  );
}