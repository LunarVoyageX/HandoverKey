import { lazy, Suspense } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AuthProvider } from "./contexts/AuthContext";
import { ToastProvider } from "./contexts/ToastContext";
import Spinner from "./components/Spinner";
import ProtectedRoute from "./components/ProtectedRoute";
import NotFound from "./pages/NotFound";

const LandingPage = lazy(() => import("./pages/LandingPage"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const Contact = lazy(() => import("./pages/Contact"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const VerifySuccessor = lazy(() => import("./pages/VerifySuccessor"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const CheckIn = lazy(() => import("./pages/CheckIn"));
const Layout = lazy(() => import("./components/Layout"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Vault = lazy(() => import("./pages/Vault"));
const Successors = lazy(() => import("./pages/Successors"));
const SuccessorAccess = lazy(() => import("./pages/SuccessorAccess"));
const Settings = lazy(() => import("./pages/Settings"));
const Sessions = lazy(() => import("./pages/Sessions"));
const ActivityLogs = lazy(() => import("./pages/ActivityLogs"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));

const enableAnalytics = import.meta.env.VITE_ENABLE_ANALYTICS === "true";
const VercelAnalytics = enableAnalytics
  ? lazy(() =>
      import("@vercel/analytics/react").then((m) => ({
        default: m.Analytics,
      })),
    )
  : null;

function PageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Spinner />
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <ToastProvider>
            <Suspense fallback={<PageFallback />}>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route
                  path="/how-it-works"
                  element={<Navigate to="/#how-it-works" replace />}
                />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<TermsOfService />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/verify-email" element={<VerifyEmail />} />
                <Route path="/checkin" element={<CheckIn />} />
                <Route path="/verify-successor" element={<VerifySuccessor />} />
                <Route path="/successor-access" element={<SuccessorAccess />} />

                <Route
                  element={
                    <ProtectedRoute>
                      <Layout />
                    </ProtectedRoute>
                  }
                >
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/vault" element={<Vault />} />
                  <Route path="/successors" element={<Successors />} />
                  <Route path="/activity" element={<ActivityLogs />} />
                  <Route path="/sessions" element={<Sessions />} />
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/settings" element={<Settings />} />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            {VercelAnalytics && (
              <Suspense fallback={null}>
                <VercelAnalytics />
              </Suspense>
            )}
          </ToastProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
