import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const prismApiPort = process.env.PRISM_API_PORT || '3000';
const prismApiHost = process.env.PRISM_API_HOST || 'localhost';
const prismApiHttpTarget = `http://${prismApiHost}:${prismApiPort}`;
const prismApiWsTarget = `ws://${prismApiHost}:${prismApiPort}`;

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../dist/web',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@react-three/drei')) {
              return 'viewer-drei';
            }
            if (id.includes('@react-three/fiber')) {
              return 'viewer-fiber';
            }
            if (
              id.includes('/three/examples/') ||
              id.includes('\\three\\examples\\') ||
              id.includes('/three/addons/') ||
              id.includes('\\three\\addons\\')
            ) {
              return 'viewer-three-extras';
            }
            if (
              id.includes('/three/src/renderers/') ||
              id.includes('\\three\\src\\renderers\\')
            ) {
              return 'viewer-three-renderers';
            }
            if (
              id.includes('/three/src/math/') ||
              id.includes('\\three\\src\\math\\') ||
              id.includes('/three/src/core/') ||
              id.includes('\\three\\src\\core\\') ||
              id.includes('/three/src/constants.js') ||
              id.includes('\\three\\src\\constants.js')
            ) {
              return 'viewer-three-foundation';
            }
            if (
              id.includes('/three/src/cameras/') ||
              id.includes('\\three\\src\\cameras\\') ||
              id.includes('/three/src/geometries/') ||
              id.includes('\\three\\src\\geometries\\') ||
              id.includes('/three/src/lights/') ||
              id.includes('\\three\\src\\lights\\') ||
              id.includes('/three/src/materials/') ||
              id.includes('\\three\\src\\materials\\') ||
              id.includes('/three/src/objects/') ||
              id.includes('\\three\\src\\objects\\') ||
              id.includes('/three/src/scenes/') ||
              id.includes('\\three\\src\\scenes\\')
            ) {
              return 'viewer-three-scene';
            }
            if (
              id.includes('/three/build/') ||
              id.includes('\\three\\build\\') ||
              id.includes('/three/src/') ||
              id.includes('\\three\\src\\')
            ) {
              return 'viewer-three-core';
            }
            if (id.includes('recharts')) {
              return 'charts-vendor';
            }
            if (id.includes('react') || id.includes('scheduler')) {
              return 'react-vendor';
            }
          }

          if (id.includes('/src/components/viewer/') || id.includes('/src/api/viewer') || id.includes('/src/types/viewer')) {
            if (id.includes('/src/components/viewer/ViewerToolbar')) {
              return 'viewer-toolbar';
            }
            if (id.includes('/src/api/viewer')) {
              return 'viewer-scene-data';
            }
            return 'viewer-core';
          }

          if (id.includes('/src/data/academy')) {
            return 'academy-data';
          }

          if (id.includes('/src/components/learning/') || id.includes('/src/hooks/useCourses')) {
            return 'learning-core';
          }

          if (id.includes('/src/api/client') || id.includes('/src/api/types')) {
            return 'api-core';
          }
        },
      },
    },
  },
  server: {
    port: 3100,
    proxy: {
      '/api': {
        target: prismApiHttpTarget,
        changeOrigin: true,
      },
      '/ws': {
        target: prismApiWsTarget,
        ws: true,
      },
    },
  },
});
