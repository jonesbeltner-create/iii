import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import proxyHandler from './api/proxy';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'server-side-page-proxy',
      configureServer(server) {
        server.middlewares.use('/api/proxy', (req, res, next) => {
          if (req.method !== 'GET') return next();
          void proxyHandler(req, res);
        });
      },
    },
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
