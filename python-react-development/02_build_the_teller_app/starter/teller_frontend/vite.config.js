import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const BACKEND =
  'https://wxo-corebanking-backend.1944johjccn7.eu-de.codeengine.appdomain.cloud';

// The backend sends no CORS headers, so the browser cannot call it cross-origin.
// This dev proxy lets the app call same-origin /api/* and forwards to the backend
// server-side. The app's base URL is /api (see .env) — so api.js calls /api/token,
// /api/accounts, etc., and they are proxied to the backend with the /api prefix stripped.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      thresholds: { lines: 80, branches: 80 },
      include: ['src/**/*.{js,jsx}'],
      exclude: [
        'src/main.jsx',
        'src/test/**',
        'src/services/api.js',   // tested via backend integration; mocked in unit tests
      ],
    },
  },
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/api': {
        target: BACKEND,
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  build: {
    outDir: 'dist',
    // VULN-03: never emit source maps in production — they expose full unminified source
    // to anyone who requests the .map file from the deployed server.
    sourcemap: false,
  },
});
