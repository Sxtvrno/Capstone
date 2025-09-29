import React from "react";

function getContrastColor(hex) {
  try {
    if (!hex) return "#111827";
    let c = hex.trim().replace("#", "");
    if (c.length === 3)
      c = c
        .split("")
        .map((ch) => ch + ch)
        .join("");
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    if ([r, g, b].some((n) => Number.isNaN(n))) return "#111827";
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 128 ? "#111827" : "#ffffff";
  } catch {
    return "#111827";
  }
}

export default function TemplateNavbar({
  storeName = "Mi Tienda",
  links = ["Inicio", "Productos", "Contacto"],
  logo, // data URL o URL del logo
  icon, // alias opcional; si llega, también se usa como logo
  headerColor = "#111827", // color del header desde CustomizeStore
}) {
  const bg = headerColor || "#111827";
  const fg = getContrastColor(bg);
  const logoSrc = logo || icon;

  const navStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 20px",
    background: bg,
    color: fg,
    boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
  };
  const linksStyle = { display: "flex", gap: 12, alignItems: "center" };

  return (
    <header style={navStyle}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {logoSrc ? (
          <img
            src={logoSrc}
            alt="Logo"
            style={{
              width: 40,
              height: 40,
              objectFit: "cover",
              borderRadius: "50%",
              background: "#fff",
              border: `2px solid ${fg}22`,
            }}
          />
        ) : (
          <div
            style={{
              width: 40,
              height: 40,
              background: fg === "#ffffff" ? "#e5e7eb" : "#ffffff",
              borderRadius: 6,
              border: `2px solid ${fg}22`,
            }}
          />
        )}
        <strong style={{ color: fg }}>{storeName}</strong>
      </div>
      <nav style={linksStyle}>
        {links.map((l) => (
          <a
            key={l}
            href="#"
            style={{
              color: fg === "#ffffff" ? "#e5e7eb" : "#1f2937",
              textDecoration: "none",
              fontSize: 14,
            }}
          >
            {l}
          </a>
        ))}
      </nav>
    </header>
  );
}
