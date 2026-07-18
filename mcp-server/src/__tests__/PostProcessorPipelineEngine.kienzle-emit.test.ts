/**
 * PostProcessorPipelineEngine — Kienzle emit regression (U-PP-KIENZLE-EMIT-REGRESSION)
 *
 * Locks the contract that the post-processor pipeline's Phase-1 (Stage 1.1
 * `1.1_base_speed_feed`) emits cutting forces that are EXACTLY the canonical
 * `kienzleForce()` of the constants it reports it used — and that the base
 * specific-cutting-force `kc1.1` is SOURCED from `CANONICAL_KIENZLE` /
 * `material.kc1_1`, never from a divergent inline table.
 *
 * WHY this matters (R9 — tests verify intent, not behavior):
 *   2026-06-23 oscar shipped a fix for `ProductEngine.sfcCalculate` which had
 *   carried its OWN inline MATERIAL_HARDNESS table whose kc1.1 / Taylor-C
 *   DIVERGED from `src/physics/constants.ts` — publishing tool life ~4x too
 *   short to a customer page while every isolated identity test stayed green
 *   (see CLAUDE.md ## Recent regressions, [[reference_oscar_sfc_material_table_divergence_2026_06_23]]).
 *   The PostProcessorPipelineEngine is the post-processor analogue: it emits the
 *   F/S a real machine runs. This suite fails the instant the pipeline's emitted
 *   force stops matching the canonical Kienzle relation of its reported kc1.1/mc,
 *   i.e. the moment someone inlines a divergent constant in the emit path.
 *
 * Contract anchors (read from source, not assumed):
 *   - PostProcessorPipelineEngine.ts:924  kc1_1_base = material.kc1_1 ?? getCanonicalKc(iso)
 *   - PostProcessorPipelineEngine.ts:980  kc1_1 = kc1_1_base × K_coolant × K_coating × K_gamma × K_kappa × K_wear × K_edge
 *   - PostProcessorPipelineEngine.ts:1219 finalFc = kienzleForce(kc1_1, mc, max(0.1, blockAp), max(0.001, finalFz))
 *   - PostProcessorPipelineEngine.ts:1232 block.forces = { Fc_N: finalFc, power_kW: cuttingPower(finalFc, finalVc), ... }
 *   - PostProcessorPipelineEngine.ts:1250 stage data returns { kc1_1, mc, correction_factors: { kc1_1_base, kc1_1_corrected } }
 *   - blockAp = |cut_z − prev_z|  (PostProcessorPipelineEngine.ts:1140) — deterministic from the supplied block geometry.
 */

import { describe, it, expect } from "vitest";
import {
  postProcessorPipelineEngine,
  type PipelineInput,
  type PipelineOutput,
  type StageConfig,
  type ToolContext,
} from "../engines/PostProcessorPipelineEngine.js";
import { CANONICAL_KIENZLE, kienzleForce, cuttingPower, type ISOGroup } from "../physics/constants.js";

// ── Fixtures ─────────────────────────────────────────────────────────

/**
 * A geometrically/physically NEUTRAL carbide end mill: every Kienzle
 * correction factor (K_gamma, K_kappa, K_wear, K_edge, K_coating) collapses to
 * 1.0 so the corrected kc1.1 equals kc1_1_base exactly.
 *   rake 6° → K_gamma=1 · lead 45° → K_kappa=1 · VB=0 → K_wear=1 · edge=0 → K_edge=1 · uncoated → K_coating=1
 */
const NEUTRAL_TOOL: ToolContext = {
  id: "1",
  catalog_id: "TEST-EM-10",
  manufacturer: "TEST",
  type: "flat_endmill",
  diameter_mm: 10,
  flute_count: 4,
  flute_length_mm: 30,
  overall_length_mm: 75,
  corner_radius_mm: 0,
  material: "carbide",
  coating: "uncoated",
  rake_angle_deg: 6,
  lead_angle_deg: 45,
  wear_VB_mm: 0,
  edge_radius_um: 0,
  resolution_confidence: 1,
};

/**
 * Disable every downstream stage that would mutate `block.forces` after Stage
 * 1.1 (constitutive thermal softening 1.2, Phase-2 engagement/chip-thinning/
 * thermal/wear, Phase-4 tolerance derating) so the emitted Fc_N is exactly the
 * Stage-1.1 canonical kienzleForce() output. `speed_feed` is left ON (default).
 */
