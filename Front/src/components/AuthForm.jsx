import React, { useState } from "react";
import { login, register } from "../services/api";

const AuthForm = ({ onAuth }) => {
  // Login states
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  // Register states
  const [email, setEmail] = useState("");
  const [first_name, setFirstName] = useState("");
  const [last_name, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isLogin) {
        await login(username, password);
        onAuth();
      } else {
        await register(email, password, first_name, last_name, phone, address);
        setIsLogin(true);
      }
      setError("");
    } catch (err) {
      setError("Error en la autenticación");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
          {isLogin ? "Iniciar Sesión" : "Registrarse"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {isLogin ? (
            <>
              <input
                type="text"
                placeholder="Usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <input
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </>
          ) : (
            <>
              <input
                type="email"
                placeholder="Correo electrónico"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <input
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <input
                type="text"
                placeholder="Nombre"
                value={first_name}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <input
                type="text"
                placeholder="Apellido"
                value={last_name}
                onChange={(e) => setLastName(e.target.value)}
                required
                className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <input
                type="text"
                placeholder="Teléfono"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <input
                type="text"
                placeholder="Dirección"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
                className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </>
          )}
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition-colors font-semibold"
          >
            {isLogin ? "Login" : "Register"}
          </button>
        </form>
        <button
          onClick={() => setIsLogin(!isLogin)}
          className="w-full mt-4 text-blue-600 hover:underline"
        >
          {isLogin
            ? "¿No tienes cuenta? Regístrate"
            : "¿Ya tienes cuenta? Inicia sesión"}
        </button>
        {error && <p className="mt-4 text-red-500 text-center">{error}</p>}
      </div>
    </div>
  );
};

export default AuthForm;
