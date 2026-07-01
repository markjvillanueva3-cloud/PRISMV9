/**
 * AIResourceLearningEngine.getCollegeCorpus + aiReasoning.ai_college_corpus_pointers
 * dispatcher round-trip.
 *
 * Wires the iter15..iter20 AUTOGEN-SPEC corpus (1401 college courses + 893
 * PDFs + 2541 bridge edges) into the PRISM AI training-data layer.
 *
 * Shipped 2026-05-24 (slot:india iter21 — synergize-to-PSN leg #11 closure).
 */

import { describe, it, expect } from "vitest";
import { aiResourceLearningEngine } from "../engines/AIResourceLearningEngine.js";

describe("AIResourceLearningEngine.getCollegeCorpus — happy path", () => {
  it("returns the canonical spec-dir paths", () => {
    const r = aiResourceLearningEngine.getCollegeCorpus();
    expect(r.collegeSpecsDir).toBe("state/shared/college-course-specs/");
    expect(r.resourcePdfSpecsDir).toBe("state/shared/resource-pdf-specs/");
    expect(r.collegeMasterIndex).toBe("state/shared/COLLEGE-COURSE-AUTOGEN-INDEX-2026-05-24.md");
    expect(r.resourcePdfMasterIndex).toBe("state/shared/RESOURCE-PDF-AUTOGEN-INDEX-2026-05-24.md");
  });

  it("returns the shipped corpus counts (1401 + 893 + 2541)", () => {
    const r = aiResourceLearningEngine.getCollegeCorpus();
    expect(r.collegeCount).toBe(1401);
    expect(r.pdfCount).toBe(893);
    expect(r.bridgeEdgeCount).toBe(2541);
  });

  it("returns the source commit shas (full traceability)", () => {
    const r = aiResourceLearningEngine.getCollegeCorpus();
    expect(r.sourceCommits.college).toBe("6422115748");
    expect(r.sourceCommits.widen).toBe("865fa9fccc");
    expect(r.sourceCommits.pdf).toBe("4d0158c78d");
    expect(r.sourceCommits.bridge).toBe("b382b4328c");
  });
});

describe("AIResourceLearningEngine.getCollegeCorpus — invariants", () => {
  it("is pure (same return on every call)", () => {
    const r1 = aiResourceLearningEngine.getCollegeCorpus();
    const r2 = aiResourceLearningEngine.getCollegeCorpus();
    expect(r2).toEqual(r1);
  });

  it("all counts are non-negative integers", () => {
    const r = aiResourceLearningEngine.getCollegeCorpus();
    for (const c of [r.collegeCount, r.pdfCount, r.bridgeEdgeCount]) {
      expect(Number.isInteger(c)).toBe(true);
      expect(c).toBeGreaterThanOrEqual(0);
    }
  });

  it("all paths are POSIX-style relative paths (no Windows backslash leakage)", () => {
    const r = aiResourceLearningEngine.getCollegeCorpus();
    for (const p of [r.collegeSpecsDir, r.collegeMasterIndex, r.resourcePdfSpecsDir, r.resourcePdfMasterIndex]) {
      expect(p).not.toMatch(/\\/);
      expect(p.startsWith("state/shared/")).toBe(true);
    }
  });

  it("spec-dir paths end with trailing slash, master-index paths end with .md", () => {
    const r = aiResourceLearningEngine.getCollegeCorpus();
    expect(r.collegeSpecsDir.endsWith("/")).toBe(true);
    expect(r.resourcePdfSpecsDir.endsWith("/")).toBe(true);
    expect(r.collegeMasterIndex.endsWith(".md")).toBe(true);
    expect(r.resourcePdfMasterIndex.endsWith(".md")).toBe(true);
  });
});

describe("AIResourceLearningEngine.getCollegeCorpus — schema contract", () => {
  it("returns exactly 8 top-level keys", () => {
    const r = aiResourceLearningEngine.getCollegeCorpus();
    expect(Object.keys(r).sort()).toEqual([
      "bridgeEdgeCount",
      "collegeCount",
      "collegeMasterIndex",
      "collegeSpecsDir",
      "pdfCount",
      "resourcePdfMasterIndex",
      "resourcePdfSpecsDir",
      "sourceCommits",
    ]);
  });

  it("sourceCommits has exactly 4 keys (college/widen/pdf/bridge)", () => {
    const r = aiResourceLearningEngine.getCollegeCorpus();
    expect(Object.keys(r.sourceCommits).sort()).toEqual(["bridge", "college", "pdf", "widen"]);
  });

  it("every commit sha is a 10-char hex string", () => {
    const r = aiResourceLearningEngine.getCollegeCorpus();
    for (const sha of Object.values(r.sourceCommits)) {
      expect(sha).toMatch(/^[0-9a-f]{10}$/);
    }
  });
});

describe("AIResourceLearningEngine.getCollegeCorpus — adversarial / spanning", () => {
  it("returns object (not array, not null) regardless of call context", () => {
    const r = aiResourceLearningEngine.getCollegeCorpus();
    expect(r).not.toBeNull();
    expect(Array.isArray(r)).toBe(false);
    expect(typeof r).toBe("object");
  });

  it("collegeCount is strictly greater than pdfCount (1401 > 893 — different corpora sizes)", () => {
    const r = aiResourceLearningEngine.getCollegeCorpus();
    expect(r.collegeCount).toBeGreaterThan(r.pdfCount);
  });

  it("bridgeEdgeCount is positive and exceeds either corpus alone (2541 > 1401)", () => {
    const r = aiResourceLearningEngine.getCollegeCorpus();
    expect(r.bridgeEdgeCount).toBeGreaterThan(r.collegeCount);
  });

  it("survives 100 rapid sequential calls (no internal mutation)", () => {
    const baseline = aiResourceLearningEngine.getCollegeCorpus();
    for (let i = 0; i < 100; i++) {
      const r = aiResourceLearningEngine.getCollegeCorpus();
      expect(r).toEqual(baseline);
    }
  });

  it("returned object can be safely JSON-round-tripped", () => {
    const r = aiResourceLearningEngine.getCollegeCorpus();
    const round = JSON.parse(JSON.stringify(r));
    expect(round).toEqual(r);
  });
});
