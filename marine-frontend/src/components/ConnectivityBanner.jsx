import { useEffect, useState } from "react";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";
import "./ConnectivityBanner.css";

export default function ConnectivityBanner() {
  const [online, setOnline] = useState(() => navigator.onLine);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOffline = () => {
      setOnline(false);
      setShowReconnected(false);
    };

    const handleOnline = () => {
      setOnline(true);
      setShowReconnected(true);

      const timer = setTimeout(() => {
        setShowReconnected(false);
      }, 4000);

      return () => clearTimeout(timer);
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (online && !showReconnected) {
    return null;
  }

  return (
    <div
      className={`connectivity-banner ${
        online ? "connectivity-online" : "connectivity-offline"
      }`}
      role="status"
      aria-live="polite"
    >
      {online ? (
        <>
          <Wifi size={17} />
          <div>
            <strong>Connection restored</strong>
            <span>Samudra can check for updated information.</span>
          </div>
        </>
      ) : (
        <>
          <WifiOff size={17} />
          <div>
            <strong>You're offline</strong>
            <span>
              Cached marine information may still be available. Fresh data
              cannot be verified.
            </span>
          </div>
        </>
      )}
    </div>
  );
}