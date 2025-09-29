import React, { useMemo } from "react";

export default function TemplateGallery({ selectedKey, onSelect }) {
  const templates = useMemo(() => {
    const modules = import.meta.glob("./StoreTemplate*.jsx", { eager: true });
    return Object.entries(modules)
      .map(([path, mod]) => {
        const file = path.split("/").pop() || path;
        const key = file.replace(".jsx", "");
        const Component = mod.default || Object.values(mod)[0];
        return {
          key,
          name: humanizeName(key),
          Component,
        };
      })
      .filter((t) => typeof t.Component === "function")
      .sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  if (!templates.length) {
    return (
      <div style={styles.empty}>
        No se encontraron plantillas. Agrega archivos StoreTemplate*.jsx en su
        directorio correspondiente.
      </div>
    );
  }

  return (
    <div style={styles.gallery}>
      {templates.map(({ key, name }) => {
        const isActive = key === selectedKey;
        return (
          <button
            key={key}
            onClick={() => onSelect?.(key)}
            style={{
              ...styles.card,
              ...(isActive ? styles.cardActive : {}),
            }}
            aria-pressed={isActive}
            title={name}
          >
            <div style={styles.cardHeader}>
              <span style={styles.cardTitle}>{name}</span>
              {isActive && <span style={styles.badge}>Activa</span>}
            </div>
            <div style={styles.cardBody}>
              <span style={styles.cardHint}>Click para seleccionar</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function humanizeName(key) {
  // StoreTemplateA => "Store Template A"
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/Store Template/i, "Store Template")
    .trim();
}

const styles = {
  gallery: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: "12px",
    width: "100%",
  },
  card: {
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    background: "#fff",
    padding: 12,
    textAlign: "left",
    cursor: "pointer",
    transition: "box-shadow 120ms ease, border-color 120ms ease",
  },
  cardActive: {
    borderColor: "#3b82f6",
    boxShadow: "0 0 0 3px rgba(59,130,246,0.2)",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardTitle: { fontWeight: 600 },
  badge: {
    fontSize: 12,
    padding: "2px 6px",
    background: "#e0f2fe",
    color: "#0369a1",
    borderRadius: 999,
  },
  cardBody: { color: "#64748b", fontSize: 12 },
  cardHint: { opacity: 0.9 },
  empty: {
    padding: 12,
    border: "1px dashed #cbd5e1",
    borderRadius: 8,
    color: "#475569",
    background: "#f8fafc",
  },
};
