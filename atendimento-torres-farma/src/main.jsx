import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

// Importação da folha de estilos global copiada do Caixa
import './shared/styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);