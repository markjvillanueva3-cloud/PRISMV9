/**
 * Tests for resource-integrity hook
 * RES-MS0 U-RES04: Validates harvest completeness
 */
import { describe, it, expect } from "vitest";
import { resourceIntegrityHook, RESOURCE_INTEGRITY_HOOKS } from "../hooks/resourceIntegrityHook.js";

describe("resourceIntegrityHook", () => {
  it("has correct id and mode", () => {
    expect(resourceIntegrityHook.id).toBe("resource-integrity");
    expect(resourceIntegrityHook.mode).toBe("warning");
    expect(resourceIntegrityHook.category).toBe("data-quality");
    expect(resourceIntegrityHook.enabled).toBe(true);
  });

  it("exports in RESOURCE_INTEGRITY_HOOKS array", () => {
    expect(RESOURCE_INTEGRITY_HOOKS).toHaveLength(1);
    expect(RESOURCE_INTEGRITY_HOOKS[0].id).toBe("resource-integrity");
  });

  it("succeeds when no harvest result in context", async () => {
    const result = await resourceIntegrityHook.handler({ params: {} } as any);
    expect(result.success).toBe(true);
    expect(result.blocked).toBe(false);
  });

  it("succeeds when all counts match", async () => {
    const result = await resourceIntegrityHook.handler({
      params: {
        scanIndex: { totalFiles: 1000 },
        harvestResult: {
          processedFiles: 950,
          skippedFiles: 50,
          classificationStats: { classified: 950, attempted: 1000 },
          typeBreakdown: { pdf: 100, cps: 50, step: 30, cyc: 200, min: 300, mcx: 100, hmc: 50, db: 20, csv: 10, py: 90 },
          errors: [],
        },
      },
    } as any);
    expect(result.success).toBe(true);
    expect(result.blocked).toBe(false);
    expect(result.message).toContain("passed");
  });

  it("warns when file count mismatch exceeds 5%", async () => {
    const result = await resourceIntegrityHook.handler({
      params: {
        scanIndex: { totalFiles: 1000 },
        harvestResult: {
          processedFiles: 800,
          skippedFiles: 50,
          classificationStats: { classified: 800, attempted: 850 },
          typeBreakdown: { pdf: 100, cps: 50, step: 30, cyc: 200, min: 300, mcx: 100, hmc: 50, db: 20, csv: 10, py: 90 },
          errors: [],
        },
      },
    } as any);
    expect(result.success).toBe(true); // warning mode never blocks
    expect(result.blocked).toBe(false);
    expect(result.warnings).toBeDefined();
    expect(result.message).toContain("File count mismatch");
  });

  it("warns when classification below 90%", async () => {
    const result = await resourceIntegrityHook.handler({
      params: {
        harvestResult: {
          processedFiles: 1000,
          skippedFiles: 0,
          classificationStats: { classified: 800, attempted: 1000 },
          typeBreakdown: { pdf: 100, cps: 50, step: 30, cyc: 200, min: 300, mcx: 100, hmc: 50, db: 20, csv: 10, py: 40 },
          errors: [],
        },
      },
    } as any);
    expect(result.success).toBe(true);
    expect(result.warnings).toBeDefined();
    expect(result.message).toContain("Classification coverage");
    expect(result.message).toContain("80.0%");
  });

  it("warns when expected file types are missing", async () => {
    const result = await resourceIntegrityHook.handler({
      params: {
        harvestResult: {
          processedFiles: 500,
          skippedFiles: 0,
          classificationStats: { classified: 480, attempted: 500 },
          typeBreakdown: { pdf: 100, cps: 50 },
          errors: [],
        },
      },
    } as any);
    expect(result.warnings).toBeDefined();
    expect(result.message).toContain("Missing expected file types");
    expect(result.message).toContain("step");
  });

  it("warns when error rate exceeds 5%", async () => {
    const result = await resourceIntegrityHook.handler({
      params: {
        harvestResult: {
          processedFiles: 100,
          skippedFiles: 0,
          classificationStats: { classified: 95, attempted: 100 },
          typeBreakdown: { pdf: 100, cps: 50, step: 30, cyc: 200, min: 300, mcx: 100, hmc: 50, db: 20, csv: 10, py: 40 },
          error_count: 10,
        },
      },
    } as any);
    expect(result.warnings).toBeDefined();
    expect(result.message).toContain("error rate");
  });

  it("accumulates multiple warnings in a single result", async () => {
    const result = await resourceIntegrityHook.handler({
      params: {
        scanIndex: { totalFiles: 1000 },
        harvestResult: {
          processedFiles: 500,
          skippedFiles: 50,
          classificationStats: { classified: 400, attempted: 550 },
          typeBreakdown: { pdf: 100 },
          error_count: 50,
        },
      },
    } as any);
    expect(result.warnings).toBeDefined();
    expect(result.warnings!.length).toBeGreaterThanOrEqual(3);
  });
});
