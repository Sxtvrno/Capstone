import React, { useEffect, useState } from "react";
import { productAPI } from "../services/api";
import { useNavigate } from "react-router-dom";

function useStoreTemplates() {
  const mods = import.meta.glob("../components/StoreTemplate*.jsx", {
    eager: true,
  });
  return Object.entries(mods)
    .map(([p, mod]) => {
      const file = p.split("/").pop() || p;
      const key = file.replace(".jsx", "");
      const Component = mod.default || Object.values(mod)[0];
      return { key, Component };
    })
    .filter((t) => typeof t.Component === "function");
}

const LandingPage = ({ user, onLogin, onLogout }) => {
  const navigate = useNavigate();
  const templates = useStoreTemplates();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedKey] = useState(
    () =>
      localStorage.getItem("selectedTemplateKey") || templates[0]?.key || null
  );

  // Datos visuales guardados en CustomizeStore (localStorage)
  const storeName = localStorage.getItem("storeName") || "Mi Tienda";
  const headerColor = localStorage.getItem("headerColor") || "#111827";
  const logo = localStorage.getItem("logoPreview") || null;

  useEffect(() => {
    let isMounted = true;

    const loadProducts = async () => {
      setLoading(true);
      setError(null);
      try {
        // Usar endpoint público de productos (sin autenticación)
        const data = await productAPI.getPublicProducts({ limit: 100 });
        if (isMounted) {
          setProducts(data);
        }
      } catch (err) {
        console.error("Error cargando productos:", err);
        if (isMounted) {
          setError(err.response?.data?.detail || "Error al cargar productos");
          setProducts([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  const SelectedTemplate = selectedKey
    ? templates.find((t) => t.key === selectedKey)?.Component
    : null;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600">Cargando tienda...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-center space-y-4 max-w-md p-8 bg-white rounded-lg shadow-md">
          <svg
            className="w-16 h-16 text-red-500 mx-auto"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h2 className="text-2xl font-semibold text-gray-800">
            Error al cargar la tienda
          </h2>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!SelectedTemplate) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-center space-y-4 max-w-md p-8 bg-white rounded-lg shadow-md">
          <svg
            className="w-16 h-16 text-gray-400 mx-auto"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h1 className="text-2xl font-semibold text-gray-800">
            No hay plantilla seleccionada
          </h1>
          <p className="text-gray-600">
            Ve a Personalización y elige una plantilla para tu tienda.
          </p>
          {user && (
            <button
              onClick={() => navigate("/admin")}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Ir al Panel de Administración
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <SelectedTemplate
      storeName={storeName}
      headerColor={headerColor}
      logo={logo}
      products={products}
      user={user}
      onLogin={onLogin}
      onLogout={onLogout}
    />
  );
};

export default LandingPage;
