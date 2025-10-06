import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import Sidebar from "./components/SideBar";
import ProductList from "./components/ProductList";
import ProductForm from "./components/ProductForm";
import CustomizeStore from "./components/CustomizeStore";
import AuthForm from "./components/AuthForm";
import MediaManager from "./components/MediaManager";
import LandingPage from "./pages/LandingPage";
import AdminPage from "./pages/AdminPage";

const initialProducts = [
  { id: 1, name: "Producto 1" },
  { id: 2, name: "Producto 2" },
];

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [products, setProducts] = useState(initialProducts);

  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsAuthenticated(!!token);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsAuthenticated(false);
  };

  const handleAuth = () => {
    setIsAuthenticated(true);
  };

  const handleDelete = (id) => {
    setProducts(products.filter((p) => p.id !== id));
  };

  return (
    <Router>
      <AppRoutes
        isAuthenticated={isAuthenticated}
        onAuth={handleAuth}
        onLogout={handleLogout}
        products={products}
        onDelete={handleDelete}
      />
    </Router>
  );
}

function AppRoutes({ isAuthenticated, onAuth, onLogout, products, onDelete }) {
  const location = useLocation();
  const isAdminPath = location.pathname.startsWith("/admin");

  if (isAdminPath && !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <AuthForm onAuth={onAuth} />
      </div>
    );
  }

  if (isAdminPath) {
    return (
      <div className="flex min-h-screen items-stretch">
        <Sidebar onLogout={onLogout} />
        <main className="flex-1 ml-64 p-8 bg-gray-50 min-h-screen">
          <Routes>
            <Route
              path="/admin"
              element={<Navigate to="/admin/productos" replace />}
            />
            <Route
              path="/admin/productos"
              element={<ProductList products={products} onDelete={onDelete} />}
            />
            <Route path="/admin/productos/nuevo" element={<ProductForm />} />
            <Route path="/admin/media" element={<MediaManager />} />
            <Route path="/admin/personaliza" element={<CustomizeStore />} />
            <Route path="/admin/panel" element={<AdminPage />} />
            <Route
              path="*"
              element={<Navigate to="/admin/productos" replace />}
            />
          </Routes>
        </main>
      </div>
    );
  }

  // Rutas públicas
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/login"
        element={
          isAuthenticated ? (
            <Navigate to="/admin" replace />
          ) : (
            <div className="flex min-h-screen items-center justify-center bg-gray-100">
              <AuthForm onAuth={onAuth} />
            </div>
          )
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
