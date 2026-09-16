import { useAppData } from "../state/useAppData";
import { Database, AlertTriangle, WifiOff } from "lucide-react";
import "./DataHealthBanner.css";

export default function DataHealthBanner() {
  const { state } = useAppData();
  const { dataSources, risk } = state;

  if (!dataSources) return null;

  const { degraded, unavailableCount, staleCount, confidenceLevel } =
    dataSources;

  if (!degraded) return null;

const isDemoDegraded =
  typeof globalThis !== "undefined" &&
  globalThis.__SAMUDRA_SHOW_DEGRADED__ === true;

if (!isDemoDegraded) return null;

  const unavailable = unavailableCount > 0;

  return (
    <div
      className={`data-health-banner ${
        unavailable ? "health-unavailable" : "health-stale"
      }`}
      role="status"
      aria-live="polite"
    >
      {unavailable ? (
        <WifiOff size={17} />
      ) : (
        <AlertTriangle size={17} />
      )}

      <div className="data-health-content">
        <strong>
          {unavailable
            ? "Some marine data is unavailable"
            : "Some marine data is outdated"}
        </strong>

        <span>
          {unavailable
            ? `${unavailableCount} source${
                unavailableCount === 1 ? "" : "s"
              } unavailable.`
            : `${staleCount} source${
                staleCount === 1 ? "" : "s"
              } may be outdated.`}{" "}
          Risk confidence: {confidenceLevel}.
        </span>
      </div>

      <div className="data-health-risk">
        <Database size={14} />
        {risk?.confidence?.score ?? 0}%
      </div>
    </div>
  );
}