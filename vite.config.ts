import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { grokProxyPlugin } from './vite.plugins/grok-proxy';

export default defineConfig(({ mode }) => {
  // Load .env / .env.local etc. Server-side only variables (like GROK_API_KEY,
  // which is NOT prefixed with VITE_) are read here and injected into the dev
  // middleware — they never reach the browser bundle.
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [
      react(),
      grokProxyPlugin({
        apiKey: env.GROK_API_KEY,
        model: env.GROK_MODEL,
      }),
    ],
    build: {
      rollupOptions: {
        output: {
          // Both stay behind the existing lazy world boundary. Split the renderer
          // from reusable math/geometry so each cacheable chunk is below 500 kB.
          manualChunks(id) {
            if (id.endsWith('/three/build/three.core.js')) return 'three-core';
            if (id.endsWith('/three/build/three.module.js'))
              return 'three-renderer';
          },
        },
      },
    },
  };
});
