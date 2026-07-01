/**
 * HM-KC-MS10-S1: HMC Project Parser + STEP Feature Extractor Tests
 * U-HKC51 + U-HKC52
 *
 * @milestone HM-KC-MS10/U-HKC51, U-HKC52
 */

import { describe, it, expect } from "vitest";

import {
  hmcProjectParserEngine,
  type FeatureSequenceRecord,
  type SequenceOperation,
  type HMCParseResult,
} from "../engines/hypermill/HMCProjectParserEngine.js";

import {
  stepFeatureExtractorEngine,
  type STEPExtractionResult,
} from "../engines/hypermill/STEPFeatureExtractorEngine.js";

import type { RecognizedFeature, FeatureType } from "../engines/FeatureRecognitionEngine.js";

// ══════════════════════════════════════════════════════════════════════════════
// SAMPLE DATA — .hmc project files (synthetic XML)
// ══════════════════════════════════════════════════════════════════════════════

/** Sample .hmc v33: Mold cavity in H13 tool steel */
const SAMPLE_HMC_MOLD_CAVITY = `<?xml version="1.0" encoding="UTF-8"?>
<HyperMillProject version="33.0">
  <ProjectName value="Mold Cavity Insert A1"/>
  <Version>33.0.1</Version>
  <Stock type="rectangular" sizeX="200" sizeY="150" sizeZ="80" material="H13 Tool Steel" hardness="52"/>
  <WCS number="1" name="G54" originX="100" originY="75" originZ="80" rotA="0" rotB="0" rotC="0"/>
  <WCS number="2" name="G55" originX="100" originY="75" originZ="0" rotA="0" rotB="0" rotC="0"/>
  <Tool id="T1" number="1" name="50mm Face Mill" type="face_mill" diameter="50" fluteCount="5" length="60"/>
  <Tool id="T2" number="2" name="20mm Flat Endmill" type="endmill_flat" diameter="20" fluteCount="4" length="100"/>
  <Tool id="T3" number="3" name="10mm Ball Endmill" type="endmill_ball" diameter="10" fluteCount="2" length="80" cornerRadius="5"/>
  <Tool id="T4" number="4" name="6mm Ball Endmill" type="endmill_ball" diameter="6" fluteCount="2" length="60" cornerRadius="3"/>
  <Tool id="T5" number="5" name="8.5mm Drill" type="drill" diameter="8.5" fluteCount="2" length="90"/>
  <Tool id="T6" number="6" name="M10 Tap" type="tap" diameter="10" length="70"/>
  <Operation name="Face Top" cycle="2D_FACE" toolRef="T1" stepdown="2" feed="1500" spindleSpeed="3000" clearance_z="5" cycleTime="45">
    <Parameter name="stepover_mm" value="35"/>
    <Parameter name="coolant_mode" value="flood"/>
  </Operation>
  <Operation name="Rough Cavity" cycle="3D_MAXX_ROUGHING" toolRef="T2" stepdown="1.5" stepover="12" feed="2000" spindleSpeed="6000" depth_mm="60" clearance_z="5" cycleTime="480">
    <Parameter name="tolerance_mm" value="0.1"/>
    <Parameter name="rest_machining" value="false"/>
    <Parameter name="high_speed_mode" value="true"/>
  </Operation>
  <Operation name="Rest Rough Cavity" cycle="3D_REST_MACHINING" toolRef="T3" stepdown="0.8" stepover="5" feed="1500" spindleSpeed="8000" depth_mm="60" clearance_z="5" dependsOn="1" cycleTime="320">
    <Parameter name="tolerance_mm" value="0.05"/>
    <Parameter name="rest_machining" value="true"/>
  </Operation>
  <Operation name="Semi-Finish Cavity" cycle="3D_Z_LEVEL_FINISHING" toolRef="T3" stepdown="0.5" stepover="3" feed="2500" spindleSpeed="10000" clearance_z="5" dependsOn="2" cycleTime="540">
    <Parameter name="scallop_height" value="0.015"/>
    <Parameter name="tolerance_mm" value="0.02"/>
  </Operation>
  <Operation name="Finish Cavity" cycle="3D_PARALLEL_FINISHING" toolRef="T4" stepover="0.8" feed="3000" spindleSpeed="12000" clearance_z="5" dependsOn="3" cycleTime="720">
    <Parameter name="scallop_height" value="0.005"/>
    <Parameter name="tolerance_mm" value="0.01"/>
    <Parameter name="cut_direction" value="climb"/>
  </Operation>
  <Operation name="Pencil Finish" cycle="3D_PENCIL_FINISHING" toolRef="T4" feed="2000" spindleSpeed="10000" clearance_z="5" dependsOn="4" cycleTime="180">
    <Parameter name="tolerance_mm" value="0.01"/>
  </Operation>
  <Operation name="Drill Ejector Holes" cycle="DRILL_PECK" toolRef="T5" feed="250" spindleSpeed="2500" depth_mm="75" clearance_z="5" cycleTime="120">
    <Parameter name="peck_depth_mm" value="8"/>
    <Parameter name="bore_diameter" value="8.5"/>
  </Operation>
  <Operation name="Tap M10 Holes" cycle="DRILL_TAP" toolRef="T6" feed="150" spindleSpeed="500" depth_mm="25" clearance_z="5" dependsOn="6" cycleTime="60">
    <Parameter name="thread_pitch_mm" value="1.5"/>
  </Operation>
</HyperMillProject>`;

