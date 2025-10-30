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

  const clearCart = () => setItems([]);

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
