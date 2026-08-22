import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import proxyHandler from './api/proxy';
import chatHandler from './api/chat';

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
        server.middlewares.use('/api/chat', (req, res, next) => {
          if (req.method !== 'POST') return next();
          void chatHandler(req, res);
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
