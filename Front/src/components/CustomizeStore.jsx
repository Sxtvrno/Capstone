import React, { useMemo, useState, useEffect } from "react";
import TemplateGallery from "./TemplateGallery";
import { getProductos } from "../services/api";

// Descubre todas las plantillas StoreTemplate*.jsx
function useStoreTemplates() {
  const mods = import.meta.glob("./StoreTemplate*.jsx", { eager: true });
  const list = Object.entries(mods)
    .map(([path, mod]) => {
      const file = path.split("/").pop() || path;
      const key = file.replace(".jsx", "");
      const Component = mod.default || Object.values(mod)[0];
      return { key, Component };
    })
    .filter((t) => typeof t.Component === "function");
  const map = Object.fromEntries(list.map((t) => [t.key, t]));
  return { list, map };
}

// Utilidad para asegurar contraste legible en el header
function getContrastColor(hex) {
  try {
    if (!hex) return "#111827";
    let c = hex.trim().replace("#", "");
    if (c.length === 3)
      c = c
        .split("")
        .map((ch) => ch + ch)
        .join("");
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    if ([r, g, b].some((n) => Number.isNaN(n))) return "#111827";
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 128 ? "#111827" : "#ffffff";
  } catch {
    return "#111827";
  }
}

const CustomizeStore = () => {
  const { list, map } = useStoreTemplates();
  const [selectedKey, setSelectedKey] = useState(() => list[0]?.key || null);
  const [storeName, setStoreName] = useState(
    () => sessionStorage.getItem("storeName") || "Mi Tienda"
  );
  const [editingName, setEditingName] = useState(false);
  const [products, setProducts] = useState([]);
  const [templateType, setTemplateType] = useState("grid");
  const [showModal, setShowModal] = useState(false);

  // NUEVO: estado para el logo
  const [logoPreview, setLogoPreview] = useState(
    () => sessionStorage.getItem("logoPreview") || null
  );

  // NUEVO: headerColor como estado (antes era const)
  const [headerColor, setHeaderColor] = useState(
    () => sessionStorage.getItem("headerColor") || "#ffffff"
  );

  // Guardar el nombre en sessionStorage cuando cambie
  React.useEffect(() => {
    sessionStorage.setItem("storeName", storeName);
  }, [storeName]);

  // SVG como logo predeterminado
  const DefaultLogoSVG = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="#222"
      className="w-14 h-14 rounded-full object-cover border border-gray-300 cursor-pointer bg-white"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z"
      />
    </svg>
  );

  // Nueva función para guardar cambios en sessionStorage
  const handleSave = () => {
    sessionStorage.setItem("storeName", storeName);
    sessionStorage.setItem("logoPreview", logoPreview || "");
    sessionStorage.setItem("headerColor", headerColor);
    alert("¡Cambios guardados correctamente!");
  };

  // Recuperar color y logo al cargar
  useEffect(() => {
    const savedColor = sessionStorage.getItem("headerColor");
    if (savedColor) setHeaderColor(savedColor);
    const savedLogo = sessionStorage.getItem("logoPreview");
    if (savedLogo) setLogoPreview(savedLogo);
  }, []);

  // Si quieres persistir automáticamente cuando cambie el logo/color:
  // useEffect(() => sessionStorage.setItem("logoPreview", logoPreview || ""), [logoPreview]);
  // useEffect(() => sessionStorage.setItem("headerColor", headerColor), [headerColor]);

  useEffect(() => {
    getProductos()
      .then((res) => setProducts(res.data))
      .catch(() => setProducts([]));
  }, []);

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setLogoPreview(reader.result); // Data URL para previsualizar y guardar
      reader.readAsDataURL(file);
    }
  };

  const headerTextColor = getContrastColor(headerColor);
  const SelectedTemplate = selectedKey ? map[selectedKey]?.Component : null;

  return (
    <div className="w-full p-8">
      {/* Header tipo barra de búsqueda */}
      <header
        className="w-full flex flex-wrap items-center gap-4 mb-8 rounded-xl shadow px-6 py-4 border"
        style={{
          backgroundColor: headerColor,
          color: headerTextColor,
          borderColor: headerTextColor,
        }}
      >
        {logoPreview ? (
          <div className="relative">
            <img
              src={logoPreview}
              alt="Logo preview"
              className="w-14 h-14 rounded-full object-cover border border-gray-300"
            />
            {/* Botón para quitar logo */}
            <button
              className="absolute top-0 right-0 bg-red-500 text-white rounded-full px-2 py-1 text-xs"
              style={{ transform: "translate(40%,-40%)" }}
              onClick={(e) => {
                e.stopPropagation();
                setLogoPreview(null);
                sessionStorage.removeItem("logoPreview");
              }}
              title="Quitar logo"
            >
              ×
            </button>
          </div>
        ) : (
          <div
            className="relative group cursor-pointer"
            onClick={() => setShowModal(true)}
          >
            {DefaultLogoSVG}
            {/* Icono editar al hacer hover solo con logo predeterminado */}
            <span
              className="absolute inset-0 flex items-center justify-center rounded-full"
              style={{ pointerEvents: "none" }}
            >
              <span
                className="opacity-0 group-hover:opacity-100 transition duration-200 absolute inset-0 rounded-full flex items-center justify-center"
                style={{
                  pointerEvents: "auto",
                  background: "rgba(128,128,128,0.3)",
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-8 h-8 text-white drop-shadow"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                  />
                </svg>
              </span>
            </span>
          </div>
        )}
        <div className="flex-1 flex items-center">
          {editingName ? (
            <input
              type="text"
              className="border border-gray-300 rounded-full px-5 py-3 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-blue-200 w-full"
              value={storeName}
              autoFocus
              onChange={(e) => setStoreName(e.target.value)}
              onBlur={() => setEditingName(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter") setEditingName(false);
              }}
            />
          ) : (
            <h2 className="text-lg font-semibold px-2 py-1 w-full truncate flex items-center">
              <span className="truncate">{storeName}</span>
              <button
                className="ml-2 p-1 rounded hover:bg-gray-200 transition"
                onClick={() => setEditingName(true)}
                title="Editar nombre"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6 text-gray-500"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                  />
                </svg>
              </button>
            </h2>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium" style={{ color: headerTextColor }}>
            Color
          </span>
          <input
            type="color"
            className="w-10 h-10 rounded-full border border-gray-300 cursor-pointer appearance-none custom-color-circle"
            value={headerColor}
            onChange={(e) => setHeaderColor(e.target.value)}
            style={{
              background: "none",
              borderRadius: "50%",
              padding: 0,
              WebkitAppearance: "none",
              MozAppearance: "none",
              appearance: "none",
              width: "2.5rem",
              height: "2.5rem",
              border: "2px solid #d1d5db",
              cursor: "pointer",
              boxShadow: "0 0 0 2px #fff inset",
            }}
          />
          <style>{`
            input[type='color'].custom-color-circle {
              border-radius: 50%;
              overflow: hidden;
            }
            input[type='color'].custom-color-circle::-webkit-color-swatch-wrapper {
              padding: 0;
              border-radius: 50%;
            }
            input[type='color'].custom-color-circle::-webkit-color-swatch {
              border-radius: 50%;
              border: none;
            }
            input[type='color'].custom-color-circle::-moz-color-swatch {
              border-radius: 50%;
              border: none;
            }
            input[type='color'].custom-color-circle::-moz-focus-inner {
              border: none;
            }
          `}</style>
        </div>
        {/* Botón eliminado, ahora el logo es clickeable para subir */}
        {/* Modal para subir logo */}
        {showModal && (
          <div
            className="fixed inset-0 flex items-center justify-center z-50"
            style={{ background: "rgba(0,0,0,0.05)" }}
          >
            <div className="bg-white rounded-xl p-6 shadow-lg flex flex-col items-center gap-4">
              <h2 className="text-lg font-bold mb-2">Sube tu logo</h2>
              <label
                htmlFor="logo-upload"
                className="cursor-pointer flex flex-col items-center"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-16 h-16 mb-2 text-blue-500 transition duration-200 hover:scale-110 hover:text-blue-700"
                  style={{
                    boxShadow: "0 0 0 2px #3b82f6, 0 2px 8px rgba(0,0,0,0.08)",
                  }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
                  />
                </svg>
                <span className="text-sm text-gray-500 mt-1">
                  Haz clic en el ícono para subir tu logo
                </span>
              </label>
              <input
                id="logo-upload"
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => {
                  handleLogoChange(e);
                  setShowModal(false);
                }}
              />
              <button
                className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
                onClick={() => setShowModal(false)}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </header>
      <p className="text-gray-700 mb-1">
        Aquí podrás cambiar el nombre, logo, colores y otros detalles visuales
        de tu tienda online.
      </p>

      {/* Zona de plantillas (galería + vista previa) */}
      <div style={styles.page}>
        <aside style={styles.leftPane}>
          <h3 className="text-gray-800 font-semibold">Elige una plantilla</h3>
          <TemplateGallery
            /* Pasamos la lista descubierta dinámicamente */
            templates={list}
            /* Intentamos soportar distintas convenciones de props */
            selectedKey={selectedKey}
            selected={selectedKey}
            onSelect={(key) => setSelectedKey(key)}
            onSelectTemplate={(key) => setSelectedKey(key)}
          />
        </aside>

        <main style={styles.rightPane}>
          <h3 className="text-gray-800 font-semibold">Vista previa</h3>
          <div style={styles.preview}>
            {SelectedTemplate ? (
              <SelectedTemplate
                key={selectedKey}
                /* Props útiles que las plantillas pueden usar si lo desean */
                storeName={storeName}
                logo={logoPreview}
                headerColor={headerColor}
                products={products}
              />
            ) : (
              <div style={styles.empty}>
                Selecciona una plantilla en la galería para ver la vista previa.
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Botón Guardar Cambios abajo a la derecha */}
      <div
        style={{
          position: "fixed",
          right: "2rem",
          bottom: "2rem",
          zIndex: 100,
        }}
      >
        <button
          className="px-6 py-3 rounded bg-green-600 text-white font-semibold shadow-lg hover:bg-green-700 transition"
          onClick={handleSave}
        >
          Guardar Cambios
        </button>
      </div>
      {/* ...existing code... */}
    </div>
  );
};

const styles = {
  page: {
    display: "grid",
    gridTemplateColumns: "360px 1fr",
    gap: 16,
    padding: 16,
    height: "100%",
    boxSizing: "border-box",
  },
  leftPane: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    minWidth: 280,
  },
  rightPane: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    minWidth: 0,
  },
  h2: { margin: 0, fontSize: 16, fontWeight: 600 },
  preview: {
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    background: "#fff",
    minHeight: 400,
    padding: 8,
    overflow: "auto",
  },
  empty: {
    padding: 12,
    color: "#475569",
  },
};

export default CustomizeStore;
