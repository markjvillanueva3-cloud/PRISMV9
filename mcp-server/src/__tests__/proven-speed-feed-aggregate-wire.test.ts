/**
 * MS-CRITWIRE/U-CW-02 + KAR-MS2.1/U-KAR17
 *
 * Engine-surface contract test for the ProvenSpeedFeedAggregatorEngine wire into
 * prism_calc:proven_speed_feed_aggregate_lathe / _aggregate_mill / _query / _export.
 *
 * Verifies the proven-parameter aggregation invariants:
 *   - aggregate* tallies totalSamples / totalPrograms (distinct source files)
 *   - same material+operation+machine key collapses to ONE proven parameter
 *   - param.sampleCount counts entries; statistical fields populate only at n>=2
 *   - calcStats mean/min/max are arithmetically correct
 *   - 2-sigma outliers are flagged into result.outliersFlagged
 *   - confidence is always within [0,1]
 *   - getProvenParams matches on (materialGroup, operationCategory); miss -> null
 *   - getHighConfidenceParams filters by the confidence threshold
 *   - exportForSpeedFeedOrchestrator skips params with sampleCount<3 and is
 *     sorted by confidence descending
 *   - clear() empties the in-process proven-param Map
 *
 * The engine singleton holds the proven-param Map in-process, so every test
 * clears it first (beforeEach) — mirrors the dispatcher's aggregate-then-query
 * lifetime contract.
 *
 * Sister to [[reference_u_cw_01_false_positive_2026_05_20]] — the prior MS-CRITWIRE
 * unit on the speed-feed domain. U-CW-01 closed false-positive (WIRE-EXEMPT);
 * U-CW-02 is a genuine net-new wire (engine had 0 dispatcher references).
 */
import { describe, it, expect, beforeEach } from "vitest";
import { provenSpeedFeedAggregatorEngine } from "../engines/ProvenSpeedFeedAggregatorEngine.js";
import type { ChipLoadSample } from "../engines/MillPatternMinerEngine.js";
import type { DetailedSpeedFeed } from "../engines/OkumaOSPParserEngine.js";

/** Mill ChipLoadSample with predictable defaults (no material pattern -> tool_steel). */
function millSample(o: Partial<ChipLoadSample> = {}): ChipLoadSample {
  return {
    program: "TEST-PROG-1",
    tool_number: 1,
    tool_desc: "endmill",
    diameter_mm: 10,
    flute_count: 4,
    rpm: 5000,
    feed_rate: 1000,
    chip_load: 0.05,
    operation: "roughing",
    ...o,
  };
}

/** Lathe DetailedSpeedFeed with predictable defaults (od_rough -> od_roughing). */
function latheEntry(o: Partial<DetailedSpeedFeed> = {}): DetailedSpeedFeed {
  return {
    filePath: "TEST-LATHE-1.min",
    toolSection: "NAT01",
    toolNumber: 1,
    offsetNumber: 1,
    operationDescription: "rough turn",
    operationType: "od_rough",
    cssSpeed: 200,
    maxRPM: 3000,
    feedRates: [{ value: 0.3, gcode: "F0.3", line: 10, context: "roughing" }],
    feedMode: "per_rev",
    hasCannedCycle: false,
    ...o,
  };
}

