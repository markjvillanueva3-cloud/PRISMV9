/**
 * HM-KC-MS10-S2: Part Similarity Search + Feature Sequence Replicator Tests
 * U-HKC53 + U-HKC54
 *
 * @milestone HM-KC-MS10/U-HKC53, U-HKC54
 */

import { describe, it, expect, beforeEach } from "vitest";

import {
  partSimilaritySearchEngine,
  type SimilarityMatch,
} from "../engines/hypermill/PartSimilaritySearchEngine.js";

import {
  featureSequenceReplicatorEngine,
  type ReplicationResult,
} from "../engines/hypermill/FeatureSequenceReplicatorEngine.js";

import { hmcProjectParserEngine } from "../engines/hypermill/HMCProjectParserEngine.js";
import { stepFeatureExtractorEngine } from "../engines/hypermill/STEPFeatureExtractorEngine.js";

import type { FeatureSequenceRecord } from "../engines/hypermill/HMCProjectParserEngine.js";
import type { RecognizedFeature } from "../engines/FeatureRecognitionEngine.js";

// ══════════════════════════════════════════════════════════════════════════════
// SAMPLE RECORDS — 5 indexed parts for similarity testing
// ══════════════════════════════════════════════════════════════════════════════

function makeFeature(id: string, type: RecognizedFeature["type"], dims: Partial<RecognizedFeature["dimensions"]> = {}): RecognizedFeature {
  return {
    id, type, confidence: 0.9,
    dimensions: { ...dims },
    position: { x: 0, y: 0, z: 0 },
    orientation: { axis: "z" },
    notes: [],
  };
}

function makeRecord(overrides: Partial<FeatureSequenceRecord> & Pick<FeatureSequenceRecord, "id" | "partName">): FeatureSequenceRecord {
  return {
    source: "manual_entry",
    partType: "prismatic",
    stock: {
      type: "rectangular",
      dimensions: { x: 100, y: 100, z: 50 },
      material: "Steel",
      isoGroup: "P",
    },
    wcsList: [{ wcsNumber: 1, name: "G54", origin: { x: 0, y: 0, z: 0 } }],
    features: [],
    operations: [],
    totalCycleTimeSec: 300,
    toolChangeCount: 3,
    uniqueToolCount: 4,
    createdAt: new Date().toISOString(),
    complexityScore: 5,
    warnings: [],
    ...overrides,
  };
}

