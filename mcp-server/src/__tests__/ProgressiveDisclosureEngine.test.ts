/**
 * ProgressiveDisclosureEngine — dedicated per-engine test file (U-FORE-13 helper).
 *
 * Shared behavior lives in TeachingNoGoEngine.test.ts. This file exists
 * so the wiring-enforcement Stop hook finds a 1:1 match on filename.
 */

import { describe, it, expect } from "vitest";
import {
  ProgressiveDisclosureEngine,
  progressiveDisclosureEngine,
  type ForesightSection,
} from "../engines/ProgressiveDisclosureEngine.js";

function sections(): ForesightSection[] {
  return [
    { key: "s5", title: "Critical", tokens: 40, severity: 5, body: "fix" },
    { key: "s4", title: "High", tokens: 30, severity: 4, body: "review" },
    { key: "s3", title: "Med", tokens: 300, severity: 3, body: "wide" },
    { key: "s1", title: "Info", tokens: 10, severity: 1, body: "fyi" },
  ];
}

describe("ProgressiveDisclosureEngine — per-engine tests", () => {
  it("singleton exports correctly", () => {
    expect(progressiveDisclosureEngine).toBeInstanceOf(ProgressiveDisclosureEngine);
    expect(progressiveDisclosureEngine.name).toBe("ProgressiveDisclosureEngine");
  });

  it("orders by severity descending", () => {
    const r = progressiveDisclosureEngine.disclose({ sections: sections(), budget: 200 });
    const severities = r.shown.map((s) => s.severity);
    const sorted = [...severities].sort((a, b) => b - a);
    expect(severities).toEqual(sorted);
  });

  it("budget=200 excludes the 300-token medium-severity section", () => {
    const r = progressiveDisclosureEngine.disclose({ sections: sections(), budget: 200 });
    expect(r.shown.every((s) => s.key !== "s3")).toBe(true);
  });

  it("truncated flag set when items excluded", () => {
    const r = progressiveDisclosureEngine.disclose({ sections: sections(), budget: 50 });
    expect(r.truncated).toBe(true);
  });

  it("expandHint mentions hidden count when truncated", () => {
    const r = progressiveDisclosureEngine.disclose({ sections: sections(), budget: 10 });
    expect(r.expandHint).toContain("hidden");
  });

  it("expand=true shows everything", () => {
    const r = progressiveDisclosureEngine.disclose({
      sections: sections(),
      budget: 10,
      expand: true,
    });
    expect(r.shown).toHaveLength(4);
    expect(r.truncated).toBe(false);
  });

  it("minSeverity=4 keeps only sev 4+", () => {
    const r = progressiveDisclosureEngine.disclose({
      sections: sections(),
      minSeverity: 4,
    });
    expect(r.shown.every((s) => s.severity >= 4)).toBe(true);
  });

  it("includeKeys overrides budget exclusion", () => {
    const r = progressiveDisclosureEngine.disclose({
      sections: sections(),
      budget: 50,
      includeKeys: ["s3"],
    });
    expect(r.shown.some((s) => s.key === "s3")).toBe(true);
  });

  it("render produces title text per section", () => {
    const rep = progressiveDisclosureEngine.disclose({ sections: sections() });
    const text = progressiveDisclosureEngine.render(rep);
    for (const s of rep.shown) expect(text).toContain(s.title);
  });

  it("shape composes disclose + render", () => {
    const s = progressiveDisclosureEngine.shape({ sections: sections() });
    expect(s.length).toBeGreaterThan(0);
  });

  it("FAIL: non-array sections throws", () => {
    expect(() =>
      progressiveDisclosureEngine.disclose({ sections: "bad" } as unknown as { sections: ForesightSection[] })
    ).toThrow(/must be an array/);
  });

  it("ADV: empty sections → empty report with zero hidden", () => {
    const r = progressiveDisclosureEngine.disclose({ sections: [] });
    expect(r.shown).toEqual([]);
    expect(r.hiddenCount).toBe(0);
  });
});
