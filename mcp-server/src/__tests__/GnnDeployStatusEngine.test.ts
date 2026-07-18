/**
 * GnnDeployStatusEngine.test.ts -- U-GNN-DEPLOY-STATUS-MCP (slot:india 2026-06-22).
 *
 * Proves the GNN deploy-gate verdict is now consumable through the MCP surface
 * (prism_dev:gnn_deploy_status) as a PURE read of the already-graded
 * state/shared/nn-graph/NN-EVAL.json -- never re-grading, never inlining a
 * threshold (gates come from the report's own `gates` field).
 *
 * INTENT (R9): the NO-INLINE test feeds a fixture with non-canonical gates
 * (0.9/0.6/0.1) and asserts the surfaced gates reflect the FIXTURE, not the
 * canonical 0.78 -- it FAILS the instant anyone hardcodes a threshold. The
 * round-trip tests FAIL if the action is not wired. The fail-soft tests FAIL if
 * readStatus throws on a missing/garbage report.
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import {
  GnnDeployStatusEngine,
  gnnDeployStatusEngine,
  DEFAULT_NN_EVAL_PATH,
} from "../engines/GnnDeployStatusEngine.js";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";

/** A fixture mirroring the LIVE NN-EVAL.json shape (2026-06-17 assessment). */
const GRADED_FIXTURE = {
  deferred: false,
  assessedAt: "2026-06-17T19:37:56.054Z",
  holdoutN: 84,
  metrics: { auroc: 0.7891, macroF1: 0.4101, brier: 0.1887, accuracy: 0.619 },
  gates: { auroc: 0.78, macroF1: 0.55, brier: 0.15 },
  grade: {
    pass: false,
    verdict: "shipped-research-only",
    failures: ["macro-F1 0.4101 < 0.55", "Brier 0.1887 > 0.15"],
  },
  selective: {
    deployPoint: { tau: 0.7 },
    deployGrade: {
      pass: true,
      verdict: "deploy-ready-selective",
      failures: [],
      productionGate: 0.7,
      operatingPoint: {
        tau: 0.7, coverage: 0.2738, emitted: 23, brier: 0.0417,
        macroF1: 1, accuracy: 1, classesEmitted: 2, totalClasses: 13,
      },
      robustAboveGate: true,
      concentrated: true,
      globalAuroc: 0.7891,
    },
  },
  degeneracy: { isDegenerate: false, mode: "none", detail: "discriminating (varied confidence + classes)" },
};

let tmpCounter = 0;
function writeTmp(obj: unknown): string {
  const p = path.join(os.tmpdir(), `gnn-eval-test-${process.pid}-${tmpCounter++}.json`);
  fs.writeFileSync(p, typeof obj === "string" ? obj : JSON.stringify(obj));
  return p;
}

interface CapturedTool {
  name: string;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}
function getDevHandler(): CapturedTool["handler"] {
  const tools: CapturedTool[] = [];
  const server = {
    tool: (_n: string, _d: string, _s: unknown, h: CapturedTool["handler"]) => {
      tools.push({ name: _n, handler: h });
    },
  };
  registerDevDispatcher(server as unknown as Parameters<typeof registerDevDispatcher>[0]);
  return tools[0].handler;
}
function unwrap(res: unknown): Record<string, any> {
  const r = res as { content?: Array<{ text?: string }> };
  if (r?.content?.[0]?.text) {
    try { return JSON.parse(r.content[0].text as string); } catch { return res as Record<string, any>; }
  }
  return res as Record<string, any>;
}