const RECORDS: FeatureSequenceRecord[] = [
  makeRecord({
    id: "R1", partName: "Bracket A — P-Steel",
    stock: { type: "rectangular", dimensions: { x: 120, y: 80, z: 25 }, material: "1045 Steel", isoGroup: "P" },
    features: [
      makeFeature("f1", "face", { width_mm: 120, length_mm: 80 }),
      makeFeature("f2", "pocket_rectangular", { width_mm: 40, length_mm: 30, depth_mm: 15 }),
      makeFeature("f3", "through_hole", { diameter_mm: 6, depth_mm: 25 }),
      makeFeature("f4", "chamfer", { width_mm: 1 }),
    ],
    operations: [
      { index: 0, name: "Face", cycleCode: "FACE_MILLING", operationType: "roughing", tool: { toolNumber: 1, name: "T1", type: "face_mill", diameterMm: 50 }, parameters: { feed_mm_min: 1500, spindle_rpm: 3000 }, targetFeatures: ["face"], dependsOn: [], estimatedCycleTimeSec: 45 },
      { index: 1, name: "Pocket", cycleCode: "POCKET_2D", operationType: "roughing", tool: { toolNumber: 2, name: "T2", type: "endmill_flat", diameterMm: 16 }, parameters: { stepdown_mm: 5, feed_mm_min: 2000, spindle_rpm: 6000 }, targetFeatures: ["pocket_rectangular"], dependsOn: [0], estimatedCycleTimeSec: 90 },
      { index: 2, name: "Drill", cycleCode: "DRILLING", operationType: "drilling", tool: { toolNumber: 3, name: "T3", type: "drill", diameterMm: 6 }, parameters: { feed_mm_min: 400, spindle_rpm: 3000, depth_mm: 25 }, targetFeatures: ["through_hole"], dependsOn: [], estimatedCycleTimeSec: 15 },
    ],
    complexityScore: 3.5,
  }),
  makeRecord({
    id: "R2", partName: "Bracket B — N-Aluminum (similar to R1)",
    stock: { type: "rectangular", dimensions: { x: 130, y: 85, z: 28 }, material: "6061-T6 Aluminum", isoGroup: "N" },
    features: [
      makeFeature("f1", "face", { width_mm: 130, length_mm: 85 }),
      makeFeature("f2", "pocket_rectangular", { width_mm: 45, length_mm: 35, depth_mm: 18 }),
      makeFeature("f3", "through_hole", { diameter_mm: 6, depth_mm: 28 }),
      makeFeature("f4", "chamfer", { width_mm: 1.5 }),
    ],
    operations: [
      { index: 0, name: "Face", cycleCode: "FACE_MILLING", operationType: "roughing", tool: { toolNumber: 1, name: "T1", type: "face_mill", diameterMm: 50 }, parameters: { feed_mm_min: 3000, spindle_rpm: 6000 }, targetFeatures: ["face"], dependsOn: [], estimatedCycleTimeSec: 25 },
      { index: 1, name: "Pocket", cycleCode: "POCKET_2D", operationType: "roughing", tool: { toolNumber: 2, name: "T2", type: "endmill_flat", diameterMm: 16 }, parameters: { stepdown_mm: 6, feed_mm_min: 4000, spindle_rpm: 12000 }, targetFeatures: ["pocket_rectangular"], dependsOn: [0], estimatedCycleTimeSec: 50 },
      { index: 2, name: "Drill", cycleCode: "DRILLING", operationType: "drilling", tool: { toolNumber: 3, name: "T3", type: "drill", diameterMm: 6 }, parameters: { feed_mm_min: 800, spindle_rpm: 6000, depth_mm: 28 }, targetFeatures: ["through_hole"], dependsOn: [], estimatedCycleTimeSec: 8 },
    ],
    complexityScore: 3.2,
  }),
  makeRecord({
    id: "R3", partName: "Mold Cavity — H-Hardened Steel",
    partType: "freeform",
    stock: { type: "rectangular", dimensions: { x: 200, y: 150, z: 80 }, material: "H13", isoGroup: "H" },
    features: [
      makeFeature("f1", "face", { width_mm: 200, length_mm: 150 }),
      makeFeature("f2", "pocket_freeform", { width_mm: 160, length_mm: 120, depth_mm: 60 }),
      makeFeature("f3", "contour_3d", { width_mm: 140, length_mm: 100, depth_mm: 55 }),
      makeFeature("f4", "through_hole", { diameter_mm: 8.5, depth_mm: 80 }),
      makeFeature("f5", "tapped_hole", { diameter_mm: 10, depth_mm: 25, pitch_mm: 1.5 }),
    ],
    operations: [
      { index: 0, name: "Face", cycleCode: "FACE_MILLING", operationType: "roughing", tool: { toolNumber: 1, name: "T1", type: "face_mill", diameterMm: 50 }, parameters: { feed_mm_min: 1000, spindle_rpm: 2000 }, targetFeatures: ["face"], dependsOn: [], estimatedCycleTimeSec: 60 },
      { index: 1, name: "MAXX Rough", cycleCode: "MAXX_ROUGHING", operationType: "roughing", tool: { toolNumber: 2, name: "T2", type: "endmill_flat", diameterMm: 20 }, parameters: { stepdown_mm: 1.5, feed_mm_min: 1500, spindle_rpm: 5000, depth_mm: 60 }, targetFeatures: ["pocket_freeform"], dependsOn: [0], estimatedCycleTimeSec: 480 },
      { index: 2, name: "Z-Level Finish", cycleCode: "Z_LEVEL_FINISHING", operationType: "finishing", tool: { toolNumber: 3, name: "T3", type: "endmill_ball", diameterMm: 10 }, parameters: { stepdown_mm: 0.5, feed_mm_min: 2500, spindle_rpm: 10000, scallop_height: 0.015 }, targetFeatures: ["contour_3d"], dependsOn: [1], estimatedCycleTimeSec: 540 },
      { index: 3, name: "Drill", cycleCode: "PECK_DRILLING", operationType: "drilling", tool: { toolNumber: 4, name: "T4", type: "drill", diameterMm: 8.5 }, parameters: { feed_mm_min: 200, spindle_rpm: 2000, depth_mm: 80, peck_depth_mm: 8 }, targetFeatures: ["through_hole"], dependsOn: [], estimatedCycleTimeSec: 60 },
      { index: 4, name: "Tap", cycleCode: "TAPPING", operationType: "threading", tool: { toolNumber: 5, name: "T5", type: "tap", diameterMm: 10 }, parameters: { feed_mm_min: 150, spindle_rpm: 500, thread_pitch_mm: 1.5 }, targetFeatures: ["tapped_hole"], dependsOn: [3], estimatedCycleTimeSec: 20 },
    ],
    complexityScore: 7.2,
  }),
  makeRecord({
    id: "R4", partName: "Shaft — P-Steel",
    partType: "cylindrical",
    stock: { type: "cylindrical", dimensions: { x: 50, y: 50, z: 120 }, material: "4140 Steel", isoGroup: "P" },
    features: [
      makeFeature("f1", "groove", { width_mm: 3, depth_mm: 2, diameter_mm: 46 }),
      makeFeature("f2", "thread_external", { diameter_mm: 48, pitch_mm: 1.5 }),
      makeFeature("f3", "through_hole", { diameter_mm: 10, depth_mm: 120 }),
      makeFeature("f4", "keyway", { width_mm: 8, depth_mm: 4, length_mm: 30 }),
    ],
    operations: [
      { index: 0, name: "OD Turn", cycleCode: "OD_ROUGHING", operationType: "turning", tool: { toolNumber: 1, name: "T1", type: "insert", diameterMm: 12 }, parameters: { feed_mm_min: 200, spindle_rpm: 1500, depth_mm: 120 }, targetFeatures: ["groove"], dependsOn: [], estimatedCycleTimeSec: 180 },
      { index: 1, name: "Thread", cycleCode: "THREAD_TURNING", operationType: "threading", tool: { toolNumber: 2, name: "T2", type: "insert", diameterMm: 10 }, parameters: { thread_pitch_mm: 1.5 }, targetFeatures: ["thread_external"], dependsOn: [0], estimatedCycleTimeSec: 45 },
    ],
    complexityScore: 4.8,
  }),
  makeRecord({
    id: "R5", partName: "Thin Panel — N-Aluminum",
    partType: "thin_wall",
    stock: { type: "rectangular", dimensions: { x: 300, y: 200, z: 5 }, material: "7075-T6 Aluminum", isoGroup: "N" },
    features: [
      makeFeature("f1", "face", { width_mm: 300, length_mm: 200 }),
      makeFeature("f2", "pocket_rectangular", { width_mm: 80, length_mm: 50, depth_mm: 3 }),
      makeFeature("f3", "through_hole", { diameter_mm: 4, depth_mm: 5 }),
    ],
    operations: [
      { index: 0, name: "Face", cycleCode: "FACE_MILLING", operationType: "roughing", tool: { toolNumber: 1, name: "T1", type: "face_mill", diameterMm: 63 }, parameters: { feed_mm_min: 4000, spindle_rpm: 8000 }, targetFeatures: ["face"], dependsOn: [], estimatedCycleTimeSec: 15 },
      { index: 1, name: "Pocket", cycleCode: "POCKET_2D", operationType: "roughing", tool: { toolNumber: 2, name: "T2", type: "endmill_flat", diameterMm: 10 }, parameters: { stepdown_mm: 1, feed_mm_min: 5000, spindle_rpm: 15000 }, targetFeatures: ["pocket_rectangular"], dependsOn: [0], estimatedCycleTimeSec: 20 },
    ],
    complexityScore: 2.1,
  }),
];

