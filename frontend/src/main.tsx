import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './estilos.css';
import './servicios/supabase';

createRoot(document.getElementById('raiz')!).render(<StrictMode><App /></StrictMode>);
