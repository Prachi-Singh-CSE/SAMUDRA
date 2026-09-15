import { useEffect, useRef, useState } from "react";
import { distanceMeters } from "../utils/geo";

const FALLBACK_TIMEOUT_MS = 3000;

// A vessel at sea is moving continuously, so a one-shot getCurrentPosition()
// fix goes stale the moment the page finishes loading — every downstream
// call (live risk score, route planning, IMBL proximity) keeps using that
// first fix forever. This hook uses watchPosition() instead, but throttles
// how often it actually reports a new fix upstream: without a threshold,
// watchPosition can fire every few seconds and would re-trigger every
// position-keyed backend call (live snapshot, alerts, routes) far more
// often than a slow-moving boat's position meaningfully changes.
const MIN_UPDATE_DISTANCE_METERS = 300;
const MIN_UPDATE_INTERVAL_MS = 15000;

/**
 * Continuously tracks the browser's GPS position and calls `onUpdate` with
 * `{ position, status, source }` — once immediately (falling back to
 * `fallbackPosition` if geolocation is unsupported/denied/slow), and again
 * whenever the vessel has moved far enough or enough time has passed.
 *
 * Returns a status string: "locating" | "available" | "denied" | "unavailable".
 */
export function useLiveGeolocation(fallbackPosition, onUpdate) {
  const [status, setStatus] = useState(() =>
    typeof navigator !== "undefined" && navigator.geolocation
      ? "locating"
      : "unavailable"
  );

  // Keep the latest onUpdate/fallbackPosition without re-subscribing the
  // watch every render (dispatch functions and array literals are commonly
  // recreated on each render in the caller).
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;
  const fallbackRef = useRef(fallbackPosition);
  fallbackRef.current = fallbackPosition;

  const lastDispatchRef = useRef({ position: null, at: 0 });

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("unavailable");
      onUpdateRef.current({
        position: fallbackRef.current,
        status: "fallback",
        source: "demo",
      });
      return undefined;
    }

    let settled = false;

    const useFallback = () => {
      if (settled) return;
      settled = true;
      setStatus("unavailable");
      onUpdateRef.current({
        position: fallbackRef.current,
        status: "fallback",
        source: "demo",
      });
    };

    const fallbackTimer = window.setTimeout(useFallback, FALLBACK_TIMEOUT_MS);

    const handleFix = (geoPosition) => {
      if (!settled) {
        settled = true;
        window.clearTimeout(fallbackTimer);
        setStatus("available");
      }

      const position = [
        geoPosition.coords.latitude,
        geoPosition.coords.longitude,
      ];
      const now = Date.now();
      const last = lastDispatchRef.current;

      const movedEnough =
        !last.position ||
        distanceMeters(last.position, position) >= MIN_UPDATE_DISTANCE_METERS;
      const longEnough = now - last.at >= MIN_UPDATE_INTERVAL_MS;

      if (!last.position || movedEnough || longEnough) {
        lastDispatchRef.current = { position, at: now };
        onUpdateRef.current({ position, status: "available", source: "browser" });
      }
    };

    const handleError = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(fallbackTimer);
      setStatus("denied");
      onUpdateRef.current({
        position: fallbackRef.current,
        status: "fallback",
        source: "demo",
      });
    };

    const watchId = navigator.geolocation.watchPosition(handleFix, handleError, {
      enableHighAccuracy: true,
      maximumAge: 10000,
      timeout: 10000,
    });

    return () => {
      window.clearTimeout(fallbackTimer);
      navigator.geolocation.clearWatch(watchId);
    };
    // Intentionally subscribe once: fallbackPosition/onUpdate are read via
    // refs above so a new demo-array or dispatch-closure reference on
    // re-render doesn't tear down and restart the GPS watch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return status;
}