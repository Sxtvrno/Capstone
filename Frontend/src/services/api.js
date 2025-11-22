import axios from "axios";

// Configuración base
export const API_URL = import.meta.env.VITE_BACK_URL || "http://localhost:8001";

// Configurar interceptor para agregar token automáticamente
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar refresh token
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem("refresh_token");
        if (refreshToken) {
          const response = await axios.post(`${API_URL}/api/auth/refresh`, {
            refresh_token: refreshToken,
          });

          const { access_token, refresh_token } = response.data;
          localStorage.setItem("access_token", access_token);
          localStorage.setItem("refresh_token", refresh_token);

          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return axios(originalRequest);
        }
      } catch (refreshError) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        window.location.href = "/";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// ==================== AUTH API ====================
export const authAPI = {
  async login(username, password) {
    const response = await axios.post(`${API_URL}/api/auth/login`, {
      username,
      password,
    });

    if (response.data?.access_token) {
      localStorage.setItem("access_token", response.data.access_token);
      localStorage.setItem("refresh_token", response.data.refresh_token);
      localStorage.setItem("user", JSON.stringify(response.data.user));
      localStorage.setItem("token", response.data.access_token);
    }

    return response.data;
  },

  async register(userData) {
    const response = await axios.post(`${API_URL}/api/auth/register`, {
      email: userData.email,
      password: userData.password,
      first_name: userData.first_name,
      last_name: userData.last_name,
      phone: userData.phone,
    });
    return response.data;
  },

  async verifyEmail(token) {
    const response = await axios.get(`${API_URL}/api/auth/verify-email`, {
      params: { token },
    });
    return response.data;
  },

  async resendVerification(email) {
    const response = await axios.post(
      `${API_URL}/api/auth/resend-verification`,
      null,
      {
        params: { email },
      }
    );
    return response.data;
  },

  async getProfile() {
    const response = await axios.get(`${API_URL}/api/auth/profile`);
    return response.data;
  },

  async changePassword(currentPassword, newPassword) {
    const response = await axios.post(`${API_URL}/api/auth/change-password`, {
      current_password: currentPassword,
      new_password: newPassword,
    });
    return response.data;
  },

  async requestPasswordReset(email) {
    const response = await axios.post(
      `${API_URL}/api/auth/request-password-reset`,
      {
        email,
      }
    );
    return response.data;
  },

  async resetPassword(token, newPassword) {
    const response = await axios.post(`${API_URL}/api/auth/reset-password`, {
      token,
      new_password: newPassword,
    });
    return response.data;
  },

  async refreshToken(refreshToken) {
    const response = await axios.post(`${API_URL}/api/auth/refresh`, {
      refresh_token: refreshToken,
    });

    if (response.data?.access_token) {
      localStorage.setItem("access_token", response.data.access_token);
      localStorage.setItem("refresh_token", response.data.refresh_token);
      localStorage.setItem("user", JSON.stringify(response.data.user));
      localStorage.setItem("token", response.data.access_token);
    }

    return response.data;
  },

  logout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    localStorage.removeItem("token");
  },

  isAuthenticated() {
    return !!localStorage.getItem("access_token");
  },

  isAdmin() {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return user.role === "admin";
  },

  getCurrentUser() {
    return JSON.parse(localStorage.getItem("user") || "{}");
  },
};

