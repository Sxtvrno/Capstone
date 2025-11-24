import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CartContext } from "../contexts/CartContext";
import { productAPI, getStoreConfig } from "../services/api";

export default function StoreTemplateD({
  products = [],
  storeName: storeNameProp,
  logo,
  icon,
  logoSrc,
  headerColor = "#000000",
}) {
  const navigate = useNavigate();
  const { addToCart } = useContext(CartContext);
  const logoProp = logo || icon || logoSrc;
  const [imagesMap, setImagesMap] = useState({});
  const [sortOrder, setSortOrder] = useState("nuevo");
  const [toast, setToast] = useState({ show: false, message: "" });
  const [storeName, setStoreName] = useState(storeNameProp);

  // Cargar configuración de tienda desde BD
  useEffect(() => {
    getStoreConfig()
      .then((config) => {
        if (config?.store_name) {
          setStoreName(config.store_name);
        }
      })
      .catch((err) => console.error("Error loading store config:", err));
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadImages() {
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

        if (cancelled) return;

        setImagesMap((prev) => {
          const next = { ...prev };
          for (const [id, urls] of results) next[id] = urls;
          return next;
        });
      } catch (err) {
        console.error("Error cargando imágenes:", err);
      }
    }

    loadImages();

    return () => {
      cancelled = true;
    };
  }, [products.length]);

  const showToast = (message) => {
    setToast({ show: true, message });
    setTimeout(() => {
      setToast({ show: false, message: "" });
    }, 3000);
  };

  const handleProductClick = (productId) => {
    navigate(`/product/${productId}`);
  };

  const handleAddToCart = (e, productOrName) => {
    e?.stopPropagation?.();
    let product = productOrName;
    if (typeof productOrName === "string") {
      product =
        products.find(
          (p) =>
            p.nombre === productOrName ||
            p.name === productOrName ||
            p.title === productOrName
        ) || null;
    }
    if (!product) {
      showToast("No se pudo agregar al carrito");
      return;
    }
    addToCart(product, 1);
    const name = product.nombre || product.name || product.title || "Producto";
    showToast(`"${name}" agregado al carrito 🛒`);
  };

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
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Efectos de fondo Black Friday */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* Rayos de luz animados */}
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 via-transparent to-yellow-500/10 animate-pulse" />
        {/* Partículas doradas */}
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={`particle-${i}`}
            className="particle absolute rounded-full bg-yellow-500/30"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${2 + Math.random() * 4}px`,
              height: `${2 + Math.random() * 4}px`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 4}s`,
            }}
          />
        ))}
        {/* Líneas diagonales */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-yellow-500 to-transparent transform -skew-y-12" />
          <div className="absolute top-1/4 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-yellow-500 to-transparent transform -skew-y-12" />
          <div className="absolute top-2/4 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-yellow-500 to-transparent transform -skew-y-12" />
          <div className="absolute top-3/4 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-yellow-500 to-transparent transform -skew-y-12" />
        </div>
      </div>

      {/* Toast notification elegante */}
      {toast.show && (
        <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
          <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-black px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 border-2 border-yellow-400">
            <span className="text-2xl">⚡</span>
            <span className="font-bold">{toast.message}</span>
          </div>
        </div>
      )}

      <main className="container mx-auto px-4 py-8 relative z-10">
        {/* Hero Black Friday épico */}
        <section className="mb-10">
          <div className="relative overflow-hidden rounded-3xl shadow-2xl">
            <div className="relative p-10 md:p-16 bg-gradient-to-r from-black via-gray-900 to-black rounded-3xl border-4 border-yellow-500">
              {/* Efecto de relámpago */}
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500 blur-[100px] animate-pulse" />
                <div
                  className="absolute bottom-0 left-0 w-64 h-64 bg-yellow-500 blur-[100px] animate-pulse"
                  style={{ animationDelay: "1s" }}
                />
              </div>

              {/* Etiquetas de descuento flotantes */}
              <div className="absolute top-4 right-4 bg-yellow-500 text-black px-4 py-2 rounded-lg font-black text-lg animate-bounce shadow-xl">
                🔥 -70%
              </div>
              <div className="absolute top-20 right-8 bg-red-600 text-white px-3 py-1 rounded-lg font-bold text-sm animate-pulse">
                ⚡ HOT
              </div>

              <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                {logoProp && (
                  <div className="relative">
                    <div className="absolute -inset-4 bg-yellow-500 rounded-full blur-2xl opacity-40 animate-pulse" />
                    <img
                      src={logoProp}
                      alt={`${storeName} logo`}
                      className="relative w-28 h-28 md:w-36 md:h-36 rounded-full border-4 border-yellow-500 shadow-2xl object-cover"
                    />
                  </div>
                )}
                <div className="flex-1 text-center md:text-left">
                  <div className="inline-block mb-4 px-4 py-2 bg-yellow-500 text-black font-black text-sm rounded-full animate-pulse">
                    ⚡ BLACK FRIDAY 2024 ⚡
                  </div>
                  <h1 className="text-5xl md:text-7xl font-black mb-4">
                    <span className="text-yellow-500 drop-shadow-[0_0_30px_rgba(234,179,8,0.8)]">
                      {storeName}
                    </span>
                  </h1>
                  <p className="text-2xl md:text-3xl text-yellow-400 font-bold mb-3 animate-pulse">
                    ¡HASTA 80% DE DESCUENTO!
                  </p>
                  <p className="text-lg md:text-xl text-gray-300 mb-6">
                    Las mejores ofertas del año • Solo por tiempo limitado
                  </p>
                  <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                    <a
                      href="#productos"
                      className="group relative overflow-hidden inline-flex items-center gap-2 rounded-full bg-yellow-500 px-8 py-4 text-lg font-black text-black shadow-2xl hover:bg-yellow-400 transition-all transform hover:scale-105"
                    >
                      <span className="relative z-10 flex items-center gap-2">
                        🔥 VER OFERTAS
                      </span>
                      <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-500 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300" />
                    </a>
                    <div className="inline-flex items-center gap-2 rounded-full bg-black border-2 border-yellow-500 px-6 py-4 text-base font-bold text-yellow-500 shadow-xl">
                      ⏰ Oferta finaliza pronto
                    </div>
                  </div>
                </div>
              </div>

              {/* Contador regresivo visual */}
              <div className="absolute bottom-4 left-4 flex gap-2 text-yellow-500 font-mono text-xs animate-pulse">
                <span className="bg-black/50 px-2 py-1 rounded">48:00:00</span>
              </div>
            </div>
          </div>
        </section>

        {/* Barra de beneficios premium */}
        <section className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl p-6 shadow-2xl text-center transform hover:scale-105 transition border-2 border-yellow-400">
            <div className="text-4xl mb-3">⚡</div>
            <h3 className="font-black text-xl mb-2 text-black">
              Envío Express
            </h3>
            <p className="text-sm text-black/80 font-semibold">
              24-48 horas • Gratis en compras sobre $50.000
            </p>
          </div>
          <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl p-6 shadow-2xl text-center transform hover:scale-105 transition border-2 border-yellow-500">
            <div className="text-4xl mb-3">💳</div>
            <h3 className="font-black text-xl mb-2 text-yellow-500">
              Cuotas Sin Interés
            </h3>
            <p className="text-sm text-gray-300 font-semibold">
              Hasta 12 cuotas en productos seleccionados
            </p>
          </div>
          <div className="bg-gradient-to-br from-red-600 to-red-700 rounded-2xl p-6 shadow-2xl text-center transform hover:scale-105 transition border-2 border-yellow-400">
            <div className="text-4xl mb-3">🔥</div>
            <h3 className="font-black text-xl mb-2 text-white">
              Stock Limitado
            </h3>
            <p className="text-sm text-white/90 font-semibold">
              ¡Últimas unidades a precio increíble!
            </p>
          </div>
        </section>

        {/* Toolbar premium */}
        <section className="mb-6 bg-gradient-to-r from-gray-900 to-black backdrop-blur-sm rounded-2xl p-5 shadow-2xl border-2 border-yellow-500/50">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <h2
              id="productos"
              className="text-3xl font-black text-yellow-500 flex items-center gap-3"
            >
              <span className="text-4xl">🔥</span>
              BLACK DEALS
              <span className="text-lg font-bold text-gray-400">
                ({sortedProducts.length} ofertas)
              </span>
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-sm text-yellow-400 font-bold hidden sm:block">
                Ordenar:
              </span>
              <select
                className="rounded-xl border-2 border-yellow-500 bg-black px-5 py-3 text-sm font-bold text-yellow-500 shadow-xl focus:outline-none focus:ring-4 focus:ring-yellow-500 transition"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              >
                <option value="nuevo">🆕 Nuevas ofertas</option>
                <option value="precio-asc">💰 Menor precio</option>
                <option value="precio-desc">💎 Mayor precio</option>
                <option value="nombre">🔤 A-Z</option>
              </select>
            </div>
          </div>
        </section>

        {/* Grid de productos Black Friday */}
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
          {sortedProducts.map((p) => {
            const pid = p?.id ?? p?._id ?? p?.sku;
            const firstUrl = pid ? imagesMap[pid]?.[0] : undefined;
            const title = p.name || p.title || p.nombre || "Producto";
            const price =
              p.price != null && !Number.isNaN(Number(p.price))
                ? Number(p.price)
                : null;
            const formattedPrice =
              price != null
                ? price.toLocaleString("es-CL", {
                    style: "currency",
                    currency: "CLP",
                  })
                : null;

            const discount = 40 + Math.floor(Math.random() * 30); // 40-70% descuento

            return (
              <article
                key={pid || title}
                onClick={() => handleProductClick(pid)}
                className="group relative bg-gray-900 rounded-2xl shadow-2xl hover:shadow-yellow-500/50 transition-all duration-300 overflow-hidden cursor-pointer border-2 border-yellow-500/30 hover:border-yellow-500 hover:scale-105"
              >
                {/* Badge de descuento */}
                <div className="absolute top-3 left-3 z-20 bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm font-black shadow-xl animate-pulse">
                  -{discount}%
                </div>
                <div className="absolute top-3 right-3 z-20 bg-yellow-500 text-black px-2 py-1 rounded-full text-xs font-black">
                  🔥 HOT
                </div>

                <div className="relative bg-black aspect-square overflow-hidden">
                  {firstUrl ? (
                    <img
                      src={firstUrl}
                      alt={title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-gray-800 to-black flex items-center justify-center">
                      <div className="text-7xl animate-pulse">🛒</div>
                    </div>
                  )}
                  {/* Overlay dorado al hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-yellow-500/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>

                <div className="p-4 bg-gradient-to-br from-gray-900 to-black">
                  <h3 className="text-sm md:text-base font-bold text-white truncate mb-3">
                    {title}
                  </h3>
                  {p.description && (
                    <p className="text-xs text-gray-400 line-clamp-2 mb-3">
                      {String(p.description)}
                    </p>
                  )}
                  <div className="space-y-2">
                    {formattedPrice && (
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs text-gray-500 line-through">
                          {((price * (100 + discount)) / 100).toLocaleString(
                            "es-CL",
                            {
                              style: "currency",
                              currency: "CLP",
                            }
                          )}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2">
                      {formattedPrice ? (
                        <span className="text-xl md:text-2xl font-black text-yellow-500">
                          {formattedPrice}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">Consultar</span>
                      )}
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 px-4 py-2.5 text-sm font-black text-black hover:from-yellow-400 hover:to-orange-400 shadow-xl hover:shadow-2xl transition-all transform hover:scale-110"
                        onClick={(e) => handleAddToCart(e, p)}
                      >
                        <span>🛒</span>
                        <span className="hidden sm:inline">COMPRAR</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Efecto de brillo en las esquinas */}
                <div className="absolute top-0 left-0 w-20 h-20 bg-yellow-500/20 blur-2xl rounded-full" />
                <div className="absolute bottom-0 right-0 w-20 h-20 bg-yellow-500/20 blur-2xl rounded-full" />
              </article>
            );
          })}
        </section>
      </main>

      {/* Footer premium Black Friday */}
      <footer className="relative z-10 mt-20 border-t-4 border-yellow-500 bg-black">
        <div className="container mx-auto px-4 py-10">
          <div className="text-center space-y-6">
            <div className="flex justify-center gap-5 text-5xl">
              <span className="animate-bounce">⚡</span>
              <span
                className="animate-bounce"
                style={{ animationDelay: "0.1s" }}
              >
                🔥
              </span>
              <span
                className="animate-bounce"
                style={{ animationDelay: "0.2s" }}
              >
                💰
              </span>
              <span
                className="animate-bounce"
                style={{ animationDelay: "0.3s" }}
              >
                🛒
              </span>
              <span
                className="animate-bounce"
                style={{ animationDelay: "0.4s" }}
              >
                💳
              </span>
            </div>
            <div className="space-y-2">
              <p className="text-yellow-500 font-black text-2xl">
                {storeName} BLACK FRIDAY
              </p>
              <p className="text-gray-400 text-sm">
                © {new Date().getFullYear()} • Las mejores ofertas del año
              </p>
            </div>
            <div className="flex justify-center gap-8 text-sm text-gray-400 font-semibold">
              <a href="#" className="hover:text-yellow-500 transition">
                Términos
              </a>
              <span>•</span>
              <a href="#" className="hover:text-yellow-500 transition">
                Privacidad
              </a>
              <span>•</span>
              <a href="#" className="hover:text-yellow-500 transition">
                Soporte
              </a>
            </div>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }

        .particle {
          animation: float-particle linear infinite;
        }
        @keyframes float-particle {
          0% { transform: translateY(0) translateX(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(-100vh) translateX(50px); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
