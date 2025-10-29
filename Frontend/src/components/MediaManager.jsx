import React, { useEffect, useState } from "react";
import { productAPI } from "../services/api";

const MediaManager = ({ onUpload }) => {
  const [productos, setProductos] = useState([]);
  const [urlInput, setUrlInput] = useState({});
  const [imagenes, setImagenes] = useState({});
  const [uploading, setUploading] = useState(false);
  const [selectedProducto, setSelectedProducto] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estados de paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchAllProducts();
  }, []);

  const fetchAllProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await productAPI.getAll();
      const productsArray = Array.isArray(response) ? response : [];

      setProductos(productsArray);

      // Cargar imágenes para todos los productos
      productsArray.forEach((producto) => {
        fetchProductImages(producto.id);
      });
    } catch (err) {
      console.error("Error al cargar productos:", err);
      setError("Error al cargar productos. Intenta nuevamente.");
      setProductos([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchProductImages = async (productId) => {
    try {
      const imgs = await productAPI.getImages(productId);
      setImagenes((prev) => ({
        ...prev,
        [productId]: Array.isArray(imgs) ? imgs : [],
      }));
    } catch (err) {
      console.error(`Error al cargar imágenes del producto ${productId}:`, err);
      setImagenes((prev) => ({ ...prev, [productId]: [] }));
    }
  };

  const handleUrlChange = (id, value) => {
    setUrlInput({ ...urlInput, [id]: value });
  };

  const handleUpload = async (id) => {
    const url = urlInput[id];
    if (!url || !url.trim()) {
      alert("Por favor ingresa una URL válida");
      return;
    }

    setUploading(true);
    try {
      // Crear FormData con la URL de la imagen
      const formData = new FormData();
      formData.append("url_imagen", url);

      await productAPI.addImages(id, formData);

      alert("Imagen subida correctamente");
      setUrlInput({ ...urlInput, [id]: "" });

      // Recargar imágenes del producto
      await fetchProductImages(id);

      if (onUpload) onUpload(id);
    } catch (error) {
      console.error("Error al subir la imagen:", error);
      alert(
        "Error al subir la imagen: " + (error.message || "Error desconocido")
      );
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImagen = async (imgId, productoId) => {
    if (!window.confirm("¿Seguro que deseas borrar esta imagen?")) return;

    try {
      await productAPI.deleteImage(imgId);
      alert("Imagen eliminada correctamente");

      // Recargar imágenes del producto
      await fetchProductImages(productoId);
    } catch (error) {
      console.error("Error al borrar la imagen:", error);
      alert(
        "Error al borrar la imagen: " + (error.message || "Error desconocido")
      );
    }
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  // Filtrar productos por búsqueda
  const filteredProductos = productos.filter((producto) => {
    if (!searchTerm) return true;

    const searchLower = searchTerm.toLowerCase();
    const nombre = producto.nombre || producto.name || producto.title || "";
    const sku = producto.sku || "";
    const description = producto.description || "";

    return (
      nombre.toLowerCase().includes(searchLower) ||
      sku.toLowerCase().includes(searchLower) ||
      description.toLowerCase().includes(searchLower)
    );
  });

  // Calcular productos para la página current
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentProductos = filteredProductos.slice(
    indexOfFirstItem,
    indexOfLastItem
  );

  // Calcular número total de páginas
  const totalPages = Math.ceil(filteredProductos.length / itemsPerPage);

  // Cambiar de página
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    setSelectedProducto(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Generar números de página para mostrar
  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;

    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push("...");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push("...");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push("...");
        pages.push(totalPages);
      }
    }

    return pages;
  };

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
    <div className="p-4 md:p-6 lg:p-8">
      {/* Header con estadísticas */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-800">
              Gestión de Medios
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Total: {productos.length} productos
            </p>
          </div>
          <button
            onClick={fetchAllProducts}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
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
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Actualizar
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Panel de productos */}
        <div className="w-full lg:w-1/2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h2 className="text-lg md:text-xl font-bold text-gray-800">
              Seleccionar Producto
            </h2>

            {/* Barra de búsqueda */}
            <div className="relative flex-1 sm:max-w-xs">
              <input
                type="search"
                placeholder="Buscar producto..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="w-full px-4 py-2 pl-10 pr-4 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
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

          {/* Contador de resultados */}
          <div className="mb-3 text-sm text-gray-600 flex items-center justify-between">
            <span>
              Mostrando {indexOfFirstItem + 1}-
              {Math.min(indexOfLastItem, filteredProductos.length)} de{" "}
              {filteredProductos.length} productos
            </span>
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setCurrentPage(1);
                }}
                className="text-blue-600 hover:text-blue-700 text-xs font-medium"
              >
                Limpiar búsqueda
              </button>
            )}
          </div>

          <div className="bg-gray-50 rounded-lg border border-gray-200 max-h-[500px] overflow-y-auto">
            {currentProductos.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <svg
                  className="w-16 h-16 mx-auto mb-4"
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
                <p>
                  {searchTerm
                    ? "No se encontraron productos con ese término"
                    : "No hay productos disponibles"}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {currentProductos.map((producto) => (
                  <li
                    key={producto.id}
                    className={`p-4 hover:bg-gray-100 cursor-pointer transition ${
                      selectedProducto === producto.id
                        ? "bg-blue-50 border-l-4 border-blue-500"
                        : ""
                    }`}
                    onClick={() => setSelectedProducto(producto.id)}
                  >
                    <div className="flex flex-col gap-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-gray-700 block truncate">
                            {producto.nombre || producto.name || producto.title}
                          </span>
                          {producto.sku && (
                            <span className="text-xs text-gray-500">
                              SKU: {producto.sku}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                          <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
                            {(imagenes[producto.id] || []).length} imgs
                          </span>
                          {selectedProducto === producto.id && (
                            <svg
                              className="w-5 h-5 text-blue-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          placeholder="URL de imagen"
                          value={urlInput[producto.id] || ""}
                          onChange={(e) =>
                            handleUrlChange(producto.id, e.target.value)
                          }
                          onClick={(e) => e.stopPropagation()}
                          className="flex-1 border border-gray-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpload(producto.id);
                          }}
                          disabled={
                            uploading ||
                            !(
                              urlInput[producto.id] &&
                              urlInput[producto.id].length > 0
                            )
                          }
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition whitespace-nowrap flex items-center justify-center gap-2"
                        >
                          {uploading ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              Subiendo...
                            </>
                          ) : (
                            <>
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
                                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                                />
                              </svg>
                              Subir
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* Botón anterior */}
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
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
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                Anterior
              </button>

              {/* Números de página */}
              <div className="flex items-center gap-1 flex-wrap justify-center">
                {getPageNumbers().map((pageNumber, index) => (
                  <React.Fragment key={index}>
                    {pageNumber === "..." ? (
                      <span className="px-2 py-1 text-gray-500">...</span>
                    ) : (
                      <button
                        onClick={() => handlePageChange(pageNumber)}
                        className={`px-3 py-1 text-sm font-medium rounded-lg transition ${
                          currentPage === pageNumber
                            ? "bg-blue-600 text-white"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        {pageNumber}
                      </button>
                    )}
                  </React.Fragment>
                ))}
              </div>

              {/* Botón siguiente */}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
              >
                Siguiente
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
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Panel de imágenes */}
        <div className="w-full lg:w-1/2">
          <h2 className="text-lg md:text-xl font-bold mb-4 text-gray-800">
            Imágenes del producto
          </h2>
          {selectedProducto ? (
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 min-h-[200px]">
              {(imagenes[selectedProducto] || []).length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                  <svg
                    className="w-16 h-16 mb-2"
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
                  <p className="text-sm">No hay imágenes para este producto.</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Agrega una URL arriba para subir una imagen
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-3 text-sm text-gray-600 font-medium">
                    {imagenes[selectedProducto].length} imagen(es)
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto">
                    {imagenes[selectedProducto].map((img) => (
                      <div key={img.id} className="relative group">
                        <img
                          src={img.url_imagen || img.url}
                          alt="Producto"
                          className="w-full h-32 object-cover border rounded-lg shadow hover:shadow-lg transition cursor-pointer"
                          title="Click para ver"
                          onError={(e) => {
                            e.target.src =
                              "https://via.placeholder.com/150?text=Error";
                          }}
                        />
                        <button
                          className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                          onClick={() =>
                            handleDeleteImagen(img.id, selectedProducto)
                          }
                          title="Borrar imagen"
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
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-8 text-center">
              <svg
                className="w-16 h-16 mx-auto mb-4 text-gray-300"
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
              <p className="text-gray-400 text-sm">
                Selecciona un producto de la lista para ver y gestionar sus
                imágenes.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MediaManager;
