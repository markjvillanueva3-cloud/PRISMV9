/**
 * audit-jm-cam-libraries.test.ts
 * [JM-FUSION-TOOLS] invariant guard for the CAM-library audit core (slot:romeo).
 *
 * R9 -- proves the audit's safety checks FIRE on a real violation and STAY SILENT on a clean tool,
 * so a future weakening of any check fails this test. Exercises the pure `auditToolList` core
 * (the exact logic the CLI runs via auditMcam) on synthetic tools -- one per invariant. Also pins
 * the milling-only scoping (a turning tool must NOT get milling ap/ae snap-hazard flags -- the
 * false-positive direction that would spam the report and erode trust in the gate).
 */
import { describe, it, expect } from "vitest";
import { auditToolList, B, ISO_EXPECTED } from "./audit-jm-cam-libraries.mjs";

// A fully-valid endmill: complete geometry, full ISO coverage, in-bounds cutting data.
function cleanTool(over: Record<string, unknown> = {}) {
  return {
    tool_number: 1, id: "T1", part_number: "T1", type: "endmill",
    diameter_mm: 10, corner_radius_mm: 0, flutes: 4,
    flute_length_mm: 30, overall_length_mm: 80, shank_diameter_mm: 10,
    helix_angle_deg: 35, coating: "TiAlN",
    holder: { type: "shrink_fit", description: "h", gauge_length_mm: 90, body_diameter_mm: 30, projection_mm: 40 },
    cutting_data: ISO_EXPECTED.map((g) => ({ iso_group: g, material_label: g, vc_mpm: 150, fz_mm: 0.05, ap_mm: 10, ae_mm: 5, rpm: 4700, feed_mmpm: 940 })),
    ...over,
  };
}
const audit = (tool: unknown) => auditToolList([tool], "test.mcam-tools").findings;
const p0p1 = (fs: any[]) => fs.filter((f) => f.severity === "P0" || f.severity === "P1");
const has = (fs: any[], dim: string, sev?: string) => fs.some((f) => f.dim === dim && (!sev || f.severity === sev));
const cut = (over: Record<string, unknown>) => cleanTool({ cutting_data: ISO_EXPECTED.map((g) => ({ iso_group: g, material_label: g, vc_mpm: 150, fz_mm: 0.05, ap_mm: 10, ae_mm: 5, rpm: 4700, feed_mmpm: 940, ...over })) });

