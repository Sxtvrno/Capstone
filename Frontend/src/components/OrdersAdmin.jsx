import React, { useEffect, useState, useCallback } from "react";
import { orderAPI } from "../services/api";

function OrdersAdmin() {
  const [pedidos, setPedidos] = useState([]);
  const [filtrados, setFiltrados] = useState([]);
  const [estadoFiltro, setEstadoFiltro] = useState("todos");
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState({});

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await orderAPI.adminGetAll();
      const arr = Array.isArray(data) ? data : data?.pedidos || [];
      setPedidos(arr);
    } catch (e) {
      setError(e.message || "Error al cargar pedidos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Normalizar pedidos para filtrado consistente
  const normalizados = pedidos.map((p) => {
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
          `Cliente #${cliente_id}`;

    const estado = (p.order_status || "creado").trim();
    const fecha = p.created_at ? new Date(p.created_at) : null;
    const updated = p.updated_at ? new Date(p.updated_at) : null;
    const address = p.shipping_address || "Sin dirección";
    const items = Array.isArray(p.items) ? p.items : [];
    const total = Number(p.total_price ?? 0);

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
  });

  useEffect(() => {
    let base = normalizados;
    if (estadoFiltro !== "todos") {
      base = base.filter(
        (p) => p.estado.toLowerCase() === estadoFiltro.toLowerCase()
      );
    }
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      base = base.filter(
        (p) =>
          String(p.id).includes(q) ||
          p.nombreCliente.toLowerCase().includes(q) ||
          p.estado.toLowerCase().includes(q)
      );
    }
    setFiltrados(base);
  }, [estadoFiltro, busqueda, pedidos]);

  const toggleExpand = (id) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const estadosEncontrados = Array.from(
    new Set(normalizados.map((p) => p.estado).filter(Boolean))
  );

  const formatFecha = (d) =>
    d
      ? d.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })
      : "—";

  const badgeClase = (estado) => {
    const e = estado.toLowerCase();
    if (e.includes("crea")) return "bg-blue-100 text-blue-700";
    if (e.includes("pend")) return "bg-yellow-100 text-yellow-700";
    if (e.includes("env") || e.includes("ship"))
      return "bg-indigo-100 text-indigo-700";
    if (e.includes("comp") || e.includes("entreg"))
      return "bg-green-100 text-green-700";
    if (e.includes("canc") || e.includes("rech"))
      return "bg-red-100 text-red-700";
    return "bg-gray-100 text-gray-700";
  };

  return (
    <div className="p-4 md:p-6">
      {/* Filtros */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-semibold text-gray-800">
            Pedidos
          </h2>
          <p className="text-gray-500 text-sm">
            Gestión y detalle de los pedidos recibidos
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Buscar por ID, cliente o estado"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-60"
          />
          <select
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-44"
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

      {loading && (
        <div className="flex justify-center py-16">
          <div className="animate-spin h-12 w-12 rounded-full border-4 border-blue-500 border-t-transparent" />
        </div>
      )}

      {error && !loading && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      {!loading && !error && filtrados.length === 0 && (
        <div className="text-center py-12 border rounded-lg bg-white">
          <p className="text-gray-500 mb-2">No hay pedidos que coincidan.</p>
          <button
            onClick={() => {
              setBusqueda("");
              setEstadoFiltro("todos");
            }}
            className="text-sm text-blue-600 hover:underline"
          >
            Limpiar filtros
          </button>
        </div>
      )}

      {!loading && !error && filtrados.length > 0 && (
        <div className="space-y-4">
          {filtrados.map((p) => (
            <div
              key={p.id}
              className="border border-gray-200 bg-white rounded-lg shadow-sm"
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
                  <p className="text-sm text-gray-600">
                    Estado:{" "}
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${badgeClase(
                        p.estado
                      )}`}
                    >
                      {p.estado}
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Total</p>
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
                    {expanded[p.id] ? "Ocultar" : "Ver detalles"}
                  </button>
                </div>
              </div>

              {expanded[p.id] && (
                <div className="border-t bg-gray-50">
                  <div className="p-4 text-sm text-gray-700 space-y-2">
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
                      <span className="text-gray-600">{p.cliente_id}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-800">
                        Correo Cliente:{" "}
                      </span>
                      <span className="text-gray-600">
                        {p.cliente_email || "—"}
                      </span>
                    </div>
                  </div>
                  {/* Items (si existen) */}
                  {p.items.length === 0 && (
                    <p className="px-4 pb-4 text-sm text-gray-500">
                      Sin items (ver tabla detalle de items aparte).
                    </p>
                  )}

                  {p.items.length > 0 && (
                    <div className="p-4 space-y-3">
                      {/* Vista responsive tipo lista en móviles */}
                      <div className="grid gap-3 sm:hidden">
                        {p.items.map((it, idx) => {
                          const nombre =
                            it.nombre ||
                            it.producto?.nombre ||
                            it.product?.name ||
                            it.name ||
                            `Item ${idx + 1}`;
                          const qty = it.cantidad || it.qty || it.quantity || 1;
                          const unit =
                            it.precio_unitario ||
                            it.price_unit ||
                            it.price ||
                            it.unit_price ||
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

                      {/* Tabla en pantallas medianas+ */}
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
                            {p.items.map((it, idx) => {
                              const nombre =
                                it.nombre ||
                                it.producto?.nombre ||
                                it.product?.name ||
                                it.name ||
                                `Item ${idx + 1}`;
                              const qty =
                                it.cantidad || it.qty || it.quantity || 1;
                              const unit =
                                it.precio_unitario ||
                                it.price_unit ||
                                it.price ||
                                it.unit_price ||
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
                          Total calculado: $
                          {Number(p.total || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default OrdersAdmin;
