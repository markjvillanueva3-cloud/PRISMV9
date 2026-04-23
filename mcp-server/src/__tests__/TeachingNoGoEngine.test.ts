/**
 * U-FORE-13 tests — TeachingNoGoEngine + ProgressiveDisclosureEngine +
 *                    AnchoredConfidenceEngine
 *
 * Real assertions throughout. Coverage per engine: happy + 3 failure
 * modes + 2 adversarial. Variability across verdict types, disclosure
 * budgets, and anchored-claim confidence ranges. Dispatcher round-trip.
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  TeachingNoGoEngine,
  teachingNoGoEngine,
} from "../engines/TeachingNoGoEngine.js";
import {
  ProgressiveDisclosureEngine,
  progressiveDisclosureEngine,
  type ForesightSection,
} from "../engines/ProgressiveDisclosureEngine.js";
import {
  AnchoredConfidenceEngine,
  anchoredConfidenceEngine,
} from "../engines/AnchoredConfidenceEngine.js";

// ─── TeachingNoGoEngine ─────────────────────────────────────────────

describe("TeachingNoGoEngine — respond", () => {
  it("exports singleton with correct name", () => {
    expect(teachingNoGoEngine).toBeInstanceOf(TeachingNoGoEngine);
    expect(teachingNoGoEngine.name).toBe("TeachingNoGoEngine");
  });

  it("VARIABILITY: no_go with missing_rollback maps to rollback fix text", () => {
    const r = teachingNoGoEngine.respond({
      verdict: "no_go",
      rootCause: "No rollback plan",
      failingCheck: "missing_rollback",
    });
    expect(r.verdict).toBe("no_go");
    expect(r.minimalFix).toContain("rollback");
    expect(r.unblockCommand).toContain("rollback_plan");
  });

  it("VARIABILITY: no_go with inline_physics_constant surfaces constants.ts", () => {
    const r = teachingNoGoEngine.respond({
      verdict: "no_go",
      failingCheck: "inline_physics_constant",
    });
    expect(r.minimalFix).toContain("constants.ts");
  });

  it("VARIABILITY: no_go with sx_gate_violation surfaces S(x) guidance", () => {
    const r = teachingNoGoEngine.respond({
      verdict: "no_go",
      failingCheck: "sx_gate_violation",
    });
    expect(r.minimalFix).toContain("0.70");
    expect(r.unblockCommand).toContain("prism_omega");
  });

  it("VARIABILITY: context_overflow suggests /compact or /handoff", () => {
    const r = teachingNoGoEngine.respond({
      verdict: "no_go",
      failingCheck: "context_overflow",
    });
    expect(r.minimalFix).toMatch(/compact|handoff/i);
  });

  it("unknown failing check falls back to default fix", () => {
    const r = teachingNoGoEngine.respond({
      verdict: "no_go",
      failingCheck: "unknown_gate_xyz",
    });
    expect(r.minimalFix).toContain("Review the root cause");
  });

  it("proceed_with_warning verdict preserved in response", () => {
    const r = teachingNoGoEngine.respond({
      verdict: "proceed_with_warning",
      failingCheck: "missing_tests",
    });
    expect(r.verdict).toBe("proceed_with_warning");
  });

  it("detailed=true adds expanded details", () => {
    const r = teachingNoGoEngine.respond({
      verdict: "no_go",
      failingCheck: "missing_tests",
      rootCause: "No test file",
      detailed: true,
    });
    expect(r.details).toContain("Root cause");
    expect(r.details).toContain("Minimal fix");
  });

  it("renderCompact produces a single-line verdict", () => {
    const r = teachingNoGoEngine.respond({
      verdict: "no_go",
      failingCheck: "missing_rollback",
      rootCause: "rollback absent",
    });
    const s = teachingNoGoEngine.renderCompact(r);
    expect(s).toContain("NO_GO");
    expect(s).toContain("🔴");
  });

  it("supportedChecks lists every known failing check", () => {
    const supported = teachingNoGoEngine.supportedChecks();
    expect(supported).toContain("missing_rollback");
    expect(supported).toContain("sx_gate_violation");
    expect(supported.length).toBeGreaterThan(5);
  });

  it("FAIL: null input throws", () => {
    expect(() =>
      teachingNoGoEngine.respond(null as unknown as { verdict: "no_go" })
    ).toThrow(/must be an object/);
  });

  it("FAIL: invalid verdict throws", () => {
    expect(() =>
      teachingNoGoEngine.respond({ verdict: "maybe" } as unknown as { verdict: "no_go" })
    ).toThrow(/verdict must be/);
  });

  it("FAIL: missing verdict throws", () => {
    expect(() =>
      teachingNoGoEngine.respond({} as unknown as { verdict: "no_go" })
    ).toThrow(/verdict must be/);
  });

  it("ADV: missing rootCause defaults to 'Not specified' placeholder", () => {
    const r = teachingNoGoEngine.respond({
      verdict: "no_go",
      failingCheck: "missing_tests",
    });
    expect(r.rootCause).toBe("Not specified by caller");
  });

  it("ADV: context object truncated to 200 chars in details", () => {
    const big = { long: "x".repeat(500) };
    const r = teachingNoGoEngine.respond({
      verdict: "no_go",
      failingCheck: "missing_tests",
      context: big,
      detailed: true,
    });
    // The Context: line in details should end by ~200 chars after "Context: "
    const ctxLine = r.details!.split("\n").find((l) => l.startsWith("Context: "))!;
    expect(ctxLine.length).toBeLessThan(250);
  });
});

// ─── ProgressiveDisclosureEngine ────────────────────────────────────

function sections(): ForesightSection[] {
  return [
    { key: "sev5-bad", title: "Critical safety fail", tokens: 80, severity: 5, body: "Fix immediately." },
    { key: "sev4-gap", title: "Missing coverage", tokens: 60, severity: 4, body: "Add tests." },
    { key: "sev3-hint", title: "Naming nit", tokens: 40, severity: 3, body: "Rename x → deltaX." },
    { key: "sev2-style", title: "Style note", tokens: 30, severity: 2, body: "Consider extracting constant." },
    { key: "sev1-info", title: "FYI", tokens: 500, severity: 1, body: "A huge low-severity payload." },
  ];
}

describe("ProgressiveDisclosureEngine — disclose", () => {
  it("exports singleton with correct name", () => {
    expect(progressiveDisclosureEngine).toBeInstanceOf(ProgressiveDisclosureEngine);
    expect(progressiveDisclosureEngine.name).toBe("ProgressiveDisclosureEngine");
  });

  it("default budget keeps highest-severity sections first", () => {
    const r = progressiveDisclosureEngine.disclose({ sections: sections() });
    expect(r.shown[0].key).toBe("sev5-bad");
    expect(r.totalTokens).toBeLessThanOrEqual(r.budget);
  });

  it("budget=200 drops the 500-token low-severity section", () => {
    const r = progressiveDisclosureEngine.disclose({ sections: sections(), budget: 200 });
    const keys = r.shown.map((s) => s.key);
    expect(keys).not.toContain("sev1-info");
    expect(r.truncated).toBe(true);
    expect(r.expandHint).toMatch(/hidden/);
  });

  it("expand=true returns everything regardless of budget", () => {
    const r = progressiveDisclosureEngine.disclose({
      sections: sections(),
      budget: 50,
      expand: true,
    });
    expect(r.shown).toHaveLength(5);
    expect(r.truncated).toBe(false);
  });

  it("includeKeys forces a section past the budget cutoff", () => {
    const r = progressiveDisclosureEngine.disclose({
      sections: sections(),
      budget: 80,
      includeKeys: ["sev1-info"],
    });
    expect(r.shown.some((s) => s.key === "sev1-info")).toBe(true);
  });

  it("minSeverity filters out low-severity sections", () => {
    const r = progressiveDisclosureEngine.disclose({
      sections: sections(),
      minSeverity: 4,
    });
    for (const s of r.shown) expect(s.severity).toBeGreaterThanOrEqual(4);
  });

  it("render emits one entry per shown section", () => {
    const rep = progressiveDisclosureEngine.disclose({ sections: sections() });
    const s = progressiveDisclosureEngine.render(rep);
    for (const item of rep.shown) expect(s).toContain(item.title);
  });

  it("shape composes disclose + render", () => {
    const s = progressiveDisclosureEngine.shape({ sections: sections() });
    expect(s).toContain("Critical safety fail");
  });

  it("empty sections returns empty report", () => {
    const r = progressiveDisclosureEngine.disclose({ sections: [] });
    expect(r.shown).toEqual([]);
    expect(r.hiddenCount).toBe(0);
  });

  it("FAIL: null input throws", () => {
    expect(() =>
      progressiveDisclosureEngine.disclose(null as unknown as { sections: ForesightSection[] })
    ).toThrow(/must be an object/);
  });

  it("FAIL: non-array sections throws", () => {
    expect(() =>
      progressiveDisclosureEngine.disclose(
        { sections: "nope" } as unknown as { sections: ForesightSection[] }
      )
    ).toThrow(/must be an array/);
  });

  it("ADV: negative token counts treated as 0", () => {
    const r = progressiveDisclosureEngine.disclose({
      sections: [
        { key: "a", title: "neg", tokens: -10, severity: 3, body: "x" },
      ],
    });
    expect(r.totalTokens).toBe(0);
  });

  it("ADV: 100+ sections still respects budget", () => {
    const many: ForesightSection[] = [];
    for (let i = 0; i < 100; i++) {
      many.push({ key: `s${i}`, title: `t${i}`, tokens: 10, severity: 3, body: "b" });
    }
    const r = progressiveDisclosureEngine.disclose({ sections: many, budget: 50 });
    expect(r.totalTokens).toBeLessThanOrEqual(50);
  });
});

// ─── AnchoredConfidenceEngine ──────────────────────────────────────

describe("AnchoredConfidenceEngine — anchor + render", () => {
  it("exports singleton with correct name", () => {
    expect(anchoredConfidenceEngine).toBeInstanceOf(AnchoredConfidenceEngine);
    expect(anchoredConfidenceEngine.name).toBe("AnchoredConfidenceEngine");
  });

  it("anchor attaches engine + confidence + citation", () => {
    const e = new AnchoredConfidenceEngine();
    const c = e.anchor("Fc = 1234 N", {
      engine: "KienzleForceEngine",
      confidence: 0.85,
      sourceCitation: "Sandvik Coromant Technical Guide p.48",
    });
    expect(c.anchor.engine).toBe("KienzleForceEngine");
    expect(c.anchor.confidence).toBeCloseTo(0.85, 2);
  });

  it("clamps confidence to [0, 1]", () => {
    const e = new AnchoredConfidenceEngine();
    const high = e.anchor("x", { engine: "E", confidence: 5, sourceCitation: "s" });
    const low = e.anchor("x", { engine: "E", confidence: -2, sourceCitation: "s" });
    expect(high.anchor.confidence).toBe(1);
    expect(low.anchor.confidence).toBe(0);
  });

  it("render includes engine + confidence % + source", () => {
    const e = new AnchoredConfidenceEngine();
    const c = e.anchor("Vc=250 m/min", {
      engine: "TaylorToolLifeEngine",
      confidence: 0.72,
      sourceCitation: "Machinery's Handbook 31e",
    });
    const s = e.render(c);
    expect(s).toContain("TaylorToolLifeEngine");
    expect(s).toContain("72%");
    expect(s).toContain("Machinery's Handbook");
  });

  it("showDisagreement renders the counter-view line", () => {
    const e = new AnchoredConfidenceEngine();
    const c = e.anchor("kc1.1 = 1800", {
      engine: "KienzleForceEngine",
      confidence: 0.9,
      sourceCitation: "ISO 3685",
      disagreement: "Sandvik says 1950 for P-group",
    });
    const s = e.render(c, { showDisagreement: true });
    expect(s).toContain("Counter-view");
    expect(s).toContain("Sandvik");
    expect(s).toContain("You decide");
  });

  it("renderMany returns one line per claim", () => {
    const e = new AnchoredConfidenceEngine();
    const claims = [
      e.anchor("a", { engine: "E1", confidence: 0.5, sourceCitation: "s1" }),
      e.anchor("b", { engine: "E2", confidence: 0.8, sourceCitation: "s2" }),
    ];
    const lines = e.renderMany(claims);
    expect(lines).toHaveLength(2);
  });

  it("recentStats returns correct count + average confidence", () => {
    const e = new AnchoredConfidenceEngine();
    e.anchor("a", { engine: "E", confidence: 0.4, sourceCitation: "s" });
    e.anchor("b", { engine: "E", confidence: 0.8, sourceCitation: "s" });
    const stats = e.recentStats();
    expect(stats.count).toBe(2);
    expect(stats.avgConfidence).toBeCloseTo(0.6, 2);
    expect(stats.lowestConfidence).toBeCloseTo(0.4, 2);
  });

  it("reset clears recent history", () => {
    const e = new AnchoredConfidenceEngine();
    e.anchor("a", { engine: "E", confidence: 0.5, sourceCitation: "s" });
    e.reset();
    expect(e.recentStats().count).toBe(0);
  });

  it("FAIL: missing engine throws", () => {
    const e = new AnchoredConfidenceEngine();
    expect(() =>
      e.anchor("x", { confidence: 0.5, sourceCitation: "s" } as any)
    ).toThrow(/engine required/);
  });

  it("FAIL: non-number confidence throws", () => {
    const e = new AnchoredConfidenceEngine();
    expect(() =>
      e.anchor("x", { engine: "E", confidence: "high" as unknown as number, sourceCitation: "s" })
    ).toThrow(/confidence must be/);
  });

  it("FAIL: empty sourceCitation throws", () => {
    const e = new AnchoredConfidenceEngine();
    expect(() =>
      e.anchor("x", { engine: "E", confidence: 0.5, sourceCitation: "" })
    ).toThrow(/sourceCitation required/);
  });

  it("ADV: 1000 anchors capped at MAX_RECENT=500", () => {
    const e = new AnchoredConfidenceEngine();
    for (let i = 0; i < 1000; i++) {
      e.anchor(`claim-${i}`, {
        engine: "E",
        confidence: 0.5,
        sourceCitation: "s",
      });
    }
    expect(e.recentStats().count).toBe(500);
  });

  it("ADV: NaN confidence rejected", () => {
    const e = new AnchoredConfidenceEngine();
    expect(() =>
      e.anchor("x", { engine: "E", confidence: NaN, sourceCitation: "s" })
    ).toThrow(/confidence must be/);
  });
});

// ─── Dispatcher round-trip ──────────────────────────────────────────

describe("U-FORE-13 — dispatcher round-trip", () => {
  it("devDispatcher exposes no_go_respond + disclose + anchor actions", () => {
    const disp = fs.readFileSync(
      path.join(process.cwd(), "src/tools/dispatchers/devDispatcher.ts"),
      "utf-8"
    );
    expect(disp).toContain('"no_go_respond"');
    expect(disp).toContain('"disclose_shape"');
    expect(disp).toContain('"anchor_claim"');
    expect(disp).toContain("TeachingNoGoEngine.js");
    expect(disp).toContain("ProgressiveDisclosureEngine.js");
    expect(disp).toContain("AnchoredConfidenceEngine.js");
  });
});
