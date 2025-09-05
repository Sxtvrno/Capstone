// src/components/ProductForm.jsx
import React, { useState } from 'react';
import axios from 'axios';

function ProductForm() {
  const [sku, setSku] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stockQuantity, setStockQuantity] = useState('');
  const [categoryId, setCategoryId] = useState(1);
  const [status, setStatus] = useState('activo');
  const [toastMessage, setToastMessage] = useState(''); // Para mostrar el mensaje de éxito o error
  const [toastVisible, setToastVisible] = useState(false); // Para controlar si el toast está visible

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newProduct = {
      sku,
      title,
      description,
      price: parseFloat(price),
      stock_quantity: parseInt(stockQuantity, 10),
      category_id: categoryId,
      status,
    };

    try {
      const response = await axios.post('http://localhost:8001/api/productos/', newProduct);
      if (response.status === 201) {
        setToastMessage('Producto agregado exitosamente!');
        setToastVisible(true); // Mostrar el toast
        setTimeout(() => setToastVisible(false), 3000); // Desaparecer el toast después de 3 segundos
        // Limpiar el formulario después de enviar
        setSku('');
        setTitle('');
        setDescription('');
        setPrice('');
        setStockQuantity('');
        setCategoryId(1);
        setStatus('activo');
      }
    } catch (error) {
      console.error('Error al agregar el producto:', error);
      setToastMessage('Hubo un error al agregar el producto');
      setToastVisible(true); // Mostrar el toast
      setTimeout(() => setToastVisible(false), 3000); // Desaparecer el toast después de 3 segundos
    }
  };

  return (
    <div className="product-form">
      <h2>Agregar Producto</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="sku">SKU:</label>
          <input
            type="text"
            id="sku"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            placeholder="Ingrese el SKU"
            required
          />
        </div>

        <div className="mb-4">
          <label htmlFor="title">Título:</label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ingrese el título del producto"
            required
          />
        </div>

        <div className="mb-4">
          <label htmlFor="description">Descripción:</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descripción del producto"
            required
          />
        </div>

        <div className="mb-4">
          <label htmlFor="price">Precio:</label>
          <input
            type="number"
            id="price"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Precio del producto"
            required
          />
        </div>

        <div className="mb-4">
          <label htmlFor="stock_quantity">Cantidad en Stock:</label>
          <input
            type="number"
            id="stock_quantity"
            value={stockQuantity}
            onChange={(e) => setStockQuantity(e.target.value)}
            placeholder="Cantidad disponible"
            required
          />
        </div>

        <div className="mb-4">
          <label htmlFor="category_id">Categoría:</label>
          <input
            type="number"
            id="category_id"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            placeholder="ID de la categoría"
            required
          />
        </div>

        <div className="mb-6">
          <label htmlFor="status">Estado:</label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            required
          >
            <option value="activo">Activo</option>
            <option value="inactivo">Inactivo</option>
          </select>
        </div>

        <button type="submit">Agregar Producto</button>
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
