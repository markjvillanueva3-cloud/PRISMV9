/**
 * PostProcessorPipelineEngine — Stage 4.3b dimensional CI-95 advisory (U-PP-CI95-ADVISORY)
 *
 * Wires the previously-dormant dimensional-capability data to the customer: Stage 4.3's
 * DIM_VERIFY warnings fire ONLY on Cpk<1.33, so a capable process surfaced NOTHING. Stage 4.3b
 * (opt-in `stages.dimensional_ci_advisory`, default OFF) ALWAYS surfaces the predicted Cpk + a
 * 95% confidence interval (from the already-computed Stage 4.2 uncertainty / Stage 4.3 Cpk).
 *
 * WHY this matters (R9 — tests verify intent, not behavior):
 *   Opt-in + default OFF is load-bearing: the advisory goes to warnings[] ONLY and must NOT alter
 *   emitted G-code (golden-NC byte-lock stays valid). These tests fail the instant (a) the default
 *   stops being byte-identical, (b) the 999 "assume-capable" sentinel leaks as a real Cpk, (c) the
 *   fail-soft path breaks, or (d) a capable process stops surfacing its confidence.
 *
 * Contract anchors (read from source):
 *   - Stage 4.3 returns { predicted_cpk (999 sentinel when no uncertainty), blocks_at_risk, recommendation }.
 *   - Stage 4.2 returns { max_dim_uncertainty_um } from block.confidence.force_ci_95 (deflection propagation).
 *   - Stage 4.3b: Z_95=1.96; guards cpk>=900 sentinel; warnings.push("CI-95: ... Cpk=… 95%CI=±…mm @ ±…mm tol").
 */

import { describe, it, expect } from "vitest";
import {
  postProcessorPipelineEngine,
  type PipelineInput,
  type PipelineOutput,
} from "../engines/PostProcessorPipelineEngine.js";

/** Build a 2-block job; `inject` adds a tight force_ci_95 so Stage 4.2 yields real uncertainty. */
function makeInput(stages: Record<string, unknown>, inject = false): PipelineInput {
  return {
    blocks: [
      { id: 0, move_type: "G0", x: 0, y: 0, z: 5, tool_number: 1 },
      {
        id: 1,
        move_type: "G1",
        x: 20,
        y: 0,
        z: 3,
        feed_mm_min: 400,
        spindle_rpm: 3000,
        tool_number: 1,
        ...(inject ? { confidence: { force_ci_95: [100, 100.5] } } : {}),
      },
    ] as any,
    material: { name: "TEST-STEEL", iso_group: "P", kc1_1: 1800, mc: 0.25 } as any,
    tools: [
      { id: "1", type: "flat_endmill", diameter_mm: 10, flute_count: 4, material: "carbide", resolution_confidence: 1 } as any,
    ],
    controller: "fanuc",
    tolerance_mm: 0.05,
    aggressiveness: 0.5,
    stages: stages as any,
  };
}

const ci95Lines = (o: PipelineOutput): string[] => o.warnings.filter((w) => w.startsWith("CI-95:"));
const dimVerifyLines = (o: PipelineOutput): string[] => o.warnings.filter((w) => w.startsWith("DIM_VERIFY"));
function stage43b(o: PipelineOutput): { status: string; data: any } {
  const s = o.stages.find((st) => st.stage === "4.3b_dimensional_ci_advisory");
  if (!s) throw new Error("Stage 4.3b_dimensional_ci_advisory not present in output");
  return { status: s.status, data: s.data as any };
}

describe("PostProcessorPipelineEngine — Stage 4.3b dimensional CI-95 advisory", () => {
  it("DEFAULT (flag absent): stage skipped, no CI-95 line", async () => {
    const out = await postProcessorPipelineEngine.process(makeInput({}));
    expect(stage43b(out).status).toBe("skipped");
    expect(ci95Lines(out)).toHaveLength(0);
  });

  it("explicit dimensional_ci_advisory:false is byte-identical to the flag-absent run", async () => {
    const off = await postProcessorPipelineEngine.process(makeInput({ dimensional_ci_advisory: false }));
    const absent = await postProcessorPipelineEngine.process(makeInput({}));
    expect(off.warnings).toEqual(absent.warnings);
    expect(off.output_gcode).toBe(absent.output_gcode);
    expect(ci95Lines(off)).toHaveLength(0);
  });

  it("FAIL-SOFT: ON but no capability chain (4.2/4.3 off) → no CI-95 line, surfaced:false", async () => {
    const out = await postProcessorPipelineEngine.process(makeInput({ dimensional_ci_advisory: true }));
    expect(ci95Lines(out)).toHaveLength(0);
    expect(stage43b(out).data.surfaced).toBe(false);
  });

  it("SENTINEL GUARD: dimensional_verification on but no uncertainty → Cpk 999 sentinel NOT surfaced", async () => {
    // 4.3 with no 4.2 uncertainty returns predicted_cpk=999 ("assume capable"). The advisory must
    // NOT emit "Cpk=999" — it treats >=900 as no-real-data.
    const out = await postProcessorPipelineEngine.process(
      makeInput({ dimensional_verification: true, dimensional_ci_advisory: true }),
    );
    expect(ci95Lines(out)).toHaveLength(0);
    expect(out.warnings.some((w) => w.includes("999"))).toBe(false);
    expect(stage43b(out).data.surfaced).toBe(false);
  });

  it("ON + real capability data: surfaces the predicted Cpk + a 95% CI as a single CI-95 line", async () => {
    const out = await postProcessorPipelineEngine.process(
      makeInput({ uncertainty_propagation: true, dimensional_verification: true, dimensional_ci_advisory: true }, true),
    );
    const lines = ci95Lines(out);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/^CI-95: predicted dimensional capability .*Cpk=\d/);
    expect(lines[0]).toMatch(/95%CI=\+\/-\d+\.\d+mm/);
    expect(lines[0]).toMatch(/@ \+\/-0\.05mm tol/);
    const data = stage43b(out).data;
    expect(data.surfaced).toBe(true);
    expect(typeof data.cpk).toBe("number");
    expect(data.ci95_mm).toBeGreaterThan(0);
  });

  it("VALUE: surfaces confidence even when the process is CAPABLE (no DIM_VERIFY warning present)", async () => {
    // force_ci_95=[100,100.5] @ 0.05mm tol yields Cpk≈1.68 (>=1.33) → 4.3 pushes NO DIM_VERIFY warning,
    // so the CI-95 advisory is the ONLY capability line the operator sees. That is the added value.
    const out = await postProcessorPipelineEngine.process(
      makeInput({ uncertainty_propagation: true, dimensional_verification: true, dimensional_ci_advisory: true }, true),
    );
    expect(dimVerifyLines(out)).toHaveLength(0);
    expect(ci95Lines(out)).toHaveLength(1);
    const data = stage43b(out).data;
    expect(data.cpk).toBeGreaterThanOrEqual(1.33);
  });
});
