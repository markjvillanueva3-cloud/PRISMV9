/**
 * Tests for generate-print-reading-wiki-tribal.mjs (PRINT-OCR-100PCT-MS0/U4).
 *
 * The CLI is import-safe: buildPlan() is exported so tests can verify the
 * plan shape WITHOUT performing real disk writes against
 * H:/prism/knowledge/wiki/.
 *
 * Real-invariant assertions only — every test verifies a property of the
 * mined plan against a known corpus shape, not just presence-of-output.
 *
 * Run: node --test H:/prism-slot-mike/scripts/generate-print-reading-wiki-tribal.test.mjs
 */

import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { buildPlan } from "./generate-print-reading-wiki-tribal.mjs";

function makeRow(overrides = {}) {
  return {
    rowId: overrides.rowId ?? "row-1",
    sourceSha256: overrides.sourceSha256 ?? "a".repeat(64),
    sourcePath: overrides.sourcePath ?? "/tmp/x.pdf",
    sourceKind: "jm_die",
    sourceFormat: "pdf",
    pageCount: 1,
    customer: overrides.customer ?? null,
    partNumber: null,
    revision: null,
    pages: overrides.pages ?? [
      {
        extractionId: "e-1",
        pdfPath: "/tmp/x.pdf",
        page: 1,
        familyMatchId: null,
        regions: overrides.regions ?? [
          {
            regionId: "r-1",
            dimType: "linear",
            value: "10",
            confidence: 0.9,
            confidenceLower: 0.85,
            confidenceUpper: 0.95,
          },
        ],
        sources: [{ kind: "corpus", id: "s-1", title: "t", score: 0.7 }],
        confidenceFloor: overrides.floor ?? "normal",
        contradictionsDetected: [],
        extractedAt: "2026-05-21T00:00:00Z",
        backendId: "test",
      },
    ],
    worstConfidenceFloor: overrides.floor ?? "normal",
    totalRegions: overrides.regions?.length ?? 1,
    weakestRegionConfidence: 0.9,
    scanStatus: overrides.scanStatus ?? "extracted",
    scannedAt: "2026-05-21T00:00:00Z",
    scanLatencyMs: 100,
    groundTruthAvailable: false,
    groundTruthSource: "none",
    accuracyAgainstGroundTruth: null,
    accuracyVerifiedAt: null,
    requiresOperatorReview: false,
    operatorReviewedBy: null,
    operatorReviewedAt: null,
    operatorVerdict: "pending",
    isAnonymizable: true,
    anonymizationBlockedReason: null,
  };
}

let tmpDir;
let opts;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "wiki-tribal-gen-test-"));
  opts = {
    rowsFile: path.join(tmpDir, "rows.jsonl"),
    wikiLessonsDir: path.join(tmpDir, "wiki", "lessons"),
    wikiTribalDir: path.join(tmpDir, "wiki", "code-tribal"),
    tribalJsonl: path.join(tmpDir, "tribal-tips.jsonl"),
    // Default to per-family mode (threshold 1) so small fixtures each get a
    // lesson. Long-tail folding is exercised explicitly in its own test.
    minFamilySize: 1,
  };
});

afterEach(() => {
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
});