// ══════════════════════════════════════════════════════════════════════════════
// U-HKC53: PartSimilaritySearchEngine Tests
// ══════════════════════════════════════════════════════════════════════════════

describe("HM-KC-MS10-S2/U-HKC53: PartSimilaritySearchEngine", () => {
  beforeEach(() => {
    partSimilaritySearchEngine.clear();
    partSimilaritySearchEngine.indexBatch(RECORDS);
  });

  describe("Indexing", () => {
    it("indexes 5 records", () => {
      expect(partSimilaritySearchEngine.getIndexSize()).toBe(5);
    });

    it("creates hash buckets", () => {
      expect(partSimilaritySearchEngine.getBucketCount()).toBeGreaterThanOrEqual(2);
    });

    it("single record indexing works", () => {
      partSimilaritySearchEngine.clear();
      partSimilaritySearchEngine.index(RECORDS[0]);
      expect(partSimilaritySearchEngine.getIndexSize()).toBe(1);
    });
  });

  describe("Similarity Scoring", () => {
    it("R1 (Steel Bracket) is most similar to R2 (Aluminum Bracket)", () => {
      const matches = partSimilaritySearchEngine.search(RECORDS[0], { topN: 3 });
      expect(matches.length).toBeGreaterThanOrEqual(1);
      expect(matches[0].record.id).toBe("R2");
    });

    it("R2 (Aluminum Bracket) is most similar to R1 (Steel Bracket)", () => {
      const matches = partSimilaritySearchEngine.search(RECORDS[1], { topN: 3 });
      expect(matches[0].record.id).toBe("R1");
    });

    it("similarity scores are 0-100", () => {
      const matches = partSimilaritySearchEngine.search(RECORDS[0], { topN: 5 });
      for (const m of matches) {
        expect(m.score).toBeGreaterThanOrEqual(0);
        expect(m.score).toBeLessThanOrEqual(100);
      }
    });

    it("self-match is excluded from results", () => {
      const matches = partSimilaritySearchEngine.search(RECORDS[0], { topN: 5 });
      expect(matches.every((m) => m.record.id !== "R1")).toBe(true);
    });

    it("breakdown has all 5 dimensions", () => {
      const matches = partSimilaritySearchEngine.search(RECORDS[0], { topN: 1 });
      const b = matches[0].breakdown;
      expect(b.featureTypeOverlap).toBeGreaterThanOrEqual(0);
      expect(b.dimensionProximity).toBeGreaterThanOrEqual(0);
      expect(b.materialMatch).toBeGreaterThanOrEqual(0);
      expect(b.complexityMatch).toBeGreaterThanOrEqual(0);
      expect(b.operationOverlap).toBeGreaterThanOrEqual(0);
    });

    it("identical feature types get 100% feature overlap", () => {
      // R1 and R2 have the same feature types
      const matches = partSimilaritySearchEngine.search(RECORDS[0], { topN: 1 });
      expect(matches[0].breakdown.featureTypeOverlap).toBe(100);
    });

    it("same material group gets 100% material match", () => {
      // R1 (P-Steel) vs R4 (P-Steel) should have 100% material
      const matches = partSimilaritySearchEngine.search(RECORDS[0], { topN: 5 });
      const r4Match = matches.find((m) => m.record.id === "R4");
      expect(r4Match).toBeDefined();
      expect(r4Match!.breakdown.materialMatch).toBe(100);
    });

    it("dissimilar parts score lower", () => {
      // R1 (prismatic bracket) vs R4 (cylindrical shaft) should be lower than R1 vs R2
      const matches = partSimilaritySearchEngine.search(RECORDS[0], { topN: 5 });
      const r2Score = matches.find((m) => m.record.id === "R2")!.score;
      const r4Score = matches.find((m) => m.record.id === "R4")!.score;
      expect(r2Score).toBeGreaterThan(r4Score);
    });
  });

  describe("Search Filtering", () => {
    it("filter by partType = prismatic", () => {
      const matches = partSimilaritySearchEngine.search(RECORDS[0], { partType: "prismatic", topN: 5 });
      expect(matches.every((m) => m.record.partType === "prismatic")).toBe(true);
    });

    it("filter by materialGroup = N", () => {
      const matches = partSimilaritySearchEngine.search(RECORDS[0], { materialGroup: "N", topN: 5 });
      expect(matches.every((m) => m.record.stock.isoGroup === "N")).toBe(true);
    });

    it("filter by complexity range", () => {
      const matches = partSimilaritySearchEngine.search(RECORDS[0], { minComplexity: 4, maxComplexity: 8, topN: 5 });
      for (const m of matches) {
        expect(m.record.complexityScore).toBeGreaterThanOrEqual(4);
        expect(m.record.complexityScore).toBeLessThanOrEqual(8);
      }
    });

    it("filter by required features", () => {
      const matches = partSimilaritySearchEngine.search(RECORDS[0], { requiredFeatures: ["tapped_hole"], topN: 5 });
      for (const m of matches) {
        expect(m.record.features.some((f) => f.type === "tapped_hole")).toBe(true);
      }
    });

    it("topN limits results", () => {
      const matches = partSimilaritySearchEngine.search(RECORDS[0], { topN: 2 });
      expect(matches.length).toBeLessThanOrEqual(2);
    });
  });

  describe("Adaptation Suggestions", () => {
    it("generates adaptation suggestions", () => {
      const matches = partSimilaritySearchEngine.search(RECORDS[0], { topN: 1 });
      expect(matches[0].adaptations).toBeDefined();
    });

    it("suggests material S/F adjustment when ISO groups differ", () => {
      // R1 (P) searching, R2 (N) is top match — should suggest S/F adjustment
      const matches = partSimilaritySearchEngine.search(RECORDS[0], { topN: 1 });
      const hasAdjust = matches[0].adaptations.some((a) => a.change === "adjust_parameters");
      expect(hasAdjust).toBe(true);
    });

    it("suggests feature additions/removals for dissimilar parts", () => {
      // R1 vs R3: R3 has tapped_hole, contour_3d, pocket_freeform that R1 doesn't
      const matches = partSimilaritySearchEngine.search(RECORDS[0], { topN: 5 });
      const r3Match = matches.find((m) => m.record.id === "R3");
      expect(r3Match).toBeDefined();
      const hasAddOrRemove = r3Match!.adaptations.some(
        (a) => a.change === "add_feature" || a.change === "remove_feature"
      );
      expect(hasAddOrRemove).toBe(true);
    });
  });

  describe("Hash-based Search", () => {
    it("searchByHash returns results", () => {
      const matches = partSimilaritySearchEngine.searchByHash(RECORDS[0], 3);
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });

    it("searchByHash respects topN", () => {
      const matches = partSimilaritySearchEngine.searchByHash(RECORDS[0], 1);
      expect(matches.length).toBeLessThanOrEqual(1);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// U-HKC54: FeatureSequenceReplicatorEngine Tests
// ══════════════════════════════════════════════════════════════════════════════

describe("HM-KC-MS10-S2/U-HKC54: FeatureSequenceReplicatorEngine", () => {
  describe("Basic Replication — Same Material", () => {
    let result: ReplicationResult;

    it("replicates R1 bracket to a 10% larger version", () => {
      result = featureSequenceReplicatorEngine.replicate(RECORDS[0], {
        partName: "Bracket A — Large",
        material: "1045 Steel",
        isoGroup: "P",
        dimensions: { x: 132, y: 88, z: 27.5 }, // 10% larger
        features: RECORDS[0].features,
      });
      expect(result).toBeDefined();
      expect(result.adaptedRecord).toBeDefined();
    });

    it("scale factor is approximately 1.1", () => {
      expect(result.scaleFactor.avg).toBeCloseTo(1.1, 1);
    });

    it("S/F adjustment factor is 1.0 for same material", () => {
      expect(result.sfAdjustmentFactor).toBeCloseTo(1.0, 2);
    });

    it("adapted record has correct part name", () => {
      expect(result.adaptedRecord.partName).toBe("Bracket A — Large");
    });

    it("adapted stock has allowance", () => {
      expect(result.adaptedRecord.stock.dimensions.x).toBe(142); // 132 + 10
    });

    it("operations are preserved", () => {
      expect(result.adaptedRecord.operations.length).toBe(RECORDS[0].operations.length);
    });

    it("dimension parameters are scaled", () => {
      const originalStepdown = RECORDS[0].operations[1].parameters.stepdown_mm as number;
      const adaptedStepdown = result.adaptedRecord.operations[1].parameters.stepdown_mm as number;
      // Should be scaled by ~1.1
      expect(adaptedStepdown).toBeCloseTo(originalStepdown * 1.1, 0);
    });

    it("generates valid AC Python script", () => {
      expect(result.acPythonScript).toContain("import om");
      expect(result.acPythonScript).toContain("import om.cam.core as cam");
      expect(result.acPythonScript).toContain("om.GetApplication()");
      expect(result.acPythonScript).toContain("cam_model");
      // Verified against live hyperMILL v33: uses om.cam API, not hypermill module
      expect(result.acPythonScript).toContain("tool_set.GetTools()");
      expect(result.acPythonScript).toContain("except Exception");
    });

    it("confidence is high for same-material same-features", () => {
      expect(result.confidence).toBeGreaterThan(0.8);
    });
  });

  describe("Material Change — H13 to P20", () => {
    let result: ReplicationResult;

    it("replicates mold cavity from H13 to P20 with 10% size increase", () => {
      result = featureSequenceReplicatorEngine.replicate(RECORDS[2], {
        partName: "Mold Cavity — P20",
        material: "P20 Steel",
        isoGroup: "P",
        dimensions: { x: 220, y: 165, z: 88 }, // 10% larger
        features: RECORDS[2].features,
      });
      expect(result).toBeDefined();
    });

    it("S/F adjustment factor > 1 (H→P = softer material = faster)", () => {
      // H has kc1.1=3200, P has kc1.1=1800, so sqrt(3200/1800) > 1
      expect(result.sfAdjustmentFactor).toBeGreaterThan(1.0);
    });

    it("feed rates increase for softer material", () => {
      const originalFeed = RECORDS[2].operations[1].parameters.feed_mm_min as number;
      const adaptedFeed = result.adaptedRecord.operations[1].parameters.feed_mm_min as number;
      expect(adaptedFeed).toBeGreaterThan(originalFeed);
    });

    it("adaptations include S/F adjustment entries", () => {
      const sfAdapts = result.adaptationsApplied.filter((a) => a.type === "sf_adjust");
      expect(sfAdapts.length).toBeGreaterThan(0);
    });

    it("AC script references P20 material", () => {
      expect(result.acPythonScript).toContain("P20");
    });

    it("AC script contains all 5+ operations", () => {
      const opCreateCount = (result.acPythonScript.match(/job_list\.AddOperation/g) ?? []).length;
      expect(opCreateCount).toBeGreaterThanOrEqual(5);
    });
  });

  describe("Feature Additions/Removals", () => {
    it("adds operations for new features not in template", () => {
      const result = featureSequenceReplicatorEngine.replicate(RECORDS[0], {
        partName: "Bracket with Tapped Holes",
        material: "1045 Steel",
        isoGroup: "P",
        dimensions: { x: 120, y: 80, z: 25 },
        features: [
          ...RECORDS[0].features,
          makeFeature("f5", "tapped_hole", { diameter_mm: 8, depth_mm: 15, pitch_mm: 1.25 }),
        ],
      });

      const addedOps = result.adaptationsApplied.filter((a) => a.type === "add_op");
      expect(addedOps.length).toBeGreaterThanOrEqual(1);
      expect(result.adaptedRecord.operations.length).toBeGreaterThan(RECORDS[0].operations.length);
    });

    it("warns about template features missing from new part", () => {
      const result = featureSequenceReplicatorEngine.replicate(RECORDS[0], {
        partName: "Simple Bracket (no chamfer)",
        material: "Steel",
        isoGroup: "P",
        dimensions: { x: 120, y: 80, z: 25 },
        features: RECORDS[0].features.filter((f) => f.type !== "chamfer"),
      });

      expect(result.warnings.some((w) => w.includes("chamfer"))).toBe(true);
    });
  });

  describe("Tool Diameter Adaptation", () => {
    it("scales tool diameters for significantly larger parts", () => {
      const result = featureSequenceReplicatorEngine.replicate(RECORDS[0], {
        partName: "Bracket 2x Larger",
        material: "Steel",
        isoGroup: "P",
        dimensions: { x: 240, y: 160, z: 50 }, // 2x
        features: RECORDS[0].features,
      });

      // Tool diameters should round to nearest standard (includes micro + imperial-metric)
      for (const op of result.adaptedRecord.operations) {
        const standards = [
          0.1, 0.2, 0.3, 0.5, 0.8, 1, 1.5, 2, 2.5, 3, 3.175, 4, 5, 6, 6.35,
          8, 10, 12, 12.7, 16, 20, 25, 25.4, 32, 40, 50, 63, 80,
        ];
        expect(standards).toContain(op.tool.diameterMm);
      }
    });
  });

  describe("AC Python Script Quality", () => {
    it("script has stock, WCS, tools, and operations sections", () => {
      const result = featureSequenceReplicatorEngine.replicate(RECORDS[2], {
        partName: "Test Mold",
        material: "H13",
        isoGroup: "H",
        dimensions: { x: 200, y: 150, z: 80 },
        features: RECORDS[2].features,
      });

      const script = result.acPythonScript;
      expect(script).toContain("Tool Setup");
      expect(script).toContain("Operations");
      expect(script).toContain("tool_set.GetTools()");
      expect(script).toContain("cam.GetCamEntities");
      expect(script).toContain("gui.ShowMessageBox");
    });

    it("script sets all operation parameters via CfgParameters dict", () => {
      const result = featureSequenceReplicatorEngine.replicate(RECORDS[0], {
        partName: "Test",
        material: "Steel",
        isoGroup: "P",
        dimensions: { x: 120, y: 80, z: 25 },
        features: RECORDS[0].features,
      });

      // Real hyperMILL API uses CfgParameters dict, not SetParameter
      expect(result.acPythonScript).toContain('"spindle_speed"');
      expect(result.acPythonScript).toContain('"feed"');
    });
  });

  describe("Edge Cases", () => {
    it("handles empty template operations gracefully", () => {
      const emptyRecord = makeRecord({ id: "E1", partName: "Empty" });
      const result = featureSequenceReplicatorEngine.replicate(emptyRecord, {
        partName: "From Empty",
        material: "Steel",
        isoGroup: "P",
        dimensions: { x: 100, y: 100, z: 50 },
        features: [],
      });
      expect(result.adaptedRecord.operations.length).toBe(0);
      expect(result.acPythonScript).toContain("import om");
    });

    it("handles machine limits", () => {
      const result = featureSequenceReplicatorEngine.replicate(RECORDS[0], {
        partName: "Limited Machine",
        material: "Aluminum",
        isoGroup: "N",
        dimensions: { x: 120, y: 80, z: 25 },
        features: RECORDS[0].features,
        machineMaxRPM: 5000,
        machineMaxFeed: 2000,
      });

      for (const op of result.adaptedRecord.operations) {
        const rpm = op.parameters.spindle_rpm;
        const feed = op.parameters.feed_mm_min;
        if (typeof rpm === "number") expect(rpm).toBeLessThanOrEqual(5000);
        if (typeof feed === "number") expect(feed).toBeLessThanOrEqual(2000);
      }
    });
  });
});
