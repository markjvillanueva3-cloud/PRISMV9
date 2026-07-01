import { describe, it, expect } from "vitest";
import {
  CADCAMGenerationTestEngine,
  cadCamGenerationTestEngine,
  type CADOperation,
  type ToolpathSegment,
  type MachineEnvelope,
  type CADInputSpec,
} from "../engines/CADCAMGenerationTestEngine.js";

const ENVELOPE: MachineEnvelope = { x_mm: 1000, y_mm: 600, z_mm: 400 };

function cleanBracketOps(): CADOperation[] {
  return [
    { kind: "feature_extrude", dimensions: { length: 76.2, width: 38.1, depth: 12.7 }, label: "bracket_body" },
    { kind: "feature_hole",    dimensions: { diameter: 6.0, depth: 12.7 },             label: "m6_hole_1" },
    { kind: "feature_hole",    dimensions: { diameter: 6.0, depth: 12.7 },             label: "m6_hole_2" },
    { kind: "feature_hole",    dimensions: { diameter: 6.0, depth: 12.7 },             label: "m6_hole_3" },
    { kind: "feature_hole",    dimensions: { diameter: 6.0, depth: 12.7 },             label: "m6_hole_4" },
  ];
}

function cleanBracketSegments(): ToolpathSegment[] {
  return [
    { feature_id: "0", start: { x: 0, y: 0, z: 0 }, end: { x: 76.2, y: 38.1, z: -12.7 },
      feed_mm_per_min: 600, rpm: 5000, tool_id: "T01_endmill_12", strategy: "face_mill" },
    { feature_id: "1", start: { x: 10, y: 10, z: 0 }, end: { x: 10, y: 10, z: -12.7 },
      feed_mm_per_min: 200, rpm: 3000, tool_id: "T05_drill_6", strategy: "drill" },
    { feature_id: "2", start: { x: 66, y: 10, z: 0 }, end: { x: 66, y: 10, z: -12.7 },
      feed_mm_per_min: 200, rpm: 3000, tool_id: "T05_drill_6", strategy: "drill" },
    { feature_id: "3", start: { x: 10, y: 28, z: 0 }, end: { x: 10, y: 28, z: -12.7 },
      feed_mm_per_min: 200, rpm: 3000, tool_id: "T05_drill_6", strategy: "drill" },
    { feature_id: "4", start: { x: 66, y: 28, z: 0 }, end: { x: 66, y: 28, z: -12.7 },
      feed_mm_per_min: 200, rpm: 3000, tool_id: "T05_drill_6", strategy: "drill" },
  ];
}

