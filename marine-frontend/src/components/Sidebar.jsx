import { useState } from "react";
import {
  Anchor,
  Home,
  Map,
  Waves,
  Route,
  Bell,
  Bot,
  Brain,
  Landmark,
  User,
  Globe,
  Menu,
  X,
  AlertTriangle,
  LogOut,
} from "lucide-react";

import { NavLink, useNavigate } from "react-router-dom";
import { useLanguage } from "../state/useLanguage";
import { useAuth } from "../state/useAuth";
import { languageOptions } from "../i18n/translations";
import "./Sidebar.css";

function Sidebar() {
  const { language, setLanguage, t } = useLanguage();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const activeLanguage =
    languageOptions.find((option) => option.code === language) ||
    languageOptions[0];

  const navItems = [
    { to: "/dashboard", icon: <Home size={18} />, label: t("nav.home") },
    { to: "/map", icon: <Map size={18} />, label: t("nav.map") },
    {
      to: "/fishing-zones",
      icon: <Waves size={18} />,
      label: t("nav.fishingZones"),
    },
    { to: "/routes", icon: <Route size={18} />, label: t("nav.routes") },
    { to: "/alerts", icon: <Bell size={18} />, label: t("nav.alerts") },

    // Emergency SOS
    {
      to: "/sos",
      icon: <AlertTriangle size={18} />,
      label: "Emergency SOS",
    },

    {
      to: "/ai-assistant",
      icon: <Bot size={18} />,
      label: t("nav.aiAssistant"),
    },
    { to: "/ocean", icon: <Waves size={18} />, label: t("nav.ocean") },
    {
      to: "/intelligence",
      icon: <Brain size={18} />,
      label: t("nav.intelligence"),
    },
    {
      to: "/government",
      icon: <Landmark size={18} />,
      label: t("nav.support"),
    },
  ];

  return (
    <>
      {/* Compact top bar — mobile only */}
      <header className="mobile-topbar">
        <NavLink to="/dashboard" className="mobile-brand">
          <div className="sidebar-logo">
            <Anchor size={17} />
          </div>
          SAMUDRA
        </NavLink>

        <button
          className="mobile-topbar-toggle"
          onClick={() => setMobileMenuOpen((open) => !open)}
          aria-label={
            mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"
          }
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* Desktop / tablet sidebar */}
      <aside className="app-sidebar">
        <NavLink to="/dashboard" className="sidebar-brand">
          <div className="sidebar-logo">
            <Anchor size={18} />
          </div>
          <span className="sidebar-brand-text">SAMUDRA</span>
        </NavLink>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `sidebar-item ${isActive ? "active" : ""}`
              }
              title={item.label}
            >
              {item.icon}
              <span className="sidebar-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          {/*<button
            className="sidebar-item notification-button"
            aria-label={`${t("nav.alerts")}, 1 unread`}
          >
            <span className="sidebar-icon-wrap">
              <Bell size={18} />
              <span className="notification-dot" aria-hidden="true" />
            </span>
            <span className="sidebar-label">Notifications</span>
          </button>*/}

          <div className="sidebar-language">
            <button
              className="sidebar-item"
              onClick={() => setLanguageMenuOpen((open) => !open)}
              aria-haspopup="listbox"
              aria-expanded={languageMenuOpen}
              aria-label={t("nav.language")}
            >
              <Globe size={18} />
              <span className="sidebar-label">
                {activeLanguage.label}
              </span>
            </button>

            {languageMenuOpen && (
              <ul className="language-menu" role="listbox">
                {languageOptions.map((option) => (
                  <li key={option.code}>
                    <button
                      role="option"
                      aria-selected={option.code === language}
                      className={option.code === language ? "active" : ""}
                      onClick={() => {
                        setLanguage(option.code);
                        setLanguageMenuOpen(false);
                      }}
                    >
                      {option.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <NavLink
            to="/profile"
            className="sidebar-item"
            title={t("nav.profile")}
          >
            <User size={18} />
            <span className="sidebar-label">{t("nav.profile")}</span>
          </NavLink>

          <button
            className="sidebar-item"
            onClick={handleLogout}
            title="Log out"
          >
            <LogOut size={18} />
            <span className="sidebar-label">Log out</span>
          </button>
        </div>
      </aside>

      {/* Mobile slide-in drawer */}
      {mobileMenuOpen && (
        <>
          <button
            className="mobile-nav-backdrop"
            aria-label="Close navigation menu"
            onClick={() => setMobileMenuOpen(false)}
          />

          <nav className="mobile-nav-drawer" aria-label="Mobile navigation">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `mobile-nav-item ${isActive ? "active" : ""}`
                }
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            ))}

            <div className="mobile-nav-divider" />

            <NavLink
              to="/profile"
              className="mobile-nav-item"
              onClick={() => setMobileMenuOpen(false)}
            >
              <User size={18} />
              <span>{t("nav.profile")}</span>
            </NavLink>

            <button
              className="mobile-nav-item"
              onClick={() => {
                setMobileMenuOpen(false);
                handleLogout();
              }}
            >
              <LogOut size={18} />
              <span>Log out</span>
            </button>
          </nav>
        </>
      )}
    </>
  );
}

export default Sidebar;