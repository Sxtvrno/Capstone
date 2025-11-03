// src/components/EditProductForm.jsx
import React, { useState, useEffect } from "react";
import { categoryAPI } from "../services/api";

export default function EditProductForm({ product, onSave, onCancel }) {
  if (!product) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="text-center py-8">
          <svg
            className="w-16 h-16 text-red-500 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Error: Producto no válido
          </h3>
          <p className="text-gray-600 mb-4">
            No se pudo cargar la información del producto
          </p>
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  const [formData, setFormData] = useState({
    sku: product?.sku || "",
    title: product?.title || "",
    description: product?.description || "",
    price: product?.price || 0,
    stock_quantity: product?.stock_quantity || 0,
    // usar category_id como number (o "")
    category_id:
      typeof product?.category_id === "number"
        ? product.category_id
        : typeof product?.categoria_id === "number"
        ? product.categoria_id
        : typeof product?.category?.id === "number"
        ? product.category.id
        : "",
  });

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchCategories();
  }, [product?.id]);

  // Si cambia el producto (o llega luego), sincroniza el form
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      sku: product?.sku || "",
      title: product?.title || "",
      description: product?.description || "",
      price: product?.price || 0,
      stock_quantity: product?.stock_quantity || 0,
      category_id:
        typeof product?.category_id === "number"
          ? product.category_id
          : typeof product?.categoria_id === "number"
          ? product.categoria_id
          : typeof product?.category?.id === "number"
          ? product.category.id
          : "",
    }));
  }, [product]);

  const fetchCategories = async () => {
    setLoadingCategories(true);
    try {
      // Preferir endpoint con id
      let data = await categoryAPI.getAllWithId();
      // Fallback si el backend devuelve otro formato
      const normalized = Array.isArray(data)
        ? data.map((c) => {
            if (typeof c === "object") {
              return {
                id: Number(c.id),
                name: String(c.name || c.nombre || c.title),
              };
            }
            return { id: NaN, name: String(c) };
          })
        : [];
      setCategories(normalized.filter((c) => Number.isFinite(c.id)));
      if (!normalized.length) {
        // fallback a getAll (solo nombres) si fuese necesario
        const names = await categoryAPI.getAll().catch(() => []);
        setCategories(
          Array.isArray(names)
            ? names.map((n, i) => ({ id: i + 1, name: String(n) }))
            : []
        );
      }
    } catch (err) {
      console.error("Error cargando categorías:", err);
      setCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "category_id"
          ? value === ""
            ? ""
            : Number(value)
          : name === "price"
          ? value
          : name === "stock_quantity"
          ? value
          : value,
    }));
    if (errors[name]) {
      setErrors((prev) => {
        const n = { ...prev };
        delete n[name];
        return n;
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.sku?.trim()) newErrors.sku = "El SKU es requerido";
    if (!formData.title?.trim()) newErrors.title = "El título es requerido";
    if (formData.price === "" || Number(formData.price) <= 0)
      newErrors.price = "El precio debe ser mayor a 0";
    if (formData.stock_quantity === "" || Number(formData.stock_quantity) < 0)
      newErrors.stock_quantity = "El stock no puede ser negativo";
    if (
      formData.category_id === "" ||
      !Number.isFinite(Number(formData.category_id))
    )
      newErrors.category_id = "Debes seleccionar una categoría";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Id seguro del producto
  const productId =
    Number(
      product?.id ?? product?.producto_id ?? product?.productId ?? product?.ID
    ) || null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (!productId) {
      alert("No se pudo determinar el ID del producto");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        sku: formData.sku.trim(),
        title: formData.title.trim(),
        description: formData.description ?? "",
        price: Number(formData.price),
        stock_quantity: parseInt(formData.stock_quantity, 10),
        category_id: Number(formData.category_id),
      };

      // Soportar ambas firmas de onSave
      if (typeof onSave === "function") {
        if (onSave.length >= 2) {
          await onSave(productId, payload);
        } else {
          await onSave({ id: productId, ...payload });
        }
      }
    } catch (err) {
      alert(
        "Error al actualizar el producto: " + (err?.message || String(err))
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900">Editar Producto</h2>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SKU y Título */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              SKU <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="sku"
              value={formData.sku}
              onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                errors.sku
                  ? "border-red-500 focus:ring-red-500"
                  : "border-gray-300 focus:ring-blue-500"
              }`}
              placeholder="Ingrese el SKU"
            />
            {errors.sku && (
              <p className="text-red-500 text-sm mt-1">{errors.sku}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Título <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                errors.title
                  ? "border-red-500 focus:ring-red-500"
                  : "border-gray-300 focus:ring-blue-500"
              }`}
              placeholder="Ingrese el título"
            />
            {errors.title && (
              <p className="text-red-500 text-sm mt-1">{errors.title}</p>
            )}
          </div>
        </div>

        {/* Descripción */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Descripción
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ingrese la descripción del producto"
          />
        </div>

        {/* Precio, Stock y Categoría */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Precio <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                $
              </span>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                min="0"
                step="0.01"
                className={`w-full pl-8 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  errors.price
                    ? "border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:ring-blue-500"
                }`}
                placeholder="0.00"
              />
            </div>
            {errors.price && (
              <p className="text-red-500 text-sm mt-1">{errors.price}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Stock <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="stock_quantity"
              value={formData.stock_quantity}
              onChange={handleChange}
              min="0"
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                errors.stock_quantity
                  ? "border-red-500 focus:ring-red-500"
                  : "border-gray-300 focus:ring-blue-500"
              }`}
              placeholder="0"
            />
            {errors.stock_quantity && (
              <p className="text-red-500 text-sm mt-1">
                {errors.stock_quantity}
              </p>
            )}
          </div>

          {/* Categoría (usa category_id) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Categoría <span className="text-red-500">*</span>
            </label>
            {loadingCategories ? (
              <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
                Cargando categorías...
              </div>
            ) : (
              <select
                name="category_id"
                value={formData.category_id}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  errors.category_id
                    ? "border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:ring-blue-500"
                }`}
              >
                <option value="">Seleccione una categoría</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            )}
            {errors.category_id && (
              <p className="text-red-500 text-sm mt-1">{errors.category_id}</p>
            )}
          </div>
        </div>

        {/* Botones */}
        <div className="flex gap-4 pt-4 border-t border-gray-200">
          <button
            type="submit"
            disabled={loading || loadingCategories}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Guardando...
              </>
            ) : (
              <>
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Guardar cambios
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
