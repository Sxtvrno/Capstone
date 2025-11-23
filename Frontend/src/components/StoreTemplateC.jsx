import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TemplateNavbar from "./TemplateNavbar";
import { productAPI } from "../services/api";

export default function StoreTemplateC(props) {
  const {
    storeName = "Mi Tienda",
    logo,
    icon,
    logoSrc,
    headerColor = "#111827",
    products = [],
    templateType,
    ...rest
  } = props;

  const navigate = useNavigate();
  const logoProp = logo || icon || logoSrc;
  const [imagesMap, setImagesMap] = useState({});

  useEffect(() => {
    let cancelled = false;

    async function loadImages() {
      if (!Array.isArray(products) || products.length === 0) return;

      const ids = [
        ...new Set(products.map((p) => p?.id ?? p?._id).filter(Boolean)),
      ];
      const missing = ids.filter((id) => !imagesMap[id]);

      if (missing.length === 0) return;

      try {
        const results = await Promise.all(
          missing.map(async (id) => {
            try {
              // Intentar método público primero, luego fallback
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
  }, [products.length]);

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
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {firstUrl ? (
                    <img
                      src={firstUrl}
                      alt={p.name || p.title || "Producto"}
                      style={img}
                    />
                  ) : (
                    <svg
                      style={{ width: 64, height: 64, color: "#9ca3af" }}
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
                          transition: "background 0.2s",
                        }}
                        onClick={(e) => e.stopPropagation()}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#059669";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "#10b981";
                        }}
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
                          transition: "all 0.2s",
                        }}
                        onClick={(e) => handleViewClick(e, pid)}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#f3f4f6";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                        }}
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