const DOWNSTREAM_OFF: Partial<StageConfig> = {
  calibration: false,
  constitutive: false,
  stability_lobes: false,
  spindle_harmonics: false,
  tool_deflection: false,
  chip_morphology: false,
  coolant_strategy: false,
  fixture_check: false,
  capability_forecast: false,
  line_by_line_adaptive: false,
  engagement_analysis: false,
  chip_thinning: false,
  adaptive_feed: false,
  corner_detection: false,
  plunge_detection: false,
  wear_progression: false,
  thermal_tracking: false,
  coupled_thermal_wear: false,
  deflection_limit: false,
  thread_milling_physics: false,
  stability_rewrite: false,
  toolpath_smoothing: false,
  motion_dynamics: false,
  look_ahead: false,
  multi_axis: false,
  controller_features: false,
  machine_error_comp: false,
  monte_carlo: false,
  uncertainty_propagation: false,
  dimensional_verification: false,
  surface_finish_verification: false,
  environmental: false,
  batch_variability: false,
  robustness_score: false,
};

/**
 * Build a single-cut job: a G0 positioning move to `rapidZ` (sets prev-Z) then
 * one G1 cut to `cutZ`. The Phase-1 axial depth becomes |cutZ − rapidZ|.
 */
function makeInput(opts: {
  iso: ISOGroup;
  /**
   * When supplied, the material is a fully-resolved MaterialContext (has `id`)
   * and `_resolveContexts` uses it VERBATIM (PostProcessorPipelineEngine.ts:4238)
   * — kc1_1/mc are NOT re-canonicalized. When omitted, the by-name resolution
   * path runs and an unmatched synthetic name falls back to CANONICAL_KIENZLE[iso].
   */
  id?: string;
  kc1_1?: number;
  mc?: number;
  rapidZ?: number;
  cutZ?: number;
  feed?: number;
  rpm?: number;
  /** Override fields on NEUTRAL_TOOL to exercise non-1.0 Kienzle correction factors. */
  toolOverrides?: Partial<ToolContext>;
}): PipelineInput {
  const rapidZ = opts.rapidZ ?? 5;
  const cutZ = opts.cutZ ?? 3;
  return {
    blocks: [
      { id: 0, move_type: "G0", x: 0, y: 0, z: rapidZ, tool_number: 1 },
      {
        id: 1,
        move_type: "G1",
        x: 20,
        y: 0,
        z: cutZ,
        feed_mm_min: opts.feed ?? 400,
        spindle_rpm: opts.rpm ?? 3000,
        tool_number: 1,
      },
    ],
    material: {
      ...(opts.id !== undefined ? { id: opts.id, resolution_confidence: 1 } : {}),
      name: `TEST-${opts.iso}-SYN`,
      iso_group: opts.iso,
      ...(opts.kc1_1 !== undefined ? { kc1_1: opts.kc1_1 } : {}),
      ...(opts.mc !== undefined ? { mc: opts.mc } : {}),
    } as any,
    tools: [{ ...NEUTRAL_TOOL, ...(opts.toolOverrides ?? {}) }],
    controller: "fanuc",
    aggressiveness: 0.5,
    stages: DOWNSTREAM_OFF,
  };
}

function stage11(out: PipelineOutput): { kc1_1: number; mc: number; correction_factors: any } {
  const s = out.stages.find((st) => st.stage === "1.1_base_speed_feed");
  if (!s) throw new Error("Stage 1.1_base_speed_feed not present in pipeline output");
  // Localize a real Stage-1.1 failure: "skipped"/"fail" both yield data:null and
  // would otherwise only surface one line later as a destructure error.
  expect(s.status).not.toBe("skipped");
  expect(s.status).not.toBe("fail");
  return s.data as any;
}

function cuttingBlock(out: PipelineOutput) {
  const b = out.blocks.find((blk) => blk.move_type === "G1" && blk.forces && blk.forces.Fc_N > 0);
  if (!b) throw new Error("No emitted cutting block with positive Fc_N");
  return b;
}

// Axial depth the Phase-1 loop derives for the default makeInput geometry.
const DEFAULT_AP_MM = 2.0; // |cutZ 3 − rapidZ 5|

// ── Tests ────────────────────────────────────────────────────────────

