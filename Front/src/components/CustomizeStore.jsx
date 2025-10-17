import React, { useMemo, useState, useEffect } from "react";
import TemplateGallery from "./TemplateGallery";
import { getProductos } from "../services/api";

// Descubre todas las plantillas StoreTemplate*.jsx
function useStoreTemplates() {
  const mods = import.meta.glob("./StoreTemplate*.jsx", { eager: true });
  const list = Object.entries(mods)
    .map(([path, mod]) => {
      const filename = path.split("/").pop();
      const key = filename.replace(".jsx", "");
      return {
        key,
        Component: mod.default,
        name: mod.default?.displayName || key,
      };
    })
    .filter((t) => typeof t.Component === "function");
  const map = Object.fromEntries(list.map((t) => [t.key, t]));
  return { list, map };
}

// Utilidad para asegurar contraste legible en el header
function getContrastColor(hex) {
  try {
    const rgb = parseInt(hex.slice(1), 16);
    const r = (rgb >> 16) & 0xff;
    const g = (rgb >> 8) & 0xff;
    const b = (rgb >> 0) & 0xff;
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;
    return luma > 128 ? "#000000" : "#ffffff";
  } catch {
    return "#000000";
  }
}

const CustomizeStore = () => {
  const { list, map } = useStoreTemplates();
  const [selectedKey, setSelectedKey] = useState(
    () => localStorage.getItem("selectedTemplateKey") || list[0]?.key || null
  );
  const [storeName, setStoreName] = useState(
    () => localStorage.getItem("storeName") || "Mi Tienda"
  );
  const [editingName, setEditingName] = useState(false);
  const [products, setProducts] = useState([]);
  const [templateType, setTemplateType] = useState("grid");
  const [showModal, setShowModal] = useState(false);

  // Estado para el logo
  const [logoPreview, setLogoPreview] = useState(
    () => localStorage.getItem("logoPreview") || null
  );

  // Estado para el color del header
  const [headerColor, setHeaderColor] = useState(
    () => localStorage.getItem("headerColor") || "#111827"
  );

  const headerTextColor = useMemo(
    () => getContrastColor(headerColor),
    [headerColor]
  );

  const SelectedTemplate = selectedKey ? map[selectedKey]?.Component : null;

  useEffect(() => {
    getProductos()
      .then((res) => {
        const data = res?.data ?? res ?? [];
        setProducts(data);
      })
      .catch((err) => console.error(err));
  }, []);

  const handleSave = () => {
    localStorage.setItem("selectedTemplateKey", selectedKey || "");
    localStorage.setItem("storeName", storeName);
    localStorage.setItem("logoPreview", logoPreview || "");
    localStorage.setItem("headerColor", headerColor);
    setShowModal(true);
    setTimeout(() => setShowModal(false), 2000);
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result;
      setLogoPreview(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleLogoRemove = () => {
    setLogoPreview(null);
  };

  return (
    <div className="w-full min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      {/* Header - Ahora con mejor responsive */}
      <header
        className="w-full flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-6 md:mb-8 rounded-xl shadow-sm px-4 py-3 md:px-6 md:py-4 border"
        style={{
          backgroundColor: headerColor,
          color: headerTextColor,
          borderColor: headerTextColor + "40",
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 min-w-0">
          {logoPreview && (
            <div className="relative flex-shrink-0">
              <img
                src={logoPreview}
                alt="Logo"
                className="h-10 w-10 md:h-12 md:w-12 rounded-lg object-cover border-2"
                style={{ borderColor: headerTextColor + "40" }}
              />
              <button
                onClick={handleLogoRemove}
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center hover:bg-red-600"
                title="Quitar logo"
              >
                ✕
              </button>
            </div>
          )}

          {/* Nombre de tienda editable */}
          {editingName ? (
            <input
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              onBlur={() => setEditingName(false)}
              onKeyDown={(e) => e.key === "Enter" && setEditingName(false)}
              autoFocus
              className="text-lg md:text-xl font-bold px-2 py-1 rounded border-2 min-w-0 flex-1"
              style={{
                backgroundColor: headerColor,
                color: headerTextColor,
                borderColor: headerTextColor,
              }}
            />
          ) : (
            <h1
              className="text-lg md:text-xl font-bold cursor-pointer hover:opacity-80 truncate"
              onClick={() => setEditingName(true)}
              title="Click para editar"
            >
              {storeName}
            </h1>
          )}
        </div>

        {/* Controles - Ahora en columna en mobile */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:ml-auto">
          <label
            className="px-3 py-2 rounded-lg font-medium cursor-pointer hover:opacity-90 transition text-center text-sm whitespace-nowrap"
            style={{
              backgroundColor: headerTextColor,
              color: headerColor,
            }}
          >
            {logoPreview ? "Cambiar Logo" : "Subir Logo"}
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
            />
          </label>

          <label
            className="flex items-center gap-2 px-3 py-2 rounded-lg font-medium cursor-pointer hover:opacity-90 transition text-sm whitespace-nowrap"
            style={{
              backgroundColor: headerTextColor,
              color: headerColor,
            }}
          >
            <span>Color</span>
            <input
              type="color"
              value={headerColor}
              onChange={(e) => setHeaderColor(e.target.value)}
              className="w-6 h-6 rounded border-0 cursor-pointer"
            />
          </label>
        </div>
      </header>

      <p className="text-gray-700 text-sm md:text-base mb-4 px-2">
        Aquí podrás cambiar el nombre, logo, colores y otros detalles visuales
        de tu tienda online.
      </p>

      {/* Zona de plantillas - Mejorado para resoluciones pequeñas */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
        {/* Panel de galería */}
        <aside className="flex flex-col gap-3 md:gap-4 order-2 xl:order-1">
          <h3 className="text-base md:text-lg text-gray-800 font-semibold px-2">
            Elige una plantilla
          </h3>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 md:p-4">
            <TemplateGallery
              templates={list}
              selectedKey={selectedKey}
              onSelect={(key) => {
                setSelectedKey(key);
                if (key) localStorage.setItem("selectedTemplateKey", key);
              }}
            />
          </div>
        </aside>

        {/* Panel de vista previa */}
        <main className="flex flex-col gap-3 md:gap-4 order-1 xl:order-2">
          <h3 className="text-base md:text-lg text-gray-800 font-semibold px-2">
            Vista previa
          </h3>
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            <div className="w-full h-[400px] md:h-[500px] lg:h-[600px] overflow-auto">
              {SelectedTemplate ? (
                <div className="transform scale-90 md:scale-95 lg:scale-100 origin-top-left">
                  <SelectedTemplate
                    key={selectedKey}
                    storeName={storeName}
                    logo={logoPreview}
                    headerColor={headerColor}
                    products={products}
                  />
                </div>
              ) : (
                <div className="p-4 md:p-8 text-gray-500 text-center">
                  Selecciona una plantilla en la galería para ver la vista
                  previa.
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Botón Guardar - Ahora fixed en mobile, absoluto en desktop */}
      <div className="fixed xl:absolute right-4 bottom-4 z-50">
        <button
          className="px-4 py-2.5 md:px-6 md:py-3 rounded-lg bg-green-600 text-white font-semibold shadow-lg hover:bg-green-700 transition text-sm md:text-base"
          onClick={handleSave}
        >
          💾 Guardar Cambios
        </button>
      </div>

      {/* Modal de confirmación - Mejorado responsive */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-4 md:p-6 max-w-sm w-full animate-[slideUp_0.3s_ease-out]">
            <div className="flex items-center gap-3 text-green-600">
              <svg
                className="w-8 h-8 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <h3 className="font-bold text-base md:text-lg">¡Guardado!</h3>
                <p className="text-sm text-gray-600">
                  Cambios aplicados correctamente
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default CustomizeStore;
