import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { History } from "./pages/History";
import { Requests } from "./pages/Requests";
import { Profile } from "./pages/Profile";
import { Call } from "./pages/Call";

import { authService } from "./services/authService";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = authService.getAccessToken();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

import { Toaster } from "sonner";

function App() {
  return (
    <>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/call/:sessionId" element={<ProtectedRoute><Call /></ProtectedRoute>} />

          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/history" element={<History />} />
            <Route path="/requests" element={<Requests />} />
            <Route path="/profile" element={<Profile />} />
          </Route>

          {/* Redirect root to dashboard (which redirects to login if unauthenticated) */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
      <Toaster richColors position="top-center" />
    </>
  );
}

export default App;
