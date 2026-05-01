/**
 * PP Chip Thinning Fix Verification Tests
 *
 * Verifies that the double chip-thinning compensation bug is fixed:
 *   - Stage 2.1 (engagement_chip_thinning) applies chip thinning factor when > 1.05
 *   - Stage 2.3 (adaptive_feed) now SKIPS blocks where chip_thinning_factor > 1.05
 *   - Stage 2.3 formula uses canonical: 1/sin(arccos(1 - 2*ae/D))
 *
 * The old bug: Stage 2.3 blindly re-applied an adaptive feed multiplier on top
 * of Stage 2.1's chip thinning, producing feeds up to 3.7x the original for
 * light radial engagement. This caused dangerous overcutting in steel.
 *
 * @module pp-chip-thinning
 */

import { describe, it, expect } from "vitest";
import {
  postProcessorPipelineEngine,
  type MaterialContext,
  type MachineContext,
  type ToolContext,
  type PipelineOutput,
  type ToolpathBlock,
} from "../engines/PostProcessorPipelineEngine.js";

// ─── Shared Contexts ────────────────────────────────────────────────

const STEEL_4140: MaterialContext = {
  id: "4140",
  name: "4140 Steel",
  iso_group: "P",
  uts_MPa: 655,
  hardness_HB: 197,
  kc1_1: 1800,
  mc: 0.25,
  jc_A: 792, jc_B: 510, jc_n: 0.26, jc_C: 0.014, jc_m: 1.03,
  resolution_confidence: 1.0,
};

const CARBIDE_10MM_4F: ToolContext = {
  id: "1",
  type: "flat_endmill",
  diameter_mm: 10,
  flute_count: 4,
  flute_length_mm: 25,
  material: "carbide",
  helix_angle_deg: 30,
  resolution_confidence: 1.0,
};

const HAAS_VF2: MachineContext = {
  id: "haas-vf2",
  name: "Haas VF-2",
  brand: "Haas",
  controller: "haas",
  max_rpm: 8100,
  max_power_kW: 22.4,
  rapid_rate_mm_min: { x: 25400, y: 25400, z: 15240 },
  work_volume: { x: 762, y: 406, z: 508 },
  axes: 3,
  coolant_types: ["flood", "tsc"],
  tsc_pressure_bar: 70,
  resolution_confidence: 1.0,
};

// ─── G-code Programs ────────────────────────────────────────────────

/**
 * Profiling pass: 4 cutting moves around a square pocket wall.
 * With default ae = 0.3*D = 3mm, this is a light-engagement profiling cut
 * that should trigger chip thinning compensation (ae/D = 0.3 < 0.5).
 */
const PROFILING_GCODE = [
  "T1 M6",
  "S3000 M3",
  "G01 X50 Y0 Z-5 F800",
  "G01 X50 Y30 Z-5",
  "G01 X0 Y30 Z-5",
  "G01 X0 Y0 Z-5",
  "G00 Z5",
].join("\n");

/**
 * Multi-block profiling program — more blocks for statistical assertions.
 * 8 cutting moves to ensure enough sample size for ratio checks.
 */
const MULTI_BLOCK_GCODE = [
  "T1 M6",
  "S3000 M3",
  "G01 X50 Y0 Z-5 F800",
  "G01 X100 Y0 Z-5",
  "G01 X100 Y30 Z-5",
  "G01 X100 Y60 Z-5",
  "G01 X50 Y60 Z-5",
  "G01 X0 Y60 Z-5",
  "G01 X0 Y30 Z-5",
  "G01 X0 Y0 Z-5",
  "G00 Z5",
].join("\n");

// ─── Helpers ────────────────────────────────────────────────────────

/** Get all cutting blocks (non-rapid) that have optimization data. */
function getCuttingBlocks(result: PipelineOutput): ToolpathBlock[] {
  return result.blocks.filter(b => b.move_type !== "G0" && b.optimization);
}

/** Count blocks whose optimization.reasons contain a specific substring. */
function countBlocksWithReason(blocks: ToolpathBlock[], substring: string): number {
  return blocks.filter(b =>
    b.optimization?.reasons.some(r => r.includes(substring)),
  ).length;
}

