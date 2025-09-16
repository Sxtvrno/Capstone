import axios from "axios";

const API_URL = "http://localhost:8001/api";

export const login = async (username, password) => {
  const response = await axios.post(
    `${API_URL}/auth/login`,
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
    `${API_URL}/auth/register`,
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
    return await axios.get(`${API_URL}/productos/`, {
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
    return await axios.post(`${API_URL}/productos/`, producto, {
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
