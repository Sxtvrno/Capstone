import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";
import { API_URL } from "../services/api";

export const CartContext = createContext(null);

function normalizeProduct(raw) {
  if (!raw) return null;
  const id = raw.id ?? raw.producto_id ?? raw.productId;
  // El nombre puede venir como title, name, nombre
  const name = raw.title ?? raw.nombre ?? raw.name ?? `Producto ${id ?? ""}`;
  // El precio unitario real
  const unit_price = Number(raw.unit_price ?? raw.price ?? raw.precio ?? 0);
  // El total del producto (unit_price * quantity) o total_price
  const total_price = Number(raw.total_price ?? unit_price * (raw.quantity ?? 1));
  const stock =
    raw.stock ??
    raw.stock_quantity ??
    raw.cantidad ??
    raw.stockQuantity ??
    Infinity;
  const image =
    raw.url_imagen ||
    (Array.isArray(raw.images) && raw.images[0]) ||
    raw.image ||
    raw.urlImage ||
    raw.url ||
    null;

  return { id, name, unit_price, total_price, stock, image, quantity: raw.quantity ?? 1, raw };
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
          method: "PUT",
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

    // El subtotal debe sumar los total_price de cada item
    const subtotal = useMemo(
      () => items.reduce((acc, it) => acc + (it.total_price || 0), 0),
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
