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
    <div className="product-form">
      <form onSubmit={handleSubmit}>
        <h2>Agregar Producto</h2>
        <input
          type="text"
          value={sku}
          onChange={(e) => setSku(e.target.value)}
          placeholder="SKU"
          required
        />
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título"
          required
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descripción"
          required
        />
        <h3>Precio</h3>
        <input
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
        <h3>Stock</h3>
        <input
          type="number"
          value={stockQuantity}
          onChange={(e) => setStockQuantity(e.target.value)}
        />
        <h3>Categoria (id)</h3>
        <input
          type="number"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        />
        <button style={{ margin: "10px 0" }} type="submit">
          Agregar
        </button>
      </form>

      {/* Toast Notification */}
      {toastVisible && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white p-4 rounded-lg shadow-lg transition-all duration-300 ease-in-out">
          <p>{toastMessage}</p>
        </div>
      )}
    </div>
  );
}

export default ProductForm;
