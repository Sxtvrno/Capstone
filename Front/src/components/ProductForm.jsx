// src/components/ProductForm.jsx
import React, { useState } from "react";
import { addProducto } from "../services/api";

function ProductForm({ onAuthError }) {
  const [sku, setSku] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(0);
  const [stockQuantity, setStockQuantity] = useState(0);
  const [categoryId, setCategoryId] = useState(0);
  const [toastMessage, setToastMessage] = useState(""); // Para mostrar el mensaje de éxito o error
  const [toastVisible, setToastVisible] = useState(false); // Para controlar si el toast está visible

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await addProducto(
        {
          sku,
          title,
          description,
          price: Number(price),
          stock_quantity: Number(stockQuantity),
          category_id: Number(categoryId),
        },
        onAuthError
      );
      setToastMessage("Producto agregado exitosamente!");
      setToastVisible(true); // Mostrar el toast
      setTimeout(() => setToastVisible(false), 3000); // Desaparecer el toast después de 3 segundos
      // Limpiar campos
      setSku("");
      setTitle("");
      setDescription("");
      setPrice(0);
      setStockQuantity(0);
      setCategoryId(0);
      // Puedes agregar lógica para actualizar la lista de productos si lo deseas
    } catch (error) {
      if (error?.response?.status === 401 && onAuthError) {
        onAuthError(error);
      } else {
        setToastMessage("Hubo un error al agregar el producto");
        setToastVisible(true); // Mostrar el toast
        setTimeout(() => setToastVisible(false), 3000); // Desaparecer el toast después de 3 segundos
      }
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
  <form
    onSubmit={handleSubmit}
    className="bg-white/90 backdrop-blur rounded-2xl shadow-xl border border-gray-100 p-6 md:p-8 space-y-6"
  >
    <div className="space-y-1">
      <h2 className="text-2xl font-bold tracking-tight text-gray-900">
        Agregar producto
      </h2>
      <p className="text-sm text-gray-500">
        Completa la información básica, precio, stock y categoría.
      </p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div className="flex flex-col gap-2">
        <label htmlFor="sku" className="text-sm font-medium text-gray-700">
          SKU <span className="text-red-500">*</span>
        </label>
        <input
          id="sku"
          type="text"
          value={sku}
          onChange={(e) => setSku(e.target.value)}
          placeholder="EJ: ABC-123"
          required
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="title" className="text-sm font-medium text-gray-700">
          Título <span className="text-red-500">*</span>
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Nombre del producto"
          required
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="price" className="text-sm font-medium text-gray-700">
          Precio
        </label>
        <input
          id="price"
          type="number"
          min="0"
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="0.00"
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="stockQuantity" className="text-sm font-medium text-gray-700">
          Stock
        </label>
        <input
          id="stockQuantity"
          type="number"
          min="0"
          value={stockQuantity}
          onChange={(e) => setStockQuantity(e.target.value)}
          placeholder="0"
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="categoryId" className="text-sm font-medium text-gray-700">
          Categoría (ID)
        </label>
        <input
          id="categoryId"
          type="number"
          min="1"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          placeholder="Ej: 3"
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition"
        />
      </div>
    </div>

    <div className="md:col-span-2 flex flex-col gap-2">
        <label htmlFor="description" className="text-sm font-medium text-gray-700">
          Descripción <span className="text-red-500">*</span>
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe características, materiales, medidas, etc."
          required
          rows={4}
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition resize-y"
        />
      </div>

    <div className="pt-2">
      <button
        type="submit"
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white shadow-sm hover:bg-blue-700 active:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-200 transition"
      >
        Agregar
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

  {/* estilos locales al componente */}
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

  );
}

export default ProductForm;
