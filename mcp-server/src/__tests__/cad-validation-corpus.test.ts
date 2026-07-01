/**
 * cad-validation-corpus.test.ts — CAD-DRAW-MAX-MS1/U-VALIDATION-50-CORPUS
 *
 * Tests for the curated JM Die starter corpus.
 */

import { describe, it, expect } from "vitest";
import {
  JM_DIE_VALIDATION_CORPUS,
  JM_DIE_CORPUS_VERSION,
  JM_DIE_CORPUS_SCHEMA_VERSION,
  summarizeCorpus,
  corpusByDomain,
} from "../data/cad-validation-corpus.js";

describe("JM_DIE_VALIDATION_CORPUS shape invariants", () => {
  it("has 12 starter cases (4 mill + 4 lathe + 4 wedm)", () => {
    expect(JM_DIE_VALIDATION_CORPUS).toHaveLength(12);
  });

  it("every case has unique id", () => {
    const ids = JM_DIE_VALIDATION_CORPUS.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every case has non-empty id + description + intent", () => {
    for (const c of JM_DIE_VALIDATION_CORPUS) {
      expect(c.id.length).toBeGreaterThan(0);
      expect(c.description.length).toBeGreaterThan(0);
      expect(c.input.intent.length).toBeGreaterThan(0);
    }
  });

  it("ids follow DOMAIN-NNN convention", () => {
    for (const c of JM_DIE_VALIDATION_CORPUS) {
      expect(c.id).toMatch(/^(MILL|LATHE|WEDM)-\d{3}$/);
    }
  });

  it("corpus is frozen (immutable at module load)", () => {
    expect(Object.isFrozen(JM_DIE_VALIDATION_CORPUS)).toBe(true);
  });

  it("version is semver string", () => {
    expect(JM_DIE_CORPUS_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("schemaVersion is positive integer", () => {
    expect(JM_DIE_CORPUS_SCHEMA_VERSION).toBeGreaterThan(0);
    expect(Number.isInteger(JM_DIE_CORPUS_SCHEMA_VERSION)).toBe(true);
  });
});

describe("summarizeCorpus", () => {
  it("reports totalCount 12", () => {
    const s = summarizeCorpus();
    expect(s.totalCount).toBe(12);
  });

  it("reports balanced 4/4/4 domain split", () => {
    const s = summarizeCorpus();
    expect(s.byDomain.mill).toBe(4);
    expect(s.byDomain.lathe).toBe(4);
    expect(s.byDomain.wedm).toBe(4);
  });

  it("reports all 12 case ids in byCaseId", () => {
    const s = summarizeCorpus();
    expect(s.byCaseId).toHaveLength(12);
    expect(s.byCaseId).toEqual(JM_DIE_VALIDATION_CORPUS.map(c => c.id));
  });

  it("propagates version + schemaVersion", () => {
    const s = summarizeCorpus();
    expect(s.version).toBe(JM_DIE_CORPUS_VERSION);
    expect(s.schemaVersion).toBe(JM_DIE_CORPUS_SCHEMA_VERSION);
  });
});

describe("corpusByDomain", () => {
  it("'mill' returns only MILL-prefixed cases (4)", () => {
    const m = corpusByDomain("mill");
    expect(m).toHaveLength(4);
    for (const c of m) expect(c.id).toMatch(/^MILL-/);
  });

  it("'lathe' returns only LATHE-prefixed cases (4)", () => {
    const l = corpusByDomain("lathe");
    expect(l).toHaveLength(4);
    for (const c of l) expect(c.id).toMatch(/^LATHE-/);
  });

  it("'wedm' returns only WEDM-prefixed cases (4)", () => {
    const w = corpusByDomain("wedm");
    expect(w).toHaveLength(4);
    for (const c of w) expect(c.id).toMatch(/^WEDM-/);
  });

  it("'all' returns the full 12-case corpus", () => {
    expect(corpusByDomain("all")).toEqual(JM_DIE_VALIDATION_CORPUS);
  });

  it("unknown domain returns empty array (not throw)", () => {
    // @ts-expect-error — testing defensive behavior
    expect(corpusByDomain("welder")).toEqual([]);
  });
});

describe("realistic JM Die patterns", () => {
  it("mill cases reference real JM Die customers (ITW/Alcoa/Optimas/Holo-Krome)", () => {
    const mill = corpusByDomain("mill");
    const descs = mill.map(c => c.description).join(" ");
    expect(descs).toMatch(/ITW|Alcoa|Optimas|Holo-Krome/);
  });

  it("lathe cases reference real JM Die customers (SFS/Fastenal)", () => {
    const lathe = corpusByDomain("lathe");
    const descs = lathe.map(c => c.description).join(" ");
    expect(descs).toMatch(/SFS|Fastenal/);
  });

  it("wedm cases include progressive die / precision punch patterns", () => {
    const wedm = corpusByDomain("wedm");
    const descs = wedm.map(c => c.description).join(" ");
    expect(descs).toMatch(/progressive die|precision punch/);
  });

  it("structured tolerance callouts conform to ToleranceCallout (tolerance_mm), on the cases that carry a tolerance", () => {
    // ToleranceCallout models TOLERANCES only ({tolerance_mm, gdt_symbol, feature}); surface/material
    // annotations live in intent/description. 7 of 12 cases carry a measured tolerance band
    // (MILL-003 is the slot whose only annotation was a surface finish -> folded into intent).
    const withCallouts = JM_DIE_VALIDATION_CORPUS.filter(
      c => Array.isArray(c.input.callouts) && c.input.callouts!.length > 0,
    );
    expect(withCallouts.length).toBeGreaterThanOrEqual(7);
    // every structured callout is a real ToleranceCallout — regression-lock against the prior
    // {kind, value:string} shape that did NOT type-check and encoded to an empty (useless) signal.
    for (const c of withCallouts) {
      for (const co of c.input.callouts!) {
        expect(typeof co.tolerance_mm).toBe("number");
        expect(Number.isFinite(co.tolerance_mm as number)).toBe(true);
        expect(co.tolerance_mm as number).toBeGreaterThan(0);
      }
    }
  });

  it("surface / material / GD&T detail is preserved in intent or description text (not lost when callouts model tolerances only)", () => {
    const allText = JM_DIE_VALIDATION_CORPUS.map(c => `${c.input.intent} ${c.description}`).join(" ");
    expect(allText).toMatch(/Ra\b/);                 // surface finishes (e.g. "32 Ra", "63 Ra interior", "8 Ra")
    expect(allText).toMatch(/tool steel|HRC|\bA2\b|\bD2\b/); // material callouts folded into text
  });

  it("at least 10 of 12 cases include an expectedOpLogMin (assertable rubric)", () => {
    const withExpected = JM_DIE_VALIDATION_CORPUS.filter(
      c => typeof c.expectedOpLogMin === "number",
    );
    expect(withExpected.length).toBeGreaterThanOrEqual(10);
  });
});