// ==================== PRODUCTS API ====================
export const productAPI = {
  async create(productData) {
    const response = await axios.post(`${API_URL}/api/productos/`, productData);
    return response.data;
  },

  async getAll(params = {}) {
    const { skip = 0, limit, categoria_id } = params;
    const queryParams = new URLSearchParams({
      skip: skip.toString(),
    });

    // Solo agregar limit si se proporciona explícitamente
    if (limit !== undefined) {
      queryParams.append("limit", limit.toString());
    }

    if (categoria_id) {
      queryParams.append("categoria_id", categoria_id.toString());
    }

    const response = await axios.get(
      `${API_URL}/api/productos/?${queryParams.toString()}`
    );
    return response.data;
  },

  async getById(id) {
    const response = await axios.get(`${API_URL}/api/productos/${id}`);
    return response.data;
  },

  async update(idOrData, maybeData) {
    // Soporta (id, data) o (dataConId)
    const id =
      typeof idOrData === "number" || typeof idOrData === "string"
        ? idOrData
        : idOrData?.id ?? maybeData?.id;

    const data =
      maybeData ?? (typeof idOrData === "object" ? { ...idOrData } : undefined);

    if (!id) throw new Error("ID de producto inválido");
    if (!data) throw new Error("Datos de producto inválidos");

    const url = `${API_URL}/api/productos/${id}`;
    const res = await axios.put(url, data, {
      headers: { "Content-Type": "application/json" },
    });
    return res.data;
  },

  async delete(id) {
    const response = await axios.delete(`${API_URL}/api/productos/${id}`);
    return response.data;
  },

  async getPublicProducts(params = {}) {
    const { skip = 0, limit, categoria_id } = params;
    const queryParams = new URLSearchParams({
      skip: skip.toString(),
    });

    // Solo agregar limit si se proporciona explícitamente
    if (limit !== undefined) {
      queryParams.append("limit", limit.toString());
    }

    if (categoria_id) {
      queryParams.append("categoria_id", categoria_id.toString());
    }

    const response = await axios.get(
      `${API_URL}/api/public/productos?${queryParams.toString()}`
    );
    return response.data;
  },

  async search(query) {
    const response = await axios.get(`${API_URL}/api/productos/search`, {
      params: { q: query },
    });
    return response.data;
  },

  async addImages(productId, images) {
    // images debe ser array de {url_imagen: "..."}
    const payload = Array.isArray(images) ? images : [{ url_imagen: images }];

    const response = await axios.post(
      `${API_URL}/api/productos/${productId}/imagenes`,
      payload,
      {
        headers: { "Content-Type": "application/json" },
      }
    );
    return response.data;
  },

  async getImages(productId) {
    const token = localStorage.getItem("access_token");

    try {
      const response = await axios.get(
        `${API_URL}/api/productos/${productId}/imagenes`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            accept: "application/json",
          },
        }
      );

      return response.data;
    } catch (error) {
      return [];
    }
  },

  async getImagesPublic(productId) {
    try {
      const response = await axios.get(
        `${API_URL}/api/public/productos/${productId}/imagenes`
      );
      return response.data;
    } catch (error) {
      return [];
    }
  },

  async deleteImage(imageId) {
    const response = await axios.delete(
      `${API_URL}/api/productos/imagenes/${imageId}`
    );
    return response.data;
  },
};

// ==================== CATEGORIES API ====================
export const categoryAPI = {
  async getAll() {
    const response = await axios.get(`${API_URL}/api/categorias/`);
    return response.data;
  },

  async getAllWithId() {
    const response = await axios.get(`${API_URL}/api/categorias-con-id/`);
    return response.data;
  },
};

// ==================== CLIENTS API (Admin only) ====================
export const clientAPI = {
  async create(clientData) {
    const response = await axios.post(`${API_URL}/api/clientes/`, clientData);
    return response.data;
  },

  async getAll(params = {}) {
    const { skip = 0, limit } = params;
    const queryParams = { skip };

    // Solo agregar limit si se proporciona explícitamente
    if (limit !== undefined) {
      queryParams.limit = limit;
    }

    const response = await axios.get(`${API_URL}/api/clientes/`, {
      params: queryParams,
    });
    return response.data;
  },

  async getById(id) {
    const response = await axios.get(`${API_URL}/api/clientes/${id}`);
    return response.data;
  },

  async update(id, clientData) {
    const response = await axios.put(
      `${API_URL}/api/clientes/${id}`,
      clientData
    );
    return response.data;
  },

  async delete(id) {
    const response = await axios.delete(`${API_URL}/api/clientes/${id}`);
    return response.data;
  },
};

// ==================== ADDRESS API ====================
export const addressAPI = {
  async create(clientId, addressData) {
    const response = await axios.post(
      `${API_URL}/api/clientes/${clientId}/direcciones`,
      addressData
    );
    return response.data;
  },

  async getByClientId(clientId) {
    const response = await axios.get(
      `${API_URL}/api/clientes/${clientId}/direcciones`
    );
    return response.data;
  },

  async update(addressId, addressData) {
    const response = await axios.put(
      `${API_URL}/api/direcciones/${addressId}`,
      addressData
    );
    return response.data;
  },

  async delete(addressId) {
    const response = await axios.delete(
      `${API_URL}/api/direcciones/${addressId}`
    );
    return response.data;
  },
};

// ==================== ADMIN API (Admin only) ====================
export const adminAPI = {
  async create(adminData) {
    const response = await axios.post(
      `${API_URL}/api/administradores/`,
      adminData
    );
    return response.data;
  },

  async getAll(params = {}) {
    const { skip = 0, limit } = params;
    const queryParams = { skip };

    // Solo agregar limit si se proporciona explícitamente
    if (limit !== undefined) {
      queryParams.limit = limit;
    }

    const response = await axios.get(`${API_URL}/api/administradores/`, {
      params: queryParams,
    });
    return response.data;
  },

  async getById(id) {
    const response = await axios.get(`${API_URL}/api/administradores/${id}`);
    return response.data;
  },

  async update(id, adminData) {
    const response = await axios.put(
      `${API_URL}/api/administradores/${id}`,
      adminData
    );
    return response.data;
  },

  async delete(id) {
    const response = await axios.delete(`${API_URL}/api/administradores/${id}`);
    return response.data;
  },
};

