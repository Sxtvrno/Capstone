import React, { useState, useEffect } from "react";
import { addProducto, API_URL } from "../services/api";

function ProductForm({ onAuthError }) {
  const [sku, setSku] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stockQuantity, setStockQuantity] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
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
    setLoading(true);
    setMessage({ type: "", text: "" });

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
      setMessage({ type: "success", text: "Producto creado exitosamente" });
      // Limpiar formulario
      setSku("");
      setTitle("");
      setDescription("");
      setPrice("");
      setStockQuantity("");
      setCategoryId("");
    } catch (error) {
      setMessage({
        type: "error",
        text: "Error al crear el producto. Intenta nuevamente.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-6">
        {/* Alert Messages */}
        {message.text && (
          <div
            className={`p-4 rounded-lg ${
              message.type === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Grid para campos - Responsive */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {/* SKU */}
          <div className="flex flex-col gap-2">
            <label htmlFor="sku" className="text-sm font-medium text-gray-700">
              SKU <span className="text-red-500">*</span>
            </label>
            <input
              id="sku"
              type="text"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ej: PROD-001"
            />
          </div>

          {/* Título */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="title"
              className="text-sm font-medium text-gray-700"
            >
              Título <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Nombre del producto"
            />
          </div>

          {/* Precio */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="price"
              className="text-sm font-medium text-gray-700"
            >
              Precio <span className="text-red-500">*</span>
            </label>
            <input
              id="price"
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0.00"
            />
          </div>

          {/* Stock */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="stockQuantity"
              className="text-sm font-medium text-gray-700"
            >
              Stock <span className="text-red-500">*</span>
            </label>
            <input
              id="stockQuantity"
              type="number"
              min="0"
              value={stockQuantity}
              onChange={(e) => setStockQuantity(e.target.value)}
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0"
            />
          </div>

          {/* Categoría ID */}
          <div className="flex flex-col gap-2 md:col-span-2">
            <label
              htmlFor="categoryId"
              className="text-sm font-medium text-gray-700"
            >
              Categoría (ID) <span className="text-red-500">*</span>
            </label>
            <input
              id="categoryId"
              type="number"
              min="1"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="1"
            />
          </div>
        </div>

        {/* Descripción - Full width */}
        <div className="flex flex-col gap-2">
          <label
            htmlFor="description"
            className="text-sm font-medium text-gray-700"
          >
            Descripción <span className="text-red-500">*</span>
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            placeholder="Describe tu producto..."
          />
        </div>

        {/* Botón Submit */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={loading}
            className="w-full md:w-auto px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Creando..." : "Crear Producto"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ProductForm;
