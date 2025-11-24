import React, { useMemo } from "react";

export default function TemplateGallery({ selectedKey, onSelect }) {
  const templates = useMemo(() => {
    const modules = import.meta.glob("./StoreTemplate*.jsx", { eager: true });
    return Object.entries(modules)
      .map(([path, mod]) => {
        const file = path.split("/").pop() || path;
        const key = file.replace(".jsx", "");
        const Component = mod.default || Object.values(mod)[0];
        return {
          key,
          name: humanizeName(key),
          Component,
        };
      })
      .filter((t) => typeof t.Component === "function")
      .sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  if (!templates.length) {
    return (
      <div className="p-4 border-dashed border rounded-lg text-gray-700 bg-gray-100">
        No se encontraron plantillas.
      </div>
    );
  }

  const selectedTemplate = templates.find((t) => t.key === selectedKey);

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Selecciona una plantilla
      </label>
      <select
        value={selectedKey || ""}
        onChange={(e) => onSelect?.(e.target.value)}
        className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base font-medium text-gray-900 hover:border-gray-400 transition-colors cursor-pointer"
      >
        {!selectedKey && (
          <option value="" disabled>
            -- Elige una plantilla --
          </option>
        )}
        {templates.map(({ key, name }) => (
          <option key={key} value={key}>
            {name}
          </option>
        ))}
      </select>

      {selectedTemplate && (
        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 text-sm">
            <svg
              className="w-5 h-5 text-blue-600 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span className="font-semibold text-blue-900">
              Plantilla activa: {selectedTemplate.name}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function humanizeName(key) {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/Store Template/i, "Store Template")
    .trim();
}
