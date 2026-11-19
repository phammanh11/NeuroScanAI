import path from 'path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const backendEntryPath = path.resolve(__dirname, '../backend/src/index.ts');

function honoLocalDevPlugin(): Plugin {
  return {
    name: 'hono-local-dev-server',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/')) {
          return next();
        }
        try {
          const mod = await server.ssrLoadModule(backendEntryPath);
          const app = mod.app || mod.default;

          const protocol = 'http';
          const host = req.headers.host || 'localhost:5173';
          const fullUrl = `${protocol}://${host}${req.url}`;

          const headers = new Headers();
          for (const [key, val] of Object.entries(req.headers)) {
            if (Array.isArray(val)) {
              for (const v of val) headers.append(key, v);
            } else if (typeof val === 'string') {
              headers.set(key, val);
            }
          }

          let body: Uint8Array | undefined = undefined;
          if (req.method !== 'GET' && req.method !== 'HEAD') {
            const chunks: Buffer[] = [];
            for await (const chunk of req) {
              chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            }
            body = new Uint8Array(Buffer.concat(chunks));
          }

          const webReq = new Request(fullUrl, {
            method: req.method || 'GET',
            headers,
            body,
          });

          const webRes: Response = await app.fetch(webReq, {
            ENVIRONMENT: 'development',
          });

          res.statusCode = webRes.status;
          webRes.headers.forEach((value, key) => {
            res.setHeader(key, value);
          });

          const arrayBuf = await webRes.arrayBuffer();
          res.end(Buffer.from(arrayBuf));
        } catch (err: unknown) {
          console.error('[Hono Dev Middleware Error]:', err);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              success: false,
              error: {
                code: 'DEV_SERVER_ERROR',
                message: err instanceof Error ? err.message : 'Dev Server Error',
              },
            })
          );
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), honoLocalDevPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts';
          if (id.includes('onnxruntime-web')) return 'vendor-onnx';
          if (id.includes('lucide-react')) return 'vendor-icons';
          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('react-router')
          ) {
            return 'vendor-react';
          }
          return undefined;
        },
      },
    },
  },
  server: {
    port: 5173,
    open: false,
  },
});
