import { AlertTriangle, Compass, MapPinned, Radio, Timer } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppData } from "../state/useAppData";
import { IMBL_DWELL_THRESHOLD_SECONDS } from "../services";
import "./IMBLSafetyWarning.css";

export default function IMBLSafetyWarning() {
  const navigate = useNavigate();
  const { state, selectRoute, dismissIMBL } = useAppData();
  const warning = state.imbl;
  const dwell = state.imblDwell;

  if (state.imblDismissed) return null;

  const changeRoute = () => {
    selectRoute("safer", "IMBL safety");
    navigate("/routes");
  };

  const dwellPct = dwell.active
    ? Math.min(100, Math.round((dwell.elapsedSeconds / IMBL_DWELL_THRESHOLD_SECONDS) * 100))
    : 0;
  const secondsRemaining = Math.max(0, IMBL_DWELL_THRESHOLD_SECONDS - dwell.elapsedSeconds);

  return (
    <section
      className={`imbl-safety-warning imbl-${warning.status.toLowerCase()} ${dwell.escalated ? "imbl-escalated" : ""}`}
      aria-live="polite"
    >
      <div className="imbl-warning-heading">
        <AlertTriangle size={15} />
        <div>
          <strong>IMBL DEMO SAFETY STATUS</strong>
          <span>{warning.status}</span>
        </div>
      </div>

      <p>{warning.warning}</p>

      <div className="imbl-warning-data">
        <span><b>Distance</b>{warning.distanceKm} km</span>
        <span><b>Estimated time</b>{warning.estimatedMinutes} min</span>
      </div>

      {/* Two-tier distinction, made visible: this on-app warning shows the
          local buffer status the moment it happens, while a separate,
          visually distinct banner below only appears once the vessel has
          stayed inside the buffer long enough to escalate to the authority
          dashboard — a brief drift never reaches this state. */}
      {dwell.escalated ? (
        <div className="imbl-escalated-badge">
          <Radio size={13} />
          <span>ESCALATED TO AUTHORITY DASHBOARD · sustained {dwell.elapsedSeconds}s inside buffer</span>
        </div>
      ) : dwell.active ? (
        <div className="imbl-dwell">
          <div className="imbl-dwell-label">
            <Timer size={12} />
            <span>
              In boundary buffer for {dwell.elapsedSeconds}s — escalates to authority dashboard in {secondsRemaining}s if sustained
            </span>
          </div>
          <div className="imbl-dwell-track">
            <div className="imbl-dwell-fill" style={{ width: `${dwellPct}%` }} />
          </div>
        </div>
      ) : null}

      <p className="imbl-warning-action">Recommended: {warning.recommendedAction}</p>
      <small>{warning.disclaimer}</small>

      <div className="imbl-warning-actions">
        <button onClick={() => navigate("/map?focus=imbl")}><MapPinned size={13} /> View Map</button>
        {warning.status !== "SAFE" && <button onClick={changeRoute}><Compass size={13} /> Change Route</button>}
        <button onClick={dismissIMBL}>Dismiss</button>
      </div>
    </section>
  );
}