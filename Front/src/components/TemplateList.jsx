import React, { useEffect, useState } from "react";
import { obtenerImagenesProducto } from "../services/api";

const TemplateList = ({ products }) => {
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
    <div className="flex flex-col gap-4">
      {products.map((product) => (
        <div
          key={product.id}
          className="flex items-center border rounded p-4 shadow bg-white"
        >
          {/* Imagen real del producto */}
          <div className="w-20 h-20 rounded bg-gray-200 flex items-center justify-center text-gray-500 text-lg mr-4 overflow-hidden">
            {imagenes[product.id] ? (
              <img
                src={imagenes[product.id]}
                alt={product.name}
                className="object-cover w-full h-full"
              />
            ) : (
              <span>Sin imagen</span>
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold">{product.name}</h3>
            <p className="text-gray-600">{product.description}</p>
          </div>
          <div className="text-green-700 font-semibold text-lg ml-4">
            ${product.price}
          </div>
        </div>
      ))}
    </div>
  );
};

export default TemplateList;
