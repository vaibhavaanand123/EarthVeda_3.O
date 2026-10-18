import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const connected = env.VITE_COMMERCE_MODE === 'connected';
  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      // `npm run dev:api` serves the order API on :8787 during development.
      proxy: connected
        ? { '/api': 'http://localhost:8787', '/uploads': 'http://localhost:8787' }
        : undefined,
    },
    build: {
      target: 'es2020',
      sourcemap: false,
      rollupOptions: {
        output: {
          // Stable vendor chunk: framework code stays cached across storefront releases.
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-dom/client', 'react-router', 'react-router-dom'],
          },
        },
      },
    },
  };
});
