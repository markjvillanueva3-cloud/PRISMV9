/**
 * Tests for scripts/audit-tribal-coverage-by-domain.mjs (U-VICTOR-A1).
 * Pure-core only — no FS I/O.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  byDomainCoverage,
  rankWorst,
  normalize,
} from "./audit-tribal-coverage-by-domain.mjs";
import { domainSlugs } from "./lib/wiki-domain-classifier.mjs";

// ============================================================================
// normalize (sanity — same contract as parent producer)
// ============================================================================

test("normalize strips knowledge/wiki/ prefix and lowercases", () => {
  assert.equal(normalize("knowledge/wiki/architecture/Mill.md"), "architecture/mill.md");
  assert.equal(normalize("KNOWLEDGE/WIKI/CONCEPTS/X.MD"), "concepts/x.md");
});

test("normalize rejects path-traversal", () => {
  assert.equal(normalize("knowledge/wiki/../etc/passwd"), "");
});

test("normalize handles null/undefined; coerces non-string per parent contract", () => {
  // Parent producer's `normalizeWikiPath` uses `String(p || "")` — null/undef
  // coerce to "" (empty + short-circuit), but numbers/booleans coerce to their
  // string form. Downstream `classifyDomain` returns "_unclassified" for any
  // non-matching string, so a stray "42" can't pollute domain buckets.
  assert.equal(normalize(null), "");
  assert.equal(normalize(undefined), "");
  assert.equal(normalize(42), "42"); // coerces — does NOT contain `..`, so passes
  assert.equal(normalize(0), "");    // 0 || "" → "" → empty short-circuit
});

// ============================================================================
// byDomainCoverage — happy path + edge cases
// ============================================================================

test("byDomainCoverage classifies all on-disk and missing per domain", () => {
  const onDisk = [
    "knowledge/wiki/engines/mill/A.md",
    "knowledge/wiki/engines/mill/B.md",
    "knowledge/wiki/engines/lathe/C.md",
    "knowledge/wiki/concepts/wire-edm-feasibility.md",
    "knowledge/wiki/architecture/dispatcher-cam.md",
  ];
  const missing = [
    "engines/mill/B.md",   // mill missing
    "engines/lathe/C.md",  // lathe missing
  ];
  const out = byDomainCoverage(onDisk, missing);

  assert.equal(out.mill.wikiFiles, 2);
  assert.equal(out.mill.missing, 1);
  assert.equal(out.mill.coverage, 0.5);

  assert.equal(out.lathe.wikiFiles, 1);
  assert.equal(out.lathe.missing, 1);
  assert.equal(out.lathe.coverage, 0);

  assert.equal(out.wedm.wikiFiles, 1);
  assert.equal(out.wedm.missing, 0);
  assert.equal(out.wedm.coverage, 1);

  assert.equal(out.cam.wikiFiles, 1);
  assert.equal(out.cam.missing, 0);
  assert.equal(out.cam.coverage, 1);
});

test("byDomainCoverage returns full slug set every call (byte-determinism)", () => {
  const out = byDomainCoverage([], []);
  for (const d of domainSlugs()) {
    assert.ok(d in out, `slug ${d} missing from output`);
    assert.equal(out[d].wikiFiles, 0);
    assert.equal(out[d].missing, 0);
    assert.equal(out[d].coverage, 1); // vacuous 1.0 when wikiFiles=0
  }
});

test("byDomainCoverage bounds sampleMissing to 5 entries per domain", () => {
  const onDisk = Array.from({ length: 50 }, (_, i) => `engines/mill/E${i.toString().padStart(2, "0")}.md`);
  const missing = onDisk.map((p) => p);
  const out = byDomainCoverage(onDisk, missing);
  assert.equal(out.mill.wikiFiles, 50);
  assert.equal(out.mill.missing, 50);
  assert.equal(out.mill.coverage, 0);
  assert.equal(out.mill.sampleMissing.length, 5);
  // Sorted, so first 5 are E00..E04
  assert.deepEqual(out.mill.sampleMissing, [
    "engines/mill/e00.md",
    "engines/mill/e01.md",
    "engines/mill/e02.md",
    "engines/mill/e03.md",
    "engines/mill/e04.md",
  ]);
});

test("byDomainCoverage rounds coverage to 4 decimals", () => {
  const onDisk = ["engines/mill/A.md", "engines/mill/B.md", "engines/mill/C.md"];
  const missing = ["engines/mill/A.md"]; // 2/3 = 0.6666...
  const out = byDomainCoverage(onDisk, missing);
  assert.equal(out.mill.coverage, 0.6667);
});

test("byDomainCoverage handles non-array input gracefully", () => {
  const out = byDomainCoverage(null, undefined);
  for (const d of domainSlugs()) {
    assert.equal(out[d].wikiFiles, 0);
    assert.equal(out[d].coverage, 1);
  }
});

test("byDomainCoverage classifies unknown paths to _unclassified", () => {
  const out = byDomainCoverage(["concepts/something-random.md"], []);
  assert.equal(out._unclassified.wikiFiles, 1);
});

// ============================================================================
// rankWorst
// ============================================================================

test("rankWorst returns lowest-coverage domains first, skips zero-file vacuous 1.0", () => {
  const byDomain = byDomainCoverage(
    [
      "engines/mill/A.md",   // mill: 1 file
      "engines/mill/B.md",   // mill: 1 file
      "engines/lathe/C.md",  // lathe: 1 file
      "engines/cad/D.md",    // cad: 1 file
    ],
    ["engines/mill/A.md", "engines/lathe/C.md"] // mill 50%, lathe 0%, cad 100%
  );
  const ranked = rankWorst(byDomain);
  // lathe (0%) before mill (50%) before cad (100%)
  assert.equal(ranked[0][0], "lathe");
  assert.equal(ranked[1][0], "mill");
  assert.equal(ranked[2][0], "cad");
  // logistics has 0 files → not in ranked output (vacuous 1.0)
  const slugs = ranked.map((r) => r[0]);
  assert.ok(!slugs.includes("logistics"));
});

test("rankWorst handles empty input", () => {
  assert.deepEqual(rankWorst({}), []);
  assert.deepEqual(rankWorst(null), []);
});

test("rankWorst tie-breaks by wikiFiles descending", () => {
  // Two domains at 50% coverage; the one with more files ranks first
  const byDomain = {
    mill:    { wikiFiles: 10, missing: 5, coverage: 0.5, sampleMissing: [] },
    lathe:   { wikiFiles:  4, missing: 2, coverage: 0.5, sampleMissing: [] },
    cad:     { wikiFiles:  6, missing: 3, coverage: 0.5, sampleMissing: [] },
  };
  const ranked = rankWorst(byDomain);
  assert.equal(ranked[0][0], "mill");   // 10 files
  assert.equal(ranked[1][0], "cad");    // 6 files
  assert.equal(ranked[2][0], "lathe");  // 4 files
});
