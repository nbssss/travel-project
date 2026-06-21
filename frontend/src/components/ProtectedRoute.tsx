import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/lib/auth";

// Strażnik tras: brak tokenu -> przekierowanie na /login.
export function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}
