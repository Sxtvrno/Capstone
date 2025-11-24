import React, { useEffect, useState, useCallback, useMemo } from "react";
import { orderAPI, ordersAPI, authAPI } from "../services/api";

const ESTADOS_SUGERIDOS = [
  "creado",
  "en preparación",
  "listo para retiro",
  "entregado",
  "cancelado",
];

// Nueva función para nombre de item
function getNombreItem(it, idx) {
  const candidatos = [
    it.nombre,
    it.product_name,
    it.producto_nombre,
    it.nombre_producto,
    it.nombreProducto,
    it.producto?.nombre,
    it.producto?.title,
    it.product?.nombre,
    it.product?.name,
    it.product?.title,
    it.productTitle,
    it.product_title,
    it.title,
    it.titulo,
    it.titulo_producto,
    it.name,
    it.descripcion,
    it.description,
  ];
  for (const c of candidatos) {
    if (typeof c === "string" && c.trim()) return c.trim();
  }
  if (it.producto?.id) return `Producto #${it.producto.id}`;
  if (it.product?.id) return `Producto #${it.product.id}`;
  if (it.product_id) return `Producto #${it.product_id}`;
  return `Item ${idx + 1}`;
}

function OrderManager({ isAdmin: propIsAdmin = null }) {
  const isAdmin = propIsAdmin !== null ? propIsAdmin : authAPI.isAdmin();

  const [orders, setOrders] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("todos");
  const [loading, setLoading] = useState(true);
  const [updatingMap, setUpdatingMap] = useState({});
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [toast, setToast] = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = isAdmin
        ? await orderAPI.adminGetAll()
        : await orderAPI.clientGetAll();
      const arr = Array.isArray(data)
        ? data
        : data?.pedidos || data?.orders || [];
      setOrders(arr);
    } catch (e) {
      setError(e.message || "Error al cargar pedidos");
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Normalización
  const normalizados = useMemo(
    () =>
      orders.map((p) => {
        const clienteObj = p.cliente || p.customer || p.user;
        const cliente_id = p.cliente_id || clienteObj?.id;
        const cliente_email =
          clienteObj?.email || p.cliente_email || p.email || null;

        const nombreClienteParts = [
          clienteObj?.first_name,
          clienteObj?.last_name,
        ].filter(Boolean);

        const nombreCliente =
          nombreClienteParts.length > 0
            ? nombreClienteParts.join(" ")
            : clienteObj?.first_name ||
            clienteObj?.last_name ||
            cliente_email ||
            (cliente_id ? `Cliente #${cliente_id}` : "Cliente");

        const estado = (p.order_status || p.estado || "creado").trim();
        const fecha = p.created_at ? new Date(p.created_at) : null;
        const updated = p.updated_at ? new Date(p.updated_at) : null;
        const address =
          p.shipping_address ||
          p.direccion_envio ||
          p.address ||
          "Sin dirección";
        const items = Array.isArray(p.items) ? p.items : [];
        const total = Number(p.total_price ?? p.total ?? 0);

        return {
          original: p,
          id: p.id,
          cliente: clienteObj,
          cliente_id,
          cliente_email,
          nombreCliente,
          estado,
          fecha,
          updated,
          address,
          items,
          total,
        };
      }),
    [orders]
  );

  // Filtros
  useEffect(() => {
    let base = normalizados;
    if (estadoFiltro !== "todos") {
      base = base.filter(
        (p) => p.estado.toLowerCase() === estadoFiltro.toLowerCase()
      );
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      base = base.filter(
        (p) =>
          String(p.id).includes(q) ||
          p.nombreCliente.toLowerCase().includes(q) ||
          p.estado.toLowerCase().includes(q)
      );
    }
    setFiltered(base);
  }, [estadoFiltro, search, normalizados]);

  const estadosEncontrados = useMemo(
    () =>
      Array.from(new Set(normalizados.map((p) => p.estado).filter(Boolean))),
    [normalizados]
  );

  const toggleExpand = (id) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const formatFecha = (d) =>
    d
      ? d.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })
      : "—";

  const badgeClase = (estado) => {
    const e = estado.toLowerCase();
    if (e === "creado") return "bg-blue-100 text-blue-700";
    if (e === "en preparación" || e === "en preparacion")
      return "bg-yellow-100 text-yellow-700";
    if (e === "listo para retiro") return "bg-purple-100 text-purple-700";
    if (e === "entregado") return "bg-green-100 text-green-700";
    if (e === "cancelado") return "bg-red-100 text-red-700";
    return "bg-gray-100 text-gray-700";
  };

  const actualizarEstado = async (id, nuevo) => {
    if (!isAdmin) return;
    setUpdatingMap((prev) => ({ ...prev, [id]: true }));
    try {
      await ordersAPI.updateStatus(id, nuevo);
      setToast({
        type: "success",
        msg: `Pedido #${id} actualizado a ${nuevo}`,
      });
      // Actualizar en memoria
      setOrders((prev) =>
        prev.map((o) =>
          o.id === id
            ? {
              ...o,
              order_status: nuevo,
              estado: nuevo,
              updated_at: new Date().toISOString(),
            }
            : o
        )
      );
    } catch (e) {
      setToast({
        type: "error",
        msg: e.message || "Error al actualizar estado",
      });
    } finally {
      setUpdatingMap((prev) => ({ ...prev, [id]: false }));
    }
  };

  const enviarBoleta = async (id) => {
    setUpdatingMap((prev) => ({ ...prev, [`receipt-${id}`]: true }));
    try {
      await orderAPI.sendReceipt(id);
      setToast({ type: "success", msg: `Boleta enviada para pedido #${id}` });
    } catch (e) {
      setToast({
        type: "error",
        msg: e.message || "Error enviando boleta",
      });
    } finally {
      setUpdatingMap((prev) => ({ ...prev, [`receipt-${id}`]: false }));
    }
  };

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3200);
      return () => clearTimeout(t);
    }
  }, [toast]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-semibold text-gray-800">
            {isAdmin ? "Gestión de Pedidos" : "Mis Pedidos"}
          </h2>
          <p className="text-gray-500 text-sm">
            {isAdmin
              ? "Administra y revisa el detalle de los pedidos."
              : "Historial de tus compras."}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Buscar por ID, cliente o estado"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
          />
          <select
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-48"
          >
            <option value="todos">Todos los estados</option>
            {estadosEncontrados.map((est) => (
              <option key={est} value={est}>
                {est}
              </option>
            ))}
          </select>
          <button
            onClick={cargar}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg shadow-sm transition w-full sm:w-auto"
          >
            Recargar
          </button>
        </div>
      </div>

      {toast && (
        <div
          className={`rounded-lg px-4 py-3 text-sm shadow-sm flex items-start gap-2 max-w-md ${toast.type === "success"
            ? "bg-green-50 border border-green-200 text-green-700"
            : "bg-red-50 border border-red-200 text-red-700"
            }`}
        >
          <span className="font-medium">
            {toast.type === "success" ? "OK" : "Error"}:
          </span>
          <span>{toast.msg}</span>
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-20">
          <div className="animate-spin h-14 w-14 rounded-full border-4 border-blue-500 border-t-transparent" />
        </div>
      )}

      {error && !loading && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
          {error}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-14 border rounded-lg bg-white">
          <p className="text-gray-500 mb-3">Sin pedidos que coincidan.</p>
          <button
            onClick={() => {
              setSearch("");
              setEstadoFiltro("todos");
            }}
            className="text-sm text-blue-600 hover:underline"
          >
            Limpiar filtros
          </button>
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="space-y-4">
          {filtered.map((p) => {
            const isUpdating = updatingMap[p.id];
            return (
              <div
                key={p.id}
                className="border border-gray-200 bg-white rounded-lg shadow-sm transition hover:shadow-md"
              >
                <div className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">
                      Pedido #{p.id} • {formatFecha(p.fecha)}{" "}
                      {p.updated && (
                        <span className="text-xs text-gray-400">
                          (upd {formatFecha(p.updated)})
                        </span>
                      )}
                    </p>
                    <p className="font-medium text-gray-800">
                      Cliente: {p.nombreCliente}
                    </p>
                    <p className="text-sm text-gray-600 flex items-center gap-2 flex-wrap">
                      Estado:{" "}
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${badgeClase(
                          p.estado
                        )}`}
                      >
                        {p.estado}
                      </span>
                      {isAdmin && (
                        <select
                          disabled={!!isUpdating}
                          value={p.estado}
                          onChange={(e) =>
                            actualizarEstado(p.id, e.target.value)
                          }
                          className="text-xs border rounded px-2 py-1 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        >
                          {ESTADOS_SUGERIDOS.map((est) => (
                            <option key={est} value={est}>
                              {est}
                            </option>
                          ))}
                        </select>
                      )}
                      {isUpdating && (
                        <span className="text-xs text-blue-500 animate-pulse">
                          Actualizando...
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 md:gap-4">
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Total</p>
                      <p className="font-semibold text-gray-900">
                        $
                        {p.total.toLocaleString(undefined, {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        })}
                      </p>
                      <p className="text-xs text-gray-500">
                        {p.items.length} item{p.items.length !== 1 && "s"}
                      </p>
                    </div>
                    <button
                      onClick={() => toggleExpand(p.id)}
                      className="px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition"
                    >
                      {expanded[p.id] ? "Ocultar" : "Ver"}
                    </button>
                    {isAdmin && (
                      <button
                        disabled={!!updatingMap[`receipt-${p.id}`]}
                        onClick={() => enviarBoleta(p.id)}
                        title="Enviar boleta por correo"
                        className="px-3 py-2 text-sm bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg shadow-sm transition"
                      >
                        {updatingMap[`receipt-${p.id}`]
                          ? "Enviando..."
                          : "Boleta"}
                      </button>
                    )}
                  </div>
                </div>

                {expanded[p.id] && (
                  <div className="border-t bg-gray-50">
                    <div className="p-4 grid gap-2 text-sm text-gray-700 md:grid-cols-2">
                      <div>
                        <span className="font-medium text-gray-800">
                          Dirección envío:{" "}
                        </span>
                        <span className="text-gray-600">{p.address}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-800">
                          ID Cliente:{" "}
                        </span>
                        <span className="text-gray-600">
                          {p.cliente_id || "—"}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-800">
                          Correo Cliente:{" "}
                        </span>
                        <span className="text-gray-600">
                          {p.cliente_email || "—"}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-800">
                          Items:{" "}
                        </span>
                        <span className="text-gray-600">
                          {p.items.length || 0}
                        </span>
                      </div>
                    </div>

                    {p.items.length === 0 && (
                      <p className="px-4 pb-4 text-sm text-gray-500">
                        Sin items para mostrar.
                      </p>
                    )}

                    {p.items.length > 0 && (
                      <div className="p-4 space-y-4">
                        {/* Lista móvil */}
                        <div className="grid gap-3 sm:hidden">
                          {p.items.map((it, idx) => {
                            const nombre = getNombreItem(it, idx);
                            const qty =
                              it.cantidad || it.qty || it.quantity || 1;
                            const unit =
                              it.precio_unitario ||
                              it.price_unit ||
                              it.price ||
                              it.unit_price ||
                              it.unitPrice ||
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
                                    Cant: {qty} • Unit: $
                                    {Number(unit).toLocaleString()}
                                  </p>
                                </div>
                                <p className="text-sm font-semibold text-gray-900">
                                  ${sub.toLocaleString()}
                                </p>
                              </div>
                            );
                          })}
                        </div>

                        {/* Tabla desktop */}
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
                                  Unit.
                                </th>
                                <th className="text-left px-4 py-2 font-medium">
                                  Subtotal
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {p.items.map((it, idx) => {
                                const nombre = getNombreItem(it, idx);
                                const qty =
                                  it.cantidad || it.qty || it.quantity || 1;
                                const unit =
                                  it.precio_unitario ||
                                  it.price_unit ||
                                  it.price ||
                                  it.unit_price ||
                                  it.unitPrice ||
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
                                      ${Number(unit).toLocaleString()}
                                    </td>
                                    <td className="px-4 py-2 font-medium">
                                      ${sub.toLocaleString()}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        <div className="pt-2 text-right border-t">
                          <span className="text-xs text-gray-500">
                            Total: ${Number(p.total || 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    )}

                  </div >
                )
                }
              </div >
            );
          })}
        </div >
      )}
    </div >
  );
}

export default OrderManager;
