import React, { useEffect, useState } from "react";
import { obtenerImagenesProducto } from "../services/api";

const TemplateGrid = ({ products }) => {
  const [imagenes, setImagenes] = useState({});

  useEffect(() => {
    products.forEach((product) => {
      obtenerImagenesProducto(product.id, localStorage.getItem("token"))
        .then((imgs) => {
          setImagenes((prev) => ({
            ...prev,
            [product.id]: imgs && imgs.length > 0 ? imgs[0].url_imagen : null,
          }));
        })
        .catch(() => {
          setImagenes((prev) => ({ ...prev, [product.id]: null }));
        });
    });
  }, [products]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
      {products.map((product) => (
        <div key={product.id} className="border rounded p-4 shadow bg-white">
          {/* Imagen real del producto en proporción 1:1 */}
          <div className="w-auto aspect-square mb-2 rounded bg-gray-200 flex items-center justify-center overflow-hidden">
            {imagenes[product.id] ? (
              <img
                src={imagenes[product.id]}
                alt={product.name}
                className="object-cover w-full h-full"
              />
            ) : (
              <span className="text-gray-500 text-xl">Sin imagen</span>
            )}
          </div>
          <h3 className="text-lg font-bold">{product.name}</h3>
          <p className="text-gray-600">{product.description}</p>
          <p className="text-green-700 font-semibold mt-2">${product.price}</p>
        </div>
      ))}
    </div>
  );
};

export default TemplateGrid;
