import React, { useState } from "react";
import ProductList from "../components/ProductList";
import ProductForm from "../components/ProductForm";
import MediaManager from "../components/MediaManager";
import CustomizeStore from "../components/CustomizeStore";
import Sidebar from "../components/SideBar";
import { useNavigate } from "react-router-dom";

function AdminPage() {
  const [vista, setVista] = useState("productos");
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar - Ahora responsivo */}
      <Sidebar vista={vista} setVista={setVista} handleLogout={handleLogout} />

      {/* Main Content - Con padding adaptativo */}
      <main className="flex-1 p-4 md:p-6 lg:p-8 ml-0 lg:ml-64 transition-all duration-300">
        <div className="max-w-7xl mx-auto">
          {/* Header con título responsive */}
          <header className="mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
              {vista === "productos" && "Gestión de Productos"}
              {vista === "crear" && "Crear Nuevo Producto"}
              {vista === "media" && "Gestión de Medios"}
              {vista === "personaliza" && "Personalizar Tienda"}
            </h1>
            <p className="text-sm md:text-base text-gray-600">
              {vista === "productos" && "Administra tu inventario de productos"}
              {vista === "crear" && "Añade un nuevo producto a tu catálogo"}
              {vista === "media" && "Gestiona las imágenes de tus productos"}
              {vista === "personaliza" &&
                "Personaliza la apariencia de tu tienda"}
            </p>
          </header>

          {/* Content Area - Con contenedor responsivo */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {vista === "productos" && <ProductList />}
            {vista === "crear" && <ProductForm />}
            {vista === "media" && <MediaManager />}
            {vista === "personaliza" && <CustomizeStore />}
          </div>
        </div>
      </main>
    </div>
  );
}

export default AdminPage;
