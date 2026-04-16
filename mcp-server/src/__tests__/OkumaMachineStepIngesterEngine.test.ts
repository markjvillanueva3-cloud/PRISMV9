/**
 * OkumaMachineStepIngesterEngine Test Suite
 * ============================================
 *
 * LATHE-AWARE-HARDEN MS3 U-LAT27 — Validates STEP AP214 parsing + axis
 * inference from Okuma machine models.
 *
 * @milestone LATHE-AWARE-HARDEN MS3
 * @unit U-LAT27
 */

import { describe, it, expect } from "vitest";
import { okumaMachineStepIngesterEngine } from "../engines/OkumaMachineStepIngesterEngine.js";

const SAMPLE_STEP = `ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('Okuma LB3000','STEP AP214'),'2;1');
FILE_NAME('lb3000.step','2026-04-16T12:00:00',('Okuma'),(''),'','','');
FILE_SCHEMA(('AUTOMOTIVE_DESIGN'));
ENDSEC;
DATA;
#10 = CARTESIAN_POINT('origin',(0.0,0.0,0.0));
#11 = CARTESIAN_POINT('x_axis_origin',(125.0,0.0,0.0));
#12 = CARTESIAN_POINT('z_axis_origin',(0.0,0.0,500.0));
#20 = DIRECTION('x_dir',(1.0,0.0,0.0));
#21 = DIRECTION('z_dir',(0.0,0.0,1.0));
#30 = AXIS2_PLACEMENT_3D('X_AXIS',#11,#20,#21);
#31 = AXIS2_PLACEMENT_3D('Z_AXIS',#12,#21,#20);
#32 = AXIS2_PLACEMENT_3D('TAILSTOCK',#12,#21,#20);
#40 = PRODUCT('LB3000-MYW','Okuma Mill-Turn','',(#1));
ENDSEC;
END-ISO-10303-21;
`;

describe("OkumaMachineStepIngesterEngine", () => {
  // ── parseContent() ───────────────────────────────────────────────────

  describe("parseContent()", () => {
    it("parses header description", () => {
      const r = okumaMachineStepIngesterEngine.parseContent(SAMPLE_STEP);
      expect(r.header_description?.some((h) => /LB3000/.test(h))).toBe(true);
    });

    it("extracts ISO schema from FILE_SCHEMA", () => {
      const r = okumaMachineStepIngesterEngine.parseContent(SAMPLE_STEP);
      expect(r.iso_schema).toBe("AUTOMOTIVE_DESIGN");
    });

    it("extracts 3 cartesian points", () => {
      const r = okumaMachineStepIngesterEngine.parseContent(SAMPLE_STEP);
      expect(r.cartesian_points).toBe(3);
    });

    it("extracts 2 directions", () => {
      const r = okumaMachineStepIngesterEngine.parseContent(SAMPLE_STEP);
      expect(r.directions).toBe(2);
    });

    it("extracts 3 axis placements", () => {
      const r = okumaMachineStepIngesterEngine.parseContent(SAMPLE_STEP);
      expect(r.axis_placements.length).toBe(3);
    });

    it("infers X axis from named placement", () => {
      const r = okumaMachineStepIngesterEngine.parseContent(SAMPLE_STEP);
      const xAxis = r.detected_axes.find((a) => a.axis_letter === "X");
      expect(xAxis).toBeDefined();
      expect(xAxis?.origin_mm.x).toBe(125);
    });

    it("infers Z axis from named placement", () => {
      const r = okumaMachineStepIngesterEngine.parseContent(SAMPLE_STEP);
      const zAxis = r.detected_axes.find(
        (a) => a.axis_letter === "Z" && a.frame_name === "Z_AXIS"
      );
      expect(zAxis).toBeDefined();
    });

    it("infers TAILSTOCK → Z axis", () => {
      const r = okumaMachineStepIngesterEngine.parseContent(SAMPLE_STEP);
      const tail = r.detected_axes.find(
        (a) => a.frame_name === "TAILSTOCK" && a.axis_letter === "Z"
      );
      expect(tail).toBeDefined();
    });

    it("extracts product name", () => {
      const r = okumaMachineStepIngesterEngine.parseContent(SAMPLE_STEP);
      expect(r.product_names).toContain("LB3000-MYW");
    });

    it("reports entity_count", () => {
      const r = okumaMachineStepIngesterEngine.parseContent(SAMPLE_STEP);
      expect(r.entity_count).toBeGreaterThanOrEqual(5);
    });

    it("empty content produces no warnings when gracefully handled", () => {
      const r = okumaMachineStepIngesterEngine.parseContent("");
      expect(r.cartesian_points).toBe(0);
      expect(r.axis_placements.length).toBe(0);
    });

    it("missing origin point produces warning", () => {
      const bad = `DATA;\n#30 = AXIS2_PLACEMENT_3D('ORPHAN',#999);\nENDSEC;`;
      const r = okumaMachineStepIngesterEngine.parseContent(bad);
      expect(r.parse_warnings.some((w) => /not found/.test(w))).toBe(true);
    });
  });

  // ── parseFile() ───────────────────────────────────────────────────────

  describe("parseFile()", () => {
    it("returns empty for missing file", () => {
      const r = okumaMachineStepIngesterEngine.parseFile("H:/ghost.step");
      expect(r.cartesian_points).toBe(0);
      expect(r.parse_warnings.some((w) => /not found/.test(w))).toBe(true);
    });
  });

  // ── getStats() ────────────────────────────────────────────────────────

  describe("getStats()", () => {
    it("reports supported schemas", () => {
      const stats = okumaMachineStepIngesterEngine.getStats();
      expect(stats.supported_schemas).toContain("AP214");
    });

    it("reports recognized STEP entities", () => {
      const stats = okumaMachineStepIngesterEngine.getStats();
      expect(stats.recognized_entities).toContain("CARTESIAN_POINT");
      expect(stats.recognized_entities).toContain("AXIS2_PLACEMENT_3D");
    });

    it("reports axis inference rules", () => {
      const stats = okumaMachineStepIngesterEngine.getStats();
      expect(stats.axis_inference_rules.length).toBeGreaterThan(3);
    });
  });
});