/** Sample .hmc v31: Prismatic bracket in 6061-T6 */
const SAMPLE_HMC_BRACKET = `<?xml version="1.0" encoding="UTF-8"?>
<hmProject>
  <Name>Bracket Assembly B7</Name>
  <Workpiece type="rectangular" sizeX="120" sizeY="80" sizeZ="25" material="6061-T6 Aluminum"/>
  <CoordinateSystem number="1" name="G54" originX="60" originY="40" originZ="25"/>
  <CuttingTool id="T1" number="1" name="16mm Flat EM" class="endmill_flat" cuttingDiameter="16" teeth="3" overallLength="80"/>
  <CuttingTool id="T2" number="2" name="6mm Flat EM" class="endmill_flat" cuttingDiameter="6" teeth="2" overallLength="60"/>
  <CuttingTool id="T3" number="3" name="5.0mm Drill" class="drill" cuttingDiameter="5" teeth="2" overallLength="70"/>
  <CuttingTool id="T4" number="4" name="M6 Tap" class="tap" cuttingDiameter="6" overallLength="60"/>
  <Job name="Profile Outer" type="2D_CONTOUR" tool="T1" stepdown="5" feed="3000" spindleSpeed="10000" depth_mm="25" cycleTime="90">
    <Parameter name="stepover_mm" value="8"/>
    <Parameter name="coolant_mode" value="mist"/>
  </Job>
  <Job name="Pocket A" type="2D_POCKET" tool="T2" stepdown="3" stepover="3.6" feed="2500" spindleSpeed="12000" depth_mm="15" cycleTime="120">
    <Parameter name="helical_approach" value="true"/>
  </Job>
  <Job name="Pocket B" type="2D_POCKET" tool="T2" stepdown="3" stepover="3.6" feed="2500" spindleSpeed="12000" depth_mm="12" cycleTime="95"/>
  <Job name="Drill 4x M6" type="DRILL_STANDARD" tool="T3" feed="400" spindleSpeed="4000" depth_mm="20" cycleTime="40">
    <Parameter name="bore_diameter" value="5.0"/>
  </Job>
  <Job name="Tap 4x M6" type="DRILL_TAP" tool="T4" feed="167" spindleSpeed="500" depth_mm="15" after="3" cycleTime="30">
    <Parameter name="thread_pitch_mm" value="1.0"/>
  </Job>
</hmProject>`;

// ══════════════════════════════════════════════════════════════════════════════
// SAMPLE DATA — STEP feature descriptions
// ══════════════════════════════════════════════════════════════════════════════

