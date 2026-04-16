/**
 * Wire Break Recovery Tests — U-WGAP03/U-WGAP04
 * Tests the calculateBreakRecovery() method in EDMCuttingParamFlushEngine.
 * Verifies backup distance, retry count, power reduction, and material-specific logic.
 */
import { describe, it, expect } from "vitest";
import { edmCuttingParamFlushEngine } from "../engines/EDMCuttingParamFlushEngine.js";

describe("EDMCuttingParamFlushEngine.calculateBreakRecovery", () => {
  // =========================================================================
  // Material-dependent backup distances
  // =========================================================================

  it("returns 2.0mm base backup for standard steel (D2)", () => {
    const result = edmCuttingParamFlushEngine.calculateBreakRecovery(50, 1, "D2", 25);
    // Base 2.0 + pass adj 0.5 (rough) = 2.5
    expect(result.backup_mm).toBeCloseTo(2.5, 1);
  });

  it("returns 3.0mm base backup for titanium (Ti-6Al-4V)", () => {
    const result = edmCuttingParamFlushEngine.calculateBreakRecovery(50, 2, "Ti-6Al-4V", 25);
    // Base 3.0 + pass adj 0.0 (skim) = 3.0
    expect(result.backup_mm).toBeCloseTo(3.0, 1);
  });

  it("returns 2.5mm base backup for carbide (WC)", () => {
    const result = edmCuttingParamFlushEngine.calculateBreakRecovery(50, 2, "WC", 25);
    // Base 2.5 + pass adj 0.0 (skim) = 2.5
    expect(result.backup_mm).toBeCloseTo(2.5, 1);
  });

  it("returns 1.5mm base backup for aluminum (6061)", () => {
    const result = edmCuttingParamFlushEngine.calculateBreakRecovery(50, 2, "6061", 25);
    // Base 1.5 + pass adj 0.0 (skim) = 1.5
    expect(result.backup_mm).toBeCloseTo(1.5, 1);
  });

  it("returns 1.5mm base backup for copper alloys", () => {
    const result = edmCuttingParamFlushEngine.calculateBreakRecovery(50, 2, "copper", 25);
    expect(result.backup_mm).toBeCloseTo(1.5, 1);
  });

  // =========================================================================
  // Thickness adjustment
  // =========================================================================

  it("adds 0.5mm per 50mm above 25mm thickness", () => {
    const thin = edmCuttingParamFlushEngine.calculateBreakRecovery(50, 2, "D2", 25);
    const thick = edmCuttingParamFlushEngine.calculateBreakRecovery(50, 2, "D2", 75);
    // 75mm - 25mm = 50mm → +0.5mm additional backup
    expect(thick.backup_mm - thin.backup_mm).toBeCloseTo(0.5, 1);
  });

  it("no additional backup for thickness <= 25mm", () => {
    const result10 = edmCuttingParamFlushEngine.calculateBreakRecovery(50, 2, "D2", 10);
    const result25 = edmCuttingParamFlushEngine.calculateBreakRecovery(50, 2, "D2", 25);
    expect(result10.backup_mm).toBe(result25.backup_mm);
  });

  // =========================================================================
  // Pass number adjustment
  // =========================================================================

  it("adds 0.5mm for rough pass (passNumber=1)", () => {
    const rough = edmCuttingParamFlushEngine.calculateBreakRecovery(50, 1, "D2", 25);
    const skim = edmCuttingParamFlushEngine.calculateBreakRecovery(50, 2, "D2", 25);
    expect(rough.backup_mm - skim.backup_mm).toBeCloseTo(0.5, 1);
  });

  // =========================================================================
  // Retry counts
  // =========================================================================

  it("returns max_retries=3 for standard steel", () => {
    const result = edmCuttingParamFlushEngine.calculateBreakRecovery(50, 1, "D2", 25);
    expect(result.max_retries).toBe(3);
  });

  it("returns max_retries=2 for difficult materials (titanium)", () => {
    const result = edmCuttingParamFlushEngine.calculateBreakRecovery(50, 1, "titanium", 25);
    expect(result.max_retries).toBe(2);
  });

  it("returns max_retries=2 for carbide", () => {
    const result = edmCuttingParamFlushEngine.calculateBreakRecovery(50, 1, "carbide", 25);
    expect(result.max_retries).toBe(2);
  });

  it("returns max_retries=2 for Inconel", () => {
    const result = edmCuttingParamFlushEngine.calculateBreakRecovery(50, 1, "Inconel 718", 25);
    expect(result.max_retries).toBe(2);
  });

  // =========================================================================
  // Power reduction
  // =========================================================================

  it("reduces power more for rough pass than skim", () => {
    const rough = edmCuttingParamFlushEngine.calculateBreakRecovery(50, 1, "D2", 25);
    const skim = edmCuttingParamFlushEngine.calculateBreakRecovery(50, 2, "D2", 25);
    expect(rough.reduced_params.peak_current_factor).toBeLessThan(skim.reduced_params.peak_current_factor);
    expect(rough.reduced_params.feed_rate_factor).toBeLessThan(skim.reduced_params.feed_rate_factor);
  });

  it("rough pass gets 75% power and 70% feed", () => {
    const rough = edmCuttingParamFlushEngine.calculateBreakRecovery(50, 1, "D2", 25);
    expect(rough.reduced_params.peak_current_factor).toBe(0.75);
    expect(rough.reduced_params.on_time_factor).toBe(0.75);
    expect(rough.reduced_params.feed_rate_factor).toBe(0.70);
  });

  it("skim pass gets 80% power and feed", () => {
    const skim = edmCuttingParamFlushEngine.calculateBreakRecovery(50, 2, "D2", 25);
    expect(skim.reduced_params.peak_current_factor).toBe(0.80);
    expect(skim.reduced_params.on_time_factor).toBe(0.80);
    expect(skim.reduced_params.feed_rate_factor).toBe(0.80);
  });

  // =========================================================================
  // Backup clamping
  // =========================================================================

  it("clamps backup to [1.5, 5.0] mm range", () => {
    // Very thin aluminum skim pass → base 1.5, no adj = 1.5 (at minimum)
    const thin = edmCuttingParamFlushEngine.calculateBreakRecovery(50, 2, "aluminum", 10);
    expect(thin.backup_mm).toBeGreaterThanOrEqual(1.5);

    // Thick titanium rough pass → base 3.0 + 2.0 (200mm) + 0.5 = 5.5 → clamped to 5.0
    const thick = edmCuttingParamFlushEngine.calculateBreakRecovery(50, 1, "titanium", 225);
    expect(thick.backup_mm).toBeLessThanOrEqual(5.0);
  });

  it("limits backup to break position distance", () => {
    // Break at 2mm into cut with D2 rough (base backup = 2.5mm)
    const result = edmCuttingParamFlushEngine.calculateBreakRecovery(2, 1, "D2", 25);
    // Should back up at most to 0.5mm from start, i.e., 2 - 0.5 = 1.5mm backup
    expect(result.backup_mm).toBeLessThanOrEqual(2.0);
    expect(result.backup_mm).toBeGreaterThanOrEqual(0.5);
  });

  // =========================================================================
  // Recovery confidence
  // =========================================================================

  it("has high confidence for standard conditions", () => {
    const result = edmCuttingParamFlushEngine.calculateBreakRecovery(50, 2, "D2", 25);
    expect(result.recovery_confidence).toBeGreaterThanOrEqual(0.80);
  });

  it("reduces confidence for very thick workpieces", () => {
    const thin = edmCuttingParamFlushEngine.calculateBreakRecovery(50, 2, "D2", 25);
    const thick = edmCuttingParamFlushEngine.calculateBreakRecovery(50, 2, "D2", 150);
    expect(thick.recovery_confidence).toBeLessThan(thin.recovery_confidence);
  });

  it("reduces confidence for difficult materials", () => {
    const steel = edmCuttingParamFlushEngine.calculateBreakRecovery(50, 2, "D2", 25);
    const titanium = edmCuttingParamFlushEngine.calculateBreakRecovery(50, 2, "titanium", 25);
    expect(titanium.recovery_confidence).toBeLessThan(steel.recovery_confidence);
  });

  it("reduces confidence when break is near start", () => {
    const near = edmCuttingParamFlushEngine.calculateBreakRecovery(1.5, 2, "D2", 25);
    const far = edmCuttingParamFlushEngine.calculateBreakRecovery(50, 2, "D2", 25);
    expect(near.recovery_confidence).toBeLessThan(far.recovery_confidence);
  });

  // =========================================================================
  // Strategy description and notes
  // =========================================================================

  it("includes strategy description", () => {
    const result = edmCuttingParamFlushEngine.calculateBreakRecovery(50, 1, "D2", 25);
    expect(result.strategy).toContain("Rough pass recovery");
    expect(result.strategy).toContain("auto-retry");
  });

  it("includes material-specific notes for carbide", () => {
    const result = edmCuttingParamFlushEngine.calculateBreakRecovery(50, 1, "carbide", 25);
    expect(result.notes.some(n => n.includes("coated wire"))).toBe(true);
  });

  it("includes material-specific notes for titanium", () => {
    const result = edmCuttingParamFlushEngine.calculateBreakRecovery(50, 1, "titanium", 25);
    expect(result.notes.some(n => n.includes("alpha-case"))).toBe(true);
  });

  it("includes thickness warning for thick workpieces", () => {
    const result = edmCuttingParamFlushEngine.calculateBreakRecovery(50, 1, "D2", 100);
    expect(result.notes.some(n => n.includes("submerged"))).toBe(true);
  });

  // =========================================================================
  // JM Die test cases (real shop materials)
  // =========================================================================

  it("handles M2 tool steel (JM Die primary material)", () => {
    const result = edmCuttingParamFlushEngine.calculateBreakRecovery(50, 1, "M2", 30);
    expect(result.backup_mm).toBeGreaterThanOrEqual(1.5);
    expect(result.backup_mm).toBeLessThanOrEqual(5.0);
    expect(result.max_retries).toBe(3);
    expect(result.recovery_confidence).toBeGreaterThanOrEqual(0.5);
  });

  it("handles S7 tool steel (JM Die shock steel)", () => {
    const result = edmCuttingParamFlushEngine.calculateBreakRecovery(50, 1, "S7", 25);
    expect(result.backup_mm).toBeCloseTo(2.5, 1); // Standard steel + rough adj
    expect(result.max_retries).toBe(3);
  });

  it("handles A2 tool steel (JM Die die steel)", () => {
    const result = edmCuttingParamFlushEngine.calculateBreakRecovery(50, 2, "A2", 40);
    // Base 2.0 + thickness adj (40-25)/50*0.5 = 0.15 + skim = 0
    expect(result.backup_mm).toBeGreaterThanOrEqual(2.0);
    expect(result.max_retries).toBe(3);
  });
});