describe("audit-jm-cam-libraries invariant guard", () => {
  it("a fully-valid tool raises NO P0/P1 findings", () => {
    expect(p0p1(audit(cleanTool())).length).toBe(0);
  });

  it("OAL < flute_length -> P0 D2-unit (impossible geometry)", () => {
    const fs = audit(cleanTool({ overall_length_mm: 20, flute_length_mm: 30 }));
    expect(has(fs, "D2-unit", "P0")).toBe(true);
    expect(fs.some((f) => /impossible/.test(f.message))).toBe(true);
  });

  it("oversize diameter (161mm) -> P0 D2-unit (25.4x scale flag)", () => {
    const fs = audit(cleanTool({ diameter_mm: 161.29 }));
    expect(fs.some((f) => f.dim === "D2-unit" && f.severity === "P0" && /25\.4x/.test(f.message))).toBe(true);
  });

  it("radial WOC ae > diameter -> P0 D3-radial (WOC exceeds tool)", () => {
    expect(has(audit(cut({ ae_mm: 25 })), "D3-radial", "P0")).toBe(true);
  });

  it("axial ap > 3xD -> P0 D3-axial (snap hazard)", () => {
    const fs = audit(cut({ ap_mm: 35 })); // 3.5xD on a 10mm tool
    expect(fs.some((f) => f.dim === "D3-axial" && f.severity === "P0" && /SNAP HAZARD/.test(f.message))).toBe(true);
  });

  it("non-finite cutting value -> P0 D3-cut", () => {
    expect(has(audit(cut({ vc_mpm: NaN })), "D3-cut", "P0")).toBe(true);
    expect(has(audit(cut({ feed_mmpm: Infinity })), "D3-cut", "P0")).toBe(true);
  });

  it("missing holder object -> P1 D1-holder", () => {
    expect(has(audit(cleanTool({ holder: undefined })), "D1-holder", "P1")).toBe(true);
  });

  it("missing flute_length -> P1 D1-complete", () => {
    expect(has(audit(cleanTool({ flute_length_mm: 0 })), "D1-complete", "P1")).toBe(true);
  });

  it("vc above sanity bound -> P1 D3-cut", () => {
    expect(has(audit(cut({ vc_mpm: B.VC[1] + 1000 })), "D3-cut", "P1")).toBe(true);
  });

  it("ISO coverage missing >=4 groups -> P1 D4-iso", () => {
    const fs = audit(cleanTool({ cutting_data: [{ iso_group: "P", vc_mpm: 150, fz_mm: 0.05, ap_mm: 10, ae_mm: 5, rpm: 4700, feed_mmpm: 940 }, { iso_group: "M", vc_mpm: 120, fz_mm: 0.04, ap_mm: 8, ae_mm: 4, rpm: 4000, feed_mmpm: 640 }] }));
    expect(has(fs, "D4-iso", "P1")).toBe(true);
  });

  it("duplicate tool_number across two tools -> P1 D6-dup", () => {
    const fs = auditToolList([cleanTool(), cleanTool({ part_number: "T2", id: "T2" })], "test.mcam-tools").findings;
    expect(has(fs, "D6-dup", "P1")).toBe(true);
  });

  it("gross shank scale error (>100mm) -> P0 D2-unit (the 25374mm/999in case)", () => {
    const fs = audit(cleanTool({ shank_diameter_mm: 25374.6 }));
    expect(fs.some((f) => f.dim === "D2-unit" && f.severity === "P0" && /scale error/.test(f.message))).toBe(true);
  });

  it("a mildly out-of-range shank (90mm) stays P2, NOT P0", () => {
    const fs = audit(cleanTool({ shank_diameter_mm: 90 }));
    expect(fs.some((f) => f.dim === "D2-unit" && f.severity === "P2")).toBe(true);
    expect(fs.some((f) => f.dim === "D2-unit" && f.severity === "P0")).toBe(false);
  });

  it("library-level uniformity: all-uncoated + single helix -> P2 D7 (one finding each, not per-tool)", () => {
    const tools = Array.from({ length: 60 }, (_, i) => cleanTool({ tool_number: i + 1, id: `T${i}`, part_number: `T${i}`, coating: "uncoated" }));
    const fs = auditToolList(tools, "lib.mcam-tools").findings;
    const d7 = fs.filter((f) => f.dim === "D7-uniformity");
    expect(d7.some((f) => /uncoated/.test(f.message))).toBe(true);
    expect(d7.some((f) => /helix_angle/.test(f.message))).toBe(true);
    // one finding per uniformity class, NOT 60
    expect(d7.length).toBeLessThanOrEqual(2);
  });

  it("turning/boring tool: no flute required (no 'missing flute' P1, no OAL<flute P0)", () => {
    const fs = audit(cleanTool({ type: "boring_bar", flute_length_mm: 0, overall_length_mm: 20 }));
    expect(fs.some((f) => /flute_length_mm missing/.test(f.message))).toBe(false);
    expect(fs.some((f) => /impossible geometry/.test(f.message))).toBe(false);
  });

  it("non-flute tool carrying an absurd flute -> P2 (flagged, not silently ignored)", () => {
    const fs = audit(cleanTool({ type: "boring_bar", flute_length_mm: 500 }));
    expect(fs.some((f) => f.dim === "D2-unit" && f.severity === "P2" && /non-flute/.test(f.message))).toBe(true);
  });

  it("milling tool STILL requires a flute (the no-flute skip is type-scoped, not over-broad)", () => {
    expect(has(audit(cleanTool({ type: "endmill", flute_length_mm: 0 })), "D1-complete", "P1")).toBe(true);
  });

  // ---- false-positive guard: milling-only checks must NOT fire on turning tools ----
  it("turning tool with large ap/ae is NOT flagged for milling axial/radial limits", () => {
    const fs = audit(cleanTool({ type: "turning", cutting_data: ISO_EXPECTED.map((g) => ({ iso_group: g, vc_mpm: 150, fz_mm: 0.05, ap_mm: 100, ae_mm: 50, rpm: 4700, feed_mmpm: 940 })) }));
    expect(has(fs, "D3-axial")).toBe(false);
    expect(has(fs, "D3-radial")).toBe(false);
  });

  // ---- adversarial inputs: must not throw ----
  it("empty tool list -> no findings, no throw", () => {
    expect(auditToolList([], "x").findings.length).toBe(0);
  });

  it("all-fields-missing tool -> flagged (not thrown)", () => {
    const fs = audit({ type: "endmill" });
    expect(has(fs, "D1-complete", "P0")).toBe(true); // missing diameter
  });

  it("Infinity diameter -> P0 (treated as missing/invalid, not crash)", () => {
    expect(has(audit(cleanTool({ diameter_mm: Infinity })), "D1-complete", "P0")).toBe(true);
  });
});
