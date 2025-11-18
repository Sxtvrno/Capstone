import React, { createContext, useContext, useMemo } from "react";
import useLocalStorage from "../hooks/useLocalStorage";

export const CartContext = createContext(null);

function normalizeProduct(raw) {
  if (!raw) return null;
  const id = raw.id ?? raw.producto_id ?? raw.productId;
  const name = raw.nombre ?? raw.name ?? raw.title ?? `Producto ${id ?? ""}`;
  const price = Number(raw.precio ?? raw.price ?? raw.unit_price ?? 0);
  const stock =
    raw.stock ??
    raw.stock_quantity ??
    raw.cantidad ??
    raw.stockQuantity ??
    Infinity;
  const image =
    (Array.isArray(raw.images) && raw.images[0]) ||
    raw.image ||
    raw.url_imagen ||
    raw.urlImage ||
    raw.url ||
    null;

  return { id, name, price, stock, image, raw };
}

export function CartProvider({ children }) {
  const [items, setItems] = useLocalStorage("cart.items", []);

  const addToCart = (productInput, qty = 1) => {
    const p = normalizeProduct(productInput);
    if (!p || !p.id) return;

    setItems((prev) => {
      const idx = prev.findIndex((it) => it.id === p.id);
      const nextQty = Math.max(
        1,
        Math.min((prev[idx]?.quantity ?? 0) + qty, p.stock)
      );
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], quantity: nextQty };
        return copy;
      } else {
        return [
          ...prev,
          {
            id: p.id,
            name: p.name,
            price: p.price,
            image: p.image,
            quantity: Math.max(1, Math.min(qty, p.stock)),
          },
        ];
      }
    });
  };

  const updateQuantity = (productId, qty) => {
    setItems((prev) =>
      prev
        .map((it) =>
          it.id === productId
            ? { ...it, quantity: Math.max(0, Math.floor(qty || 0)) }
            : it
        )
        .filter((it) => it.quantity > 0)
    );
  };

  const removeFromCart = (productId) => {
    setItems((prev) => prev.filter((it) => it.id !== productId));
  };

  // Reemplaza/actualiza la función clearCart para aceptar sessionId
  async function clearCart(sessionId) {
    try {
      const API_BASE =
        import.meta.env.VITE_API_BASE ||
        `${window.location.protocol}//${window.location.hostname}:8000`;

      // Obtener token de varias claves posibles
      let token =
        localStorage.getItem("token") ||
        localStorage.getItem("accessToken") ||
        localStorage.getItem("authToken");

      if (!token) {
        const authRaw = localStorage.getItem("auth");
        if (authRaw) {
          try {
            const authObj = JSON.parse(authRaw);
            token = authObj?.token || authObj?.accessToken || token;
          } catch (e) {
            // ignore
          }
        }
      }

      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      // SIEMPRE intentar enviar sessionId si está en localStorage o fue pasado
      const sid = sessionId || localStorage.getItem("cart.sessionId");
      const bodyObj = {};
      if (sid) bodyObj.session_id = sid;

      // Debug
      console.info("[clearCart] API_BASE:", API_BASE);
      console.info("[clearCart] URL:", `${API_BASE}/api/cart/clear`);
      console.info("[clearCart] headers:", headers);
      console.info("[clearCart] body:", bodyObj);

      const res = await fetch(`${API_BASE}/api/cart/clear`, {
        method: "POST",
        headers,
        body: Object.keys(bodyObj).length ? JSON.stringify(bodyObj) : undefined,
      });

      const text = await res.text();
      console.info("[clearCart] status:", res.status, "responseText:", text);

      if (!res.ok) {
        let parsed;
        try {
          parsed = JSON.parse(text);
        } catch (e) {
          parsed = text;
        }
        throw new Error(
          `clearCart failed ${res.status}: ${JSON.stringify(parsed)}`
        );
      }

      setItems([]);
      if (sid) localStorage.removeItem("cart.sessionId");
    } catch (err) {
      console.error("clearCart error:", err);
      throw err;
    }
  }

  const totalItems = useMemo(
    () => items.reduce((acc, it) => acc + (it.quantity || 0), 0),
    [items]
  );

  const subtotal = useMemo(
    () =>
      items.reduce((acc, it) => acc + (it.price || 0) * (it.quantity || 0), 0),
    [items]
  );

  const value = {
    items,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    totalItems,
    subtotal,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  return useContext(CartContext);
}
