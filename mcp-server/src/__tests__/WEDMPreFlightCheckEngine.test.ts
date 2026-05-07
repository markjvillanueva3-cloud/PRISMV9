import { describe, it, expect } from "vitest";
import {
  WEDMPreFlightCheckEngine,
  wedmPreFlightCheckEngine,
  type PreFlightInput,
} from "../engines/WEDMPreFlightCheckEngine.js";

function makeInput(overrides: Partial<PreFlightInput> = {}): PreFlightInput {
  return {
    material: "D2",
    thickness_mm: 25,
    wire_type: "brass_0.25",
    wire_diameter_mm: 0.25,
    ...overrides,
  };
}

describe("WEDMPreFlightCheckEngine", () => {
  const engine = new WEDMPreFlightCheckEngine();

  it("exposes a singleton", () => {
    expect(wedmPreFlightCheckEngine).toBeInstanceOf(WEDMPreFlightCheckEngine);
  });

  // ── BASELINE CHECKLIST ────────────────────────────────────────────────

  it("produces a checklist with items across multiple categories", () => {
    const r = engine.generateChecklist(makeInput());
    expect(r.total_items).toBeGreaterThan(0);
    expect(r.checklist.length).toBe(r.total_items);
    expect(r.categories.length).toBeGreaterThanOrEqual(5);
  });

  it("pass_count + warn_count + info_count equals total", () => {
    const r = engine.generateChecklist(makeInput());
    expect(r.critical_count + r.warning_count + r.info_count).toBe(r.total_items);
  });

  it("includes the required baseline categories", () => {
    const r = engine.generateChecklist(makeInput());
    expect(r.categories).toContain("machine_ready");
    expect(r.categories).toContain("workpiece");
    expect(r.categories).toContain("wire_path");
    expect(r.categories).toContain("dielectric");
    expect(r.categories).toContain("safety_equipment");
    expect(r.categories).toContain("program_verify");
  });

  it("produces an HTML rendering that includes key fields", () => {
    const r = engine.generateChecklist(makeInput({ material: "D2", thickness_mm: 25 }));
    expect(r.html).toContain("<!DOCTYPE html>");
    expect(r.html).toContain("Pre-Flight Safety Checklist");
    expect(r.html).toContain("D2");
    expect(r.html).toContain("25mm");
  });

  it("escapes HTML in material name", () => {
    const r = engine.generateChecklist(makeInput({ material: "<script>x</script>" }));
    expect(r.html).not.toContain("<script>x</script>");
    expect(r.html).toContain("&lt;script&gt;");
  });

  it("returns a one-line summary with counts", () => {
    const r = engine.generateChecklist(makeInput());
    expect(r.summary).toMatch(/Pre-flight checklist: \d+ items/);
    expect(r.summary).toMatch(/\d+ critical/);
  });

  // ── TAPER ─────────────────────────────────────────────────────────────

  it("adds a UV-travel check when taper angle > 0", () => {
    const r = engine.generateChecklist(makeInput({ taper_angle_deg: 5 }));
    const ids = r.checklist.map((c) => c.id);
    expect(ids).toContain("MR-05");
  });

  it("omits the UV-travel check when no taper", () => {
    const r = engine.generateChecklist(makeInput());
    const ids = r.checklist.map((c) => c.id);
    expect(ids).not.toContain("MR-05");
  });

  // ── THICKNESS ─────────────────────────────────────────────────────────

  it("adds thick-section flush-alignment check when thickness > 100mm", () => {
    const r = engine.generateChecklist(makeInput({ thickness_mm: 150 }));
    const ids = r.checklist.map((c) => c.id);
    expect(ids).toContain("WP-04");
  });

  it("omits thick-section check at normal thickness", () => {
    const r = engine.generateChecklist(makeInput({ thickness_mm: 25 }));
    const ids = r.checklist.map((c) => c.id);
    expect(ids).not.toContain("WP-04");
  });

  // ── HARDNESS ──────────────────────────────────────────────────────────

  it("adds high-hardness info when HRC > 55", () => {
    const r = engine.generateChecklist(makeInput({ hardness_hrc: 62 }));
    const ids = r.checklist.map((c) => c.id);
    expect(ids).toContain("WP-05");
  });

  // ── CARBIDE / WIRE MATCH ──────────────────────────────────────────────

  it("warns on carbide with uncoated wire", () => {
    const r = engine.generateChecklist(
      makeInput({ material: "Tungsten Carbide", wire_type: "brass_0.25" }),
    );
    const ids = r.checklist.map((c) => c.id);
    expect(ids).toContain("WR-05");
  });

  it("does not warn on carbide with coated wire", () => {
    const r = engine.generateChecklist(
      makeInput({ material: "Tungsten Carbide", wire_type: "coated_zinc_0.25" }),
    );
    const ids = r.checklist.map((c) => c.id);
    expect(ids).not.toContain("WR-05");
  });

  // ── DIELECTRIC ────────────────────────────────────────────────────────

  it("adds submerged dielectric check by default", () => {
    const r = engine.generateChecklist(makeInput());
    const ids = r.checklist.map((c) => c.id);
    expect(ids).toContain("DI-04");
  });

  it("omits submerged check when submerged=false", () => {
    const r = engine.generateChecklist(makeInput({ submerged: false }));
    const ids = r.checklist.map((c) => c.id);
    expect(ids).not.toContain("DI-04");
  });

  it("warns on high flush pressure", () => {
    const r = engine.generateChecklist(makeInput({ flush_pressure_bar: 12 }));
    const ids = r.checklist.map((c) => c.id);
    expect(ids).toContain("DI-05");
  });

  // ── PROFILES ──────────────────────────────────────────────────────────

  it("adds multi-profile start-hole check when num_profiles > 1", () => {
    const r = engine.generateChecklist(makeInput({ num_profiles: 4 }));
    const ids = r.checklist.map((c) => c.id);
    expect(ids).toContain("PV-04");
  });

  // ── UNATTENDED ────────────────────────────────────────────────────────

  it("adds unattended-operation checks when is_unattended", () => {
    const r = engine.generateChecklist(
      makeInput({ is_unattended: true, estimated_time_min: 360 }),
    );
    const ids = r.checklist.map((c) => c.id);
    expect(ids).toContain("ENV-01");
    expect(ids).toContain("ENV-02");
  });

  it("adds long-run monitoring note when estimated_time > 120min", () => {
    const r = engine.generateChecklist(
      makeInput({ estimated_time_min: 240 }),
    );
    const ids = r.checklist.map((c) => c.id);
    expect(ids).toContain("ENV-04");
  });

  // ── TITANIUM FIRE RISK ────────────────────────────────────────────────

  it("flags titanium material with fire-risk check", () => {
    const r = engine.generateChecklist(makeInput({ material: "Ti-6Al-4V" }));
    const ids = r.checklist.map((c) => c.id);
    expect(ids).toContain("ENV-05");
  });

  // ── ACKNOWLEDGEMENT FLAGS ─────────────────────────────────────────────

  it("every critical item requires acknowledgement", () => {
    const r = engine.generateChecklist(makeInput({ is_unattended: true, taper_angle_deg: 3, thickness_mm: 120 }));
    const criticals = r.checklist.filter((c) => c.severity === "critical");
    for (const c of criticals) {
      expect(c.requires_acknowledgement).toBe(true);
    }
  });

  // ── INSTANCE API ──────────────────────────────────────────────────────

  it("singleton returns identical structure to new instance", () => {
    const a = engine.generateChecklist(makeInput());
    const b = wedmPreFlightCheckEngine.generateChecklist(makeInput());
    expect(a.total_items).toBe(b.total_items);
    expect(a.categories).toEqual(b.categories);
  });
});
