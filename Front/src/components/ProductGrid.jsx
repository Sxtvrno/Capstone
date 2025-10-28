import React, { useEffect, useState } from "react";
import {
  getProductos,
  API_URL,
  obtenerImagenesProducto,
  getProductosPorCategoria,
  getCategorias,
} from "../services/api";
import { useNavigate } from "react-router-dom";

/**
 * ProductGrid
 * - Muestra productos en una cuadrícula responsiva
 * - Filtra productos según el término de búsqueda y categoría
 *
 * Props:
 * - searchQuery => término de búsqueda para filtrar
 * - onSelect(product) => callback al seleccionar un producto (opcional)
 * - categoryIds => array de IDs de categorías para filtrar
 */
export default function ProductGrid({
  searchQuery = "",
  onSelect,
  categoryIds = [],
}) {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [imagesMap, setImagesMap] = useState({});
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    const fetchProducts = async () => {
      try {
        if (categoryIds && categoryIds.length > 0) {
          // Usar el primer ID de categoría del array con límite de 1000
          const res = await getProductosPorCategoria(categoryIds[0], 0, 1000);
          const list = res?.data ?? res ?? [];
          setProductos(list);
        } else {
          const res = await getProductos();
          const list = res?.data ?? res ?? [];
          setProductos(list);
        }
      } catch (err) {
        console.error(err);
        setProductos([]);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [categoryIds]); // Dependencia actualizada para reaccionar a cambios en categoryIds

  // Cargar categorías para mostrar nombre correctamente
  useEffect(() => {
    const fetchCategorias = async () => {
      try {
        const res = await getCategorias();
        const list = res?.data ?? res ?? [];
        setCategorias(list);
      } catch (err) {
        console.error("Error cargando categorías:", err);
        setCategorias([]);
      }
    };
    fetchCategorias();
  }, []);

  // Cargar imágenes de productos
  useEffect(() => {
    if (!productos.length || !token) return;

    productos.forEach((producto) => {
      if (imagesMap[producto.id]) return;
      obtenerImagenesProducto(producto.id, token)
        .then((imgs) => {
          if (imgs && imgs.length > 0) {
            setImagesMap((prev) => ({ ...prev, [producto.id]: imgs }));
          }
        })
        .catch((err) => {
          console.error(
            `Error cargando imágenes del producto ${producto.id}`,
            err
          );
        });
    });
  }, [productos, token]);

  const getCategoriaNombre = (id) => {
    const cat = categorias.find((c) => c.id === Number(id));
    return cat ? cat.name : "Sin categoría";
  };

  const getProductImage = (producto) => {
    const images = imagesMap[producto.id];
    if (images && images.length > 0) {
      return images[0].url_imagen;
    }
    return null;
  };

  const productosFiltrados = productos.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (p.nombre || p.name || p.title || "").toLowerCase().includes(q) ||
      (p.sku || "").toLowerCase().includes(q) ||
      (p.description || "").toLowerCase().includes(q)
    );
  });

  const handleProductClick = (productId) => {
    navigate(`/product/${productId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-gray-500 text-center">
          <svg
            className="animate-spin h-10 w-10 mx-auto mb-3 text-blue-600"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <p>Cargando productos...</p>
        </div>
      </div>
    );
  }

  if (productosFiltrados.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            No se encontraron productos
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            {searchQuery
              ? `No hay resultados para "${searchQuery}"`
              : "No hay productos disponibles"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-600">
          {productosFiltrados.length}{" "}
          {productosFiltrados.length === 1 ? "producto" : "productos"}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {productosFiltrados.map((producto) => {
          const imageUrl = getProductImage(producto);

          return (
            <article
              key={producto.id}
              className="group bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer"
              onClick={() => handleProductClick(producto.id)}
            >
              {/* Imagen del producto */}
              <div className="relative w-full h-48 bg-gray-100 overflow-hidden">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={producto.title || "Producto"}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                    onError={(e) => {
                      e.target.style.display = "none";
                      e.target.nextElementSibling.style.display = "flex";
                    }}
                  />
                ) : null}
                <div
                  className="w-full h-full flex items-center justify-center text-gray-400"
                  style={{ display: imageUrl ? "none" : "flex" }}
                >
                  <svg
                    className="w-16 h-16"
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
                </div>
                {/* Badge de estado */}
                <div className="absolute top-2 right-2">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      producto.status === "activo"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {producto.status === "activo"
                      ? "Disponible"
                      : "No disponible"}
                  </span>
                </div>
              </div>

              {/* Información del producto */}
              <div className="p-4">
                <div className="mb-2">
                  <h3
                    className="text-sm font-semibold text-gray-900 line-clamp-2 mb-1"
                    title={producto.title}
                  >
                    {producto.title || producto.name || producto.nombre}
                  </h3>
                  <p className="text-xs text-gray-500">
                    SKU: {producto.sku || "N/A"}
                  </p>
                </div>

                <p className="text-xs text-gray-600 line-clamp-2 mb-3">
                  {producto.description || "Sin descripción"}
                </p>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-bold text-gray-900">
                      ${Number(producto.price ?? 0).toLocaleString("es-CL")}
                    </p>
                    <p className="text-xs text-gray-500">
                      {getCategoriaNombre(producto.category_id)}
                    </p>
                  </div>
                  <div className="text-xs text-gray-500">
                    Stock: {producto.stock_quantity ?? 0}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
