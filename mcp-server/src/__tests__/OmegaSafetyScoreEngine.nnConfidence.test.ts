/**
 * OmegaSafetyScoreEngine.nnConfidence.test.ts — XPROC-NEURAL-CONNECT-MS0 / U-CN03
 *
 * Verifies the optional NN-confidence input integration. All assertions are
 * value-equality / numeric-bound checks against expected weighted-geometric-
 * mean math; no presence-only stubs.
 */
import { describe, it, expect } from "vitest";

import { omegaSafetyScoreEngine } from "../engines/OmegaSafetyScoreEngine.js";
import type { SafetyAssessment } from "../engines/PipelineSafetyOrchestratorEngine.js";

// Risk-level scores (mirrors RISK_SCORE in OmegaSafetyScoreEngine).
const SCORE_SAFE = 1.0;
const SCORE_CAUTION = 0.85;
const SCORE_WARNING = 0.6;
const GATE = 0.7;
const ROUND_TOL = 0.005;

function makeAssessment(opts: {
  collision?: "safe" | "caution" | "warning" | "critical" | "veto";
  overload?: "safe" | "caution" | "warning" | "critical" | "veto";
  chatter?: "safe" | "caution" | "warning" | "critical" | "veto";
  thermal?: "safe" | "caution" | "warning" | "critical" | "veto";
  breakage?: "safe" | "caution" | "warning" | "critical" | "veto";
  workholding?: "safe" | "caution" | "warning" | "critical" | "veto";
  vetoed?: boolean;
}): SafetyAssessment {
  const dim = (risk: "safe" | "caution" | "warning" | "critical" | "veto") => ({
    risk,
    detail: `${risk} dimension`,
    score: 1.0,
  });
  return {
    dimensions: {
      collision: dim(opts.collision ?? "safe"),
      overload: dim(opts.overload ?? "safe"),
      chatter: dim(opts.chatter ?? "safe"),
      thermal: dim(opts.thermal ?? "safe"),
      breakage: dim(opts.breakage ?? "safe"),
      workholding: dim(opts.workholding ?? "safe"),
    },
    vetoed: opts.vetoed ?? false,
    justification: [],
    escalation_actions: [],
  } as unknown as SafetyAssessment;
}

