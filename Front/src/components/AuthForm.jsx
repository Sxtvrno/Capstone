import React, { useState } from "react";
import { login, register } from "../services/api";

const allowedDomains = [
  "gmail.com",
  "outlook.com",
  "hotmail.com",
  "yahoo.com",
  "live.com",
];

const emailDomainValid = (email) => {
  if (!email.includes("@")) return false;
  const domain = email.split("@").pop().toLowerCase();
  return allowedDomains.includes(domain);
};

const passwordValid = (pwd) => {
  // 8-16 chars, 1 upper, 1 lower, 1 digit, 1 special
  const re =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+={[}\]|:;"'<>,.?/]).{8,16}$/;
  return re.test(pwd);
};

const AuthForm = ({ onAuth }) => {
  // Login states
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  // Register states
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");
  const [first_name, setFirstName] = useState("");
  const [last_name, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  // Validaciones
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmError, setConfirmError] = useState("");

  // Checks dinámicos de contraseña
  const passwordChecks = {
    length: password.length >= 8 && password.length <= 16,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    digit: /\d/.test(password),
    special: /[!@#$%^&*()_\-+={[}\]|:;"'<>,.?/]/.test(password),
  };
  const allBaseChecks = Object.values(passwordChecks).every(Boolean);
  const match =
    password !== "" && confirmPassword !== "" && password === confirmPassword;

  const validateRegisterFields = () => {
    let ok = true;

    if (!emailDomainValid(email)) {
      setEmailError("Dominio no permitido. Usa: " + allowedDomains.join(", "));
      ok = false;
    } else setEmailError("");

    if (!passwordValid(password)) {
      setPasswordError(
        "Contraseña 8-16 caracteres, incluye mayúscula, minúscula, número y caracter especial."
      );
      ok = false;
    } else setPasswordError("");

    if (password !== confirmPassword) {
      setConfirmError("Las contraseñas no coinciden.");
      ok = false;
    } else setConfirmError("");

    return ok;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      if (isLogin) {
        await login(username, password);
        onAuth();
      } else {
        if (!validateRegisterFields()) return;

        const response = await register(
          email,
          password,
          first_name,
          last_name,
          phone,
          address
        );
        setIsLogin(true);
        setSuccess(
          response.mensaje ||
            "Registro exitoso. Revisa tu correo para verificar la cuenta."
        );
        // Limpiar campos
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        setFirstName("");
        setLastName("");
        setPhone("");
        setAddress("");
      }
    } catch {
      setError("Error en la autenticación");
    }
  };

  const handleEmailChange = (v) => {
    setEmail(v);
    if (!v) return setEmailError("");
    setEmailError(emailDomainValid(v) ? "" : "Dominio no permitido.");
  };

  const handlePasswordChange = (v) => {
    setPassword(v);
    if (!v) {
      setPasswordError("");
      setConfirmError(confirmPassword ? "Las contraseñas no coinciden." : "");
      return;
    }
    setPasswordError(
      passwordValid(v) ? "" : "Debe cumplir todos los requisitos."
    );
    if (confirmPassword) {
      setConfirmError(
        v === confirmPassword ? "" : "Las contraseñas no coinciden."
      );
    }
  };

  const handleConfirmChange = (v) => {
    setConfirmPassword(v);
    if (!v) return setConfirmError("");
    setConfirmError(v === password ? "" : "Las contraseñas no coinciden.");
  };

  const reqItem = (ok, text) => (
    <li
      key={text}
      className={`flex items-center gap-1 ${
        ok ? "text-green-600" : "text-gray-600"
      }`}
    >
      <span className="font-bold text-xs">{ok ? "✓" : "•"}</span>
      <span className="text-xs">{text}</span>
    </li>
  );

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
                onChange={(e) => handlePasswordChange(e.target.value)}
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
                onChange={(e) => handleEmailChange(e.target.value)}
                required
                className={`w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 ${
                  emailError
                    ? "border-red-400 focus:ring-red-400"
                    : "focus:ring-blue-400"
                }`}
              />
              {emailError && (
                <p className="text-xs text-red-500 -mt-2">{emailError}</p>
              )}
              <input
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                required
                className={`w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 ${
                  passwordError
                    ? "border-red-400 focus:ring-red-400"
                    : "focus:ring-blue-400"
                }`}
              />
              <input
                type="password"
                placeholder="Repetir contraseña"
                value={confirmPassword}
                onChange={(e) => handleConfirmChange(e.target.value)}
                required
                className={`w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 ${
                  confirmError
                    ? "border-red-400 focus:ring-red-400"
                    : "focus:ring-blue-400"
                }`}
              />
              {(passwordError || confirmError) && (
                <p className="text-xs text-red-500 -mt-2">
                  {confirmError || passwordError}
                </p>
              )}
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-xs font-semibold mb-1 text-gray-700">
                  Requisitos de contraseña:
                </p>
                <ul className="space-y-1">
                  {reqItem(passwordChecks.length, "Entre 8 y 16 caracteres")}
                  {reqItem(passwordChecks.upper, "Al menos 1 mayúscula")}
                  {reqItem(passwordChecks.lower, "Al menos 1 minúscula")}
                  {reqItem(passwordChecks.digit, "Al menos 1 número")}
                  {reqItem(
                    passwordChecks.special,
                    "Al menos 1 carácter especial"
                  )}
                  {reqItem(match, "Coinciden ambas contraseñas")}
                </ul>
              </div>
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
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition-colors font-semibold disabled:opacity-60"
            disabled={
              !isLogin &&
              (emailError ||
                passwordError ||
                confirmError ||
                !email ||
                !password ||
                !confirmPassword ||
                !allBaseChecks ||
                !match)
            }
          >
            {isLogin ? "Login" : "Register"}
          </button>
        </form>
        <button
          onClick={() => {
            setIsLogin(!isLogin);
            setError("");
            setSuccess("");
            setEmailError("");
            setPasswordError("");
            setConfirmError("");
            setPassword("");
            setConfirmPassword("");
          }}
          className="w-full mt-4 text-blue-600 hover:underline"
        >
          {isLogin
            ? "¿No tienes cuenta? Regístrate"
            : "¿Ya tienes cuenta? Inicia sesión"}
        </button>
        {error && <p className="mt-4 text-red-500 text-center">{error}</p>}
        {success && (
          <p className="mt-4 text-green-600 text-center">{success}</p>
        )}
      </div>
    </div>
  );
};

export default AuthForm;
