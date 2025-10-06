import React, { useEffect, useState } from "react";
import { getProductos } from "../services/api";

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

const LandingPage = () => {
  const templates = useStoreTemplates();
  const [products, setProducts] = useState([]);
  const [selectedKey, setSelectedKey] = useState(
    () =>
      localStorage.getItem("selectedTemplateKey") || templates[0]?.key || null
  );

  // Datos visuales guardados en CustomizeStore (sessionStorage)
  const storeName = sessionStorage.getItem("storeName") || "Mi Tienda";
  const headerColor = sessionStorage.getItem("headerColor") || "#111827";
  const logo = sessionStorage.getItem("logoPreview") || null;

  useEffect(() => {
    getProductos()
      .then((res) => setProducts(res.data || []))
      .catch(() => setProducts([]));
  }, []);

  const SelectedTemplate = selectedKey
    ? templates.find((t) => t.key === selectedKey)?.Component
    : null;

  if (!SelectedTemplate) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-semibold">
            No hay plantilla seleccionada
          </h1>
          <p className="text-gray-600">
            Ve a Personalización y elige una plantilla.
          </p>
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
    />
  );
};

export default LandingPage;