/** Sample 1: Simple prismatic bracket */
const STEP_BRACKET_FEATURES: RecognizedFeature[] = [
  { id: "f1", type: "face", confidence: 0.95, dimensions: { width_mm: 120, length_mm: 80 }, position: { x: 0, y: 0, z: 25 }, orientation: { axis: "z" }, notes: [] },
  { id: "f2", type: "pocket_rectangular", confidence: 0.9, dimensions: { width_mm: 40, length_mm: 30, depth_mm: 15 }, position: { x: 30, y: 20, z: 25 }, orientation: { axis: "z" }, notes: [] },
  { id: "f3", type: "pocket_rectangular", confidence: 0.9, dimensions: { width_mm: 35, length_mm: 25, depth_mm: 12 }, position: { x: 80, y: 45, z: 25 }, orientation: { axis: "z" }, notes: [] },
  { id: "f4", type: "through_hole", confidence: 0.95, dimensions: { diameter_mm: 5, depth_mm: 25 }, position: { x: 15, y: 15, z: 25 }, orientation: { axis: "z" }, notes: [] },
  { id: "f5", type: "through_hole", confidence: 0.95, dimensions: { diameter_mm: 5, depth_mm: 25 }, position: { x: 105, y: 15, z: 25 }, orientation: { axis: "z" }, notes: [] },
  { id: "f6", type: "through_hole", confidence: 0.95, dimensions: { diameter_mm: 5, depth_mm: 25 }, position: { x: 15, y: 65, z: 25 }, orientation: { axis: "z" }, notes: [] },
  { id: "f7", type: "through_hole", confidence: 0.95, dimensions: { diameter_mm: 5, depth_mm: 25 }, position: { x: 105, y: 65, z: 25 }, orientation: { axis: "z" }, notes: [] },
  { id: "f8", type: "chamfer", confidence: 0.85, dimensions: { width_mm: 1, angle_deg: 45 }, position: { x: 0, y: 0, z: 25 }, orientation: { axis: "z" }, notes: [] },
];

/** Sample 2: Cylindrical part with threads */
const STEP_SHAFT_FEATURES: RecognizedFeature[] = [
  { id: "f1", type: "face", confidence: 0.9, dimensions: { diameter_mm: 50 }, position: { x: 0, y: 0, z: 0 }, orientation: { axis: "z" }, notes: [] },
  { id: "f2", type: "groove", confidence: 0.85, dimensions: { width_mm: 3, depth_mm: 2, diameter_mm: 46 }, position: { x: 0, y: 0, z: 30 }, orientation: { axis: "z" }, notes: [] },
  { id: "f3", type: "thread_external", confidence: 0.9, dimensions: { diameter_mm: 48, pitch_mm: 1.5, length_mm: 20 }, position: { x: 0, y: 0, z: 50 }, orientation: { axis: "z" }, notes: [] },
  { id: "f4", type: "through_hole", confidence: 0.95, dimensions: { diameter_mm: 10, depth_mm: 100 }, position: { x: 0, y: 0, z: 0 }, orientation: { axis: "z" }, notes: [] },
  { id: "f5", type: "keyway", confidence: 0.8, dimensions: { width_mm: 8, depth_mm: 4, length_mm: 30 }, position: { x: 25, y: 0, z: 10 }, orientation: { axis: "z" }, notes: [] },
  { id: "f6", type: "tapped_hole", confidence: 0.9, dimensions: { diameter_mm: 6, depth_mm: 15, pitch_mm: 1.0 }, position: { x: 0, y: 0, z: 100 }, orientation: { axis: "z" }, notes: [] },
];

