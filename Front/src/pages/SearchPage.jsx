import React, { useState, useEffect } from "react";
import TemplateNavbar from "../components/TemplateNavbar";
import ProductSearch from "../components/ProductSearch";
import ProductGrid from "../components/ProductGrid";
import { getCategorias } from "../services/api";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Seguir la lógica de StoreTemplateA: tomar storeName, logo y headerColor desde localStorage (si existen)
  const storeName = localStorage.getItem("storeName") || "Mi Tienda";
  const logo = localStorage.getItem("logoPreview") || null;
  const headerColor = localStorage.getItem("headerColor") || "#111827";

  // Cargar categorías desde la API
  useEffect(() => {
    const fetchCategorias = async () => {
      try {
        const response = await getCategorias();
        const list = response?.data ?? response ?? [];
        setCategories(list);
      } catch (err) {
        console.error("Error cargando categorías:", err);
        setCategories([]);
      } finally {
        setLoading(false);
      }
    };
    fetchCategorias();
  }, []);

  const handleSelect = (producto) => {
    console.log("Producto seleccionado:", producto);
  };

  const handleSearch = (searchQuery) => {
    setQuery(searchQuery);
  };

  const handleCategoryChange = (categoryId) => {
    setSelectedCategory(categoryId);
  };

  // Obtener el nombre de la categoría seleccionada
  const getSelectedCategoryName = () => {
    if (!selectedCategory) return null;
    const cat = categories.find((c) => c.id === selectedCategory);
    return cat ? cat.name : null;
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
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-gray-500 text-sm">
                    Cargando categorías...
                  </div>
                </div>
              ) : (
                <ProductSearch
                  onSearch={handleSearch}
                  onCategoryChange={handleCategoryChange}
                  categories={categories}
                  placeholder="Buscar por nombre, SKU o descripción..."
                />
              )}
            </div>
          </div>

          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">
                Resultados
              </h2>
              <p className="text-sm text-gray-500 hidden sm:block">
                {getSelectedCategoryName() ? (
                  <>
                    Categoría:{" "}
                    <span className="font-medium text-gray-700">
                      {getSelectedCategoryName()}
                    </span>
                  </>
                ) : (
                  <>
                    Buscando:{" "}
                    <span className="font-medium text-gray-700">
                      {query || "todos"}
                    </span>
                  </>
                )}
              </p>
            </div>

            <div className="bg-transparent">
              <ProductGrid
                searchQuery={query}
                categoryIds={selectedCategory ? [selectedCategory] : []}
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
