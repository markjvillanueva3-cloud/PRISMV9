import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    include: ['src/__tests__/**/*.test.{ts,tsx}'],
    globals: true,
    environment: 'jsdom',
    testTimeout: 30000,
    setupFiles: ['./src/__tests__/setup.ts'],
    // The full web suite (100+ files) crashes the runner with exit 255 -- and
    // NO summary -- under parallel workers (reproduced 2026-06-24, slot:oscar:
    // even maxWorkers=3 + NODE_OPTIONS=--max-old-space-size=8192 still 255;
    // --no-file-parallelism completes with a real summary). Root cause is a
    // cross-worker race (symptom: repeated "Multiple instances of Three.js
    // being imported" warnings), NOT memory and NOT WebGL -- a real
    // @react-three/fiber <Canvas> renders fine in jsdom (the prior
    // "Three.js/WebGL-in-jsdom" diagnosis was falsified). Force single-file
    // execution so the suite yields a deterministic pass/fail instead of a 255
    // crash. Slower (~15min full run) but PROVABLE -- you cannot prove the SFC
    // app "works 100%" while the runner aborts with no result. Surgically
    // isolating the offending cross-worker interaction is the follow-up.
    fileParallelism: false,
  },
});
