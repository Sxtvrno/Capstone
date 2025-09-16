import { Link } from "react-router-dom";

const Sidebar = ({ onLogout }) => {
  return (
    <aside className="w-64 bg-black text-white flex flex-col items-stretch p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold">Menú</h2>
      </div>
      <nav className="flex flex-col gap-4 flex-1">
        <Link to="/" className="hover:bg-gray-800 rounded px-3 py-2">Inicio</Link>
        <Link to="/productos" className="hover:bg-gray-800 rounded px-3 py-2">Productos</Link>
        <a href="#" className="hover:bg-gray-800 rounded px-3 py-2">Media</a>
        <button
          onClick={onLogout}
          className="hover:bg-gray-800 rounded px-3 py-2 text-left w-full"
          type="button"
        >
          Cerrar Sesión
        </button>
      </nav>
      <div className="mt-auto text-xs text-gray-400">© 2025 Tu Empresa</div>
    </aside>
  );
};

export default Sidebar;