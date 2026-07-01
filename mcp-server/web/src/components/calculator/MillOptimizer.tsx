/**
 * MillOptimizer — STUB (2026-05-27, slot golf, GOAL-TSC-FIX iter6)
 * ====================================================================
 * The companion test (src/__tests__/MillOptimizer.test.ts) was written for
 * MILL-STUDIO-MS0/U-MSTUD-OPTIMIZER but the optimizer module itself was never
 * extracted from the inline panel logic. This stub uses `any` for all params
 * and returns so the test's property destructuring (c.V_m_min, b.score, etc.)
 * doesn't trigger TS2339 cascade — type-checking is intentionally permissive
 * here because every runtime call throws NOT_IMPLEMENTED (R12 fail-loud).
 *
 * Future U-MILL-OPTIMIZER-EXTRACT replaces these with the real bounded-grid +
 * 7-gate fail-fast + objective-scoring impl documented in the test header.
 *
 * Earlier (iter5) attempt used precise types — cascaded +83 TS2339 errors when
 * the test accessed concrete properties this file's interfaces didn't declare.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type OptimizerCtx = any;

const NOT_IMPLEMENTED = (fn: string): never => {
  throw new Error(
    `NOT IMPLEMENTED: ${fn} — MillOptimizer was never extracted. See ` +
    `src/__tests__/MillOptimizer.test.ts for the intended API and ` +
    `MILL-STUDIO-MS0/U-MSTUD-OPTIMIZER for the design.`
  );
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function generateCandidateGrid(_ctx: any): any[] {
  return NOT_IMPLEMENTED('generateCandidateGrid');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function scoreCandidate(_candidate: any, _ctx: any): any {
  return NOT_IMPLEMENTED('scoreCandidate');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function findOptimalParams(_ctx: any): any {
  return NOT_IMPLEMENTED('findOptimalParams');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function defaultPSteelContext(): any {
  return NOT_IMPLEMENTED('defaultPSteelContext');
}
