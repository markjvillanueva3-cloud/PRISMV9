/**
 * devDispatcher × MeasurementSystemAnalysisEngine wire
 * ([WIRING]/U-WIRE-MSA-ANALYZE, slot:romeo).
 *
 * MeasurementSystemAnalysisEngine (pure static Gage R&R via crossed ANOVA, AIAG MSA 4th ed) was
 * BUILT but UNWIRED — verified GENUINE_ORPHAN (static methods, no I/O) via
 * scripts/classify-engine-reachability.mjs. This wires `msa_analyze` into prism_dev.
 *
 * Round-trip THROUGH the registered dispatcher (not a direct engine import).
 * ANTI-STUB: the verdict + variance components are computed from the supplied measurements. A
 * near-perfect measurement system (tiny within-cell noise, large part-to-part spread) MUST classify
 * "acceptable" with %GRR<10 and SS_part >> SS_equipment — a stub returning a fixed verdict / zeros fails.
 *
 * @milestone BLACKWELL-DB-GEN-MS0
 * @unit U-WIRE-MSA-ANALYZE
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";

interface CapturedTool {
  name: string;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}
class MockMCPServer {
  tools: CapturedTool[] = [];
  tool(name: string, _d: unknown, _s: unknown, handler: CapturedTool["handler"]) {
    this.tools.push({ name, handler });
  }
}

async function call(
  server: MockMCPServer,
  action: string,
  params: Record<string, unknown> = {},
): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const tool = server.tools[0]!;
  const raw = (await tool.handler({ action, params })) as { content?: { type: string; text: string }[] };
  if (!raw.content) return { ok: false, data: raw as unknown as Record<string, unknown> };
  let parsed: Record<string, unknown>;
  try { parsed = JSON.parse(raw.content[0]!.text); } catch { return { ok: false, data: { rawText: raw.content[0]!.text } }; }
  // A successful MsaResult always carries a string `verdict`; an error envelope does not.
  if (typeof parsed.verdict !== "string") return { ok: false, data: parsed };
  return { ok: true, data: parsed };
}

let server: MockMCPServer;
beforeEach(() => {
  server = new MockMCPServer();
  registerDevDispatcher(server as unknown as { tool: MockMCPServer["tool"] });
});

describe("devDispatcher × MeasurementSystemAnalysis wire (U-WIRE-MSA-ANALYZE)", () => {
  it("a near-perfect gage (tiny noise, distinct parts) classifies 'acceptable' with %GRR<10 (anti-stub)", async () => {
    // 3 parts × 2 appraisers × 2 trials; 0.1 within-cell noise, 10-unit part spacing.
    const r = await call(server, "msa_analyze", {
      measurements: [
        [[10.0, 10.1], [10.0, 10.1]],
        [[20.0, 20.1], [20.0, 20.1]],
        [[30.0, 30.1], [30.0, 30.1]],
      ],
    });
    expect(r.ok).toBe(true);
    expect(r.data.nParts).toBe(3);
    expect(r.data.nAppraisers).toBe(2);
    expect(r.data.nTrials).toBe(2);
    expect(r.data.verdict).toBe("acceptable");
    const gageRR = r.data.gageRR as Record<string, number>;
    expect(gageRR.percentStudy ?? 0).toBeLessThan(10); // AIAG acceptable threshold (σ basis)
    // ANTI-STUB: part variation must dominate equipment variation for this data.
    const anova = r.data.anova as Record<string, number>;
    expect(anova.SS_part).toBeGreaterThan(anova.SS_equipment);
  });

  it("handles a different study shape (2 parts × 1 appraiser × 3 trials) with finite components — variability", async () => {
    const r = await call(server, "msa_analyze", {
      measurements: [
        [[10, 11, 12]],
        [[20, 21, 22]],
      ],
    });
    expect(r.ok).toBe(true);
    expect(r.data.nParts).toBe(2);
    expect(r.data.nAppraisers).toBe(1);
    expect(r.data.nTrials).toBe(3);
    expect(["acceptable", "marginal", "unacceptable"]).toContain(r.data.verdict);
    const gageRR = r.data.gageRR as Record<string, number>;
    expect(Number.isFinite(gageRR.percentStudy)).toBe(true);
    expect(gageRR.percentStudy).toBeGreaterThanOrEqual(0);
    // real part-to-part spread (10 vs 20) → total variation must be strictly positive
    expect((r.data.totalVariation as Record<string, number>).stddev).toBeGreaterThan(0);
  });

  it("rejects insufficient data (1 part) as a structured error, not a crash (adversarial)", async () => {
    const r = await call(server, "msa_analyze", { measurements: [[[1, 2]]] });
    expect(r.ok).toBe(false);
    expect(JSON.stringify(r.data).toLowerCase()).toMatch(/invalid_msa_study|2 parts|parts/);
  });

  it("rejects a non-rectangular study (ragged trials) as a structured error (adversarial)", async () => {
    const r = await call(server, "msa_analyze", {
      measurements: [
        [[10, 10], [10, 10]],
        [[20, 20], [20]], // part2/appraiser2 has only 1 trial — ragged
      ],
    });
    expect(r.ok).toBe(false);
    expect(JSON.stringify(r.data).toLowerCase()).toMatch(/rectangular|inconsistent|invalid_msa_study/);
  });

  it("msa_analyze action is wired (z.enum + case) and returns a valid graded result", async () => {
    const r = await call(server, "msa_analyze", { measurements: [[[1, 2], [1, 2]], [[3, 4], [3, 4]]] });
    expect(r.ok).toBe(true);
    expect(["acceptable", "marginal", "unacceptable"]).toContain(r.data.verdict);
  });
});
