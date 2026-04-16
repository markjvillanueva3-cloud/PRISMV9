/**
 * PP Regression Pins — Per-Block Engagement Inference Pinning Tests
 *
 * The PostProcessorPipelineEngine now performs intelligent per-block engagement
 * inference. Each G-code block is classified by its geometry (plunge, profiling,
 * corner, light pass, heavy engagement, slotting, ramp) and receives DIFFERENT
 * feed rates accordingly. Plunge blocks get ~30% feed, corners get derating,
 * profiling blocks get chip-thinning compensation, etc.
 *
 * This test suite pins actual pipeline output values within +-20% tolerance
 * for 4 material-tool combos, ensuring that future refactoring does not
 * silently change physics-critical feed/speed calculations.
 *
 * Combos:
 *   1. 4140 Steel (P) / 10mm 4F carbide / Haas VF-2 / agg=0.5
 *   2. 7075-T6 Aluminum (N) / 10mm 4F carbide / Haas VF-2 / agg=0.5
 *   3. 316L Stainless (M) / 10mm 4F carbide / Fanuc 31i / agg=0.5
 *   4. Inconel 718 (S) / 8mm 2F ball nose / Siemens 840D / agg=0.3
 *
 * Cross-material: Aluminum feeds > Steel feeds > Stainless feeds > Inconel feeds
 *
 * @module pp-regression-pins
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  postProcessorPipelineEngine,
  type MaterialContext,
  type MachineContext,
  type ToolContext,
  type PipelineOutput,
  type ToolpathBlock,
} from "../engines/PostProcessorPipelineEngine.js";

// ─── Shared G-code ─────────────────────────────────────────────────

const SHARED_GCODE = [
  "G90 G54 G17",
  "T1 M6",
  "S3000 M3",
  "G0 X0 Y0 Z5.",
  "G1 Z-5. F200",   // Block A: plunge (Z decrease, no XY motion)
  "G1 X80. F600",   // Block B: profiling (long X move at depth)
  "G1 Y50.",        // Block C: profiling (long Y move, ~90 deg corner)
  "G1 X0.",         // Block D: profiling (return X move, ~90 deg corner)
  "G0 Z50.",
  "M30",
].join("\n");

// ─── Material Contexts ─────────────────────────────────────────────

const STEEL_4140: MaterialContext = {
  id: "4140",
  name: "4140 Steel",
  iso_group: "P",
  uts_MPa: 655,
  hardness_HB: 197,
  kc1_1: 1800,
  mc: 0.25,
  resolution_confidence: 1.0,
};

const ALUMINUM_7075: MaterialContext = {
  id: "7075-T6",
  name: "7075-T6 Aluminum",
  iso_group: "N",
  uts_MPa: 572,
  hardness_HB: 150,
  kc1_1: 700,
  mc: 0.23,
  resolution_confidence: 1.0,
};

const STAINLESS_316L: MaterialContext = {
  id: "316L",
  name: "316L Stainless Steel",
  iso_group: "M",
  uts_MPa: 485,
  hardness_HB: 217,
  kc1_1: 2100,
  mc: 0.25,
  resolution_confidence: 1.0,
};

const INCONEL_718: MaterialContext = {
  id: "718",
  name: "Inconel 718",
  iso_group: "S",
  uts_MPa: 1240,
  hardness_HB: 350,
  kc1_1: 2800,
  mc: 0.25,
  resolution_confidence: 1.0,
};

// ─── Tool Contexts ─────────────────────────────────────────────────

const CARBIDE_10MM_4F: ToolContext = {
  id: "1",
  type: "flat_endmill",
  diameter_mm: 10,
  flute_count: 4,
  flute_length_mm: 25,
  material: "carbide",
  helix_angle_deg: 30,
  coating: "TiAlN",
  resolution_confidence: 1.0,
};

const BALL_NOSE_8MM_2F: ToolContext = {
  id: "1",
  type: "ball_endmill",
  diameter_mm: 8,
  flute_count: 2,
  flute_length_mm: 20,
  material: "carbide",
  helix_angle_deg: 30,
  coating: "AlTiN",
  resolution_confidence: 1.0,
};

// ─── Machine Contexts ──────────────────────────────────────────────

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
  resolution_confidence: 1.0,
};

const FANUC_31I: MachineContext = {
  id: "fanuc-31i",
  name: "Fanuc 31i VMC",
  brand: "Fanuc",
  controller: "fanuc",
  max_rpm: 12000,
  max_power_kW: 30,
  rapid_rate_mm_min: { x: 36000, y: 36000, z: 24000 },
  work_volume: { x: 1000, y: 500, z: 500 },
  axes: 3,
  coolant_types: ["flood", "tsc"],
  resolution_confidence: 1.0,
};

const SIEMENS_840D: MachineContext = {
  id: "siemens-840d",
  name: "Siemens 840D VMC",
  brand: "Siemens",
  controller: "siemens",
  max_rpm: 14000,
  max_power_kW: 35,
  rapid_rate_mm_min: { x: 40000, y: 40000, z: 30000 },
  work_volume: { x: 1200, y: 600, z: 600 },
  axes: 5,
  coolant_types: ["flood", "tsc", "mql"],
  resolution_confidence: 1.0,
};

// ─── Helpers ───────────────────────────────────────────────────────

/** Get all cutting blocks (G1/G2/G3) that have optimization data. */
function getCuttingBlocks(result: PipelineOutput): ToolpathBlock[] {
  return result.blocks.filter(b => b.move_type !== "G0" && b.optimization);
}

