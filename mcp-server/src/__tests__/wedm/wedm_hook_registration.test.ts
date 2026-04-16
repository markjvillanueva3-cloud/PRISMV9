/**
 * WEDM Hook Registration Test - Phase 0.3 / 0.10 Integration
 * Verifies WEDM hooks are wired into allHooks registration array
 */

import { describe, it, expect } from "vitest";
import { allHooks, hookCounts } from "../../hooks/index.js";

describe("WEDM Hook Registration", () => {
  it("allHooks array exists and is non-empty", () => {
    expect(Array.isArray(allHooks)).toBe(true);
    expect(allHooks.length).toBeGreaterThan(0);
  });

  it("includes 16 WEDM safety hooks", () => {
    const wedmSafety = allHooks.filter((h) => h.tags?.includes("wedm") && !h.id.includes("svi"));
    expect(wedmSafety.length).toBeGreaterThanOrEqual(16);
  });

  it("includes 2 WEDM SVI hooks", () => {
    const wedmSvi = allHooks.filter((h) => h.id.startsWith("wedm-svi-"));
    expect(wedmSvi.length).toBe(2);
  });

  it("hookCounts tracks wedmSafety category", () => {
    expect((hookCounts as any).wedmSafety).toBeDefined();
    expect((hookCounts as any).wedmSafety).toBe(16);
  });

  it("hookCounts tracks wedmSVI category", () => {
    expect((hookCounts as any).wedmSVI).toBeDefined();
    expect((hookCounts as any).wedmSVI).toBe(2);
  });

  it("specific WEDM hooks are in allHooks", () => {
    const ids = new Set(allHooks.map((h) => h.id));
    expect(ids.has("wedm-calibration-validate")).toBe(true);
    expect(ids.has("wedm-neural-sanity")).toBe(true);
    expect(ids.has("wedm-sx-safety")).toBe(true);
    expect(ids.has("wedm-svi-inject")).toBe(true);
    expect(ids.has("wedm-svi-milestone-gate")).toBe(true);
  });

  it("no duplicate WEDM hook IDs", () => {
    const wedmHooks = allHooks.filter((h) => h.id.startsWith("wedm-"));
    const uniqueIds = new Set(wedmHooks.map((h) => h.id));
    expect(uniqueIds.size).toBe(wedmHooks.length);
  });
});
