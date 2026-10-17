import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/* The page may only talk to its own origin (which proxies to the local service), so a
   Content-Security-Policy is injected into index.html. Rows therefore cannot be sent to a public
   service even by a compromised dependency. Development needs inline scripts for hot reload. */
function contentSecurityPolicy(): Plugin {
  return {
    name: 'prism-csp',
    transformIndexHtml(html, context) {
      const dev = Boolean(context.server);
      const policy = [
        "default-src 'self'",
        dev ? "script-src 'self' 'unsafe-inline'" : "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "font-src 'self' data:",
        "img-src 'self' data: blob:",
        dev ? "connect-src 'self' ws://127.0.0.1:5173 ws://localhost:5173" : "connect-src 'self'",
        "object-src 'none'",
        "base-uri 'none'",
        "form-action 'self'",
      ].join('; ');
      return html.replace('<head>', `<head>\n    <meta http-equiv="Content-Security-Policy" content="${policy}" />`);
    },
  };
}

export default defineConfig({
  plugins: [react(), contentSecurityPolicy()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: { '/v1': 'http://127.0.0.1:8000', '/health': 'http://127.0.0.1:8000' },
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
    proxy: { '/v1': 'http://127.0.0.1:8000', '/health': 'http://127.0.0.1:8000' },
  },
  build: { chunkSizeWarningLimit: 700 },
});
