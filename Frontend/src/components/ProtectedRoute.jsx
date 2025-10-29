import { Navigate } from "react-router-dom";
import { authAPI } from "../services/api";

const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const isAuthenticated = authAPI.isAuthenticated();
  const isAdmin = authAPI.isAdmin();

  // Si requiere admin y no está autenticado, redirigir al login
  if (requireAdmin && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Si requiere admin y el usuario no es admin, redirigir al inicio
  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  // Si solo requiere autenticación y no está autenticado
  if (!requireAdmin && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
