import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { productAPI } from "../services/api";

const RelatedProducts = ({ currentProductId, categoryId, categoryName }) => {
  const navigate = useNavigate();
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [imagesMap, setImagesMap] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchRelatedProducts = async () => {
      if (!categoryId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Obtener productos de la misma categoría
        const allProducts = await productAPI.getPublicProducts({ limit: 1000 });

        // Filtrar por categoría y excluir el producto actual
        const filtered = allProducts
          .filter(
            (p) =>
              p.category_id === categoryId &&
              String(p.id) !== String(currentProductId)
          )
          .slice(0, 4); // Limitar a 4 productos relacionados

        if (isMounted) {
          setRelatedProducts(filtered);
        }
      } catch (err) {
        console.error("Error fetching related products:", err);
        if (isMounted) {
          setRelatedProducts([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchRelatedProducts();

    return () => {
      isMounted = false;
    };
  }, [categoryId, currentProductId]);

  // Cargar imágenes de productos relacionados
  useEffect(() => {
    let isMounted = true;

    const loadImages = async () => {
      if (!relatedProducts.length) return;

      const ids = [
        ...new Set(relatedProducts.map((p) => p.id).filter(Boolean)),
      ];
      const missing = ids.filter((id) => !imagesMap[id]);

      if (missing.length === 0) return;

      try {
        const results = await Promise.all(
          missing.map(async (id) => {
            try {
              // Intentar endpoint público primero
              let imgs;
              try {
                imgs = await productAPI.getImagesPublic(id);
              } catch {
                imgs = await productAPI.getImages(id);
              }
              const urls = Array.isArray(imgs)
                ? imgs.map((it) => it.url_imagen || it.url).filter(Boolean)
                : [];
              return [id, urls];
            } catch {
              return [id, []];
            }
          })
        );

        if (isMounted) {
          setImagesMap((prev) => {
            const next = { ...prev };
            for (const [id, urls] of results) {
              next[id] = urls;
            }
            return next;
          });
        }
      } catch (err) {
        console.error("Error loading images:", err);
      }
    };

    loadImages();

    return () => {
      isMounted = false;
    };
  }, [relatedProducts]);

  const handleProductClick = (productId) => {
    navigate(`/product/${productId}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (loading) {
    return (
      <section className="bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Productos Relacionados
          </h2>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </section>
    );
  }

  if (relatedProducts.length === 0) {
    return null;
  }

  return (
    <section className="bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Productos Relacionados
          </h2>
          {categoryName && (
            <p className="text-gray-600 mt-1">
              Otros productos en{" "}
              <span className="font-medium text-gray-900">{categoryName}</span>
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {relatedProducts.map((product) => {
            const imageUrl = imagesMap[product.id]?.[0];
            const hasImage = imageUrl && imageUrl.trim() !== "";

            return (
              <article
                key={product.id}
                onClick={() => handleProductClick(product.id)}
                className="group bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden cursor-pointer border border-gray-200"
              >
                {/* Imagen */}
                <div className="relative w-full h-48 bg-gray-100 overflow-hidden">
                  {hasImage ? (
                    <img
                      src={imageUrl}
                      alt={product.title || product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      onError={(e) => {
                        e.target.style.display = "none";
                        const placeholder =
                          e.target.parentElement.querySelector(
                            ".image-placeholder"
                          );
                        if (placeholder) placeholder.style.display = "flex";
                      }}
                    />
                  ) : null}
                  <div
                    className="image-placeholder absolute inset-0 w-full h-full flex items-center justify-center text-gray-400"
                    style={{ display: hasImage ? "none" : "flex" }}
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
                  {product.status === "activo" && (
                    <div className="absolute top-2 right-2">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                        Disponible
                      </span>
                    </div>
                  )}
                </div>

                {/* Información */}
                <div className="p-4">
                  <h3
                    className="text-sm font-semibold text-gray-900 line-clamp-2 mb-2"
                    title={product.title || product.name}
                  >
                    {product.title || product.name}
                  </h3>

                  {product.description && (
                    <p className="text-xs text-gray-600 line-clamp-2 mb-3">
                      {product.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-gray-900">
                      ${Number(product.price ?? 0).toLocaleString("es-CL")}
                    </span>
                    <span className="text-xs text-gray-500">
                      Stock: {product.stock_quantity ?? 0}
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* Ver más productos de la categoría */}
        {categoryName && (
          <div className="mt-8 text-center">
            <button
              onClick={() => navigate(`/search?category=${categoryId}`)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Ver todos los productos de {categoryName}
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
        )}
      </div>
    </section>
  );
};

export default RelatedProducts;
