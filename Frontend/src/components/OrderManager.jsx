import React, { useState, useEffect, useCallback } from "react";
import { ordersAPI } from "../services/api";

function OrderManager() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("todos");
  const [expanded, setExpanded] = useState({}); // nuevo: manejamos detalle como OrdersAdmin

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ordersAPI.getAll(filter === "todos" ? null : filter);
      const arr = Array.isArray(data) ? data : data?.pedidos || [];
      setOrders(arr);
    } catch (err) {
      setError("Error al cargar los pedidos");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const toggleExpand = (id) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const handleUpdateEstado = async (orderId, nuevoEstado) => {
    try {
      await ordersAPI.updateStatus(orderId, nuevoEstado);
      await fetchOrders();
    } catch {
      alert("Error al actualizar el estado del pedido");
    }
  };

  const getEstadoBadgeClass = (estado) => {
    const classes = {
      Pendiente: "bg-gray-100 text-gray-800 border-gray-200",
      pagado: "bg-green-100 text-green-800 border-green-200",
      "en preparación": "bg-blue-100 text-blue-800 border-blue-200",
      "listo para retiro": "bg-yellow-100 text-yellow-800 border-yellow-200",
      entregado: "bg-purple-100 text-purple-800 border-purple-200",
      cancelado: "bg-red-100 text-red-800 border-red-200",
    };
    return classes[estado] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getEstadoLabel = (estado) => {
    const labels = {
      Pendiente: "Pendiente",
      Pagado: "Pagado",
      "en preparación": "En Preparación",
      "listo para retiro": "Listo para Retiro",
      entregado: "Entregado",
      cancelado: "Cancelado",
    };
    return labels[estado] || estado;
  };

  const getEstadoIcon = (estado) => {
    const icons = {
      Pendiente: "⏳",
      Pagado: "💰",
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

  const formatPrice = (price) =>
    new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
    }).format(Number(price || 0));

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
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Gestión de Pedidos
        </h1>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {[
          { value: "todos", label: "Todos", icon: "📋" },
          { value: "pendiente", label: "Pendientes", icon: "⏳" },
          { value: "pagado", label: "Pagado", icon: "💰" },
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
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${filter === f.value
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
          >
            <span>{f.icon}</span>
            {f.label}
          </button>
        ))}
      </div>

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
              orders.reduce((sum, o) => sum + Number(o.total_price || 0), 0)
            )}
          </div>
          <div className="text-sm text-gray-600">Valor Total</div>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg font-medium">No hay pedidos</p>
          <p className="text-sm">
            {filter === "todos"
              ? "No se han creado pedidos"
              : `No hay pedidos con estado "${getEstadoLabel(filter)}"`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => {
            const productos = Array.isArray(o.productos) ? o.productos : [];
            return (
              <div
                key={o.id}
                className="border border-gray-200 bg-white rounded-lg shadow-sm"
              >
                <div className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">
                      Pedido #{o.id} • {formatDate(o.created_at)}
                    </p>
                    <p className="font-medium text-gray-800">
                      Cliente: {o.cliente_nombre || o.cliente_email || "N/A"}
                    </p>
                    <p className="text-sm text-gray-600">
                      Estado:{" "}
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${getEstadoBadgeClass(
                          o.order_status
                        )}`}
                      >
                        {getEstadoIcon(o.order_status)}{" "}
                        {getEstadoLabel(o.order_status)}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Total</p>
                      <p className="font-semibold text-gray-900">
                        {formatPrice(o.total_price)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {productos.length} item
                        {productos.length !== 1 && "s"}
                      </p>
                    </div>
                    <button
                      onClick={() => toggleExpand(o.id)}
                      className="px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition"
                    >
                      {expanded[o.id] ? "Ocultar" : "Ver detalles"}
                    </button>
                  </div>
                </div>

                {expanded[o.id] && (
                  <div className="border-t bg-gray-50">
                    <div className="p-4 text-sm text-gray-700 space-y-2">
                      <div>
                        <span className="font-medium text-gray-800">
                          Dirección envío:{" "}
                        </span>
                        <span className="text-gray-600">
                          {o.shipping_address || "—"}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-800">
                          Email Cliente:{" "}
                        </span>
                        <span className="text-gray-600">
                          {o.cliente_email || "—"}
                        </span>
                      </div>
                    </div>

                    {productos.length === 0 && (
                      <p className="px-4 pb-4 text-sm text-gray-500">
                        Sin productos.
                      </p>
                    )}

                    {productos.length > 0 && (
                      <div className="p-4 space-y-3">
                        {/* Móvil */}
                        <div className="grid gap-3 sm:hidden">
                          {productos.map((prod, idx) => {
                            const nombre =
                              prod.title ||
                              prod.nombre ||
                              prod.producto?.title ||
                              prod.producto?.nombre ||
                              `Item ${idx + 1}`;
                            const qty = prod.quantity || prod.cantidad || 1;
                            const unit =
                              prod.unit_price ||
                              prod.precio_unitario ||
                              prod.price ||
                              0;
                            const sub = Number(unit) * Number(qty);
                            return (
                              <div
                                key={idx}
                                className="bg-white rounded-md border border-gray-200 p-3 flex justify-between items-center"
                              >
                                <div className="space-y-0.5">
                                  <p className="text-sm font-medium text-gray-800">
                                    {nombre}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    Cant: {qty} • Unit:{" "}
                                    {formatPrice(unit)
                                      .replace("CLP", "")
                                      .trim()}
                                  </p>
                                </div>
                                <p className="text-sm font-semibold text-gray-900">
                                  {formatPrice(sub).replace("CLP", "").trim()}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                        {/* Desktop */}
                        <div className="hidden sm:block overflow-x-auto">
                          <table className="min-w-full text-sm">
                            <thead>
                              <tr className="bg-gray-100 text-gray-700">
                                <th className="text-left px-4 py-2 font-medium">
                                  Producto
                                </th>
                                <th className="text-left px-4 py-2 font-medium">
                                  Cantidad
                                </th>
                                <th className="text-left px-4 py-2 font-medium">
                                  Precio Unit.
                                </th>
                                <th className="text-left px-4 py-2 font-medium">
                                  Subtotal
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {productos.map((prod, idx) => {
                                const nombre =
                                  prod.title ||
                                  prod.nombre ||
                                  prod.producto?.title ||
                                  prod.producto?.nombre ||
                                  prod.name ||
                                  prod.descripcion ||
                                  `Item ${idx + 1}`;
                                const qty =
                                  prod.quantity ||
                                  prod.cantidad ||
                                  prod.qty ||
                                  1;
                                const unit =
                                  prod.unit_price ||
                                  prod.precio_unitario ||
                                  prod.price ||
                                  0;
                                const sub = Number(unit) * Number(qty);
                                return (
                                  <tr
                                    key={idx}
                                    className="border-t border-gray-200 hover:bg-white"
                                  >
                                    <td className="px-4 py-2">{nombre}</td>
                                    <td className="px-4 py-2">{qty}</td>
                                    <td className="px-4 py-2">
                                      {formatPrice(unit)
                                        .replace("CLP", "")
                                        .trim()}
                                    </td>
                                    <td className="px-4 py-2 font-medium">
                                      {formatPrice(sub)
                                        .replace("CLP", "")
                                        .trim()}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        <div className="pt-2 text-right border-t">
                          <span className="text-xs text-gray-500">
                            Total calculado: {formatPrice(o.total_price)}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Cambiar estado dentro del detalle */}
                    <div className="px-4 pb-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">
                        Actualizar estado
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {[
                          "Pendiente",
                          "Pagado",
                          "en preparación",
                          "listo para retiro",
                          "entregado",
                          "cancelado",
                        ].map((estado) => (
                          <button
                            key={estado}
                            onClick={() => handleUpdateEstado(o.id, estado)}
                            disabled={o.order_status === estado}
                            className={`px-3 py-1.5 text-xs rounded-md font-medium transition ${o.order_status === estado
                              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                              : "bg-blue-600 text-white hover:bg-blue-700"
                              }`}
                          >
                            {getEstadoIcon(estado)} {getEstadoLabel(estado)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default OrderManager;
