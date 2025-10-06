import React, { useState } from "react";
import SideBar from "../components/SideBar";
import ProductList from "../components/ProductList";
import ProductForm from "../components/ProductForm";
import EditProductForm from "../components/EditProductForm";
import MediaManager from "../components/MediaManager";
import CustomizeStore from "../components/CustomizeStore";
import TemplateGallery from "../components/TemplateGallery";

const AdminPage = () => {
  const [vista, setVista] = useState("productos"); // productos | nuevo | editar | media | personalizar | templates
  const [productoEditar, setProductoEditar] = useState(null);

  const handleEditarProducto = (producto) => {
    setProductoEditar(producto);
    setVista("editar");
  };

  const handleCreadoProducto = () => {
    setVista("productos");
  };

  const handleCancelEdit = () => {
    setProductoEditar(null);
    setVista("productos");
  };

  const renderContenido = () => {
    switch (vista) {
      case "productos":
        return (
          <ProductList
            onAddNew={() => setVista("nuevo")}
            onEdit={handleEditarProducto}
          />
        );
      case "nuevo":
        return (
          <ProductForm
            onSuccess={handleCreadoProducto}
            onCancel={() => setVista("productos")}
          />
        );
      case "editar":
        return (
          <EditProductForm
            producto={productoEditar}
            onSuccess={handleCancelEdit}
            onCancel={handleCancelEdit}
          />
        );
      case "media":
        return <MediaManager />;
      case "personalizar":
        return <CustomizeStore />;
      case "templates":
        return <TemplateGallery />;
      default:
        return <div>Seleccione una opción</div>;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <aside className="w-60 border-r border-gray-200 bg-gray-900 text-white">
        <SideBar vistaActiva={vista} onChangeVista={setVista} />
      </aside>
      <main className="flex-1 p-6 overflow-y-auto">{renderContenido()}</main>
    </div>
  );
};

export default AdminPage;