describe("GnnDeployStatusEngine.classify -- pure read of the stored verdict", () => {
  const eng = new GnnDeployStatusEngine();

  it("HAPPY (graded): surfaces the stored metrics, full-coverage grade + selective-deploy verdict", () => {
    const s = eng.classify(GRADED_FIXTURE);
    expect(s.deferred).toBe(false);
    expect(s.graded).toBe(true);
    expect(s.holdoutN).toBe(84);
    expect(s.metrics).toEqual({ auroc: 0.7891, macroF1: 0.4101, brier: 0.1887, accuracy: 0.619 });
    // full-coverage gate verdict (stored -- the engine does not recompute it)
    expect(s.fullCoverage?.pass).toBe(false);
    expect(s.fullCoverage?.verdict).toBe("shipped-research-only");
    expect(s.fullCoverage?.failures).toHaveLength(2);
    // selective-deploy verdict (the india selective-deploy tier-5 path)
    expect(s.selectiveDeploy?.ready).toBe(true);
    expect(s.selectiveDeploy?.verdict).toBe("deploy-ready-selective");
    expect(s.selectiveDeploy?.productionGate).toBe(0.7);
    expect(s.selectiveDeploy?.robustAboveGate).toBe(true);
    expect(s.selectiveDeploy?.concentrated).toBe(true);
    expect(s.selectiveDeploy?.operatingPoint?.tau).toBe(0.7);
    expect(s.selectiveDeploy?.operatingPoint?.coverage).toBe(0.2738);
    expect(s.selectiveDeploy?.operatingPoint?.classesEmitted).toBe(2);
    expect(s.selectiveDeploy?.operatingPoint?.totalClasses).toBe(13);
    expect(s.degeneracy?.isDegenerate).toBe(false);
  });

  it("NO THRESHOLD INLINE (adversarial): surfaced gates reflect the REPORT, not a hardcoded 0.78", () => {
    const custom = { ...GRADED_FIXTURE, gates: { auroc: 0.9, macroF1: 0.6, brier: 0.1 } };
    const s = eng.classify(custom);
    // If anyone inlines the canonical 0.78, this fails. Gates are READ from the report.
    expect(s.gates).toEqual({ auroc: 0.9, macroF1: 0.6, brier: 0.1 });
    expect(s.gates?.auroc).not.toBe(0.78);
  });

  it("DEFERRED: surfaces deferred + the link-pred PRETEXT auroc, never the deploy gate", () => {
    const s = eng.classify({
      deferred: true,
      reason: "insufficient-reference-pool",
      checkpointMeta: { auroc: 0.4 },
    });
    expect(s.deferred).toBe(true);
    expect(s.graded).toBe(false);
    expect(s.metrics).toBeNull();          // no deploy-gate metric on a deferred report
    expect(s.pretextAuroc).toBe(0.4);      // the weak sub-gate signal, clearly labeled
    expect(s.selectiveDeploy).toBeNull();
    expect(s.reason).toBe("insufficient-reference-pool");
  });

  it("LEGACY (no selective section): full-coverage present, selectiveDeploy null", () => {
    const s = eng.classify({
      deferred: false,
      metrics: { auroc: 0.81, macroF1: 0.6, brier: 0.1, accuracy: 0.74 },
      grade: { pass: true, verdict: "shipped", failures: [] },
    });
    expect(s.graded).toBe(true);
    expect(s.fullCoverage?.pass).toBe(true);
    expect(s.selectiveDeploy).toBeNull();
    expect(s.gates).toBeNull();
  });

  it("EMPTY report: every verdict field null/false, no throw", () => {
    const s = eng.classify({});
    expect(s.graded).toBe(false);
    expect(s.deferred).toBe(false);
    expect(s.metrics).toBeNull();
    expect(s.gates).toBeNull();
    expect(s.fullCoverage).toBeNull();
    expect(s.selectiveDeploy).toBeNull();
  });

  it("NON-OBJECT inputs (adversarial): null / string / number never throw", () => {
    for (const bad of [null, undefined, "garbage", 42, []]) {
      const s = eng.classify(bad as unknown);
      expect(s.graded).toBe(false);
      expect(s.metrics).toBeNull();
    }
  });

  it("STALENESS: computed from assessedAt + nowMs; null when assessedAt absent", () => {
    const now = Date.parse("2026-06-17T19:37:56.054Z") + 3_600_000; // +1h
    const s = eng.classify(GRADED_FIXTURE, { nowMs: now });
    expect(s.stalenessMs).toBe(3_600_000);
    const s2 = eng.classify({ metrics: { auroc: 0.8 } }, { nowMs: now });
    expect(s2.stalenessMs).toBeNull(); // no assessedAt -> cannot compute
  });
});

