import React, { useState, useEffect } from "react";
import AuthForm from "./components/AuthForm";
import ProductList from "./components/ProductList";
import ProductForm from "./components/ProductForm";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsAuthenticated(!!token);
  }, []);

  // Función para cerrar sesión y limpiar token
  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsAuthenticated(false);
  };

  // Función para manejar errores de autenticación (ejemplo)
  const handleAuthError = (error) => {
    if (error?.response?.status === 401) {
      handleLogout();
    }
  };

  const handleAuth = () => {
    setIsAuthenticated(true);
  };

  return (
    <div className="App">
      {isAuthenticated ? (
        <>
          <button
            onClick={handleLogout}
            className="fixed top-4 right-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition font-semibold shadow"
          >
            Cerrar sesión
          </button>
          <ProductList onAuthError={handleAuthError} />
          <ProductForm onAuthError={handleAuthError} />
        </>
      ) : (
        <AuthForm onAuth={handleAuth} />
      )}
    </div>
  );
}

export default App;
