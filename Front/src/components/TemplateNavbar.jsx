import React from "react";
import { useNavigate } from "react-router-dom";

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

const TemplateNavbar = ({
  storeName = "Mi Tienda",
  logo, // data URL o URL del logo
  icon, // alias opcional; si llega, también se usa como logo
  headerColor = "#111827", // color del header desde CustomizeStore
}) => {
  const navigate = useNavigate();
  const bg = headerColor || "#111827";
  const fg = getContrastColor(bg);
  const logoSrc = logo || icon;

  const handleLogoClick = () => {
    navigate("/");
  };

  const handleProductsClick = () => {
    navigate("/search");
  };

  return (
    <header
      style={{
        backgroundColor: bg,
        color: "#fff",
        padding: "12px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
      }}
    >
      {/* Logo / Store Name */}
      <div
        onClick={handleLogoClick}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          cursor: "pointer",
          transition: "opacity 0.2s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
      >
        {logoSrc ? (
          <img
            src={logoSrc}
            alt="Logo"
            style={{
              width: 40,
              height: 40,
              objectFit: "contain",
              borderRadius: 4,
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
        <span style={{ fontSize: 20, fontWeight: 600 }}>{storeName}</span>
      </div>

      {/* Navigation */}
      <nav style={{ display: "flex", gap: 24, alignItems: "center" }}>
        <button
          onClick={handleLogoClick}
          style={{
            background: "none",
            border: "none",
            color: "#fff",
            cursor: "pointer",
            fontSize: 16,
            fontWeight: 500,
            padding: "8px 12px",
            borderRadius: 4,
            transition: "background-color 0.2s",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.1)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = "transparent")
          }
        >
          Inicio
        </button>
        <button
          onClick={handleProductsClick}
          style={{
            background: "none",
            border: "none",
            color: "#fff",
            cursor: "pointer",
            fontSize: 16,
            fontWeight: 500,
            padding: "8px 12px",
            borderRadius: 4,
            transition: "background-color 0.2s",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.1)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = "transparent")
          }
        >
          Productos
        </button>
      </nav>
    </header>
  );
};

export default TemplateNavbar;
