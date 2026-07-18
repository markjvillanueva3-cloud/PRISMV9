/**
 * camModelGateThresholds.test.ts -- DRIFT GUARD for the CAM deploy-gate mirror.
 * ============================================================================
 *
 * The TS constants in `schemas/camModelGateThresholds.ts` MIRROR the canonical
 * gate values that live in `scripts/`. The engine layer cannot import scripts,
 * so we mirror -- but a silent divergence would let the CAM gate drift from the
 * GNN gate. This test re-reads the two `.mjs` source files and FAILS if any
 * value drifts (R12: fail-loud, never a silent mirror rot).
 *
 * @milestone CLOSE-THE-LOOP-CAM U3
 */

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  CAM_GATE_THRESHOLDS,
  CAM_PRODUCTION_MIN_CONF,
  CAM_SELECTIVE_THRESHOLDS,
  CAM_MIN_HOLDOUT_PER_CLASS,
} from "../schemas/camModelGateThresholds.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// src/__tests__ -> repo root is 4 up (src/__tests__ -> src -> mcp-server -> repo)
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const NN_EVAL = path.join(REPO_ROOT, "scripts", "lib", "nn-graph-eval.mjs");
const GNN_CLASSIFY = path.join(REPO_ROOT, "scripts", "seed-ghost-gnn-classify.mjs");

function readSource(p: string): string {
  return fs.readFileSync(p, "utf8");
}

describe("camModelGateThresholds -- drift guard against the canonical scripts", () => {
  it("CAM_GATE_THRESHOLDS matches GATE_THRESHOLDS in nn-graph-eval.mjs verbatim", () => {
    const src = readSource(NN_EVAL);
    // export const GATE_THRESHOLDS = Object.freeze({ auroc: 0.78, macroF1: 0.55, brier: 0.15 });
    const m = src.match(/GATE_THRESHOLDS\s*=\s*Object\.freeze\(\{\s*auroc:\s*([\d.]+),\s*macroF1:\s*([\d.]+),\s*brier:\s*([\d.]+)/);
    expect(m).not.toBeNull();
    const [, auroc, macroF1, brier] = m!;
    expect(CAM_GATE_THRESHOLDS.auroc).toBe(Number(auroc));
    expect(CAM_GATE_THRESHOLDS.macroF1).toBe(Number(macroF1));
    expect(CAM_GATE_THRESHOLDS.brier).toBe(Number(brier));
    // Pin the exact canonical values too, so a change to BOTH is still visible.
    expect(CAM_GATE_THRESHOLDS.auroc).toBe(0.78);
    expect(CAM_GATE_THRESHOLDS.macroF1).toBe(0.55);
    expect(CAM_GATE_THRESHOLDS.brier).toBe(0.15);
  });

  it("CAM_PRODUCTION_MIN_CONF matches GNN_DEFAULTS.minConf in seed-ghost-gnn-classify.mjs", () => {
    const src = readSource(GNN_CLASSIFY);
    // minConf: 0.7,   (inside GNN_DEFAULTS = Object.freeze({ ... }))
    const m = src.match(/minConf:\s*([\d.]+)/);
    expect(m).not.toBeNull();
    expect(CAM_PRODUCTION_MIN_CONF).toBe(Number(m![1]));
    expect(CAM_PRODUCTION_MIN_CONF).toBe(0.7);
  });

  it("CAM_SELECTIVE_THRESHOLDS matches SELECTIVE_THRESHOLDS in nn-graph-eval.mjs", () => {
    const src = readSource(NN_EVAL);
    const m = src.match(/SELECTIVE_THRESHOLDS\s*=\s*Object\.freeze\(\[([^\]]+)\]/);
    expect(m).not.toBeNull();
    const canonical = m![1]!.split(",").map((s) => Number(s.trim())).filter((n) => Number.isFinite(n));
    expect([...CAM_SELECTIVE_THRESHOLDS]).toEqual(canonical);
    expect([...CAM_SELECTIVE_THRESHOLDS]).toEqual([0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8]);
  });

  it("CAM_MIN_HOLDOUT_PER_CLASS is a positive integer floor", () => {
    expect(Number.isInteger(CAM_MIN_HOLDOUT_PER_CLASS)).toBe(true);
    expect(CAM_MIN_HOLDOUT_PER_CLASS).toBeGreaterThanOrEqual(2);
    expect(CAM_MIN_HOLDOUT_PER_CLASS).toBe(5);
  });
});
