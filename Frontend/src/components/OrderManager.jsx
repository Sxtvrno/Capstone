import React, { useState, useEffect } from "react";
import { ordersAPI } from "../services/api";

function OrderManager() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [filter, setFilter] = useState("todos"); // todos, creado, en preparación, listo para retiro, entregado, cancelado

  useEffect(() => {
    fetchOrders();
  }, [filter]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ordersAPI.getAll(filter === "todos" ? null : filter);
      setOrders(data);
    } catch (err) {
      console.error("Error al cargar pedidos:", err);
      setError("Error al cargar los pedidos");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEstado = async (orderId, nuevoEstado) => {
    try {
      await ordersAPI.updateStatus(orderId, nuevoEstado);
      await fetchOrders();
      if (selectedOrder?.id === orderId) {
        const updatedOrder = await ordersAPI.getById(orderId);
        setSelectedOrder(updatedOrder);
      }
    } catch (err) {
      console.error("Error al actualizar estado:", err);
      alert("Error al actualizar el estado del pedido");
    }
  };

  const getEstadoBadgeClass = (estado) => {
    const classes = {
      creado: "bg-gray-100 text-gray-800 border-gray-200",
      "en preparación": "bg-blue-100 text-blue-800 border-blue-200",
      "listo para retiro": "bg-yellow-100 text-yellow-800 border-yellow-200",
      entregado: "bg-green-100 text-green-800 border-green-200",
      cancelado: "bg-red-100 text-red-800 border-red-200",
    };
    return classes[estado] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getEstadoLabel = (estado) => {
    const labels = {
      creado: "Creado",
      "en preparación": "En Preparación",
      "listo para retiro": "Listo para Retiro",
      entregado: "Entregado",
      cancelado: "Cancelado",
    };
    return labels[estado] || estado;
  };

  const getEstadoIcon = (estado) => {
    const icons = {
      creado: "📝",
      "en preparación": "📦",
      "listo para retiro": "✅",
      entregado: "🎉",
      cancelado: "❌",
    };
    return icons[estado] || "📋";
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleString("es-CL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
    }).format(price);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <div className="text-red-600 mb-4">{error}</div>
        <button
          onClick={fetchOrders}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Gestión de Pedidos
        </h1>
        <p className="text-gray-600">
          Administra y actualiza el estado de los pedidos
        </p>
      </div>

      {/* Filtros */}
      <div className="mb-6 flex flex-wrap gap-2">
        {[
          { value: "todos", label: "Todos", icon: "📋" },
          { value: "creado", label: "Creados", icon: "📝" },
          { value: "en preparación", label: "En Preparación", icon: "📦" },
          {
            value: "listo para retiro",
            label: "Listo para Retiro",
            icon: "✅",
          },
          { value: "entregado", label: "Entregados", icon: "🎉" },
          { value: "cancelado", label: "Cancelados", icon: "❌" },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              filter === f.value
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <span>{f.icon}</span>
            {f.label}
          </button>
        ))}
      </div>

      {/* Estadísticas rápidas */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-900">
            {orders.length}
          </div>
          <div className="text-sm text-gray-600">
            {filter === "todos"
              ? "Total Pedidos"
              : `Pedidos ${getEstadoLabel(filter)}`}
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600">
            {formatPrice(
              orders.reduce((sum, o) => sum + parseFloat(o.total_price || 0), 0)
            )}
          </div>
          <div className="text-sm text-gray-600">Valor Total</div>
        </div>
      </div>

      {/* Lista de pedidos */}
      {orders.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <svg
            className="w-16 h-16 mx-auto mb-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
            />
          </svg>
          <p className="text-lg font-medium">No hay pedidos</p>
          <p className="text-sm">
            {filter === "todos"
              ? "No se han creado pedidos"
              : `No hay pedidos con estado "${getEstadoLabel(filter)}"`}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pedido
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        #{order.id}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {order.cliente_nombre || "N/A"}
                      </div>
                      <div className="text-sm text-gray-500">
                        {order.cliente_email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">
                        {formatPrice(order.total_price)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${getEstadoBadgeClass(
                          order.order_status
                        )}`}
                      >
                        <span>{getEstadoIcon(order.order_status)}</span>
                        {getEstadoLabel(order.order_status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(order.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => {
                          ordersAPI.getById(order.id).then(setSelectedOrder);
                        }}
                        className="text-blue-600 hover:text-blue-900 font-medium"
                      >
                        Ver Detalles
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Detalles */}
      {selectedOrder && (
        <div
          className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-start justify-between">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Pedido #{selectedOrder.id}
                </h2>
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border ${getEstadoBadgeClass(
                      selectedOrder.order_status
                    )}`}
                  >
                    <span>{getEstadoIcon(selectedOrder.order_status)}</span>
                    {getEstadoLabel(selectedOrder.order_status)}
                  </span>
                  <span className="text-sm text-gray-500">
                    Creado: {formatDate(selectedOrder.created_at)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="w-6 h-6"
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

            {/* Body */}
            <div className="p-6 space-y-6">
              {/* Información del Cliente */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  Cliente
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Nombre:</span>
                    <p className="font-medium">
                      {selectedOrder.cliente_nombre || "N/A"}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Email:</span>
                    <p className="font-medium">{selectedOrder.cliente_email}</p>
                  </div>
                </div>
              </div>

              {/* Dirección de Envío */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  Dirección de Envío
                </h3>
                <p className="text-sm text-gray-700 bg-gray-50 rounded p-3">
                  {selectedOrder.shipping_address}
                </p>
              </div>

              {/* Productos */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                    />
                  </svg>
                  Productos ({selectedOrder.productos?.length || 0})
                </h3>
                <div className="space-y-2">
                  {selectedOrder.productos?.map((producto) => (
                    <div
                      key={producto.producto_id}
                      className="flex items-center justify-between bg-gray-50 rounded-lg p-3"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {producto.title}
                        </p>
                        <p className="text-sm text-gray-500">
                          Cantidad: {producto.quantity} ×{" "}
                          {formatPrice(producto.unit_price)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          {formatPrice(producto.subtotal)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-900">
                    Total:
                  </span>
                  <span className="text-2xl font-bold text-blue-600">
                    {formatPrice(selectedOrder.total_price)}
                  </span>
                </div>
              </div>

              {/* Información de Pago */}
              {selectedOrder.pago_estado && (
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                      />
                    </svg>
                    Información de Pago
                  </h3>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Estado:</span>
                      <p className="font-medium">{selectedOrder.pago_estado}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Método:</span>
                      <p className="font-medium">{selectedOrder.pago_metodo}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Fecha:</span>
                      <p className="font-medium">
                        {formatDate(selectedOrder.pago_fecha)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Cambiar Estado */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">
                  Actualizar Estado del Pedido
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {[
                    "creado",
                    "en preparación",
                    "listo para retiro",
                    "entregado",
                    "cancelado",
                  ].map((estado) => (
                    <button
                      key={estado}
                      onClick={() =>
                        handleUpdateEstado(selectedOrder.id, estado)
                      }
                      disabled={selectedOrder.order_status === estado}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-1 ${
                        selectedOrder.order_status === estado
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : "bg-blue-600 text-white hover:bg-blue-700"
                      }`}
                    >
                      <span>{getEstadoIcon(estado)}</span>
                      {getEstadoLabel(estado)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OrderManager;
