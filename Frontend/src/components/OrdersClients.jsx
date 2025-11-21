import React, { useCallback, useEffect, useState } from "react";
import { orderAPI, authAPI } from "../services/api";

function OrdersClients() {
  const [orders, setOrders] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const user = authAPI.getCurrentUser();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await orderAPI.clientGetAll();
      const arr = Array.isArray(res) ? res : res?.pedidos || [];
      setOrders(arr);
    } catch (e) {
      setError(e?.message || "Error al cargar pedidos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = (id) => setExpanded((s) => ({ ...s, [id]: !s[id] }));

  const formatDate = (d) =>
    d
      ? new Date(d).toLocaleString(undefined, {
          dateStyle: "short",
          timeStyle: "short",
        })
      : "—";

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-semibold text-gray-800">
            Mis Pedidos
          </h2>
          <p className="text-gray-500 text-sm">
            Historial y seguimiento de tus pedidos
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={load}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm shadow-sm"
          >
            Recargar
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-10 w-10 rounded-full border-4 border-blue-500 border-t-transparent" />
        </div>
      )}

      {!loading && error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
          {error}
        </div>
      )}

      {!loading && !error && orders.length === 0 && (
        <div className="text-center py-12 border rounded-lg bg-white">
          <p className="text-gray-500">No tienes pedidos registrados.</p>
        </div>
      )}

      {!loading && !error && orders.length > 0 && (
        <div className="space-y-4">
          {orders.map((o) => {
            const id = o.id;
            const fecha = o.created_at ? formatDate(o.created_at) : "—";
            const estado = o.order_status || o.orderStatus || "creado";
            const total = Number(o.total_price ?? 0).toFixed(2);
            const items = Array.isArray(o.items) ? o.items : [];
            const shipping = o.shipping_address || "Sin dirección";
            return (
              <div
                key={id}
                className="border border-gray-200 bg-white rounded-lg shadow-sm"
              >
                <div className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">
                      Pedido #{id} • {fecha}
                    </p>
                    <p className="font-medium text-gray-800">
                      {user?.first_name || user?.email || "Tú"}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                        {estado}
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Total</p>
                      <p className="font-semibold text-gray-900">
                        ${Number(total).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500">
                        {items.length} item{items.length !== 1 && "s"}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => toggle(id)}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg shadow-sm"
                      >
                        {expanded[id] ? "Ocultar" : "Ver detalles"}
                      </button>
                    </div>
                  </div>
                </div>

                {expanded[id] && (
                  <div className="border-t bg-gray-50">
                    <div className="p-4 text-sm text-gray-700 space-y-3">
                      <div>
                        <span className="font-medium text-gray-800">
                          Dirección de envío:{" "}
                        </span>
                        <span className="text-gray-600">{shipping}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-800">
                          ID Cliente:{" "}
                        </span>
                        <span className="text-gray-600">
                          {o.cliente_id ?? user?.id ?? "—"}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-800">
                          Correo:{" "}
                        </span>
                        <span className="text-gray-600">
                          {user?.email ?? o.cliente_email ?? "—"}
                        </span>
                      </div>
                    </div>

                    {items.length === 0 && (
                      <p className="p-4 text-sm text-gray-500">
                        Este pedido no tiene items listados.
                      </p>
                    )}

                    {items.length > 0 && (
                      <div className="p-4 space-y-3">
                        <div className="grid gap-3 sm:hidden">
                          {items.map((it, idx) => {
                            const name =
                              it.name ||
                              it.product?.name ||
                              it.nombre ||
                              `Item ${idx + 1}`;
                            const qty =
                              it.quantity || it.qty || it.cantidad || 1;
                            const unit = Number(
                              it.unit_price ??
                                it.price ??
                                it.precio_unitario ??
                                0
                            ).toFixed(2);
                            const sub = (Number(unit) * Number(qty)).toFixed(2);
                            return (
                              <div
                                key={idx}
                                className="bg-white rounded-md border border-gray-200 p-3 flex justify-between items-center"
                              >
                                <div className="space-y-0.5">
                                  <p className="text-sm font-medium text-gray-800">
                                    {name}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    Cant: {qty} • Unit: $
                                    {Number(unit).toLocaleString()}
                                  </p>
                                </div>
                                <p className="text-sm font-semibold text-gray-900">
                                  ${Number(sub).toLocaleString()}
                                </p>
                              </div>
                            );
                          })}
                        </div>

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
                              {items.map((it, idx) => {
                                const name =
                                  it.name ||
                                  it.product?.name ||
                                  it.nombre ||
                                  `Item ${idx + 1}`;
                                const qty =
                                  it.quantity || it.qty || it.cantidad || 1;
                                const unit = Number(
                                  it.unit_price ??
                                    it.price ??
                                    it.precio_unitario ??
                                    0
                                ).toFixed(2);
                                const sub = (
                                  Number(unit) * Number(qty)
                                ).toFixed(2);
                                return (
                                  <tr
                                    key={idx}
                                    className="border-t border-gray-200"
                                  >
                                    <td className="px-4 py-2">{name}</td>
                                    <td className="px-4 py-2">{qty}</td>
                                    <td className="px-4 py-2">
                                      ${Number(unit).toLocaleString()}
                                    </td>
                                    <td className="px-4 py-2 font-medium">
                                      ${Number(sub).toLocaleString()}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        <div className="pt-2 text-right border-t">
                          <span className="text-sm font-medium">Total: </span>
                          <span className="text-lg font-semibold text-gray-900">
                            ${Number(total).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    )}
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

export default OrdersClients;
