import React, { useState } from "react";
import { Link } from "react-router-dom";

const Sidebar = ({ onLogout }) => {
  const [openMobile, setOpenMobile] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const toggleMobile = () => setOpenMobile((o) => !o);
  const closeMobile = () => setOpenMobile(false);
  const toggleCollapse = () => setCollapsed((c) => !c);

  const baseItem =
    "flex items-center gap-3 rounded px-3 py-2 hover:bg-gray-800 transition text-sm";

  const links = [
    { to: "/admin", label: "Inicio", icon: "M3 12h18M3 6h18M3 18h18" },
    {
      to: "/admin/productos",
      label: "Productos",
      icon: "M4 6h16M4 12h16M4 18h7",
    },
    { to: "/admin/media", label: "Media", icon: "M3 5h18v14H3z" },
    {
      to: "/admin/personaliza",
      label: "Personalización",
      icon: "M12 6v12m6-6H6",
    },
  ];

  return (
    <>
      {/* Botón flotante (mobile) */}
      <button
        onClick={toggleMobile}
        className="md:hidden fixed top-3 left-3 z-50 inline-flex items-center justify-center rounded-md bg-black/90 text-white w-10 h-10 shadow focus:outline-none focus:ring-2 focus:ring-indigo-500"
        aria-label="Abrir menú"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-6 h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          {openMobile ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 6h18M3 12h18M3 18h18"
            />
          )}
        </svg>
      </button>

      {/* Overlay mobile */}
      {openMobile && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          onClick={closeMobile}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-screen z-50 bg-black text-white flex flex-col transition-all duration-300
        ${collapsed ? "w-16" : "w-64"} 
        ${openMobile ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        shadow-lg md:shadow-none`}
        aria-label="Barra lateral de navegación"
      >
        <div
          className={`flex items-center justify-between ${
            collapsed ? "px-2" : "px-4"
          } py-4 border-b border-white/10`}
        >
          <div
            className={`font-bold tracking-wide text-lg ${
              collapsed ? "w-full text-center" : ""
            }`}
          >
            {collapsed ? "MN" : "Menú"}
          </div>
          {/* Botón colapsar (desktop) */}
          <button
            onClick={toggleCollapse}
            className="hidden md:inline-flex items-center justify-center w-8 h-8 rounded-md hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label={collapsed ? "Expandir sidebar" : "Colapsar sidebar"}
            title={collapsed ? "Expandir" : "Colapsar"}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              {collapsed ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 5l7 7-7 7"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19l-7-7 7-7"
                />
              )}
            </svg>
          </button>
        </div>

        <nav
          className={`flex-1 overflow-y-auto px-2 mt-4 space-y-1 ${
            collapsed ? "px-1" : ""
          }`}
        >
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={closeMobile}
              className={`${baseItem} ${
                collapsed ? "justify-center px-2" : ""
              }`}
              title={collapsed ? l.label : undefined}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.6}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d={l.icon} />
              </svg>
              {!collapsed && <span className="truncate">{l.label}</span>}
            </Link>
          ))}
        </nav>

        {/* Zona inferior fija: Ver Tienda + Cerrar Sesión + copyright */}
        <div
          className={`mt-auto w-full flex flex-col gap-2 ${
            collapsed ? "px-1 pb-3" : "px-3 pb-4"
          }`}
        >
          <Link
            to="/"
            onClick={closeMobile}
            className={`${baseItem} ${collapsed ? "justify-center px-2" : ""} ${
              collapsed ? "" : "text-white"
            }`}
            title="Ver Tienda"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.6}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 12l9-9 9 9M4.5 10.5V21h15V10.5"
              />
            </svg>
            {!collapsed && <span className="truncate">Ver Tienda</span>}
          </Link>

          <button
            onClick={() => {
              onLogout?.();
              closeMobile();
            }}
            className={`${baseItem} w-full text-left ${
              collapsed ? "justify-center px-2" : ""
            }`}
            title={collapsed ? "Cerrar Sesión" : undefined}
            type="button"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.6}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6A2.25 2.25 0 0 0 5.25 5.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12"
              />
            </svg>
            {!collapsed && <span className="truncate">Cerrar Sesión</span>}
          </button>

          <div
            className={`pt-2 mt-1 text-[10px] text-gray-400 border-t border-white/10 ${
              collapsed ? "text-center" : "text-left"
            }`}
          >
            © 2025 Tu Empresa
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