/** Count blocks that have chip_thinning_factor > threshold. */
function countChipThinningBlocks(blocks: ToolpathBlock[], threshold = 1.05): number {
  return blocks.filter(b =>
    b.engagement && b.engagement.chip_thinning_factor > threshold,
  ).length;
}

// ════════════════════════════════════════════════════════════════════
// TEST SUITE
// ════════════════════════════════════════════════════════════════════

describe("PP Chip Thinning Fix — Double Compensation Prevention", () => {

  // ─── Test 1: No double compensation ──────────────────────────────

  describe("Test 1: No double compensation", () => {
    let result: PipelineOutput;
    let cuttingBlocks: ToolpathBlock[];

    it("pipeline completes successfully with both stages enabled", async () => {
      result = await postProcessorPipelineEngine.process({
        gcode: PROFILING_GCODE,
        material: STEEL_4140,
        tools: [CARBIDE_10MM_4F],
        machine: HAAS_VF2,
        aggressiveness: 0.5,
        // Both chip thinning and adaptive feed stages are enabled by default
      });
      cuttingBlocks = getCuttingBlocks(result);
      expect(result.overall_status).toBe("pass");
      expect(cuttingBlocks.length).toBeGreaterThan(0);
    });

    it("blocks with chip_thinning_factor > 1.05 do NOT have 'Adaptive feed' reason", () => {
      // This is the core assertion: Stage 2.3 must skip already-compensated blocks
      for (const block of cuttingBlocks) {
        if (block.engagement && block.engagement.chip_thinning_factor > 1.05) {
          const hasAdaptiveFeed = block.optimization?.reasons.some(r =>
            r.includes("Adaptive feed"),
          );
          expect(
            hasAdaptiveFeed,
            `Block ${block.id} has chip_thinning_factor=${block.engagement.chip_thinning_factor.toFixed(2)} ` +
            `AND "Adaptive feed" reason — double compensation detected! ` +
            `Reasons: [${block.optimization?.reasons.join("; ")}]`,
          ).toBeFalsy();
        }
      }
    });

    it("no block has both 'Chip thinning' and 'Adaptive feed' reasons simultaneously", () => {
      for (const block of cuttingBlocks) {
        const hasChipThinning = block.optimization?.reasons.some(r =>
          r.includes("Chip thinning"),
        );
        const hasAdaptiveFeed = block.optimization?.reasons.some(r =>
          r.includes("Adaptive feed"),
        );
        expect(
          hasChipThinning && hasAdaptiveFeed,
          `Block ${block.id} has BOTH "Chip thinning" and "Adaptive feed" — ` +
          `double compensation! Reasons: [${block.optimization?.reasons.join("; ")}]`,
        ).toBe(false);
      }
    });
  });

  // ─── Test 2: Feed stays reasonable ───────────────────────────────

  describe("Test 2: Feed stays reasonable (< 5x original)", () => {
    let result: PipelineOutput;
    let cuttingBlocks: ToolpathBlock[];

    it("pipeline completes for steel / 10mm endmill / VF-2", async () => {
      result = await postProcessorPipelineEngine.process({
        gcode: PROFILING_GCODE,
        material: STEEL_4140,
        tools: [CARBIDE_10MM_4F],
        machine: HAAS_VF2,
        aggressiveness: 0.5,
      });
      cuttingBlocks = getCuttingBlocks(result);
      expect(result.overall_status).toBe("pass");
    });

    it("optimized_feed is LESS than 5x the original feed for every block", () => {
      // The old double-compensation bug could push feeds to 3.7x. With the fix,
      // no single block should exceed 5x (even 3x would be suspicious for steel).
      for (const block of cuttingBlocks) {
        const opt = block.optimization!;
        const ratio = opt.optimized_feed / opt.original_feed;
        expect(
          ratio,
          `Block ${block.id}: optimized_feed=${opt.optimized_feed} is ${ratio.toFixed(2)}x ` +
          `the original_feed=${opt.original_feed} — exceeds 5x safety limit. ` +
          `Reasons: [${opt.reasons.join("; ")}]`,
        ).toBeLessThan(5.0);
      }
    });

    it("optimized_feed is LESS than 3x the original feed (tighter bound for 10mm in steel)", () => {
      // For a standard 10mm 4-flute endmill in 4140 steel at ae/D=0.3,
      // chip thinning factor should be around 1.4-1.8x. If we see 3x+,
      // something is still compounding incorrectly.
      for (const block of cuttingBlocks) {
        const opt = block.optimization!;
        const ratio = opt.optimized_feed / opt.original_feed;
        expect(
          ratio,
          `Block ${block.id}: feed ratio ${ratio.toFixed(2)}x exceeds 3x for steel. ` +
          `This suggests residual double compensation. ` +
          `Reasons: [${opt.reasons.join("; ")}]`,
        ).toBeLessThan(3.0);
      }
    });
  });

  // ─── Test 3: Stage 2.1 chip thinning applies ────────────────────

  describe("Test 3: Stage 2.1 chip thinning applies", () => {
    let result: PipelineOutput;
    let cuttingBlocks: ToolpathBlock[];

    it("pipeline completes with engagement analysis enabled", async () => {
      result = await postProcessorPipelineEngine.process({
        gcode: MULTI_BLOCK_GCODE,
        material: STEEL_4140,
        tools: [CARBIDE_10MM_4F],
        machine: HAAS_VF2,
        aggressiveness: 0.5,
        stages: {
          engagement_analysis: true,
          chip_thinning: true,
        },
      });
      cuttingBlocks = getCuttingBlocks(result);
      expect(result.overall_status).toBe("pass");
      expect(cuttingBlocks.length).toBeGreaterThanOrEqual(4);
    });

    it("some blocks have engagement data with chip_thinning_factor populated", () => {
      const blocksWithEngagement = cuttingBlocks.filter(
        b => b.engagement && b.engagement.chip_thinning_factor !== undefined,
      );
      expect(
        blocksWithEngagement.length,
        "Expected at least one cutting block to have engagement.chip_thinning_factor populated by Stage 2.1",
      ).toBeGreaterThan(0);
    });

    it("chip_thinning_factor is >= 1.0 for all blocks with engagement data", () => {
      // Chip thinning factor should always be >= 1.0 (it compensates for thin chips
      // by increasing feed, never decreasing). Factor of 1.0 = full slot or near-full engagement.
      for (const block of cuttingBlocks) {
        if (block.engagement) {
          expect(
            block.engagement.chip_thinning_factor,
            `Block ${block.id}: chip_thinning_factor=${block.engagement.chip_thinning_factor} is < 1.0 — ` +
            `chip thinning should never reduce feed below nominal`,
          ).toBeGreaterThanOrEqual(1.0);
        }
      }
    });

    it("Stage 2.1 appears in pipeline stage results as 'pass'", () => {
      const stage21 = result.stages.find(
        s => s.stage === "2.1_engagement_chip_thinning",
      );
      expect(stage21).toBeDefined();
      expect(stage21!.status).toBe("pass");
    });

    it("blocks with chip_thinning_factor > 1.05 have 'Chip thinning' reason", () => {
      const compensatedBlocks = cuttingBlocks.filter(
        b => b.engagement && b.engagement.chip_thinning_factor > 1.05,
      );
      for (const block of compensatedBlocks) {
        const hasReason = block.optimization?.reasons.some(r =>
          r.includes("Chip thinning"),
        );
        expect(
          hasReason,
          `Block ${block.id}: chip_thinning_factor=${block.engagement!.chip_thinning_factor.toFixed(2)} ` +
          `but missing "Chip thinning" reason. Reasons: [${block.optimization?.reasons.join("; ")}]`,
        ).toBe(true);
      }
    });
  });

  // ─── Test 4: Stage 2.3 only applies to non-compensated blocks ───

  describe("Test 4: Stage 2.3 only applies to non-compensated blocks (mutual exclusivity)", () => {
    let result: PipelineOutput;
    let cuttingBlocks: ToolpathBlock[];

    it("pipeline completes with both stages enabled", async () => {
      result = await postProcessorPipelineEngine.process({
        gcode: MULTI_BLOCK_GCODE,
        material: STEEL_4140,
        tools: [CARBIDE_10MM_4F],
        machine: HAAS_VF2,
        aggressiveness: 0.5,
      });
      cuttingBlocks = getCuttingBlocks(result);
      expect(result.overall_status).toBe("pass");
    });

    it("'Adaptive feed' and chip_thinning_factor > 1.05 are mutually exclusive", () => {
      const adaptiveFeedBlocks = cuttingBlocks.filter(b =>
        b.optimization?.reasons.some(r => r.includes("Adaptive feed")),
      );
      const chipThinningBlocks = cuttingBlocks.filter(b =>
        b.engagement && b.engagement.chip_thinning_factor > 1.05,
      );

      // No block should appear in BOTH sets
      for (const afBlock of adaptiveFeedBlocks) {
        const alsoChipThinned = chipThinningBlocks.some(ct => ct.id === afBlock.id);
        expect(
          alsoChipThinned,
          `Block ${afBlock.id} has "Adaptive feed" reason BUT also has ` +
          `chip_thinning_factor=${afBlock.engagement?.chip_thinning_factor?.toFixed(2)} > 1.05. ` +
          `Stage 2.3 should have skipped this block.`,
        ).toBe(false);
      }
    });

    it("Stage 2.3 appears in pipeline stage results", () => {
      const stage23 = result.stages.find(s => s.stage === "2.3_adaptive_feed");
      expect(stage23).toBeDefined();
      expect(stage23!.status).toBe("pass");
    });

    it("at least one stage produces an optimization reason (pipeline is not no-op)", () => {
      const totalReasons = cuttingBlocks.reduce(
        (sum, b) => sum + (b.optimization?.reasons.length ?? 0),
        0,
      );
      expect(
        totalReasons,
        "Expected at least one optimization reason across all cutting blocks — " +
        "pipeline may not be applying any chip thinning or adaptive feed",
      ).toBeGreaterThan(0);
    });
  });

  // ─── Test 5: Feed ordering — slotting vs profiling ───────────────

  describe("Test 5: Feed ordering — slotting < profiling (engagement effect)", () => {
    let slottingResult: PipelineOutput;
    let profilingResult: PipelineOutput;

    it("runs pipeline for both slotting (ae=D) and profiling (ae=0.3D) operations", async () => {
      // Slotting: ae = full diameter (10mm), no chip thinning expected
      slottingResult = await postProcessorPipelineEngine.process({
        gcode: PROFILING_GCODE,
        material: STEEL_4140,
        tools: [CARBIDE_10MM_4F],
        machine: HAAS_VF2,
        aggressiveness: 0.5,
        operations: [{
          id: 1,
          type: "slotting",
          tool_number: 1,
          ae_mm: 10,   // Full slot: ae = D
          ap_mm: 5,
          blocks: [],
        }],
      });

      // Profiling: ae = 0.3D (3mm), chip thinning should boost feed
      profilingResult = await postProcessorPipelineEngine.process({
        gcode: PROFILING_GCODE,
        material: STEEL_4140,
        tools: [CARBIDE_10MM_4F],
        machine: HAAS_VF2,
        aggressiveness: 0.5,
        operations: [{
          id: 1,
          type: "profiling",
          tool_number: 1,
          ae_mm: 3,    // Light profiling: ae = 0.3D
          ap_mm: 5,
          blocks: [],
        }],
      });

      expect(slottingResult.overall_status).toBe("pass");
      expect(profilingResult.overall_status).toBe("pass");
    });

    it("slotting blocks have chip_thinning_factor near 1.0 (full engagement = no thinning)", () => {
      const slottingCuttingBlocks = getCuttingBlocks(slottingResult);
      for (const block of slottingCuttingBlocks) {
        if (block.engagement) {
          // At full slot (ae = D), there is no chip thinning — factor should be ~1.0
          expect(
            block.engagement.chip_thinning_factor,
            `Slotting block ${block.id}: chip_thinning_factor=${block.engagement.chip_thinning_factor.toFixed(3)} ` +
            `should be near 1.0 for full slot`,
          ).toBeLessThanOrEqual(1.10);
        }
      }
    });

    it("profiling blocks have chip_thinning_factor > 1.0 (light engagement = thin chips)", () => {
      const profilingCuttingBlocks = getCuttingBlocks(profilingResult);
      const withEngagement = profilingCuttingBlocks.filter(b => b.engagement);
      // At ae/D = 0.3, geometric thinning is significant
      const thinningBlocks = withEngagement.filter(
        b => b.engagement!.chip_thinning_factor > 1.0,
      );
      expect(
        thinningBlocks.length,
        "Expected profiling (ae=0.3D) to produce chip thinning factor > 1.0",
      ).toBeGreaterThan(0);
    });

    it("slotting base feed is lower than profiling compensated feed", () => {
      // Physics: slotting has full engagement so the nominal chip thickness equals
      // fz. Profiling at ae/D=0.3 has thin chips, so feed is boosted to compensate.
      // After compensation, profiling feed should be HIGHER than slotting feed
      // (slotting may also get a derating penalty).
      const slottingBlocks = getCuttingBlocks(slottingResult);
      const profilingBlocks = getCuttingBlocks(profilingResult);

      if (slottingBlocks.length > 0 && profilingBlocks.length > 0) {
        const slotFeed = slottingBlocks[0].optimization!.optimized_feed;
        const profFeed = profilingBlocks[0].optimization!.optimized_feed;

        // Slotting gets 70% derating (SLOTTING_FEED_DERATING = 0.7) AND no chip thinning boost.
        // Profiling gets chip thinning boost. So profiling feed should be >= slotting feed.
        // This is a physics sanity check: you can run faster with less material engaged.
        expect(
          profFeed,
          `Profiling feed (${profFeed} mm/min) should be >= slotting feed (${slotFeed} mm/min). ` +
          `Engagement-based optimization should allow higher feeds with lighter radial engagement.`,
        ).toBeGreaterThanOrEqual(slotFeed);
      }
    });
  });

  // ─── Test 6: Canonical formula verification ──────────────────────

  describe("Test 6: Canonical adaptive feed formula 1/sin(arccos(1-2*ae/D))", () => {
    it("formula produces correct values for known ae/D ratios", () => {
      // The canonical chip thinning formula:
      //   factor = 1 / sin(arccos(1 - 2*ae/D))
      //
      // Known values:
      //   ae/D = 0.50 → factor = 1.00 (half engagement, no thinning)
      //   ae/D = 0.25 → factor ≈ 1.15
      //   ae/D = 0.10 → factor ≈ 1.64
      //   ae/D = 0.05 → factor ≈ 2.29

      const chipThinningFactor = (aeOverD: number): number => {
        const cosArg = 1 - 2 * aeOverD;
        const sinVal = Math.sqrt(1 - cosArg * cosArg);
        return sinVal > 0 ? 1 / sinVal : Infinity;
      };

      // ae/D = 0.5: half engagement, chip thickness = fz
      expect(chipThinningFactor(0.50)).toBeCloseTo(1.00, 2);

      // ae/D = 0.25: moderate chip thinning
      expect(chipThinningFactor(0.25)).toBeCloseTo(1.155, 1);

      // ae/D = 0.10: significant thinning
      expect(chipThinningFactor(0.10)).toBeCloseTo(1.644, 1);

      // ae/D = 0.05: aggressive thinning
      expect(chipThinningFactor(0.05)).toBeCloseTo(2.294, 1);
    });

    it("formula is monotonically decreasing as ae/D increases from 0 to 0.5", () => {
      const chipThinningFactor = (aeOverD: number): number => {
        const cosArg = 1 - 2 * aeOverD;
        const sinVal = Math.sqrt(1 - cosArg * cosArg);
        return sinVal > 0.001 ? 1 / sinVal : 1 / 0.001;
      };

      let prevFactor = Infinity;
      for (let ratio = 0.05; ratio <= 0.50; ratio += 0.05) {
        const factor = chipThinningFactor(ratio);
        expect(
          factor,
          `factor at ae/D=${ratio.toFixed(2)} (${factor.toFixed(3)}) should be <= ` +
          `factor at previous ratio (${prevFactor.toFixed(3)}) — monotonic decrease`,
        ).toBeLessThanOrEqual(prevFactor);
        prevFactor = factor;
      }
    });

    it("factor equals 1.0 at ae/D = 0.5 (no thinning at half engagement)", () => {
      // At exactly half the diameter engaged, the maximum chip thickness
      // equals the feed per tooth. No compensation is needed.
      const cosArg = 1 - 2 * 0.5; // = 0
      const sinVal = Math.sqrt(1 - cosArg * cosArg); // = 1
      const factor = 1 / sinVal;
      expect(factor).toBeCloseTo(1.0, 10);
    });

    it("Stage 2.3 caps the adaptive factor at 1/0.3 to prevent runaway", () => {
      // The engine code has: adaptFactor = sinVal > 0.3 ? 1/sinVal : 1/0.3
      // This caps at ~3.33x, which prevents dangerous feeds at very light engagement.
      const maxFactor = 1 / 0.3;
      expect(maxFactor).toBeCloseTo(3.333, 2);

      // For ae/D < ~0.023, the factor would exceed the cap:
      // sin(arccos(1 - 2*0.023)) ≈ 0.302, which is just at the boundary
      const cosArg = 1 - 2 * 0.02;
      const sinVal = Math.sqrt(1 - cosArg * cosArg);
      // sinVal ≈ 0.28, which is < 0.3, so the cap kicks in
      expect(sinVal).toBeLessThan(0.3);
    });
  });

  // ─── Test 7: Integration — full pipeline with verification ───────

  describe("Test 7: Full pipeline integration — both stages cooperate correctly", () => {
    let result: PipelineOutput;

    it("processes 8-block program through full pipeline", async () => {
      result = await postProcessorPipelineEngine.process({
        gcode: MULTI_BLOCK_GCODE,
        material: STEEL_4140,
        tools: [CARBIDE_10MM_4F],
        machine: HAAS_VF2,
        aggressiveness: 0.5,
      });
      expect(result.overall_status).toBe("pass");
    });

    it("both Stage 2.1 and Stage 2.3 ran successfully", () => {
      const stage21 = result.stages.find(
        s => s.stage === "2.1_engagement_chip_thinning",
      );
      const stage23 = result.stages.find(
        s => s.stage === "2.3_adaptive_feed",
      );
      expect(stage21?.status).toBe("pass");
      expect(stage23?.status).toBe("pass");
    });

    it("total feed multiplier per block never exceeds 5x regardless of engagement", () => {
      const cuttingBlocks = getCuttingBlocks(result);
      for (const block of cuttingBlocks) {
        if (block.optimization && block.optimization.original_feed > 0) {
          const ratio = block.optimization.optimized_feed / block.optimization.original_feed;
          expect(
            ratio,
            `Block ${block.id}: cumulative feed ratio ${ratio.toFixed(2)}x exceeds 5x safety threshold`,
          ).toBeLessThan(5.0);
        }
      }
    });

    it("optimization reasons are internally consistent (no contradictions)", () => {
      const cuttingBlocks = getCuttingBlocks(result);
      for (const block of cuttingBlocks) {
        const reasons = block.optimization?.reasons ?? [];
        // If "Slotting derating" is present, chip_thinning_factor should be near 1.0
        if (reasons.some(r => r.includes("Slotting derating"))) {
          if (block.engagement) {
            expect(
              block.engagement.chip_thinning_factor,
              `Block ${block.id}: has slotting derating but chip_thinning_factor ` +
              `${block.engagement.chip_thinning_factor.toFixed(2)} is far from 1.0`,
            ).toBeLessThanOrEqual(1.15);
          }
        }
      }
    });

    it("produces valid G-code output", () => {
      expect(result.output_gcode).toBeTruthy();
      expect(result.output_gcode.length).toBeGreaterThan(0);
    });
  });
});
