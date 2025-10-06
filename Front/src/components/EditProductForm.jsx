// src/components/EditProductForm.jsx
import React, { useState } from "react";
import { updateProducto } from "../services/api";

function EditProductForm({ producto, onClose, onUpdate }) {
  const [sku, setSku] = useState(producto.sku || "");
  const [title, setTitle] = useState(producto.title || "");
  const [description, setDescription] = useState(producto.description || "");
  const [price, setPrice] = useState(producto.price || 0);
  const [stockQuantity, setStockQuantity] = useState(
    producto.stock_quantity || 0
  );
  const [categoryId, setCategoryId] = useState(producto.category_id || 0);
  const [toastMessage, setToastMessage] = useState("");
  const [toastVisible, setToastVisible] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await updateProducto(producto.id, {
        sku,
        title,
        description,
        price: Number(price),
        stock_quantity: Number(stockQuantity),
        category_id: Number(categoryId),
      });
      setToastMessage("Producto actualizado exitosamente!");
      setToastVisible(true);
      setTimeout(() => {
        setToastVisible(false);
        onUpdate({
          ...producto,
          sku,
          title,
          description,
          price: Number(price),
          stock_quantity: Number(stockQuantity),
          category_id: Number(categoryId),
        });
        onClose();
      }, 2000);
    } catch (error) {
      setToastMessage("Hubo un error al actualizar el producto");
      setToastVisible(true);
      setTimeout(() => setToastVisible(false), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 md:p-8 w-full max-w-3xl relative">
        <button
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
          onClick={onClose}
        >
          &times;
        </button>
        <form onSubmit={handleSubmit} className="space-y-6">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">
            Editar producto
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="flex flex-col gap-2">
              <label
                htmlFor="sku"
                className="text-sm font-medium text-gray-700"
              >
                SKU
              </label>
              <input
                id="sku"
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                required
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label
                htmlFor="title"
                className="text-sm font-medium text-gray-700"
              >
                Título
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label
                htmlFor="price"
                className="text-sm font-medium text-gray-700"
              >
                Precio
              </label>
              <input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label
                htmlFor="stockQuantity"
                className="text-sm font-medium text-gray-700"
              >
                Stock
              </label>
              <input
                id="stockQuantity"
                type="number"
                min="0"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label
                htmlFor="categoryId"
                className="text-sm font-medium text-gray-700"
              >
                Categoría (ID)
              </label>
              <input
                id="categoryId"
                type="number"
                min="1"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5"
              />
            </div>
          </div>
          <div className="md:col-span-2 flex flex-col gap-2">
            <label
              htmlFor="description"
              className="text-sm font-medium text-gray-700"
            >
              Descripción
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={4}
              className="w-full rounded-xl border border-gray-200 px-4 py-3"
            />
          </div>
          <div className="pt-2">
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              Guardar cambios
            </button>
          </div>
        </form>
        {toastVisible && (
          <div className="fixed bottom-5 right-5 z-50">
            <div className="pointer-events-auto w-full max-w-sm overflow-hidden rounded-xl bg-green-600 text-white shadow-2xl ring-1 ring-black/5 animate-[slideIn_.3s_ease-out]">
              <div className="p-4">
                <p className="text-sm font-medium">{toastMessage}</p>
              </div>
              <div className="h-1 w-full bg-green-700/60">
                <div className="h-full w-full origin-left animate-[growBar_2500ms_linear_forwards] bg-white/70"></div>
              </div>
            </div>
          </div>
        )}
        <style>{`
          @keyframes slideIn {
            from { transform: translateY(8px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          @keyframes growBar {
            from { transform: scaleX(1); }
            to { transform: scaleX(0); }
          }
          .animate-\\[slideIn_.3s_ease-out\\] { animation: slideIn .3s ease-out; }
          .animate-\\[growBar_2500ms_linear_forwards\\] { animation: growBar 2500ms linear forwards; }
        `}</style>
      </div>
    </div>
  );
}

export default EditProductForm;
