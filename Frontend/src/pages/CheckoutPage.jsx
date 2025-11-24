import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../contexts/CartContext";
import { transbankAPI, authAPI, productAPI } from "../services/api";

function ensureSessionId() {
  let sid = localStorage.getItem("cart.sessionId");
  if (!sid) {
    sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem("cart.sessionId", sid);
  }
  return sid;
}

function postToWebpay(url, token) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = url;
  const input = document.createElement("input");
  input.type = "hidden";
  input.name = "token_ws";
  input.value = token;
  form.appendChild(input);
  document.body.appendChild(form);
  form.submit();
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const {
    items,
    updateQuantity,
    removeFromCart,
    clearCart,
    subtotal,
    totalItems,
    loading: cartLoading,
    error: cartError,
    fetchCart,
  } = useCart();
  const [loadingPay, setLoadingPay] = useState(false);
  const [error, setError] = useState("");
  const [imagesMap, setImagesMap] = useState({});

  useEffect(() => {
    fetchCart();
    // eslint-disable-next-line
  }, []);

  // Cargar imágenes de productos en el carrito
  useEffect(() => {
    let isMounted = true;

    const loadImages = async () => {
      if (!items || items.length === 0) return;

      const ids = [
        ...new Set(
          items
            .map((it) => it.id ?? it.producto_id ?? it.productId)
            .filter(Boolean)
        ),
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
        console.error("Error loading cart images:", err);
      }
    };

    loadImages();

    return () => {
      isMounted = false;
    };
  }, [items]);

  const requiresLogin = useMemo(() => {
    try {
      return !(authAPI?.isAuthenticated?.() && authAPI?.getCurrentUser?.());
    } catch {
      return true;
    }
  }, []);

  const handlePay = async () => {
    setError("");
    if (cartLoading) return;
    if (items.length === 0) {
      setError("Tu carrito está vacío.");
      return;
    }
    if (requiresLogin) {
      navigate("/login?redirect=/checkout");
      return;
    }
    try {
      setLoadingPay(true);
      const sessionId = ensureSessionId();
      const amount = Math.max(1, Math.trunc(Number(subtotal) || 0));
      const returnUrl = `${window.location.origin}/payment/return`;
      const resp = await transbankAPI.createTransaction({
        amount,
        sessionId,
        returnUrl,
      });
      if (!resp?.url || !resp?.token)
        throw new Error("Respuesta inválida de Transbank");
      postToWebpay(resp.url, resp.token);
    } catch (e) {
      setError(e.message || "No se pudo iniciar el pago");
      setLoadingPay(false);
    }
  };

  if (cartLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <div className="rounded-xl border border-gray-200 bg-white p-10 shadow-sm">
          <div className="mb-4 text-blue-600">Cargando carrito...</div>
        </div>
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 3h2l.4 2M7 13h10l3-8H6.4M7 13l-2 7h12m0 0a2 2 0 100 4 2 2 0 000-4m-12 0a2 2 0 100 4 2 2 0 000-4"
              />
            </svg>
          </div>
          <h1 className="mb-2 text-2xl font-semibold text-gray-900">
            Tu carrito está vacío
          </h1>
          <p className="mb-6 text-gray-600">
            Explora nuestros productos y agrega tus favoritos.
          </p>
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center rounded-lg bg-blue-600 px-5 py-2.5 text-white shadow hover:bg-blue-700"
          >
            Ir a la tienda
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="mb-6 text-3xl font-bold tracking-tight text-gray-900">
        Carrito de compras
      </h1>

      {(error || cartError) && (
        <div className="mb-6 rounded-md border border-red-200 bg-red-50 p-4 text-red-700">
          <div className="flex">
            <svg
              className="mr-2 h-5 w-5 shrink-0"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{error || cartError}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Columna izquierda: Items */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Tienes {totalItems} artículo(s) en tu carrito
            </p>
            <button
              onClick={() => clearCart()}
              className="text-sm font-medium text-red-600 hover:text-red-700"
            >
              Vaciar carrito
            </button>
          </div>

          <ul className="space-y-4">
            {items.map((it, idx) => {
              const productId =
                it.id ??
                it.producto_id ??
                it.productId ??
                (it.raw &&
                  (it.raw.id ?? it.raw.producto_id ?? it.raw.productId)) ??
                idx;

              const itemName =
                it.name ||
                it.title ||
                it.nombre ||
                (it.raw && (it.raw.title || it.raw.nombre || it.raw.name)) ||
                `Producto ${productId}`;

              const unitPrice = it.unit_price ?? it.price ?? 0;
              const qty = it.quantity ?? 1;
              const totalPrice = it.total_price ?? unitPrice * qty;

              // Usar imagen del mapa o fallback a it.image
              const imageUrl = productId ? imagesMap[productId]?.[0] : null;
              const hasImage = imageUrl || it.image;

              return (
                <li
                  key={productId}
                  className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-center gap-4">
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md border bg-gray-100">
                      {hasImage ? (
                        <img
                          src={imageUrl || it.image}
                          alt={itemName}
                          className="h-full w-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                            const placeholder =
                              e.currentTarget.parentElement.querySelector(
                                ".image-placeholder"
                              );
                            if (placeholder) placeholder.style.display = "flex";
                          }}
                        />
                      ) : null}
                      <div
                        className="image-placeholder absolute inset-0 flex items-center justify-center text-gray-400"
                        style={{ display: hasImage ? "none" : "flex" }}
                      >
                        <svg
                          className="w-8 h-8"
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
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-base font-medium text-gray-900">
                            {itemName}
                          </h3>
                          <p className="mt-1 text-sm text-gray-500">
                            {unitPrice.toLocaleString("es-CL", {
                              style: "currency",
                              currency: "CLP",
                              minimumFractionDigits: 0,
                            })}{" "}
                            c/u
                          </p>
                        </div>
                        <div className="text-right text-base font-semibold text-gray-900">
                          {totalPrice.toLocaleString("es-CL", {
                            style: "currency",
                            currency: "CLP",
                            minimumFractionDigits: 0,
                          })}
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <div className="inline-flex items-center rounded-lg border border-gray-200">
                          <button
                            onClick={() =>
                              !cartLoading &&
                              productId &&
                              updateQuantity(productId, Math.max(1, qty - 1))
                            }
                            className="h-9 w-9 rounded-l-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                            aria-label="Disminuir"
                            disabled={cartLoading || qty <= 1 || !productId}
                          >
                            −
                          </button>
                          <input
                            type="number"
                            min={1}
                            className="h-9 w-14 border-x border-gray-200 text-center text-sm outline-none"
                            value={qty}
                            onChange={(e) => {
                              const val = parseInt(e.target.value || "1", 10);
                              if (!cartLoading && productId) {
                                updateQuantity(
                                  productId,
                                  isNaN(val) ? 1 : Math.max(1, val)
                                );
                              }
                            }}
                            disabled={cartLoading || !productId}
                          />
                          <button
                            onClick={() =>
                              !cartLoading &&
                              productId &&
                              updateQuantity(productId, qty + 1)
                            }
                            className="h-9 w-9 rounded-r-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                            aria-label="Aumentar"
                            disabled={cartLoading || !productId}
                          >
                            +
                          </button>
                        </div>
                        <button
                          onClick={() =>
                            !cartLoading &&
                            productId &&
                            removeFromCart(productId)
                          }
                          className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                          disabled={cartLoading || !productId}
                        >
                          Quitar
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Columna derecha: Resumen */}
        <aside className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Resumen de la orden
            </h2>

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium text-gray-900">
                  {subtotal.toLocaleString("es-CL", {
                    style: "currency",
                    currency: "CLP",
                    minimumFractionDigits: 0,
                  })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Envío</span>
                <span className="text-gray-500">Se calcula en el pago</span>
              </div>
            </div>

            <div className="mt-4 border-t pt-4">
              <div className="flex items-center justify-between text-base">
                <span className="font-semibold text-gray-900">Total</span>
                <span className="font-bold text-gray-900">
                  {subtotal.toLocaleString("es-CL", {
                    style: "currency",
                    currency: "CLP",
                    minimumFractionDigits: 0,
                  })}
                </span>
              </div>
            </div>

            <button
              onClick={handlePay}
              disabled={loadingPay || cartLoading}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-5 py-2.5 text-white shadow hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingPay ? (
                <>
                  <svg
                    className="h-5 w-5 animate-spin text-white"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4A4 4 0 004 12z"
                    ></path>
                  </svg>
                  Redirigiendo a Webpay...
                </>
              ) : (
                "Proceder al pago"
              )}
            </button>

            <button
              onClick={() => navigate("/")}
              className="mt-3 inline-flex w-full items-center justify-center rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-gray-700 hover:bg-gray-50"
            >
              Seguir comprando
            </button>
          </div>

          <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
            Pagos seguros con Webpay Plus (ambiente de prueba).
          </div>
        </aside>
      </div>
    </div>
  );
}
