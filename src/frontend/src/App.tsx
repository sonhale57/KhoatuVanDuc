import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import React from "react";
import DashboardLayout from "@/components/DashboardLayout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Users from "@/pages/Users";
import Retreats from "@/pages/Retreats";
import Members from "@/pages/Members";
import Beds from "@/pages/Beds";
import Registrations from "@/pages/Registrations";
import Events from "@/pages/Events";
import MobileApp from "@/pages/MobileApp";

// Protected Route wrapper component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = localStorage.getItem("user");
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

import { ToastProvider } from "@/hooks/useToast";

function App() {
  return (
    <ToastProvider>
      <Router>
        <Routes>
        {/* Public Route */}
        <Route path="/login" element={<Login />} />

        {/* Mobile PWA App routes (public / protected) */}
        <Route path="/mobile" element={<MobileApp />} />
        <Route path="/qr" element={<MobileApp />} />

        {/* Protected Routes wrapped in DashboardLayout */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Dashboard />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/users"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Users />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/retreats"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Retreats />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/members"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Members />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/beds"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Beds />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/registrations"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Registrations />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/events"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Events />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* Fallback Catch-All */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  </ToastProvider>
  );
}

export default App;
