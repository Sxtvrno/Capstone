// hooks/useLocalStorage.js
import { useState, useEffect } from "react";

function useLocalStorage(key, initialValue) {
  // Obtener valor inicial desde localStorage o usar el valor por defecto
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error("Error reading from localStorage:", error);
      return initialValue;
    }
  });

  // Actualizar localStorage cuando el valor cambie
  const setValue = (value) => {
    try {
      // Permite que value sea una función (como useState)
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error("Error saving to localStorage:", error);
    }
  };

  return [storedValue, setValue];
}

export default useLocalStorage;
