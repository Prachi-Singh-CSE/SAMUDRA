import { useState } from "react";
import { useLocation } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { useAppData } from "../state/useAppData";
import { useAuth } from "../state/useAuth";
import "./FloatingSOS.css";

export default function FloatingSOS() {
  const { pathname } = useLocation();
  const { state, recordDemoSOS, updateLocation } = useAppData();
  const { isAuthenticated, role } = useAuth();
  const [flow, setFlow] = useState("normal");
  const [pressed, setPressed] = useState(false);

  // Fisherman-only widget: keep it off the landing/login screens and off
  // the authority console (which has its own SOS handling).
  if (!isAuthenticated || role !== "fisherman") return null;
  if (pathname === "/authority" || pathname === "/sos") return null;

  const acknowledged = state.sosEvents.at(-1)?.acknowledgementStatus === "ACKNOWLEDGED";

  const record = (position, locationStatus) => {
    updateLocation({ position, status: locationStatus === "BROWSER" ? "available" : "fallback", source: locationStatus === "BROWSER" ? "browser" : "demo" });
    recordDemoSOS({
      location: position,
      locationStatus,
      vessel: state.sos.vessel,
      contact: state.sos.contact,
      user: { name: "Suresh Kolekar", profileId: "FISH-MH-28491" },
    });
    window.setTimeout(() => setFlow("sent"), 450);
  };

  const activate = () => {
    setFlow("activating");
    let settled = false;
    const fallbackTimer = window.setTimeout(() => {
      if (!settled) setFlow("failed");
    }, 2500);

    if (!navigator.geolocation) {
      window.clearTimeout(fallbackTimer);
      setFlow("failed");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(fallbackTimer);
        setFlow("location");
        record([position.coords.latitude, position.coords.longitude], "BROWSER");
      },
      () => {
        if (settled) return;
        settled = true;
        window.clearTimeout(fallbackTimer);
        setFlow("failed");
      }
    );
  };

  const continueWithDemoLocation = () => {
    setFlow("location");
    record(state.location.position, "DEMO_FALLBACK");
  };
const resetSOS = () => {
  setFlow("normal");
  setPressed(false);
};
  return (
    <div className="floating-sos" aria-live="polite">
      {flow === "normal" && (
        <button
          className={`floating-sos-trigger ${pressed ? "pressed" : ""}`}
          aria-label="Open emergency SOS confirmation"
          onPointerDown={() => setPressed(true)}
          onPointerUp={() => setPressed(false)}
          onPointerCancel={() => setPressed(false)}
          onClick={() => setFlow("confirmation")}
        >
          <ShieldAlert size={17} />
          SOS
        </button>
      )}

      {flow === "confirmation" && (
        <div className="floating-sos-panel" role="dialog" aria-modal="false" aria-labelledby="floating-sos-title">
          <strong id="floating-sos-title">Send your current location to the authority?</strong>
          <p>This demo records an application event. It does not transmit a real emergency message.</p>
          <div className="floating-sos-actions">
            <button onClick={activate}>Confirm SOS</button>
            <button onClick={() => setFlow("normal")}>Cancel</button>
          </div>
        </div>
      )}

      {flow === "activating" && <div className="floating-sos-panel">Activating SOS and requesting location...</div>}

      {flow === "failed" && (
        <div className="floating-sos-panel" role="alert">
          <strong>Location unavailable</strong>
          <p>Unable to obtain browser location. No event has been recorded.</p>
          <div className="floating-sos-actions">
            <button onClick={activate}>Retry</button>
            <button onClick={continueWithDemoLocation}>Use demo location</button>
          </div>
        </div>
      )}

      {(flow === "location" || flow === "sent" || acknowledged) && (
        <div className="floating-sos-panel" role="status">
          <strong>{acknowledged ? "SOS acknowledged by authority" : "SOS locally recorded"}</strong>
          <p>Transmission status: NOT TRANSMITTED. Incident ID: {state.sosEvents.at(-1)?.id || "pending"}</p>
          <div className="floating-sos-actions">
      <button onClick={resetSOS}>RESET SOS</button>
    </div>
          
        </div>
      )}
    </div>
  );
}
