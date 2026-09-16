import {
  Bell,
  AlertTriangle,
  Database,
  Compass,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import Sidebar from "../components/Sidebar";
import { useAppData } from "../state/useAppData";
import { useLanguage } from "../state/useLanguage";
import "./Alerts.css";

export default function Alerts() {
  const navigate = useNavigate();
  const { state, acknowledgeAlert, markAlertRead, dismissAlert, selectRoute, replayHazardPush } = useAppData();
  const { t } = useLanguage();
  const { imbl, alertsMeta } = state;
  const [filter, setFilter] = useState("All");
  const [replayed, setReplayed] = useState(false);

  const visibleAlerts = state.alerts.filter((alert) => {
    if (filter === "All") return alert.status !== "dismissed";
    if (filter === "Active") return ["active", "read"].includes(alert.status);
    if (filter === "Acknowledged") return alert.status === "acknowledged";
    if (filter === "Critical") return alert.severity === "CRITICAL";
    if (filter === "Warning") return alert.severity === "WARNING";
    if (filter === "Caution") return alert.severity === "CAUTION";
    return true;
  });

  const filterOptions = [
    { id: "All", label: t("alerts.filters.all") || "All" },
    { id: "Active", label: t("alerts.filters.active") || "Active" },
    { id: "Critical", label: t("alerts.filters.critical") || "Critical" },
    { id: "Warning", label: t("alerts.filters.warning") || "Warning" },
    { id: "Caution", label: t("alerts.filters.caution") || "Caution" },
    { id: "Acknowledged", label: t("alerts.filters.acknowledged") || "Acknowledged" },
  ];

  return (
    <div className="alerts-page">
      <Sidebar />

      <main className="alerts-main">

        {/* ================= HEADER ================= */}

        <div className="alerts-page-header">
          <div>
            <h1>{t("alerts.title")}</h1>
            <p>{t("alerts.subtitle")}</p>
          </div>

          {state.dataSources.degraded && (
            <div className="alerts-degraded-state" role="status">
              {state.dataSources.message} {t("dashboard.degradedSuffix")}
            </div>
          )}

          {alertsMeta?.dataStatus && alertsMeta.dataStatus !== "live" && (
            <div className="alerts-degraded-state" role="status">
              Alert feed status: {alertsMeta.dataStatus.toUpperCase()}
              {alertsMeta.safety?.message ? ` — ${alertsMeta.safety.message}` : ""}
            </div>
          )}

          <button
            className="replay-alert"
            onClick={() => {
              replayHazardPush();
              setReplayed(true);
              navigate("/dashboard");
            }}
          >
            <Bell size={15} />
            {replayed ? t("alerts.replayedPush") : t("alerts.replayPush")}
          </button>
        </div>

        {/* ================= SUMMARY ================= */}

        <div className="alert-summary">

          <div className="summary-box critical-summary">
            <span>{t("alerts.severity.critical")}</span>
            <strong>{state.alerts.filter((alert) => alert.severity === "CRITICAL").length}</strong>
          </div>

          <div className="summary-box warning-summary">
            <span>{t("alerts.severity.warning")}</span>
            <strong>{state.alerts.filter((alert) => alert.severity === "WARNING").length}</strong>
          </div>

          <div className="summary-box info-summary">
            <span>{t("alerts.severity.caution")}</span>
            <strong>{state.alerts.filter((alert) => alert.severity === "CAUTION").length}</strong>
          </div>

        </div>

        {/* ================= FEATURED ALERT ================= */}

        <section className="featured-alert">

          <div className="featured-alert-heading">

            <div className="featured-icon">
              <AlertTriangle size={20} />
            </div>

            <div>
              <div className="featured-type">
                {imbl.status}
              </div>

              <h2>IMBL Proximity Warning</h2>

              <p>
                {imbl.warning}
              </p>
            </div>

          </div>

          {/* DATA */}

          <div className="featured-data">

            <div>
              <span>{t("alerts.distanceToImbl")}</span>
              <strong>{imbl.distanceKm} km</strong>
            </div>

            <div>
              <span>{t("alerts.direction")}</span>
              <strong>South-west</strong>
            </div>

            <div>
              <span>STATUS</span>
              <strong className="orange-text">{imbl.status}</strong>
            </div>

          </div>

          {/* IMBL SCALE */}

          <div className="imbl-scale-section">

            <div className="scale-labels">
              <span>IMBL</span>
              <span>Safe waters (5 km +)</span>
            </div>

            <div className="imbl-scale">
              <div className="imbl-danger"></div>
              <div className="imbl-warning"></div>
              <div className="imbl-marker"></div>
            </div>

          </div>

          {/* ACTIONS */}

          <div className="featured-actions">

            <button className="return-safe" onClick={() => { selectRoute("safer", "IMBL safety"); navigate("/routes"); }}>
              <Compass size={15} />
              {t("alerts.returnSafeRoute")}
            </button>

            <button className="show-map" onClick={() => navigate("/map?focus=imbl")}>
              {t("alerts.showImblMap")}
            </button>

            <span className="simulate-text">
              Simulate vessel continuing
            </span>

          </div>

          {/* SOURCES */}

          <div className="featured-sources">
            <Database size={13} />

            <span>GPS</span>
            <span>SATELLITE</span>
          </div>

        </section>

        {/* ================= FILTERS ================= */}

        <div className="alert-filters">

          {filterOptions.map((item) => (
            <button
              className={`filter ${filter === item.id ? "active" : ""}`}
              key={item.id}
              onClick={() => setFilter(item.id)}
            >
              {item.label}
            </button>
          ))}

        </div>

        {/* ================= ALERT LIST ================= */}

        <section className="alert-list">
          {visibleAlerts.map((alert) => (
            <AlertRow
              key={alert.id}
              type={alert.severity}
              tag={alert.type}
              title={alert.title}
              description={alert.message}
              time={alert.timestamp}
              location={alert.location}
              confidence={`${state.risk.confidence.score}%`}
              sources={alert.sources}
              button={alert.type === "IMBL" ? t("alerts.viewImbl") : t("alerts.viewMap")}
              alertId={alert.id}
              alertState={alert}
              read={alert.read}
              t={t}
              onAcknowledge={acknowledgeAlert}
              onDismiss={dismissAlert}
              onAction={() => {
                markAlertRead(alert.id);
                navigate(alert.mapPath);
              }}
            />
          ))}
        </section>

      </main>
    </div>
  );
}


/* =====================================================
   ALERT ROW COMPONENT
   ===================================================== */

function AlertRow({
  type,
  tag,
  title,
  description,
  time,
  location,
  confidence,
  sources,
  button,
  critical = false,
  acknowledged = false,
  alertId,
  alertState,
  read = false,
  hidden = false,
  t,
  onAcknowledge,
  onDismiss,
  onAction,
}) {
  if (hidden) return null;

  const isAcknowledged = alertState?.status === "acknowledged" || acknowledged;
  const translatedType = t ? (t(`alerts.severity.${(type || "caution").toLowerCase()}`) || type) : type;

  return (
    <article className={`alert-row ${type.toLowerCase()}`}>

      <div className="row-main">

        <div className="row-title">

          <span className="status-dot"></span>

          <span className="row-type">
            {translatedType}
          </span>

          <span className="row-tag">
            {tag}
          </span>

          {!read && <span className="acknowledged">{t ? t("alerts.unread") : "UNREAD"}</span>}

          <h3>{title}</h3>

          {isAcknowledged && (
            <span className="acknowledged">
              ✓ {t ? t("alerts.acknowledged") : "Acknowledged"}
            </span>
          )}

        </div>

        <p className="row-description">
          {description}
        </p>

        <div className="row-meta">

          <span>{time}</span>

          <span>{location}</span>

          <Database size={13} />

          {sources.map((source) => (
            <span className="source" key={source}>
              {source}
            </span>
          ))}

        </div>

        <div className="row-confidence">

          <span>CONFIDENCE</span>

          <div className="row-progress">
            <div
              style={{
                width: confidence,
              }}
            ></div>
          </div>

          <strong>{confidence}</strong>

        </div>

      </div>

      <div className="row-actions">

        <button
          className={
            critical
              ? "row-primary critical-button"
              : "row-primary"
          }
          onClick={onAction}
        >
          {button}
        </button>

        <button
          className={`row-ack ${
            isAcknowledged ? "disabled-ack" : ""
          }`}
          onClick={() => alertId && onAcknowledge(alertId)}
          disabled={isAcknowledged}
        >
          {isAcknowledged ? (t ? t("alerts.acknowledged") : "Acknowledged") : (t ? t("alerts.acknowledge") : "Acknowledge")}
        </button>

        <button className="row-ack" onClick={() => onDismiss(alertId)}>
          {t ? t("alerts.dismiss") : "Dismiss"}
        </button>

      </div>

    </article>
  );
}