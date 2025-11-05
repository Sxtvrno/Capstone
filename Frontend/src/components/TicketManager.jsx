import React, { useState, useEffect } from "react";
import { ticketsAPI } from "../services/api";

function TicketManager() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [filter, setFilter] = useState("todos"); // todos, pendiente, en_proceso, resuelto, cerrado
  const [notasModal, setNotasModal] = useState(null);
  const [notas, setNotas] = useState("");

  useEffect(() => {
    fetchTickets();
  }, [filter]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ticketsAPI.getAll(filter === "todos" ? null : filter);
      setTickets(data);
    } catch (err) {
      console.error("Error al cargar tickets:", err);
      setError("Error al cargar los tickets de soporte");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEstado = async (ticketId, nuevoEstado) => {
    try {
      await ticketsAPI.updateEstado(ticketId, nuevoEstado);
      await fetchTickets();
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, estado: nuevoEstado });
      }
    } catch (err) {
      console.error("Error al actualizar estado:", err);
      alert("Error al actualizar el estado del ticket");
    }
  };

  const handleAddNotas = async () => {
    if (!notasModal || !notas.trim()) return;
    
    try {
      await ticketsAPI.addNotas(notasModal, notas);
      await fetchTickets();
      if (selectedTicket?.id === notasModal) {
        const updated = await ticketsAPI.getById(notasModal);
        setSelectedTicket(updated);
      }
      setNotasModal(null);
      setNotas("");
    } catch (err) {
      console.error("Error al agregar notas:", err);
      alert("Error al agregar notas al ticket");
    }
  };

  const getEstadoBadgeClass = (estado) => {
    const classes = {
      pendiente: "bg-yellow-100 text-yellow-800 border-yellow-200",
      en_proceso: "bg-blue-100 text-blue-800 border-blue-200",
      resuelto: "bg-green-100 text-green-800 border-green-200",
      cerrado: "bg-gray-100 text-gray-800 border-gray-200",
    };
    return classes[estado] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getEstadoLabel = (estado) => {
    const labels = {
      pendiente: "Pendiente",
      en_proceso: "En Proceso",
      resuelto: "Resuelto",
      cerrado: "Cerrado",
    };
    return labels[estado] || estado;
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
          onClick={fetchTickets}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Filtros */}
      <div className="mb-6 flex flex-wrap gap-2">
        {[
          { value: "todos", label: "Todos" },
          { value: "pendiente", label: "Pendientes" },
          { value: "en_proceso", label: "En Proceso" },
          { value: "resuelto", label: "Resueltos" },
          { value: "cerrado", label: "Cerrados" },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === f.value
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {tickets.length === 0 ? (
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
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
          <p className="text-lg font-medium">No hay tickets</p>
          <p className="text-sm">
            {filter === "todos"
              ? "No se han creado tickets de soporte"
              : `No hay tickets con estado "${getEstadoLabel(filter)}"`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {tickets.map((ticket) => (
            <div
              key={ticket.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedTicket(ticket)}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">
                    Ticket #{ticket.id}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {formatDate(ticket.fecha_creacion)}
                  </p>
                </div>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium border ${getEstadoBadgeClass(
                    ticket.estado
                  )}`}
                >
                  {getEstadoLabel(ticket.estado)}
                </span>
              </div>

              {/* Usuario */}
              {ticket.usuario_email && (
                <div className="mb-2 text-sm text-gray-600">
                  <span className="font-medium">Usuario:</span>{" "}
                  {ticket.usuario_email}
                </div>
              )}

              {/* Conversación preview */}
              <div className="mb-3">
                <p className="text-sm text-gray-700 line-clamp-2">
                  {ticket.conversacion || "Sin conversación registrada"}
                </p>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <div className="text-xs text-gray-500">
                  {ticket.fecha_resolucion
                    ? `Resuelto: ${formatDate(ticket.fecha_resolucion)}`
                    : "Sin resolver"}
                </div>
                {ticket.notas && (
                  <div className="flex items-center text-xs text-blue-600">
                    <svg
                      className="w-4 h-4 mr-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                      />
                    </svg>
                    Notas
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Detalles */}
      {selectedTicket && (
        <div
          className="fixed inset-0 backdrop-blur-sm bg-white/10 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedTicket(null)}
        >
          <div
            className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Ticket #{selectedTicket.id}
                </h2>
                <span
                  className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${getEstadoBadgeClass(
                    selectedTicket.estado
                  )}`}
                >
                  {getEstadoLabel(selectedTicket.estado)}
                </span>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
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
              {/* Información */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Creado:</span>
                  <p className="font-medium">
                    {formatDate(selectedTicket.fecha_creacion)}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Resuelto:</span>
                  <p className="font-medium">
                    {selectedTicket.fecha_resolucion
                      ? formatDate(selectedTicket.fecha_resolucion)
                      : "Pendiente"}
                  </p>
                </div>
                {selectedTicket.usuario_email && (
                  <div className="col-span-2">
                    <span className="text-gray-500">Usuario:</span>
                    <p className="font-medium">{selectedTicket.usuario_email}</p>
                  </div>
                )}
              </div>

              {/* Conversación */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Conversación
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap">
                  {selectedTicket.conversacion || "Sin conversación registrada"}
                </div>
              </div>

              {/* Notas */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">Notas Internas</h3>
                  <button
                    onClick={() => setNotasModal(selectedTicket.id)}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    + Agregar Nota
                  </button>
                </div>
                {selectedTicket.notas ? (
                  <div className="bg-blue-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap border border-blue-100">
                    {selectedTicket.notas}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">
                    No hay notas internas
                  </p>
                )}
              </div>

              {/* Acciones */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">
                  Cambiar Estado
                </h3>
                <div className="flex flex-wrap gap-2">
                  {["pendiente", "en_proceso", "resuelto", "cerrado"].map(
                    (estado) => (
                      <button
                        key={estado}
                        onClick={() =>
                          handleUpdateEstado(selectedTicket.id, estado)
                        }
                        disabled={selectedTicket.estado === estado}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          selectedTicket.estado === estado
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                            : "bg-blue-600 text-white hover:bg-blue-700"
                        }`}
                      >
                        {getEstadoLabel(estado)}
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Agregar Notas */}
      {notasModal && (
        <div
          className="fixed inset-0 backdrop-blur-sm bg-white/10 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setNotasModal(null);
            setNotas("");
          }}
        >
          <div
            className="bg-white rounded-lg max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Agregar Notas Internas
            </h3>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Escribe tus notas aquí..."
              className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleAddNotas}
                disabled={!notas.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Guardar
              </button>
              <button
                onClick={() => {
                  setNotasModal(null);
                  setNotas("");
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TicketManager;
