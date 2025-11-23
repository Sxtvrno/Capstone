import React, { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
import TemplateNavbar from "./components/TemplateNavbar";
import LandingPage from "./pages/LandingPage";
import AdminPage from "./pages/AdminPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import SearchPage from "./pages/SearchPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import VerificationPage from "./pages/VerificationPage";
import CheckoutPage from "./pages/CheckoutPage";
import ProtectedRoute from "./components/ProtectedRoute";
import ChatWidget from "./components/ChatWidget";
import { authAPI, getStoreConfig } from "./services/api";
import { CartProvider } from "./contexts/CartContext";
import PaymentReturn from "./pages/PaymentReturn";
import OrdersPage from "./pages/OrdersPage";

function PublicLayout({ storeName, logo, headerColor }) {
  return (
    <>
      <TemplateNavbar
        storeName={storeName}
        logo={logo}
        headerColor={headerColor}
        className="w-full"
      />
      <Outlet />
      {/* Chatbot disponible en todas las páginas públicas */}
      <ChatWidget />
    </>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [storeCfg, setStoreCfg] = useState({
    store_name: "Mi Tienda",
    logo_url: null,
    header_color: "#111827",
  });

  useEffect(() => {
    const init = async () => {
      try {
        if (authAPI?.isAuthenticated?.()) {
          setUser(authAPI.getCurrentUser() || null);
        }
        // cargar config tienda
        try {
          const cfg = await getStoreConfig();
          setStoreCfg(cfg);
        } catch {}
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    const onCfgUpdated = async () => {
      try {
        const cfg = await getStoreConfig();
        setStoreCfg(cfg);
      } catch {}
    };
    window.addEventListener("store-config-updated", onCfgUpdated);
    return () =>
      window.removeEventListener("store-config-updated", onCfgUpdated);
  }, []);

  // Recarga dura si cambia token en otra pestaña / login externo
  useEffect(() => {
    const onStorage = (e) => {
      if (["token", "accessToken", "authToken"].includes(e.key)) {
        window.location.reload();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    window.location.reload(); // fuerza estado limpio
  };

  const handleLogout = () => {
    try {
      authAPI?.logout?.(); // si internamente no limpia, seguimos abajo
    } catch {}
    // Elimina todas las variantes posibles
    localStorage.removeItem("token");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("authToken");
    localStorage.removeItem("auth");
    // Si guardaste usuario en otro lado, elimínalo también
    // Redirección dura (evita quedarse en /admin)
    window.location.replace("/login");
    // Opcional: si quieres además asegurar recarga total (normalmente replace ya recarga)
    // setTimeout(() => window.location.reload(), 50);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (!authAPI?.isAuthenticated?.()) {
        if (user) {
          window.location.replace("/login");
        }
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [user]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <CartProvider>
      <Router>
        <Routes>
          <Route
            element={
              <PublicLayout
                storeName={storeCfg.store_name}
                logo={storeCfg.logo_url}
                headerColor={storeCfg.header_color}
              />
            }
          >
            <Route
              path="/"
              element={
                <LandingPage
                  user={user}
                  onLogin={handleLogin}
                  onLogout={handleLogout}
                />
              }
            />
            <Route path="/product/:id" element={<ProductDetailPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/verify-email" element={<VerificationPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/payment/return" element={<PaymentReturn />} />
            <Route
              path="/login"
              element={
                user ? (
                  <Navigate to="/" replace />
                ) : (
                  <LoginPage onLogin={handleLogin} />
                )
              }
            />
            <Route
              path="/register"
              element={user ? <Navigate to="/" replace /> : <RegisterPage />}
            />
          </Route>

          {/* Admin sin Navbar */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requireAdmin={true}>
                <AdminPage user={user} onLogout={handleLogout} />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </CartProvider>
  );
}

export default App;
