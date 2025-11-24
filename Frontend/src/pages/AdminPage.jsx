import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ProductList from "../components/ProductList";
import ProductForm from "../components/ProductForm";
import MediaManager from "../components/MediaManager";
import CustomizeStore from "../components/CustomizeStore";
import TicketManager from "../components/TicketManager";
import OrderManager from "../components/OrderManager";
import Sidebar from "../components/SideBar";
import { authAPI } from "../services/api";

function AdminPage({ user, onLogout }) {
  const [vista, setVista] = useState("productos");
  const navigate = useNavigate();

  // Verificar que el usuario sea admin al montar el componente
  useEffect(() => {
    if (!authAPI.isAdmin()) {
      console.warn("Usuario no autorizado intentando acceder al admin");
      navigate("/", { replace: true });
    }
  }, [navigate]);

  // En el botón de logout:
  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  // Mostrar información del usuario admin
  const adminInfo = user || authAPI.getCurrentUser();

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar - Ahora responsivo */}
      <Sidebar
        vista={vista}
        setVista={setVista}
        handleLogout={handleLogout}
        user={adminInfo}
      />

      {/* Main Content - Con padding adaptativo */}
      <main className="flex-1 p-4 md:p-6 lg:p-8 ml-0 lg:ml-64 transition-all duration-300">
        <div className="max-w-7xl mx-auto">
          {/* Header con título responsive */}
          <header className="mb-6 md:mb-8">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
                  {vista === "productos" && "Gestión de Productos"}
                  {vista === "crear" && "Crear Nuevo Producto"}
                  {vista === "media" && "Gestión de Medios"}
                  {vista === "pedidos" && "Gestión de Pedidos"}
                  {vista === "tickets" && "Tickets de Soporte"}
                  {vista === "personaliza" && "Personalizar Tienda"}
                </h1>
                <p className="text-sm md:text-base text-gray-600">
                  {vista === "productos" &&
                    "Administra tu inventario de productos"}
                  {vista === "crear" && "Añade un nuevo producto a tu catálogo"}
                  {vista === "media" &&
                    "Gestiona las imágenes de tus productos"}
                  {vista === "pedidos" &&
                    "Administra y actualiza el estado de los pedidos"}
                  {vista === "tickets" &&
                    "Gestiona los tickets de soporte de tus clientes"}
                  {vista === "personaliza" &&
                    "Personaliza la apariencia de tu tienda"}
                  {vista === "pedidos" &&
                    "Revisa y administra todos los pedidos recibidos"}
                </p>
              </div>

              {/* User info badge */}
              <div className="flex items-center gap-3 px-4 py-2 bg-blue-50 rounded-lg border border-blue-200">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                  {adminInfo?.first_name?.[0] || adminInfo?.email?.[0] || "A"}
                </div>
                <div className="text-sm">
                  <p className="font-medium text-gray-900">
                    {adminInfo?.first_name} {adminInfo?.last_name}
                  </p>
                  <p className="text-gray-500 text-xs">Administrador</p>
                </div>
              </div>
            </div>
          </header>

          {/* Content Area - Con contenedor responsivo */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {vista === "productos" && <ProductList />}
            {vista === "crear" && <ProductForm />}
            {vista === "media" && <MediaManager />}
            {vista === "pedidos" && <OrderManager />}
            {vista === "tickets" && <TicketManager />}
            {vista === "personaliza" && <CustomizeStore />}
          </div>
        </div>
      </main>
    </div>
  );
}

export default AdminPage;
