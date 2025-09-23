import React, { useEffect, useState, useRef } from "react";
import { getProductos, deleteProducto } from "../services/api";
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

  // Referencia para el menú desplegable
  const menuRef = useRef(null);

  // Efecto para detectar clics fuera del menú
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Si el menú está abierto y el clic fue fuera del menú, cerrarlo
      if (
        menuOpen &&
        menuRef.current &&
        !menuRef.current.contains(event.target)
      ) {
        setMenuOpen(null);
      }
    };

    // Agregar el event listener cuando el componente se monta o menuOpen cambia
    document.addEventListener("mousedown", handleClickOutside);

    // Cleanup: remover el event listener cuando el componente se desmonta
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen]); // Se re-ejecuta cuando menuOpen cambia

  useEffect(() => {
    getProductos()
      .then((res) => setProductos(res.data))
      .catch((err) => console.error(err));
    fetch("http://localhost:8001/api/categorias-con-id/", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "Content-Type": "application/json",
      },
    })
      .then((res) => res.json())
      .then((data) => setCategorias(data))
      .catch((err) => setCategorias([]));
  }, []);

  // Filtrar productos por nombre o título
  const productosFiltrados = productos.filter((p) =>
    (p.nombre || p.name || p.title || "")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  // Función para obtener el nombre de la categoría
  const getCategoriaNombre = (id) => {
    const categoria = categorias.find((cat) => cat.id === Number(id));
    return categoria ? categoria.name : "—";
  };

  // Función para actualizar la lista al crear un producto
  const handleProductoCreado = (nuevoProducto) => {
    setProductos([...productos, nuevoProducto]);
    setCreateModalOpen(false);
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      {/* Barra de búsqueda y botón + */}
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
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          {/* Header */}
          <thead className="bg-gray-50">
            <tr className="text-left text-gray-500 uppercase tracking-wider text-xs">
              <th className="px-4 py-3 font-medium">Product Name</th>
              <th className="px-4 py-3 font-medium">SKU</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Stock</th>
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Price</th>
              <th className="w-8 px-4 py-3"></th>
            </tr>
          </thead>
          {/* Body */}
          <tbody className="divide-y divide-gray-200">
            {productosFiltrados.length > 0 ? (
              productosFiltrados.map((producto) => (
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
      {/* Modal de edición */}
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
      {/* Modal de creación */}
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
      {/* estilos locales para clamp (sin plugin) */}
      <style>{`
        .line-clamp-1 { display:-webkit-box; -webkit-line-clamp:1; -webkit-box-orient:vertical; overflow:hidden; }
      `}</style>
    </div>
  );
};

export default ProductList;