describe("OmegaSafetyScoreEngine — NN-confidence integration (U-CN03)", () => {
  describe("backward compatibility — omitted opts is bit-equivalent to legacy path", () => {
    it("all-safe assessment returns omega = 1.0 (geometric mean of all 1.0 dims)", () => {
      const r = omegaSafetyScoreEngine.score(makeAssessment({}));
      expect(r.omega_safety).toBe(1.0);
      expect(r.passed).toBe(true);
      expect(r.gate_threshold).toBe(GATE);
    });

    it("vetoed assessment returns omega = 0 regardless of opts (NN cannot rescue)", () => {
      const r = omegaSafetyScoreEngine.score(
        makeAssessment({ vetoed: true }),
        { nnConfidence: 1.0, nnWeight: 5.0 },
      );
      expect(r.omega_safety).toBe(0);
      expect(r.passed).toBe(false);
      expect(r.vetoed).toBe(true);
    });

    it("mixed-risk no-NN matches the closed-form 6-dim geometric mean to 3 decimals", () => {
      const r = omegaSafetyScoreEngine.score(
        makeAssessment({ chatter: "warning", thermal: "caution" }),
      );
      // Geometric mean of [1, 1, 0.6, 0.85, 1, 1] = (0.6*0.85)^(1/6)
      const expected = Math.pow(SCORE_WARNING * SCORE_CAUTION, 1 / 6);
      expect(Math.abs(r.omega_safety - expected)).toBeLessThan(ROUND_TOL);
    });
  });

  describe("NN-confidence — exact weighted geometric mean math", () => {
    it("nnConfidence=1.0 with nnWeight=1.0 leaves all-safe composite at exactly 1.0", () => {
      const r = omegaSafetyScoreEngine.score(
        makeAssessment({}),
        { nnConfidence: 1.0, nnWeight: 1.0 },
      );
      expect(r.omega_safety).toBe(1.0);
      expect(r.nn_confidence).toBe(1.0);
      expect(r.nn_weight).toBe(1.0);
    });

    it("nnConfidence=0.5 with nnWeight=1.0 on all-safe equals 0.5^(1/7) within 3 decimals", () => {
      const r = omegaSafetyScoreEngine.score(
        makeAssessment({}),
        { nnConfidence: 0.5, nnWeight: 1.0 },
      );
      const expected = Math.pow(0.5, 1 / 7);
      expect(Math.abs(r.omega_safety - expected)).toBeLessThan(ROUND_TOL);
      expect(r.nn_confidence).toBe(0.5);
    });

    it("nnConfidence=0.5 with nnWeight=3.0 equals 0.5^(3/9) = 0.5^(1/3) within 3 decimals", () => {
      const r = omegaSafetyScoreEngine.score(
        makeAssessment({}),
        { nnConfidence: 0.5, nnWeight: 3.0 },
      );
      const expected = Math.pow(0.5, 1 / 3);
      expect(Math.abs(r.omega_safety - expected)).toBeLessThan(ROUND_TOL);
      expect(r.nn_weight).toBe(3.0);
    });

    it("higher NN weight pulls composite further toward NN signal (strict monotone)", () => {
      const w_low = omegaSafetyScoreEngine.score(
        makeAssessment({}),
        { nnConfidence: 0.4, nnWeight: 0.5 },
      ).omega_safety;
      const w_mid = omegaSafetyScoreEngine.score(
        makeAssessment({}),
        { nnConfidence: 0.4, nnWeight: 1.5 },
      ).omega_safety;
      const w_high = omegaSafetyScoreEngine.score(
        makeAssessment({}),
        { nnConfidence: 0.4, nnWeight: 3.0 },
      ).omega_safety;
      expect(w_low).toBeGreaterThan(w_mid);
      expect(w_mid).toBeGreaterThan(w_high);
      expect(w_high).toBeGreaterThan(0.4); // converges toward 0.4 from above
    });

    it("nnWeight=0 produces identical numeric result to no-NN baseline", () => {
      const baseline = omegaSafetyScoreEngine.score(
        makeAssessment({ overload: "warning" }),
      );
      const noOp = omegaSafetyScoreEngine.score(
        makeAssessment({ overload: "warning" }),
        { nnConfidence: 0.1, nnWeight: 0 },
      );
      expect(noOp.omega_safety).toBe(baseline.omega_safety);
    });
  });

  describe("invalid NN inputs degrade open — composite equals no-NN baseline", () => {
    it("NaN nnConfidence → omega_safety equals baseline value 1.0", () => {
      const r = omegaSafetyScoreEngine.score(
        makeAssessment({}),
        { nnConfidence: Number.NaN, nnWeight: 1.0 },
      );
      expect(r.omega_safety).toBe(1.0);
    });

    it("Infinity nnConfidence → omega_safety equals baseline value 1.0", () => {
      const r = omegaSafetyScoreEngine.score(
        makeAssessment({}),
        { nnConfidence: Number.POSITIVE_INFINITY, nnWeight: 1.0 },
      );
      expect(r.omega_safety).toBe(1.0);
    });

    it("nnConfidence > 1 → omega_safety equals baseline value 1.0 (out-of-range skip)", () => {
      const r = omegaSafetyScoreEngine.score(
        makeAssessment({}),
        { nnConfidence: 1.5, nnWeight: 1.0 },
      );
      expect(r.omega_safety).toBe(1.0);
    });

    it("negative nnConfidence → omega_safety equals baseline 1.0 (out-of-range skip)", () => {
      const r = omegaSafetyScoreEngine.score(
        makeAssessment({}),
        { nnConfidence: -0.1, nnWeight: 1.0 },
      );
      expect(r.omega_safety).toBe(1.0);
    });

    it("negative nnWeight → omega_safety equals baseline 1.0", () => {
      const r = omegaSafetyScoreEngine.score(
        makeAssessment({}),
        { nnConfidence: 0.5, nnWeight: -1.0 },
      );
      expect(r.omega_safety).toBe(1.0);
    });
  });

  describe("gate behavior with NN — passing baseline can be pulled below 0.70", () => {
    it("low NN confidence + heavy weight pulls a passing baseline below the 0.70 gate", () => {
      const baseline = omegaSafetyScoreEngine.score(
        makeAssessment({ chatter: "caution" }),
      );
      expect(baseline.passed).toBe(true);
      expect(baseline.omega_safety).toBeGreaterThanOrEqual(GATE);
      const withNn = omegaSafetyScoreEngine.score(
        makeAssessment({ chatter: "caution" }),
        { nnConfidence: 0.05, nnWeight: 5.0 },
      );
      expect(withNn.passed).toBe(false);
      expect(withNn.omega_safety).toBeLessThan(GATE);
      // Recommendation surfaces the NN-confidence cause.
      const nnRecCount = withNn.recommendations.filter(r => r.includes("NN confidence")).length;
      expect(nnRecCount).toBeGreaterThanOrEqual(1);
    });

    it("high NN confidence cannot rescue a vetoed assessment (veto wins regardless of weight)", () => {
      const r = omegaSafetyScoreEngine.score(
        makeAssessment({ collision: "veto", vetoed: true }),
        { nnConfidence: 1.0, nnWeight: 100 },
      );
      expect(r.omega_safety).toBe(0);
      expect(r.passed).toBe(false);
    });
  });

  describe("variability — 3 risk profiles × 3 NN settings produce monotone sequences", () => {
    it("for each profile, increasing NN confidence non-strictly increases composite", () => {
      const profiles: Array<{ name: string; a: SafetyAssessment }> = [
        { name: "all-safe", a: makeAssessment({}) },
        { name: "single-warning", a: makeAssessment({ thermal: "warning" }) },
        { name: "two-cautions", a: makeAssessment({ chatter: "caution", overload: "caution" }) },
      ];
      const nnConfs = [0.2, 0.5, 0.9];
      for (const p of profiles) {
        const composites: number[] = [];
        for (const c of nnConfs) {
          const r = omegaSafetyScoreEngine.score(p.a, { nnConfidence: c, nnWeight: 1.0 });
          expect(Number.isFinite(r.omega_safety)).toBe(true);
          expect(r.omega_safety).toBeGreaterThanOrEqual(0);
          expect(r.omega_safety).toBeLessThanOrEqual(1);
          composites.push(r.omega_safety);
        }
        expect(composites[0]).toBeLessThanOrEqual(composites[1]);
        expect(composites[1]).toBeLessThanOrEqual(composites[2]);
      }
    });
  });

  describe("dispatcher round-trip via calcDispatcher omega_safety_score", () => {
    // calcDispatcher is registered as an MCP tool (no exported callable function).
    // We capture the registered handler closure via a minimal mock server, then
    // invoke `omega_safety_score` through that handler — same code path as the
    // live MCP server uses.
    type CalcHandler = (input: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;

    let handler: CalcHandler | null = null;

    async function getHandler(): Promise<CalcHandler> {
      if (handler) return handler;
      const { registerCalcDispatcher } = await import("../tools/dispatchers/calcDispatcher.js");
      let captured: CalcHandler | null = null;
      const mockServer = {
        tool: (
          _name: string,
          _desc: string,
          _schema: unknown,
          fn: CalcHandler,
        ) => {
          captured = fn;
        },
      };
      registerCalcDispatcher(mockServer);
      if (!captured) throw new Error("registerCalcDispatcher did not register handler");
      handler = captured;
      return handler;
    }

    function unwrap(envelope: unknown): unknown {
      // The MCP handler returns { content: [{ type: 'text', text: '<json>' }] }
      // — parse the JSON from the text payload to get the dispatcher result.
      const e = envelope as { content?: Array<{ text?: string }> };
      const text = e?.content?.[0]?.text;
      if (typeof text !== "string") return envelope;
      try { return JSON.parse(text); } catch { return envelope; }
    }

    it("dispatcher accepts wrapper shape { assessment, nn_confidence, nn_weight }", async () => {
      const fn = await getHandler();
      const env = await fn({
        action: "omega_safety_score",
        params: {
          assessment: makeAssessment({}),
          nn_confidence: 0.5,
          nn_weight: 1.0,
        },
      });
      const data = unwrap(env) as { nn_confidence?: number; nn_weight?: number; omega_safety?: number };
      expect(data.nn_confidence).toBe(0.5);
      expect(data.nn_weight).toBe(1.0);
      const expected = Math.pow(0.5, 1 / 7);
      expect(Math.abs((data.omega_safety as number) - expected)).toBeLessThan(ROUND_TOL);
    });

    it("dispatcher accepts legacy shape (params IS the assessment) — omega_safety = 1.0", async () => {
      const fn = await getHandler();
      const env = await fn({
        action: "omega_safety_score",
        params: makeAssessment({}) as unknown as Record<string, unknown>,
      });
      const data = unwrap(env) as { passed?: boolean; omega_safety?: number };
      expect(data.passed).toBe(true);
      expect(data.omega_safety).toBe(1.0);
    });

    it("dispatcher round-trips low-confidence NN gating a passing baseline below 0.70", async () => {
      const fn = await getHandler();
      const env = await fn({
        action: "omega_safety_score",
        params: {
          assessment: makeAssessment({ chatter: "caution" }),
          nn_confidence: 0.05,
          nn_weight: 5.0,
        },
      });
      const data = unwrap(env) as { passed?: boolean; omega_safety?: number };
      expect(data.passed).toBe(false);
      expect(data.omega_safety as number).toBeLessThan(GATE);
    });
  });
});
