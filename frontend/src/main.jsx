import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import App from './App';
import { PenyediaAuth } from './context/AuthContext';
import { PenyediaKeranjang } from './context/CartContext';
import './styles/global.css';

/**
 * Titik masuk aplikasi.
 *
 * Urutan penyedia penting: PenyediaAuth berada di luar PenyediaKeranjang karena
 * keranjang milik pengguna, dan router berada paling luar agar kedua konteks dapat
 * memakai hook navigasi bila diperlukan.
 */
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <PenyediaAuth>
        <PenyediaKeranjang>
          <App />
        </PenyediaKeranjang>
      </PenyediaAuth>
    </BrowserRouter>
  </React.StrictMode>
);
