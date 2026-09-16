<<<<<<< HEAD
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppDataProvider } from "./state/AppDataProvider";
import { LanguageProvider } from "./state/LanguageProvider";
import { AuthProvider } from "./state/AuthProvider";
import RequireAuth from "./components/RequireAuth";
=======
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppDataProvider } from "./state/AppDataProvider";
import { LanguageProvider } from "./state/LanguageProvider";
>>>>>>> a9be354893841ff2595f723a7cdbaec5e7a1e3bc
import FloatingSOS from "./components/FloatingSOS";
import ProactiveHazardBanner from "./components/ProactiveHazardBanner";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import FishingZones from "./pages/FishingZones";
import RoutesPage from "./pages/Routes";
import Alerts from "./pages/Alerts";
import AIAssistant from "./pages/AIAssistant";
import Ocean from "./pages/Ocean";
import Intelligence from "./pages/Intelligence";
import Government from "./pages/Government";
import Profile from "./pages/Profile";
import Map from "./pages/Map";
import EmergencySOS from "./pages/EmergencySOS";
import AuthorityDashboard from "./pages/AuthorityDashboard";

function App() {
  return (
    <LanguageProvider>
<<<<<<< HEAD
      <AuthProvider>
        <AppDataProvider>
          <BrowserRouter>
            <Routes>

            {/* Landing */}
            <Route path="/" element={<Landing />} />
            <Route path="/login/:role" element={<Login />} />

            {/* Fisherman-side pages — require a fisherman login */}
            <Route path="/dashboard" element={<RequireAuth allowedRoles={["fisherman"]}><Dashboard /></RequireAuth>} />
            <Route path="/map" element={<RequireAuth allowedRoles={["fisherman"]}><Map /></RequireAuth>} />
            <Route path="/fishing-zones" element={<RequireAuth allowedRoles={["fisherman"]}><FishingZones /></RequireAuth>} />
            <Route path="/routes" element={<RequireAuth allowedRoles={["fisherman"]}><RoutesPage /></RequireAuth>} />
            <Route path="/alerts" element={<RequireAuth allowedRoles={["fisherman"]}><Alerts /></RequireAuth>} />
            <Route path="/ai-assistant" element={<RequireAuth allowedRoles={["fisherman"]}><AIAssistant /></RequireAuth>} />
            <Route path="/ocean" element={<RequireAuth allowedRoles={["fisherman"]}><Ocean /></RequireAuth>} />
            <Route path="/sos" element={<RequireAuth allowedRoles={["fisherman"]}><EmergencySOS /></RequireAuth>} />
            <Route path="/intelligence" element={<RequireAuth allowedRoles={["fisherman"]}><Intelligence /></RequireAuth>} />
            <Route path="/government" element={<RequireAuth allowedRoles={["fisherman"]}><Government /></RequireAuth>} />
            <Route path="/profile" element={<RequireAuth allowedRoles={["fisherman"]}><Profile /></RequireAuth>} />

            {/* Authority-side page — authority or regulator login */}
            <Route path="/authority" element={<RequireAuth allowedRoles={["authority", "regulator"]}><AuthorityDashboard /></RequireAuth>} />

            </Routes>
            <ProactiveHazardBanner />
            <FloatingSOS />
          </BrowserRouter>
        </AppDataProvider>
      </AuthProvider>
=======
      <AppDataProvider>
        <BrowserRouter>
          <Routes>

          {/* Landing */}
          <Route path="/" element={<Landing />} />
          <Route
  path="/login/fisherman"
  element={<Navigate to="/dashboard" replace />}
/>

<Route
  path="/login/authority"
  element={<Navigate to="/authority" replace />}
/>
          {/* Main Pages */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/map" element={<Map />} />
          <Route path="/fishing-zones" element={<FishingZones />} />
          <Route path="/routes" element={<RoutesPage />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/ai-assistant" element={<AIAssistant />} />
          <Route path="/ocean" element={<Ocean />} />
          <Route path="/sos" element={<EmergencySOS />} />
          <Route path="/intelligence" element={<Intelligence />} />
          <Route path="/government" element={<Government />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/authority" element={<AuthorityDashboard />} />

          </Routes>
          <ProactiveHazardBanner />
          <FloatingSOS />
        </BrowserRouter>
      </AppDataProvider>
>>>>>>> a9be354893841ff2595f723a7cdbaec5e7a1e3bc
    </LanguageProvider>
  );
}

export default App;