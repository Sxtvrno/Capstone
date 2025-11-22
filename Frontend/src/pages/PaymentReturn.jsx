import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { transbankAPI, orderAPI } from "../services/api";
import { useCart } from "../contexts/CartContext";

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
  const processedRef = useRef(false);

  const tokenWs = search.get("token_ws");

  function extractPedidoIdFromBuyOrder(buyOrder) {
    if (!buyOrder) return null;
    const m = String(buyOrder).match(/^O(\d+)/);
    if (!m) return null;
    const val = parseInt(m[1], 10);
    // si parece un timestamp (muy grande), ignorar
    if (val > 1_000_000_000) return null;
    return val;
  }

  function readPedidoIdFallbacks(resp) {
    const fromQuery = Number(search.get("pedido_id")) || null;
    if (fromQuery) return fromQuery;
    // prioridad: respuesta explícita del backend
    if (resp?.pedido_id) return Number(resp.pedido_id);
    // buy_order sólo si no es un timestamp
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
    if (processedRef.current) return; // evitar re-procesar
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

        // Pago aprobado
        clearCart();
        setStatus("Pago aprobado. Cargando boleta...");

        // Intentar obtener pedido id desde varios lugares
        let pedidoId = readPedidoIdFallbacks(resp);

        if (!pedidoId) {
          // si el backend devolvió token->pedido_id en la confirmación, podría venir en resp.meta
          if (resp?.meta?.pedido_id) pedidoId = Number(resp.meta.pedido_id);
        }

        if (!pedidoId) {
          setStatus("Pago aprobado (pedido no identificado)");
          setError(
            "No se pudo identificar el pedido. Si el pago fue procesado, contacta soporte."
          );
          return;
        }

        // Obtener pedido del backend y normalizar
        try {
          setLoadingOrder(true);
          const pedidoResp = await orderAPI.getById(pedidoId);

          const total_price = Number(pedidoResp.total_price ?? 0);

          const normalized = {
            id: pedidoResp.id,
            cliente_id: pedidoResp.cliente_id,
            cliente_email: pedidoResp.cliente_email,
            cliente_first_name: pedidoResp.cliente_first_name,
            cliente_last_name: pedidoResp.cliente_last_name,
            created_at: pedidoResp.created_at,
            order_status: pedidoResp.order_status,
            shipping_address: pedidoResp.shipping_address,
            total_price,
          };

          setOrder(normalized);
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
    // Ejecutar solo cuando cambie tokenWs
  }, [tokenWs, clearCart]);

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

  const renderBoleta = () => {
    if (!order) return null;
    return (
      <div className="p-4 border rounded bg-gray-50">
        <header className="mb-4">
          <h2 className="text-xl font-bold">Boleta / Pedido #{order.id}</h2>
          <div className="text-sm text-gray-600">
            <div>
              Fecha:{" "}
              {order.created_at
                ? new Date(order.created_at).toLocaleString()
                : "—"}
            </div>
            <div>Estado: {order.order_status}</div>
            <div>Dirección envío: {order.shipping_address ?? "—"}</div>
          </div>
        </header>

        <section className="mb-4">
          <h3 className="font-medium">Cliente</h3>
          <p className="text-sm text-gray-700">
            {order.cliente_first_name ?? ""} {order.cliente_last_name ?? ""}{" "}
            <span className="text-gray-500">
              ({order.cliente_email ?? "—"})
            </span>
          </p>
        </section>

        <section className="mb-4">
          <h3 className="font-medium">Resumen</h3>
          <p className="text-sm text-gray-700">
            Total: ${Number(order.total_price ?? 0).toFixed(2)}
          </p>
        </section>

        <footer className="mt-4 flex items-center justify-between">
          <div className="text-xs text-gray-500">Gracias por su compra.</div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.print()}
              className="bg-gray-200 px-3 py-2 rounded"
            >
              Imprimir boleta
            </button>
            <button
              onClick={handleSendBoleta}
              disabled={sendingEmail || !order.cliente_email}
              className="bg-blue-600 text-white px-3 py-2 rounded disabled:opacity-60"
            >
              {sendingEmail ? "Enviando..." : "Enviar boleta por correo"}
            </button>
          </div>
        </footer>

        {emailResult && <p className="mt-3 text-sm">{emailResult}</p>}
      </div>
    );
  };

  return (
    <div className="min-h-[50vh] flex items-center justify-center px-4">
      <div className="max-w-3xl w-full bg-white shadow rounded-lg p-6">
        {error ? (
          <>
            <h1 className="text-xl font-semibold text-red-600 mb-2">Error</h1>
            <p className="text-gray-700">{error}</p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold mb-2">{status}</h1>
            <p className="text-gray-600 mb-4">No cierres esta ventana.</p>

            {loadingOrder && <p>Cargando boleta...</p>}

            {order
              ? renderBoleta()
              : !loadingOrder && (
                  <div className="mt-4 text-center">
                    <p className="text-gray-600">
                      Si el pago fue aprobado, tu boleta aparecerá aquí en unos
                      segundos.
                    </p>
                    <button
                      onClick={() => navigate("/")}
                      className="mt-3 bg-gray-200 px-4 py-2 rounded"
                    >
                      Volver al inicio
                    </button>
                  </div>
                )}
          </>
        )}
      </div>
    </div>
  );
}
