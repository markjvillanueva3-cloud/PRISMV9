import { describe, it, expect } from "vitest";
import { edmCuttingParamFlushEngine } from "../engines/EDMCuttingParamFlushEngine.js";

describe("EDMCuttingParamFlushEngine.calculateBreakRecovery (U-WGAP03)", () => {
  // ── BASELINE ───────────────────────────────────────────────────────────

  it("returns a backup distance in the 1.5–3.0 mm industry range for steel", () => {
    const r = edmCuttingParamFlushEngine.calculateBreakRecovery(100, 1, "D2 tool steel");
    expect(r.backup_mm).toBeGreaterThanOrEqual(1.5);
    expect(r.backup_mm).toBeLessThanOrEqual(3.0);
  });

  it("baseline steel rough pass backs up 2.0 mm (wedm-kb-003 default)", () => {
    const r = edmCuttingParamFlushEngine.calculateBreakRecovery(50, 1, "tool_steel");
    expect(r.backup_mm).toBe(2.0);
    expect(r.material_family).toBe("tool_steel");
  });

  it("retry_count equals industry-standard 3", () => {
    const r = edmCuttingParamFlushEngine.calculateBreakRecovery(50, 1, "steel");
    expect(r.retry_count).toBe(3);
  });

  // ── MATERIAL FAMILIES ──────────────────────────────────────────────────

  it("carbide uses a larger backup distance (3.0 mm)", () => {
    const r = edmCuttingParamFlushEngine.calculateBreakRecovery(50, 1, "Tungsten Carbide");
    expect(r.backup_mm).toBe(3.0);
    expect(r.material_family).toBe("carbide");
  });

  it("aluminum uses a smaller backup distance (1.5 mm)", () => {
    const r = edmCuttingParamFlushEngine.calculateBreakRecovery(50, 1, "Aluminum 6061");
    expect(r.backup_mm).toBe(1.5);
    expect(r.material_family).toBe("aluminum");
  });

  it("titanium uses 2.5 mm backup distance", () => {
    const r = edmCuttingParamFlushEngine.calculateBreakRecovery(50, 1, "Ti-6Al-4V");
    expect(r.backup_mm).toBe(2.5);
    expect(r.material_family).toBe("titanium");
  });

  it("copper/brass uses 1.5 mm", () => {
    const r = edmCuttingParamFlushEngine.calculateBreakRecovery(50, 1, "copper");
    expect(r.backup_mm).toBe(1.5);
    expect(r.material_family).toBe("copper");
  });

  it("inconel follows titanium recovery rules", () => {
    const r = edmCuttingParamFlushEngine.calculateBreakRecovery(50, 1, "Inconel 718");
    expect(r.material_family).toBe("titanium");
    expect(r.backup_mm).toBe(2.5);
  });

  // ── SKIM PASS SCALING ──────────────────────────────────────────────────

  it("skim pass scales backup down but stays >= 1.5 mm minimum", () => {
    const r = edmCuttingParamFlushEngine.calculateBreakRecovery(50, 2, "D2");
    expect(r.backup_mm).toBeGreaterThanOrEqual(1.5);
    expect(r.backup_mm).toBeLessThanOrEqual(2.0);
  });

  it("carbide skim still uses at least 1.5 mm after scaling", () => {
    const r = edmCuttingParamFlushEngine.calculateBreakRecovery(50, 3, "carbide");
    expect(r.backup_mm).toBeGreaterThanOrEqual(1.5);
  });

  it("notes pass-3 abandon-skim advice", () => {
    const r = edmCuttingParamFlushEngine.calculateBreakRecovery(50, 3, "steel");
    expect(r.notes.some((n) => /abandon skim|pass 3/i.test(n))).toBe(true);
  });

  // ── RESTART POSITION ───────────────────────────────────────────────────

  it("restart_position equals break_position minus backup", () => {
    const r = edmCuttingParamFlushEngine.calculateBreakRecovery(50, 1, "steel");
    expect(r.restart_position_mm).toBeCloseTo(50 - r.backup_mm, 3);
  });

  it("restart_position never goes negative if break is near start", () => {
    const r = edmCuttingParamFlushEngine.calculateBreakRecovery(1, 1, "carbide");
    expect(r.restart_position_mm).toBeGreaterThanOrEqual(0);
  });

  // ── REDUCED PARAMETERS ─────────────────────────────────────────────────

  it("reduced_params power is 20% less than base", () => {
    const r = edmCuttingParamFlushEngine.calculateBreakRecovery(50, 1, "steel", 100);
    expect(r.reduced_params.power_pct).toBe(80);
  });

  it("default basePower=60 gives reduced power ~48", () => {
    const r = edmCuttingParamFlushEngine.calculateBreakRecovery(50, 1, "steel");
    expect(r.reduced_params.power_pct).toBe(48);
  });

  it("wire tension reduced to 95% of nominal", () => {
    const r = edmCuttingParamFlushEngine.calculateBreakRecovery(50, 1, "steel");
    expect(r.reduced_params.wire_tension_pct).toBe(95);
  });

  it("rough pass uses longer on-time than skim", () => {
    const rough = edmCuttingParamFlushEngine.calculateBreakRecovery(50, 1, "steel");
    const skim = edmCuttingParamFlushEngine.calculateBreakRecovery(50, 2, "steel");
    expect(rough.reduced_params.on_time_us).toBeGreaterThan(skim.reduced_params.on_time_us);
  });

  // ── MATERIAL-SPECIFIC NOTES ────────────────────────────────────────────

  it("carbide emits a note about hard re-ignition", () => {
    const r = edmCuttingParamFlushEngine.calculateBreakRecovery(50, 1, "carbide");
    expect(r.notes.some((n) => /carbide/i.test(n))).toBe(true);
  });

  it("aluminum emits a note about low melting point", () => {
    const r = edmCuttingParamFlushEngine.calculateBreakRecovery(50, 1, "aluminum 6061");
    expect(r.notes.some((n) => /aluminum|melting/i.test(n))).toBe(true);
  });
});
