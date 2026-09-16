import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../state/useAuth";

// Wrap any route that should only be reachable after Login.jsx has run.
// `allowedRoles` narrows it further (e.g. keep fishermen out of
// /authority) — omit it to just require "logged in, any role".
export default function RequireAuth({ allowedRoles, children }) {
  const { isAuthenticated, role } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
