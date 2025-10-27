import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getProductosPorCategoria,
  obtenerImagenesProducto,
} from "../services/api";

const RelatedProducts = ({ currentProductId, categoryId, categoryName }) => {
  const navigate = useNavigate();
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [imagesMap, setImagesMap] = useState({});
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchRelatedProducts = async () => {
      if (!categoryId || !token) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await getProductosPorCategoria(categoryId, 0, 20);

        // Normalizar el ID del producto actual para comparación
        const normalizedCurrentId = String(currentProductId);

        // Filtrar el producto actual y limitar a 4 productos
        const filtered = (response.data || [])
          .filter((p) => {
            const pid = p?.id ?? p?._id ?? p?.sku;
            const normalizedPid = String(pid);
            // Comparar IDs normalizados como strings
            return normalizedPid !== normalizedCurrentId;
          })
          .slice(0, 4);

        setRelatedProducts(filtered);
      } catch (error) {
        console.error("Error fetching related products:", error);
        setRelatedProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRelatedProducts();
  }, [categoryId, currentProductId, token]);

  // Cargar imágenes de productos relacionados
  useEffect(() => {
    const loadImages = async () => {
      if (!relatedProducts.length || !token) return;

      const ids = [
        ...new Set(relatedProducts.map((p) => p?.id ?? p?._id).filter(Boolean)),
      ];
      const missing = ids.filter((id) => !imagesMap[id]);

      if (missing.length === 0) return;

      try {
        const results = await Promise.all(
          missing.map(async (id) => {
            try {
              const imgs = await obtenerImagenesProducto(id, token);
              const urls = Array.isArray(imgs)
                ? imgs
                    .map((it) => it.url_imagen || it.url || it.urlImage)
                    .filter(Boolean)
                : [];
              return [id, urls];
            } catch {
              return [id, []];
            }
          })
        );

        setImagesMap((prev) => {
          const next = { ...prev };
          for (const [id, urls] of results) next[id] = urls;
          return next;
        });
      } catch (error) {
        console.error("Error loading images:", error);
      }
    };

    loadImages();
  }, [relatedProducts, token, imagesMap]);

  const handleProductClick = (productId) => {
    navigate(`/product/${productId}`);
    // Scroll to top al navegar
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-gray-200 rounded-lg h-64"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (relatedProducts.length === 0) {
    return null;
  }

  return (
    <section className="bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Productos que podrían interesarte
            </h2>
            {categoryName && (
              <p className="text-gray-600 mt-1">
                Más productos de{" "}
                <span className="font-medium">{categoryName}</span>
              </p>
            )}
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {relatedProducts.map((product) => {
            const pid = product?.id ?? product?._id ?? product?.sku;
            const firstImage = pid ? imagesMap[pid]?.[0] : undefined;
            const name =
              product.nombre || product.name || product.title || "Producto";
            const price = product.precio || product.price;
            const description = product.descripcion || product.description;

            return (
              <article
                key={pid}
                onClick={() => handleProductClick(pid)}
                className="group bg-white rounded-lg shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer"
              >
                {/* Image */}
                <div className="relative aspect-square bg-gray-100 overflow-hidden">
                  {firstImage ? (
                    <img
                      src={firstImage}
                      alt={name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg
                        className="w-16 h-16 text-gray-300"
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
                    </div>
                  )}

                  {/* Quick View Badge */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-white rounded-full p-2 shadow-lg">
                      <svg
                        className="w-4 h-4 text-blue-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2 group-hover:text-blue-600 transition-colors">
                    {name}
                  </h3>

                  {description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {description}
                    </p>
                  )}

                  <div className="flex items-center justify-between">
                    {price != null && !isNaN(Number(price)) ? (
                      <span className="text-xl font-bold text-gray-900">
                        ${Number(price).toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-500">
                        Consultar precio
                      </span>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleProductClick(pid);
                      }}
                      className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-1"
                    >
                      Ver más
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
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default RelatedProducts;
