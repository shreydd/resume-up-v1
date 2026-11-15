import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { db, importVaultFromJSON } from './db';

if (typeof window !== 'undefined') {
  (window as any).__db = db;
  (window as any).__importVaultFromJSON = importVaultFromJSON;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
