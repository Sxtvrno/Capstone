import React from "react";

const Verificationpage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8 text-center">
        {/* Icono de verificación */}
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
          <svg
            className="h-10 w-10 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M5 13l4 4L19 7"
            ></path>
          </svg>
        </div>

        {/* Título */}
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          ¡Correo Verificado!
        </h1>

        {/* Mensaje */}
        <p className="text-gray-600 mb-8">
          Tu dirección de correo electrónico ha sido verificada exitosamente. Ya
          puedes acceder a todas las funcionalidades de tu cuenta.
        </p>

        {/* Botón de acción */}
        <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 ease-in-out transform hover:scale-105">
          Ir al inicio
        </button>
      </div>
    </div>
  );
};

export default Verificationpage;
