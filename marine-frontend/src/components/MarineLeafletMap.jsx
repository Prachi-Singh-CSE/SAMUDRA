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
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Navigation } from "lucide-react";
import { useAppData } from "../state/useAppData";

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

function MapViewport({ position }) {
  const map = useMap();

  useEffect(() => {
    map.flyTo(position, map.getZoom(), { animate: false });
  }, [map, position]);

  return null;
}

export default function MarineLeafletMap({
   fishing = true,
  vesselsVisible = true,
  hazardsVisible = true,
  ocean = true,
  imbl = false,
  route = true,
  harboursVisible = false,
  safeOnly = false,
  highPotentialOnly = false,

}) {
  const navigate = useNavigate();
  const { state } = useAppData();
  const {
    userPosition,
    fishingZones,
    vessels,
    hazards,
    harbours,
    weatherRiskZones,
    imblBoundary,
  } = state.marine;
  const currentPosition = state.location?.position || userPosition;
  const selectedRoute = state.routes.routes.find((item) => item.id === state.selectedRouteId) || state.routes.routes[0];

  return (
    <MapContainer
      center={currentPosition}
      zoom={7}
      scrollWheelZoom={true}
      className="leaflet-marine-map"
    >
      {/* OPENSTREETMAP — NO API KEY */}
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MapViewport position={currentPosition} />

      {/* FISHING ZONES */}
      {fishing &&
  fishingZones
    .filter((zone) => {
      if (highPotentialOnly && zone.score < 80) return false;
      if (safeOnly && zone.risk !== "Low") return false;
      return true;
    })
    .map((zone) => (
      <Circle
        key={zone.id}
        center={zone.position}
        radius={18000}
        pathOptions={{
          color: "#22c55e",
          fillColor: "#22c55e",
          fillOpacity: 0.25,
        }}
      >
        <Popup>
          <strong>{zone.name}</strong>
          <br />
          Suitability: {zone.score}/100
          <br />
          Location: {zone.position.join(", ")}
          <br />
          Status: {zone.score >= 85 ? "High potential" : "Potential with caution"}
          <br />
          <button onClick={() => navigate(`/routes?zone=${zone.id}`)}>Use this area</button>
        </Popup>
      </Circle>
    ))}

      {/* VESSELS */}
      {vesselsVisible &&
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

      {/* HAZARDS */}
      {hazardsVisible &&
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

      {/* USER */}
      <Marker position={currentPosition} icon={createIcon("user")}>
        <Popup>
          <strong>Your location</strong>
          <br />
          {state.location?.source === "browser" ? "Browser location" : "Demo fallback location"}
          <br />
          {currentPosition.join(", ")}
        </Popup>
      </Marker>

      {harboursVisible && harbours.map((harbour) => (
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

      {/* ROUTE */}
      {route && (
        <Polyline
          positions={selectedRoute.path}
          pathOptions={{
            color: "#22d3ee",
            weight: 4,
            dashArray: "8 8",
          }}
        />
      )}

      {/* IMBL */}
      {imbl && (
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
            <strong>IMBL Boundary</strong>
            <br />
            Demo boundary reference; not a live official boundary feed.
            <br />
            <button onClick={() => navigate("/alerts")}>View boundary alert</button>
          </Popup>
        </Polygon>
      )}

      {/* OCEAN RISK */}
      {ocean && weatherRiskZones.map((zone) => <Circle
          key={zone.id}
          center={zone.center}
          radius={zone.radius}
          pathOptions={{
            color: "#f59e0b",
            fillColor: "#f59e0b",
            fillOpacity: 0.12,
          }}
        >
          <Popup>
            <strong>{zone.name}</strong>
            <br />
            Marine Risk Score: {state.risk.score}/100
            <br />
            {state.risk.severity} · {state.risk.confidence.level} confidence
            <br />
            Data updated {state.marine.updatedAt}
          </Popup>
        </Circle>)}

      <MapZoomControl userPosition={userPosition} />
    </MapContainer>
  );
}