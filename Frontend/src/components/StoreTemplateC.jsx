import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CartContext } from "../contexts/CartContext";
import { productAPI, getStoreConfig } from "../services/api";

export default function StoreTemplateC({
  products = [],
  storeName: storeNameProp,
  logo,
  icon,
  logoSrc,
  headerColor = "#111827",
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
    showToast(`"${name}" agregado al carrito 🎃`);
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
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900 to-black text-orange-50 relative overflow-hidden">
      {/* Decoraciones Halloween de fondo */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Murciélagos voladores */}
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={`bat-${i}`}
            className="bat absolute text-2xl opacity-40"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 8}s`,
              animationDuration: `${6 + Math.random() * 4}s`,
            }}
          >
            🦇
          </div>
        ))}
        {/* Telarañas decorativas */}
        <div className="absolute top-0 left-0 text-6xl text-gray-600/20">
          🕸️
        </div>
        <div className="absolute top-0 right-0 text-6xl text-gray-600/20 scale-x-[-1]">
          🕸️
        </div>
        <div className="absolute bottom-0 left-0 text-6xl text-gray-600/20">
          🕸️
        </div>
        <div className="absolute bottom-0 right-0 text-6xl text-gray-600/20 scale-x-[-1]">
          🕸️
        </div>
        {/* Niebla */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-purple-900/40 to-transparent" />
      </div>

      {/* Toast Notification espeluznante */}
      {toast.show && (
        <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
          <div className="bg-gradient-to-r from-orange-600 to-purple-700 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 border-2 border-orange-500">
            <span className="text-2xl animate-bounce">👻</span>
            <span className="font-bold">{toast.message}</span>
          </div>
        </div>
      )}

      <main className="container mx-auto px-4 py-8 relative z-10">
        {/* Hero Halloween */}
        <section className="mb-10">
          <div className="relative overflow-hidden rounded-3xl shadow-2xl">
            <div className="relative p-10 md:p-14 bg-gradient-to-br from-purple-900 via-orange-900 to-black rounded-3xl border-4 border-orange-600">
              {/* Calabazas decorativas */}
              <div className="absolute top-0 left-0 right-0 flex justify-around opacity-30">
                {Array.from({ length: 8 }).map((_, i) => (
                  <span
                    key={`pumpkin-${i}`}
                    className="text-4xl animate-pulse"
                    style={{ animationDelay: `${i * 0.2}s` }}
                  >
                    🎃
                  </span>
                ))}
              </div>

              <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
                {logoProp && (
                  <div className="relative">
                    <div className="absolute -inset-2 bg-orange-600 rounded-full blur-lg opacity-50 animate-pulse" />
                    <img
                      src={logoProp}
                      alt={`${storeName} logo`}
                      className="relative w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-orange-600 shadow-xl object-cover"
                    />
                  </div>
                )}
                <div className="flex-1 text-center md:text-left">
                  <h1 className="text-4xl md:text-5xl font-bold flex items-center justify-center md:justify-start gap-3 mb-4">
                    <span>👻</span>
                    <span className="text-orange-500 drop-shadow-[0_0_15px_rgba(251,146,60,0.8)]">
                      {storeName}
                    </span>
                    <span>🎃</span>
                  </h1>
                  <p className="text-xl md:text-2xl text-orange-300 font-bold mb-2">
                    🕷️ Especial Halloween 2024 🕷️
                  </p>
                  <p className="text-lg text-orange-100/90">
                    ¡Ofertas terroríficamente buenas! 💀
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3 justify-center md:justify-start">
                    <a
                      href="#productos"
                      className="inline-flex items-center gap-2 rounded-full bg-orange-600 px-6 py-3 text-base font-bold text-white shadow-lg hover:bg-orange-500 hover:scale-105 transition-transform"
                    >
                      👻 Ver Productos Espeluznantes
                    </a>
                    <div className="inline-flex items-center gap-2 rounded-full bg-purple-700 px-6 py-3 text-base font-semibold text-white shadow-lg animate-pulse">
                      🦇 Ofertas Limitadas
                    </div>
                  </div>
                </div>
              </div>

              {/* Luna fantasmal */}
              <div className="absolute top-4 right-4 text-7xl opacity-40 animate-float">
                🌕
              </div>
            </div>
          </div>
        </section>

        {/* Barra de información tenebrosa */}
        <section className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-r from-purple-800 to-purple-900 rounded-2xl p-5 shadow-xl border-2 border-orange-600 text-center transform hover:scale-105 transition">
            <div className="text-3xl mb-2">🕸️</div>
            <h3 className="font-bold text-lg mb-1">Envío Fantasmal</h3>
            <p className="text-sm text-orange-200">Llega en la oscuridad</p>
          </div>
          <div className="bg-gradient-to-r from-orange-700 to-orange-800 rounded-2xl p-5 shadow-xl border-2 border-purple-600 text-center transform hover:scale-105 transition">
            <div className="text-3xl mb-2">🎃</div>
            <h3 className="font-bold text-lg mb-1">Descuentos de Miedo</h3>
            <p className="text-sm text-orange-100">Hasta 60% OFF</p>
          </div>
          <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-2xl p-5 shadow-xl border-2 border-orange-600 text-center transform hover:scale-105 transition">
            <div className="text-3xl mb-2">🦇</div>
            <h3 className="font-bold text-lg mb-1">Atención Nocturna</h3>
            <p className="text-sm text-orange-200">24/7 para tus sustos</p>
          </div>
        </section>

        {/* Toolbar tenebroso */}
        <section className="mb-6 bg-black/40 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-orange-600/50">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <h2
              id="productos"
              className="text-2xl font-bold text-orange-500 flex items-center gap-2"
            >
              <span>🎃</span>
              Catálogo del Terror
              <span className="text-base text-orange-300">
                ({sortedProducts.length} maldiciones)
              </span>
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-sm text-orange-300 hidden sm:block">
                Ordenar por:
              </span>
              <select
                className="rounded-xl border-2 border-orange-600 bg-gray-900/90 px-4 py-2.5 text-sm font-medium text-orange-300 shadow-md focus:outline-none focus:ring-4 focus:ring-orange-600 transition"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              >
                <option value="nuevo">🆕 Lo más nuevo</option>
                <option value="precio-asc">💰 Precio: menor a mayor</option>
                <option value="precio-desc">💎 Precio: mayor a menor</option>
                <option value="nombre">🔤 Nombre</option>
              </select>
            </div>
          </div>
        </section>

        {/* Grid de productos Halloween */}
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

            return (
              <article
                key={pid || title}
                onClick={() => handleProductClick(pid)}
                className="group relative bg-gradient-to-br from-gray-900 to-purple-900 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden cursor-pointer border-4 border-orange-600 hover:scale-105 hover:border-purple-500"
              >
                {/* Etiqueta de Halloween */}
                <div className="absolute top-2 right-2 z-10 bg-orange-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg animate-pulse">
                  👻 Halloween
                </div>

                <div className="relative bg-gradient-to-br from-purple-950 to-gray-900 aspect-square overflow-hidden">
                  {firstUrl ? (
                    <img
                      src={firstUrl}
                      alt={title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-purple-900 to-black flex items-center justify-center">
                      <div className="text-6xl animate-pulse">🎃</div>
                    </div>
                  )}
                  {/* Overlay fantasmal al hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-purple-900/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>

                <div className="p-4 bg-gradient-to-br from-gray-900 to-purple-950">
                  <h3 className="text-sm md:text-base font-bold text-orange-400 truncate mb-2">
                    {title}
                  </h3>
                  {p.description && (
                    <p className="text-xs text-gray-400 line-clamp-2 mb-3">
                      {String(p.description)}
                    </p>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    {formattedPrice ? (
                      <div className="flex flex-col">
                        <span className="text-lg md:text-xl font-bold text-orange-500">
                          {formattedPrice}
                        </span>
                        <span className="text-xs text-gray-500 line-through">
                          {(price * 1.4).toLocaleString("es-CL", {
                            style: "currency",
                            currency: "CLP",
                          })}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">Consultar</span>
                    )}
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-600 to-purple-700 px-3 py-2 text-xs font-bold text-white hover:from-orange-700 hover:to-purple-800 shadow-lg hover:shadow-xl transition-all transform hover:scale-110"
                      onClick={(e) => handleAddToCart(e, p)}
                    >
                      <span>🛒</span>
                      <span className="hidden sm:inline">Agregar</span>
                    </button>
                  </div>
                </div>

                {/* Decoración de arañas */}
                <div className="absolute top-1 left-1 text-purple-500 text-xs opacity-50">
                  🕷️
                </div>
                <div className="absolute bottom-1 right-1 text-purple-500 text-xs opacity-50">
                  🕷️
                </div>
              </article>
            );
          })}
        </section>
      </main>

      {/* Footer Halloween */}
      <footer className="relative z-10 mt-16 border-t-4 border-orange-600 bg-gradient-to-r from-black via-purple-950 to-black">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center space-y-4">
            <div className="flex justify-center gap-4 text-4xl">
              <span className="animate-bounce">🎃</span>
              <span
                className="animate-bounce"
                style={{ animationDelay: "0.1s" }}
              >
                👻
              </span>
              <span
                className="animate-bounce"
                style={{ animationDelay: "0.2s" }}
              >
                🦇
              </span>
              <span
                className="animate-bounce"
                style={{ animationDelay: "0.3s" }}
              >
                🕷️
              </span>
              <span
                className="animate-bounce"
                style={{ animationDelay: "0.4s" }}
              >
                💀
              </span>
            </div>
            <p className="text-orange-500 font-bold text-lg">
              © {new Date().getFullYear()} {storeName}
            </p>
            <p className="text-orange-300/80 text-sm">
              ¡Feliz Halloween! 🎃 Que tus sustos sean grandes y tus ofertas aún
              mayores
            </p>
            <div className="flex justify-center gap-6 text-sm text-orange-400">
              <a href="#" className="hover:text-orange-300 transition">
                Términos
              </a>
              <span>•</span>
              <a href="#" className="hover:text-orange-300 transition">
                Privacidad
              </a>
              <span>•</span>
              <a href="#" className="hover:text-orange-300 transition">
                Contacto
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

        .bat {
          position: absolute;
          animation: fly linear infinite;
        }
        @keyframes fly {
          0% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(20vw, 10vh) rotate(10deg); }
          50% { transform: translate(40vw, -5vh) rotate(-10deg); }
          75% { transform: translate(60vw, 15vh) rotate(5deg); }
          100% { transform: translate(100vw, 0) rotate(0deg); }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
