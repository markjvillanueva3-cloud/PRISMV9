import { describe, it, expect } from "vitest";
import { planLead, WedmLeadInOutGeometry, type LeadGeometryInput } from "./WedmLeadInOutGeometry.js";

describe("WedmLeadInOutGeometry", () => {
  it("rough cut: line_normal in + out", () => {
    const r = planLead({ cut_kind: "rough", wire_diameter_mm: 0.25, thickness_mm: 30 });
    expect(r.lead_in_type).toBe("line_normal");
    expect(r.lead_out_type).toBe("line_normal");
  });
  it("skim cut: arc_tangent in + out", () => {
    const r = planLead({ cut_kind: "skim", wire_diameter_mm: 0.25, thickness_mm: 30 });
    expect(r.lead_in_type).toBe("arc_tangent");
    expect(r.lead_out_type).toBe("arc_tangent");
  });
  it("finish cut: ramp_in entry + arc_tangent exit (asymmetric)", () => {
    const r = planLead({ cut_kind: "finish", wire_diameter_mm: 0.20, thickness_mm: 30 });
    expect(r.lead_in_type).toBe("ramp_in");
    expect(r.lead_out_type).toBe("arc_tangent");
    expect(r.notes.join("|")).toContain("no visible mark");
  });
  it("override forces specific lead type for both in + out", () => {
    const r = planLead({ cut_kind: "rough", wire_diameter_mm: 0.25, thickness_mm: 30, override_lead_type: "ramp_in" });
    expect(r.lead_in_type).toBe("ramp_in");
    expect(r.lead_out_type).toBe("ramp_in");
    expect(r.notes.join("|")).toContain("override applied");
  });
  it("lead length scales with kerf: thicker wire → longer lead", () => {
    const thin = planLead({ cut_kind: "rough", wire_diameter_mm: 0.10, thickness_mm: 30 });
    const thick = planLead({ cut_kind: "rough", wire_diameter_mm: 0.30, thickness_mm: 30 });
    expect(thick.lead_in_length_mm.value).toBeGreaterThan(thin.lead_in_length_mm.value);
  });
  it("arc radius scales with thickness", () => {
    const thin = planLead({ cut_kind: "skim", wire_diameter_mm: 0.20, thickness_mm: 10 });
    const thick = planLead({ cut_kind: "skim", wire_diameter_mm: 0.20, thickness_mm: 200 });
    expect(thick.arc_radius_mm.value).toBeGreaterThan(thin.arc_radius_mm.value);
  });
  it("lead length floor at 2mm minimum", () => {
    const r = planLead({ cut_kind: "rough", wire_diameter_mm: 0.05, thickness_mm: 1 });
    expect(r.lead_in_length_mm.value).toBeGreaterThanOrEqual(2);
  });
  it("unknown cut_kind diagnostic", () => {
    expect(planLead({ cut_kind: "drill" as LeadGeometryInput["cut_kind"], wire_diameter_mm: 0.2, thickness_mm: 30 }).notes.join("|")).toContain("unknown cut_kind");
  });
  it("wire diameter out of range diagnostic", () => {
    expect(planLead({ cut_kind: "rough", wire_diameter_mm: 0.01, thickness_mm: 30 }).notes.join("|")).toContain("outside");
    expect(planLead({ cut_kind: "rough", wire_diameter_mm: 1.0, thickness_mm: 30 }).notes.join("|")).toContain("outside");
  });
  it("zero thickness diagnostic", () => {
    expect(planLead({ cut_kind: "rough", wire_diameter_mm: 0.2, thickness_mm: 0 }).notes.join("|")).toContain("outside");
  });
  it("unknown override diagnostic", () => {
    expect(planLead({ cut_kind: "rough", wire_diameter_mm: 0.2, thickness_mm: 30, override_lead_type: "spiral" as LeadGeometryInput["override_lead_type"] }).notes.join("|")).toContain("unknown override");
  });
  it("missing input diagnostic", () => {
    expect(planLead(null as unknown as LeadGeometryInput).notes.join("|")).toContain("missing");
  });
  it("version 1.0.0", () => {
    expect(WedmLeadInOutGeometry.version).toBe("1.0.0");
  });
});
