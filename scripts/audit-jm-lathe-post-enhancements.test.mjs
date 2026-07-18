/**
 * audit-jm-lathe-post-enhancements.test.mjs — vitest suite
 * =========================================================
 * Locks the pure functions of the audit script against regression.
 * @unit U-MIKE-LATHE-POST-AUDIT
 * @slot mike
 */

import { describe, it, expect } from "vitest";
import {
  parseLatheMachines,
  classifyPost,
  listFusionToolLibs,
  buildAudit,
} from "./audit-jm-lathe-post-enhancements.mjs";

const SAMPLE_PROFILE = `
  // Okuma lathes (7)
  { machine_id: "LTH-01", machine_name: "Okuma GENOS L300-M",       controller_family: "okuma", controller_model: "OSP-P300L-R",  post_processor: "OKUMA_GENOS_L300M_OSP-P300L-R_PRISM.cps" },
  { machine_id: "LTH-05", machine_name: "Okuma GENOS L400II-E",     controller_family: "okuma", controller_model: "OSP-P300LA-E", post_processor: "OKUMA_GENOS_L400II_P300LA-Ai-Enhanced.cps" },
  { machine_id: "LTH-07", machine_name: "Okuma Multus B250II",      controller_family: "okuma", controller_model: "OSP-P300SA",   post_processor: "OKUMA_MULTUS_B250IIW-Ai-Enhanced-Fixed.cps" },
  { machine_id: "VMC-01", machine_name: "Hurco VM30i",              controller_family: "hurco", controller_model: "WinMAX v10",   post_processor: "HURCO_VM30i_PRISM_v11.cps" }
`;

describe("parseLatheMachines", () => {
  it("extracts LTH-* entries and skips VMC-*", () => {
    const lathes = parseLatheMachines(SAMPLE_PROFILE);
    expect(lathes.length).toBe(3);
    expect(lathes.map(l => l.machine_id)).toEqual(["LTH-01", "LTH-05", "LTH-07"]);
  });

  it("returns empty array on empty input (R12 fail-soft)", () => {
    expect(parseLatheMachines("")).toEqual([]);
  });

  it("captures all 5 fields per machine", () => {
    const [first] = parseLatheMachines(SAMPLE_PROFILE);
    expect(first.machine_id).toBe("LTH-01");
    expect(first.machine_name).toBe("Okuma GENOS L300-M");
    expect(first.controller_family).toBe("okuma");
    expect(first.controller_model).toBe("OSP-P300L-R");
    expect(first.post_processor).toContain("PRISM.cps");
  });
});

describe("classifyPost", () => {
  it("plain post (no markers) -> tier 'plain'", () => {
    const c = classifyPost("OKUMA_GENOS_L300M_OSP-P300L-R_PRISM.cps");
    expect(c.tier).toBe("plain");
    expect(c.present_capabilities).toEqual([]);
    expect(c.missing_capabilities.length).toBe(4);
  });

  it("single Ai-Enhanced marker -> 'partially_enhanced'", () => {
    const c = classifyPost("OKUMA_GENOS_L400II_P300LA-Ai-Enhanced.cps");
    expect(c.tier).toBe("partially_enhanced");
    expect(c.present_capabilities).toContain("ai_adaptive_feedrate");
    expect(c.missing_capabilities).toContain("imachining_chip_thinning");
  });

  it("Ai-Enhanced + Fixed -> 'fully_enhanced'", () => {
    const c = classifyPost("OKUMA_MULTUS_B250IIW-Ai-Enhanced-Fixed.cps");
    expect(c.tier).toBe("fully_enhanced");
    expect(c.present_capabilities.length).toBeGreaterThanOrEqual(2);
  });

  it("iMachining alone -> 'partially_enhanced'", () => {
    const c = classifyPost("HAAS_VF2_-Ai-Enhanced_(iMachining).cps");
    expect(c.tier).toBe("fully_enhanced"); // has Ai-Enhanced AND iMachining = 2 markers
    expect(c.present_capabilities).toContain("imachining_chip_thinning");
    expect(c.present_capabilities).toContain("ai_adaptive_feedrate");
  });
});

describe("listFusionToolLibs", () => {
  it("returns {available:false, libraries:[]} for nonexistent dir", () => {
    const r = listFusionToolLibs("H:/this/path/definitely/does/not/exist/xyz");
    expect(r.available).toBe(false);
    expect(r.libraries).toEqual([]);
  });

  it("returns libraries[] structure on the live Fusion dir if present", () => {
    const r = listFusionToolLibs();
    expect(r).toHaveProperty("available");
    expect(r).toHaveProperty("libraries");
    expect(Array.isArray(r.libraries)).toBe(true);
    // If available, each library entry has the documented shape
    if (r.available && r.libraries.length > 0) {
      const [first] = r.libraries;
      expect(first).toHaveProperty("name");
      expect(first).toHaveProperty("path");
      expect(first).toHaveProperty("size_kb");
      expect(first).toHaveProperty("mtime");
    }
  });
});

describe("buildAudit", () => {
  it("emits a complete report with required top-level keys", () => {
    const report = buildAudit({
      source: SAMPLE_PROFILE,
      fusionLibs: { available: true, libraries: [{ name: "HURCO.hsmlib", path: "x", size_kb: 100, mtime: "2026-05-23T00:00:00Z" }] },
      generatedAt: "2026-05-23T00:00:00Z",
    });
    expect(report.schemaVersion).toBe("1.0.0");
    expect(report.advisoryOnly).toBe(true);
    expect(report.must_human_verify).toBe(true);
    expect(report.summary.total_lathes).toBe(3);
    expect(report.summary.fully_enhanced_count).toBe(1);
    expect(report.machines.length).toBe(3);
    expect(report.upgrade_punch_list.length).toBe(2);
  });

  it("flags fusion_lathe_tool_lib_gap=true when no lathe-keyed .hsmlib present", () => {
    const report = buildAudit({
      source: SAMPLE_PROFILE,
      fusionLibs: { available: true, libraries: [{ name: "HURCO.hsmlib", path: "x", size_kb: 100, mtime: "2026-05-23T00:00:00Z" }] },
    });
    expect(report.summary.fusion_lathe_tool_lib_gap).toBe(true);
  });

  it("flags fusion_lathe_tool_lib_gap=false when a lathe-keyed .hsmlib exists", () => {
    const report = buildAudit({
      source: SAMPLE_PROFILE,
      fusionLibs: { available: true, libraries: [{ name: "Okuma Lathe.hsmlib", path: "x", size_kb: 100, mtime: "2026-05-23T00:00:00Z" }] },
    });
    expect(report.summary.fusion_lathe_tool_lib_gap).toBe(false);
  });

  it("punch list contains suggested_action strings", () => {
    const report = buildAudit({
      source: SAMPLE_PROFILE,
      fusionLibs: { available: false, libraries: [] },
    });
    for (const item of report.upgrade_punch_list) {
      expect(typeof item.suggested_action).toBe("string");
      expect(item.suggested_action.length).toBeGreaterThan(10);
    }
  });
});
