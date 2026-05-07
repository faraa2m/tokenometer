import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    sourcemap: true,
    target: 'es2022',
  },
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
  },
});
