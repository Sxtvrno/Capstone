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
      const imgs = await obtenerImagenesProducto(
        id,
        localStorage.getItem("token")
      );
      setImageenes((prev) => ({ ...prev, [id]: imgs }));
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
    <div className="p-4 md:p-6 lg:p-8">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Panel de productos */}
        <div className="w-full lg:w-1/2">
          <h2 className="text-lg md:text-xl font-bold mb-4 text-gray-800">
            Productos
          </h2>
          <div className="bg-gray-50 rounded-lg border border-gray-200 max-h-[600px] overflow-y-auto">
            <ul className="divide-y divide-gray-200">
              {productos.map((producto) => (
                <li
                  key={producto.id}
                  className={`p-4 hover:bg-gray-100 cursor-pointer transition ${
                    selectedProducto === producto.id
                      ? "bg-blue-50 border-l-4 border-blue-500"
                      : ""
                  }`}
                  onClick={() => setSelectedProducto(producto.id)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <span className="font-medium text-gray-700 flex-1 truncate">
                      {producto.nombre || producto.name || producto.title}
                    </span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="URL imagen"
                        value={urlInput[producto.id] || ""}
                        onChange={(e) =>
                          handleUrlChange(producto.id, e.target.value)
                        }
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 sm:w-48 border border-gray-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpload(producto.id);
                        }}
                        disabled={
                          uploading ||
                          !(
                            urlInput[producto.id] &&
                            urlInput[producto.id].length > 0
                          )
                        }
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition whitespace-nowrap"
                      >
                        Subir
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Panel de imágenes */}
        <div className="w-full lg:w-1/2">
          <h2 className="text-lg md:text-xl font-bold mb-4 text-gray-800">
            Imágenes del producto
          </h2>
          {selectedProducto ? (
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 min-h-[200px]">
              {(imagenes[selectedProducto] || []).length === 0 ? (
                <div className="flex items-center justify-center h-40 text-gray-400">
                  <p className="text-sm">No hay imágenes para este producto.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {imagenes[selectedProducto].map((img) => (
                    <div key={img.id} className="relative group">
                      <img
                        src={img.url_imagen}
                        alt="Producto"
                        className="w-full h-32 object-cover border rounded-lg shadow hover:shadow-lg transition cursor-pointer"
                        title="Click para ver"
                      />
                      <button
                        className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                        onClick={() =>
                          handleDeleteImagen(img.id, selectedProducto)
                        }
                        title="Borrar imagen"
                      >
                        <svg
                          className="w-4 h-4"
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
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-8 text-center">
              <p className="text-gray-400 text-sm">
                Selecciona un producto para ver sus imágenes.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MediaManager;
