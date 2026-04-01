import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import LoginPage from "./pages/LoginPage";
import AuthCallback from "./pages/AuthCallback";
import Dashboard from "./pages/Dashboard";
import Jobs from "./pages/Jobs";
import Hours from "./pages/Hours";
import Payments from "./pages/Payments";
import Invoices from "./pages/Invoices";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";

function AppRouter() {
  const location = useLocation();
  
  // CRITICAL: Check URL fragment (not query params) for session_id synchronously during render
  // This prevents race conditions by processing session_id BEFORE checking existing session_token
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }
  
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="jobs" element={<Jobs />} />
        <Route path="hours" element={<Hours />} />
        <Route path="payments" element={<Payments />} />
        <Route path="invoices" element={<Invoices />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AppRouter />
        <Toaster position="top-center" />
      </BrowserRouter>
    </div>
  );
}

export default App;
