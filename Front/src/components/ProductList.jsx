import React, { useEffect, useState, useRef } from "react";
import { getProductos, deleteProducto, API_URL } from "../services/api";
import EditProductForm from "./EditProductForm";
import ProductForm from "./ProductForm";
import "bootstrap-icons/font/bootstrap-icons.css";

const ProductList = () => {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [productoEdit, setProductoEdit] = useState(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        menuOpen &&
        menuRef.current &&
        !menuRef.current.contains(event.target)
      ) {
        setMenuOpen(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen]);

  useEffect(() => {
    getProductos()
      .then((res) => setProductos(res.data))
      .catch((err) => console.error(err));
    fetch(`${API_URL}/api/categorias-con-id/`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "Content-Type": "application/json",
      },
    })
      .then((res) => res.json())
      .then((data) => setCategorias(data))
      .catch((err) => setCategorias([]));
  }, []);

  const productosFiltrados = productos.filter((p) =>
    (p.nombre || p.name || p.title || "")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  // Calcular paginación
  const totalPages = Math.ceil(productosFiltrados.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const productosPaginados = productosFiltrados.slice(startIndex, endIndex);

  // Resetear a página 1 cuando cambia la búsqueda
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const getCategoriaNombre = (id) => {
    const categoria = categorias.find((cat) => cat.id === Number(id));
    return categoria ? categoria.name : "—";
  };

  const handleProductoCreado = (nuevoProducto) => {
    setProductos([...productos, nuevoProducto]);
    setCreateModalOpen(false);
  };

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const renderPaginacion = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    // Botón anterior
    pages.push(
      <button
        key="prev"
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={`px-3 py-2 rounded-md ${
          currentPage === 1
            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
            : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
        }`}
      >
        <i className="bi bi-chevron-left"></i>
      </button>
    );

    // Primera página
    if (startPage > 1) {
      pages.push(
        <button
          key={1}
          onClick={() => handlePageChange(1)}
          className="px-4 py-2 rounded-md bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
        >
          1
        </button>
      );
      if (startPage > 2) {
        pages.push(
          <span key="dots1" className="px-2 text-gray-500">
            ...
          </span>
        );
      }
    }

    // Páginas visibles
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`px-4 py-2 rounded-md ${
            currentPage === i
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
          }`}
        >
          {i}
        </button>
      );
    }

    // Última página
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pages.push(
          <span key="dots2" className="px-2 text-gray-500">
            ...
          </span>
        );
      }
      pages.push(
        <button
          key={totalPages}
          onClick={() => handlePageChange(totalPages)}
          className="px-4 py-2 rounded-md bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
        >
          {totalPages}
        </button>
      );
    }

    // Botón siguiente
    pages.push(
      <button
        key="next"
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={`px-3 py-2 rounded-md ${
          currentPage === totalPages
            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
            : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
        }`}
      >
        <i className="bi bi-chevron-right"></i>
      </button>
    );

    return pages;
  };

  return (
    <div className="flex flex-col w-full max-w-6xl mx-auto p-6">
      <div className="mb-6 flex items-center gap-2">
        <input
          type="text"
          className="w-full max-w-xs px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-200"
          placeholder="Buscar producto..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          onClick={() => setCreateModalOpen(true)}
          className="ml-2 px-3 py-2 bg-blue-600 text-white rounded-full text-lg font-bold hover:bg-blue-700 flex items-center justify-center"
          title="Agregar producto"
        >
          <i className="bi bi-plus-circle"></i>
        </button>
      </div>

      <div className="mb-4 flex items-center justify-between text-sm text-gray-600">
        <span>
          Mostrando {startIndex + 1} -{" "}
          {Math.min(endIndex, productosFiltrados.length)} de{" "}
          {productosFiltrados.length} productos
        </span>
        <span>
          Página {currentPage} de {totalPages || 1}
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left text-gray-500 uppercase tracking-wider text-xs">
              <th className="px-4 py-3 font-medium">Product name</th>
              <th className="px-4 py-3 font-medium">SKU</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Stock</th>
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="w-8 px-4 py-3 text-right font-medium">Price</th>
              <th className="w-8 px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {productosPaginados.length > 0 ? (
              productosPaginados.map((producto) => (
                <tr
                  key={producto.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="min-w-0">
                        <div
                          className="font-medium text-gray-900 break-words"
                          title={producto.title}
                        >
                          {producto.title}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {producto.sku || "N/A"}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {getCategoriaNombre(producto.category_id)}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {producto.stock_quantity ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div
                      className="text-gray-600 max-w-[52ch] line-clamp-1"
                      title={producto.description}
                    >
                      {producto.description || "—"}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {producto.status === "activo" ? (
                      <span className="px-2 py-1 rounded bg-green-100 text-green-700 text-xs">
                        Disponible
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded bg-red-100 text-red-700 text-xs">
                        No disponible
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">
                    ${Number(producto.price ?? 0).toLocaleString("es-CL")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="relative flex justify-end">
                      <button
                        className="p-2 rounded-full hover:bg-gray-100"
                        onClick={() =>
                          setMenuOpen(
                            menuOpen === producto.id ? null : producto.id
                          )
                        }
                      >
                        <svg
                          width="20"
                          height="20"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle cx="5" cy="12" r="2" fill="#6B7280" />
                          <circle cx="12" cy="12" r="2" fill="#6B7280" />
                          <circle cx="19" cy="12" r="2" fill="#6B7280" />
                        </svg>
                      </button>
                      {menuOpen === producto.id && (
                        <div
                          ref={menuRef}
                          className="fixed right-35 mt-2 w-32 bg-white border border-gray-200 rounded shadow-lg z-10"
                          style={{ pointerEvents: "auto" }}
                        >
                          <button
                            className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                            onClick={() => {
                              setMenuOpen(null);
                              setProductoEdit(producto);
                              setEditModalOpen(true);
                            }}
                          >
                            Editar
                          </button>
                          <button
                            className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100"
                            onClick={() => {
                              deleteProducto(producto.id)
                                .then(() =>
                                  setProductos(
                                    productos.filter(
                                      (p) => p.id !== producto.id
                                    )
                                  )
                                )
                                .catch((err) => console.error(err));
                              setMenuOpen(null);
                            }}
                          >
                            Eliminar
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-10 text-center text-gray-500"
                >
                  No hay productos disponibles.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          {renderPaginacion()}
        </div>
      )}

      {editModalOpen && productoEdit && (
        <EditProductForm
          producto={productoEdit}
          onClose={() => {
            setEditModalOpen(false);
            setProductoEdit(null);
          }}
          onUpdate={(updated) => {
            setProductos(
              productos.map((p) => (p.id === updated.id ? updated : p))
            );
          }}
        />
      )}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-lg relative">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-xl"
              onClick={() => setCreateModalOpen(false)}
              title="Cerrar"
            >
              &times;
            </button>
            <ProductForm
              onAuthError={() => setCreateModalOpen(false)}
              onProductoCreado={handleProductoCreado}
            />
          </div>
        </div>
      )}
      <style>{`
        .line-clamp-1 { display:-webkit-box; -webkit-line-clamp:1; -webkit-box-orient:vertical; overflow:hidden; }
      `}</style>
    </div>
  );
};

export default ProductList;
