import React, { useEffect, useState } from "react";
import TemplateNavbar from "./TemplateNavbar";
import { obtenerImagenesProducto } from "../services/api";

export default function StoreTemplateD({
  products = [],
  storeName = "Mi Tienda",
  logo,
  icon,
  logoSrc, // compat opcional
  headerColor = "#111827",
}) {
  const logoProp = logo || icon || logoSrc;
  const [imagesMap, setImagesMap] = useState({});
  const [sortOrder, setSortOrder] = useState("nuevo");
  const [toast, setToast] = useState({ show: false, message: "" });
  const token = localStorage.getItem("token");

  useEffect(() => {
    let cancelled = false;
    async function loadImages() {
      if (!Array.isArray(products) || products.length === 0 || !token) return;
      const ids = [
        ...new Set(products.map((p) => p?.id ?? p?._id).filter(Boolean)),
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
        if (cancelled) return;
        setImagesMap((prev) => {
          const next = { ...prev };
          for (const [id, urls] of results) next[id] = urls;
          return next;
        });
      } catch {
        // noop
      }
    }
    loadImages();
    return () => {
      cancelled = true;
    };
  }, [products, token, imagesMap]);

  // Función para mostrar toast
  const showToast = (message) => {
    setToast({ show: true, message });
    setTimeout(() => {
      setToast({ show: false, message: "" });
    }, 3000);
  };

  // Función para agregar al carrito
  const handleAddToCart = (productName) => {
    // Aquí puedes agregar la lógica para agregar al carrito
    showToast(`${productName} agregado al carrito`);
  };

  // Función para ordenar productos
  const sortedProducts = [...products].sort((a, b) => {
    switch (sortOrder) {
      case "precio-asc":
        return (a.price || 0) - (b.price || 0);
      case "precio-desc":
        return (b.price || 0) - (a.price || 0);
      case "nombre":
        return (a.name || a.title || "").localeCompare(b.name || b.title || "");
      case "nuevo":
      default:
        return 0;
    }
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <TemplateNavbar
        storeName={storeName}
        logo={logoProp}
        headerColor={headerColor}
      />

      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
          <div className="bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span className="font-medium">{toast.message}</span>
          </div>
        </div>
      )}

      <main className="container mx-auto px-4 py-6">
        {/* Hero */}
        <section className="mb-8">
          <div className="relative overflow-hidden rounded-2xl bg-radial from-red-900 to-zinc-900 shadow-lg">
            <div className="p-8 md:p-10 text-white">
              <h2 className="text-2xl md:text-3xl font-bold">
                Bienvenido a {storeName}
              </h2>
              <p className="mt-2 text-white/90">
                Descubre productos increíbles a precios justos.
              </p>
              <div className="mt-4">
                <a
                  href="#productos"
                  className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-900 shadow hover:shadow-md transition"
                >
                  Ver productos
                  <svg
                    width="16"
                    height="16"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M10.293 15.707a1 1 0 0 1 0-1.414L12.586 12H5a1 1 0 1 1 0-2h7.586l-2.293-2.293a1 1 0 0 1 1.414-1.414l4 4a1 1 0 0 1 0 1.414l-4 4a1 1 0 0 1-1.414 0z" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Toolbar */}
        <section className="mb-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <h3 id="productos" className="text-xl font-semibold text-gray-900">
            Productos
          </h3>
          <div className="flex items-center gap-2">
            <select
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            >
              <option value="nuevo">Lo nuevo</option>
              <option value="precio-asc">Precio: menor a mayor</option>
              <option value="precio-desc">Precio: mayor a menor</option>
              <option value="nombre">Nombre</option>
            </select>
          </div>
        </section>

        {/* Grid de productos */}
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {sortedProducts.map((p) => {
            const pid = p?.id ?? p?._id ?? p?.sku;
            const firstUrl = pid ? imagesMap[pid]?.[0] : undefined;
            const title = p.name || p.title || "Producto";
            const price =
              p.price != null && !Number.isNaN(Number(p.price))
                ? Number(p.price).toFixed(0)
                : null;

            return (
              <article
                key={pid || title}
                className="group bg-white rounded-xl shadow-sm ring-1 ring-gray-200 hover:shadow-md transition overflow-hidden"
              >
                <div className="relative bg-gray-100 aspect-square overflow-hidden">
                  {firstUrl ? (
                    <img
                      src={firstUrl}
                      alt={title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="h-full w-full bg-gray-200" />
                  )}
                </div>

                <div className="p-3">
                  <h4 className="text-sm font-medium text-gray-900 truncate">
                    {title}
                  </h4>
                  {p.description && (
                    <p className="mt-1 text-xs text-gray-600 line-clamp-2">
                      {String(p.description)}
                    </p>
                  )}
                  <div className="mt-3 flex items-center justify-between">
                    {price ? (
                      <span className="text-base font-semibold text-gray-900">
                        ${price}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-500">Sin precio</span>
                    )}
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
                      onClick={() => handleAddToCart(title)}
                    >
                      Agregar
                      <svg
                        width="14"
                        height="14"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M16 11V9h-5V4H9v5H4v2h5v5h2v-5h5z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      </main>

      <footer className="mt-10 border-t border-gray-200">
        <div className="container mx-auto px-4 py-6 text-sm text-gray-600">
          © {new Date().getFullYear()} {storeName}. Todos los derechos
          reservados.
        </div>
      </footer>

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
