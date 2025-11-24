import { useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CartContext } from "../contexts/CartContext";
import { productAPI } from "../services/api";

export default function StoreTemplateB({
    products = [],
    storeName = "Mi Tienda",
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

    useEffect(() => {
        let cancelled = false;

        async function loadImages() {
            if (!Array.isArray(products) || products.length === 0) return;

            const ids = [
                ...new Set(products.map((p) => p?.id ?? p?._id ?? p?.sku).filter(Boolean)),
            ];

            // calcular faltantes usando ref para evitar loops de deps
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
                // no bloquear la app por errores de imagenes
                // eslint-disable-next-line no-console
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
        <div className="min-h-screen bg-red-50 text-slate-900">
            {toast.show && (
                <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
                    <div className="bg-emerald-700 text-white px-5 py-3 rounded-lg shadow-lg flex items-center gap-3 border-2 border-red-600">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
                            <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.7-9.3a1 1 0 00-1.4-1.4L9 10.6 7.7 9.3a1 1 0 00-1.4 1.4l2 2a1 1 0 001.4 0l4-4z" />
                        </svg>
                        <span className="font-medium">{toast.message}</span>
                    </div>
                </div>
            )}

            <main className="container mx-auto px-4 py-6">
                {/* Hero navideño */}
                <section className="mb-8">
                    <div className="relative overflow-hidden rounded-2xl shadow-lg">
                        <div className="p-8 md:p-10 text-white bg-gradient-to-br from-red-700 via-rose-600 to-emerald-800 rounded-2xl">
                            {/* nieve (decorativa) */}
                            <div className="pointer-events-none absolute inset-0 -z-10">
                                {Array.from({ length: 14 }).map((_, i) => (
                                    <span
                                        key={i}
                                        className="snowflake text-white/90"
                                        style={{
                                            left: `${(i * 11) % 100}%`,
                                            animationDelay: `${(i % 6) * 0.45}s`,
                                            fontSize: `${8 + (i % 4) * 3}px`,
                                        }}
                                    >
                                        ❆
                                    </span>
                                ))}
                            </div>

                            <div className="flex items-center gap-4">
                                {logoProp && (
                                    <img
                                        src={logoProp}
                                        alt={`${storeName} logo`}
                                        className="w-16 h-16 rounded-full border-2 border-white shadow-sm object-cover"
                                    />
                                )}
                                <div>
                                    <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                                        <span>{storeName}</span>
                                        <span className="text-lg" aria-hidden>
                                            🎄
                                        </span>
                                    </h2>
                                    <p className="mt-2 text-white/90">
                                        Regalos, ofertas y espíritu navideño.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-4">
                                <a
                                    href="#productos"
                                    className="inline-flex items-center gap-2 rounded-lg bg-white/95 px-4 py-2 text-sm font-semibold text-red-700 shadow hover:translate-y-[-1px] transition"
                                >
                                    Ver productos festivos
                                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
                                        <path d="M10.3 15.7a1 1 0 0 1 0-1.4L12.6 12H5a1 1 0 1 1 0-2h7.6L10.3 7.7a1 1 0 1 1 1.4-1.4l4 4a1 1 0 0 1 0 1.4l-4 4a1 1 0 0 1-1.4 0z" />
                                    </svg>
                                </a>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Toolbar */}
                <section className="mb-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <h3 id="productos" className="text-xl font-semibold text-slate-900">
                        Productos navideños
                    </h3>
                    <div className="flex items-center gap-2">
                        <select
                            className="rounded-lg border border-red-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                        const title = p.name || p.title || p.nombre || "Producto";
                        const price =
                            p.price != null && !Number.isNaN(Number(p.price))
                                ? Number(p.price)
                                : null;
                        const formattedPrice =
                            price != null
                                ? price.toLocaleString("es-CL", { style: "currency", currency: "CLP" })
                                : null;

                        return (
                            <article
                                key={pid || title}
                                onClick={() => handleProductClick(pid)}
                                className="group bg-white rounded-xl shadow-sm ring-1 ring-red-200 hover:shadow-md transition overflow-hidden cursor-pointer"
                            >
                                <div className="relative bg-emerald-50 aspect-square overflow-hidden">
                                    {firstUrl ? (
                                        <img
                                            src={firstUrl}
                                            alt={title}
                                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                        />
                                    ) : (
                                        <div className="h-full w-full bg-emerald-100 flex items-center justify-center">
                                            <svg
                                                className="w-16 h-16 text-emerald-300"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                                aria-hidden
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                    )}
                                </div>

                                <div className="p-3">
                                    <h4 className="text-sm font-medium text-slate-900 truncate">
                                        {title}
                                    </h4>
                                    {p.description && (
                                        <p className="mt-1 text-xs text-slate-600 line-clamp-2">
                                            {String(p.description)}
                                        </p>
                                    )}
                                    <div className="mt-3 flex items-center justify-between">
                                        {formattedPrice ? (
                                            <span className="text-base font-semibold text-slate-900">
                                                {formattedPrice}
                                            </span>
                                        ) : (
                                            <span className="text-sm text-slate-500">Sin precio</span>
                                        )}
                                        <button
                                            type="button"
                                            className="inline-flex items-center gap-1 rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 transition"
                                            onClick={(e) => handleAddToCart(e, p)}
                                        >
                                            Agregar
                                            <svg width="14" height="14" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
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

            <footer className="mt-10 border-t border-red-200">
                <div className="container mx-auto px-4 py-6 text-sm text-slate-700">
                    © {new Date().getFullYear()} {storeName}. ¡Felices fiestas!
                </div>
            </footer>

            <style>{`
                @keyframes slide-up {
                  from { transform: translateY(100%); opacity: 0; }
                  to   { transform: translateY(0); opacity: 1; }
                }
                .animate-slide-up { animation: slide-up 0.28s ease-out; }

                .snowflake {
                  position: absolute;
                  top: -8%;
                  user-select: none;
                  pointer-events: none;
                  animation-name: fall;
                  animation-duration: 9s;
                  animation-timing-function: linear;
                  animation-iteration-count: infinite;
                }
                @keyframes fall {
                  0% { transform: translateY(-10vh) rotate(0deg); opacity: 0; }
                  10% { opacity: 1; }
                  100% { transform: translateY(110vh) rotate(360deg); opacity: 0.9; }
                }
            `}</style>
        </div>
    );
}