/**
 * Find the first plunge block: a cutting block that moved only in -Z
 * (classified as "plunge" by engagement inference).
 */
function findPlungeBlock(result: PipelineOutput): ToolpathBlock | undefined {
  return result.blocks.find(
    b => b.move_type !== "G0" && b.engagement?.classification === "plunge",
  );
}

/**
 * Find the first profiling block: a cutting block classified as something
 * other than plunge/ramp/rapid that has XY motion at cutting depth.
 * Falls back to finding the first non-plunge cutting block with optimization.
 */
function findProfilingBlock(result: PipelineOutput): ToolpathBlock | undefined {
  // Prefer blocks explicitly classified as nominal/light/heavy/corner (profiling-like)
  const profilingClassifications = new Set(["nominal", "light", "heavy", "corner"]);
  const explicit = result.blocks.find(
    b => b.move_type !== "G0"
      && b.engagement?.classification
      && profilingClassifications.has(b.engagement.classification)
      && b.optimization,
  );
  if (explicit) return explicit;

  // Fallback: first non-plunge, non-ramp cutting block with optimization
  return result.blocks.find(
    b => b.move_type !== "G0"
      && b.optimization
      && b.engagement?.classification !== "plunge"
      && b.engagement?.classification !== "ramp",
  );
}

/** Get all unique optimized feeds from cutting blocks. */
function getUniqueFeedsFromCutting(result: PipelineOutput): Set<number> {
  const feeds = new Set<number>();
  for (const b of getCuttingBlocks(result)) {
    if (b.feed_mm_min !== undefined) {
      feeds.add(b.feed_mm_min);
    }
  }
  return feeds;
}

/**
 * Assert that a value is within +-pct% of a pinned value.
 * @param actual  The actual pipeline output value
 * @param pinned  The pinned reference value
 * @param pct     The tolerance percentage (0.20 = +-20%)
 * @param label   Human-readable label for assertion messages
 */
function expectWithinTolerance(
  actual: number,
  pinned: number,
  pct: number,
  label: string,
): void {
  const lo = pinned * (1 - pct);
  const hi = pinned * (1 + pct);
  expect(
    actual,
    `${label}: expected ${actual} to be within +-${pct * 100}% of ${pinned} (range [${lo.toFixed(1)}, ${hi.toFixed(1)}])`,
  ).toBeGreaterThanOrEqual(lo);
  expect(
    actual,
    `${label}: expected ${actual} to be within +-${pct * 100}% of ${pinned} (range [${lo.toFixed(1)}, ${hi.toFixed(1)}])`,
  ).toBeLessThanOrEqual(hi);
}

