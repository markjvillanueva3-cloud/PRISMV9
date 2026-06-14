/** DoctrineDraftEngine tests — HZP08. */
import { describe, it, expect } from "vitest";
import {
  DoctrineDraftEngine,
  type DoctrineDraftRequest,
} from "../engines/DoctrineDraftEngine.js";

const req = (over: Partial<DoctrineDraftRequest> = {}): DoctrineDraftRequest => ({
  fleet_doctrine_candidates: [],
  role_divergences: [],
  date_iso: "2026-05-24",
  ...over,
});

describe("DoctrineDraftEngine.draft — inclusion threshold", () => {
  it("candidate at threshold included", () => {
    const r = DoctrineDraftEngine.draft(req({
      fleet_doctrine_candidates: [{ refusal: "x", slots: ["a", "b", "c"], coverage_pct: 75 }],
    }));
    expect(r.included_count).toBe(1);
    expect(r.markdown).toContain("`x`");
  });

  it("candidate below threshold excluded", () => {
    const r = DoctrineDraftEngine.draft(req({
      fleet_doctrine_candidates: [{ refusal: "weak", slots: ["a"], coverage_pct: 50 }],
      min_coverage_pct: 60,
    }));
    expect(r.included_count).toBe(0);
    expect(r.excluded_below_threshold).toBe(1);
  });

  it("custom min_coverage_pct honored", () => {
    const r = DoctrineDraftEngine.draft(req({
      fleet_doctrine_candidates: [{ refusal: "x", slots: ["a"], coverage_pct: 55 }],
      min_coverage_pct: 50,
    }));
    expect(r.included_count).toBe(1);
  });

  it("no candidates → empty-state message", () => {
    const r = DoctrineDraftEngine.draft(req());
    expect(r.included_count).toBe(0);
    expect(r.markdown).toContain("No refusal token reached");
  });

  it("multiple candidates rendered as table rows", () => {
    const r = DoctrineDraftEngine.draft(req({
      fleet_doctrine_candidates: [
        { refusal: "first", slots: ["a", "b"], coverage_pct: 80 },
        { refusal: "second", slots: ["c", "d"], coverage_pct: 70 },
      ],
    }));
    expect(r.markdown).toContain("`first`");
    expect(r.markdown).toContain("`second`");
  });
});

describe("DoctrineDraftEngine.draft — role divergences", () => {
  it("divergence rendered as bullet", () => {
    const r = DoctrineDraftEngine.draft(req({
      role_divergences: [{ role: "specialist-mill", refusal: "x", holders: ["a"], missing_from: ["b"] }],
    }));
    expect(r.markdown).toContain("specialist-mill");
    expect(r.markdown).toContain("`x`");
  });

  it("each divergence produces an action_item", () => {
    const r = DoctrineDraftEngine.draft(req({
      role_divergences: [
        { role: "a", refusal: "r1", holders: ["s1"], missing_from: ["s2"] },
        { role: "b", refusal: "r2", holders: ["s3"], missing_from: ["s4"] },
      ],
    }));
    expect(r.action_items.length).toBe(2);
  });

  it("> 20 divergences → truncated with note", () => {
    const divs = Array.from({ length: 25 }, (_, i) => ({
      role: `r${i}`, refusal: `x${i}`, holders: ["a"], missing_from: ["b"],
    }));
    const r = DoctrineDraftEngine.draft(req({ role_divergences: divs }));
    expect(r.markdown).toContain("more divergences truncated");
  });

  it("no divergences → no role-divergence section", () => {
    const r = DoctrineDraftEngine.draft(req());
    expect(r.markdown.includes("Role divergences")).toBe(false);
  });
});

describe("DoctrineDraftEngine — validation + render", () => {
  it("date_iso required", () => {
    expect(() => DoctrineDraftEngine.draft(req({ date_iso: "" }))).toThrow();
  });

  it("min_coverage_pct < 50 → zod throws", () => {
    expect(() => DoctrineDraftEngine.draft(req({ min_coverage_pct: 30 }))).toThrow();
  });

  it("min_coverage_pct > 100 → zod throws", () => {
    expect(() => DoctrineDraftEngine.draft(req({ min_coverage_pct: 150 }))).toThrow();
  });

  it("renderSummary shows tag + counts", () => {
    const md = DoctrineDraftEngine.renderSummary(DoctrineDraftEngine.draft(req()));
    expect(md.includes("[DOCTRINE-DRAFT 2026-05-24]")).toBe(true);
    expect(md.includes("included=0")).toBe(true);
  });
});
