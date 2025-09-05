// src/index.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './Index.css'

// Crear un root para la aplicación (React 18)
const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