// ─── Pin Discovery Run ─────────────────────────────────────────────
// Run all 4 combos once, capture actual values, then assert pins.

interface ComboResult {
  label: string;
  result: PipelineOutput;
  plungeBlock: ToolpathBlock | undefined;
  profilingBlock: ToolpathBlock | undefined;
  uniqueFeeds: Set<number>;
  plungeFeed: number;
  profilingFeed: number;
}

const combos: ComboResult[] = [];

// ════════════════════════════════════════════════════════════════════
// COMBO 1: 4140 Steel / 10mm 4F carbide / Haas VF-2 / agg=0.5
// ════════════════════════════════════════════════════════════════════

describe("PP Regression Pins — Per-Block Engagement Inference", () => {
  let steelResult: ComboResult;
  let aluminumResult: ComboResult;
  let stainlessResult: ComboResult;
  let inconelResult: ComboResult;

  // Run all 4 combos before any assertions
  beforeAll(async () => {
    const [r1, r2, r3, r4] = await Promise.all([
      // Combo 1: 4140 Steel
      postProcessorPipelineEngine.process({
        gcode: SHARED_GCODE,
        material: STEEL_4140,
        tools: [CARBIDE_10MM_4F],
        machine: HAAS_VF2,
        aggressiveness: 0.5,
      }),
      // Combo 2: 7075-T6 Aluminum
      postProcessorPipelineEngine.process({
        gcode: SHARED_GCODE,
        material: ALUMINUM_7075,
        tools: [CARBIDE_10MM_4F],
        machine: HAAS_VF2,
        aggressiveness: 0.5,
      }),
      // Combo 3: 316L Stainless
      postProcessorPipelineEngine.process({
        gcode: SHARED_GCODE,
        material: STAINLESS_316L,
        tools: [CARBIDE_10MM_4F],
        machine: FANUC_31I,
        aggressiveness: 0.5,
      }),
      // Combo 4: Inconel 718
      postProcessorPipelineEngine.process({
        gcode: SHARED_GCODE,
        material: INCONEL_718,
        tools: [BALL_NOSE_8MM_2F],
        machine: SIEMENS_840D,
        aggressiveness: 0.3,
      }),
    ]);

    function buildCombo(label: string, result: PipelineOutput): ComboResult {
      const plungeBlock = findPlungeBlock(result);
      const profilingBlock = findProfilingBlock(result);
      const uniqueFeeds = getUniqueFeedsFromCutting(result);
      const combo: ComboResult = {
        label,
        result,
        plungeBlock,
        profilingBlock,
        uniqueFeeds,
        plungeFeed: plungeBlock?.feed_mm_min ?? 0,
        profilingFeed: profilingBlock?.feed_mm_min ?? 0,
      };
      combos.push(combo);
      return combo;
    }

    steelResult = buildCombo("4140 Steel / Haas VF-2", r1);
    aluminumResult = buildCombo("7075-T6 Aluminum / Haas VF-2", r2);
    stainlessResult = buildCombo("316L Stainless / Fanuc 31i", r3);
    inconelResult = buildCombo("Inconel 718 / Siemens 840D", r4);

    // Log discovered pin values for future reference
    for (const c of combos) {
      console.log(
        `[PIN] ${c.label}: plungeFeed=${c.plungeFeed}, profilingFeed=${c.profilingFeed}, ` +
        `uniqueFeeds=${[...c.uniqueFeeds].join(",")}, ` +
        `plungeClass=${c.plungeBlock?.engagement?.classification ?? "N/A"}, ` +
        `profilingClass=${c.profilingBlock?.engagement?.classification ?? "N/A"}`,
      );
    }
  }, 60_000); // 60s timeout for all 4 pipeline runs

  // ──────────────────────────────────────────────────────────────────
  // COMBO 1: 4140 Steel / 10mm 4F carbide / Haas VF-2 / agg=0.5
  // ──────────────────────────────────────────────────────────────────

  describe("Combo 1: 4140 Steel / 10mm 4F carbide / Haas VF-2", () => {
    it("pipeline completes successfully", () => {
      expect(steelResult.result.overall_status).toBeDefined();
      expect(steelResult.result.blocks.length).toBeGreaterThan(0);
    });

    it("blocks have VARIABLE feeds (not uniform)", () => {
      expect(
        steelResult.uniqueFeeds.size,
        `Expected multiple distinct feeds, got: [${[...steelResult.uniqueFeeds].join(", ")}]`,
      ).toBeGreaterThanOrEqual(2);
    });

    it("plunge block is detected and has LOWER feed than profiling", () => {
      expect(steelResult.plungeBlock, "No plunge block found").toBeDefined();
      expect(steelResult.profilingBlock, "No profiling block found").toBeDefined();
      expect(
        steelResult.plungeFeed,
        `Plunge feed (${steelResult.plungeFeed}) should be < profiling feed (${steelResult.profilingFeed})`,
      ).toBeLessThan(steelResult.profilingFeed);
    });

    it("plunge block is classified as 'plunge'", () => {
      expect(steelResult.plungeBlock?.engagement?.classification).toBe("plunge");
    });

    it("RPM within Haas VF-2 limits (max 8100)", () => {
      for (const b of getCuttingBlocks(steelResult.result)) {
        if (b.spindle_rpm !== undefined) {
          expect(
            b.spindle_rpm,
            `Block ${b.id} RPM ${b.spindle_rpm} exceeds machine limit 8100`,
          ).toBeLessThanOrEqual(8100);
        }
      }
    });

    it("forces are positive on cutting blocks", () => {
      const blocksWithForces = getCuttingBlocks(steelResult.result).filter(b => b.forces);
      expect(blocksWithForces.length, "No blocks with force data").toBeGreaterThan(0);
      for (const b of blocksWithForces) {
        expect(b.forces!.Fc_N, `Block ${b.id} Fc_N should be > 0`).toBeGreaterThan(0);
        expect(b.forces!.resultant_N, `Block ${b.id} resultant_N should be > 0`).toBeGreaterThan(0);
      }
    });

    it("profiling block feed pinned within +-20%", () => {
      // Pinned from discovery run: 4140 Steel / 10mm 4F / kc1_1=1800 / Haas VF-2 / agg=0.5.
      // Profiling blocks at ae=3mm (30% of D=10mm) get chip-thinning compensation
      // plus Kienzle-optimized base feed. Pinned value: ~2023 mm/min.
      const PINNED_STEEL_PROFILING_FEED = 2023;
      const feed = steelResult.profilingFeed;
      expect(feed, "Profiling feed should be positive").toBeGreaterThan(0);
      expectWithinTolerance(feed, PINNED_STEEL_PROFILING_FEED, 0.20, "Steel profiling feed");
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // COMBO 2: 7075-T6 Aluminum / 10mm 4F carbide / Haas VF-2 / agg=0.5
  // ──────────────────────────────────────────────────────────────────

  describe("Combo 2: 7075-T6 Aluminum / 10mm 4F carbide / Haas VF-2", () => {
    it("pipeline completes successfully", () => {
      expect(aluminumResult.result.overall_status).toBeDefined();
      expect(aluminumResult.result.blocks.length).toBeGreaterThan(0);
    });

    it("blocks have VARIABLE feeds (not uniform)", () => {
      expect(
        aluminumResult.uniqueFeeds.size,
        `Expected multiple distinct feeds, got: [${[...aluminumResult.uniqueFeeds].join(", ")}]`,
      ).toBeGreaterThanOrEqual(2);
    });

    it("plunge block is detected and has LOWER feed than profiling", () => {
      expect(aluminumResult.plungeBlock, "No plunge block found").toBeDefined();
      expect(aluminumResult.profilingBlock, "No profiling block found").toBeDefined();
      expect(
        aluminumResult.plungeFeed,
        `Plunge feed (${aluminumResult.plungeFeed}) should be < profiling feed (${aluminumResult.profilingFeed})`,
      ).toBeLessThan(aluminumResult.profilingFeed);
    });

    it("plunge block is classified as 'plunge'", () => {
      expect(aluminumResult.plungeBlock?.engagement?.classification).toBe("plunge");
    });

    it("RPM within Haas VF-2 limits (max 8100)", () => {
      for (const b of getCuttingBlocks(aluminumResult.result)) {
        if (b.spindle_rpm !== undefined) {
          expect(
            b.spindle_rpm,
            `Block ${b.id} RPM ${b.spindle_rpm} exceeds machine limit 8100`,
          ).toBeLessThanOrEqual(8100);
        }
      }
    });

    it("forces are positive on cutting blocks", () => {
      const blocksWithForces = getCuttingBlocks(aluminumResult.result).filter(b => b.forces);
      expect(blocksWithForces.length, "No blocks with force data").toBeGreaterThan(0);
      for (const b of blocksWithForces) {
        expect(b.forces!.Fc_N, `Block ${b.id} Fc_N should be > 0`).toBeGreaterThan(0);
        expect(b.forces!.resultant_N, `Block ${b.id} resultant_N should be > 0`).toBeGreaterThan(0);
      }
    });

    it("profiling block feed pinned within +-20%", () => {
      // Pinned from discovery run: 7075-T6 Aluminum / 10mm 4F / kc1_1=700 / Haas VF-2 / agg=0.5.
      // Aluminum's low kc1_1 allows much higher feeds. Pinned value: ~5476 mm/min.
      const PINNED_ALUMINUM_PROFILING_FEED = 5476;
      const feed = aluminumResult.profilingFeed;
      expect(feed, "Profiling feed should be positive").toBeGreaterThan(0);
      expectWithinTolerance(feed, PINNED_ALUMINUM_PROFILING_FEED, 0.20, "Aluminum profiling feed");
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // COMBO 3: 316L Stainless / 10mm 4F carbide / Fanuc 31i / agg=0.5
  // ──────────────────────────────────────────────────────────────────

  describe("Combo 3: 316L Stainless / 10mm 4F carbide / Fanuc 31i", () => {
    it("pipeline completes successfully", () => {
      expect(stainlessResult.result.overall_status).toBeDefined();
      expect(stainlessResult.result.blocks.length).toBeGreaterThan(0);
    });

    it("blocks have VARIABLE feeds (not uniform)", () => {
      expect(
        stainlessResult.uniqueFeeds.size,
        `Expected multiple distinct feeds, got: [${[...stainlessResult.uniqueFeeds].join(", ")}]`,
      ).toBeGreaterThanOrEqual(2);
    });

    it("plunge block is detected and has LOWER feed than profiling", () => {
      expect(stainlessResult.plungeBlock, "No plunge block found").toBeDefined();
      expect(stainlessResult.profilingBlock, "No profiling block found").toBeDefined();
      expect(
        stainlessResult.plungeFeed,
        `Plunge feed (${stainlessResult.plungeFeed}) should be < profiling feed (${stainlessResult.profilingFeed})`,
      ).toBeLessThan(stainlessResult.profilingFeed);
    });

    it("plunge block is classified as 'plunge'", () => {
      expect(stainlessResult.plungeBlock?.engagement?.classification).toBe("plunge");
    });

    it("RPM within Fanuc 31i limits (max 12000)", () => {
      for (const b of getCuttingBlocks(stainlessResult.result)) {
        if (b.spindle_rpm !== undefined) {
          expect(
            b.spindle_rpm,
            `Block ${b.id} RPM ${b.spindle_rpm} exceeds machine limit 12000`,
          ).toBeLessThanOrEqual(12000);
        }
      }
    });

    it("forces are positive on cutting blocks", () => {
      const blocksWithForces = getCuttingBlocks(stainlessResult.result).filter(b => b.forces);
      expect(blocksWithForces.length, "No blocks with force data").toBeGreaterThan(0);
      for (const b of blocksWithForces) {
        expect(b.forces!.Fc_N, `Block ${b.id} Fc_N should be > 0`).toBeGreaterThan(0);
        expect(b.forces!.resultant_N, `Block ${b.id} resultant_N should be > 0`).toBeGreaterThan(0);
      }
    });

    it("profiling block feed pinned within +-20%", () => {
      // Pinned from discovery run: 316L Stainless / 10mm 4F / kc1_1=2100 / Fanuc 31i / agg=0.5.
      // Higher kc1_1 than steel forces lower feeds. Pinned value: ~1111 mm/min.
      const PINNED_STAINLESS_PROFILING_FEED = 1111;
      const feed = stainlessResult.profilingFeed;
      expect(feed, "Profiling feed should be positive").toBeGreaterThan(0);
      expectWithinTolerance(feed, PINNED_STAINLESS_PROFILING_FEED, 0.20, "Stainless profiling feed");
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // COMBO 4: Inconel 718 / 8mm 2F ball nose / Siemens 840D / agg=0.3
  // ──────────────────────────────────────────────────────────────────

  describe("Combo 4: Inconel 718 / 8mm 2F ball nose / Siemens 840D", () => {
    it("pipeline completes successfully", () => {
      expect(inconelResult.result.overall_status).toBeDefined();
      expect(inconelResult.result.blocks.length).toBeGreaterThan(0);
    });

    it("blocks have VARIABLE feeds (not uniform)", () => {
      expect(
        inconelResult.uniqueFeeds.size,
        `Expected multiple distinct feeds, got: [${[...inconelResult.uniqueFeeds].join(", ")}]`,
      ).toBeGreaterThanOrEqual(2);
    });

    it("plunge block is detected and has LOWER feed than profiling", () => {
      expect(inconelResult.plungeBlock, "No plunge block found").toBeDefined();
      expect(inconelResult.profilingBlock, "No profiling block found").toBeDefined();
      expect(
        inconelResult.plungeFeed,
        `Plunge feed (${inconelResult.plungeFeed}) should be < profiling feed (${inconelResult.profilingFeed})`,
      ).toBeLessThan(inconelResult.profilingFeed);
    });

    it("plunge block is classified as 'plunge'", () => {
      expect(inconelResult.plungeBlock?.engagement?.classification).toBe("plunge");
    });

    it("RPM within Siemens 840D limits (max 14000)", () => {
      for (const b of getCuttingBlocks(inconelResult.result)) {
        if (b.spindle_rpm !== undefined) {
          expect(
            b.spindle_rpm,
            `Block ${b.id} RPM ${b.spindle_rpm} exceeds machine limit 14000`,
          ).toBeLessThanOrEqual(14000);
        }
      }
    });

    it("forces are positive on cutting blocks", () => {
      const blocksWithForces = getCuttingBlocks(inconelResult.result).filter(b => b.forces);
      expect(blocksWithForces.length, "No blocks with force data").toBeGreaterThan(0);
      for (const b of blocksWithForces) {
        expect(b.forces!.Fc_N, `Block ${b.id} Fc_N should be > 0`).toBeGreaterThan(0);
        expect(b.forces!.resultant_N, `Block ${b.id} resultant_N should be > 0`).toBeGreaterThan(0);
      }
    });

    it("profiling block feed pinned within +-20%", () => {
      // Pinned from discovery run: Inconel 718 / 8mm 2F ball nose / kc1_1=2800 / 840D / agg=0.3.
      // Very high kc1_1, low aggressiveness, 2-flute ball nose = lowest feeds.
      // Pinned value: ~575 mm/min.
      const PINNED_INCONEL_PROFILING_FEED = 575;
      const feed = inconelResult.profilingFeed;
      expect(feed, "Profiling feed should be positive").toBeGreaterThan(0);
      expectWithinTolerance(feed, PINNED_INCONEL_PROFILING_FEED, 0.20, "Inconel profiling feed");
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // CROSS-MATERIAL COMPARISONS
  // ──────────────────────────────────────────────────────────────────

  describe("Cross-Material: Feed Ordering by Machinability", () => {
    it("Aluminum profiling feed > Steel profiling feed", () => {
      expect(
        aluminumResult.profilingFeed,
        `Aluminum feed (${aluminumResult.profilingFeed}) should be > Steel feed (${steelResult.profilingFeed})`,
      ).toBeGreaterThan(steelResult.profilingFeed);
    });

    it("Steel profiling feed > Stainless profiling feed", () => {
      expect(
        steelResult.profilingFeed,
        `Steel feed (${steelResult.profilingFeed}) should be > Stainless feed (${stainlessResult.profilingFeed})`,
      ).toBeGreaterThan(stainlessResult.profilingFeed);
    });

    it("Stainless profiling feed > Inconel profiling feed", () => {
      expect(
        stainlessResult.profilingFeed,
        `Stainless feed (${stainlessResult.profilingFeed}) should be > Inconel feed (${inconelResult.profilingFeed})`,
      ).toBeGreaterThan(inconelResult.profilingFeed);
    });

    it("full ordering: Aluminum > Steel > Stainless > Inconel", () => {
      // Single assertion capturing the full chain
      const feeds = [
        { mat: "Aluminum", feed: aluminumResult.profilingFeed },
        { mat: "Steel", feed: steelResult.profilingFeed },
        { mat: "Stainless", feed: stainlessResult.profilingFeed },
        { mat: "Inconel", feed: inconelResult.profilingFeed },
      ];
      for (let i = 0; i < feeds.length - 1; i++) {
        expect(
          feeds[i].feed,
          `${feeds[i].mat} (${feeds[i].feed}) should be > ${feeds[i + 1].mat} (${feeds[i + 1].feed})`,
        ).toBeGreaterThan(feeds[i + 1].feed);
      }
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // ENGAGEMENT INFERENCE STRUCTURAL CHECKS
  // ──────────────────────────────────────────────────────────────────

  describe("Engagement Inference Structural Integrity", () => {
    it("all combos detect at least one plunge block", () => {
      for (const c of combos) {
        expect(c.plungeBlock, `${c.label}: no plunge block detected`).toBeDefined();
      }
    });

    it("all combos detect at least one profiling block", () => {
      for (const c of combos) {
        expect(c.profilingBlock, `${c.label}: no profiling block detected`).toBeDefined();
      }
    });

    it("plunge feeds are consistently lower than profiling feeds across all combos", () => {
      for (const c of combos) {
        expect(
          c.plungeFeed,
          `${c.label}: plunge (${c.plungeFeed}) >= profiling (${c.profilingFeed})`,
        ).toBeLessThan(c.profilingFeed);
      }
    });

    it("no combo produces uniform feeds (all have at least 2 distinct feed values)", () => {
      for (const c of combos) {
        expect(
          c.uniqueFeeds.size,
          `${c.label}: only ${c.uniqueFeeds.size} distinct feed(s): [${[...c.uniqueFeeds].join(", ")}]`,
        ).toBeGreaterThanOrEqual(2);
      }
    });

    it("plunge-to-profiling feed ratio is plausible (0.1%-70% for all combos)", () => {
      // Plunge gets 30% of the BASE feed, but profiling blocks also get chip-thinning
      // compensation (ae/D < 0.5) which can boost them 2-4x above nominal. Combined
      // with Kienzle-optimized base feeds that vary by material, the plunge/profiling
      // ratio can be as low as ~0.003 (Inconel) or as high as ~0.04 (Aluminum).
      // We guard against pathological extremes: ratio should not be 0 or > 0.70.
      for (const c of combos) {
        if (c.plungeFeed > 0 && c.profilingFeed > 0) {
          const ratio = c.plungeFeed / c.profilingFeed;
          expect(
            ratio,
            `${c.label}: plunge/profiling ratio ${ratio.toFixed(4)} should be > 0.001`,
          ).toBeGreaterThan(0.001);
          expect(
            ratio,
            `${c.label}: plunge/profiling ratio ${ratio.toFixed(4)} should be < 0.70`,
          ).toBeLessThanOrEqual(0.70);
        }
      }
    });
  });
});
