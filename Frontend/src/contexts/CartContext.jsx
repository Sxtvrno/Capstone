import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";
import { API_URL } from "../services/api";

export const CartContext = createContext(null);

function normalizeProduct(raw) {
  if (!raw) return null;
  const id = raw.id ?? raw.producto_id ?? raw.productId;
  const name = raw.nombre ?? raw.name ?? raw.title;
  // Si viene total_price, úsalo como price (para el carrito)
  let price = raw.precio ?? raw.price ?? raw.unit_price;
  if (price === undefined && raw.total_price !== undefined) price = raw.total_price;
  price = Number(price ?? 0);
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
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Helper to get token
  function getToken() {
    return (
      localStorage.getItem("token") ||
      localStorage.getItem("accessToken") ||
      localStorage.getItem("authToken") ||
      (() => {
        const authRaw = localStorage.getItem("auth");
        if (!authRaw) return null;
        try {
          const authObj = JSON.parse(authRaw);
          return authObj?.token || authObj?.accessToken || null;
        } catch {
          return null;
        }
      })()
    );
  }

  // Fetch cart from backend
  const fetchCart = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getToken();
      const sessionId = localStorage.getItem("cart.sessionId");
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      let url = `${API_URL}/api/cart/items`;
      if (sessionId) url += `?session_id=${encodeURIComponent(sessionId)}`;
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error("No se pudo cargar el carrito");
      const data = await res.json();
      setItems(Array.isArray(data) ? data : data.items || []);
    } catch (err) {
      setError(err.message || "Error al cargar carrito");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  // Add item to cart (backend)
    const addToCart = async (productInput, qty = 1) => {
      const p = normalizeProduct(productInput);
      if (!p || !p.id) return;
      setLoading(true);
      setError(null);
      try {
        const token = getToken();
        const sessionId = localStorage.getItem("cart.sessionId");
        const headers = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;
        const body = {
          producto_id: p.id,
          quantity: Math.max(1, Math.min(qty, p.stock)),
        };
        if (sessionId) body.session_id = sessionId;
        const res = await fetch(`${API_URL}/api/cart/items`, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("No se pudo agregar al carrito");
        await fetchCart();
      } catch (err) {
        setError(err.message || "Error al agregar al carrito");
      } finally {
        setLoading(false);
      }
    };

    // Update quantity (backend)
    const updateQuantity = async (productId, qty) => {
      setLoading(true);
      setError(null);
      try {
        const token = getToken();
        const sessionId = localStorage.getItem("cart.sessionId");
        const headers = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;
        const body = {
          quantity: Math.max(1, Math.floor(qty || 1)),
        };
        if (sessionId) body.session_id = sessionId;
        const res = await fetch(`${API_URL}/api/cart/items/${productId}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("No se pudo actualizar cantidad");
        await fetchCart();
      } catch (err) {
        setError(err.message || "Error al actualizar cantidad");
      } finally {
        setLoading(false);
      }
    };

    // Remove from cart (backend)
    const removeFromCart = async (productId) => {
      setLoading(true);
      setError(null);
      try {
        const token = getToken();
        const sessionId = localStorage.getItem("cart.sessionId");
        const headers = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;
        let url = `${API_URL}/api/cart/items/${productId}`;
        if (sessionId) url += `?session_id=${encodeURIComponent(sessionId)}`;
        const res = await fetch(url, {
          method: "DELETE",
          headers,
        });
        if (!res.ok) throw new Error("No se pudo quitar del carrito");
        await fetchCart();
      } catch (err) {
        setError(err.message || "Error al quitar del carrito");
      } finally {
        setLoading(false);
      }
    };

    // Clear cart (backend)
    const clearCart = async (sessionId) => {
      setLoading(true);
      setError(null);
      try {
        if (sessionId && typeof sessionId !== "string") {
          if (sessionId?.nativeEvent || sessionId?.target) {
            sessionId = undefined;
          } else {
            try {
              sessionId = String(sessionId);
            } catch {
              sessionId = undefined;
            }
          }
        }
        const token = getToken();
        const headers = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;
        const sid = sessionId || localStorage.getItem("cart.sessionId");
        const bodyObj = {};
        if (sid) bodyObj.session_id = sid;
        const res = await fetch(`${API_URL}/api/cart/clear`, {
          method: "POST",
          headers,
          body: Object.keys(bodyObj).length ? JSON.stringify(bodyObj) : undefined,
        });
        if (!res.ok) throw new Error("No se pudo vaciar el carrito");
        await fetchCart();
        if (sid) localStorage.removeItem("cart.sessionId");
      } catch (err) {
        setError(err.message || "Error al vaciar carrito");
      } finally {
        setLoading(false);
      }
    };

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
      loading,
      error,
      fetchCart,
    };


    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  return useContext(CartContext);
}
