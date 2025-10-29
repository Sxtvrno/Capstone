import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { categoryAPI } from "../services/api";
import TemplateNavbar from "../components/TemplateNavbar";
import ProductSearch from "../components/ProductSearch";
import ProductGrid from "../components/ProductGrid";

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [selectedCategory, setSelectedCategory] = useState(
    searchParams.get("category") ? parseInt(searchParams.get("category")) : null
  );
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Datos visuales desde localStorage
  const storeName = localStorage.getItem("storeName") || "Mi Tienda";
  const logo = localStorage.getItem("logoPreview") || null;
  const headerColor = localStorage.getItem("headerColor") || "#111827";

  // Cargar categorías desde la API (público)
  useEffect(() => {
    let isMounted = true;

    const fetchCategorias = async () => {
      setLoading(true);
      try {
        // Usar endpoint público de categorías
        const data = await categoryAPI.getAllWithId();
        if (isMounted) {
          setCategories(data);
        }
      } catch (err) {
        console.error("Error cargando categorías:", err);
        if (isMounted) {
          setCategories([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchCategorias();

    return () => {
      isMounted = false;
    };
  }, []);

  // Sincronizar estado con URL params
  useEffect(() => {
    const q = searchParams.get("q") || "";
    const cat = searchParams.get("category");
    setQuery(q);
    setSelectedCategory(cat ? parseInt(cat) : null);
  }, [searchParams]);

  const handleSelect = (producto) => {
    navigate(`/product/${producto.id}`);
  };

  const handleSearch = (searchQuery) => {
    setQuery(searchQuery);

    // Actualizar URL params
    const params = new URLSearchParams();
    if (searchQuery) {
      params.set("q", searchQuery);
    }
    if (selectedCategory) {
      params.set("category", selectedCategory.toString());
    }
    setSearchParams(params);
  };

  const handleCategoryChange = (categoryId) => {
    setSelectedCategory(categoryId);

    // Actualizar URL params
    const params = new URLSearchParams();
    if (query) {
      params.set("q", query);
    }
    if (categoryId) {
      params.set("category", categoryId.toString());
    }
    setSearchParams(params);
  };

  const handleClearFilters = () => {
    setQuery("");
    setSelectedCategory(null);
    setSearchParams({});
  };

  // Obtener el nombre de la categoría seleccionada
  const getSelectedCategoryName = () => {
    if (!selectedCategory) return null;
    const cat = categories.find((c) => c.id === selectedCategory);
    return cat ? cat.name || cat.nombre : null;
  };

  const hasFilters = query || selectedCategory;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="w-full sticky top-0 z-50 shadow-sm">
        <TemplateNavbar
          storeName={storeName}
          logo={logo}
          headerColor={headerColor}
          className="w-full"
        />
      </header>

      <main className="flex-1 pt-4 md:pt-6 pb-8 w-full">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          {/* Breadcrumb */}
          <nav className="mb-4 text-sm">
            <ol className="flex items-center space-x-2 text-gray-500">
              <li>
                <button
                  onClick={() => navigate("/")}
                  className="hover:text-blue-600 transition-colors"
                >
                  Inicio
                </button>
              </li>
              <li>/</li>
              <li className="text-gray-900 font-medium">Búsqueda</li>
            </ol>
          </nav>

          {/* Search Section */}
          <div className="mb-6">
            <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-6 shadow-sm">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                Buscar Productos
              </h1>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="flex items-center gap-2 text-gray-500">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    <span className="text-sm">Cargando categorías...</span>
                  </div>
                </div>
              ) : (
                <ProductSearch
                  onSearch={handleSearch}
                  onCategoryChange={handleCategoryChange}
                  categories={categories}
                  placeholder="Buscar por nombre, SKU o descripción..."
                  initialQuery={query}
                  initialCategory={selectedCategory}
                />
              )}
            </div>
          </div>

          {/* Active Filters */}
          {hasFilters && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-600">Filtros activos:</span>

              {query && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">
                  Búsqueda: "{query}"
                  <button
                    onClick={() => handleSearch("")}
                    className="hover:text-blue-900"
                  >
                    <svg
                      className="w-4 h-4"
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
                </span>
              )}

              {selectedCategory && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 text-sm rounded-full">
                  Categoría: {getSelectedCategoryName()}
                  <button
                    onClick={() => handleCategoryChange(null)}
                    className="hover:text-purple-900"
                  >
                    <svg
                      className="w-4 h-4"
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
                </span>
              )}

              <button
                onClick={handleClearFilters}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Limpiar todos
              </button>
            </div>
          )}

          {/* Results Section */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">
                Resultados
              </h2>
              <p className="text-sm text-gray-500">
                {getSelectedCategoryName() ? (
                  <>
                    Categoría:{" "}
                    <span className="font-medium text-gray-700">
                      {getSelectedCategoryName()}
                    </span>
                  </>
                ) : query ? (
                  <>
                    Buscando:{" "}
                    <span className="font-medium text-gray-700">"{query}"</span>
                  </>
                ) : (
                  <span className="font-medium text-gray-700">
                    Todos los productos
                  </span>
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

      <footer className="w-full border-t border-gray-200 bg-white mt-8">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-500">
              © {new Date().getFullYear()} {storeName}. Todos los derechos
              reservados.
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <button
                onClick={() => navigate("/")}
                className="hover:text-blue-600 transition-colors"
              >
                Inicio
              </button>
              <span>•</span>
              <button className="hover:text-blue-600 transition-colors">
                Contacto
              </button>
              <span>•</span>
              <button className="hover:text-blue-600 transition-colors">
                Ayuda
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
