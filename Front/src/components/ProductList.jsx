// src/components/ProductList.jsx
import React, { useEffect, useState } from "react";
import { getProductos } from "../services/api"; // ✅ Importa la función nombrada

function ProductList({ onAuthError }) {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await getProductos(onAuthError);
        setProducts(response.data);
      } catch (error) {
        // El error 401 ya se maneja en getProductos
      }
    };

    fetchProducts();
  }, [onAuthError]);

  return (
    <div
      className="product-list"
      style={{ maxWidth: 600, margin: "0 auto", padding: "2rem" }}
    >
      <h2
        style={{
          fontSize: "2rem",
          marginBottom: "1.5rem",
          textAlign: "center",
        }}
      >
        Productos
      </h2>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {products.length > 0 ? (
          products.map((prod) => (
            <li
              key={prod.id}
              className="product-item"
              style={{
                background: "#f9f9f9",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                marginBottom: "1rem",
                padding: "1rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              }}
            >
              <div
                className="product-info"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span
                  className="product-name"
                  style={{ fontWeight: "bold", fontSize: "1.1rem" }}
                >
                  {prod.title}
                </span>
                <span
                  className="product-sku"
                  style={{ color: "#64748b", fontSize: "0.95rem" }}
                >
                  SKU: {prod.sku || "N/A"}
                </span>
              </div>
              <span
                className="product-description"
                style={{ color: "#334155", fontSize: "0.98rem" }}
              >
                {prod.description}
              </span>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span
                  className="product-price"
                  style={{ color: "#059669", fontWeight: "bold" }}
                >
                  Precio: ${prod.price}
                </span>
                <span style={{ color: "#2563eb" }}>
                  Stock: {prod.stock_quantity}
                </span>
                <span
                  style={{
                    color: prod.status === "activo" ? "#10b981" : "#64748b",
                  }}
                >
                  Estado: {prod.status}
                </span>
              </div>
            </li>
          ))
        ) : (
          <li style={{ textAlign: "center", color: "#64748b" }}>
            No hay productos disponibles.
          </li>
        )}
      </ul>
    </div>
  );
}

export default ProductList;
