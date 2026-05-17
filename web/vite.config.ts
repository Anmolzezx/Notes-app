import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.VITE_API_PROXY_TARGET || 'http://localhost:3000';
  const isHttps = target.startsWith('https://');

  const apiPaths = [
    '/register',
    '/login',
    '/notes',
    '/search',
    '/about',
    '/openapi.json',
    '/health',
  ];

  const proxy = Object.fromEntries(
    apiPaths.map((p) => [
      p,
      {
        target,
        changeOrigin: true,
        secure: isHttps,
      },
    ])
  );

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy,
    },
    build: {
      outDir: 'dist',
    },
  };
});
