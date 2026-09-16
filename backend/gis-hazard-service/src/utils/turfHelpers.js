const turf = require('@turf/turf');

/** Build a turf point from {lat, lng}. */
function toPoint({ lat, lng }) {
  return turf.point([lng, lat]);
}

/** Great-circle distance in kilometers between two {lat,lng} points. */
function distanceKm(a, b) {
  return turf.distance(toPoint(a), toPoint(b), { units: 'kilometers' });
}

/** Find the nearest feature (from a FeatureCollection of Points) to a given point. */
function nearestFeature(pointLatLng, featureCollection) {
  if (!featureCollection.features.length) return null;
  const from = toPoint(pointLatLng);
  const nearest = turf.nearestPoint(from, featureCollection);
  return nearest; // includes properties.featureIndex and properties.distanceToPoint
}

/** True if a {lat,lng} point falls inside a GeoJSON polygon/multipolygon geometry. */
function isPointInPolygon(pointLatLng, polygonGeoJSON) {
  return turf.booleanPointInPolygon(toPoint(pointLatLng), polygonGeoJSON);
}

/** Distance in meters from a point to a line (used for the IMBL boundary check). */
function distanceToLineMeters(pointLatLng, lineGeoJSON) {
  const pt = toPoint(pointLatLng);
  const nearestPointOnLine = turf.nearestPointOnLine(lineGeoJSON, pt, { units: 'meters' });
  return nearestPointOnLine.properties.dist;
}

/** Build a buffered polygon (meters) around a line — used for the IMBL alert zone. */
function bufferLineMeters(lineGeoJSON, meters) {
  return turf.buffer(lineGeoJSON, meters, { units: 'meters' });
}

module.exports = {
  toPoint,
  distanceKm,
  nearestFeature,
  isPointInPolygon,
  distanceToLineMeters,
  bufferLineMeters
};
