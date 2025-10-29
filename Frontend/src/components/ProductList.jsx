import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { productAPI } from "../services/api";
import EditProductForm from "./EditProductForm";

export default function ProductList() {
  const navigate = useNavigate();
  const [allProducts, setAllProducts] = useState([]); // Todos los productos
  const [products, setProducts] = useState([]); // Productos filtrados/paginados
  const [imagesMap, setImagesMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  // Cargar todos los productos una sola vez al inicio
  useEffect(() => {
    fetchAllProducts();
  }, []);

  // Aplicar filtros y paginación cuando cambien los criterios
  useEffect(() => {
    applyFilters();
  }, [currentPage, searchTerm, allProducts]);

  const fetchAllProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await productAPI.getAll();
      setAllProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error al cargar productos:", err);
      setError("Error al cargar productos. Verifica tu sesión.");
      setAllProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...allProducts];

    // Filtrar por búsqueda
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          (p.title || "").toLowerCase().includes(searchLower) ||
          (p.sku || "").toLowerCase().includes(searchLower) ||
          (p.description || "").toLowerCase().includes(searchLower)
      );
    }

    // Aplicar paginación
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginated = filtered.slice(startIndex, endIndex);

    setProducts(paginated);
  };

  // Cargar imágenes solo para productos visibles
  useEffect(() => {
    const loadImages = async () => {
      if (!Array.isArray(products) || products.length === 0) return;

      const ids = [...new Set(products.map((p) => p?.id).filter(Boolean))];
      const missing = ids.filter((id) => !imagesMap[id]);

      if (missing.length === 0) return;

      try {
        const results = await Promise.all(
          missing.map(async (id) => {
            try {
              const imgs = await productAPI.getImages(id);

              if (!imgs || !Array.isArray(imgs)) {
                return [id, []];
              }

              const urls = imgs
                .map((it) => it.url_imagen || it.url || it.imagen || it.image)
                .filter(Boolean);

              return [id, urls];
            } catch (err) {
              return [id, []];
            }
          })
        );

        setImagesMap((prev) => {
          const next = { ...prev };
          for (const [id, urls] of results) {
            next[id] = urls;
          }
          return next;
        });
      } catch (err) {
        console.error("Error cargando imágenes:", err);
      }
    };

    loadImages();
  }, [products]);

  const handleDelete = async (id) => {
    if (
      !window.confirm("¿Estás seguro de que deseas eliminar este producto?")
    ) {
      return;
    }

    try {
      await productAPI.delete(id);
      setAllProducts((prev) => prev.filter((p) => p.id !== id));
      setImagesMap((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      alert("Producto eliminado exitosamente");
    } catch (err) {
      alert("Error al eliminar el producto: " + err.message);
    }
  };

  const handleEdit = (product) => {
    if (!product || !product.id) {
      console.error("Producto inválido:", product);
      alert("Error: Producto inválido");
      return;
    }
    setEditingProduct(product);
  };

  const handleCancelEdit = () => {
    setEditingProduct(null);
  };

  const handleSaveEdit = async (updatedProduct) => {
    try {
      await productAPI.update(updatedProduct.id, updatedProduct);

      // Actualizar en la lista local
      setAllProducts((prev) =>
        prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p))
      );

      try {
        const imgs = await productAPI.getImages(updatedProduct.id);
        const urls = Array.isArray(imgs)
          ? imgs.map((it) => it.url_imagen || it.url).filter(Boolean)
          : [];
        setImagesMap((prev) => ({
          ...prev,
          [updatedProduct.id]: urls,
        }));
      } catch (err) {
        console.error("Error cargando imágenes:", err);
      }

      setEditingProduct(null);
      alert("Producto actualizado exitosamente");
    } catch (err) {
      alert("Error al actualizar el producto: " + err.message);
    }
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setCurrentPage(1);
  };

  // Calcular productos filtrados
  const getFilteredProducts = () => {
    let filtered = [...allProducts];

    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          (p.title || "").toLowerCase().includes(searchLower) ||
          (p.sku || "").toLowerCase().includes(searchLower) ||
          (p.description || "").toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  };

  const filteredProducts = getFilteredProducts();
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePageClick = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;

    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push("...");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      }
    }

    return pages;
  };

  if (editingProduct) {
    return (
      <div className="p-6">
        <EditProductForm
          product={editingProduct}
          onSave={handleSaveEdit}
          onCancel={handleCancelEdit}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando productos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <svg
            className="w-16 h-16 text-red-500 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchAllProducts}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header con búsqueda */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Buscar productos
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder="Buscar por título, SKU o descripción..."
                className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <span className="text-gray-600 font-medium">
              Total: {allProducts.length} productos
            </span>
            <span className="text-gray-500">
              Mostrando {filteredProducts.length} producto(s)
              {totalPages > 0 && ` - Página ${currentPage} de ${totalPages}`}
            </span>
          </div>
          {searchTerm && (
            <button
              onClick={handleClearFilters}
              className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
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
              Limpiar búsqueda
            </button>
          )}
        </div>
      </div>

      {products.length === 0 ? (
        <div className="bg-white p-12 rounded-lg shadow-sm border border-gray-200 text-center">
          <svg
            className="w-16 h-16 text-gray-400 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No se encontraron productos
          </h3>
          <p className="text-gray-600 mb-4">
            {searchTerm
              ? "Intenta con otros términos de búsqueda"
              : "Crea tu primer producto para comenzar"}
          </p>
          {searchTerm && (
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Ver todos los productos
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => {
              const firstImage = imagesMap[product.id]?.[0];
              const imageCount = imagesMap[product.id]?.length || 0;

              const title = product.title || `Producto ${product.sku}`;
              const price = product.price || 0;
              const stock = product.stock_quantity || 0;
              const sku = product.sku || "N/A";
              const description = product.description || "";
              const category = product.category_id || "Sin categoría";

              return (
                <article
                  key={product.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="relative bg-gray-100 aspect-video">
                    {firstImage ? (
                      <img
                        src={firstImage}
                        alt={title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                        <svg
                          className="w-16 h-16 mb-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        <span className="text-xs">Sin imagen</span>
                      </div>
                    )}

                    {imageCount > 0 && (
                      <div className="absolute top-2 left-2 bg-gray-900/75 text-white text-xs font-semibold px-2 py-1 rounded flex items-center gap-1">
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        {imageCount}
                      </div>
                    )}

                    {stock > 0 && stock <= 5 && (
                      <div className="absolute top-2 right-2 bg-yellow-500 text-white text-xs font-semibold px-2 py-1 rounded">
                        Stock bajo: {stock}
                      </div>
                    )}
                    {stock === 0 && (
                      <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-semibold px-2 py-1 rounded">
                        Sin stock
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 flex-1">
                        {title}
                      </h3>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 ml-2">
                        {category}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mb-2">SKU: {sku}</p>

                    {description && (
                      <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                        {description}
                      </p>
                    )}

                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
                      <div>
                        <span className="text-xl font-bold text-gray-900">
                          ${Number(price).toLocaleString("es-CL")}
                        </span>
                        <span className="text-sm text-gray-500 ml-2">
                          Stock: {stock}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(product)}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center justify-center gap-2"
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
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium flex items-center justify-center gap-2"
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
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                        Eliminar
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <button
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                  Anterior
                </button>

                <div className="flex items-center gap-2">
                  {getPageNumbers().map((page, index) =>
                    page === "..." ? (
                      <span
                        key={`ellipsis-${index}`}
                        className="px-3 py-2 text-gray-400"
                      >
                        ...
                      </span>
                    ) : (
                      <button
                        key={page}
                        onClick={() => handlePageClick(page)}
                        className={`px-4 py-2 rounded-lg transition-colors ${
                          currentPage === page
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {page}
                      </button>
                    )
                  )}
                </div>

                <button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  Siguiente
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
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
