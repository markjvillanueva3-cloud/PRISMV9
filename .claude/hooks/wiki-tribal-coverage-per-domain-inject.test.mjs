/**
 * Tests for .claude/hooks/wiki-tribal-coverage-per-domain-inject.mjs (U-VICTOR-A2).
 * Pure-core only — no FS / no settings.json wiring.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  pickWorst,
  formatPayload,
  DEFAULT_THRESHOLD,
  DEFAULT_TOPK,
  DEFAULT_STALE_HRS,
} from "./wiki-tribal-coverage-per-domain-inject.mjs";

// ============================================================================
// pickWorst — coverage threshold + tie-break
// ============================================================================

test("pickWorst returns lowest-coverage domains first, threshold-gated", () => {
  const byDomain = {
    mill:  { wikiFiles: 100, missing: 80, coverage: 0.20, sampleMissing: ["a.md"] },
    cad:   { wikiFiles: 100, missing: 30, coverage: 0.70, sampleMissing: ["b.md"] },
    lathe: { wikiFiles:  50, missing:  5, coverage: 0.90, sampleMissing: ["c.md"] },
    wedm:  { wikiFiles:  20, missing: 15, coverage: 0.25, sampleMissing: ["d.md"] },
    logistics: { wikiFiles: 0, missing: 0, coverage: 1.00, sampleMissing: [] },
  };
  const out = pickWorst(byDomain, 0.50, 3);
  // mill (0.20) + wedm (0.25) are below threshold; cad (0.70) + lathe (0.90) are above
  // logistics is skipped (wikiFiles=0)
  assert.equal(out.length, 2);
  assert.equal(out[0][0], "mill");
  assert.equal(out[1][0], "wedm");
});

test("pickWorst respects topK cap", () => {
  const byDomain = {
    a: { wikiFiles: 10, missing:  9, coverage: 0.10, sampleMissing: [] },
    b: { wikiFiles: 10, missing:  8, coverage: 0.20, sampleMissing: [] },
    c: { wikiFiles: 10, missing:  7, coverage: 0.30, sampleMissing: [] },
    d: { wikiFiles: 10, missing:  6, coverage: 0.40, sampleMissing: [] },
  };
  const out = pickWorst(byDomain, 0.50, 2);
  assert.equal(out.length, 2);
  assert.equal(out[0][0], "a");
  assert.equal(out[1][0], "b");
});

test("pickWorst tie-break: same coverage, more files wins", () => {
  const byDomain = {
    big:   { wikiFiles: 100, missing: 25, coverage: 0.25, sampleMissing: [] },
    small: { wikiFiles:  20, missing:  5, coverage: 0.25, sampleMissing: [] },
  };
  const out = pickWorst(byDomain, 0.50, 5);
  assert.equal(out[0][0], "big");
  assert.equal(out[1][0], "small");
});

test("pickWorst skips entries with non-finite or unfit shape", () => {
  const byDomain = {
    bad1: null,
    bad2: { wikiFiles: NaN, coverage: 0.1 },
    bad3: { wikiFiles: 10, coverage: "0.1" },
    bad4: { wikiFiles: 0, coverage: 0.1 }, // zero files
    ok:   { wikiFiles: 5, missing: 4, coverage: 0.20, sampleMissing: [] },
  };
  const out = pickWorst(byDomain, 0.50, 5);
  assert.equal(out.length, 1);
  assert.equal(out[0][0], "ok");
});

test("pickWorst empty/invalid input returns []", () => {
  assert.deepEqual(pickWorst(null), []);
  assert.deepEqual(pickWorst({}, 0.5, 3), []);
  assert.deepEqual(pickWorst("not an object"), []);
});

// ============================================================================
// formatPayload — markdown structure
// ============================================================================

test("formatPayload returns null when report null (silent)", () => {
  assert.equal(formatPayload({ report: null, ageMs: 0 }, DEFAULT_THRESHOLD, DEFAULT_TOPK, DEFAULT_STALE_HRS), null);
});

test("formatPayload returns null when no worst domains under threshold", () => {
  const r = {
    byDomain: {
      mill: { wikiFiles: 100, missing: 1, coverage: 0.99, sampleMissing: [] },
    },
  };
  assert.equal(
    formatPayload({ report: r, ageMs: 0 }, 0.50, 3, DEFAULT_STALE_HRS),
    null
  );
});

test("formatPayload returns null when report stale (over hrs ceiling)", () => {
  const r = {
    byDomain: {
      mill: { wikiFiles: 100, missing: 90, coverage: 0.10, sampleMissing: ["x.md"] },
    },
  };
  const ageMs = (DEFAULT_STALE_HRS + 1) * 3_600_000;
  assert.equal(
    formatPayload({ report: r, ageMs }, 0.50, 3, DEFAULT_STALE_HRS),
    null
  );
});

test("formatPayload markdown contains domain + coverage + sample", () => {
  const r = {
    byDomain: {
      mill: { wikiFiles: 100, missing: 75, coverage: 0.25, sampleMissing: ["engines/mill/foo.md"] },
      wedm: { wikiFiles:  20, missing: 15, coverage: 0.25, sampleMissing: ["concepts/wedm-bar.md"] },
    },
  };
  const out = formatPayload({ report: r, ageMs: 60_000 }, 0.50, 3, DEFAULT_STALE_HRS);
  assert.ok(out, "expected non-null payload");
  assert.match(out, /Wiki.*Tribal coverage/);
  assert.match(out, /mill/);
  assert.match(out, /25.0% covered/);
  assert.match(out, /engines\/mill\/foo\.md/);
  assert.match(out, /wedm/);
  assert.match(out, /U-VICTOR-A1/);
});

test("formatPayload omits sample line when sampleMissing empty", () => {
  const r = {
    byDomain: {
      logistics: { wikiFiles: 1, missing: 1, coverage: 0, sampleMissing: [] },
    },
  };
  const out = formatPayload({ report: r, ageMs: 60_000 }, 0.50, 3, DEFAULT_STALE_HRS);
  assert.ok(out);
  // Should still appear, just no "sample: " suffix
  assert.match(out, /logistics/);
  assert.doesNotMatch(out, /sample:.*logistics/);
});