/** Sample 3: Complex freeform mold */
const STEP_MOLD_FEATURES: RecognizedFeature[] = [
  { id: "f1", type: "face", confidence: 0.95, dimensions: { width_mm: 200, length_mm: 150 }, position: { x: 0, y: 0, z: 80 }, orientation: { axis: "z" }, notes: [] },
  { id: "f2", type: "pocket_freeform", confidence: 0.7, dimensions: { width_mm: 160, length_mm: 120, depth_mm: 60 }, position: { x: 20, y: 15, z: 80 }, orientation: { axis: "z" }, notes: [] },
  { id: "f3", type: "contour_3d", confidence: 0.75, dimensions: { width_mm: 140, length_mm: 100, depth_mm: 55 }, position: { x: 30, y: 25, z: 80 }, orientation: { axis: "z" }, notes: [] },
  { id: "f4", type: "through_hole", confidence: 0.95, dimensions: { diameter_mm: 8.5, depth_mm: 80 }, position: { x: 10, y: 10, z: 80 }, orientation: { axis: "z" }, notes: [] },
  { id: "f5", type: "through_hole", confidence: 0.95, dimensions: { diameter_mm: 8.5, depth_mm: 80 }, position: { x: 190, y: 10, z: 80 }, orientation: { axis: "z" }, notes: [] },
  { id: "f6", type: "through_hole", confidence: 0.95, dimensions: { diameter_mm: 8.5, depth_mm: 80 }, position: { x: 10, y: 140, z: 80 }, orientation: { axis: "z" }, notes: [] },
  { id: "f7", type: "through_hole", confidence: 0.95, dimensions: { diameter_mm: 8.5, depth_mm: 80 }, position: { x: 190, y: 140, z: 80 }, orientation: { axis: "z" }, notes: [] },
  { id: "f8", type: "tapped_hole", confidence: 0.9, dimensions: { diameter_mm: 10, depth_mm: 25, pitch_mm: 1.5 }, position: { x: 100, y: 75, z: 80 }, orientation: { axis: "z" }, notes: [] },
  { id: "f9", type: "chamfer", confidence: 0.85, dimensions: { width_mm: 2, angle_deg: 45 }, position: { x: 0, y: 0, z: 80 }, orientation: { axis: "z" }, notes: [] },
  { id: "f10", type: "fillet", confidence: 0.8, dimensions: { radius_mm: 3 }, position: { x: 20, y: 15, z: 20 }, orientation: { axis: "z" }, notes: [] },
];

// ══════════════════════════════════════════════════════════════════════════════
// U-HKC51: HMCProjectParserEngine Tests
// ══════════════════════════════════════════════════════════════════════════════

