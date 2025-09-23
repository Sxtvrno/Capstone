import React, { useEffect, useState } from "react";
import { getProductos } from "../services/api";

const MediaManager = ({ onUpload }) => {
  const [productos, setProductos] = useState([]);
  const [selectedFile, setSelectedFile] = useState({});
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    getProductos()
      .then((res) => setProductos(res.data))
      .catch((err) => console.error(err));
  }, []);

  const handleFileChange = (id, file) => {
    setSelectedFile({ ...selectedFile, [id]: file });
  };

  const handleUpload = async (id) => {
    if (!selectedFile[id]) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", selectedFile[id]);
    try {
      // Reemplaza esto por tu función real de subida en api.js
      await fetch(`http://localhost:8001/api/productos/${id}/media`, {
        method: "POST",
        body: formData,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      alert("Imagen subida correctamente");
      setSelectedFile({ ...selectedFile, [id]: null });
      if (onUpload) onUpload(id);
    } catch (error) {
      alert("Error al subir la imagen");
    }
    setUploading(false);
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Media de Productos</h2>
      <ul className="space-y-4">
        {productos.map((producto) => (
          <li key={producto.id} className="flex flex-col gap-2 border-b pb-4">
            <span className="font-semibold">{producto.nombre || producto.name}</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileChange(producto.id, e.target.files[0])}
            />
            <button
              onClick={() => handleUpload(producto.id)}
              disabled={uploading || !selectedFile[producto.id]}
              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Subir imagen
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default MediaManager;