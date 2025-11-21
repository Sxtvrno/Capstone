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
import { authAPI } from "./services/api";
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

  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (authAPI?.isAuthenticated?.()) {
          const currentUser = authAPI.getCurrentUser();
          setUser(currentUser || null);
        }
      } catch (e) {
        console.error("Error verificando autenticación:", e);
        authAPI?.logout?.();
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const handleLogin = (userData) => setUser(userData);
  const handleLogout = () => {
    authAPI?.logout?.();
    setUser(null);
  };

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

  const storeName = localStorage.getItem("storeName") || "Mi Tienda";
  const logo = localStorage.getItem("logoPreview") || null;
  const headerColor = localStorage.getItem("headerColor") || "#111827";

  return (
    <CartProvider>
      <Router>
        <Routes>
          <Route
            element={
              <PublicLayout
                storeName={storeName}
                logo={logo}
                headerColor={headerColor}
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
