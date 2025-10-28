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
  const [showCategories, setShowCategories] = useState(false);

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
    onCategoryChange?.(newCategory);
    setShowCategories(false); // Cerrar menú móvil después de seleccionar
  };

  const selectedCategoryName = categories.find(
    (cat) => cat.id === selectedCategory
  )?.name;

  return (
    <div className="w-full space-y-3">
      {/* Barra de búsqueda */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
        {/* Input de búsqueda */}
        <div className="relative flex-1 w-full">
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

        {/* Botón de filtro (solo móvil) */}
        {categories.length > 0 && (
          <button
            onClick={() => setShowCategories(!showCategories)}
            className="sm:hidden flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            <svg
              className="w-5 h-5 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
            <span>{selectedCategoryName || "Filtrar"}</span>
            {selectedCategory && (
              <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                1
              </span>
            )}
          </button>
        )}
      </div>

      {/* Categorías en móvil (dropdown) */}
      {categories.length > 0 && showCategories && (
        <div className="sm:hidden bg-white border border-gray-200 rounded-lg shadow-lg p-2 space-y-1">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => handleCategoryClick(category.id)}
              className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === category.id
                  ? "bg-blue-600 text-white"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              {category.name}
            </button>
          ))}
          {selectedCategory && (
            <button
              onClick={() => handleCategoryClick(null)}
              className="w-full text-left px-4 py-3 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
            >
              ✕ Limpiar filtro
            </button>
          )}
        </div>
      )}

      {/* Categorías en escritorio (horizontal scroll) */}
      {categories.length > 0 && (
        <div className="hidden sm:flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          <span className="text-sm font-medium text-gray-600 whitespace-nowrap">
            Categorías:
          </span>
          <div className="flex items-center gap-2 flex-nowrap">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategoryClick(category.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                  selectedCategory === category.id
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400"
                }`}
              >
                {category.name}
              </button>
            ))}
            {selectedCategory && (
              <button
                onClick={() => handleCategoryClick(null)}
                className="px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all flex-shrink-0"
                title="Limpiar filtro"
              >
                ✕ Limpiar
              </button>
            )}
          </div>
        </div>
      )}

      {/* Filtro activo (móvil) */}
      {selectedCategory && (
        <div className="sm:hidden flex items-center gap-2 text-sm">
          <span className="text-gray-600">Filtro activo:</span>
          <span className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">
            {selectedCategoryName}
            <button
              onClick={() => handleCategoryClick(null)}
              className="hover:text-blue-900"
            >
              ✕
            </button>
          </span>
        </div>
      )}
    </div>
  );
}