describe("buildPlan — mining + emission", () => {
  it("empty corpus → no lessons/tips, but 11 dim-type reference docs", () => {
    // Lessons + tips are corpus-derived (0 when corpus empty).
    // Code-tribal dim-type docs are REFERENCE guidance — always emitted so
    // the AI has read-guidance for every dim-type from day one.
    const plan = buildPlan([], opts);
    assert.equal(plan.lessons.length, 0);
    assert.equal(plan.tips.length, 0);
    assert.equal(plan.tribal.length, 11);
    for (const t of plan.tribal) {
      assert.ok(t.body.includes("0 regions"), "empty-corpus dim-type doc reports count 0");
    }
  });

  it("anonymises JM-DIE customer names in lesson filenames", () => {
    const rows = [
      makeRow({ rowId: "r1", sourceSha256: "a".repeat(64), customer: "ITW" }),
      makeRow({ rowId: "r2", sourceSha256: "b".repeat(64), customer: "ITW" }),
    ];
    const plan = buildPlan(rows, opts);
    assert.equal(plan.lessons.length, 1, "single family → single lesson");
    // ITW maps to fastener-family.
    assert.ok(plan.lessons[0].path.includes("fastener-family"));
    assert.ok(!plan.lessons[0].path.includes("ITW"), "ITW name MUST be anonymised");
    // Body also anonymises.
    assert.ok(!plan.lessons[0].body.includes("ITW"));
    assert.ok(plan.lessons[0].body.includes("fastener-family"));
  });

  it("groups multiple customers in the same anonymity bucket", () => {
    const rows = [
      makeRow({ rowId: "r1", sourceSha256: "a".repeat(64), customer: "ITW" }),
      makeRow({ rowId: "r2", sourceSha256: "b".repeat(64), customer: "Optimas" }),
      makeRow({ rowId: "r3", sourceSha256: "c".repeat(64), customer: "SFS" }),
      makeRow({ rowId: "r4", sourceSha256: "d".repeat(64), customer: "Alcoa" }),
    ];
    const plan = buildPlan(rows, opts);
    // ITW/Optimas/SFS all map to fastener-family; Alcoa to aerospace-aluminum-family.
    assert.equal(plan.lessons.length, 2);
    const slugs = plan.lessons.map((l) => path.basename(l.path)).sort();
    assert.deepEqual(slugs, [
      "print-reading-aerospace-aluminum-family.md",
      "print-reading-fastener-family.md",
    ]);
  });

  it("null-customer rows fall into the 'general' bucket", () => {
    const rows = [makeRow({ rowId: "r1", customer: null })];
    const plan = buildPlan(rows, opts);
    assert.equal(plan.lessons.length, 1);
    assert.ok(plan.lessons[0].path.endsWith("print-reading-general.md"));
  });

  it("emits a code-tribal entry for ALL 11 dim-types, regardless of observation", () => {
    // Only 3 dim-types observed, but the generator emits reference docs for
    // every dim-type in the enum so the AI has guidance for all of them.
    const rows = [
      makeRow({
        rowId: "r1",
        sourceSha256: "a".repeat(64),
        regions: [
          { regionId: "r1", dimType: "linear", value: "1", confidence: 0.9, confidenceLower: 0.85, confidenceUpper: 0.95 },
          { regionId: "r2", dimType: "diameter", value: "2", confidence: 0.9, confidenceLower: 0.85, confidenceUpper: 0.95 },
          { regionId: "r3", dimType: "gdt_positional", value: "0.05", confidence: 0.9, confidenceLower: 0.85, confidenceUpper: 0.95 },
        ],
      }),
    ];
    const plan = buildPlan(rows, opts);
    assert.equal(plan.tribal.length, 11, "must emit all 11 dim-type reference docs");
    const slugs = plan.tribal.map((t) => path.basename(t.path)).sort();
    assert.deepEqual(slugs, [
      "blueprint-dim-diameter.md",
      "blueprint-dim-gdt-positional.md",
      "blueprint-dim-gdt-profile.md",
      "blueprint-dim-gdt-runout.md",
      "blueprint-dim-linear.md",
      "blueprint-dim-material-callout.md",
      "blueprint-dim-note.md",
      "blueprint-dim-other.md",
      "blueprint-dim-radius.md",
      "blueprint-dim-surface-finish.md",
      "blueprint-dim-thread-callout.md",
    ]);
  });

  it("unobserved dim-types still emit a code-tribal doc with count 0", () => {
    const rows = [
      makeRow({
        rowId: "r1",
        regions: [
          { regionId: "r1", dimType: "linear", value: "1", confidence: 0.9, confidenceLower: 0.85, confidenceUpper: 0.95 },
        ],
      }),
    ];
    const plan = buildPlan(rows, opts);
    // radius was never observed — its doc must still exist with "0 regions".
    const radius = plan.tribal.find((t) => t.path.includes("blueprint-dim-radius"));
    assert.ok(radius, "radius reference doc must be emitted even when unobserved");
    assert.ok(radius.body.includes("0 regions"), "unobserved dim-type body reports count 0");
  });

  it("unknown customers get distinct stable per-customer hash buckets", () => {
    // Two unknown customers must NOT collapse into one bucket — that's the
    // bug that made a 19,646-row corpus emit only 1 lesson.
    const rows = [
      makeRow({ rowId: "r1", sourceSha256: "a".repeat(64), customer: "AcmeWidgets" }),
      makeRow({ rowId: "r2", sourceSha256: "b".repeat(64), customer: "BetaCorp" }),
      makeRow({ rowId: "r3", sourceSha256: "c".repeat(64), customer: "AcmeWidgets" }),
    ];
    const plan = buildPlan(rows, opts);
    // 2 distinct unknown customers → 2 distinct lessons.
    assert.equal(plan.lessons.length, 2);
    // Real names must NOT appear; slugs must be customer-<8hex>.
    for (const lesson of plan.lessons) {
      const base = path.basename(lesson.path);
      assert.match(base, /^print-reading-customer-[a-f0-9]{8}\.md$/);
      assert.ok(!lesson.body.includes("AcmeWidgets"));
      assert.ok(!lesson.body.includes("BetaCorp"));
    }
  });

  it("dim-type tribal body includes the observed-count and guidance", () => {
    const rows = [
      makeRow({
        rowId: "r1",
        regions: [
          { regionId: "r1", dimType: "thread_callout", value: "1/4-20 UNC", confidence: 0.9, confidenceLower: 0.85, confidenceUpper: 0.95 },
        ],
      }),
    ];
    const plan = buildPlan(rows, opts);
    const tc = plan.tribal.find((t) => t.path.includes("thread-callout"));
    assert.ok(tc);
    assert.ok(tc.body.includes("1 regions"), "body must report observed count");
    assert.ok(tc.body.includes("UNC"), "thread guidance must mention UNC pattern");
  });

  it("tribal tips JSONL has one tip per family + top-5 dim-types", () => {
    const rows = [
      makeRow({ rowId: "r1", sourceSha256: "a".repeat(64), customer: "ITW" }),
      makeRow({ rowId: "r2", sourceSha256: "b".repeat(64), customer: "Alcoa" }),
    ];
    const plan = buildPlan(rows, opts);
    // 2 families + 1 dim-type (linear) = 3 tips.
    assert.equal(plan.tips.length, 3);
    const ids = plan.tips.map((t) => t.id).sort();
    assert.ok(ids.includes("print-reading-fastener-family-floor"));
    assert.ok(ids.includes("print-reading-aerospace-aluminum-family-floor"));
    assert.ok(ids.includes("dim-type-linear-prevalence"));
    // Every tip has the required fields per TribalKnowledgeEngine schema.
    for (const tip of plan.tips) {
      assert.equal(typeof tip.id, "string");
      assert.equal(tip.category, "blueprint-extraction");
      assert.equal(tip.source, "PRINT-OCR-100PCT-MS0/U4");
      assert.equal(typeof tip.tip, "string");
      assert.equal(typeof tip.rationale, "string");
      assert.equal(typeof tip.createdAt, "string");
    }
  });

  it("lesson body reflects dominant floor + failure rate", () => {
    const rows = [
      makeRow({ rowId: "r1", sourceSha256: "a".repeat(64), customer: "ITW", floor: "normal" }),
      makeRow({ rowId: "r2", sourceSha256: "b".repeat(64), customer: "ITW", floor: "normal" }),
      makeRow({ rowId: "r3", sourceSha256: "c".repeat(64), customer: "ITW", floor: "low_no_vision", scanStatus: "extraction_failed" }),
    ];
    const plan = buildPlan(rows, opts);
    const lesson = plan.lessons[0];
    assert.ok(lesson.body.includes("Total prints | 3"));
    assert.ok(lesson.body.includes("Failed extractions | 1"));
    assert.ok(lesson.body.includes("33.3%"), "fail-pct must be reported");
    assert.ok(lesson.body.includes("`normal`"), "dominant floor must be reported");
  });

  it("--limit caps the output plan size", () => {
    const rows = [];
    for (let i = 0; i < 8; i++) {
      const sha = String.fromCharCode(97 + i).repeat(64);  // a..h
      rows.push(makeRow({
        rowId: `r${i}`,
        sourceSha256: sha,
        customer: i % 2 ? "ITW" : "Alcoa",
        regions: [
          { regionId: `r${i}-1`, dimType: i % 3 === 0 ? "linear" : i % 3 === 1 ? "diameter" : "radius",
            value: "1", confidence: 0.9, confidenceLower: 0.85, confidenceUpper: 0.95 },
        ],
      }));
    }
    const plan = buildPlan(rows, { ...opts, limit: 2 });
    assert.ok(plan.lessons.length <= 2);
    assert.ok(plan.tribal.length <= 2);
    assert.ok(plan.tips.length <= 2);
  });

  it("lesson frontmatter declares the milestone + unit + generated flag", () => {
    const rows = [makeRow({ rowId: "r1", customer: "ITW" })];
    const plan = buildPlan(rows, opts);
    const body = plan.lessons[0].body;
    assert.ok(body.startsWith("---"));
    assert.ok(body.includes("milestone: PRINT-OCR-100PCT-MS0"));
    assert.ok(body.includes("unit: U4"));
    assert.ok(body.includes("generated: true"));
  });

  it("code-tribal frontmatter declares milestone + unit + slug-matches-filename", () => {
    const rows = [makeRow({
      rowId: "r1",
      regions: [
        { regionId: "r1", dimType: "surface_finish", value: "Ra 1.6", confidence: 0.9, confidenceLower: 0.85, confidenceUpper: 0.95 },
      ],
    })];
    const plan = buildPlan(rows, opts);
    const item = plan.tribal.find((t) => t.path.includes("blueprint-dim-surface-finish"));
    assert.ok(item, "surface-finish code-tribal doc must be emitted");
    assert.ok(item.body.includes("slug: blueprint-dim-surface-finish"));
    assert.equal(path.basename(item.path), "blueprint-dim-surface-finish.md");
  });
});

