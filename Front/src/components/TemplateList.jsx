import React from "react";

const TemplateList = ({ products }) => (
  <div className="flex flex-col gap-4">
    {products.map((product) => (
      <div
        key={product.id}
        className="flex items-center border rounded p-4 shadow bg-white"
      >
        {/* Simulación de imagen */}
        <div className="w-20 h-20 rounded bg-gray-200 flex items-center justify-center text-gray-500 text-lg mr-4">
          Imagen
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

export default TemplateList;
