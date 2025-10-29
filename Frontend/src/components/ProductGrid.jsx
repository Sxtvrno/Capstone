import React, { useEffect, useState } from "react";
import { productAPI } from "../services/api";

export default function ProductGrid({
  searchQuery = "",
  categoryIds = [],
  onSelect,
}) {
  const [products, setProducts] = useState([]);
  const [imagesMap, setImagesMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cargar productos
  useEffect(() => {
    let isMounted = true;

    const fetchProducts = async () => {
      setLoading(true);
      setError(null);

      try {
        // Usar endpoint público
        const allProducts = await productAPI.getPublicProducts({ limit: 1000 });

        if (!isMounted) return;

        let filtered = allProducts;

        // Filtrar por categoría
        if (categoryIds.length > 0) {
          filtered = filtered.filter((p) =>
            categoryIds.includes(
              p.categoria_id || p.categoryId || p.category_id
            )
          );
        }

        // Filtrar por búsqueda
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          filtered = filtered.filter((p) => {
            const name = (p.nombre || p.name || "").toLowerCase();
            const desc = (p.descripcion || p.description || "").toLowerCase();
            const sku = (p.sku || "").toLowerCase();
            return (
              name.includes(query) ||
              desc.includes(query) ||
              sku.includes(query)
            );
          });
        }

        setProducts(filtered);
      } catch (err) {
        console.error("Error cargando productos:", err);
        if (isMounted) {
          setError("Error al cargar productos");
          setProducts([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchProducts();

    return () => {
      isMounted = false;
    };
  }, [searchQuery, categoryIds]);

  // Cargar imágenes de productos (público)
  useEffect(() => {
    let isMounted = true;

    const loadImages = async () => {
      if (!Array.isArray(products) || products.length === 0) return;

      const ids = [
        ...new Set(products.map((p) => p?.id ?? p?._id).filter(Boolean)),
      ];
      const missing = ids.filter((id) => !imagesMap[id]);

      if (missing.length === 0) return;

      try {
        const results = await Promise.all(
          missing.map(async (id) => {
            try {
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

        if (!isMounted) return;

        setImagesMap((prev) => {
          const next = { ...prev };
          for (const [id, urls] of results) next[id] = urls;
          return next;
        });
      } catch (err) {
        console.error("Error cargando imágenes:", err);
      }
    };

    loadImages();

    return () => {
      isMounted = false;
    };
  }, [products]);

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
          <p className="text-gray-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <svg
          className="w-20 h-20 text-gray-400 mb-4"
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
        <p className="text-gray-600 text-center max-w-md">
          {searchQuery
            ? `No hay productos que coincidan con "${searchQuery}"`
            : categoryIds.length > 0
            ? "No hay productos en esta categoría"
            : "No hay productos disponibles"}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {products.map((product) => {
        const pid = product?.id ?? product?._id;
        const firstImage = pid ? imagesMap[pid]?.[0] : undefined;

        // DEBUG: Ver cada producto individualmente
        console.log(`🔍 Producto ID ${pid}:`, product);

        // Intentar extraer nombre de todas las formas posibles
        const name =
          product.nombre ||
          product.name ||
          product.title ||
          product.nombre_producto ||
          product.product_name ||
          "Producto sin nombre";

        console.log(`📝 Nombre extraído para ID ${pid}:`, name);

        // Extraer descripción
        const description =
          product.descripcion || product.description || product.desc || "";

        // Extraer precio
        const price =
          product.precio || product.price || product.precio_venta || null;

        // Extraer stock
        const stock =
          product.stock_quantity || product.stock || product.cantidad || 0;

        return (
          <article
            key={pid}
            onClick={() => onSelect(product)}
            className="group bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all overflow-hidden cursor-pointer"
          >
            {/* Imagen del producto */}
            <div className="relative bg-gray-100 aspect-square overflow-hidden">
              {firstImage ? (
                <img
                  src={firstImage}
                  alt={name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-200">
                  <svg
                    className="w-16 h-16 text-gray-400"
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
              )}

              {/* Badge de stock bajo */}
              {stock > 0 && stock <= 5 && (
                <div className="absolute top-2 right-2 bg-yellow-500 text-white text-xs font-semibold px-2 py-1 rounded">
                  Últimas {stock}
                </div>
              )}

              {/* Badge sin stock */}
              {stock === 0 && (
                <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-semibold px-2 py-1 rounded">
                  Agotado
                </div>
              )}
            </div>

            {/* Información del producto */}
            <div className="p-3">
              <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1 min-h-[2.5rem]">
                {name}
              </h3>

              {description && (
                <p className="text-xs text-gray-600 line-clamp-2 mb-2 min-h-[2rem]">
                  {description}
                </p>
              )}

              <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                {price != null && !isNaN(Number(price)) ? (
                  <span className="text-base font-semibold text-gray-900">
                    ${Number(price).toLocaleString("es-CL")}
                  </span>
                ) : (
                  <span className="text-sm text-gray-500">
                    Consultar precio
                  </span>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(product);
                  }}
                  className="text-blue-600 hover:text-blue-700 text-xs font-medium flex items-center gap-1"
                >
                  Ver más
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
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </div>

              {/* SKU si existe */}
              {product.sku && (
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <span className="text-xs text-gray-500">
                    SKU: <span className="font-mono">{product.sku}</span>
                  </span>
                </div>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
