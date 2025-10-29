import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TemplateNavbar from "./TemplateNavbar";
import { productAPI } from "../services/api";

export default function StoreTemplateB({
  products = [],
  storeName = "Mi Tienda",
  logo,
  icon,
  logoSrc,
  headerColor = "#111827",
}) {
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

  return (
    <div>
      <TemplateNavbar
        storeName={storeName}
        logo={logoProp}
        headerColor={headerColor}
      />
      <header
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "24px 16px",
          textAlign: "center",
        }}
      >
        <h1 style={{ margin: 0 }}>Colección destacada</h1>
        <p style={{ color: "#6b7280" }}>
          Explora nuestros productos más populares
        </p>
      </header>
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: 16 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 20,
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
                  borderRadius: 12,
                  overflow: "hidden",
                  background: "#fff",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow =
                    "0 4px 12px rgba(0,0,0,0.12)";
                  e.currentTarget.style.transform = "translateY(-4px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow =
                    "0 1px 2px rgba(0,0,0,0.06)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <div
                  style={{
                    width: "100%",
                    aspectRatio: "4/3",
                    background: "#f3f4f6",
                    overflow: "hidden",
                    position: "relative",
                  }}
                >
                  {firstUrl ? (
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
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#9ca3af",
                      }}
                    >
                      <svg
                        style={{ width: 64, height: 64 }}
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
                  )}
                </div>
                <div style={{ padding: 14 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                    }}
                  >
                    <strong>{p.name || p.title || "Producto"}</strong>
                    {p.price != null && (
                      <span style={{ color: "#16a34a" }}>
                        ${Number(p.price).toFixed(0)}
                      </span>
                    )}
                  </div>
                  {p.description && (
                    <p style={{ color: "#6b7280", marginTop: 6, fontSize: 14 }}>
                      {String(p.description).slice(0, 80)}
                      {String(p.description).length > 80 ? "…" : ""}
                    </p>
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
