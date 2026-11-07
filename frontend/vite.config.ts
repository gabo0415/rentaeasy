import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // El archivo .env se mantiene en la raíz del monorepo.
  envDir: '..',
  server: { port: 5173 },
});
