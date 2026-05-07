/**
 * Tests for qualityDispatcher U-SPC-WIRE03 — MSA / Multivariate SPC /
 * Sampling Plan action wiring (Phase 0.22 U-SPC5/U-SPC6/U-SPC8).
 *
 * These tests drive the dispatcher by registering a fake MCP server and
 * capturing the handler. The dispatcher returns the engine's result
 * directly (JSON-stringified); validation errors come back as an object
 * with `error` set by `dispatcherError`.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerQualityDispatcher } from "../tools/dispatchers/qualityDispatcher.js";

type Handler = (args: { action: string; params?: Record<string, any> }) => Promise<any>;

function createServer(): { handler: Promise<Handler> } {
  let resolve!: (h: Handler) => void;
  const handler = new Promise<Handler>((r) => (resolve = r));
  const fakeServer = {
    tool(_name: string, _desc: string, _schema: any, fn: Handler) {
      resolve(fn);
    },
  };
  registerQualityDispatcher(fakeServer);
  return { handler };
}

async function call(
  handler: Handler,
  action: string,
  params: Record<string, any>,
): Promise<any> {
  const r = await handler({ action, params });
  const text = r?.content?.[0]?.text ?? JSON.stringify(r);
  try {
    return JSON.parse(text);
  } catch {
    return r;
  }
}

describe("qualityDispatcher U-SPC-WIRE03", () => {
  let handler: Handler;

  beforeAll(async () => {
    const s = createServer();
    handler = await s.handler;
  });

  describe("spc_msa_analyze", () => {
    it("returns ANOVA decomposition and verdict", async () => {
      const meas: number[][][] = [];
      for (let p = 0; p < 5; p += 1) {
        const row: number[][] = [];
        for (let a = 0; a < 3; a += 1) {
          row.push(Array.from({ length: 3 }, (_, t) => p + a * 0.01 + t * 0.001));
        }
        meas.push(row);
      }
      const r = await call(handler, "spc_msa_analyze", { measurements: meas });
      expect(r.nParts).toBe(5);
      expect(r.nAppraisers).toBe(3);
      expect(r.nTrials).toBe(3);
      expect(["acceptable", "marginal", "unacceptable"]).toContain(r.verdict);
    });

    it("schema blocks mismatched trial-array lengths", async () => {
      // spc_msa_analyze schema only pins inner arrays as ≥1. The engine
      // also enforces rectangular shape and throws — the dispatcher
      // surfaces the thrown error as a response without `nParts`.
      const r = await call(handler, "spc_msa_analyze", {
        measurements: [
          [[1, 1], [2, 2]],
          [[1], [2]],
        ],
      });
      expect(r.nParts).toBeUndefined();
    });
  });

  describe("spc_msa_bias", () => {
    it("computes bias with respect to a reference", async () => {
      const r = await call(handler, "spc_msa_bias", {
        measurements: [10.1, 10.0, 10.2, 10.1],
        reference: 10,
      });
      expect(Math.abs(r.bias)).toBeGreaterThan(0);
      expect(r.n).toBe(4);
    });
  });

  describe("spc_msa_linearity", () => {
    it("returns slope, intercept, and rSquared", async () => {
      const r = await call(handler, "spc_msa_linearity", {
        points: [
          { reference: 1, measurement: 1.01 },
          { reference: 2, measurement: 2.03 },
          { reference: 3, measurement: 3.05 },
          { reference: 4, measurement: 4.08 },
        ],
      });
      expect(r).toHaveProperty("slope");
      expect(r).toHaveProperty("intercept");
      expect(r.rSquared).toBeGreaterThan(0);
    });
  });

  describe("spc_multivariate_hotelling", () => {
    it("single-observation path returns t2 and ucl", async () => {
      const r = await call(handler, "spc_multivariate_hotelling", {
        mean: [0, 0],
        covariance: [
          [1, 0.3],
          [0.3, 1],
        ],
        observation: [3, 3],
      });
      expect(r.t2).toBeGreaterThan(0);
      expect(r.ucl).toBeGreaterThan(0);
    });

    it("stream path returns array when observation absent", async () => {
      const r = await call(handler, "spc_multivariate_hotelling", {
        mean: [0, 0],
        covariance: [[1, 0], [0, 1]],
        observations: [
          [0, 0],
          [1, 1],
          [4, 4],
        ],
      });
      expect(Array.isArray(r.stream)).toBe(true);
      expect(r.stream).toHaveLength(3);
    });
  });

  describe("spc_multivariate_mewma", () => {
    it("returns smoothed stream with UCL", async () => {
      const r = await call(handler, "spc_multivariate_mewma", {
        mean: [0, 0],
        covariance: [[1, 0], [0, 1]],
        observations: Array.from({ length: 10 }, () => [0.5, 0.5]),
        lambda: 0.2,
      });
      expect(r.stream).toHaveLength(10);
      expect(r.ucl).toBeGreaterThan(0);
    });
  });

  describe("spc_multivariate_fit", () => {
    it("produces a usable mean/covariance pair", async () => {
      const obs = [
        [0.1, 0.3],
        [0.9, 0.2],
        [-1.1, 1.0],
        [0.6, -0.4],
        [-0.5, -0.9],
        [0.2, 0.8],
      ];
      const r = await call(handler, "spc_multivariate_fit", { observations: obs });
      expect(r.mean).toHaveLength(2);
      expect(r.covariance).toHaveLength(2);
    });
  });

  describe("spc_sampling_mil1916", () => {
    it("returns c=0 plan with matching code letter", async () => {
      const r = await call(handler, "spc_sampling_mil1916", {
        lotSize: 1000,
        verificationLevel: "IV",
        inspectionType: "normal",
      });
      expect(r.acceptanceNumber).toBe(0);
      expect(r.codeLetter).toBe("E");
    });

    it("rejects invalid verification level via schema", async () => {
      const r = await call(handler, "spc_sampling_mil1916", {
        lotSize: 1000,
        verificationLevel: "XYZ",
      });
      expect(r.error ?? r.acceptanceNumber).toBeDefined();
      expect(r.error).toMatch(/Invalid params/);
    });
  });

  describe("spc_sampling_aoql", () => {
    it("returns plan with sampleSize > 0 and achieved ≤ target", async () => {
      const r = await call(handler, "spc_sampling_aoql", {
        lotSize: 1000,
        aoql: 0.02,
      });
      expect(r.sampleSize).toBeGreaterThan(0);
      expect(r.achievedAoql).toBeLessThanOrEqual(0.02);
    });
  });

  describe("spc_sampling_oc_curve", () => {
    it("produces curve points and identifies AOQL", async () => {
      const r = await call(handler, "spc_sampling_oc_curve", {
        sampleSize: 80,
        acceptanceNumber: 2,
        lotSize: 1000,
        resolution: 21,
      });
      // slimResponse compacts large arrays into { _items, _total, _showing }.
      const pointsCount = Array.isArray(r.points) ? r.points.length : r.points._total;
      expect(pointsCount).toBe(21);
      expect(r.aoql.aoq).toBeGreaterThan(0);
    });
  });

  describe("action enum coverage", () => {
    it("all nine new actions route without schema rejection", async () => {
      const minimal: Array<[string, Record<string, any>]> = [
        [
          "spc_msa_analyze",
          {
            measurements: Array.from({ length: 3 }, (_, p) =>
              Array.from({ length: 3 }, (_, a) =>
                Array.from({ length: 2 }, (_, t) => p + a * 0.01 + t * 0.001),
              ),
            ),
          },
        ],
        ["spc_msa_bias", { measurements: [1, 1.01, 0.99], reference: 1 }],
        [
          "spc_msa_linearity",
          { points: [{ reference: 0, measurement: 0 }, { reference: 1, measurement: 1 }] },
        ],
        [
          "spc_multivariate_hotelling",
          {
            mean: [0, 0],
            covariance: [[1, 0], [0, 1]],
            observation: [1, 1],
          },
        ],
        [
          "spc_multivariate_mewma",
          {
            mean: [0, 0],
            covariance: [[1, 0], [0, 1]],
            observations: [[0, 0], [0, 0]],
          },
        ],
        [
          "spc_multivariate_fit",
          { observations: [[0, 0.1], [0.5, -0.2], [-0.3, 0.4]] },
        ],
        ["spc_sampling_mil1916", { lotSize: 500, verificationLevel: "III" }],
        ["spc_sampling_aoql", { lotSize: 500, aoql: 0.05 }],
        [
          "spc_sampling_oc_curve",
          { sampleSize: 50, acceptanceNumber: 1, lotSize: 500 },
        ],
      ];
      for (const [action, params] of minimal) {
        const r = await call(handler, action, params);
        // No schema rejection
        expect(r.error === undefined || !/Invalid params/.test(r.error ?? "")).toBe(true);
      }
    });
  });
});
