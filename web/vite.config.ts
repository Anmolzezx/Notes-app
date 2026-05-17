import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/register': 'http://localhost:3000',
      '/login': 'http://localhost:3000',
      '/notes': 'http://localhost:3000',
      '/search': 'http://localhost:3000',
      '/about': 'http://localhost:3000',
      '/openapi.json': 'http://localhost:3000',
      '/health': 'http://localhost:3000',
    },
  },
  build: {
    outDir: 'dist',
  },
});
