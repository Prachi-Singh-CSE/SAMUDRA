import { useState } from "react";
import { useNavigate, useParams, Navigate, NavLink } from "react-router-dom";
import { Anchor, Shield, SlidersHorizontal, ArrowRight, ArrowLeft } from "lucide-react";
<<<<<<< HEAD
import { useAuth } from "../state/useAuth";
=======
>>>>>>> a9be354893841ff2595f723a7cdbaec5e7a1e3bc
import "./Login.css";

const ROLE_CONFIG = {
  fisherman: {
    icon: <Anchor size={22} />,
    title: "Fisherman Login",
    subtitle: "Risk score, fishing zones, safe routes, SOS and the AI copilot.",
    idLabel: "Fisherman ID / Mobile number",
    idPlaceholder: "FISH-MH-28491 or 9XXXXXXXXX",
    secondaryLabel: "Home port",
    secondaryPlaceholder: "e.g. Vasai",
    destination: "/dashboard",
    accent: "role-fisherman",
  },
  authority: {
    icon: <Shield size={22} />,
    title: "Authority Login",
    subtitle: "Fleet map, SOS response, incident triage and hazard verification.",
    idLabel: "Authority ID",
    idPlaceholder: "COAST-GUARD-1042",
    secondaryLabel: "Station / sector",
    secondaryPlaceholder: "e.g. Sector AR-14",
    destination: "/authority",
    accent: "role-authority",
  },
  regulator: {
    icon: <SlidersHorizontal size={22} />,
    title: "Regulator / Admin Login",
    subtitle: "Sector analytics, compliance reports and data-source governance.",
    idLabel: "Admin ID",
    idPlaceholder: "REGULATOR-0117",
    secondaryLabel: "Department",
    secondaryPlaceholder: "e.g. Fisheries Dept.",
    destination: "/authority",
    accent: "role-regulator",
  },
};

function Login() {
  const { role } = useParams();
  const navigate = useNavigate();
<<<<<<< HEAD
  const { login } = useAuth();
=======
>>>>>>> a9be354893841ff2595f723a7cdbaec5e7a1e3bc
  const [id, setId] = useState("");
  const [secondary, setSecondary] = useState("");

  const config = ROLE_CONFIG[role];
  if (!config) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = (e) => {
    e.preventDefault();
<<<<<<< HEAD
    // Demo prototype — no real auth backend. We still require the ID
    // field to be filled in (see `required` on the input below) and
    // record a session so protected routes know the user came through
    // this screen, rather than just navigating straight into the portal.
    login(role, id.trim(), secondary.trim());
=======
    // Demo prototype — no real auth backend, just route into the portal.
>>>>>>> a9be354893841ff2595f723a7cdbaec5e7a1e3bc
    navigate(config.destination);
  };

  return (
    <div className="login-page">
      <div className="login-background" />

      <NavLink to="/" className="login-back">
        <ArrowLeft size={15} />
        Back
      </NavLink>

      <div className={`login-card ${config.accent}`}>
        <div className="login-icon">{config.icon}</div>

        <h1>{config.title}</h1>
        <p className="login-subtitle">{config.subtitle}</p>

        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            {config.idLabel}
            <input
              type="text"
              placeholder={config.idPlaceholder}
              value={id}
              onChange={(e) => setId(e.target.value)}
              required
            />
          </label>

          <label>
            {config.secondaryLabel}
            <input
              type="text"
              placeholder={config.secondaryPlaceholder}
              value={secondary}
              onChange={(e) => setSecondary(e.target.value)}
            />
          </label>

          <button type="submit" className="login-submit">
            Continue
            <ArrowRight size={16} />
          </button>
        </form>

        <p className="login-note">
          Demo prototype — no real credentials required. Any values will sign you in.
        </p>

        <div className="login-switch">
          Wrong portal?
          {Object.keys(ROLE_CONFIG)
            .filter((key) => key !== role)
            .map((key) => (
              <NavLink key={key} to={`/login/${key}`}>
                {ROLE_CONFIG[key].title.replace(" Login", "")}
              </NavLink>
            ))}
        </div>
      </div>
    </div>
  );
}

export default Login;