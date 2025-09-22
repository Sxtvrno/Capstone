import React from "react";

const TemplateGrid = ({ products }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
    {products.map((product) => (
      <div key={product.id} className="border rounded p-4 shadow bg-white">
        {/* Simulación de imagen */}
        <div className="w-full h-32 mb-2 rounded bg-gray-200 flex items-center justify-center text-gray-500 text-xl">
          Imagen
        </div>
        <h3 className="text-lg font-bold">{product.name}</h3>
        <p className="text-gray-600">{product.description}</p>
        <p className="text-green-700 font-semibold mt-2">${product.price}</p>
      </div>
    ))}
  </div>
);

export default TemplateGrid;
