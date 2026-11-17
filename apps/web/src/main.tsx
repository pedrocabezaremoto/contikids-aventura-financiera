import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Fuentes self-hosted (cero CDN): Montserrat para títulos, Quicksand para el cuerpo.
// Solo el subset latino (cubre á, é, ñ, ¿, ¡): no hace falta cirílico ni vietnamita.
import '@fontsource/montserrat/latin-800.css';
import '@fontsource/quicksand/latin-600.css';
import '@fontsource/quicksand/latin-700.css';
import './styles/index.css';

import { App } from './App';

const root = document.getElementById('root');
if (!root) throw new Error('No se encontró #root');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
