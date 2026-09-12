import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
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
});