describe("buildPlan — part-family grouping (JM-DIE _PART LIBRARY)", () => {
  it("groups rows by part-family alpha-prefix from _UNASSIGNED path", () => {
    // The real JM-DIE corpus is _PART LIBRARY/_UNASSIGNED/<part>/file.pdf.
    // groupKeyForRow must cluster by the part's alpha prefix.
    const rows = [
      makeRow({ rowId: "r1", sourceSha256: "a".repeat(64),
        sourcePath: "H:/PRISM/JM DIE/_PART LIBRARY/_UNASSIGNED/ZQ90/ZQ90_p1.pdf" }),
      makeRow({ rowId: "r2", sourceSha256: "b".repeat(64),
        sourcePath: "H:/PRISM/JM DIE/_PART LIBRARY/_UNASSIGNED/ZQ91/ZQ91_p1.pdf" }),
      makeRow({ rowId: "r3", sourceSha256: "c".repeat(64),
        sourcePath: "H:/PRISM/JM DIE/_PART LIBRARY/_UNASSIGNED/AB12/AB12_p1.pdf" }),
    ];
    const plan = buildPlan(rows, opts);
    // ZQ90 + ZQ91 → family ZQ ; AB12 → family AB. Two lessons.
    assert.equal(plan.lessons.length, 2);
    const slugs = plan.lessons.map((l) => path.basename(l.path)).sort();
    assert.deepEqual(slugs, [
      "print-reading-family-AB.md",
      "print-reading-family-ZQ.md",
    ]);
  });

  it("folds families below minFamilySize into one long-tail lesson", () => {
    // 3 distinct single-print families, threshold 2 → all 3 fold to long-tail.
    const rows = [
      makeRow({ rowId: "r1", sourceSha256: "a".repeat(64),
        sourcePath: "H:/PRISM/JM DIE/_PART LIBRARY/_UNASSIGNED/QQ1/QQ1.pdf" }),
      makeRow({ rowId: "r2", sourceSha256: "b".repeat(64),
        sourcePath: "H:/PRISM/JM DIE/_PART LIBRARY/_UNASSIGNED/RR1/RR1.pdf" }),
      makeRow({ rowId: "r3", sourceSha256: "c".repeat(64),
        sourcePath: "H:/PRISM/JM DIE/_PART LIBRARY/_UNASSIGNED/SS1/SS1.pdf" }),
    ];
    const plan = buildPlan(rows, { ...opts, minFamilySize: 2 });
    assert.equal(plan.lessons.length, 1, "all below threshold → 1 long-tail lesson");
    assert.ok(plan.lessons[0].path.endsWith("print-reading-long-tail-small-families.md"));
    assert.ok(plan.lessons[0].body.includes("aggregates 3 small part-families"));
    assert.ok(plan.lessons[0].body.includes("Total prints | 3"));
  });

  it("mixes per-family + long-tail when families straddle the threshold", () => {
    // ZQ family has 3 prints (>= threshold 2); AB has 1 (< threshold).
    const rows = [
      makeRow({ rowId: "r1", sourceSha256: "a".repeat(64),
        sourcePath: "H:/PRISM/JM DIE/_PART LIBRARY/_UNASSIGNED/ZQ1/ZQ1.pdf" }),
      makeRow({ rowId: "r2", sourceSha256: "b".repeat(64),
        sourcePath: "H:/PRISM/JM DIE/_PART LIBRARY/_UNASSIGNED/ZQ2/ZQ2.pdf" }),
      makeRow({ rowId: "r3", sourceSha256: "c".repeat(64),
        sourcePath: "H:/PRISM/JM DIE/_PART LIBRARY/_UNASSIGNED/ZQ3/ZQ3.pdf" }),
      makeRow({ rowId: "r4", sourceSha256: "d".repeat(64),
        sourcePath: "H:/PRISM/JM DIE/_PART LIBRARY/_UNASSIGNED/AB1/AB1.pdf" }),
    ];
    const plan = buildPlan(rows, { ...opts, minFamilySize: 2 });
    assert.equal(plan.lessons.length, 2);
    const slugs = plan.lessons.map((l) => path.basename(l.path)).sort();
    assert.deepEqual(slugs, [
      "print-reading-family-ZQ.md",
      "print-reading-long-tail-small-families.md",
    ]);
  });
});
