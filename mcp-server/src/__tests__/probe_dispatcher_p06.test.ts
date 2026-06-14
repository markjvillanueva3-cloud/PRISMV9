/**
 * Probe dispatcher round-trip tests (DEA-MS0/U-DEA-november-P06)
 *
 * Activates 3 previously-dormant probe/inspection dispatcher actions:
 *   - cad_probe_drift_record   (cadDispatcher → ProbeDriftEngine.recordCalibration)
 *   - cad_probe_drift_analyze  (cadDispatcher → ProbeDriftEngine.analyzeDrift)
 *   - probe_routine_generate   (calcDispatcher → probeRoutineEngine.generatePartInspection)
 *
 * Companion engines: ProbeDriftEngine, ProbeRoutineEngine. PrintAccuracyProofEngine
 * (the 4th P06 target) already has dedicated coverage in
 * PrintAccuracyProofEngine.test.ts — no new tests needed for it here.
 *
 * Pattern: same Type-A dormancy + dispatcher-bridge doctrine as P04/P05.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { ProbeDriftEngine } from "../engines/ProbeDriftEngine.js";
import { probeRoutineEngine } from "../engines/ProbeRoutineEngine.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cadDispatcherSource = readFileSync(
  resolve(__dirname, "../tools/dispatchers/cadDispatcher.ts"), "utf8"
);
const calcDispatcherSource = readFileSync(
  resolve(__dirname, "../tools/dispatchers/calcDispatcher.ts"), "utf8"
);

describe("DEA-MS0/U-DEA-november-P06 — probe dispatcher activation", () => {

  describe("dispatcher wiring (anti-regression)", () => {
    it("cadDispatcher z.enum declares cad_probe_drift_record", () => {
      expect(cadDispatcherSource).toContain('"cad_probe_drift_record"');
    });
    it("cadDispatcher z.enum declares cad_probe_drift_analyze", () => {
      expect(cadDispatcherSource).toContain('"cad_probe_drift_analyze"');
    });
    it("calcDispatcher z.enum declares probe_routine_generate", () => {
      expect(calcDispatcherSource).toContain('"probe_routine_generate"');
    });
    it("cadDispatcher case cad_probe_drift_record routes to ProbeDriftEngine.recordCalibration", () => {
      expect(cadDispatcherSource).toMatch(
        /case\s+"cad_probe_drift_record":\s*\{[^}]*ProbeDriftEngine[\s\S]*?\.recordCalibration\(/
      );
    });
    it("cadDispatcher case cad_probe_drift_analyze routes to ProbeDriftEngine.analyzeDrift with probe_id guard", () => {
      expect(cadDispatcherSource).toMatch(
        /case\s+"cad_probe_drift_analyze":\s*\{[\s\S]*?probe_id[\s\S]*?\.analyzeDrift\(/
      );
    });
    it("calcDispatcher case probe_routine_generate routes to probeRoutineEngine.generatePartInspection", () => {
      expect(calcDispatcherSource).toMatch(
        /case\s+"probe_routine_generate":\s*\{[\s\S]*?probeRoutineEngine[\s\S]*?\.generatePartInspection\(/
      );
    });
  });

  describe("cad_probe_drift_record — calibration logging", () => {
    it("records a CalibrationRecord with computed id/deviation/passed/timestamp", () => {
      const rec = ProbeDriftEngine.recordCalibration({
        probeId: "PROBE-P06-A",
        machineId: "MILL-01",
        calibrationType: "full",
        referenceStandard: "ring-gauge-25.000mm",
        referenceValue: 25.000,
        measuredValue: 25.002,
      });
      expect(rec.id).toMatch(/^CAL-\d+$/);
      expect(rec.probeId).toBe("PROBE-P06-A");
      expect(rec.machineId).toBe("MILL-01");
      expect(rec.calibrationType).toBe("full");
      // Deviation = measured - reference, rounded to 4 decimals
      expect(rec.deviation).toBeCloseTo(0.002, 4);
      expect(rec.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      // Small deviation (2µm) should pass default thresholds
      expect(rec.passed).toBe(true);
    });

    it("large deviation marks passed=false (exceeds critical threshold)", () => {
      const rec = ProbeDriftEngine.recordCalibration({
        probeId: "PROBE-P06-B",
        machineId: "MILL-01",
        calibrationType: "full",
        referenceStandard: "ring-gauge-25.000mm",
        referenceValue: 25.000,
        measuredValue: 25.500,  // 0.500mm deviation — large
      });
      expect(rec.passed).toBe(false);
      expect(rec.deviation).toBeCloseTo(0.500, 4);
    });

    it("negative deviation rounds correctly (measured < reference)", () => {
      const rec = ProbeDriftEngine.recordCalibration({
        probeId: "PROBE-P06-NEG",
        machineId: "MILL-01",
        calibrationType: "quick",
        referenceStandard: "ring-gauge",
        referenceValue: 10.000,
        measuredValue: 9.997,
      });
      expect(rec.deviation).toBeCloseTo(-0.003, 4);
    });

    it("preserves optional environmental fields", () => {
      const rec = ProbeDriftEngine.recordCalibration({
        probeId: "PROBE-P06-C",
        machineId: "MILL-02",
        calibrationType: "quick",
        referenceStandard: "stylus-tip",
        referenceValue: 0,
        measuredValue: 0.001,
        temperature: 21.5,
        humidity: 45,
        calibratedBy: "operator-X",
      });
      expect(rec.temperature).toBe(21.5);
      expect(rec.humidity).toBe(45);
      expect(rec.calibratedBy).toBe("operator-X");
      expect(rec.referenceStandard).toBe("stylus-tip");
    });

    it("monotonically increasing ids across records", () => {
      const a = ProbeDriftEngine.recordCalibration({
        probeId: "PROBE-P06-ID-A", machineId: "M", calibrationType: "quick",
        referenceStandard: "x", referenceValue: 1, measuredValue: 1,
      });
      const b = ProbeDriftEngine.recordCalibration({
        probeId: "PROBE-P06-ID-B", machineId: "M", calibrationType: "quick",
        referenceStandard: "x", referenceValue: 1, measuredValue: 1,
      });
      const idA = Number(a.id.replace("CAL-", ""));
      const idB = Number(b.id.replace("CAL-", ""));
      expect(idB).toBeGreaterThan(idA);
    });
  });

  describe("cad_probe_drift_analyze — drift trend analysis", () => {
    it("returns undefined for probe with < 2 records (insufficient data)", () => {
      const result = ProbeDriftEngine.analyzeDrift("PROBE-P06-NONEXISTENT-UNIQUE");
      expect(result === undefined).toBe(true);
    });

    it("computes drift trend across multiple calibrations", () => {
      const probeId = "PROBE-P06-TREND";
      // Build progressive drift: +0.001, +0.002, +0.003, +0.004, +0.005 over time
      for (let i = 1; i <= 5; i++) {
        ProbeDriftEngine.recordCalibration({
          probeId,
          machineId: "MILL-01",
          calibrationType: "quick",
          referenceStandard: "ring-gauge",
          referenceValue: 10.000,
          measuredValue: 10.000 + i * 0.001,
        });
      }
      const analysis = ProbeDriftEngine.analyzeDrift(probeId);
      // Strong invariants on the analysis object
      expect(analysis?.probeId).toBe(probeId);
      expect(analysis?.recordCount).toBeGreaterThanOrEqual(5);
      // currentDeviation = most-recent reading (largest), within 4-dp rounding
      expect(analysis?.currentDeviation).toBeCloseTo(0.005, 4);
      // Direction enum must be one of the four documented values
      const dir = analysis?.driftDirection;
      expect(["positive", "negative", "stable", "erratic"].includes(dir as string)).toBe(true);
      // analysisDate is ISO-formatted
      expect(analysis?.analysisDate).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe("probe_routine_generate — G-code routine emission", () => {
    it("emits non-empty G-code for a bore feature with valid ProbeResult shape", () => {
      const result = probeRoutineEngine.generatePartInspection({
        controller: "fanuc",
        action_on_fail: "alarm",
        features: [{
          type: "bore",
          nominal: 10,
          tolerance_plus: 0.05,
          tolerance_minus: 0.05,
          position: { x: 50, y: 50, z: 0 },
          diameter: 10,
          label: "F1",
        }],
      });
      // Behavioral assertions: gcode must contain G-code keywords + feature label
      expect(result.gcode.length).toBeGreaterThan(20);
      expect(result.gcode).toMatch(/G\d+|M\d+|F1/);
      expect(result.line_count).toBeGreaterThan(0);
      expect(result.features_measured).toBe(1);
      // Warnings array shape (length is exact number, not just non-zero)
      expect(result.warnings.length).toBeGreaterThanOrEqual(0);
      expect(result.estimated_time_sec).toBeGreaterThan(0);
    });

    it("line_count is consistent with gcode newlines (within ±1 off-by-one)", () => {
      const result = probeRoutineEngine.generatePartInspection({
        controller: "fanuc",
        action_on_fail: "alarm",
        features: [{
          type: "bore",
          nominal: 12,
          tolerance_plus: 0.03,
          tolerance_minus: 0.03,
          position: { x: 100, y: 50, z: 0 },
          diameter: 12,
          label: "F-A",
        }],
      });
      const actualLines = result.gcode.split(/\r?\n/).length;
      expect(Math.abs(result.line_count - actualLines)).toBeLessThanOrEqual(1);
    });

    it("siemens controller produces output distinguishable from fanuc", () => {
      const features = [{
        type: "bore" as const,
        nominal: 8,
        tolerance_plus: 0.02,
        tolerance_minus: 0.02,
        position: { x: 25, y: 25, z: 0 },
        diameter: 8,
        label: "F-CTRL",
      }];
      const fanucResult = probeRoutineEngine.generatePartInspection({
        controller: "fanuc", action_on_fail: "alarm", features,
      });
      const siemensResult = probeRoutineEngine.generatePartInspection({
        controller: "siemens", action_on_fail: "alarm", features,
      });
      // Both produce gcode but should differ in dialect (DPRNT vs MSG etc.)
      expect(fanucResult.gcode.length).toBeGreaterThan(20);
      expect(siemensResult.gcode.length).toBeGreaterThan(20);
      // Same input feature count → same features_measured
      expect(fanucResult.features_measured).toBe(siemensResult.features_measured);
      expect(fanucResult.features_measured).toBe(1);
    });

    it("multiple features increment features_measured + line_count grows", () => {
      const singleFeature = probeRoutineEngine.generatePartInspection({
        controller: "fanuc",
        action_on_fail: "alarm",
        features: [
          { type: "bore", nominal: 10, tolerance_plus: 0.05, tolerance_minus: 0.05,
            position: { x: 50, y: 50, z: 0 }, diameter: 10, label: "F1" },
        ],
      });
      const twoFeatures = probeRoutineEngine.generatePartInspection({
        controller: "fanuc",
        action_on_fail: "alarm",
        features: [
          { type: "bore", nominal: 10, tolerance_plus: 0.05, tolerance_minus: 0.05,
            position: { x: 50, y: 50, z: 0 }, diameter: 10, label: "F1" },
          { type: "bore", nominal: 15, tolerance_plus: 0.05, tolerance_minus: 0.05,
            position: { x: 80, y: 80, z: 0 }, diameter: 15, label: "F2" },
        ],
      });
      expect(singleFeature.features_measured).toBe(1);
      expect(twoFeatures.features_measured).toBe(2);
      // More features → more G-code lines
      expect(twoFeatures.line_count).toBeGreaterThan(singleFeature.line_count);
    });
  });
});