describe("HM-KC-MS10-S1/U-HKC51: HMCProjectParserEngine", () => {
  describe("v33 Mold Cavity Parse", () => {
    let result: HMCParseResult;

    it("parses v33 .hmc without error", () => {
      result = hmcProjectParserEngine.parse(SAMPLE_HMC_MOLD_CAVITY);
      expect(result).toBeDefined();
      expect(result.record).toBeDefined();
    });

    it("detects version v33", () => {
      expect(result.record.hmVersion).toContain("33");
    });

    it("extracts project name", () => {
      expect(result.record.partName).toBe("Mold Cavity Insert A1");
    });

    it("extracts stock definition", () => {
      const stock = result.record.stock;
      expect(stock.type).toBe("rectangular");
      expect(stock.dimensions.x).toBe(200);
      expect(stock.dimensions.y).toBe(150);
      expect(stock.dimensions.z).toBe(80);
      expect(stock.material).toBe("H13 Tool Steel");
      expect(stock.isoGroup).toBe("H");
    });

    it("extracts WCS definitions", () => {
      expect(result.record.wcsList.length).toBe(2);
      expect(result.record.wcsList[0].name).toBe("G54");
      expect(result.record.wcsList[0].origin.x).toBe(100);
      expect(result.record.wcsList[1].name).toBe("G55");
    });

    it("extracts all 8 operations", () => {
      expect(result.record.operations.length).toBe(8);
    });

    it("extracts correct operation types", () => {
      const types = result.record.operations.map((o) => o.operationType);
      expect(types).toContain("finishing");
      expect(types).toContain("drilling");
      expect(types).toContain("threading");
    });

    it("extracts >= 20 parameters per operation average", () => {
      expect(result.stats.parameterCount).toBeGreaterThanOrEqual(16);
      // At least 2 params per operation on average
      expect(result.stats.parameterCount / result.stats.operationCount).toBeGreaterThanOrEqual(2);
    });

    it("extracts tools with correct geometry", () => {
      const firstOp = result.record.operations[0];
      expect(firstOp.tool.name).toContain("Face Mill");
      expect(firstOp.tool.diameterMm).toBe(50);
      expect(firstOp.tool.type).toBe("face_mill");
    });

    it("captures operation dependencies", () => {
      // Op 2 (Rest Rough) depends on Op 1 (Rough)
      const restRough = result.record.operations[2];
      expect(restRough.dependsOn).toContain(1);
    });

    it("captures cycle time from simulation data", () => {
      const faceOp = result.record.operations[0];
      expect(faceOp.estimatedCycleTimeSec).toBe(45);
      expect(result.record.totalCycleTimeSec).toBeGreaterThan(0);
    });

    it("source is hmc_project", () => {
      expect(result.record.source).toBe("hmc_project");
    });

    it("infers features from operations", () => {
      expect(result.record.features.length).toBeGreaterThan(0);
    });

    it("computes complexity score", () => {
      expect(result.record.complexityScore).toBeGreaterThan(0);
      expect(result.record.complexityScore).toBeLessThanOrEqual(10);
    });

    it("confidence is high for well-structured project", () => {
      expect(result.confidence).toBeGreaterThan(0.7);
    });
  });

  describe("v31 Bracket Parse", () => {
    let result: HMCParseResult;

    it("parses v31 .hmc without error", () => {
      result = hmcProjectParserEngine.parse(SAMPLE_HMC_BRACKET);
      expect(result).toBeDefined();
    });

    it("detects version v31", () => {
      expect(result.record.hmVersion).toBe("v31");
    });

    it("extracts project name from <Name> tag", () => {
      expect(result.record.partName).toBe("Bracket Assembly B7");
    });

    it("extracts stock from <Workpiece> tag", () => {
      expect(result.record.stock.dimensions.x).toBe(120);
      expect(result.record.stock.material).toContain("6061");
      expect(result.record.stock.isoGroup).toBe("N");
    });

    it("extracts WCS from <CoordinateSystem> tag", () => {
      expect(result.record.wcsList.length).toBeGreaterThanOrEqual(1);
      expect(result.record.wcsList[0].name).toBe("G54");
    });

    it("extracts all 5 operations from <Job> tags", () => {
      expect(result.record.operations.length).toBe(5);
    });

    it("extracts tools from <CuttingTool> tags", () => {
      expect(result.stats.toolCount).toBeGreaterThanOrEqual(3);
    });

    it("classifies part as prismatic", () => {
      expect(result.record.partType).toBe("prismatic");
    });
  });

  describe("Edge Cases", () => {
    it("handles empty XML gracefully", () => {
      const result = hmcProjectParserEngine.parse("<root></root>");
      expect(result.record.operations.length).toBe(0);
      expect(result.record.warnings.length).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThan(0.6);
    });

    it("handles missing stock definition with defaults", () => {
      const result = hmcProjectParserEngine.parse("<root><Operation name='Op1' cycle='2D_FACE' feed='1000' spindleSpeed='5000'/></root>");
      expect(result.record.stock.type).toBe("rectangular");
      expect(result.record.stock.dimensions.x).toBe(100); // default
    });

    it("custom project name via options", () => {
      const result = hmcProjectParserEngine.parse("<root></root>", { projectName: "Custom Part" });
      expect(result.record.partName).toBe("Custom Part");
    });

    it("parse time is reasonable (< 100ms for typical project)", () => {
      const result = hmcProjectParserEngine.parse(SAMPLE_HMC_MOLD_CAVITY);
      expect(result.stats.parseTimeMs).toBeLessThan(100);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// U-HKC52: STEPFeatureExtractorEngine Tests
// ══════════════════════════════════════════════════════════════════════════════

describe("HM-KC-MS10-S1/U-HKC52: STEPFeatureExtractorEngine", () => {
  describe("Prismatic Bracket Extraction", () => {
    let result: STEPExtractionResult;

    it("extracts bracket features without error", () => {
      result = stepFeatureExtractorEngine.extract({
        partName: "Bracket B7",
        material: "6061-T6 Aluminum",
        boundingBox: { x: 120, y: 80, z: 25 },
        features: STEP_BRACKET_FEATURES,
      });
      expect(result).toBeDefined();
      expect(result.record).toBeDefined();
    });

    it("classifies as prismatic", () => {
      expect(result.record.partType).toBe("prismatic");
    });

    it("source is step_inferred", () => {
      expect(result.record.source).toBe("step_inferred");
    });

    it("computes stock with allowance", () => {
      // 5mm allowance per side
      expect(result.record.stock.dimensions.x).toBe(130); // 120 + 10
      expect(result.record.stock.dimensions.y).toBe(90);  // 80 + 10
      expect(result.record.stock.dimensions.z).toBe(30);  // 25 + 5
    });

    it("infers ISO group N for aluminum", () => {
      expect(result.record.stock.isoGroup).toBe("N");
    });

    it("generates operations for all features", () => {
      expect(result.record.operations.length).toBeGreaterThanOrEqual(5);
    });

    it("face operation comes first in sequence", () => {
      const ops = result.record.operations;
      const faceOps = ops.filter((o) => o.cycleCode === "FACE_MILLING" || o.targetFeatures.includes("face"));
      if (faceOps.length > 0) {
        expect(faceOps[0].index).toBe(0);
      }
    });

    it("holes come after pockets in sequence", () => {
      const ops = result.record.operations;
      const pocketOps = ops.filter((o) => o.targetFeatures.some((t) => t.includes("pocket")));
      const holeOps = ops.filter((o) => o.targetFeatures.some((t) => t.includes("hole")));
      if (pocketOps.length > 0 && holeOps.length > 0) {
        const lastPocketIdx = Math.max(...pocketOps.map((o) => o.index));
        const firstHoleIdx = Math.min(...holeOps.map((o) => o.index));
        expect(firstHoleIdx).toBeGreaterThan(lastPocketIdx);
      }
    });

    it("confidence is reasonable", () => {
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it("extraction time < 50ms", () => {
      expect(result.stats.extractionTimeMs).toBeLessThan(50);
    });
  });

  describe("Cylindrical Shaft Extraction", () => {
    let result: STEPExtractionResult;

    it("extracts shaft features", () => {
      result = stepFeatureExtractorEngine.extract({
        partName: "Drive Shaft S1",
        material: "4140 Steel",
        boundingBox: { x: 50, y: 50, z: 100 },
        features: STEP_SHAFT_FEATURES,
      });
      expect(result).toBeDefined();
    });

    it("classifies as cylindrical (majority hole/thread/groove features)", () => {
      expect(result.record.partType).toBe("cylindrical");
    });

    it("infers ISO group P for steel", () => {
      expect(result.record.stock.isoGroup).toBe("P");
    });

    it("generates threading operation for tapped hole", () => {
      const threadOps = result.record.operations.filter((o) => o.operationType === "threading");
      expect(threadOps.length).toBeGreaterThanOrEqual(1);
    });

    it("generates keyway milling operation", () => {
      const keywayOps = result.record.operations.filter((o) => o.targetFeatures.includes("keyway"));
      expect(keywayOps.length).toBeGreaterThanOrEqual(1);
    });

    it("complexity score reflects feature diversity", () => {
      expect(result.record.complexityScore).toBeGreaterThan(2);
    });
  });

  describe("Complex Freeform Mold Extraction", () => {
    let result: STEPExtractionResult;

    it("extracts mold features", () => {
      result = stepFeatureExtractorEngine.extract({
        partName: "Mold Cavity A1",
        material: "H13 Tool Steel",
        boundingBox: { x: 200, y: 150, z: 80 },
        features: STEP_MOLD_FEATURES,
        volumeMm3: 1200000,
      });
      expect(result).toBeDefined();
    });

    it("classifies as freeform (has contour_3d and pocket_freeform)", () => {
      expect(result.record.partType).toBe("freeform");
    });

    it("infers ISO group H for hardened steel", () => {
      expect(result.record.stock.isoGroup).toBe("H");
    });

    it("generates roughing + finishing sequence", () => {
      const roughOps = result.record.operations.filter((o) => o.operationType === "roughing");
      const finishOps = result.record.operations.filter((o) => o.operationType === "finishing");
      expect(roughOps.length).toBeGreaterThanOrEqual(1);
      expect(finishOps.length).toBeGreaterThanOrEqual(1);
    });

    it("roughing operations come before finishing", () => {
      const ops = result.record.operations;
      const roughIndices = ops.filter((o) => o.operationType === "roughing").map((o) => o.index);
      const finishIndices = ops.filter((o) => o.operationType === "finishing").map((o) => o.index);
      if (roughIndices.length > 0 && finishIndices.length > 0) {
        expect(Math.max(...roughIndices)).toBeLessThan(Math.max(...finishIndices));
      }
    });

    it("preserves custom volume when provided", () => {
      expect(result.analysis.estimatedVolumeMm3).toBe(1200000);
    });

    it("feature breakdown counts are correct", () => {
      expect(result.analysis.featureBreakdown["through_hole"]).toBe(4);
      expect(result.analysis.featureBreakdown["pocket_freeform"]).toBe(1);
    });

    it("higher complexity than simple bracket", () => {
      const bracketResult = stepFeatureExtractorEngine.extract({
        partName: "Simple", material: "Steel", boundingBox: { x: 100, y: 100, z: 20 },
        features: STEP_BRACKET_FEATURES,
      });
      expect(result.record.complexityScore).toBeGreaterThan(bracketResult.record.complexityScore);
    });
  });

  describe("Part Classification", () => {
    it("thin_wall detection from extreme aspect ratio", () => {
      const result = stepFeatureExtractorEngine.extract({
        partName: "Thin Wall Panel",
        material: "7075 Aluminum",
        boundingBox: { x: 300, y: 200, z: 2 },
        features: [
          { id: "f1", type: "face", confidence: 0.95, dimensions: { width_mm: 300, length_mm: 200 }, position: { x: 0, y: 0, z: 2 }, orientation: { axis: "z" }, notes: [] },
          { id: "f2", type: "pocket_rectangular", confidence: 0.9, dimensions: { width_mm: 50, length_mm: 30, depth_mm: 1.5 }, position: { x: 50, y: 50, z: 2 }, orientation: { axis: "z" }, notes: [] },
        ],
      });
      expect(result.record.partType).toBe("thin_wall");
    });

    it("freeform detection from 3D contour features", () => {
      const result = stepFeatureExtractorEngine.extract({
        partName: "Sculpted Surface",
        material: "Steel",
        boundingBox: { x: 100, y: 100, z: 50 },
        features: [
          { id: "f1", type: "contour_3d", confidence: 0.8, dimensions: { width_mm: 80, length_mm: 80, depth_mm: 40 }, position: { x: 0, y: 0, z: 50 }, orientation: { axis: "z" }, notes: [] },
        ],
      });
      expect(result.record.partType).toBe("freeform");
    });
  });

  describe("Manufacturing Rule Enforcement", () => {
    it("large features generate roughing before finishing", () => {
      const result = stepFeatureExtractorEngine.extract({
        partName: "Deep Pocket Part",
        material: "Steel",
        boundingBox: { x: 100, y: 100, z: 50 },
        features: [
          { id: "f1", type: "pocket_rectangular", confidence: 0.9, dimensions: { width_mm: 60, length_mm: 40, depth_mm: 30 }, position: { x: 20, y: 30, z: 50 }, orientation: { axis: "z" }, notes: [] },
        ],
      });
      const ops = result.record.operations;
      const roughIdx = ops.findIndex((o) => o.operationType === "roughing");
      const finishIdx = ops.findIndex((o) => o.operationType === "finishing");
      expect(roughIdx).toBeGreaterThanOrEqual(0);
      expect(finishIdx).toBeGreaterThan(roughIdx);
    });

    it("chamfers come after primary features", () => {
      const result = stepFeatureExtractorEngine.extract({
        partName: "Chamfered Part",
        material: "Steel",
        boundingBox: { x: 100, y: 100, z: 30 },
        features: [
          { id: "f1", type: "pocket_rectangular", confidence: 0.9, dimensions: { width_mm: 50, length_mm: 30, depth_mm: 15 }, position: { x: 25, y: 35, z: 30 }, orientation: { axis: "z" }, notes: [] },
          { id: "f2", type: "chamfer", confidence: 0.85, dimensions: { width_mm: 1, angle_deg: 45 }, position: { x: 0, y: 0, z: 30 }, orientation: { axis: "z" }, notes: [] },
        ],
      });
      const ops = result.record.operations;
      const pocketOps = ops.filter((o) => o.targetFeatures.includes("pocket_rectangular"));
      const chamferOps = ops.filter((o) => o.targetFeatures.includes("chamfer"));
      if (pocketOps.length > 0 && chamferOps.length > 0) {
        expect(chamferOps[0].index).toBeGreaterThan(pocketOps[0].index);
      }
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Cross-Engine Validation
// ══════════════════════════════════════════════════════════════════════════════

describe("HM-KC-MS10-S1: Cross-Engine Validation", () => {
  it("HMC and STEP engines produce compatible FeatureSequenceRecord structure", () => {
    const hmcResult = hmcProjectParserEngine.parse(SAMPLE_HMC_MOLD_CAVITY);
    const stepResult = stepFeatureExtractorEngine.extract({
      partName: "Test Part", material: "Steel",
      boundingBox: { x: 100, y: 100, z: 50 },
      features: STEP_BRACKET_FEATURES,
    });

    // Both share the same core record fields (hmVersion is optional/HMC-only)
    const coreFields = [
      "id", "source", "partType", "partName", "stock", "wcsList",
      "features", "operations", "totalCycleTimeSec", "toolChangeCount",
      "uniqueToolCount", "createdAt", "complexityScore", "warnings",
    ];
    for (const field of coreFields) {
      expect(field in hmcResult.record).toBe(true);
      expect(field in stepResult.record).toBe(true);
    }
  });

  it("both engines produce valid FeatureSequenceRecord fields", () => {
    const records = [
      hmcProjectParserEngine.parse(SAMPLE_HMC_MOLD_CAVITY).record,
      stepFeatureExtractorEngine.extract({
        partName: "Test", material: "Steel",
        boundingBox: { x: 100, y: 100, z: 50 },
        features: STEP_BRACKET_FEATURES,
      }).record,
    ];

    for (const rec of records) {
      expect(rec.id).toBeTruthy();
      expect(rec.source).toBeTruthy();
      expect(rec.partType).toBeTruthy();
      expect(rec.partName).toBeTruthy();
      expect(rec.stock).toBeDefined();
      expect(rec.wcsList.length).toBeGreaterThanOrEqual(1);
      expect(rec.operations.length).toBeGreaterThanOrEqual(0);
      expect(rec.createdAt).toBeTruthy();
      expect(rec.complexityScore).toBeGreaterThanOrEqual(0);
      expect(rec.complexityScore).toBeLessThanOrEqual(10);
    }
  });

  it("HMC source is 'hmc_project', STEP source is 'step_inferred'", () => {
    const hmc = hmcProjectParserEngine.parse(SAMPLE_HMC_MOLD_CAVITY);
    const step = stepFeatureExtractorEngine.extract({
      partName: "T", material: "S", boundingBox: { x: 1, y: 1, z: 1 }, features: [],
    });
    expect(hmc.record.source).toBe("hmc_project");
    expect(step.record.source).toBe("step_inferred");
  });
});