describe("GnnDeployStatusEngine.readStatus -- fail-soft disk read", () => {
  it("FILE ABSENT: found=false + read_failed error, no throw", () => {
    const s = gnnDeployStatusEngine.readStatus({ evalPath: path.join(os.tmpdir(), "gnn-does-not-exist-zzz.json") });
    expect(s.found).toBe(false);
    expect(s.error).toMatch(/read_failed/);
    expect(s.graded).toBe(false);
  });

  it("MALFORMED JSON: found=false + parse_failed error, no throw", () => {
    const p = writeTmp("{ this is not json ");
    const s = gnnDeployStatusEngine.readStatus({ evalPath: p });
    expect(s.found).toBe(false);
    expect(s.error).toMatch(/parse_failed/);
  });

  it("HAPPY: reads + classifies a real fixture file", () => {
    const p = writeTmp(GRADED_FIXTURE);
    const s = gnnDeployStatusEngine.readStatus({ evalPath: p, nowMs: Date.now() });
    expect(s.found).toBe(true);
    expect(s.error).toBeNull();
    expect(s.metrics?.auroc).toBe(0.7891);
    expect(s.selectiveDeploy?.ready).toBe(true);
    expect(s.evalPath).toBe(path.resolve(p));
    expect(typeof s.stalenessMs).toBe("number");
  });

  it("default path is the canonical repo-relative location", () => {
    expect(DEFAULT_NN_EVAL_PATH).toBe("state/shared/nn-graph/NN-EVAL.json");
    const s = gnnDeployStatusEngine.readStatus({ repoRoot: os.tmpdir() });
    // resolves under repoRoot; absent there -> found:false (no throw)
    expect(s.evalPath).toBe(path.resolve(os.tmpdir(), DEFAULT_NN_EVAL_PATH));
    expect(s.found).toBe(false);
  });

  // ── REGRESSION (U-HZ-AISTACK-REPO-ROOT-FIX, 2026-06-26, slot:bravo) ──────────
  // The production runtime is the esbuild bundle started from `mcp-server/`
  // (cwd = mcp-server). The OLD default anchor `opts.repoRoot ?? process.cwd()`
  // therefore resolved `mcp-server/state/shared/nn-graph/NN-EVAL.json` -- which
  // does NOT exist (the report lives at the TRUE repo root) -- so gnn_deploy_status
  // reported `read_failed` in production while passing every test (tests pin an
  // explicit repoRoot/evalPath, masking the cwd default). The fix anchors the
  // default to `resolveRepoRoot()`. This test FAILS-ON-REVERT to process.cwd():
  // the resolved default path must sit under a dir that CONTAINS `mcp-server/`,
  // never under `mcp-server/` itself. Bug-class sibling: U-DISPATCHER-REPO-ROOT-FIX.
  it("default anchor resolves to the TRUE repo root (contains mcp-server/), not mcp-server/ itself", () => {
    const s = gnnDeployStatusEngine.readStatus({ nowMs: Date.now() });
    // The default-anchored eval path always ends with the canonical suffix.
    expect(s.evalPath.replace(/\\/g, "/")).toMatch(/\/state\/shared\/nn-graph\/NN-EVAL\.json$/);
    // The anchor (evalPath minus the suffix) is the repo root: it must contain
    // an `mcp-server/` subdir. A process.cwd() regression makes the anchor BE
    // `.../mcp-server`, whose own `mcp-server/state/...` path does not exist.
    const anchor = path.resolve(s.evalPath, "..", "..", "..", "..");
    expect(fs.existsSync(path.join(anchor, "mcp-server"))).toBe(true);
    expect(path.basename(anchor)).not.toBe("mcp-server");
  });
});

describe("prism_dev:gnn_deploy_status -- dispatcher round-trip", () => {
  const handler = getDevHandler();

  it("CLOSES THE LOOP: returns the stored verdict via the MCP surface", async () => {
    const p = writeTmp(GRADED_FIXTURE);
    const out = unwrap(await handler({ action: "gnn_deploy_status", params: { eval_path: p } }));
    expect(out.success).toBe(true);
    expect(out.data.found).toBe(true);
    expect(out.data.metrics.auroc).toBe(0.7891);
    expect(out.data.gates.auroc).toBe(0.78);
    expect(out.data.fullCoverage.verdict).toBe("shipped-research-only");
    expect(out.data.selectiveDeploy.ready).toBe(true);
    expect(out.data.selectiveDeploy.operatingPoint.tau).toBe(0.7);
  });

  it("a read failure is DATA, not a dispatch error (success:true, data.found:false)", async () => {
    const out = unwrap(await handler({
      action: "gnn_deploy_status",
      params: { eval_path: path.join(os.tmpdir(), "gnn-missing-qqq.json") },
    }));
    expect(out.success).toBe(true);          // the dispatch itself succeeds
    expect(out.data.found).toBe(false);      // the read failed -> surfaced as data
    expect(out.data.error).toMatch(/read_failed/);
  });
});