describe("U-CW-02 / U-KAR17 — ProvenSpeedFeedAggregatorEngine surface", () => {
  beforeEach(() => provenSpeedFeedAggregatorEngine.clear());

  describe("aggregateMillData", () => {
    it("empty array yields an empty result", () => {
      const r = provenSpeedFeedAggregatorEngine.aggregateMillData([]);
      expect(r.totalSamples).toBe(0);
      expect(r.totalPrograms).toBe(0);
      expect(r.provenParameters).toEqual([]);
    });

    it("single sample produces one proven parameter with sampleCount 1", () => {
      const r = provenSpeedFeedAggregatorEngine.aggregateMillData([millSample()]);
      expect(r.totalSamples).toBe(1);
      expect(r.provenParameters).toHaveLength(1);
      expect(r.provenParameters[0]!.sampleCount).toBe(1);
    });

    it("totalPrograms counts distinct source program files", () => {
      const r = provenSpeedFeedAggregatorEngine.aggregateMillData([
        millSample({ program: "A" }),
        millSample({ program: "A" }),
        millSample({ program: "B" }),
      ]);
      expect(r.totalSamples).toBe(3);
      expect(r.totalPrograms).toBe(2);
    });

    it("same material+operation collapses to one param; sampleCount = entry count", () => {
      const r = provenSpeedFeedAggregatorEngine.aggregateMillData([
        millSample({ program: "A" }),
        millSample({ program: "B" }),
        millSample({ program: "C" }),
      ]);
      expect(r.provenParameters).toHaveLength(1);
      expect(r.provenParameters[0]!.sampleCount).toBe(3);
    });

    it("distinct materials produce distinct proven parameters", () => {
      const r = provenSpeedFeedAggregatorEngine.aggregateMillData([
        millSample({ tool_desc: "endmill" }),          // -> tool_steel
        millSample({ tool_desc: "6061 alum endmill" }), // -> aluminum
      ]);
      expect(r.provenParameters).toHaveLength(2);
      const groups = r.provenParameters.map((p) => p.materialGroup).sort();
      expect(groups).toEqual(["aluminum", "tool_steel"]);
    });

    it("byMaterialGroup distribution sums to totalSamples", () => {
      const r = provenSpeedFeedAggregatorEngine.aggregateMillData([
        millSample({ tool_desc: "endmill" }),
        millSample({ tool_desc: "endmill" }),
        millSample({ tool_desc: "6061 endmill" }),
      ]);
      const sum = Object.values(r.byMaterialGroup).reduce((a, b) => a + b, 0);
      expect(sum).toBe(r.totalSamples);
    });

    it("statistics: rpm [1000,2000,3000] -> directRPM mean 2000, min 1000, max 3000", () => {
      provenSpeedFeedAggregatorEngine.aggregateMillData([
        millSample({ program: "A", rpm: 1000 }),
        millSample({ program: "B", rpm: 2000 }),
        millSample({ program: "C", rpm: 3000 }),
      ]);
      const p = provenSpeedFeedAggregatorEngine.getProvenParams("tool_steel", "milling_roughing");
      expect(p).not.toBeNull();
      expect(p!.directRPM).not.toBeNull();
      expect(p!.directRPM!.mean).toBeCloseTo(2000, 6);
      expect(p!.directRPM!.min).toBe(1000);
      expect(p!.directRPM!.max).toBe(3000);
      expect(p!.directRPM!.n).toBe(3);
    });

    it("a statistical field stays null when fewer than 2 samples feed it", () => {
      const r = provenSpeedFeedAggregatorEngine.aggregateMillData([millSample()]);
      // one sample => one rpm value => calcStats threshold (n>=2) not met
      expect(r.provenParameters[0]!.directRPM).toBeNull();
      expect(r.provenParameters[0]!.feedRate).toBeNull();
    });

    it("chipLoad stat populates when chip_load present, stays null when absent", () => {
      provenSpeedFeedAggregatorEngine.aggregateMillData([
        millSample({ program: "A", chip_load: 0.04 }),
        millSample({ program: "B", chip_load: 0.06 }),
      ]);
      const withCL = provenSpeedFeedAggregatorEngine.getProvenParams("tool_steel", "milling_roughing");
      expect(withCL!.chipLoad).not.toBeNull();

      provenSpeedFeedAggregatorEngine.clear();
      provenSpeedFeedAggregatorEngine.aggregateMillData([
        millSample({ program: "A", chip_load: null }),
        millSample({ program: "B", chip_load: null }),
      ]);
      const noCL = provenSpeedFeedAggregatorEngine.getProvenParams("tool_steel", "milling_roughing");
      expect(noCL!.chipLoad).toBeNull();
    });

    it("2-sigma outliers are flagged into result.outliersFlagged", () => {
      const samples: ChipLoadSample[] = [];
      for (let i = 0; i < 9; i++) {
        samples.push(millSample({ program: `P${i}`, rpm: 5000, feed_rate: 1000, chip_load: null }));
      }
      samples.push(millSample({ program: "P-OUT", rpm: 20000, feed_rate: 1000, chip_load: null }));
      const r = provenSpeedFeedAggregatorEngine.aggregateMillData(samples);
      expect(r.outliersFlagged.length).toBeGreaterThanOrEqual(1);
      const p = provenSpeedFeedAggregatorEngine.getProvenParams("tool_steel", "milling_roughing");
      expect(p!.directRPM!.outliers).toContain(20000);
    });

    it("confidence is always within [0,1]", () => {
      provenSpeedFeedAggregatorEngine.aggregateMillData([
        millSample({ program: "A" }),
        millSample({ program: "B" }),
        millSample({ program: "C" }),
      ]);
      for (const p of provenSpeedFeedAggregatorEngine.getHighConfidenceParams(0)) {
        expect(p.confidence).toBeGreaterThanOrEqual(0);
        expect(p.confidence).toBeLessThanOrEqual(1);
      }
    });
  });

  describe("getProvenParams", () => {
    it("returns the matching param and null for an unknown combination", () => {
      provenSpeedFeedAggregatorEngine.aggregateMillData([millSample(), millSample({ program: "B" })]);
      const hit = provenSpeedFeedAggregatorEngine.getProvenParams("tool_steel", "milling_roughing");
      expect(hit).not.toBeNull();
      expect(hit!.materialGroup).toBe("tool_steel");
      expect(hit!.operationCategory).toBe("milling_roughing");
      const miss = provenSpeedFeedAggregatorEngine.getProvenParams("titanium", "threading");
      expect(miss).toBeNull();
    });
  });

  describe("getHighConfidenceParams", () => {
    it("filters out params below the confidence threshold", () => {
      provenSpeedFeedAggregatorEngine.aggregateMillData([
        millSample({ program: "A" }),
        millSample({ program: "B" }),
        millSample({ program: "C" }),
      ]);
      const all = provenSpeedFeedAggregatorEngine.getHighConfidenceParams(0);
      const strict = provenSpeedFeedAggregatorEngine.getHighConfidenceParams(1.01);
      expect(all.length).toBeGreaterThanOrEqual(strict.length);
      expect(strict).toHaveLength(0); // nothing can exceed confidence 1.01
    });
  });

  describe("exportForSpeedFeedOrchestrator", () => {
    it("skips proven parameters with sampleCount < 3", () => {
      provenSpeedFeedAggregatorEngine.aggregateMillData([
        millSample({ program: "A" }),
        millSample({ program: "B" }),
      ]);
      expect(provenSpeedFeedAggregatorEngine.exportForSpeedFeedOrchestrator()).toHaveLength(0);

      provenSpeedFeedAggregatorEngine.clear();
      provenSpeedFeedAggregatorEngine.aggregateMillData([
        millSample({ program: "A" }),
        millSample({ program: "B" }),
        millSample({ program: "C" }),
      ]);
      expect(provenSpeedFeedAggregatorEngine.exportForSpeedFeedOrchestrator()).toHaveLength(1);
    });

    it("export rows are sorted by confidence descending", () => {
      const samples: ChipLoadSample[] = [];
      for (let i = 0; i < 4; i++) samples.push(millSample({ program: `S${i}`, tool_desc: "endmill" }));
      for (let i = 0; i < 4; i++) samples.push(millSample({ program: `A${i}`, tool_desc: "6061 endmill" }));
      provenSpeedFeedAggregatorEngine.aggregateMillData(samples);
      const rows = provenSpeedFeedAggregatorEngine.exportForSpeedFeedOrchestrator();
      expect(rows.length).toBeGreaterThan(0);
      for (let k = 0; k < rows.length - 1; k++) {
        expect(rows[k]!.confidence).toBeGreaterThanOrEqual(rows[k + 1]!.confidence);
      }
    });
  });

  describe("clear", () => {
    it("empties the in-process proven-param Map", () => {
      provenSpeedFeedAggregatorEngine.aggregateMillData([millSample(), millSample({ program: "B" })]);
      expect(provenSpeedFeedAggregatorEngine.getHighConfidenceParams(0).length).toBeGreaterThan(0);
      provenSpeedFeedAggregatorEngine.clear();
      expect(provenSpeedFeedAggregatorEngine.getHighConfidenceParams(0)).toHaveLength(0);
    });
  });

  describe("aggregateLatheData", () => {
    it("empty array yields an empty result", () => {
      const r = provenSpeedFeedAggregatorEngine.aggregateLatheData([]);
      expect(r.totalSamples).toBe(0);
      expect(r.totalPrograms).toBe(0);
      expect(r.provenParameters).toEqual([]);
    });

    it("two od_rough entries collapse to one param with a computed cssSpeed stat", () => {
      const r = provenSpeedFeedAggregatorEngine.aggregateLatheData([
        latheEntry({ filePath: "L1.min", cssSpeed: 200 }),
        latheEntry({ filePath: "L2.min", cssSpeed: 240 }),
      ]);
      expect(r.totalSamples).toBe(2);
      expect(r.totalPrograms).toBe(2);
      expect(r.provenParameters).toHaveLength(1);
      const p = provenSpeedFeedAggregatorEngine.getProvenParams("tool_steel", "od_roughing");
      expect(p).not.toBeNull();
      expect(p!.cssSpeed).not.toBeNull();
      expect(p!.cssSpeed!.mean).toBeCloseTo(220, 6);
    });
  });
});
