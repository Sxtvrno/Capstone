import { useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CartContext } from "../contexts/CartContext";
import { productAPI, getStoreConfig } from "../services/api";

export default function StoreTemplateB({
  products = [],
  storeName: storeNameProp,
  logo,
  icon,
  logoSrc,
}) {
  const navigate = useNavigate();
  const { addToCart } = useContext(CartContext);
  const logoProp = logo || icon || logoSrc;
  const [imagesMap, setImagesMap] = useState({});
  const imagesMapRef = useRef(imagesMap);
  imagesMapRef.current = imagesMap;
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
        ...new Set(
          products.map((p) => p?.id ?? p?._id ?? p?.sku).filter(Boolean)
        ),
      ];

      const existing = new Set(Object.keys(imagesMapRef.current || {}));
      const missing = ids.filter((id) => !existing.has(String(id)));
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
  }, [products]);

  const showToast = (message) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: "" }), 3000);
  };

  const handleProductClick = (productId) => {
    if (!productId) return;
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
    showToast(`"${name}" agregado al carrito`);
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
    <div className="min-h-screen bg-gradient-to-b from-red-900 via-red-800 to-green-900 text-white relative overflow-hidden">
      {/* Decoraciones navideñas de fondo */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* Nieve cayendo */}
        {Array.from({ length: 50 }).map((_, i) => (
          <span
            key={`snow-${i}`}
            className="snowflake absolute text-white/80"
            style={{
              left: `${Math.random() * 100}%`,
              top: `-${Math.random() * 20}%`,
              animationDelay: `${Math.random() * 10}s`,
              fontSize: `${10 + Math.random() * 15}px`,
              animationDuration: `${8 + Math.random() * 6}s`,
            }}
          >
            ❄
          </span>
        ))}
        {/* Luces navideñas decorativas */}
        <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 to-red-500 opacity-60" />
        <div className="absolute top-4 left-0 right-0 flex justify-around">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={`light-${i}`}
              className="w-3 h-3 rounded-full animate-pulse"
              style={{
                backgroundColor: ["#ef4444", "#eab308", "#22c55e", "#3b82f6"][
                  i % 4
                ],
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Toast notification */}
      {toast.show && (
        <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
          <div className="bg-green-700 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 border-2 border-yellow-400">
            <span className="text-2xl">🎁</span>
            <span className="font-semibold">{toast.message}</span>
          </div>
        </div>
      )}

      <main className="container mx-auto px-4 py-8 relative z-10">
        {/* Hero navideño mejorado */}
        <section className="mb-10">
          <div className="relative overflow-hidden rounded-3xl shadow-2xl">
            <div className="relative p-10 md:p-14 bg-gradient-to-br from-red-600 via-red-700 to-green-800 rounded-3xl border-4 border-yellow-400">
              {/* Guirnaldas decorativas */}
              <div className="absolute top-0 left-0 right-0 flex justify-around opacity-40">
                {Array.from({ length: 8 }).map((_, i) => (
                  <span key={`garland-${i}`} className="text-4xl">
                    🎄
                  </span>
                ))}
              </div>

              <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
                {logoProp && (
                  <div className="relative">
                    <div className="absolute -inset-2 bg-yellow-400 rounded-full blur-lg opacity-50 animate-pulse" />
                    <img
                      src={logoProp}
                      alt={`${storeName} logo`}
                      className="relative w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-yellow-400 shadow-xl object-cover"
                    />
                  </div>
                )}
                <div className="flex-1 text-center md:text-left">
                  <h1 className="text-4xl md:text-5xl font-bold flex items-center justify-center md:justify-start gap-3 mb-4">
                    <span>🎅</span>
                    <span className="text-yellow-300 drop-shadow-lg">
                      {storeName}
                    </span>
                    <span>🎄</span>
                  </h1>
                  <p className="text-xl md:text-2xl text-yellow-100 font-medium mb-2">
                    ✨ Especial Navidad 2024 ✨
                  </p>
                  <p className="text-lg text-white/90">
                    Los mejores regalos para esta temporada festiva 🎁
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3 justify-center md:justify-start">
                    <a
                      href="#productos"
                      className="inline-flex items-center gap-2 rounded-full bg-yellow-400 px-6 py-3 text-base font-bold text-red-800 shadow-lg hover:bg-yellow-300 hover:scale-105 transition-transform"
                    >
                      🎁 Ver Regalos Navideños
                    </a>
                    <div className="inline-flex items-center gap-2 rounded-full bg-green-700 px-6 py-3 text-base font-semibold text-white shadow-lg">
                      🔔 Ofertas Limitadas
                    </div>
                  </div>
                </div>
              </div>

              {/* Decoración de estrellas */}
              <div className="absolute bottom-4 right-4 text-6xl opacity-20 animate-spin-slow">
                ⭐
              </div>
            </div>
          </div>
        </section>

        {/* Barra de información festiva */}
        <section className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-2xl p-5 shadow-xl border-2 border-yellow-400 text-center">
            <div className="text-3xl mb-2">🚚</div>
            <h3 className="font-bold text-lg mb-1">Envío Express</h3>
            <p className="text-sm text-yellow-100">Llega antes de Navidad</p>
          </div>
          <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-2xl p-5 shadow-xl border-2 border-yellow-400 text-center">
            <div className="text-3xl mb-2">🎁</div>
            <h3 className="font-bold text-lg mb-1">Envoltorio Gratis</h3>
            <p className="text-sm text-yellow-100">En todos tus regalos</p>
          </div>
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-5 shadow-xl border-2 border-yellow-400 text-center">
            <div className="text-3xl mb-2">❄️</div>
            <h3 className="font-bold text-lg mb-1">Ofertas Congeladas</h3>
            <p className="text-sm text-yellow-100">Hasta 50% de descuento</p>
          </div>
        </section>

        {/* Toolbar con estilo navideño */}
        <section className="mb-6 bg-white/10 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-yellow-400/30">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <h2
              id="productos"
              className="text-2xl font-bold text-yellow-300 flex items-center gap-2"
            >
              <span>🎄</span>
              Catálogo Navideño
              <span className="text-base text-white/80">
                ({sortedProducts.length} productos)
              </span>
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-sm text-yellow-200 hidden sm:block">
                Ordenar por:
              </span>
              <select
                className="rounded-xl border-2 border-yellow-400 bg-white/90 px-4 py-2.5 text-sm font-medium text-red-800 shadow-md focus:outline-none focus:ring-4 focus:ring-yellow-300 transition"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              >
                <option value="nuevo">🆕 Lo nuevo</option>
                <option value="precio-asc">💰 Precio: menor a mayor</option>
                <option value="precio-desc">💎 Precio: mayor a menor</option>
                <option value="nombre">🔤 Nombre</option>
              </select>
            </div>
          </div>
        </section>

        {/* Grid de productos navideños */}
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
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
                className="group relative bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden cursor-pointer border-4 border-yellow-400 hover:scale-105"
              >
                {/* Etiqueta de regalo */}
                <div className="absolute top-2 right-2 z-10 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                  🎁 Regalo
                </div>

                <div className="relative bg-gradient-to-br from-red-50 to-green-50 aspect-square overflow-hidden">
                  {firstUrl ? (
                    <img
                      src={firstUrl}
                      alt={title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-red-100 to-green-100 flex items-center justify-center">
                      <div className="text-6xl animate-pulse">🎁</div>
                    </div>
                  )}
                  {/* Overlay festivo al hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-red-900/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>

                <div className="p-4 bg-gradient-to-br from-white to-red-50">
                  <h3 className="text-sm md:text-base font-bold text-red-800 truncate mb-2">
                    {title}
                  </h3>
                  {p.description && (
                    <p className="text-xs text-gray-600 line-clamp-2 mb-3">
                      {String(p.description)}
                    </p>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    {formattedPrice ? (
                      <div className="flex flex-col">
                        <span className="text-lg md:text-xl font-bold text-green-700">
                          {formattedPrice}
                        </span>
                        <span className="text-xs text-red-600 line-through">
                          {(price * 1.3).toLocaleString("es-CL", {
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
                      className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 px-3 py-2 text-xs font-bold text-white hover:from-red-700 hover:to-red-800 shadow-lg hover:shadow-xl transition-all transform hover:scale-110"
                      onClick={(e) => handleAddToCart(e, p)}
                    >
                      <span>🛒</span>
                      <span className="hidden sm:inline">Agregar</span>
                    </button>
                  </div>
                </div>

                {/* Decoración de estrellas en las esquinas */}
                <div className="absolute top-1 left-1 text-yellow-400 text-xs opacity-50">
                  ⭐
                </div>
                <div className="absolute bottom-1 right-1 text-yellow-400 text-xs opacity-50">
                  ⭐
                </div>
              </article>
            );
          })}
        </section>
      </main>

      {/* Footer festivo */}
      <footer className="relative z-10 mt-16 border-t-4 border-yellow-400 bg-gradient-to-r from-red-900 via-green-900 to-red-900">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center space-y-4">
            <div className="flex justify-center gap-4 text-4xl">
              <span className="animate-bounce">🎅</span>
              <span
                className="animate-bounce"
                style={{ animationDelay: "0.1s" }}
              >
                🎄
              </span>
              <span
                className="animate-bounce"
                style={{ animationDelay: "0.2s" }}
              >
                🎁
              </span>
              <span
                className="animate-bounce"
                style={{ animationDelay: "0.3s" }}
              >
                ⛄
              </span>
              <span
                className="animate-bounce"
                style={{ animationDelay: "0.4s" }}
              >
                🔔
              </span>
            </div>
            <p className="text-yellow-300 font-bold text-lg">
              © {new Date().getFullYear()} {storeName}
            </p>
            <p className="text-white/80 text-sm">
              ¡Feliz Navidad y Próspero Año Nuevo! 🎉
            </p>
            <div className="flex justify-center gap-6 text-sm text-yellow-200">
              <a href="#" className="hover:text-yellow-400 transition">
                Términos
              </a>
              <span>•</span>
              <a href="#" className="hover:text-yellow-400 transition">
                Privacidad
              </a>
              <span>•</span>
              <a href="#" className="hover:text-yellow-400 transition">
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

        .snowflake {
          position: absolute;
          user-select: none;
          pointer-events: none;
          animation: fall linear infinite;
        }
        @keyframes fall {
          0% { transform: translateY(-10vh) rotate(0deg); opacity: 0; }
          10% { opacity: 1; }
          100% { transform: translateY(110vh) rotate(360deg); opacity: 0.8; }
        }

        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 20s linear infinite;
        }
      `}</style>
    </div>
  );
}
