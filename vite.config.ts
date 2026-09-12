import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { grokProxyPlugin } from './vite.plugins/grok-proxy';
import { tripoProxyPlugin } from './vite.plugins/tripo-proxy';

export default defineConfig(({ mode }) => {
  // Load .env / .env.local etc. Server-side only variables (like GROK_API_KEY
  // and TRIPO_API_KEY, which are NOT prefixed with VITE_) are read here and
  // injected into the dev middleware — they never reach the browser bundle.
  const env = loadEnv(mode, process.cwd(), '');
  return {
    server: {
      proxy: {
        // city-retrieval FastAPI (RAG summary + Grok TTS). Dev only;
        // the Python server must be running on 8000.
        '/api/city-summary': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
          timeout: 70_000,
          rewrite: () => '/api/monument',
        },
        '/api/city-tts': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
          rewrite: () => '/api/tts',
        },
        '/api/city-ambience': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
          timeout: 90_000,
          rewrite: () => '/api/ambience',
        },
      },
    },
    plugins: [
      react(),
      grokProxyPlugin({
        apiKey: env.GROK_API_KEY,
        model: env.GROK_MODEL,
      }),
      tripoProxyPlugin({
        apiKey: env.TRIPO_API_KEY,
        model: env.TRIPO_MODEL,
        geometryQuality:
          env.TRIPO_GEOMETRY_QUALITY === 'standard' ||
          env.TRIPO_GEOMETRY_QUALITY === 'detailed'
            ? env.TRIPO_GEOMETRY_QUALITY
            : undefined,
        textureQuality:
          env.TRIPO_TEXTURE_QUALITY === 'standard' ||
          env.TRIPO_TEXTURE_QUALITY === 'detailed' ||
          env.TRIPO_TEXTURE_QUALITY === 'extreme'
            ? env.TRIPO_TEXTURE_QUALITY
            : undefined,
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
