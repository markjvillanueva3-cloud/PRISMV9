/**
 * HM-KC-MS10-S3: CAD Sequence Learning Engine + Upload Pipeline E2E
 * U-HKC55
 *
 * @milestone HM-KC-MS10/U-HKC55
 */

import { describe, it, expect, beforeEach } from "vitest";

import {
  cadSequenceLearningEngine,
  type ManufacturingPattern,
  type LearningResult,
} from "../engines/hypermill/CADSequenceLearningEngine.js";

import { hmcProjectParserEngine } from "../engines/hypermill/HMCProjectParserEngine.js";
import { stepFeatureExtractorEngine } from "../engines/hypermill/STEPFeatureExtractorEngine.js";
import { partSimilaritySearchEngine } from "../engines/hypermill/PartSimilaritySearchEngine.js";
import { featureSequenceReplicatorEngine } from "../engines/hypermill/FeatureSequenceReplicatorEngine.js";

import type { FeatureSequenceRecord } from "../engines/hypermill/HMCProjectParserEngine.js";
import type { RecognizedFeature } from "../engines/FeatureRecognitionEngine.js";

// ══════════════════════════════════════════════════════════════════════════════
// SAMPLE DATA
// ══════════════════════════════════════════════════════════════════════════════

function makeFeature(id: string, type: RecognizedFeature["type"], dims: Partial<RecognizedFeature["dimensions"]> = {}): RecognizedFeature {
  return { id, type, confidence: 0.9, dimensions: { ...dims }, position: { x: 0, y: 0, z: 0 }, orientation: { axis: "z" }, notes: [] };
}

