import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function fbnCheckoutProxyPlugin() {
  return {
    name: 'fbn-checkout-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.originalUrl || req.url || '';
        if (url.startsWith('/api/fbn-checkout')) {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

          if (req.method === 'OPTIONS') {
            res.statusCode = 200;
            return res.end();
          }

          if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', async () => {
              try {
                const isLive = process.env.VITE_FBN_LIVE === 'true';
                const targetUrl = isLive
                  ? 'https://checkout.firstchekout.com/api/v1/checkout/initialize'
                  : 'https://sandbox.firstchekout.com/api/v1/checkout/initialize';

                const fetchRes = await fetch(targetUrl, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                  },
                  body: body || '{}',
                });

                const data = await fetchRes.text();
                res.statusCode = fetchRes.status;
                res.setHeader('Content-Type', 'application/json');
                return res.end(data);
              } catch (e) {
                console.error('[FBN Local Proxy Error]', e);
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ status: 'error', error: e.message }));
              }
            });
            return;
          }
        }
        next();
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), fbnCheckoutProxyPlugin()],
  resolve: {
    mainFields: ['browser', 'module', 'main'],
    alias: {
      'fs': 'path-browserify',
      'stream': 'stream-browserify',
      'path': 'path-browserify',
      'vm': 'vm-browserify'
    }
  },
  define: {
    global: 'globalThis'
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups'
    },
    hmr: {
      host: '127.0.0.1',
    },
    watch: {
      ignored: ['**/android/**', '**/ios/**']
    }
  },
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom', 'lucide-react', 'recharts', 'framer-motion', 'antd'],
        },
      },
    },
  },
  optimizeDeps: {
    include: ['react-easy-crop']
  }
})

