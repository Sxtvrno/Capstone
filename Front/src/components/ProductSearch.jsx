import React, { useState } from "react";

/**
 * ProductSearch
 * - Barra de búsqueda con filtros de categoría
 *
 * Props:
 * - onSearch(query) => llamado cuando cambia el texto
 * - onCategoryChange(categoryId) => llamado cuando cambia la categoría
 * - categories => array de objetos categoría con { id, name }
 * - placeholder => texto placeholder (opcional)
 */
export default function ProductSearch({
  onSearch,
  onCategoryChange,
  categories = [],
  placeholder = "Buscar producto...",
}) {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);

  const handleChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    onSearch?.(value);
  };

  const handleClear = () => {
    setQuery("");
    onSearch?.("");
  };

  const handleCategoryClick = (categoryId) => {
    const newCategory = selectedCategory === categoryId ? null : categoryId;
    setSelectedCategory(newCategory);
    onCategoryChange?.(newCategory); // Llama a la función para cambiar la categoría
  };

  return (
    <div className="w-full">
      {/* Barra de búsqueda con botones de categoría */}
      <div className="flex items-center gap-2">
        {/* Input de búsqueda */}
        <div className="relative flex-1 max-w-2xl">
          <input
            type="search"
            value={query}
            onChange={handleChange}
            placeholder={placeholder}
            className="w-full px-4 py-3 pl-11 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm bg-white"
            aria-label="Buscar productos"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>

          {query && (
            <button
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label="Limpiar búsqueda"
            >
              <svg
                className="w-5 h-5"
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
          )}
        </div>

        {/* Botones de categoría */}
        {categories.length > 0 && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategoryClick(category.id)}
                className={`px-4 py-3 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  selectedCategory === category.id
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                }`}
              >
                {category.name}
              </button>
            ))}
            {selectedCategory && (
              <button
                onClick={() => handleCategoryClick(null)}
                className="px-4 py-3 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all"
                title="Limpiar filtro"
              >
                ✕
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
