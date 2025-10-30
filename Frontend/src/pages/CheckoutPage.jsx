import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../contexts/CartContext";
import { transbankAPI } from "../services/api";
import { authAPI } from "../services/api"; // si ya existe

function ensureSessionId() {
  let sid = localStorage.getItem("cart.sessionId");
  if (!sid) {
    sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem("cart.sessionId", sid);
  }
  return sid;
}

function postToWebpay(url, token) {
  // Crear formulario y enviarlo vía POST con token_ws
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
  } = useCart();
  const [loadingPay, setLoadingPay] = useState(false);
  const [error, setError] = useState("");

  const requiresLogin = useMemo(() => {
    try {
      return !(authAPI?.isAuthenticated?.() && authAPI?.getCurrentUser?.());
    } catch {
      return true;
    }
  }, []);

  const handlePay = async () => {
    setError("");
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

  if (!items || items.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold mb-4">Tu carrito está vacío</h1>
        <button
          onClick={() => navigate("/")}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Ir a la tienda
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Carrito de compras</h1>
        <button
          onClick={clearCart}
          className="text-red-600 hover:text-red-700 text-sm"
        >
          Vaciar carrito
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded bg-red-50 text-red-700">{error}</div>
      )}

      <div className="bg-white shadow rounded-lg divide-y">
        {items.map((it) => (
          <div key={it.id} className="p-4 flex items-center gap-4">
            <img
              src={it.image || "/no-image.png"}
              alt={it.name}
              className="w-16 h-16 object-cover rounded"
              onError={(e) => (e.currentTarget.style.visibility = "hidden")}
            />
            <div className="flex-1">
              <h3 className="font-medium">{it.name}</h3>
              <p className="text-sm text-gray-500">
                ${(it.price ?? 0).toFixed(2)} c/u
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  updateQuantity(it.id, Math.max(1, (it.quantity ?? 1) - 1))
                }
                className="w-8 h-8 rounded bg-gray-100 hover:bg-gray-200"
                aria-label="Disminuir"
              >
                -
              </button>
              <input
                type="number"
                min={1}
                className="w-14 text-center border rounded p-1"
                value={it.quantity ?? 1}
                onChange={(e) => {
                  const val = parseInt(e.target.value || "1", 10);
                  updateQuantity(it.id, isNaN(val) ? 1 : Math.max(1, val));
                }}
              />
              <button
                onClick={() => updateQuantity(it.id, (it.quantity ?? 1) + 1)}
                className="w-8 h-8 rounded bg-gray-100 hover:bg-gray-200"
                aria-label="Aumentar"
              >
                +
              </button>
            </div>

            <div className="w-24 text-right font-medium">
              ${(it.price * (it.quantity ?? 1)).toFixed(2)}
            </div>

            <button
              onClick={() => removeFromCart(it.id)}
              className="ml-2 text-sm text-red-600 hover:text-red-700"
            >
              Quitar
            </button>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <div className="text-gray-600">Artículos: {totalItems}</div>
        <div className="text-xl">
          Subtotal: <span className="font-bold">${subtotal.toFixed(2)}</span>
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <button
          onClick={() => navigate("/")}
          className="px-4 py-2 border rounded-lg hover:bg-gray-50"
        >
          Seguir comprando
        </button>
        <button
          onClick={handlePay}
          disabled={loadingPay}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60"
        >
          {loadingPay ? "Redirigiendo a Webpay..." : "Proceder al pago"}
        </button>
      </div>
    </div>
  );
}
