import React, { useEffect, useState } from "react";
import TemplateNavbar from "./TemplateNavbar";
import { obtenerImagenesProducto } from "../services/api";

export default function StoreTemplateB({
  products = [],
  storeName = "Mi Tienda",
  logo,
  icon,
  logoSrc, // compat opcional
  headerColor = "#111827",
}) {
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
                style={{
                  borderRadius: 12,
                  overflow: "hidden",
                  background: "#fff",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    aspectRatio: "4/3",
                    background: "#f3f4f6",
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
                      }}
                    />
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
                        ${Number(p.price).toFixed(2)}
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