/** 3 sample records for learning */
const LEARNING_RECORDS: FeatureSequenceRecord[] = [
  {
    id: "L1", source: "hmc_project", partType: "freeform", partName: "Mold A — H13",
    stock: { type: "rectangular", dimensions: { x: 200, y: 150, z: 80 }, material: "H13", isoGroup: "H" },
    wcsList: [{ wcsNumber: 1, name: "G54", origin: { x: 0, y: 0, z: 0 } }],
    features: [
      makeFeature("f1", "face", { width_mm: 200, length_mm: 150 }),
      makeFeature("f2", "pocket_freeform", { width_mm: 160, length_mm: 120, depth_mm: 60 }),
      makeFeature("f3", "contour_3d", { width_mm: 140, length_mm: 100, depth_mm: 55 }),
      makeFeature("f4", "through_hole", { diameter_mm: 8.5, depth_mm: 80 }),
    ],
    operations: [
      { index: 0, name: "Face", cycleCode: "FACE_MILLING", operationType: "roughing", tool: { toolNumber: 1, name: "T1", type: "face_mill", diameterMm: 50 }, parameters: { feed_mm_min: 1000, spindle_rpm: 2000 }, targetFeatures: ["face"], dependsOn: [], estimatedCycleTimeSec: 60 },
      { index: 1, name: "MAXX Rough", cycleCode: "MAXX_ROUGHING", operationType: "roughing", tool: { toolNumber: 2, name: "T2", type: "endmill_flat", diameterMm: 20 }, parameters: { stepdown_mm: 1.5, feed_mm_min: 1500, spindle_rpm: 5000, depth_mm: 60 }, targetFeatures: ["pocket_freeform"], dependsOn: [0], estimatedCycleTimeSec: 480 },
      { index: 2, name: "Rest Machining", cycleCode: "REST_MACHINING", operationType: "rest_machining", tool: { toolNumber: 3, name: "T3", type: "endmill_ball", diameterMm: 10 }, parameters: { feed_mm_min: 2000, spindle_rpm: 8000 }, targetFeatures: ["pocket_freeform"], dependsOn: [1], estimatedCycleTimeSec: 200 },
      { index: 3, name: "Z-Level Finish", cycleCode: "Z_LEVEL_FINISHING", operationType: "finishing", tool: { toolNumber: 3, name: "T3", type: "endmill_ball", diameterMm: 10 }, parameters: { stepdown_mm: 0.5, feed_mm_min: 2500, spindle_rpm: 10000 }, targetFeatures: ["contour_3d"], dependsOn: [2], estimatedCycleTimeSec: 540 },
      { index: 4, name: "Drill", cycleCode: "PECK_DRILLING", operationType: "drilling", tool: { toolNumber: 4, name: "T4", type: "drill", diameterMm: 8.5 }, parameters: { feed_mm_min: 200, spindle_rpm: 2000, depth_mm: 80 }, targetFeatures: ["through_hole"], dependsOn: [], estimatedCycleTimeSec: 60 },
    ],
    totalCycleTimeSec: 1340, toolChangeCount: 4, uniqueToolCount: 4,
    createdAt: new Date().toISOString(), complexityScore: 7.2, warnings: [],
  },
  {
    id: "L2", source: "hmc_project", partType: "prismatic", partName: "Bracket — P-Steel",
    stock: { type: "rectangular", dimensions: { x: 120, y: 80, z: 25 }, material: "1045 Steel", isoGroup: "P" },
    wcsList: [{ wcsNumber: 1, name: "G54", origin: { x: 0, y: 0, z: 0 } }],
    features: [
      makeFeature("f1", "face", { width_mm: 120, length_mm: 80 }),
      makeFeature("f2", "pocket_rectangular", { width_mm: 40, length_mm: 30, depth_mm: 15 }),
      makeFeature("f3", "through_hole", { diameter_mm: 6, depth_mm: 25 }),
    ],
    operations: [
      { index: 0, name: "Face", cycleCode: "FACE_MILLING", operationType: "roughing", tool: { toolNumber: 1, name: "T1", type: "face_mill", diameterMm: 50 }, parameters: { feed_mm_min: 1500, spindle_rpm: 3000 }, targetFeatures: ["face"], dependsOn: [], estimatedCycleTimeSec: 45 },
      { index: 1, name: "Pocket", cycleCode: "POCKET_2D", operationType: "roughing", tool: { toolNumber: 2, name: "T2", type: "endmill_flat", diameterMm: 16 }, parameters: { stepdown_mm: 5, feed_mm_min: 2000, spindle_rpm: 6000 }, targetFeatures: ["pocket_rectangular"], dependsOn: [0], estimatedCycleTimeSec: 90 },
      { index: 2, name: "Drill", cycleCode: "DRILLING", operationType: "drilling", tool: { toolNumber: 3, name: "T3", type: "drill", diameterMm: 6 }, parameters: { feed_mm_min: 400, spindle_rpm: 3000, depth_mm: 25 }, targetFeatures: ["through_hole"], dependsOn: [], estimatedCycleTimeSec: 15 },
    ],
    totalCycleTimeSec: 150, toolChangeCount: 2, uniqueToolCount: 3,
    createdAt: new Date().toISOString(), complexityScore: 3.5, warnings: [],
  },
  {
    id: "L3", source: "step_inferred", partType: "prismatic", partName: "Plate — N-Aluminum",
    stock: { type: "rectangular", dimensions: { x: 150, y: 100, z: 20 }, material: "6061-T6", isoGroup: "N" },
    wcsList: [{ wcsNumber: 1, name: "G54", origin: { x: 0, y: 0, z: 0 } }],
    features: [
      makeFeature("f1", "face", { width_mm: 150, length_mm: 100 }),
      makeFeature("f2", "pocket_rectangular", { width_mm: 50, length_mm: 40, depth_mm: 12 }),
      makeFeature("f3", "through_hole", { diameter_mm: 5, depth_mm: 20 }),
    ],
    operations: [
      { index: 0, name: "Face", cycleCode: "FACE_MILLING", operationType: "roughing", tool: { toolNumber: 1, name: "T1", type: "face_mill", diameterMm: 50 }, parameters: { feed_mm_min: 3500, spindle_rpm: 8000 }, targetFeatures: ["face"], dependsOn: [], estimatedCycleTimeSec: 20 },
      { index: 1, name: "Pocket", cycleCode: "POCKET_2D", operationType: "roughing", tool: { toolNumber: 2, name: "T2", type: "endmill_flat", diameterMm: 12 }, parameters: { stepdown_mm: 4, feed_mm_min: 4000, spindle_rpm: 12000 }, targetFeatures: ["pocket_rectangular"], dependsOn: [0], estimatedCycleTimeSec: 40 },
      { index: 2, name: "Drill", cycleCode: "DRILLING", operationType: "drilling", tool: { toolNumber: 3, name: "T3", type: "drill", diameterMm: 5 }, parameters: { feed_mm_min: 800, spindle_rpm: 6000, depth_mm: 20 }, targetFeatures: ["through_hole"], dependsOn: [], estimatedCycleTimeSec: 8 },
    ],
    totalCycleTimeSec: 68, toolChangeCount: 2, uniqueToolCount: 3,
    createdAt: new Date().toISOString(), complexityScore: 2.8, warnings: [],
  },
];

