import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { transbankAPI, orderAPI } from "../services/api";
import { useCart } from "../contexts/CartContext";

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
  if (it.producto_id) return `Producto #${it.producto_id}`;
  return `Item ${idx + 1}`;
}

function badgeClase(estado) {
  if (!estado) return "bg-gray-100 text-gray-700";
  const e = estado.toLowerCase();
  if (e.includes("crea")) return "bg-blue-100 text-blue-700";
  if (e.includes("pend")) return "bg-yellow-100 text-yellow-700";
  if (e.includes("prep")) return "bg-indigo-100 text-indigo-700";
  if (e.includes("env") || e.includes("ship"))
    return "bg-purple-100 text-purple-700";
  if (e.includes("entreg") || e.includes("comp") || e.includes("pag"))
    return "bg-green-100 text-green-700";
  if (e.includes("canc") || e.includes("rech"))
    return "bg-red-100 text-red-700";
  return "bg-gray-100 text-gray-700";
}

export default function PaymentReturn() {
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const { clearCart } = useCart();
  const [status, setStatus] = useState("Procesando pago...");
  const [error, setError] = useState("");
  const [order, setOrder] = useState(null);
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailResult, setEmailResult] = useState("");
  const [showItems, setShowItems] = useState(true);
  const processedRef = useRef(false);

  const tokenWs = search.get("token_ws");

  function extractPedidoIdFromBuyOrder(buyOrder) {
    if (!buyOrder) return null;
    const m = String(buyOrder).match(/^O(\d+)/);
    if (!m) return null;
    const val = parseInt(m[1], 10);
    if (val > 1_000_000_000) return null;
    return val;
  }

  function readPedidoIdFallbacks(resp) {
    const fromQuery = Number(search.get("pedido_id")) || null;
    if (fromQuery) return fromQuery;
    if (resp?.pedido_id) return Number(resp.pedido_id);
    const fromBuy = extractPedidoIdFromBuyOrder(resp?.buy_order);
    if (fromBuy) return fromBuy;
    const stored = Number(localStorage.getItem("tbk_last_pedido_id")) || null;
    if (stored) return stored;
    return null;
  }

  useEffect(() => {
    if (!tokenWs) {
      setError("Token de pago no recibido");
      setStatus("Error");
      return;
    }
    if (processedRef.current) return;
    processedRef.current = true;

    (async () => {
      try {
        const resp = await transbankAPI.confirmTransaction(tokenWs);
        const okStatus =
          resp?.status === "APPROVED" ||
          resp?.status === "success" ||
          resp?.status === "AUTHORIZED";
        if (!okStatus) {
          if (resp?.status === "rejected") setStatus("Pago rechazado");
          else setStatus("Pago procesado");
          return;
        }
        clearCart();
        setStatus("Pago aprobado. Cargando boleta...");
        let pedidoId = readPedidoIdFallbacks(resp);
        if (!pedidoId && resp?.meta?.pedido_id)
          pedidoId = Number(resp.meta.pedido_id);
        if (!pedidoId) {
          setStatus("Pago aprobado (pedido no identificado)");
          setError(
            "No se pudo identificar el pedido. Si el pago fue procesado, contacta soporte."
          );
          return;
        }
        try {
          setLoadingOrder(true);
          const pedidoResp = await orderAPI.getById(pedidoId);
          const total_price = Number(pedidoResp.total_price ?? 0);
          const items = Array.isArray(pedidoResp.items) ? pedidoResp.items : [];
          setOrder({
            id: pedidoResp.id,
            cliente_id: pedidoResp.cliente_id,
            cliente_email: pedidoResp.cliente_email,
            cliente_first_name: pedidoResp.cliente_first_name,
            cliente_last_name: pedidoResp.cliente_last_name,
            created_at: pedidoResp.created_at,
            order_status: pedidoResp.order_status,
            shipping_address: pedidoResp.shipping_address,
            total_price,
            items,
          });
          setStatus("Boleta cargada");
        } catch (err) {
          setError("Pago confirmado pero no se pudo cargar la boleta.");
          setStatus("Pago aprobado");
        } finally {
          setLoadingOrder(false);
        }
      } catch (e) {
        setError(e?.message || "Error al confirmar pago");
        setStatus("Error");
      }
    })();
  }, [tokenWs, clearCart, search]);

  const handleSendBoleta = async () => {
    if (!order?.id) return;
    setSendingEmail(true);
    setEmailResult("");
    try {
      await orderAPI.sendReceipt(order.id);
      setEmailResult("Boleta enviada por correo.");
    } catch (e) {
      setEmailResult(
        "Error al enviar boleta: " + (e?.message || "desconocido")
      );
    } finally {
      setSendingEmail(false);
    }
  };

  const renderItems = () => {
    if (!order?.items?.length) {
      return (
        <p className="px-4 pb-4 text-sm text-gray-500">
          Sin items para mostrar.
        </p>
      );
    }
    return (
      <div className="p-4 space-y-4">
        {/* Lista móvil */}
        <div className="grid gap-3 sm:hidden">
          {order.items.map((it, idx) => {
            const nombre = getNombreItem(it, idx);
            const qty =
              it.cantidad || it.qty || it.quantity || it.quantity || 1;
            const unit =
              it.precio_unitario ||
              it.price_unit ||
              it.price ||
              it.unit_price ||
              it.unitPrice ||
              it.unit ||
              0;
            const sub = Number(unit) * Number(qty);
            return (
              <div
                key={idx}
                className="bg-white rounded-md border border-gray-200 p-3 flex justify-between items-center"
              >
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-gray-800">{nombre}</p>
                  <p className="text-xs text-gray-500">
                    Cant: {qty} • Unit: ${Number(unit).toLocaleString()}
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
                <th className="text-left px-4 py-2 font-medium">Producto</th>
                <th className="text-left px-4 py-2 font-medium">Cantidad</th>
                <th className="text-left px-4 py-2 font-medium">Unit.</th>
                <th className="text-left px-4 py-2 font-medium">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((it, idx) => {
                const nombre = getNombreItem(it, idx);
                const qty =
                  it.cantidad || it.qty || it.quantity || it.quantity || 1;
                const unit =
                  it.precio_unitario ||
                  it.price_unit ||
                  it.price ||
                  it.unit_price ||
                  it.unitPrice ||
                  it.unit ||
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
            Total items: ${Number(order.total_price || 0).toLocaleString()}
          </span>
        </div>
      </div>
    );
  };

  const renderBoleta = () => {
    if (!order) return null;
    return (
      <div className="border rounded-lg bg-gray-50 overflow-hidden">
        <div className="p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-xl font-semibold text-gray-800">
              Boleta / Pedido #{order.id}
            </h2>
            <span
              className={`inline-block px-2 py-1 rounded text-xs font-medium ${badgeClase(
                order.order_status || ""
              )}`}
            >
              {order.order_status}
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 text-sm text-gray-700">
            <div>
              <span className="font-medium text-gray-800">Fecha: </span>
              <span className="text-gray-600">
                {order.created_at
                  ? new Date(order.created_at).toLocaleString()
                  : "—"}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-800">
                Dirección envío:{" "}
              </span>
              <span className="text-gray-600">
                {order.shipping_address || "—"}
              </span>
            </div>
            <div className="sm:col-span-2">
              <span className="font-medium text-gray-800">Cliente: </span>
              <span className="text-gray-600">
                {order.cliente_first_name || ""} {order.cliente_last_name || ""}{" "}
                <span className="text-gray-500">
                  ({order.cliente_email || "—"})
                </span>
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-800">Items: </span>
              <span className="text-gray-600">{order.items?.length || 0}</span>
            </div>
            <div>
              <span className="font-medium text-gray-800">Total: </span>
              <span className="text-gray-900 font-semibold">
                ${Number(order.total_price || 0).toLocaleString()}
              </span>
            </div>
          </div>
          <div>
            <button
              onClick={() => setShowItems((v) => !v)}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {showItems ? "Ocultar detalles" : "Ver detalles"}
            </button>
          </div>
        </div>

        {showItems && <div className="border-t bg-white">{renderItems()}</div>}

        <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t bg-gray-50">
          <div className="text-xs text-gray-500">Gracias por su compra.</div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => window.print()}
              className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md text-sm font-medium transition"
            >
              Imprimir
            </button>
            <button
              onClick={handleSendBoleta}
              disabled={sendingEmail || !order.cliente_email}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition disabled:opacity-60"
            >
              {sendingEmail ? "Enviando..." : "Enviar por correo"}
            </button>
            <button
              onClick={() => navigate("/")}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm font-medium transition"
            >
              Ir al inicio
            </button>
          </div>
        </div>
        {emailResult && (
          <p className="px-5 pb-4 text-sm text-gray-700">{emailResult}</p>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-[55vh] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-4xl">
        <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-6 space-y-4">
          {error ? (
            <>
              <h1 className="text-xl font-semibold text-red-600 mb-2">Error</h1>
              <p className="text-gray-700">{error}</p>
              <button
                onClick={() => navigate("/")}
                className="mt-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm"
              >
                Volver
              </button>
            </>
          ) : (
            <>
              <h1 className="text-xl font-semibold">{status}</h1>
              <p className="text-gray-600 text-sm">
                No cierres esta ventana hasta finalizar.
              </p>
              {loadingOrder && (
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full" />
                  Cargando boleta...
                </div>
              )}
              {order
                ? renderBoleta()
                : !loadingOrder && (
                    <div className="mt-6 text-center">
                      <p className="text-gray-600 text-sm mb-3">
                        Si el pago fue aprobado, tu boleta aparecerá aquí en
                        unos segundos.
                      </p>
                      <button
                        onClick={() => navigate("/")}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm"
                      >
                        Volver al inicio
                      </button>
                    </div>
                  )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
