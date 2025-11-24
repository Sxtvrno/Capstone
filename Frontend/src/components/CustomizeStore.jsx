import React, { useMemo, useState, useEffect } from "react";
import TemplateGallery from "./TemplateGallery";
import { getProductos, getStoreConfig } from "../services/api";
import { updateStoreConfig } from "../services/api";

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
  const [storeName, setStoreName] = useState(() =>
    localStorage.getItem("storeName")
  );
  const [editingName, setEditingName] = useState(false);
  const [products, setProducts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [logoPreview, setLogoPreview] = useState(null);
  const [showLogoModal, setShowLogoModal] = useState(false);
  const [tempLogoUrl, setTempLogoUrl] = useState("");
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

    getStoreConfig()
      .then((cfg) => {
        setStoreName(cfg.store_name);
        setLogoPreview(cfg.logo_url || null);
        setHeaderColor(cfg.header_color || "#111827");
      })
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    try {
      const token =
        localStorage.getItem("token") ||
        localStorage.getItem("accessToken") ||
        localStorage.getItem("authToken") ||
        null;

      await updateStoreConfig(
        {
          store_name: storeName,
          logo_url: logoPreview,
          header_color: headerColor,
        },
        token
      );

      setShowModal(true);
      window.dispatchEvent(new Event("store-config-updated"));
      setTimeout(() => setShowModal(false), 1800);
    } catch (e) {
      console.error(e);
      setShowModal(true);
      setTimeout(() => setShowModal(false), 2000);
    }
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      {/* Header compacto */}
      <header
        className="w-full mb-6 rounded-xl shadow-md px-4 py-3 md:px-6 md:py-4 border-2"
        style={{
          backgroundColor: headerColor,
          color: headerTextColor,
          borderColor: headerTextColor + "40",
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          {/* Logo y nombre */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {logoPreview && (
              <img
                src={logoPreview}
                alt="Logo"
                className="h-10 w-10 md:h-12 md:w-12 rounded-lg object-cover border-2 flex-shrink-0"
                style={{ borderColor: headerTextColor + "40" }}
              />
            )}

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

          {/* Controles compactos */}
          <div className="flex gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => {
                setTempLogoUrl(logoPreview || "");
                setShowLogoModal(true);
              }}
              className="px-3 py-2 rounded-lg shadow-sm border text-xs font-semibold uppercase transition hover:scale-105 flex items-center gap-2"
              style={{
                backgroundColor: headerTextColor,
                color: headerColor,
                borderColor: headerColor + "30",
              }}
            >
              {logoPreview ? (
                <>
                  <span className="hidden sm:inline">Cambiar Logo</span>
                  <span className="sm:hidden">Logo</span>
                  <span className="inline-block h-5 w-5 rounded overflow-hidden border">
                    <img
                      src={logoPreview}
                      alt="Logo"
                      className="h-full w-full object-cover"
                    />
                  </span>
                </>
              ) : (
                "Agregar Logo"
              )}
            </button>

            <label
              className="flex items-center gap-2 px-3 py-2 rounded-lg font-medium cursor-pointer shadow-sm border hover:scale-105 transition"
              style={{
                backgroundColor: headerTextColor,
                color: headerColor,
                borderColor: headerColor + "30",
              }}
            >
              <span className="text-xs uppercase tracking-wide hidden sm:inline">
                Color
              </span>
              <input
                type="color"
                value={headerColor}
                onChange={(e) => setHeaderColor(e.target.value)}
                className="w-8 h-8 rounded-md border cursor-pointer"
              />
            </label>
          </div>
        </div>
      </header>

      {/* Layout principal: Sidebar compacto + Vista previa grande */}
      <div className="flex flex-col lg:flex-row gap-4 md:gap-6">
        {/* Sidebar de controles */}
        <aside className="lg:w-80 xl:w-96 flex flex-col gap-4 order-2 lg:order-1">
          {/* Dropdown de plantillas */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4">
            <TemplateGallery
              selectedKey={selectedKey}
              onSelect={(key) => {
                setSelectedKey(key);
                if (key) localStorage.setItem("selectedTemplateKey", key);
              }}
            />
          </div>

          {/* Instrucciones */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <svg
                className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="text-sm text-blue-900">
                <p className="font-semibold mb-1">Personaliza tu tienda</p>
                <ul className="space-y-1 text-blue-800 text-xs">
                  <li>• Selecciona una plantilla</li>
                  <li>• Edita el nombre haciendo click</li>
                  <li>• Agrega tu logo por URL</li>
                  <li>• Elige el color del header</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Botón guardar */}
          <button
            className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-green-600 to-green-700 text-white font-bold shadow-lg hover:shadow-xl hover:from-green-700 hover:to-green-800 transition-all transform hover:scale-[1.02] active:scale-[0.98] text-sm md:text-base"
            onClick={handleSave}
          >
            💾 Guardar Cambios
          </button>
        </aside>

        {/* Vista previa expandida */}
        <main className="flex-1 order-1 lg:order-2">
          <div className="bg-white border-2 border-gray-200 rounded-xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-gray-100 to-gray-200 px-4 py-2 border-b-2 border-gray-300">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-red-500"></span>
                  <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                  <span className="w-3 h-3 rounded-full bg-green-500"></span>
                </div>
                <span className="text-xs font-mono text-gray-600 ml-3">
                  Vista previa en vivo
                </span>
              </div>
            </div>
            <div className="w-full h-[500px] md:h-[600px] lg:h-[700px] xl:h-[800px] overflow-auto bg-gray-50">
              {SelectedTemplate ? (
                <SelectedTemplate
                  key={selectedKey}
                  storeName={storeName}
                  logo={logoPreview}
                  headerColor={headerColor}
                  products={products}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center p-8">
                    <svg
                      className="w-20 h-20 mx-auto text-gray-300 mb-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
                      />
                    </svg>
                    <p className="text-gray-500 text-lg font-medium">
                      Selecciona una plantilla para ver la vista previa
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Modal de confirmación */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full animate-scale-in">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-lg text-gray-900">
                  ¡Guardado exitoso!
                </h3>
                <p className="text-sm text-gray-600">
                  Los cambios se aplicaron correctamente
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Logo URL */}
      {showLogoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 relative animate-scale-in">
            <h2 className="text-xl font-bold mb-4 text-gray-900">
              Configurar Logo
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL de la imagen
                </label>
                <input
                  type="text"
                  placeholder="https://ejemplo.com/mi-logo.png"
                  value={tempLogoUrl}
                  onChange={(e) => setTempLogoUrl(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              {tempLogoUrl && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <span className="text-xs text-gray-600 flex-1 truncate">
                    Vista previa:
                  </span>
                  <div className="h-16 w-16 rounded-lg overflow-hidden border-2 border-gray-300 bg-white flex items-center justify-center">
                    <img
                      src={tempLogoUrl}
                      alt="Preview"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowLogoModal(false);
                  setTempLogoUrl("");
                }}
                className="flex-1 px-4 py-2.5 rounded-lg bg-gray-200 text-gray-700 font-medium hover:bg-gray-300 transition"
              >
                Cancelar
              </button>
              {logoPreview && (
                <button
                  onClick={() => {
                    setLogoPreview(null);
                    setTempLogoUrl("");
                    setShowLogoModal(false);
                  }}
                  className="px-4 py-2.5 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition"
                >
                  Quitar
                </button>
              )}
              <button
                onClick={() => {
                  setLogoPreview(tempLogoUrl.trim() || null);
                  setShowLogoModal(false);
                }}
                disabled={!tempLogoUrl.trim()}
                className={`px-4 py-2.5 rounded-lg font-medium transition ${
                  tempLogoUrl.trim()
                    ? "bg-green-600 text-white hover:bg-green-700"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
              >
                Aplicar
              </button>
            </div>
            <button
              onClick={() => setShowLogoModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
              aria-label="Cerrar"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scale-in {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
        .animate-scale-in {
          animation: scale-in 0.25s ease-out;
        }
      `}</style>
    </div>
  );
};

export default CustomizeStore;
