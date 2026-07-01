/**
 * Tests for extract-jm-proven-speedfeed pure helpers (U-SFC-PROVEN-PIPELINE-ACTIVATE).
 * Real reference-value + algebraic-invariant asserts on the resume/enumerate/persist logic
 * (no I/O -- readdir is injected). Run: npx tsx scripts/extract-jm-proven-speedfeed.test.mjs
 */
import { describe, it, expect } from "vitest";
import {
  enumerateMinFiles,
  parseCursorDoneSet,
  partitionByResumeCursor,
  filterCommittedRows,
  buildProvenStore,
  STORE_SCHEMA_VERSION,
} from "./extract-jm-proven-speedfeed.mjs";

// fake fs tree: root has 2 .MIN + subdir ACME (1 .MIN) + a non-.MIN; nested depth honored.
const TREE = {
  "root": [
    { name: "a.MIN", isDirectory: false },
    { name: "b.min", isDirectory: false }, // case-insensitive match
    { name: "notes.txt", isDirectory: false }, // excluded
    { name: "ACME", isDirectory: true },
  ],
  "root/ACME": [
    { name: "c.MIN", isDirectory: false },
    { name: "d.MIN", isDirectory: false },
  ],
};
const fakeReaddir = (dir) => {
  const key = dir.replace(/\\/g, "/");
  if (TREE[key]) return TREE[key];
  throw new Error("ENOENT " + key);
};

describe("enumerateMinFiles", () => {
  it("recurses subdirs and matches .MIN case-insensitively, excludes non-.MIN", () => {
    const files = enumerateMinFiles("root", Infinity, fakeReaddir).map((f) => f.replace(/\\/g, "/"));
    expect(files.sort()).toEqual(["root/ACME/c.MIN", "root/ACME/d.MIN", "root/a.MIN", "root/b.min"].sort());
  });
  it("honors the cap (stops at N files)", () => {
    expect(enumerateMinFiles("root", 2, fakeReaddir).length).toBe(2);
  });
  it("swallows an unreadable dir without throwing (returns what it could enumerate)", () => {
    const files = enumerateMinFiles("missing-root", Infinity, fakeReaddir);
    expect(files).toEqual([]);
  });
});

describe("parseCursorDoneSet", () => {
  it("collects done filePaths from a JSONL cursor body", () => {
    const txt = '{"file":"x.MIN","rows":3}\n{"file":"y.MIN","rows":0}\n';
    const set = parseCursorDoneSet(txt);
    expect(set.has("x.MIN")).toBe(true);
    expect(set.has("y.MIN")).toBe(true);
    expect(set.size).toBe(2);
  });
  it("tolerates a torn final line (partial JSON) -- skips it, does not throw", () => {
    const txt = '{"file":"x.MIN","rows":3}\n{"file":"y.MIN","ro';
    const set = parseCursorDoneSet(txt);
    expect(set.has("x.MIN")).toBe(true);
    expect(set.has("y.MIN")).toBe(false); // torn -> not counted (re-processed on resume, harmless)
    expect(set.size).toBe(1);
  });
  it("empty/undefined body -> empty set", () => {
    expect(parseCursorDoneSet("").size).toBe(0);
    expect(parseCursorDoneSet(undefined).size).toBe(0);
  });
});

describe("partitionByResumeCursor", () => {
  it("splits todo vs skipped by the done-set, preserving every file exactly once", () => {
    const files = ["a", "b", "c", "d"];
    const done = new Set(["b", "d"]);
    const { todo, skipped } = partitionByResumeCursor(files, done);
    expect(todo).toEqual(["a", "c"]);
    expect(skipped).toEqual(["b", "d"]);
    expect(todo.length + skipped.length).toBe(files.length); // invariant: no file lost/duplicated
  });
  it("empty done-set -> everything is todo (fresh run)", () => {
    const { todo, skipped } = partitionByResumeCursor(["a", "b"], new Set());
    expect(todo).toEqual(["a", "b"]);
    expect(skipped).toEqual([]);
  });
});

