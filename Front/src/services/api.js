import axios from "axios";

export const API_URL = import.meta.env.VITE_BACK_URL;

export const login = async (username, password) => {
  const response = await axios.post(
    `${API_URL}/api/auth/login`,
    {
      username,
      password,
    },
    {
      headers: {
        accept: "application/json",
        "Content-Type": "application/json",
      },
    }
  );
  if (response.data && response.data.access_token) {
    localStorage.setItem("token", response.data.access_token);
  }
  return response.data;
};

export const register = async (
  email,
  password,
  first_name,
  last_name,
  phone,
  address
) => {
  const response = await axios.post(
    `${API_URL}/api/auth/register`,
    {
      email,
      password,
      first_name,
      last_name,
      phone,
      address,
    },
    {
      headers: {
        accept: "application/json",
        "Content-Type": "application/json",
      },
    }
  );
  return response.data;
};

// Modificado para manejar error 401
export const getProductos = async (onAuthError) => {
  const token = localStorage.getItem("token");
  try {
    return await axios.get(`${API_URL}/api/productos/`, {
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (error) {
    if (error?.response?.status === 401 && onAuthError) {
      onAuthError(error);
    }
    throw error;
  }
};

export const addProducto = async (producto, onAuthError) => {
  const token = localStorage.getItem("token");
  try {
    return await axios.post(`${API_URL}/api/productos/`, producto, {
      headers: {
        accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (error) {
    if (error?.response?.status === 401 && onAuthError) {
      onAuthError(error);
    }
    throw error;
  }
};

export const updateProducto = async (id, producto, onAuthError) => {
  const token = localStorage.getItem("token");
  try {
    return await axios.put(`${API_URL}/api/productos/${id}/`, producto, {
      headers: {
        accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (error) {
    if (error?.response?.status === 401 && onAuthError) {
      onAuthError(error);
    }
    throw error;
  }
};

export const deleteProducto = async (id, onAuthError) => {
  const token = localStorage.getItem("token");
  try {
    return await axios.delete(`${API_URL}/api/productos/${id}/`, {
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (error) {
    if (error?.response?.status === 401 && onAuthError) {
      onAuthError(error);
    }
    throw error;
  }
};

// Subir imágenes (URLs) a un producto
export const subirImagenesProducto = async (productoId, imagenes, token) => {
  const response = await fetch(
    `${API_URL}/api/productos/${productoId}/imagenes`,
    {
      method: "POST",
      headers: {
        accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(imagenes), // Ejemplo: [{ url_imagen: "..." }]
    }
  );
  if (!response.ok) throw new Error("Error al subir imágenes");
  return await response.json();
};

// Obtener imágenes de un producto
export const obtenerImagenesProducto = async (productoId, token) => {
  const response = await fetch(
    `${API_URL}/api/productos/${productoId}/imagenes`,
    {
      method: "GET",
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );
  if (!response.ok) throw new Error("Error al obtener imágenes");
  return await response.json();
};

export const deleteImagenProducto = async (imagenId, token) => {
  const response = await fetch(
    `${API_URL}/api/productos/imagenes/${imagenId}`,
    {
      method: "DELETE",
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );
  if (!response.ok) throw new Error("Error al borrar la imagen");
  return await response.json();
};

export const getCategorias = async (onAuthError) => {
  const token = localStorage.getItem("token");
  try {
    return await axios.get(`${API_URL}/api/categorias-con-id/`, {
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (error) {
    if (error?.response?.status === 401 && onAuthError) {
      onAuthError(error);
    }
    throw error;
  }
};

export const getProductosPorCategorias = async (
  categoriaIds = null,
  skip = 0,
  limit = 100,
  onAuthError
) => {
  const token = localStorage.getItem("token");
  try {
    const params = { skip, limit };
    if (categoriaIds) {
      params.categoria_ids = Array.isArray(categoriaIds)
        ? categoriaIds.join(",")
        : categoriaIds;
    }
    return await axios.get(`${API_URL}/api/productos/por-categorias`, {
      params,
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (error) {
    if (error?.response?.status === 401 && onAuthError) {
      onAuthError(error);
    }
    throw error;
  }
};
