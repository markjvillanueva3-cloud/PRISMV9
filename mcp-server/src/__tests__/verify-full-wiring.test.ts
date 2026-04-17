/**
 * Tests for verify-full-wiring script (Universal Phase 0.6)
 *
 * Invokes the exported verifyFullWiring() across the live dispatcher set.
 * We don't assert zero issues (the repo has known wiring debt); we assert
 * the scanner itself works and surfaces a structurally valid report.
 */

import { describe, it, expect } from "vitest";
import { verifyFullWiring } from "../../scripts/verify-full-wiring.js";

describe("verify-full-wiring (Phase 0.6)", () => {
  it("scans all dispatchers and returns a structured report", async () => {
    const report = await verifyFullWiring();
    expect(report).toBeDefined();
    expect(report.scanned).toBeGreaterThan(0);
    expect(Array.isArray(report.dispatchers)).toBe(true);
  });

  it("summary.totalActions is ≥ number of scanned dispatchers (at least 1 action each)", async () => {
    const report = await verifyFullWiring();
    expect(report.summary.totalActions).toBeGreaterThanOrEqual(report.summary.totalDispatchers);
  });

  it("every dispatcher report has required fields", async () => {
    const report = await verifyFullWiring();
    for (const d of report.dispatchers) {
      expect(typeof d.file).toBe("string");
      expect(typeof d.totalEnumActions).toBe("number");
      expect(typeof d.uniqueEnumActions).toBe("number");
      expect(Array.isArray(d.duplicateEnumActions)).toBe(true);
      expect(typeof d.switchCaseCount).toBe("number");
      expect(Array.isArray(d.actionsWithoutCase)).toBe(true);
      expect(Array.isArray(d.casesWithoutAction)).toBe(true);
    }
  });

  it("R4-FIX-3 landed: ppDispatcher has no duplicate enum entries", async () => {
    const report = await verifyFullWiring({ file: "ppDispatcher.ts" });
    const pp = report.dispatchers.find((d) => d.file === "ppDispatcher.ts");
    expect(pp).toBeDefined();
    // After R4 Fix #3 commit 9e4913ae, the pp_ss_*/pp_tc_* duplicates were resolved.
    expect(pp!.duplicateEnumActions).toEqual([]);
  });

  it("issuesByKind counts are all non-negative integers", async () => {
    const report = await verifyFullWiring();
    const kinds = report.summary.issuesByKind;
    expect(kinds.duplicateEnumActions).toBeGreaterThanOrEqual(0);
    expect(kinds.actionsWithoutCase).toBeGreaterThanOrEqual(0);
    expect(kinds.casesWithoutAction).toBeGreaterThanOrEqual(0);
  });

  it("totalIssues equals sum of issuesByKind", async () => {
    const report = await verifyFullWiring();
    const s = report.summary.issuesByKind;
    const sum = s.duplicateEnumActions + s.actionsWithoutCase + s.casesWithoutAction;
    expect(report.summary.totalIssues).toBe(sum);
  });

  it("uniqueEnumActions ≤ totalEnumActions for every dispatcher", async () => {
    const report = await verifyFullWiring();
    for (const d of report.dispatchers) {
      expect(d.uniqueEnumActions).toBeLessThanOrEqual(d.totalEnumActions);
    }
  });

  it("single-file scan limits scope correctly", async () => {
    const r = await verifyFullWiring({ file: "ppDispatcher.ts" });
    expect(r.dispatchers).toHaveLength(1);
    expect(r.dispatchers[0].file).toBe("ppDispatcher.ts");
  });
});
