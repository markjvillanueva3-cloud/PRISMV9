/**
 * MillSurfaceFinishPanel — STUB (2026-05-27, slot golf, GOAL-TSC-FIX iter16)
 * ====================================================================
 * The companion test (src/__tests__/MillSurfaceFinishPanel.test.ts) imports
 * pure helpers — raTheoreticalUm, isoGradeForRa, classifyFinish,
 * assessMillSurfaceFinish, MillSurfaceFinishInput — but the panel + helpers
 * were never extracted from MILL-STUDIO-MS0/U-MSTUD-B6.
 *
 * Same pattern as MillOptimizer (iter6): `any` params/returns avoid TS2339
 * cascade when tests access concrete sub-properties of return values. Every
 * runtime call throws NOT_IMPLEMENTED (R12 fail-loud).
 *
 * Future U-MILL-SURFACE-FINISH-EXTRACT ships the real Ra = f²/(8r) +
 * ISO 4287 grade table implementation documented in the test header.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MillSurfaceFinishInput = any;

const NOT_IMPLEMENTED = (fn: string): never => {
  throw new Error(
    `NOT IMPLEMENTED: ${fn} — MillSurfaceFinishPanel helpers were never extracted. ` +
    `See src/__tests__/MillSurfaceFinishPanel.test.ts for the intended API.`
  );
};

export function raTheoreticalUm(_stepoverMm: number, _radiusMm: number): number {
  return NOT_IMPLEMENTED('raTheoreticalUm');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isoGradeForRa(_raUm: number): any {
  return NOT_IMPLEMENTED('isoGradeForRa');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function classifyFinish(_raUm: number): any {
  return NOT_IMPLEMENTED('classifyFinish');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function assessMillSurfaceFinish(_input: MillSurfaceFinishInput): any {
  return NOT_IMPLEMENTED('assessMillSurfaceFinish');
}
