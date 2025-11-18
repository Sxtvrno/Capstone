import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { transbankAPI } from "../services/api";
import { useCart } from "../contexts/CartContext"; // <-- añadido

export default function PaymentReturn() {
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const { clearCart } = useCart(); // <-- añadido
  const [status, setStatus] = useState("Procesando pago...");
  const [error, setError] = useState("");

  useEffect(() => {
    const tokenWs = search.get("token_ws");
    if (!tokenWs) {
      setError("Token de pago no recibido");
      return;
    }
    (async () => {
      try {
        const resp = await transbankAPI.confirmTransaction(tokenWs);
        if (resp?.status === "APPROVED" || resp?.status === "success") {
          // Vaciar carrito tras pago aprobado
          const sessionId = localStorage.getItem("cart.sessionId") || undefined;
          await clearCart(sessionId);
          setStatus("Pago aprobado. ¡Gracias por tu compra!");
          setTimeout(() => navigate("/"), 1500);
        } else if (resp?.status === "rejected") {
          setStatus("Pago rechazado");
        } else {
          setStatus("Pago procesado");
        }
      } catch (e) {
        setError(e.message || "Error al confirmar pago");
      }
    })();
  }, [search, navigate, clearCart]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white shadow rounded-lg p-6 text-center">
        {error ? (
          <>
            <h1 className="text-xl font-semibold text-red-600 mb-2">Error</h1>
            <p className="text-gray-700">{error}</p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold mb-2">{status}</h1>
            <p className="text-gray-600">No cierres esta ventana.</p>
          </>
        )}
      </div>
    </div>
  );
}
