import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Sidebar from "./components/SideBar";
import ProductList from "./components/ProductList";
import ProductForm from "./components/ProductForm";
import CustomizeStore from "./components/CustomizeStore";
import AuthForm from "./components/AuthForm";

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
        <main className="flex-1 ml-64 p-8 bg-gray-50 min-h-screen">
          <Routes>
            <Route path="/" element={<AuthForm />} />
            <Route
              path="/productos"
              element={
                <ProductList products={products} onDelete={handleDelete} />
              }
            />
            <Route path="/productos/nuevo" element={<ProductForm />} />
            <Route path="/personaliza" element={<CustomizeStore />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
