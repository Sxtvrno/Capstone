// src/components/ProductList.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';

function ProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    axios.get('http://localhost:8001/api/productos/')
      .then((response) => {
        setProducts(response.data);
        setLoading(false);
      })
      .catch((error) => {
        setError('Error al obtener los productos');
        setLoading(false);
      });
  }, []);

  const handleDelete = async (productId) => {
    // Confirmación antes de eliminar el producto
    const isConfirmed = window.confirm('¿Estás seguro de que deseas eliminar este producto?');

    if (isConfirmed) {
      try {
        const response = await axios.delete(`http://localhost:8001/api/productos/${productId}`);
        if (response.status === 200) {
          // Eliminar el producto de la lista en el frontend
          setProducts(products.filter(product => product.id !== productId));
        }
      } catch (error) {
        console.error('Error al eliminar el producto:', error);
        setError('Hubo un error al eliminar el producto');
      }
    } else {
      console.log('Eliminación cancelada');
    }
  };

  if (loading) {
    return <div className="text-center text-gray-600">Cargando productos...</div>;
  }

  if (error) {
    return <div className="text-center text-red-600">{error}</div>;
  }

  return (
    <div className="product-list">
      <h2>Lista de Productos</h2>
      <ul>
        {products.length > 0 ? (
          products.map((product) => (
            <li key={product.id} className="product-item">
              <div className="product-info">
                <span className="product-name">{product.title}</span>
                <span className="product-sku">SKU: {product.sku}</span>
              </div>
              <span className="product-price">${product.price}</span>
              {/* Botón de eliminar producto con confirmación */}
              <button
                onClick={() => handleDelete(product.id)}
                className="bg-red-500 text-white py-1 px-3 rounded-md hover:bg-red-600"
              >
                Eliminar
              </button>
            </li>
          ))
        ) : (
          <li>No hay productos disponibles.</li>
        )}
      </ul>
    </div>
  );
}

export default ProductList;