describe("PostProcessorPipelineEngine — Kienzle emit regression (U-PP-KIENZLE-EMIT-REGRESSION)", () => {
  describe("emitted force == canonical kienzleForce of reported constants (happy path)", () => {
    it("reproduces block.forces.Fc_N exactly from the pipeline's own kc1.1/mc + emitted feed/rpm", async () => {
      const out = await postProcessorPipelineEngine.process(makeInput({ iso: "P", kc1_1: 1800, mc: 0.25 }));
      const { kc1_1, mc } = stage11(out);
      const cut = cuttingBlock(out);
      const flutes = out.resolved.tools[0]?.flute_count ?? NEUTRAL_TOOL.flute_count;

      const fz = cut.feed_mm_min! / (cut.spindle_rpm! * flutes);
      const expectedFc = kienzleForce(kc1_1, mc, Math.max(0.1, DEFAULT_AP_MM), Math.max(0.001, fz));

      // Exact: same fn, same reported constants, same emitted geometry.
      expect(cut.forces!.Fc_N).toBeCloseTo(expectedFc, 4);
      expect(Number.isFinite(cut.forces!.Fc_N)).toBe(true);
      expect(cut.forces!.Fc_N).toBeGreaterThan(0);
    });
  });

  describe("inline-divergence guard — kc1.1 is sourced, never shadowed (the oscar-class catch)", () => {
    it("honors a fully-resolved MaterialContext.kc1_1 verbatim as kc1_1_base (no canonical shadowing)", async () => {
      // 1144 free-machining steel kc1.1 = 1850, distinct from canonical P=1800.
      // `id` makes this a verbatim MaterialContext (PostProcessorPipelineEngine.ts:4238),
      // so the supplied 1850 must flow through unchanged — proving the emit path reads the
      // material's specific cutting force and does not silently overwrite it with an inline value.
      const out = await postProcessorPipelineEngine.process(
        makeInput({ iso: "P", id: "test-1144-steel", kc1_1: 1850, mc: 0.25 }),
      );
      const { kc1_1, correction_factors } = stage11(out);
      expect(correction_factors.kc1_1_base).toBeCloseTo(1850, 6);
      // Neutral tool ⇒ every correction factor is 1.0 ⇒ corrected == base.
      expect(correction_factors.K_gamma).toBeCloseTo(1.0, 6);
      expect(correction_factors.K_kappa).toBeCloseTo(1.0, 6);
      expect(correction_factors.K_wear).toBeCloseTo(1.0, 6);
      expect(correction_factors.K_edge).toBeCloseTo(1.0, 6);
      expect(correction_factors.K_coating).toBeCloseTo(1.0, 6);
      expect(kc1_1).toBeCloseTo(1850, 6);
    });

    it("falls back to CANONICAL_KIENZLE per ISO group — distinct values, not one hardcoded constant", async () => {
      const groups: ISOGroup[] = ["P", "M", "K"];
      const bases: number[] = [];
      for (const iso of groups) {
        // No material.kc1_1 supplied → engine MUST source the canonical value.
        const out = await postProcessorPipelineEngine.process(makeInput({ iso }));
        const { correction_factors } = stage11(out);
        const resolvedKc = (out.resolved.material as any)?.kc1_1;
        const expectedBase = resolvedKc ?? CANONICAL_KIENZLE[iso].kc1_1;
        expect(correction_factors.kc1_1_base).toBeCloseTo(expectedBase, 6);
        bases.push(correction_factors.kc1_1_base);
      }
      // Per-ISO sourcing, not a single inlined kc: P(1800) ≠ M(2100) ≠ K(1100).
      expect(new Set(bases).size).toBe(3);
      expect(bases[1]).toBeGreaterThan(bases[0]); // M kc1.1 > P kc1.1
      expect(bases[2]).toBeLessThan(bases[0]); // K kc1.1 < P kc1.1
    });
  });

  describe("Kienzle correction-factor composition (kc1_1_corrected = base × ∏K)", () => {
    it("applies the canonical coating + flank-wear factors to the verbatim base (TiAlN×worn)", async () => {
      // Non-neutral tool: TiAlN coating ⇒ K_coating=0.85 (engine COATING_K table),
      // flank wear VB=0.3mm ⇒ K_wear = 1 + 0.5·(0.3/0.3) = 1.5; rake 6°/lead 45°/edge 0 stay neutral.
      // Verbatim MaterialContext (has id) so kc1_1_base = 1800 exactly.
      const out = await postProcessorPipelineEngine.process(
        makeInput({
          iso: "P",
          id: "test-1045-coated",
          kc1_1: 1800,
          mc: 0.25,
          toolOverrides: { coating: "TiAlN", wear_VB_mm: 0.3 },
        }),
      );
      const { kc1_1, mc, correction_factors } = stage11(out);

      // Each correction factor matches its formula's reference value (catches a divergent K table).
      expect(correction_factors.kc1_1_base).toBeCloseTo(1800, 6);
      expect(correction_factors.K_coating).toBeCloseTo(0.85, 6);
      expect(correction_factors.K_wear).toBeCloseTo(1.5, 6);
      expect(correction_factors.K_gamma).toBeCloseTo(1.0, 6);
      expect(correction_factors.K_kappa).toBeCloseTo(1.0, 6);
      expect(correction_factors.K_edge).toBeCloseTo(1.0, 6);
      expect(correction_factors.K_coolant).toBeCloseTo(1.0, 6);

      // Composition is the full product: 1800 × 0.85 × 1.5 = 2295.
      expect(correction_factors.kc1_1_corrected).toBeCloseTo(1800 * 0.85 * 1.5, 4);
      expect(kc1_1).toBeCloseTo(2295, 4);

      // The emitted force tracks the CORRECTED kc1.1 (not the base) — a worn/coated tool
      // changes the emitted cut, so this proves the composition reaches the machine output.
      const cut = cuttingBlock(out);
      const flutes = out.resolved.tools[0]?.flute_count ?? NEUTRAL_TOOL.flute_count;
      const fz = Math.max(0.001, cut.feed_mm_min! / (cut.spindle_rpm! * flutes));
      expect(cut.forces!.Fc_N).toBeCloseTo(kienzleForce(kc1_1, mc, Math.max(0.1, DEFAULT_AP_MM), fz), 4);
    });
  });

  describe("Kienzle algebraic invariants (failure modes)", () => {
    it("reconstructs the effective kc1.1 from the emitted force (pins the 1−mc exponent)", async () => {
      const out = await postProcessorPipelineEngine.process(makeInput({ iso: "P", kc1_1: 1800, mc: 0.25 }));
      const { kc1_1, mc } = stage11(out);
      const cut = cuttingBlock(out);
      const flutes = out.resolved.tools[0]?.flute_count ?? NEUTRAL_TOOL.flute_count;
      const fz = Math.max(0.001, cut.feed_mm_min! / (cut.spindle_rpm! * flutes));

      // Kienzle: Fc = kc1.1 · ap · fz^(1−mc)  ⇒  kc1.1 = Fc / (ap · fz^(1−mc)).
      // A wrong exponent (e.g. fz^1 or fz^mc) would make this reconstruction diverge.
      const reconstructed = cut.forces!.Fc_N / (Math.max(0.1, DEFAULT_AP_MM) * Math.pow(fz, 1 - mc));
      expect(reconstructed).toBeCloseTo(kc1_1, 2);
    });

    it("force is monotonic-increasing in axial depth (Fc ∝ ap)", async () => {
      // ap = 1.0  (cutZ 4, rapidZ 5)   vs   ap = 3.0  (cutZ 2, rapidZ 5)
      const shallow = await postProcessorPipelineEngine.process(
        makeInput({ iso: "P", kc1_1: 1800, mc: 0.25, rapidZ: 5, cutZ: 4 }),
      );
      const deep = await postProcessorPipelineEngine.process(
        makeInput({ iso: "P", kc1_1: 1800, mc: 0.25, rapidZ: 5, cutZ: 2 }),
      );
      const fShallow = cuttingBlock(shallow).forces!.Fc_N;
      const fDeep = cuttingBlock(deep).forces!.Fc_N;
      expect(fDeep).toBeGreaterThan(fShallow);
    });
  });

  describe("adversarial inputs", () => {
    it("floors a degenerate zero-depth cut (cutZ == rapidZ) — force stays finite & positive", async () => {
      // blockAp = |z − prevZ| = 0 → engine floors to max(0.1, 0) = 0.1 (no NaN/Inf).
      const out = await postProcessorPipelineEngine.process(
        makeInput({ iso: "P", kc1_1: 1800, mc: 0.25, rapidZ: 4, cutZ: 4 }),
      );
      const { kc1_1, mc } = stage11(out);
      const cut = cuttingBlock(out);
      const flutes = out.resolved.tools[0]?.flute_count ?? NEUTRAL_TOOL.flute_count;
      const fz = Math.max(0.001, cut.feed_mm_min! / (cut.spindle_rpm! * flutes));

      expect(Number.isFinite(cut.forces!.Fc_N)).toBe(true);
      expect(cut.forces!.Fc_N).toBeGreaterThan(0);
      // Floored ap = 0.1 reproduces exactly.
      expect(cut.forces!.Fc_N).toBeCloseTo(kienzleForce(kc1_1, mc, 0.1, fz), 4);
    });

    it("emitted power_kW is the canonical cuttingPower(Fc, Vc), not an inline product", async () => {
      const out = await postProcessorPipelineEngine.process(makeInput({ iso: "P", kc1_1: 1800, mc: 0.25 }));
      const cut = cuttingBlock(out);
      const D = out.resolved.tools[0]?.diameter_mm ?? NEUTRAL_TOOL.diameter_mm;
      const finalVc = (cut.spindle_rpm! * Math.PI * D) / 1000;

      expect(cut.forces!.power_kW).toBeCloseTo(cuttingPower(cut.forces!.Fc_N, finalVc), 4);
      expect(cut.forces!.power_kW).toBeGreaterThan(0);
    });
  });
});
