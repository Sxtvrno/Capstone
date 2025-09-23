import React, { useState, useEffect } from "react";
import { addProducto, API_URL } from "../services/api";

function ProductForm({ onAuthError }) {
  const [sku, setSku] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(0);
  const [stockQuantity, setStockQuantity] = useState(0);
  const [categoryId, setCategoryId] = useState(0);
  const [toastMessage, setToastMessage] = useState(""); // Para mostrar el mensaje de éxito o error
  const [toastVisible, setToastVisible] = useState(false); // Para controlar si el toast está visible
  const [categorias, setCategorias] = useState([]);

  useEffect(() => {
    fetch(`${API_URL}/api/categorias-con-id/`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "Content-Type": "application/json",
      },
    })
      .then((res) => res.json())
      .then((data) => setCategorias(data))
      .catch((err) => setCategorias([]));
  }, []);

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

  const categoriaSeleccionada = categorias.find(
    (c) => c.id === Number(categoryId)
  );

  return (
    <div className="w-full max-w-xl mx-auto">
      <form
        onSubmit={handleSubmit}
        className="bg-white/90 backdrop-blur rounded-xl shadow-lg border border-gray-100 p-4 space-y-4"
      >
        <h2 className="text-xl font-bold text-gray-900 mb-1">
          Agregar producto
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="sku" className="text-xs font-medium text-gray-700">
              SKU <span className="text-red-500">*</span>
            </label>
            <input
              id="sku"
              type="text"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="EJ: ABC-123"
              required
              className="rounded-lg border border-gray-200 px-3 py-2 text-gray-900 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label
              htmlFor="title"
              className="text-xs font-medium text-gray-700"
            >
              Título <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nombre del producto"
              required
              className="rounded-lg border border-gray-200 px-3 py-2 text-gray-900 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label
              htmlFor="price"
              className="text-xs font-medium text-gray-700"
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
              placeholder="0.00"
              className="rounded-lg border border-gray-200 px-3 py-2 text-gray-900 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label
              htmlFor="stockQuantity"
              className="text-xs font-medium text-gray-700"
            >
              Stock
            </label>
            <input
              id="stockQuantity"
              type="number"
              min="0"
              value={stockQuantity}
              onChange={(e) => setStockQuantity(e.target.value)}
              placeholder="0"
              className="rounded-lg border border-gray-200 px-3 py-2 text-gray-900 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1 md:col-span-2">
            <label
              htmlFor="categoryId"
              className="text-xs font-medium text-gray-700"
            >
              Categoría <span className="text-red-500">*</span>
            </label>
            <select
              id="categoryId"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
              className="rounded-lg border border-gray-200 px-3 py-2 text-gray-900 text-sm"
            >
              <option value={0} disabled>
                Selecciona una categoría
              </option>
              {categorias.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.id} - {cat.name}
                </option>
              ))}
            </select>
            {categoriaSeleccionada && (
              <div className="text-xs text-gray-500 mt-1">
                <span className="font-semibold">ID:</span>{" "}
                {categoriaSeleccionada.id}
                &nbsp;
                <span className="font-semibold">Nombre:</span>{" "}
                {categoriaSeleccionada.name}
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label
            htmlFor="description"
            className="text-xs font-medium text-gray-700"
          >
            Descripción <span className="text-red-500">*</span>
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe características, materiales, medidas, etc."
            required
            rows={3}
            className="rounded-lg border border-gray-200 px-3 py-2 text-gray-900 text-sm resize-y"
          />
        </div>
        <div className="pt-2">
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white shadow-sm hover:bg-blue-700 active:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-200 text-sm"
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
