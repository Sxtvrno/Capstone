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

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full">
      {templates.map(({ key, name }) => {
        const isActive = key === selectedKey;
        return (
          <button
            key={key}
            onClick={() => onSelect?.(key)}
            className={`flex flex-col border rounded-lg p-4 text-left cursor-pointer transition-shadow duration-150 ease-in-out 
              ${
                isActive
                  ? "border-blue-500 shadow-lg"
                  : "border-gray-300 hover:shadow-md"
              }`}
            aria-pressed={isActive}
            title={name}
          >
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold">{name}</span>
              {isActive && (
                <span className="text-xs bg-blue-100 text-blue-600 rounded-full px-2">
                  Activa
                </span>
              )}
            </div>
            <div className="text-gray-600 text-sm">
              <span className="opacity-90">Click para seleccionar</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function humanizeName(key) {
  // StoreTemplateA => "Store Template A"
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/Store Template/i, "Store Template")
    .trim();
}
