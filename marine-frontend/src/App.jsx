import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppDataProvider } from "./state/AppDataProvider";
import { LanguageProvider } from "./state/LanguageProvider";
import { AuthProvider } from "./state/AuthProvider";
import RequireAuth from "./components/RequireAuth";
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
    </LanguageProvider>
  );
}

export default App;