// ==================== HEALTH CHECK ====================
export const healthAPI = {
  async check() {
    const response = await axios.get(`${API_URL}/health`);
    return response.data;
  },
};

// ==================== EMAIL TEST ====================
export const emailAPI = {
  async testEmail(email) {
    const response = await axios.post(`${API_URL}/api/test-email`, null, {
      params: { email },
    });
    return response.data;
  },
};

const API_BASE = import.meta.env.VITE_API_BASE || `${window.location.protocol}//${window.location.hostname}:8000`;

function getStoredToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("authToken") ||
    (() => {
      const authRaw = localStorage.getItem("auth");
      if (!authRaw) return null;
      try {
        const authObj = JSON.parse(authRaw);
        return authObj?.token || authObj?.accessToken || null;
      } catch {
        return null;
      }
    })()
  );
}

function authHeaders() {
  const headers = { "Content-Type": "application/json" };
  const token = getStoredToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

export const transbankAPI = {
  async createTransaction(payload = {}) {
    const headers = authHeaders();
    // si hay sessionId en localStorage, añadirlo al body para carritos anónimos
    const sessionId = localStorage.getItem("cart.sessionId");
    const body = { ...payload };
    if (sessionId) body.session_id = sessionId;

    console.info("[transbankAPI.createTransaction] url:", `${API_BASE}/api/transbank/create`);
    console.info("[transbankAPI.createTransaction] headers:", headers);
    console.info("[transbankAPI.createTransaction] body:", body);

    const res = await fetch(`${API_BASE}/api/transbank/create`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    const text = await res.text();
    try {
      const data = text ? JSON.parse(text) : {};
      if (!res.ok) throw new Error(JSON.stringify(data || text));
      return data;
    } catch (e) {
      // respuesta no JSON o error parseando
      if (!res.ok) throw new Error(`Transbank create failed ${res.status}: ${text}`);
      return text;
    }
  },

  async confirmTransaction(token_ws) {
    const headers = authHeaders();
    headers["Accept"] = "application/json";

    console.info(
      "[transbankAPI.confirmTransaction] url:",
      `${API_BASE}/api/transbank/confirm`,
      "body:",
      { token_ws }
    );

    const res = await fetch(`${API_BASE}/api/transbank/confirm`, {
      method: "POST",
      headers,
      body: JSON.stringify({ token_ws }),
    });
    if (!res.ok) {
      const t = await res.json().catch(() => ({}));
      throw new Error(t.detail || "Error al confirmar transacción");
    }
    return res.json();
  },

  // Compatibilidad: obtener pedido por id (usa endpoint /api/pedidos/{id})
  async getPedido(pedidoId) {
    const res = await fetch(`${BASE_URL}/api/pedidos/${pedidoId}`, {
      method: "GET",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    });
    if (!res.ok) {
      const t = await res.json().catch(() => ({}));
      throw new Error(t.detail || "Error al obtener pedido");
    }
    return res.json();
  },

  // Compatibilidad: enviar boleta por correo (POST /api/pedidos/{id}/send-receipt)
  async sendBoletaEmail(pedidoId) {
    const res = await fetch(
      `${BASE_URL}/api/pedidos/${pedidoId}/send-receipt`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      }
    );
    if (!res.ok) {
      const t = await res.json().catch(() => ({}));
      throw new Error(t.detail || "Error al enviar boleta por correo");
    }
    return res.json();
  },
};

// ==================== ORDERS / PEDIDOS API ====================
// Usa axios (incluye interceptor de auth) para estas operaciones
export const orderAPI = {
  // Admin: listar todos los pedidos con cliente e items
  async adminGetAll() {
    const response = await axios.get(`${API_URL}/api/admin/pedidos`);
    return response.data;
  },

  // Cliente autenticado: listar sus pedidos
  async clientGetAll() {
    const response = await axios.get(`${API_URL}/api/client/pedidos`);
    return response.data;
  },

  // Obtener un pedido por id (con items) - usado por la boleta
  async getById(id) {
    const response = await axios.get(`${API_URL}/api/pedidos/${id}`);
    return response.data;
  },

  // Enviar boleta por correo (backend: POST /api/pedidos/{id}/send-receipt)
  async sendReceipt(id) {
    const response = await axios.post(
      `${API_URL}/api/pedidos/${id}/send-receipt`
    );
    return response.data;
  },
};

const text = await res.text();
try {
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(JSON.stringify(data || text));
  return data;
} catch (e) {
  if (!res.ok) throw new Error(`Transbank confirm failed ${res.status}: ${text}`);
  return text;
}
  },

  // ...existing exports...
};
// API de Tickets de Soporte
export const ticketsAPI = {
  // Obtener todos los tickets (con filtro opcional de estado)
  async getAll(estado = null) {
    try {
      const params = estado ? { estado } : {};
      const response = await axios.get(`${API_URL}/api/admin/tickets`, {
        params,
      });
      return response.data;
    } catch (error) {
      console.error("Error al obtener tickets:", error);
      throw error;
    }
  },

  // Obtener un ticket por ID
  async getById(id) {
    try {
      const response = await axios.get(`${API_URL}/api/admin/tickets/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error al obtener ticket ${id}:`, error);
      throw error;
    }
  },

  // Actualizar estado de un ticket
  async updateEstado(id, estado) {
    try {
      const response = await axios.patch(
        `${API_URL}/api/admin/tickets/${id}/estado`,
        { estado }
      );
      return response.data;
    } catch (error) {
      console.error(`Error al actualizar estado del ticket ${id}:`, error);
      throw error;
    }
  },

  // Agregar notas internas a un ticket
  async addNotas(id, notas) {
    try {
      const response = await axios.patch(
        `${API_URL}/api/admin/tickets/${id}/notas`,
        { notas }
      );
      return response.data;
    } catch (error) {
      console.error(`Error al agregar notas al ticket ${id}:`, error);
      throw error;
    }
  },

  // Eliminar un ticket (opcional, puede ser útil para cleanup)
  async delete(id) {
    try {
      const response = await axios.delete(`${API_URL}/api/admin/tickets/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error al eliminar ticket ${id}:`, error);
      throw error;
    }
  },
};

