import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TemplateNavbar from "./TemplateNavbar";
import { obtenerImagenesProducto } from "../services/api";

export default function StoreTemplateC(props) {
  const {
    storeName = "Mi Tienda",
    logo,
    icon,
    logoSrc, // compat opcional
    headerColor = "#111827",
    products = [],
    templateType,
    ...rest
  } = props;

  const navigate = useNavigate();
  const logoProp = logo || icon || logoSrc;
  const [imagesMap, setImagesMap] = useState({});
  const token = localStorage.getItem("token");

  useEffect(() => {
    let cancelled = false;
    async function loadImages() {
      if (!Array.isArray(products) || products.length === 0 || !token) return;
      const ids = [
        ...new Set(products.map((p) => p?.id ?? p?._id).filter(Boolean)),
      ];
      const missing = ids.filter((id) => !imagesMap[id]);
      if (missing.length === 0) return;

      try {
        const results = await Promise.all(
          missing.map(async (id) => {
            try {
              const imgs = await obtenerImagenesProducto(id, token);
              const urls = Array.isArray(imgs)
                ? imgs
                    .map((it) => it.url_imagen || it.url || it.urlImage)
                    .filter(Boolean)
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
      } catch {
        // noop
      }
    }
    loadImages();
    return () => {
      cancelled = true;
    };
  }, [products, token, imagesMap]);

  const handleProductClick = (productId) => {
    navigate(`/product/${productId}`);
  };

  const handleViewClick = (e, productId) => {
    e.stopPropagation();
    navigate(`/product/${productId}`);
  };

  const list = {
    display: "flex",
    flexDirection: "column",
    gap: 14,
    padding: 16,
    maxWidth: 900,
    margin: "18px auto",
  };
  const row = {
    display: "flex",
    gap: 16,
    alignItems: "center",
    background: "#fff",
    padding: 12,
    borderRadius: 8,
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
    cursor: "pointer",
    transition: "all 0.2s",
  };
  const img = { width: 220, height: 140, objectFit: "cover", borderRadius: 6 };

  return (
    <div>
      <TemplateNavbar
        storeName={storeName}
        logo={logoProp}
        headerColor={headerColor}
      />
      <main>
        <section style={list}>
          {products.map((p) => {
            const pid = p?.id ?? p?._id ?? p?.sku;
            const firstUrl = pid ? imagesMap[pid]?.[0] : undefined;
            return (
              <article
                key={pid || p?.title || p?.name}
                style={row}
                onClick={() => handleProductClick(pid)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow =
                    "0 4px 12px rgba(0,0,0,0.12)";
                  e.currentTarget.style.transform = "translateX(4px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow =
                    "0 1px 4px rgba(0,0,0,0.06)";
                  e.currentTarget.style.transform = "translateX(0)";
                }}
              >
                <div
                  style={{
                    width: img.width,
                    height: img.height,
                    background: "#f3f4f6",
                    borderRadius: img.borderRadius,
                    overflow: "hidden",
                  }}
                >
                  {firstUrl && (
                    <img
                      src={firstUrl}
                      alt={p.name || p.title || "Producto"}
                      style={img}
                    />
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: 0 }}>
                    {p.title || p.name || "Producto"}
                  </h3>
                  {p.description && (
                    <p style={{ color: "#6b7280", margin: "6px 0" }}>
                      {p.description}
                    </p>
                  )}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    {p.price != null && (
                      <strong>${Number(p.price).toFixed(0)}</strong>
                    )}
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        style={{
                          background: "#10b981",
                          color: "#fff",
                          border: "none",
                          padding: "6px 8px",
                          borderRadius: 6,
                          cursor: "pointer",
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        Comprar
                      </button>
                      <button
                        style={{
                          background: "transparent",
                          border: "1px solid #e5e7eb",
                          padding: "6px 8px",
                          borderRadius: 6,
                          cursor: "pointer",
                        }}
                        onClick={(e) => handleViewClick(e, pid)}
                      >
                        Ver
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      </main>
    </div>
  );
}