describe("CADCAMGenerationTestEngine", () => {
  const eng = cadCamGenerationTestEngine;

  describe("runCADGen — C1 non-empty", () => {
    it("FAIL with C1_nonempty critical when generator returns empty", () => {
      const r = eng.runCADGen({
        input: { description: "" },
        generate: () => [],
      });
      expect(r.verdict).toBe("fail");
      expect(r.ops_count).toBe(0);
      const c1 = r.violations.filter((v) => v.rule === "C1_nonempty");
      expect(c1).toHaveLength(1);
      expect(c1[0].severity).toBe("critical");
    });

    it("FAIL with C1_nonempty when generator throws", () => {
      const r = eng.runCADGen({
        input: { description: "test" },
        generate: () => { throw new Error("vision parser failed"); },
      });
      expect(r.verdict).toBe("fail");
      const c1 = r.violations.filter((v) => v.rule === "C1_nonempty");
      expect(c1[0].detail).toContain("vision parser failed");
    });
  });

  describe("runCADGen — C2 valid kind", () => {
    it("FAIL with C2_kind when an op uses an unknown kind", () => {
      const r = eng.runCADGen({
        input: { description: "test" },
        generate: () => [{ kind: "feature_quantum" as unknown as CADOperation["kind"], dimensions: { x: 1 } }],
      });
      expect(r.verdict).toBe("fail");
      const c2 = r.violations.filter((v) => v.rule === "C2_kind");
      expect(c2).toHaveLength(1);
      expect(c2[0].detail).toContain("feature_quantum");
    });
  });

  describe("runCADGen — C3 dimensional sanity", () => {
    it("FAIL with C3_dimensions when a dimension is non-positive", () => {
      const r = eng.runCADGen({
        input: { description: "bad" },
        generate: () => [{ kind: "feature_hole", dimensions: { diameter: -5, depth: 10 } }],
      });
      expect(r.verdict).toBe("fail");
      const c3 = r.violations.filter((v) => v.rule === "C3_dimensions" && v.severity === "critical");
      expect(c3.length).toBeGreaterThan(0);
      expect(c3[0].detail).toContain("diameter");
    });

    it("WARN with C3_dimensions when a dimension exceeds envelope (unit error)", () => {
      const r = eng.runCADGen({
        input: { description: "huge" },
        envelope: ENVELOPE,
        generate: () => [{ kind: "feature_extrude", dimensions: { length: 100, width: 50, depth: 10, accidental_meters: 5000 } }],
      });
      // accidental_meters > 1000 envelope dim → C3 warn; depth=10 OK; topology OK
      expect(r.verdict).toBe("warn");
      const c3warn = r.violations.filter((v) => v.rule === "C3_dimensions" && v.severity === "warning");
      expect(c3warn).toHaveLength(1);
    });

    it("FAIL with C3_dimensions when a dimension is NaN", () => {
      const r = eng.runCADGen({
        input: { description: "nan" },
        generate: () => [{ kind: "feature_extrude", dimensions: { length: 50, width: 30, depth: NaN } }],
      });
      expect(r.verdict).toBe("fail");
      const c3 = r.violations.filter((v) => v.rule === "C3_dimensions");
      expect(c3.some((v) => v.detail.includes("not finite"))).toBe(true);
    });
  });

  describe("runCADGen — C4 topology coherence", () => {
    it("FAIL with C4_topology when feature_extrude has no depth", () => {
      const r = eng.runCADGen({
        input: { description: "test" },
        generate: () => [{ kind: "feature_extrude", dimensions: { length: 50, width: 30 } }],
      });
      expect(r.verdict).toBe("fail");
      const c4 = r.violations.filter((v) => v.rule === "C4_topology");
      expect(c4).toHaveLength(1);
      expect(c4[0].detail).toContain("depth");
    });

    it("FAIL with C4_topology when feature_pocket missing dimensions", () => {
      const r = eng.runCADGen({
        input: { description: "test" },
        generate: () => [{ kind: "feature_pocket", dimensions: { depth: 5 } }],
      });
      expect(r.verdict).toBe("fail");
      const c4 = r.violations.filter((v) => v.rule === "C4_topology");
      expect(c4).toHaveLength(1);
      expect(c4[0].detail).toContain("length");
    });
  });

  describe("runCADGen — C5 input invariants", () => {
    it("PASS when expected M6 hole matches an output feature_hole with diameter≈6", () => {
      const input: CADInputSpec = {
        description: "bracket with M6 holes",
        expected_features: [{ kind: "feature_hole", dimensions: { diameter: 6 }, tolerance_mm: 0.2 }],
      };
      const r = eng.runCADGen({
        input,
        generate: () => [
          { kind: "feature_extrude", dimensions: { length: 50, width: 30, depth: 10 } },
          { kind: "feature_hole", dimensions: { diameter: 6.05, depth: 10 } },
        ],
      });
      expect(r.verdict).toBe("pass");
      expect(r.violations).toHaveLength(0);
    });

    it("FAIL with C5_input_invariant when expected M6 hole is absent (diameter mismatch >tol)", () => {
      const input: CADInputSpec = {
        description: "bracket with M6 holes",
        expected_features: [{ kind: "feature_hole", dimensions: { diameter: 6 } }],
      };
      const r = eng.runCADGen({
        input,
        generate: () => [
          { kind: "feature_extrude", dimensions: { length: 50, width: 30, depth: 10 } },
          { kind: "feature_hole", dimensions: { diameter: 8, depth: 10 } }, // M8 not M6
        ],
      });
      expect(r.verdict).toBe("fail");
      const c5 = r.violations.filter((v) => v.rule === "C5_input_invariant");
      expect(c5).toHaveLength(1);
      expect(c5[0].detail).toContain("feature_hole");
    });
  });

  describe("runCAMGen — M1 per-feature coverage", () => {
    it("FAIL with M1_cover when a feature has no toolpath segment", () => {
      const ops = cleanBracketOps();
      const segs = cleanBracketSegments().slice(0, 3); // missing 2 feature coverage
      const r = eng.runCAMGen({ cad_ops: ops, generate: () => segs });
      expect(r.verdict).toBe("fail");
      const m1 = r.violations.filter((v) => v.rule === "M1_cover");
      expect(m1).toHaveLength(2);
    });
  });

  describe("runCAMGen — M2 segment shape", () => {
    it("FAIL with M2_shape when feed is below minimum", () => {
      const ops = cleanBracketOps().slice(0, 1);
      const segs: ToolpathSegment[] = [{
        feature_id: "0", start: { x: 0, y: 0, z: 0 }, end: { x: 10, y: 10, z: 0 },
        feed_mm_per_min: 0, rpm: 1000, tool_id: "T01", strategy: "face_mill",
      }];
      const r = eng.runCAMGen({ cad_ops: ops, generate: () => segs });
      expect(r.verdict).toBe("fail");
      const m2 = r.violations.filter((v) => v.rule === "M2_shape");
      expect(m2.some((v) => v.detail.includes("feed_mm_per_min"))).toBe(true);
    });

    it("FAIL with M2_shape when tool_id is empty", () => {
      const ops = cleanBracketOps().slice(0, 1);
      const segs: ToolpathSegment[] = [{
        feature_id: "0", start: { x: 0, y: 0, z: 0 }, end: { x: 10, y: 10, z: 0 },
        feed_mm_per_min: 500, rpm: 3000, tool_id: "", strategy: "face_mill",
      }];
      const r = eng.runCAMGen({ cad_ops: ops, generate: () => segs });
      expect(r.verdict).toBe("fail");
      const m2 = r.violations.filter((v) => v.rule === "M2_shape");
      expect(m2.some((v) => v.detail.includes("tool_id"))).toBe(true);
    });
  });

  describe("runCAMGen — M3 strategy ↔ feature_kind", () => {
    it("FAIL with M3_strategy when drill is used on a feature_pocket", () => {
      const ops: CADOperation[] = [{ kind: "feature_pocket", dimensions: { length: 30, width: 20, depth: 10 } }];
      const segs: ToolpathSegment[] = [{
        feature_id: "0", start: { x: 0, y: 0, z: 0 }, end: { x: 30, y: 20, z: -10 },
        feed_mm_per_min: 500, rpm: 3000, tool_id: "T05_drill", strategy: "drill",
      }];
      const r = eng.runCAMGen({ cad_ops: ops, generate: () => segs });
      expect(r.verdict).toBe("fail");
      const m3 = r.violations.filter((v) => v.rule === "M3_strategy");
      expect(m3).toHaveLength(1);
      expect(m3[0].detail).toContain("drill");
    });

    it("FAIL with M3_strategy when slot_mill is used on a feature_hole", () => {
      const ops: CADOperation[] = [{ kind: "feature_hole", dimensions: { diameter: 6, depth: 10 } }];
      const segs: ToolpathSegment[] = [{
        feature_id: "0", start: { x: 0, y: 0, z: 0 }, end: { x: 0, y: 0, z: -10 },
        feed_mm_per_min: 200, rpm: 3000, tool_id: "T07_slot", strategy: "slot_mill",
      }];
      const r = eng.runCAMGen({ cad_ops: ops, generate: () => segs });
      expect(r.verdict).toBe("fail");
      const m3 = r.violations.filter((v) => v.rule === "M3_strategy");
      expect(m3).toHaveLength(1);
      expect(m3[0].detail).toContain("slot_mill");
    });
  });

  describe("runCAMGen — M4 envelope compliance", () => {
    it("FAIL with M4_envelope when a segment endpoint exits the envelope", () => {
      const ops = cleanBracketOps().slice(0, 1);
      const segs: ToolpathSegment[] = [{
        feature_id: "0", start: { x: 0, y: 0, z: 0 }, end: { x: 99999, y: 0, z: 0 },
        feed_mm_per_min: 500, rpm: 3000, tool_id: "T01", strategy: "face_mill",
      }];
      const r = eng.runCAMGen({ cad_ops: ops, generate: () => segs, envelope: ENVELOPE });
      expect(r.verdict).toBe("fail");
      const m4 = r.violations.filter((v) => v.rule === "M4_envelope");
      expect(m4).toHaveLength(1);
      expect(m4[0].detail).toContain("envelope");
    });
  });

  describe("runCAMGen — M5 finite numerics", () => {
    it("FAIL with M5_finite when a coordinate is NaN", () => {
      const ops = cleanBracketOps().slice(0, 1);
      const segs: ToolpathSegment[] = [{
        feature_id: "0", start: { x: 0, y: 0, z: 0 }, end: { x: NaN, y: 0, z: 0 },
        feed_mm_per_min: 500, rpm: 3000, tool_id: "T01", strategy: "face_mill",
      }];
      const r = eng.runCAMGen({ cad_ops: ops, generate: () => segs });
      expect(r.verdict).toBe("fail");
      const m5 = r.violations.filter((v) => v.rule === "M5_finite");
      expect(m5).toHaveLength(1);
    });
  });

  describe("happy path — runEndToEnd PASS", () => {
    it("PASS when both CAD and CAM stages emit valid output", () => {
      const r = eng.runEndToEnd({
        input: {
          description: "bracket with 4 M6 holes",
          expected_features: [{ kind: "feature_hole", dimensions: { diameter: 6 } }],
        },
        generate_cad: () => cleanBracketOps(),
        generate_cam: () => cleanBracketSegments(),
        envelope: ENVELOPE,
      });
      expect(r.verdict).toBe("pass");
      expect(r.cad.verdict).toBe("pass");
      expect(r.cam.verdict).toBe("pass");
      expect(r.cad.ops_count).toBe(5);
      expect(r.cam.segment_count).toBe(5);
    });

    it("FAIL with CAM skipped when CAD-gen fails", () => {
      const r = eng.runEndToEnd({
        input: { description: "broken" },
        generate_cad: () => [], // empty → C1 fail
        generate_cam: () => cleanBracketSegments(),
      });
      expect(r.verdict).toBe("fail");
      expect(r.cad.verdict).toBe("fail");
      expect(r.cam.verdict).toBe("fail");
      expect(r.cam.source).toContain("skipped");
    });
  });

  describe("runSweep — multi-input aggregation", () => {
    it("3-input sweep with all pass reports pass=3, pass_rate=1", () => {
      const inputs: CADInputSpec[] = [
        { description: "bracket-1" },
        { description: "bracket-2" },
        { description: "bracket-3" },
      ];
      const result = eng.runSweep(
        inputs,
        () => cleanBracketOps(),
        () => cleanBracketSegments(),
        ENVELOPE,
      );
      expect(result.total).toBe(3);
      expect(result.pass).toBe(3);
      expect(result.fail).toBe(0);
      expect(result.pass_rate.value).toBe(1);
    });

    it("4-input sweep with 1 fail reports Wilson-bounded uncertainty", () => {
      const inputs: CADInputSpec[] = [
        { description: "good-1" },
        { description: "good-2" },
        { description: "good-3" },
        { description: "bad" },
      ];
      let callIdx = 0;
      const result = eng.runSweep(
        inputs,
        (input) => {
          if (input.description === "bad") return [];
          callIdx++;
          return cleanBracketOps();
        },
        () => cleanBracketSegments(),
        ENVELOPE,
      );
      expect(result.pass).toBe(3);
      expect(result.fail).toBe(1);
      expect(result.pass_rate.value).toBe(0.75);
      // Wilson(p=0.75, n=4) = 1.96·sqrt(0.1875/4) ≈ 0.424
      expect(result.pass_rate.uncertainty).toBeGreaterThan(0.35);
      expect(result.pass_rate.uncertainty).toBeLessThan(0.5);
    });
  });

  describe("class API", () => {
    it("fresh instance equivalence to singleton", () => {
      const fresh = new CADCAMGenerationTestEngine();
      const a = eng.runCADGen({ input: { description: "x" }, generate: () => cleanBracketOps() });
      const b = fresh.runCADGen({ input: { description: "x" }, generate: () => cleanBracketOps() });
      expect(a.verdict).toBe(b.verdict);
      expect(a.ops_count).toBe(b.ops_count);
    });
  });
});
