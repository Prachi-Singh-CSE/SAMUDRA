import { useEffect, useRef, useState } from "react";
import Sidebar from "../components/Sidebar";
import { useAppData } from "../state/useAppData";
import "./EmergencySOS.css";

function EmergencySOS() {
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [sent, setSent] = useState(false);
  const [confirmation, setConfirmation] = useState(false);
  const { state, recordDemoSOS } = useAppData();
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const animationRef = useRef(null);

  const clearTimers = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    timerRef.current = null;
    animationRef.current = null;
  };

  const prepareSOS = () => {
    if (sent || confirmation) return;
    setHolding(false);
    setProgress(100);
    setConfirmation(true);
    clearTimers();
  };

  const startHold = () => {
    if (sent || confirmation) return;
    setHolding(true);
    setProgress(0);
    startTimeRef.current = Date.now();

    const updateProgress = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const percentage = Math.min((elapsed / 3000) * 100, 100);
      setProgress(percentage);
      if (percentage >= 100) {
        prepareSOS();
        return;
      }
      animationRef.current = requestAnimationFrame(updateProgress);
    };

    animationRef.current = requestAnimationFrame(updateProgress);
    timerRef.current = setTimeout(prepareSOS, 3000);
  };

  const cancelHold = () => {
    if (sent || confirmation) return;
    setHolding(false);
    setProgress(0);
    clearTimers();
  };

  const confirmSOS = () => {
    setConfirmation(false);
    setSent(true);
    recordDemoSOS({
      location: state.location.position,
      locationStatus: state.location.source === "browser" ? "BROWSER" : "DEMO_FALLBACK",
      vessel: state.sos.vessel,
      contact: state.sos.contact,
      user: { name: "Suresh Kolekar", profileId: "FISH-MH-28491" },
    });
  };

  const cancelConfirmation = () => {
    setConfirmation(false);
    setProgress(0);
  };

  const resetSOS = () => {
    setSent(false);
    setConfirmation(false);
    setHolding(false);
    setProgress(0);
  };

  useEffect(() => () => clearTimers(), []);

  return (
    <>
      <Sidebar />
      <main className="sos-page">
        <div className="sos-container">
          <div className="sos-header">
            <div>
              <p className="sos-eyebrow">EMERGENCY · SAFETY SYSTEM</p>
              <h1>Emergency SOS</h1>
              <p>Send your location and emergency status to your saved contacts and nearby rescue services.</p>
            </div>
            <div className="sos-status"><span className="status-dot"></span>{sent ? "SOS LOCALLY RECORDED" : confirmation ? "CONFIRM SOS" : "SYSTEM READY"}</div>
          </div>

          <section className={`sos-main-card ${sent ? "sos-sent" : ""}`}>
            <div className={`sos-circle ${holding ? "holding" : ""} ${sent ? "sent" : ""}`} style={{ "--progress": `${progress}%` }}>
              <div className="sos-inner">
                {sent ? <><span>✓</span><small>LOCALLY RECORDED</small></> : <><span>SOS</span><small>{holding ? `${(progress / 100 * 3).toFixed(1)}s` : "EMERGENCY"}</small></>}
              </div>
            </div>

            {confirmation ? (
              <>
                <h2>Send your current location to the authority?</h2>
                <p className="sos-description">This demo records the SOS locally. It does not transmit a real emergency message.</p>
                <div className="sos-confirmation-actions">
                  <button className="sos-trigger" onClick={confirmSOS}>CONFIRM SOS</button>
                  <button className="sos-reset-btn" onClick={cancelConfirmation}>CANCEL</button>
                </div>
              </>
            ) : sent ? (
              <>
                <h2>SOS Locally Recorded</h2>
                <p className="sos-description">Your demo alert was recorded with your location and vessel details. No external emergency transmission has occurred.</p>
                <button className="sos-reset-btn" onClick={resetSOS}>RESET SOS</button>
              </>
            ) : (
              <>
                <h2>{holding ? "Keep holding..." : "Need immediate help?"}</h2>
                <p className="sos-description">{holding ? "Keep holding the button for 3 seconds to prepare the emergency alert." : "Press and hold the SOS button for 3 seconds to prepare an emergency alert."}</p>
                <button aria-label="Press and hold to prepare emergency SOS" className={`sos-trigger ${holding ? "is-holding" : ""}`} onMouseDown={startHold} onMouseUp={cancelHold} onMouseLeave={cancelHold} onTouchStart={(event) => { event.preventDefault(); startHold(); }} onTouchEnd={cancelHold} onTouchCancel={cancelHold}>
                  <span>⚠</span>{holding ? "KEEP HOLDING" : "HOLD TO PREPARE SOS"}
                </button>
                <p className="sos-note">Release before 3 seconds to cancel.</p>
              </>
            )}
          </section>

          <div className="sos-grid">
            <section className="sos-info-card"><div className="info-icon">⌖</div><div><span>YOUR LOCATION</span><strong>{state.location.source === "browser" ? "Browser location available" : "Demo fallback location"}</strong><small>Location status · {state.location.source === "browser" ? "Available" : "Fallback"}</small></div><span className="verified">DEMO</span></section>
            <section className="sos-info-card"><div className="info-icon">♧</div><div><span>EMERGENCY CONTACT</span><strong>{state.sos.contact.name}</strong><small>{state.sos.contact.relationship} · +91 XXXXX XXXXX</small></div><button>EDIT</button></section>
            <section className="sos-info-card"><div className="info-icon">⚓</div><div><span>REGISTERED VESSEL</span><strong>{state.sos.vessel.name}</strong><small>{state.sos.vessel.registration} · Crew {state.sos.vessel.crew}</small></div><span className="verified">✓ VERIFIED</span></section>
          </div>

          <section className="sos-protocol">
            <div className="protocol-heading"><span>EMERGENCY PROTOCOL</span><small>WHAT HAPPENS AFTER SOS</small></div>
            <div className="protocol-steps">
              <div className="protocol-step"><div className="step-number">01</div><div><strong>Location captured</strong><p>Your latest demo GPS coordinates are attached.</p></div></div>
              <div className="protocol-line"></div>
              <div className="protocol-step"><div className="step-number">02</div><div><strong>Event recorded</strong><p>The local application state stores the SOS event.</p></div></div>
              <div className="protocol-line"></div>
              <div className="protocol-step"><div className="step-number">03</div><div><strong>Authority view updated</strong><p>Authority dashboard reflects the demo incident.</p></div></div>
            </div>
          </section>

          <div className="sos-footer"><span>⚠</span>Only use SOS for genuine emergencies. This demo does not transmit emergency messages.</div>
        </div>
      </main>
    </>
  );
}

export default EmergencySOS;