describe("filterCommittedRows (resume orphan-drop -- prevents mid-write double-count)", () => {
  const rows = [
    { filePath: "a.MIN", cssSpeed: 100 },
    { filePath: "b.MIN", cssSpeed: 200 }, // orphan: b.MIN crashed mid-write, never cursor-marked
    { filePath: "a.MIN", cssSpeed: 150 },
  ];
  it("keeps only rows whose source file is in the cursor done-set (drops mid-write orphans)", () => {
    const kept = filterCommittedRows(rows, new Set(["a.MIN"]));
    expect(kept).toHaveLength(2);
    expect(kept.every((r) => r.filePath === "a.MIN")).toBe(true);
  });
  it("empty done-set drops everything; full done-set keeps everything", () => {
    expect(filterCommittedRows(rows, new Set())).toHaveLength(0);
    expect(filterCommittedRows(rows, new Set(["a.MIN", "b.MIN"]))).toHaveLength(3);
  });
  it("skips malformed rows (null / missing string filePath)", () => {
    const kept = filterCommittedRows([{ cssSpeed: 1 }, null, { filePath: "a.MIN" }], new Set(["a.MIN"]));
    expect(kept).toHaveLength(1);
    expect(kept[0].filePath).toBe("a.MIN");
  });
});

describe("buildProvenStore", () => {
  // The real aggregator returns outliersFlagged as an ARRAY of {source,value,expected,reason}
  // (ProvenSpeedFeedAggregatorEngine.AggregationResult) -- the fixture uses that real shape so
  // the assert encodes the true engine contract (R9), not a fabricated scalar.
  const agg = {
    totalPrograms: 36, totalSamples: 211,
    outliersFlagged: [
      { source: "f1.MIN", value: 1500, expected: { min: 0, max: 600 }, reason: ">2sigma" },
      { source: "f2.MIN", value: 1500, expected: { min: 0, max: 600 }, reason: ">2sigma" },
      { source: "f3.MIN", value: 20, expected: { min: 50, max: 600 }, reason: "<2sigma" },
    ],
    byMaterialGroup: { tool_steel: 71 }, byOperationCategory: { od_finishing: 29 },
  };
  const exported = [
    { materialGroup: "tool_steel", operation: "od_finishing", css: { recommended: 450, range: [450, 450] }, feed: { recommended: 0.006, range: [0.005, 0.006] }, confidence: 0.62, sampleCount: 29 },
    { materialGroup: "tool_steel", operation: "boring", css: null, feed: { recommended: 0.003, range: [0.003, 0.003] }, confidence: 0.71, sampleCount: 24 },
  ];
  it("stamps the schemaVersion + carries the real aggregate numbers (not placeholders)", () => {
    const s = buildProvenStore({ aggregate: agg, exported, highConfidence: [exported[1]], filesProcessed: 36, generatedAt: "2026-06-21T00:00:00Z" });
    expect(s.schemaVersion).toBe(STORE_SCHEMA_VERSION);
    expect(s.schemaVersion).toBe("1.0.0");
    expect(s.totalPrograms).toBe(36);
    expect(s.totalSamples).toBe(211);
    expect(s.outliersFlagged).toBe(3); // COUNT of the outlier array (not the array itself)
    expect(s.filesProcessed).toBe(36);
    expect(s.provenParams).toHaveLength(2);
    expect(s.provenParams[0].css.recommended).toBe(450); // real proven Vc preserved
    expect(s.highConfidenceCount).toBe(1);
    expect(s.byMaterialGroup.tool_steel).toBe(71);
    expect(s.byOperationCategory.od_finishing).toBe(29);
  });
  it("degrades safely on a null/empty aggregate (no throw, zeros + empty arrays)", () => {
    const s = buildProvenStore({ aggregate: null, exported: undefined, highConfidence: undefined, filesProcessed: 0, generatedAt: "t" });
    expect(s.totalPrograms).toBe(0);
    expect(s.totalSamples).toBe(0);
    expect(s.provenParams).toEqual([]);
    expect(s.highConfidenceCount).toBe(0);
    expect(s.byMaterialGroup).toEqual({});
  });
});
