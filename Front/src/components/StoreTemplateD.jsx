import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TemplateNavbar from "./TemplateNavbar";
import { obtenerImagenesProducto } from "../services/api";

export default function StoreTemplateA({
  products = [],
  storeName = "Mi Tienda",
  logo,
  icon,
  logoSrc, // compat opcional
  headerColor = "#111827",
}) {
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

  return (
    <div>
      <TemplateNavbar
        storeName={storeName}
        logo={logoProp}
        headerColor={headerColor}
      />
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: 16 }}>
        <h1 id="productos" style={{ margin: "12px 0" }}>
          Productos
        </h1>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 16,
          }}
        >
          {products.map((p) => {
            const pid = p?.id ?? p?._id ?? p?.sku;
            const firstUrl = pid ? imagesMap[pid]?.[0] : undefined;
            return (
              <article
                key={pid || p?.name || p?.title}
                onClick={() => handleProductClick(pid)}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  overflow: "hidden",
                  background: "#fff",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow =
                    "0 4px 12px rgba(0,0,0,0.12)";
                  e.currentTarget.style.transform = "translateY(-4px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <div
                  style={{
                    width: "100%",
                    aspectRatio: "1/1",
                    background: "#f3f4f6",
                    overflow: "hidden",
                  }}
                >
                  {firstUrl && (
                    <img
                      src={firstUrl}
                      alt={p.name || p.title || "Producto"}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        transition: "transform 0.3s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "scale(1.05)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "scale(1)";
                      }}
                    />
                  )}
                </div>
                <div style={{ padding: 12 }}>
                  <div style={{ fontWeight: 600 }}>
                    {p.name || p.title || "Producto"}
                  </div>
                  {p.price != null && (
                    <div style={{ color: "#6b7280", marginTop: 4 }}>
                      ${Number(p.price).toFixed(0)}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </main>
    </div>
  );
}
