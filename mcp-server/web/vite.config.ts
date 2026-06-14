import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { gzipSync } from 'zlib';

const prismApiPort = process.env.PRISM_API_PORT || '3000';

/**
 * Bundle Budget Plugin (LATHE-PROD-READY-MS0/U-LPR-BUNDLE-GATE)
 * Enforces per-chunk size budgets during build.
 */
function bundleBudgetPlugin(): Plugin {
  const BUDGETS_KB: Record<string, number> = {
    'index': 250,
    'main': 250,
    'lathe': 40,
    'monaco-vendor': 600,  // Excluded from hard gate
    'pdf-vendor': 400,     // Excluded from hard gate
    'default': 150,
  };

  const EXCLUDED = ['monaco-vendor', 'pdf-vendor', 'viewer-three'];

  return {
    name: 'bundle-budget',
    writeBundle(_, bundle) {
      const violations: string[] = [];

      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (chunk.type !== 'chunk' || !fileName.endsWith('.js')) continue;

        const chunkName = fileName.replace(/^assets\//, '').replace(/-[a-f0-9]+\.js$/, '');
        const isExcluded = EXCLUDED.some(ex => chunkName.includes(ex));
        const budget = (BUDGETS_KB[chunkName] ?? BUDGETS_KB.default) * 1024;

        const code = 'code' in chunk ? chunk.code : '';
        const gzipSize = gzipSync(Buffer.from(code)).length;

        if (gzipSize > budget && !isExcluded) {
          violations.push(
            `  ${chunkName}: ${(gzipSize / 1024).toFixed(1)}KB > ${budget / 1024}KB budget`
          );
        }
      }

      if (violations.length > 0) {
        console.warn('\n⚠️  Bundle budget violations:');
        violations.forEach(v => console.warn(v));
        console.warn('Run `node scripts/check-bundle-budget.mjs` for details.\n');
      }
    },
  };
}
const prismApiHost = process.env.PRISM_API_HOST || 'localhost';
const prismApiHttpTarget = `http://${prismApiHost}:${prismApiPort}`;
const prismApiWsTarget = `ws://${prismApiHost}:${prismApiPort}`;

export default defineConfig({
  plugins: [react(), bundleBudgetPlugin()],
  build: {
    outDir: '../dist/web',
    emptyOutDir: true,
    // Performance: increase chunk size warning threshold (we handle splitting manually)
    chunkSizeWarningLimit: 800,
    // Performance: enable source maps only in dev
    sourcemap: process.env.NODE_ENV !== 'production',
    // Performance: minification settings
    minify: 'esbuild',
    target: 'es2020',
    rollupOptions: {
      output: {
        // Performance: optimize chunk naming for caching
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Monaco editor (large) - separate chunk
            if (id.includes('monaco-editor') || id.includes('@monaco-editor')) {
              return 'monaco-vendor';
            }
            // PDF rendering (large) - separate chunk
            if (id.includes('@react-pdf') || id.includes('jspdf')) {
              return 'pdf-vendor';
            }
            // Nivo charts - separate from recharts
            if (id.includes('@nivo')) {
              return 'nivo-vendor';
            }
            // Framer motion - separate chunk
            if (id.includes('framer-motion')) {
              return 'motion-vendor';
            }
            // React Query - separate chunk (used everywhere)
            if (id.includes('@tanstack/react-query')) {
              return 'query-vendor';
            }
            // Radix UI components - shared across pages
            if (id.includes('@radix-ui')) {
              return 'radix-vendor';
            }
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

          // Split calculator components for better caching
          if (id.includes('/src/components/calculator/')) {
            if (id.includes('WireEdm')) {
              return 'calculator-wedm';
            }
            return 'calculator-components';
          }

          // Split SFC components
          if (id.includes('/src/components/sfc/')) {
            return 'sfc-components';
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

          // Split utility modules
          if (id.includes('/src/utils/calculator')) {
            return 'calculator-utils';
          }

          // Split data modules (catalogs, etc.)
          if (id.includes('/src/data/calculator')) {
            return 'calculator-data';
          }
        },
      },
    },
  },
  server: {
    port: 3100,
    // PHONE-TEST-INFRA (2026-05-27 lima): when PRISM_PHONE_DEV=1, bind to 0.0.0.0 so a
    // phone on the same LAN (or a cloudflared tunnel — see scripts/phone-tunnel.ps1)
    // can reach the dev server. Default behavior (localhost-only) is preserved.
    ...(process.env.PRISM_PHONE_DEV === '1' ? { host: '0.0.0.0', strictPort: true } : {}),
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