/** .hmc XML for E2E pipeline test */
const E2E_HMC_XML = `<?xml version="1.0" encoding="UTF-8"?>
<HyperMillProject version="33.0">
  <ProjectName value="Test Part E2E"/>
  <Stock type="rectangular" sizeX="100" sizeY="80" sizeZ="30" material="P20 Tool Steel"/>
  <WCS number="1" name="G54" originX="50" originY="40" originZ="30"/>
  <Tool id="T1" number="1" name="25mm Face Mill" type="face_mill" diameter="25" fluteCount="4"/>
  <Tool id="T2" number="2" name="10mm Flat EM" type="endmill_flat" diameter="10" fluteCount="3"/>
  <Tool id="T3" number="3" name="5mm Drill" type="drill" diameter="5" fluteCount="2"/>
  <Operation name="Face Top" cycle="2D_FACE" toolRef="T1" feed="2000" spindleSpeed="4000" cycleTime="30">
    <Parameter name="stepover_mm" value="15"/>
  </Operation>
  <Operation name="Pocket" cycle="2D_POCKET" toolRef="T2" stepdown="3" stepover="6" feed="2500" spindleSpeed="8000" depth_mm="20" cycleTime="120">
    <Parameter name="helical_approach" value="true"/>
  </Operation>
  <Operation name="Drill Holes" cycle="DRILL_STANDARD" toolRef="T3" feed="350" spindleSpeed="3500" depth_mm="30" cycleTime="25">
    <Parameter name="bore_diameter" value="5"/>
  </Operation>
</HyperMillProject>`;

// ══════════════════════════════════════════════════════════════════════════════
// U-HKC55: CADSequenceLearningEngine Tests
// ══════════════════════════════════════════════════════════════════════════════

