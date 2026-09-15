import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  MapPin,
  Layers,
  Navigation,
  Fish,
  Ship,
  AlertTriangle,
  Wind,
  Waves,
  Thermometer,
  ChevronDown,
} from "lucide-react";


import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  Polygon,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import Sidebar from "../components/Sidebar";
import IMBLSafetyWarning from "../components/IMBLSafetyWarning";
import { useAppData } from "../state/useAppData";
import "./Map.css";

function createIcon(type) {
  const icons = {
    user: "📍",
    fish: "🐟",
    vessel: "🚢",
    hazard: "⚠️",
    harbour: "⚓",
  };

  return L.divIcon({
    className: "custom-map-marker",
    html: `
      <div class="map-marker-icon ${type}">
        ${icons[type]}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

function MapZoomControl({ userPosition }) {
  const map = useMap();

  return (
    <div className="map-controls">
      <button onClick={() => map.zoomIn()}>+</button>

      <button onClick={() => map.zoomOut()}>−</button>

      <div className="control-divider"></div>

      <button onClick={() => map.flyTo(userPosition, 8)}>
        <Navigation size={15} />
      </button>
    </div>
  );
}

function MapViewport({ position, focusPosition }) {
  const map = useMap();

  useEffect(() => {
    map.flyTo(focusPosition || position, focusPosition ? 9 : 8, { animate: false });
  }, [map, position, focusPosition]);

  return null;
}


function Map() {
  const navigate = useNavigate();
  const { state, updateLocation } = useAppData();
  const {
    userPosition,
    fishingZones,
    vessels,
    hazards,
    harbours,
    weatherRiskZones,
    imblBoundary,
  } = state.marine;
  const { risk, routes, location } = state;
  const selectedRoute = routes.routes.find((route) => route.id === state.selectedRouteId) || routes.routes[0];
  const [searchParams] = useSearchParams();
  const focus = searchParams.get("focus");
  const [locationStatus, setLocationStatus] = useState(() =>
    navigator.geolocation ? "locating" : "unavailable"
  );

  useEffect(() => {
    if (!navigator.geolocation) {
      return;
    }

    let settled = false;
    const useFallback = () => {
      if (settled) return;
      settled = true;
      setLocationStatus("unavailable");
      updateLocation({
        position: state.marine.userPosition,
        status: "fallback",
        source: "demo",
      });
    };
    const fallbackTimer = window.setTimeout(useFallback, 3000);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(fallbackTimer);
        setLocationStatus("available");
        updateLocation({
          position: [position.coords.latitude, position.coords.longitude],
          status: "available",
          source: "browser",
        });
      },
      () => {
        if (settled) return;
        window.clearTimeout(fallbackTimer);
        settled = true;
        setLocationStatus("denied");
        updateLocation({
          position: state.marine.userPosition,
          status: "fallback",
          source: "demo",
        });
      }
    );

    return () => window.clearTimeout(fallbackTimer);
  }, [state.marine.userPosition, updateLocation]);

  const currentPosition = location.position || userPosition;
  const focusPosition = focus === "hazard"
    ? hazards[0]?.position
    : focus === "vessel"
      ? vessels.find((vessel) => vessel.suspicious)?.position
    : focus === "imbl"
      ? [15.15, 73.55]
      : null;
  const [layers, setLayers] = useState({
    fishing: true,
    vessels: true,
    hazards: true,
    ocean: true,
    imbl: false,
    route: true,
    harbours: true,
  });


  const [showLayers, setShowLayers] = useState(false);

  const toggleLayer = (layer) => {
    setLayers((previous) => ({
      ...previous,
      [layer]: !previous[layer],
    }));
  };

  return (
    <div className="map-page">
      <Sidebar />

      <main className="map-content">

        {/* HEADER */}
        <div className="map-page-header">
          <div>
            <div className="map-page-label">
              <Navigation size={14} />
              MARINE MAP
            </div>

            <h1>Marine Intelligence Map</h1>

            <p>
              Monitor fishing zones, vessels, hazards and ocean conditions.
            </p>
          </div>

          <div className="map-location">
            <MapPin size={15} />
            <span>{locationStatus === "locating" ? "Locating..." : location.source === "browser" ? "Browser location" : "Demo fallback · AR-14"}</span>
          </div>
        </div>


        {/* MAP AREA */}
        <section className="map-layout">

          <div className="large-map-panel">

            {/* MAP TOOLBAR */}
            <div className="map-toolbar-main">

              <button
                className={`map-tool ${Object.values(layers).every(Boolean) ? "active" : ""}`}
                onClick={() => setLayers((current) => Object.fromEntries(
                  Object.keys(current).map((key) => [key, true])
                ))}
              >
                <Navigation size={14} />
                Overview
              </button>

              <button
                className={`map-tool ${layers.fishing ? "active" : ""}`}
                onClick={() => toggleLayer("fishing")}
              >
                <Fish size={14} />
                Fishing
              </button>

              <button
                className={`map-tool ${layers.vessels ? "active" : ""}`}
                onClick={() => toggleLayer("vessels")}
              >
                <Ship size={14} />
                Vessels
              </button>

              <button
                className={`map-tool ${layers.hazards ? "active" : ""}`}
                onClick={() => toggleLayer("hazards")}
              >
                <AlertTriangle size={14} />
                Hazards
              </button>

              <button
                className={`map-tool ${layers.ocean ? "active" : ""}`}
                onClick={() => toggleLayer("ocean")}
              >
                <Waves size={14} />
                Ocean
              </button>

            </div>


           <div className="main-marine-map">
  <MapContainer
    center={currentPosition}
    zoom={7}
    scrollWheelZoom={true}
    className="leaflet-marine-map"
  >
    <TileLayer
      attribution='&copy; OpenStreetMap contributors'
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    />

    <MapViewport position={currentPosition} focusPosition={focusPosition} />

    {layers.fishing &&
  fishingZones.map((zone) => (
    <Circle
      key={zone.id}
      center={zone.position}
      radius={35000}
      pathOptions={{
        color: "#22c55e",
        fillColor: "#22c55e",
        fillOpacity: 0.18,
      }}
    >
      <Popup>
        <div className="pfz-popup">
          <strong>{zone.name}</strong>

          <div className="pfz-score">
            <span>Fishing Potential</span>
            <b>{zone.score}%</b>
          </div>

          <div className="pfz-status">
            <span className="status-dot"></span>
            {zone.score >= 85 ? "High potential fishing zone" : "Potential zone with caution"}
          </div>

          <div>Location: {zone.position.join(", ")}</div>

          <button
            className="pfz-details-button"
            onClick={() => {
              navigate(`/routes?zone=${zone.id}`);
            }}
          >
            Use this area
          </button>
        </div>
      </Popup>
    </Circle>
  ))}

    {layers.vessels &&
      vessels.map((vessel) => (
        <Marker
          key={vessel.id}
          position={vessel.position}
          icon={createIcon("vessel")}
        >
          <Popup>
            <strong>{vessel.name}</strong>
            <br />
            Status: {vessel.ais?.source === "live"
              ? "Live AIS anomaly contact"
              : vessel.suspicious
                ? "Suspicious demo contact"
                : "Demo vessel activity"}
            <br />
            Approx. location: {vessel.position.join(", ")}
            <br />
            {vessel.ais?.source === "live" ? (
              <>
                AIS: LIVE — {vessel.ais.anomalyType?.replace(/_/g, " ")}
                <br />
                {vessel.ais.detail}
              </>
            ) : (
              "AIS: DEMO / PROVIDER PENDING"
            )}
            {vessel.suspicious && (
              <>
                <br />
                ⚠️ Suspicious vessel detected
              </>
            )}
          </Popup>
        </Marker>
      ))}

    {layers.hazards &&
      hazards.map((hazard) => (
        <Marker
          key={hazard.id}
          position={hazard.position}
          icon={createIcon("hazard")}
        >
          <Popup>
            <strong>{hazard.name}</strong>
            <br />
            Type: {hazard.type}
            <br />
            Severity: {hazard.severity}
            <br />
            {hazard.status}
            <br />
            Recommended: {hazard.recommendedAction}
            <br />
            <button onClick={() => navigate("/intelligence")}>View risk</button>
          </Popup>
        </Marker>
      ))}

    <Marker
      position={currentPosition}
      icon={createIcon("user")}
    >
      <Popup>
        <strong>Your location</strong>
        <br />
        {location.source === "browser" ? "Browser location" : "Demo fallback location"}
        <br />
        {currentPosition.join(", ")}
      </Popup>
    </Marker>

    {layers.harbours && harbours.map((harbour) => (
      <Marker key={harbour.id} position={harbour.position} icon={createIcon("harbour")}>
        <Popup>
          <strong>{harbour.name}</strong>
          <br />
          {harbour.status}
          <br />
          <button onClick={() => navigate("/routes")}>Plan route here</button>
        </Popup>
      </Marker>
    ))}

    {layers.route && (
      <Polyline
        positions={selectedRoute.path}
        pathOptions={{
          color: "#22d3ee",
          weight: 4,
          dashArray: "8 8",
        }}
      />
    )}

    {layers.imbl && (
  <Polygon
    positions={imblBoundary}
    pathOptions={{
      color: "#ef4444",
      fillColor: "#ef4444",
      fillOpacity: 0.08,
      weight: 2,
      dashArray: "8 6",
    }}
  >
    <Popup>
      <div className="imbl-popup">
        <div className="imbl-popup-header">
          <span className="imbl-warning-icon">⚠</span>
          <strong>IMBL Demo Boundary</strong>
        </div>

        <div className="imbl-alert">
          <span>Boundary proximity detected</span>
          <b>HIGH</b>
        </div>

        <p>
          Demo boundary reference; not a live official maritime feed.
        </p>

        <div className="imbl-distance">
          <span>Estimated distance</span>
          <b>2.4 NM</b>
        </div>

        <button
          className="imbl-escalate-button"
          onClick={() => {
            navigate("/authority");
          }}
        >
          View authority alert
        </button>
      </div>
    </Popup>
  </Polygon>
)}

    {layers.ocean && (
  <Circle
    center={weatherRiskZones[0].center}
    radius={weatherRiskZones[0].radius}
    pathOptions={{
      color: "#f59e0b",
      fillColor: "#f59e0b",
      fillOpacity: 0.12,
    }}
  >
    <Popup>
      <div className="risk-popup">
        <strong>{weatherRiskZones[0].name}</strong>

        <div className="risk-score-large">
          <span>Marine Risk Score</span>
          <b>{risk.score}/100</b>
        </div>

        <div className="risk-level">
          <span className="risk-dot"></span>
          {risk.severity} · {risk.confidence.level} confidence
        </div>

        <div className="risk-factors">
          <div>
            <span>Wave Risk</span>
            <b>Moderate</b>
          </div>

          <div>
            <span>Weather</span>
            <b>Stable</b>
          </div>

          <div>
            <span>Visibility</span>
            <b>Good</b>
          </div>
        </div>

        <p className="risk-note">
          Data updated {state.marine.updatedAt}. {risk.recommendation}
        </p>
      </div>
    </Popup>
  </Circle>
)}

    <MapZoomControl userPosition={currentPosition} />
  </MapContainer>

  <div className="layers-button-wrapper">
  <button
    className="layers-button"
    onClick={() => setShowLayers((previous) => !previous)}
  >
    <Layers size={15} />
    Layers
    <ChevronDown size={13} />
  </button>

  {showLayers && (
    <div className="map-layer-menu">
      <label>
        <input
          type="checkbox"
          checked={layers.fishing}
          onChange={() => toggleLayer("fishing")}
        />
        Fishing zones
      </label>

      <label>
        <input
          type="checkbox"
          checked={layers.vessels}
          onChange={() => toggleLayer("vessels")}
        />
        Vessels
      </label>

      <label>
        <input
          type="checkbox"
          checked={layers.hazards}
          onChange={() => toggleLayer("hazards")}
        />
        Hazards
      </label>

      <label>
        <input
          type="checkbox"
          checked={layers.ocean}
          onChange={() => toggleLayer("ocean")}
        />
        Ocean risk
      </label>

      <label>
        <input
          type="checkbox"
          checked={layers.route}
          onChange={() => toggleLayer("route")}
        />
        Recommended route
      </label>

      <label>
        <input
          type="checkbox"
          checked={layers.imbl}
          onChange={() => toggleLayer("imbl")}
        />
        IMBL boundary
      </label>

      <label>
        <input
          type="checkbox"
          checked={layers.harbours}
          onChange={() => toggleLayer("harbours")}
        />
        Harbours
      </label>
    </div>
  )}
</div>

  <div className="map-legend-main">
    <div className="legend-title">
      MAP LEGEND
    </div>

    {layers.fishing && <div>
      <span className="legend-symbol fishing-symbol">
        <Fish size={9} />
      </span>
      Fishing zone
    </div>}

    {layers.vessels && <div>
      <span className="legend-symbol vessel-symbol">
        <Ship size={9} />
      </span>
      Vessel
    </div>}

    {layers.hazards && <div>
      <span className="legend-symbol hazard-symbol">
        <AlertTriangle size={9} />
      </span>
      Hazard
    </div>}

    {layers.ocean && <div>
      <span className="legend-symbol hazard-symbol">
        <Waves size={9} />
      </span>
      Weather risk
    </div>}

    {layers.harbours && <div>
      <span className="legend-symbol vessel-symbol">
        <Navigation size={9} />
      </span>
      Harbour
    </div>}

    {layers.imbl && <div>
      <span className="legend-symbol hazard-symbol">IMBL</span>
      Demo boundary
    </div>}

    {layers.route && <div>
      <span className="legend-symbol fishing-symbol">
        <Navigation size={9} />
      </span>
      Selected route
    </div>}

    <div>
      <span className="legend-user"></span>
      Your location
    </div>
  </div>
</div>


            {/* MAP FOOTER */}
            <div className="map-status-bar">

              <span>
                Demo data · updated {state.marine.updatedAt} · {risk.confidence.level} confidence
              </span>

              <div className="map-data-tags">
                <span>INCOIS</span>
                <span>IMD</span>
                <span>MOSDAC</span>
                <span>AIS{state.marine.aisMode === "live" ? " · LIVE" : " · DEMO"}</span>
                <span>OCEAN MODEL</span>
              </div>

            </div>

          </div>


          {/* RIGHT PANEL */}
          <aside className="map-side-panel">

            <IMBLSafetyWarning />

            <div className="side-panel-header">

              <div className="map-page-label">
                CURRENT CONDITIONS
              </div>

              <span className="live-indicator">
                <span></span>
                DEMO
              </span>

            </div>


            {/* CURRENT CONDITIONS */}
            <div className="condition-section">

              <h2>Ocean conditions</h2>

              <Condition
                icon={<Thermometer size={16} />}
                label="Sea temperature"
                value={state.marine.ocean.temperature}
                status="Normal"
              />

              <Condition
                icon={<Waves size={16} />}
                label="Wave height"
                value={state.marine.ocean.waveHeight}
                status="Moderate"
              />

              <Condition
                icon={<Wind size={16} />}
                label="Wind speed"
                value={state.marine.ocean.wind}
                status="SW"
              />

            </div>


            {/* FISHING */}
            <div className="side-section">

              <div className="side-section-title">
                <Fish size={14} />
                Fishing activity
              </div>

              <div className="activity-score">
                <strong>HIGH</strong>
                <span>86%</span>
              </div>

              <div className="activity-bar">
                <div></div>
              </div>

              <p>
                Strong fishing potential detected around
                your current area.
              </p>

            </div>


            {/* VESSELS */}
            <div className="side-section">

              <div className="side-section-title">
                <Ship size={14} />
                Nearby vessels
              </div>

              <div className="vessel-count">
                <strong>{vessels.length}</strong>
                <span>vessels detected</span>
              </div>

              <p>
                Highest vessel concentration is
                approximately 12 km northeast.
              </p>

            </div>


            {/* HAZARDS */}
            <div className="side-section hazard-section">

              <div className="side-section-title">
                <AlertTriangle size={14} />
                Detected hazards
              </div>

              <div className="hazard-status">
                <span></span>
                {hazards.length} active hazard{hazards.length === 1 ? "" : "s"}
              </div>

              <p>
                {risk.status} · {risk.recommendation}
              </p>

            </div>


            <button className="open-zones-button" onClick={() => navigate("/fishing-zones")}>
              Explore fishing zones
              <Navigation size={14} />
            </button>

          </aside>

        </section>

      </main>
    </div>
  );
}


/* CONDITION */

function Condition({
  icon,
  label,
  value,
  status,
}) {
  return (
    <div className="condition-row">

      <div className="condition-icon">
        {icon}
      </div>

      <div className="condition-info">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>

      <small>{status}</small>

    </div>
  );
}

export default Map;