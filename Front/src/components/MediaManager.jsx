import React, { useEffect, useState } from "react";
import { getProductos } from "../services/api";
import {
  subirImagenesProducto,
  obtenerImagenesProducto,
  deleteImagenProducto,
} from "../services/api";

const MediaManager = ({ onUpload }) => {
  const [productos, setProductos] = useState([]);
  const [urlInput, setUrlInput] = useState({});
  const [imagenes, setImagenes] = useState({});
  const [uploading, setUploading] = useState(false);
  const [selectedProducto, setSelectedProducto] = useState(null);

  useEffect(() => {
    getProductos()
      .then((res) => setProductos(res.data || res))
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    productos.forEach((producto) => {
      obtenerImagenesProducto(producto.id, localStorage.getItem("token"))
        .then((imgs) =>
          setImagenes((prev) => ({ ...prev, [producto.id]: imgs }))
        )
        .catch(() => {});
    });
  }, [productos]);

  const handleUrlChange = (id, value) => {
    setUrlInput({ ...urlInput, [id]: value });
  };

  const handleUpload = async (id) => {
    const url = urlInput[id];
    if (!url) return;
    setUploading(true);
    try {
      await subirImagenesProducto(
        id,
        [{ url_imagen: url }],
        localStorage.getItem("token")
      );
      alert("Imagen subida correctamente");
      setUrlInput({ ...urlInput, [id]: "" });
      // Actualiza la lista de imágenes
      const imgs = await obtenerImagenesProducto(
        id,
        localStorage.getItem("token")
      );
      setImagenes((prev) => ({ ...prev, [id]: imgs }));
      if (onUpload) onUpload(id);
    } catch (error) {
      alert("Error al subir la imagen");
    }
    setUploading(false);
  };

  const handleDeleteImagen = async (imgId, productoId) => {
    if (!window.confirm("¿Seguro que deseas borrar esta imagen?")) return;
    try {
      await deleteImagenProducto(imgId, localStorage.getItem("token"));
      const imgs = await obtenerImagenesProducto(
        productoId,
        localStorage.getItem("token")
      );
      setImagenes((prev) => ({ ...prev, [productoId]: imgs }));
    } catch (error) {
      alert("Error al borrar la imagen");
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 p-4 bg-white rounded-lg shadow-md">
      {/* Panel compacto de productos y subida */}
      <div className="w-full md:w-1/2">
        <h2 className="text-lg font-bold mb-4 text-gray-800">Productos</h2>
        <ul className="space-y-4">
          {productos.map((producto) => (
            <li
              key={producto.id}
              className={`flex items-center gap-2 p-3 rounded-lg border hover:bg-gray-100 cursor-pointer transition duration-200 ${
                selectedProducto === producto.id
                  ? "bg-blue-100 border-blue-400"
                  : "border-gray-300"
              }`}
              onClick={() => setSelectedProducto(producto.id)}
            >
              <span className="font-medium flex-1 truncate text-gray-700">
                {producto.nombre || producto.name || producto.title}
              </span>
              <input
                type="text"
                placeholder="URL imagen"
                value={urlInput[producto.id] || ""}
                onChange={(e) => handleUrlChange(producto.id, e.target.value)}
                className="border border-gray-300 px-2 py-1 rounded text-sm w-32 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleUpload(producto.id);
                }}
                disabled={
                  uploading ||
                  !(urlInput[producto.id] && urlInput[producto.id].length > 0)
                }
                className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:opacity-50 transition duration-200"
              >
                Subir
              </button>
            </li>
          ))}
        </ul>
      </div>
      {/* Panel visualización de imágenes */}
      <div className="w-full md:w-1/2">
        <h2 className="text-lg font-bold mb-4 text-gray-800">
          Imágenes del producto
        </h2>
        {selectedProducto ? (
          <div className="flex flex-wrap gap-2 border rounded p-2 min-h-[100px] bg-gray-50">
            {(imagenes[selectedProducto] || []).length === 0 ? (
              <span className="text-gray-400 text-sm">
                No hay imágenes para este producto.
              </span>
            ) : (
              imagenes[selectedProducto].map((img) => (
                <div key={img.id} className="relative">
                  <img
                    src={img.url_imagen}
                    alt="Producto"
                    className="w-24 h-24 object-cover border rounded shadow cursor-pointer hover:opacity-70 transition duration-200"
                    title="Click para borrar"
                    onClick={() => handleDeleteImagen(img.id, selectedProducto)}
                  />
                  <button
                    className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
                    onClick={() => handleDeleteImagen(img.id, selectedProducto)}
                    title="Borrar imagen"
                  >
                    &times;
                  </button>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="text-gray-400 text-sm border rounded p-2 bg-gray-50">
            Selecciona un producto para ver sus imágenes.
          </div>
        )}
      </div>
    </div>
  );
};

export default MediaManager;