// ==================== ORDERS API ====================
export const ordersAPI = {
  // Listar todos los pedidos (Admin)
  async getAll(estado = null) {
    try {
      const params = {};
      if (estado && estado !== "todos") {
        params.estado = estado;
      }
      const response = await axios.get(`${API_URL}/api/admin/orders`, {
        params,
      });
      return response.data;
    } catch (error) {
      console.error("Error al obtener pedidos:", error);
      throw error;
    }
  },

  // Obtener detalle de un pedido (Admin o Cliente propietario)
  async getById(id) {
    try {
      const response = await axios.get(`${API_URL}/api/admin/orders/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error al obtener pedido ${id}:`, error);
      throw error;
    }
  },

  // Actualizar estado de un pedido (Admin)
  async updateStatus(id, nuevoEstado) {
    try {
      const response = await axios.patch(
        `${API_URL}/api/admin/orders/${id}/status`,
        {
          order_status: nuevoEstado,
        }
      );
      return response.data;
    } catch (error) {
      console.error(`Error al actualizar estado del pedido ${id}:`, error);
      throw error;
    }
  },

  // Obtener pedidos del cliente autenticado
  async getMyOrders() {
    try {
      const response = await axios.get(`${API_URL}/api/cliente/mis-pedidos`);
      return response.data;
    } catch (error) {
      console.error("Error al obtener mis pedidos:", error);
      throw error;
    }
  },
};

// Exportar funciones legacy para compatibilidad (deprecadas)
export const login = authAPI.login;
export const register = authAPI.register;
export const getProductos = (onAuthError) =>
  productAPI.getAll().catch(onAuthError);
export const addProducto = (producto, onAuthError) =>
  productAPI.create(producto).catch(onAuthError);
export const updateProducto = (id, producto, onAuthError) =>
  productAPI.update(id, producto).catch(onAuthError);
export const deleteProducto = (id, onAuthError) =>
  productAPI.delete(id).catch(onAuthError);
export const getCategorias = (onAuthError) =>
  categoryAPI
    .getAllWithId()
    .then((data) => ({ data }))
    .catch(onAuthError);
export const getProductosPorCategoria = (
  categoria_id,
  skip,
  limit,
  onAuthError
) =>
  productAPI
    .getAll({ skip, limit, categoria_id })
    .then((data) => ({ data }))
    .catch(onAuthError);
export const getProductoById = productAPI.getById;
export const subirImagenesProducto = (productoId, imagenes) =>
  productAPI.addImages(productoId, imagenes);
export const obtenerImagenesProducto = productAPI.getImages;
export const deleteImagenProducto = productAPI.deleteImage;

export default {
  authAPI,
  productAPI,
  categoryAPI,
  clientAPI,
  addressAPI,
  adminAPI,
  healthAPI,
  emailAPI,
  transbankAPI,
  ticketsAPI,
  orderAPI,
  API_URL,
};
