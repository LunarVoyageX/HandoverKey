import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ToastProvider } from "./contexts/ToastContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import VerifySuccessor from "./pages/VerifySuccessor";
import Dashboard from "./pages/Dashboard";
import Vault from "./pages/Vault";
import Successors from "./pages/Successors";
import Settings from "./pages/Settings";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <Router>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify-successor" element={<VerifySuccessor />} />

            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="vault" element={<Vault />} />
              <Route path="successors" element={<Successors />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
