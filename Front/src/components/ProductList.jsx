// src/components/ProductList.jsx
import React, { useEffect, useState } from "react";
import { getProductos, deleteProducto } from "../services/api";
import EditProductForm from "./EditProductForm";

const ProductList = () => {
  const [productos, setProductos] = useState([]);
  const [search, setSearch] = useState(""); // Estado para la búsqueda
  const [menuOpen, setMenuOpen] = useState(null); // Estado para el menú de acciones
  const [editModalOpen, setEditModalOpen] = useState(false); // Estado para el modal de edición
  const [productoEdit, setProductoEdit] = useState(null); // Producto a editar

  useEffect(() => {
    getProductos()
      .then((res) => setProductos(res.data))
      .catch((err) => console.error(err));
  }, []);
  
  // Filtrar productos por nombre o título
  const productosFiltrados = productos.filter((p) =>
    (p.nombre || p.name || p.title || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      {/* Barra de búsqueda */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Productos</h2>
        <span className="text-gray-500 text-sm">{productosFiltrados.length} items</span>
      </div>
      <div className="mb-6">
        <input
          type="text"
          className="w-full max-w-xs px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-200"
          placeholder="Buscar producto..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
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
              <th className="px-4 py-3 text-right font-medium">Price</th>
              <th className="w-8 px-4 py-3"></th>
            </tr>
          </thead>

          {/* Body */}
          <tbody className="divide-y divide-gray-200">
            {productosFiltrados.length > 0 ? (
              productosFiltrados.map((producto) => (
                <tr key={producto.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 break-words" title={producto.title}>
                          {producto.title}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* SKU */}
                  <td className="px-4 py-3 text-gray-600">
                    {producto.sku || "N/A"}
                  </td>

                  {/* Categoría */}
                  <td className="px-4 py-3 text-gray-700">
                    {producto.category_id ?? "—"}
                  </td>

                  {/* Stock */}
                  <td className="px-4 py-3 text-gray-600">
                    {producto.stock_quantity ?? "—"}
                  </td>

                  {/* Descripción (1 línea con …) */}
                  <td className="px-4 py-3">
                    <div className="text-gray-600 max-w-[52ch] line-clamp-1" title={producto.description}>
                      {producto.description || "—"}
                    </div>
                  </td>

                  {/* Precio */}
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">
                    ${Number(producto.price ?? 0).toLocaleString("es-CL")}
                  </td>

                  {/* Acciones */}
                  <td className="px-4 py-3">
                    <div className="relative flex justify-end">
                      <button
                        className="p-2 rounded-full hover:bg-gray-100"
                        onClick={() => setMenuOpen(producto.id)}
                      >
                        <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                          <circle cx="5" cy="12" r="2" fill="#6B7280"/>
                          <circle cx="12" cy="12" r="2" fill="#6B7280"/>
                          <circle cx="19" cy="12" r="2" fill="#6B7280"/>
                        </svg>
                      </button>
                      {menuOpen === producto.id && (
                        <div className="absolute right-0 mt-2 w-32 bg-white border border-gray-200 rounded shadow-lg z-10">
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
                                .then(() => setProductos(productos.filter(p => p.id !== producto.id)))
                                .catch(err => console.error(err));
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
                <td colSpan={7} className="px-4 py-10 text-center text-gray-500">
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
          onUpdate={updated => {
            setProductos(productos.map(p => p.id === updated.id ? updated : p));
          }}
        />
      )}
      {/* estilos locales para clamp (sin plugin) */}
      <style>{`
        .line-clamp-1 { display:-webkit-box; -webkit-line-clamp:1; -webkit-box-orient:vertical; overflow:hidden; }
      `}</style>
    </div>
  );
}

export default ProductList;
