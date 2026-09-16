import { useNavigate } from "react-router-dom";
import MarineLeafletMap from "../components/MarineLeafletMap";
import IMBLSafetyWarning from "../components/IMBLSafetyWarning";
import { useAppData } from "../state/useAppData";
import { useLanguage } from "../state/useLanguage";
import {
  MapPin,
  Waves,
  Wind,
  Thermometer,
  AlertTriangle,
  ShieldCheck,
  Navigation,
  Fish,
  Clock,
  ArrowRight,
} from "lucide-react";

import Sidebar from "../components/Sidebar";
import "./Dashboard.css";

function Dashboard() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const {
    state,
    acknowledgeAlert,
    dismissAlert,
  } = useAppData();

  const {
    marine,
    risk,
    alerts,
    dataSources,
    routes,
    selectedRouteId,
  } = state;

  /*
   * Use the shared proactive alerts from AppDataContext.
   *
   * Only alerts that are currently active and not acknowledged
   * are shown in the Dashboard ACTIVE ALERTS panel.
   */
  const activeAlerts = alerts
    .filter(
      (alert) =>
        alert.status === "active" &&
        !alert.acknowledged
    )
    .sort((a, b) => {
      const priority = {
        SEVERE: 4,
        WARNING: 3,
        CAUTION: 2,
        INFO: 1,
      };

      return (
        (priority[b.severity] || 0) -
        (priority[a.severity] || 0)
      );
    });

  const routeList = Array.isArray(routes)
    ? routes
    : routes?.options || [];

  const selectedRoute =
    routeList.find((route) => route.id === selectedRouteId) ||
    routeList.find((route) => route.id === "safer") ||
    null;

  const routeConfidence = risk?.confidence?.score ?? 0;

  const riskLabel =
    risk?.severity ||
    (risk?.score >= 75
      ? "SEVERE"
      : risk?.score >= 50
      ? "HIGH"
      : risk?.score >= 25
      ? "MODERATE"
      : "LOW");

  const safetyStatus =
    riskLabel === "SEVERE"
      ? t("dashboard.safetyHighRisk")
      : riskLabel === "HIGH"
      ? t("dashboard.safetyCaution")
      : riskLabel === "MODERATE"
      ? t("dashboard.safetyCaution")
      : t("dashboard.safetySafe");

  /*
   * Decide where the alert's existing View button should go.
   *
   * Marine alerts:
   *   -> use their existing mapPath
   *
   * Data-source alerts:
   *   -> open Intelligence because they affect
   *      confidence/risk rather than a physical map location.
   */
  const getAlertAction = (alert) => {
    if (
      alert.type === "DATA_SOURCE_UNAVAILABLE" ||
      alert.type === "DATA_SOURCE_STALE"
    ) {
      return {
        label: t("dashboard.viewRisk"),
        path: "/intelligence",
      };
    }

    return {
      label: t("dashboard.view"),
      path: alert.mapPath || "/map",
    };
  };

  const handleAlertAction = (alert) => {
    const action = getAlertAction(alert);

    navigate(action.path);
  };

  return (
    <div className="dashboard-page">
      <Sidebar />

      <main className="dashboard-content">

        {/* Header */}
        <section className="dashboard-header">
          <div>
            <div className="dashboard-label">
              {t("dashboard.label")}
            </div>

            <h1>{t("dashboard.greeting")}</h1>

            <p>
              {t("dashboard.subtitle")}
            </p>
          </div>

          <div className="dashboard-location">
            <MapPin size={16} />

            <div>
              <span>{t("dashboard.yourLocation")}</span>

              <strong>
                Arabian Sea · Sector AR-14
              </strong>
            </div>
          </div>
        </section>

        {/* IMBL boundary warning */}
        <IMBLSafetyWarning />

        {/* Situation cards */}
        <section className="situation-grid">

          <WeatherCard
            icon={<Thermometer size={19} />}
            label={t("dashboard.seaTemperature")}
            value={marine.ocean.temperature}
            status={t("dashboard.statusNormal")}
          />

          <WeatherCard
            icon={<Wind size={19} />}
            label={t("dashboard.wind")}
            value={marine.ocean.wind}
            status={t("dashboard.statusWindModerate")}
          />

          <WeatherCard
            icon={<Waves size={19} />}
            label={t("dashboard.waveHeight")}
            value={marine.ocean.waveHeight}
            status={t("dashboard.statusModerate")}
          />

          <div className="safety-card">

            <div className="safety-top">
              <span>{t("dashboard.safetyScore")}</span>
              <ShieldCheck size={19} />
            </div>

            <div className="safety-score">
              {risk.score}
              <span>/100</span>
            </div>

            <div className="safety-status">
              <span></span>
              {safetyStatus}
            </div>

          </div>

        </section>

        {/* Degraded data state */}
        {dataSources.degraded && (
          <div
            className="dashboard-degraded-state"
            role="status"
          >
            <AlertTriangle size={14} />

            <span>
              {dataSources.message}
              {" "}
              {t("dashboard.degradedSuffix")}
            </span>
          </div>
        )}

        {/* Main dashboard */}
        <section className="dashboard-grid">

          {/* Marine map */}
          <div className="dashboard-panel map-panel">

            <div className="panel-header">

              <div>
                <div className="panel-label">
                  <Navigation size={13} />
                  {t("dashboard.marineMap")}
                </div>

                <h2>
                  {t("dashboard.currentOceanConditions")}
                </h2>
              </div>

              <button
                className="panel-button"
                onClick={() => navigate("/map")}
              >
                {t("dashboard.openMap")}
                <ArrowRight size={13} />
              </button>

            </div>

            <div className="dashboard-map">
              <MarineLeafletMap
                fishing={true}
                vesselsVisible={true}
                hazardsVisible={true}
                ocean={true}
                route={true}
              />
            </div>

          </div>

          {/* Alerts */}
          <div className="dashboard-panel alerts-panel">

            <div className="panel-header">

              <div>
                <div className="panel-label">
                  <AlertTriangle size={13} />
                  {t("dashboard.activeAlerts")}
                </div>

                <h2>
                  {t("dashboard.thingsToKnow")}
                </h2>
              </div>

              <span className="alert-count">
                {activeAlerts.length}
              </span>

            </div>

            {activeAlerts.length > 0 ? (

              activeAlerts
                .slice(0, 3)
                .map((alert) => {

                  const action =
                    getAlertAction(alert);

                  return (
                    <AlertItem
                      key={alert.id}

                      type={
                        alert.severity === "SEVERE"
                          ? "danger"
                          : alert.severity === "WARNING"
                          ? "warning"
                          : "caution"
                      }

                      title={alert.title}

                      description={alert.message}

                      time={
                        `${alert.severity} · ${alert.timestamp}`
                      }

                      onViewMap={() =>
                        handleAlertAction(alert)
                      }

                      onAcknowledge={() =>
                        acknowledgeAlert(alert.id)
                      }

                      onDismiss={() =>
                        dismissAlert(alert.id)
                      }

                      actionLabel={action.label}
                    />
                  );
                })

            ) : (

              <div className="dashboard-alert-empty">
                <ShieldCheck size={17} />

                <span>
                  {t("dashboard.noActiveAlerts")}
                </span>
              </div>

            )}

            <button
              className="view-alerts"
              onClick={() => navigate("/alerts")}
            >
              {t("dashboard.viewAllAlerts")}
              <ArrowRight size={13} />
            </button>

          </div>

        </section>

        {/* Bottom cards */}
        <section className="bottom-grid">

          <div className="dashboard-panel recommendation-panel">

            <div className="panel-label">
              <Fish size={13} />
              {t("dashboard.aiRecommendation")}
            </div>

            <h2>
              {t("dashboard.recommendationTitle")}
            </h2>

            <p>
              {t("dashboard.recommendationBody")}
            </p>

            <div className="recommendation-details">

              <div>
                <span>{t("dashboard.potential")}</span>
                <strong>{t("dashboard.potentialHigh")}</strong>
              </div>

              <div>
                <span>{t("dashboard.distance")}</span>
                <strong>18 km</strong>
              </div>

              <div>
                <span>{t("dashboard.confidence")}</span>
                <strong>{routeConfidence}%</strong>
              </div>

            </div>

            <button
              className="primary-dashboard-button"
              onClick={() => navigate("/fishing-zones")}
            >
              {t("dashboard.viewFishingZones")}
              <ArrowRight size={14} />
            </button>

          </div>

          <div className="dashboard-panel route-panel">

            <div className="panel-label">
              <Navigation size={13} />
              {t("dashboard.recommendedRoute")}
            </div>

            <h2>
              {selectedRoute?.name ||
                t("dashboard.defaultRouteName")}
            </h2>

            <div className="route-info">

              <div className="route-stat">
                <Clock size={15} />

                <div>
                  <span>{t("dashboard.estTime")}</span>
                  <strong>
                    {selectedRoute?.estimatedTime || "—"}
                  </strong>
                </div>
              </div>

              <div className="route-stat">
                <Navigation size={15} />

                <div>
                  <span>{t("dashboard.distance")}</span>
                  <strong>
                    {selectedRoute?.distanceKm != null
                      ? `${selectedRoute.distanceKm} km`
                      : "—"}
                  </strong>
                </div>
              </div>

            </div>

            <button
              className="secondary-dashboard-button"
              onClick={() => navigate("/routes")}
            >
              {t("dashboard.openRoutePlanner")}
              <ArrowRight size={14} />
            </button>

          </div>

        </section>

      </main>

    </div>
  );
}