describe("HM-KC-MS10-S3/U-HKC55: CADSequenceLearningEngine", () => {
  beforeEach(() => {
    cadSequenceLearningEngine.clear();
  });

  describe("Learning from Records", () => {
    let result: LearningResult;

    it("learns patterns from 3 records", () => {
      cadSequenceLearningEngine.addRecords(LEARNING_RECORDS);
      result = cadSequenceLearningEngine.learn();
      expect(result).toBeDefined();
      expect(result.totalRecords).toBe(3);
    });

    it("extracts >= 5 pattern types", () => {
      cadSequenceLearningEngine.addRecords(LEARNING_RECORDS);
      result = cadSequenceLearningEngine.learn();
      expect(result.patterns.length).toBeGreaterThanOrEqual(5);
    });

    it("finds tool cascade patterns", () => {
      cadSequenceLearningEngine.addRecords(LEARNING_RECORDS);
      result = cadSequenceLearningEngine.learn();
      expect(result.patternCounts.tool_cascade).toBeGreaterThanOrEqual(1);
    });

    it("finds strategy preference patterns", () => {
      cadSequenceLearningEngine.addRecords(LEARNING_RECORDS);
      result = cadSequenceLearningEngine.learn();
      expect(result.patternCounts.strategy_preference).toBeGreaterThanOrEqual(1);
    });

    it("finds sequence order patterns", () => {
      cadSequenceLearningEngine.addRecords(LEARNING_RECORDS);
      result = cadSequenceLearningEngine.learn();
      expect(result.patternCounts.sequence_order).toBeGreaterThanOrEqual(1);
    });

    it("finds material adaptation patterns", () => {
      cadSequenceLearningEngine.addRecords(LEARNING_RECORDS);
      result = cadSequenceLearningEngine.learn();
      expect(result.patternCounts.material_adaptation).toBeGreaterThanOrEqual(1);
    });

    it("finds tooling choice patterns", () => {
      cadSequenceLearningEngine.addRecords(LEARNING_RECORDS);
      result = cadSequenceLearningEngine.learn();
      expect(result.patternCounts.tooling_choice).toBeGreaterThanOrEqual(1);
    });

    it("patterns have valid structure", () => {
      cadSequenceLearningEngine.addRecords(LEARNING_RECORDS);
      result = cadSequenceLearningEngine.learn();
      for (const p of result.patterns) {
        expect(p.id).toBeTruthy();
        expect(p.type).toBeTruthy();
        expect(p.description.length).toBeGreaterThan(10);
        expect(p.condition).toBeDefined();
        expect(p.recommendation).toBeTruthy();
        expect(p.supportCount).toBeGreaterThanOrEqual(1);
        expect(p.confidence).toBeGreaterThan(0);
        expect(p.confidence).toBeLessThanOrEqual(1);
      }
    });

    it("rest machining pattern detected for deep pockets", () => {
      cadSequenceLearningEngine.addRecords(LEARNING_RECORDS);
      result = cadSequenceLearningEngine.learn();
      const restPattern = result.patterns.find((p) =>
        p.recommendation === "REST_MACHINING"
      );
      expect(restPattern).toBeDefined();
      expect(restPattern!.condition.field).toContain("pocket");
    });

    it("learning time < 50ms", () => {
      cadSequenceLearningEngine.addRecords(LEARNING_RECORDS);
      result = cadSequenceLearningEngine.learn();
      expect(result.learningTimeMs).toBeLessThan(50);
    });
  });

  describe("Recommendations", () => {
    it("recommends MAXX_ROUGHING for freeform hardened parts", () => {
      cadSequenceLearningEngine.addRecords(LEARNING_RECORDS);
      cadSequenceLearningEngine.learn();

      const recs = cadSequenceLearningEngine.recommend(LEARNING_RECORDS[0]); // Freeform H13
      const maxxRec = recs.find((r) => r.cycleCode === "MAXX_ROUGHING");
      expect(maxxRec).toBeDefined();
      expect(maxxRec!.confidence).toBeGreaterThan(0.5);
    });

    it("recommends POCKET_2D for prismatic parts", () => {
      cadSequenceLearningEngine.addRecords(LEARNING_RECORDS);
      cadSequenceLearningEngine.learn();

      const recs = cadSequenceLearningEngine.recommend(LEARNING_RECORDS[1]); // Prismatic
      const pocketRec = recs.find((r) => r.cycleCode === "POCKET_2D");
      expect(pocketRec).toBeDefined();
    });

    it("recommendations are sorted by confidence", () => {
      cadSequenceLearningEngine.addRecords(LEARNING_RECORDS);
      cadSequenceLearningEngine.learn();

      const recs = cadSequenceLearningEngine.recommend(LEARNING_RECORDS[0]);
      for (let i = 1; i < recs.length; i++) {
        expect(recs[i - 1].confidence).toBeGreaterThanOrEqual(recs[i].confidence);
      }
    });
  });

  describe("Corpus Management", () => {
    it("getCorpusSize tracks records", () => {
      expect(cadSequenceLearningEngine.getCorpusSize()).toBe(0);
      cadSequenceLearningEngine.addRecords(LEARNING_RECORDS);
      expect(cadSequenceLearningEngine.getCorpusSize()).toBe(3);
    });

    it("clear removes all records and patterns", () => {
      cadSequenceLearningEngine.addRecords(LEARNING_RECORDS);
      cadSequenceLearningEngine.learn();
      cadSequenceLearningEngine.clear();
      expect(cadSequenceLearningEngine.getCorpusSize()).toBe(0);
      expect(cadSequenceLearningEngine.getPatterns().length).toBe(0);
    });

    it("empty corpus produces zero patterns", () => {
      const result = cadSequenceLearningEngine.learn();
      expect(result.patterns.length).toBe(0);
      expect(result.totalRecords).toBe(0);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// E2E UPLOAD PIPELINE TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe("HM-KC-MS10-S3/U-HKC55: Upload Pipeline E2E", () => {
  beforeEach(() => {
    cadSequenceLearningEngine.clear();
    partSimilaritySearchEngine.clear();
  });

  describe(".hmc Upload Pipeline", () => {
    it("E2E: .hmc → parse → index → searchable → replicable", () => {
      // Step 1: Parse .hmc file
      const parseResult = hmcProjectParserEngine.parse(E2E_HMC_XML);
      expect(parseResult.record.operations.length).toBeGreaterThanOrEqual(3);
      expect(parseResult.record.source).toBe("hmc_project");

      // Step 2: Index the record
      partSimilaritySearchEngine.index(parseResult.record);
      expect(partSimilaritySearchEngine.getIndexSize()).toBe(1);

      // Step 3: Add to learning corpus
      cadSequenceLearningEngine.addRecords([parseResult.record]);
      const learnResult = cadSequenceLearningEngine.learn();
      expect(learnResult.totalRecords).toBe(1);

      // Step 4: Upload a second part and search for similar
      const secondHmc = E2E_HMC_XML.replace("Test Part E2E", "Test Part V2")
        .replace('sizeX="100"', 'sizeX="110"');
      const secondParse = hmcProjectParserEngine.parse(secondHmc);
      partSimilaritySearchEngine.index(secondParse.record);

      // Step 5: Search for similar parts
      const matches = partSimilaritySearchEngine.search(secondParse.record, { topN: 3 });
      expect(matches.length).toBeGreaterThanOrEqual(1);
      expect(matches[0].score).toBeGreaterThan(50); // High similarity

      // Step 6: Replicate from template
      const replication = featureSequenceReplicatorEngine.replicate(matches[0].record, {
        partName: "Replicated Part",
        material: "P20 Steel",
        isoGroup: "P",
        dimensions: { x: 110, y: 80, z: 30 },
        features: secondParse.record.features,
      });
      expect(replication.adaptedRecord.operations.length).toBeGreaterThanOrEqual(3);
      expect(replication.acPythonScript).toContain("import om");
    });
  });

  describe(".step Upload Pipeline", () => {
    it("E2E: STEP features → extract → classify → infer sequence → indexed", () => {
      // Step 1: Extract from STEP features
      const features: RecognizedFeature[] = [
        makeFeature("f1", "face", { width_mm: 100, length_mm: 80 }),
        makeFeature("f2", "pocket_rectangular", { width_mm: 40, length_mm: 30, depth_mm: 15 }),
        makeFeature("f3", "through_hole", { diameter_mm: 6, depth_mm: 25 }),
        makeFeature("f4", "chamfer", { width_mm: 1 }),
      ];

      const stepResult = stepFeatureExtractorEngine.extract({
        partName: "STEP Bracket",
        material: "4140 Steel",
        boundingBox: { x: 100, y: 80, z: 25 },
        features,
      });

      expect(stepResult.record.source).toBe("step_inferred");
      expect(stepResult.record.operations.length).toBeGreaterThanOrEqual(3);

      // Step 2: Index
      partSimilaritySearchEngine.index(stepResult.record);
      expect(partSimilaritySearchEngine.getIndexSize()).toBe(1);

      // Step 3: Learn
      cadSequenceLearningEngine.addRecords([stepResult.record]);
      cadSequenceLearningEngine.learn();

      // Step 4: Verify searchable
      const matches = partSimilaritySearchEngine.search(stepResult.record, { topN: 1 });
      // Only 1 record, so no matches (self excluded)
      expect(matches.length).toBe(0);

      // Index another and verify search works
      const secondStep = stepFeatureExtractorEngine.extract({
        partName: "Similar Bracket",
        material: "1045 Steel",
        boundingBox: { x: 110, y: 85, z: 28 },
        features,
      });
      partSimilaritySearchEngine.index(secondStep.record);

      const matches2 = partSimilaritySearchEngine.search(secondStep.record, { topN: 3 });
      expect(matches2.length).toBe(1);
      expect(matches2[0].score).toBeGreaterThan(40);
    });
  });

  describe("Multi-Part Learning Pipeline", () => {
    it("upload 3 parts, learn patterns, search and rank correctly", () => {
      // Upload 3 learning records
      for (const rec of LEARNING_RECORDS) {
        partSimilaritySearchEngine.index(rec);
      }
      cadSequenceLearningEngine.addRecords(LEARNING_RECORDS);
      const learnResult = cadSequenceLearningEngine.learn();

      // Verify learning extracted meaningful patterns
      expect(learnResult.patterns.length).toBeGreaterThanOrEqual(5);

      // Search for part similar to bracket (L2)
      const bracketMatches = partSimilaritySearchEngine.search(LEARNING_RECORDS[1], { topN: 3 });
      expect(bracketMatches.length).toBe(2); // L1 and L3 (L2 is self-excluded)

      // L3 (prismatic aluminum) should rank higher than L1 (freeform mold) for bracket
      const l3Match = bracketMatches.find((m) => m.record.id === "L3");
      const l1Match = bracketMatches.find((m) => m.record.id === "L1");
      expect(l3Match).toBeDefined();
      expect(l1Match).toBeDefined();
      expect(l3Match!.score).toBeGreaterThan(l1Match!.score);

      // Get recommendations for a new prismatic part
      const newPrismaticRecord: FeatureSequenceRecord = {
        id: "NEW", source: "step_inferred", partType: "prismatic", partName: "New Bracket",
        stock: { type: "rectangular", dimensions: { x: 100, y: 70, z: 20 }, material: "Steel", isoGroup: "P" },
        wcsList: [{ wcsNumber: 1, name: "G54", origin: { x: 0, y: 0, z: 0 } }],
        features: [
          makeFeature("f1", "face", { width_mm: 100, length_mm: 70 }),
          makeFeature("f2", "pocket_rectangular", { width_mm: 35, length_mm: 25, depth_mm: 12 }),
        ],
        operations: [],
        totalCycleTimeSec: 0, toolChangeCount: 0, uniqueToolCount: 0,
        createdAt: new Date().toISOString(), complexityScore: 2, warnings: [],
      };

      const recs = cadSequenceLearningEngine.recommend(newPrismaticRecord);
      expect(recs.length).toBeGreaterThanOrEqual(1);
      // Should recommend POCKET_2D for prismatic
      expect(recs.some((r) => r.cycleCode === "POCKET_2D")).toBe(true);
    });
  });

  describe("Performance", () => {
    it("full pipeline (parse + index + learn + search + replicate) < 200ms", () => {
      const start = performance.now();

      // Parse
      const parsed = hmcProjectParserEngine.parse(E2E_HMC_XML);

      // Index
      partSimilaritySearchEngine.indexBatch(LEARNING_RECORDS);
      partSimilaritySearchEngine.index(parsed.record);

      // Learn
      cadSequenceLearningEngine.addRecords([...LEARNING_RECORDS, parsed.record]);
      cadSequenceLearningEngine.learn();

      // Search
      const matches = partSimilaritySearchEngine.search(parsed.record, { topN: 3 });

      // Replicate (if match found)
      if (matches.length > 0) {
        featureSequenceReplicatorEngine.replicate(matches[0].record, {
          partName: "Replicated",
          material: "Steel",
          isoGroup: "P",
          dimensions: { x: 100, y: 80, z: 30 },
          features: parsed.record.features,
        });
      }

      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(200);
    });
  });
});
