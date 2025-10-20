import React, { useState } from "react";
import TemplateNavbar from "../components/TemplateNavbar";
import ProductSearch from "../components/ProductSearch";
import ProductGrid from "../components/ProductGrid";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [categoryIds, setCategoryIds] = useState([]); // <-- nuevo estado

  // Seguir la lógica de StoreTemplateA: tomar storeName, logo y headerColor desde localStorage (si existen)
  const storeName = localStorage.getItem("storeName") || "Mi Tienda";
  const logo = localStorage.getItem("logoPreview") || null;
  const headerColor = localStorage.getItem("headerColor") || "#111827";

  const handleSelect = (producto) => {
    console.log("Producto seleccionado:", producto);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="w-full">
        <TemplateNavbar
          storeName={storeName}
          logo={logo}
          headerColor={headerColor}
          className="w-full"
        />
      </header>

      <main className="flex-1 pt-4 md:pt-6 pb-8 w-full">
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <div className="mb-6">
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <ProductSearch
                onSearch={(q) => setQuery(q)}
                onFilterChange={({ query: q, categories }) => {
                  setQuery(q ?? "");
                  setCategoryIds(Array.isArray(categories) ? categories : []);
                }}
                placeholder="Buscar por nombre, SKU o descripción..."
              />
            </div>
          </div>

          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">
                Resultados
              </h2>
              <p className="text-sm text-gray-500 hidden sm:block">
                Buscando:{" "}
                <span className="font-medium text-gray-700">
                  {query || "todos"}
                </span>
              </p>
            </div>

            <div className="bg-transparent">
              <ProductGrid
                searchQuery={query}
                categoryIds={categoryIds}
                onSelect={handleSelect}
              />
            </div>
          </section>
        </div>
      </main>

      <footer className="w-full border-t border-gray-100 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-3 text-xs text-gray-500">
          © {new Date().getFullYear()} {storeName}
        </div>
      </footer>
    </div>
  );
}