/* ============================================================
   WEATHER CARD
============================================================ */

function WeatherCard({
  icon,
  label,
  value,
  status,
}) {
  return (
    <div className="weather-card">

      <div className="weather-icon">
        {icon}
      </div>

      <div className="weather-info">

        <span>{label}</span>

        <strong>{value}</strong>

        <small>{status}</small>

      </div>

    </div>
  );
}

/* ============================================================
   ALERT
============================================================ */

function AlertItem({
  type,
  title,
  description,
  time,
  onViewMap,
  onAcknowledge,
  onDismiss,
  actionLabel,
}) {
  const { t } = useLanguage();

  return (
    <div className={`alert-item ${type}`}>

      <div className="alert-icon">
        <AlertTriangle size={15} />
      </div>

      <div className="alert-text">

        <strong>
          {title}
        </strong>

        <p>
          {description}
        </p>

        <small>
          {time}
        </small>

        <div className="dashboard-alert-actions">

          <button
            type="button"
            onClick={onViewMap}
          >
            {actionLabel || t("dashboard.view")}
          </button>

          <button
            type="button"
            onClick={onAcknowledge}
          >
            {t("dashboard.acknowledge")}
          </button>

          <button
            type="button"
            onClick={onDismiss}
          >
            {t("dashboard.dismiss")}
          </button>

        </div>

      </div>

    </div>
  );
}

export default Dashboard;