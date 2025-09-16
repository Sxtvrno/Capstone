import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import ProductForm from "./components/ProductForm";
import ProductList from "./components/ProductList";
import AuthForm from "./components/AuthForm"; // Asegúrate de tener este componente

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

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

  // Si no está autenticado, muestra solo el formulario de autenticación
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <AuthForm onAuth={handleAuth} />
      </div>
    );
  }

  // Si está autenticado, muestra la app normal
  return (
    <Router>
      <div className="flex min-h-screen items-stretch">
        <Sidebar onLogout={handleLogout} />
        <main className="flex-1 bg-gray-100 p-6">
          <Routes>
            <Route path="/" element={<ProductForm />} />
            <Route path="/productos" element={<ProductList />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
