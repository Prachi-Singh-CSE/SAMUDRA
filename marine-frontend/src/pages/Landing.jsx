import {
  Anchor,
  ArrowRight,
  Bot,
  Globe2,
  Shield,
  SlidersHorizontal,
  Waves,
  Database,
  Map,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./Landing.css";

function Landing() {
  const navigate = useNavigate();

  return (
    <div className="landing-page">

      {/* Background map effect */}
      <div className="map-background">
        <div className="map-grid"></div>
        <div className="route-line route-one"></div>
        <div className="route-line route-two"></div>
        <div className="location-dot"></div>
      </div>

      {/* Top navigation */}
      <header className="landing-header">

        <div className="brand">
          <div className="brand-icon">
            <Anchor size={20} />
          </div>

          <div>
            <div className="brand-name">SAMUDRA</div>
            <div className="brand-subtitle">
              MARINE INTELLIGENCE & SAFETY PLATFORM
            </div>
          </div>
        </div>

        <div className="header-actions">
          <button className="prototype-btn">
            PROTOTYPE INTELLIGENCE
          </button>

          <button className="language-btn">
            <Globe2 size={15} />
            English
          </button>
        </div>

      </header>

      {/* Main content */}
      <main className="landing-content">

        {/* Left section */}
        <section className="hero-section">

          <div className="intelligence-pill">
            <Waves size={15} />
            FUSED MARINE INTELLIGENCE
          </div>

          <h1>
            Your Ocean.
            <br />
            Your Safety.
            <br />
            <span>Your Intelligence.</span>
          </h1>

          <p className="hero-description">
            AI-powered marine intelligence for safer fishing,
            smarter routes, and faster emergency response.
          </p>

          <div className="hero-buttons">

            <button
              className="primary-button"
              onClick={() => navigate("/login/fisherman")}
            >
              <ArrowRight size={17} />
              Login as Fisherman
            </button>

            <button
              className="secondary-button"
              onClick={() => navigate("/ai-assistant")}
            >
              <Bot size={17} />
              Ask the Marine AI
            </button>

          </div>

          <p className="powered-text">
            Powered by marine, weather, satellite, vessel and ocean data.
          </p>

          {/* Intelligence process */}
          <div className="process-grid">

            <ProcessCard
              number="01"
              title="DATA"
              description={
                <>
                  INCOIS · IMD ·
                  <br />
                  MOSDAC · AIS · SAR ·
                  <br />
                  GPS
                </>
              }
            />

            <ProcessCard
              number="02"
              title="AI REASONING"
              description={
                <>
                  Fusion, risk scoring,
                  <br />
                  anomaly detection
                </>
              }
            />

            <ProcessCard
              number="03"
              title="DECISION"
              description={
                <>
                  Zones, routes,
                  <br />
                  harbour go / no-go
                </>
              }
            />

            <ProcessCard
              number="04"
              title="ALERT"
              description={
                <>
                  Reactive push, IMBL,
                  <br />
                  hazard, cyclone
                </>
              }
            />

            <div className="process-card action-card">
              <div className="process-number">05</div>

              <div>
                <div className="process-title">ACTION</div>

                <div className="process-description">
                  Reroute, return, SOS, authority dispatch
                </div>
              </div>
            </div>

          </div>

        </section>

        {/* Right portal card */}
        <section className="portal-section">

          <div className="portal-card">

            <h2>CHOOSE YOUR PORTAL</h2>

            <PortalOption
              icon={<Anchor size={19} />}
              title="Fisherman Portal"
              description="Risk score, fishing zones, safe routes, SOS and the AI copilot."
              active
              onClick={() => navigate("/login/fisherman")}
            />

            <PortalOption
              icon={<Shield size={19} />}
              title="Authority Dashboard"
              description="Fleet map, SOS response, incident triage and hazard verification."
              onClick={() => navigate("/login/authority")}
            />

            {/* Demo dataset */}
            <div className="dataset-card">

              <div className="dataset-title">
                <Waves size={14} />
                Live demo dataset · Arabian Sea sector AR-14
              </div>

              <div className="dataset-tags">
                <span>INCOIS</span>
                <span>IMD</span>
                <span>MOSDAC</span>
                <span>AIS</span>
                <span>SATELLITE</span>
                <span>OCEAN MODEL</span>
                <span>GPS</span>
              </div>

              <p>
                Demo / Prepared Data. Feeds are represented for
                demonstration and are not live operational services.
              </p>

            </div>

          </div>

        </section>

      </main>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-brand">
          <Anchor size={16} />
          SAMUDRA
        </div>
        <div className="footer-note">
          Built for Smart India Hackathon 2026 · Demo intelligence platform, not an operational safety service.
        </div>
        <div className="footer-links">
          <span>Privacy</span>
          <span>Terms</span>
          <span>Contact</span>
        </div>
      </footer>

    </div>
  );
}


/* Portal option component */
function PortalOption({
  icon,
  title,
  description,
  active = false,
  onClick,
}) {
  return (
    <button className={`portal-option ${active ? "active" : ""}`} onClick={onClick}>

      <div className="portal-icon">
        {icon}
      </div>

      <div className="portal-text">
        <div className="portal-title">
          {title}
        </div>

        <div className="portal-description">
          {description}
        </div>
      </div>

      <ArrowRight className="portal-arrow" size={17} />

    </button>
  );
}


/* Process card component */
function ProcessCard({
  number,
  title,
  description,
}) {
  return (
    <div className="process-card">

      <div className="process-number">
        {number}
      </div>

      <div>
        <div className="process-title">
          {title}
        </div>

        <div className="process-description">
          {description}
        </div>
      </div>

    </div>
  );
}

export default Landing;