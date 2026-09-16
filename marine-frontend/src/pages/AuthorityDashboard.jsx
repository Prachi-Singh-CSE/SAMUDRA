import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  MapPin,
  Ship,
  ShieldAlert,
  Radio,
  Clock,
  Activity,
  CheckCircle,
<<<<<<< HEAD
  LogOut,
=======
>>>>>>> a9be354893841ff2595f723a7cdbaec5e7a1e3bc
} from "lucide-react";

import MarineLeafletMap from "../components/MarineLeafletMap";
import { useAppData } from "../state/useAppData";
<<<<<<< HEAD
import { useAuth } from "../state/useAuth";
=======
>>>>>>> a9be354893841ff2595f723a7cdbaec5e7a1e3bc
import "./AuthorityDashboard.css";

function AuthorityDashboard() {
  const navigate = useNavigate();
<<<<<<< HEAD
  const { logout } = useAuth();
=======
>>>>>>> a9be354893841ff2595f723a7cdbaec5e7a1e3bc

  const { state, acknowledgeAuthority } = useAppData();

  const {
    authorityAlerts,
    dataSources,
    sosEvents,
    imblEscalations,
    alerts: proactiveAlerts,
  } = state;

  const alerts = [
    ...authorityAlerts,

    ...proactiveAlerts
      .filter((alert) =>
        ["active", "read"].includes(alert.status)
      )
      .map((alert) => ({
        ...alert,
        type: alert.type,
        time: alert.timestamp,
        severity: alert.severity.toLowerCase(),
        status: alert.read ? "Read" : "Active",
      })),

    ...sosEvents.map((event) => ({
      ...event,
      title: "Emergency SOS Alert",
      type: "SOS",
      location: event.location
        ? event.location.join(", ")
        : "Location unavailable",
      time: event.createdAt,
      status: event.acknowledgementStatus,
      severity: event.severity.toLowerCase(),
    })),

    ...imblEscalations,
  ];

  const activeSOS = sosEvents.filter(
    (event) =>
      event.acknowledgementStatus !== "ACKNOWLEDGED"
  ).length;

  const activeEscalations = imblEscalations.filter(
    (event) => event.status !== "ACKNOWLEDGED"
  ).length;

  return (
    <div className="authority-page">
      <main className="authority-container">

        {/* ====================================================
            HEADER
        ==================================================== */}

        <section className="authority-header">
          <div>
            <div className="authority-eyebrow">
              <Activity size={16} />
              AUTHORITY CONTROL CENTER
            </div>

            <h1>Marine Intelligence Dashboard</h1>

            <p>
              Monitor demo emergency situations, maritime
              boundaries, hazards and marine intelligence.
            </p>
          </div>

<<<<<<< HEAD
          <div className="authority-header-actions">
            <div className="system-status">
              <span className="status-dot" />

              Demo systems · {dataSources.healthy}/
              {dataSources.total} sources healthy
            </div>

            <button
              className="authority-logout"
              onClick={() => {
                logout();
                navigate("/");
              }}
              title="Log out"
            >
              <LogOut size={15} />
              Log out
            </button>
=======
          <div className="system-status">
            <span className="status-dot" />

            Demo systems · {dataSources.healthy}/
            {dataSources.total} sources healthy
>>>>>>> a9be354893841ff2595f723a7cdbaec5e7a1e3bc
          </div>
        </section>

        {/* ====================================================
            STATS
        ==================================================== */}

        <section className="authority-stats">

          <div className="authority-stat-card critical">
            <div className="stat-icon">
              <ShieldAlert size={22} />
            </div>

            <div>
              <span>Active SOS</span>
              <strong>{activeSOS}</strong>
              <small>Requires attention</small>
            </div>
          </div>

          <div className="authority-stat-card warning">
            <div className="stat-icon">
              <AlertTriangle size={22} />
            </div>

            <div>
              <span>IMBL Escalations</span>
              <strong>{activeEscalations}</strong>
              <small>Last 24 hours</small>
            </div>
          </div>

          <div className="authority-stat-card">
            <div className="stat-icon">
              <Ship size={22} />
            </div>

            <div>
              <span>Vessels Monitored</span>
              <strong>128</strong>
              <small>Across active sectors</small>
            </div>
          </div>

          <div className="authority-stat-card">
            <div className="stat-icon">
              <Radio size={22} />
            </div>

            <div>
              <span>Data Sources</span>

              <strong>
                {dataSources.healthy}/{dataSources.total}
              </strong>

              <small>
                {dataSources.total - dataSources.healthy}{" "}
                source degraded
              </small>
            </div>
          </div>

        </section>

        {/* ====================================================
            MAIN GRID
        ==================================================== */}

        <section className="authority-grid">

          {/* ==================================================
              MARINE SITUATION MAP
          ================================================== */}

          <div className="authority-card map-card">

            <div className="card-heading">
              <div>
                <h2>Marine Situation · Demo</h2>

                <p>
                  Active incidents and monitored vessels
                </p>
              </div>

              <span className="live-badge">
                <span />
                DEMO
              </span>
            </div>

            <div className="authority-map">
              <MarineLeafletMap
                fishing={true}
                vesselsVisible={true}
                hazardsVisible={true}
                ocean={true}
                route={true}
              />
            </div>

            <div className="map-legend">

              <span>
                <i className="legend-sos" />
                SOS
              </span>

              <span>
                <i className="legend-vessel" />
                Vessel
              </span>

              <span>
                <i className="legend-pfz" />
                PFZ
              </span>

              <span>
                <i className="legend-risk" />
                Risk Zone
              </span>

              <span>
                <i className="legend-imbl" />
                IMBL
              </span>

            </div>

          </div>

          {/* ==================================================
              PRIORITY ALERTS
          ================================================== */}

          <div className="authority-card alerts-card">

            <div className="card-heading">

              <div>
                <h2>Priority Alerts</h2>

                <p>
                  Situations requiring authority attention
                </p>
              </div>

              <span className="alert-count">
                {alerts.length}
              </span>

            </div>

            <div className="authority-alert-list">

              {alerts.length === 0 ? (

                <div className="authority-empty-state">
                  <CheckCircle size={20} />

                  <span>
                    No active priority alerts.
                  </span>
                </div>

              ) : (

                alerts.map((alert) => (

                  <div
                    className={`authority-alert ${alert.severity}`}
                    key={alert.id}
                  >

                    <div className="alert-icon">

                      {alert.type === "SOS" ? (
                        <ShieldAlert size={20} />
                      ) : alert.type === "IMBL" ? (
                        <AlertTriangle size={20} />
                      ) : (
                        <Ship size={20} />
                      )}

                    </div>

                    <div className="alert-content">

                      <div className="alert-top">

                        <strong>
                          {alert.title}
                        </strong>

                        <span className="severity-label">
                          {alert.severity}
                        </span>

                      </div>

                      <div className="alert-meta">

                        <span>
                          <MapPin size={13} />
                          {alert.location}
                        </span>

                        <span>
                          <Clock size={13} />
                          {alert.time}
                        </span>

                        {alert.id && (
                          <span>
                            Incident {alert.id}
                          </span>
                        )}

                      </div>

                      <div className="alert-bottom">

                        <span className="alert-status">

                          {[
                            "Acknowledged",
                            "ACKNOWLEDGED",
                          ].includes(alert.status) && (
                            <CheckCircle size={14} />
                          )}

                          {alert.status}

                        </span>

                        {![
                          "Acknowledged",
                          "ACKNOWLEDGED",
                        ].includes(alert.status) && (

                          <button
                            type="button"
                            onClick={() =>
                              acknowledgeAuthority(
                                alert.id
                              )
                            }
                          >
                            Acknowledge
                          </button>

                        )}

                        {alert.type === "SOS" && (
                          <span className="alert-status">
                            NOT TRANSMITTED
                          </span>
                        )}

                        {alert.locationStatus && (
                          <span className="alert-status">
                            Location:{" "}
                            {alert.locationStatus}
                          </span>
                        )}

                        {alert.recommendedAction && (
                          <span className="alert-status">
                            Recommended:{" "}
                            {alert.recommendedAction}
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            navigate(
                              alert.mapPath ||
                                (alert.type === "IMBL"
                                  ? "/map?focus=imbl"
                                  : "/map?focus=hazard")
                            )
                          }
                        >
                          View Map
                        </button>

                      </div>

                    </div>

                  </div>

                ))

              )}

            </div>

            <button
              type="button"
              className="view-all-alerts"
              onClick={() => navigate("/alerts")}
            >
              View all alerts
            </button>

          </div>

        </section>

        {/* ====================================================
            LOWER GRID
        ==================================================== */}

        <section className="authority-lower-grid">

          {/* ==================================================
              IMBL MONITORING
          ================================================== */}

          <div className="authority-card">

            <div className="card-heading">

              <div>
                <h2>IMBL Boundary Monitoring</h2>
                <p>Recent boundary activity</p>
              </div>

              <ShieldAlert size={21} />

            </div>

            <div className="monitoring-row">

              <div>
                <strong>
                  {
                    authorityAlerts.filter(
                      (alert) => alert.type === "IMBL"
                    ).length +
                      imblEscalations.length
                  }
                </strong>

                <span>Warnings</span>
              </div>

              <div>
                <strong>
                  {activeEscalations}
                </strong>

                <span>Escalated</span>
              </div>

              <div>
                <strong>
                  {
                    imblEscalations.filter(
                      (event) =>
                        event.severity === "CRITICAL" &&
                        event.status !== "ACKNOWLEDGED"
                    ).length
                  }
                </strong>

                <span>Critical</span>
              </div>

            </div>

            <div className="progress-section">

              <div className="progress-label">
                <span>Boundary compliance</span>
                <strong>96%</strong>
              </div>

              <div className="progress-bar">
                <div style={{ width: "96%" }} />
              </div>

            </div>

          </div>

          {/* ==================================================
              DATA SOURCE HEALTH
          ================================================== */}

          <div className="authority-card">

            <div className="card-heading">

              <div>
                <h2>Data Source Health</h2>

                <p>
                  Current intelligence availability
                </p>
              </div>

              <Radio size={21} />

            </div>

            <div className="source-list">

              {dataSources.sources.map((source) => {

                const degraded =
                  source.status === "STALE" ||
                  source.status === "UNAVAILABLE";

                return (

                  <div
                    className={`source-row ${
                      degraded ? "degraded" : ""
                    }`}
                    key={source.id}
                  >

                    <span>

                      <i
                        className={
                          degraded
                            ? "source-warning"
                            : "source-online"
                        }
                      />

                      {source.name}

                    </span>

                    <strong>
                      {source.status}
                    </strong>

                    <small>
                      {source.lastUpdated} ·{" "}
                      {source.message}
                    </small>

                  </div>

                );

              })}

            </div>

          </div>

        </section>

      </main>
    </div>
  );
}

export default AuthorityDashboard;