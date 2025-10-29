import React, { useState, useEffect } from "react";

export default function ProductSearch({
  onSearch,
  onCategoryChange,
  categories = [],
  placeholder = "Buscar productos...",
  initialQuery = "",
  initialCategory = null,
}) {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);

  // Sincronizar con props iniciales
  useEffect(() => {
    setSearchQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    setSelectedCategory(initialCategory);
  }, [initialCategory]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    onSearch(searchQuery);
  };

  const handleCategorySelect = (categoryId) => {
    const newCategory = categoryId === selectedCategory ? null : categoryId;
    setSelectedCategory(newCategory);
    onCategoryChange(newCategory);
  };

  const handleClear = () => {
    setSearchQuery("");
    setSelectedCategory(null);
    onSearch("");
    onCategoryChange(null);
  };

  return (
    <div className="space-y-4">
      {/* Barra de búsqueda */}
      <form onSubmit={handleSearchSubmit} className="flex gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={placeholder}
            className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
        </div>

        <button
          type="submit"
          className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Buscar
        </button>

        {(searchQuery || selectedCategory) && (
          <button
            type="button"
            onClick={handleClear}
            className="px-4 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            Limpiar
          </button>
        )}
      </form>

      {/* Filtro de categorías */}
      {categories.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filtrar por categoría:
          </label>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => handleCategorySelect(category.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedCategory === category.id
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {category.name || category.nombre}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Indicador de filtros activos */}
      {(searchQuery || selectedCategory) && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
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
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
            />
          </svg>
          <span>
            {searchQuery && selectedCategory
              ? `Buscando "${searchQuery}" en categoría seleccionada`
              : searchQuery
              ? `Buscando "${searchQuery}"`
              : "Filtrando por categoría"}
          </span>
        </div>
      )}
    </div>
  );
}
