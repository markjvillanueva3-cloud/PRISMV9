// Tests for formatCagHeadline (U-CAG-HITRATE-HEADLINE, slot:bravo 2026-06-14).
// Pure rendering of summarizeCagStats() output -> SessionStart headline | null. R9 intent-tests.
import { test } from "node:test";
import assert from "node:assert/strict";
import { formatCagHeadline } from "./session-start-cag-hitrate-headline.mjs";

const summary = (o = {}) => ({
  hits: o.hits ?? 3, misses: o.misses ?? 1, total: o.total ?? 4,
  hitRate: o.hitRate ?? 0.75, galaxies: o.galaxies ?? 2,
  byGalaxy: o.byGalaxy ?? {
    mill: { hits: 1, misses: 1, total: 2, hitRate: 0.5 },
    lathe: { hits: 2, misses: 0, total: 2, hitRate: 1 },
  },
  // warm-rate fields (U-CAG-HITRATE-HONESTY) pass through verbatim -- absent => undefined, so the
  // pre-existing tests (which never set them) see no warm clause, exactly as before.
  warmHitRate: o.warmHitRate, coldMisses: o.coldMisses, addressableMisses: o.addressableMisses,
});

test("renders headline with overall pct + total + galaxy count", () => {
  const h = formatCagHeadline(summary());
  assert.ok(h);
  assert.match(h, /75% hit-rate/);
  assert.match(h, /\b4\b.*lookup/);
  assert.match(h, /2.*galaxy/);
  assert.match(h, /CAG substrate hit-rate/);
});

test("R9: returns null when total < minTotal (don't surface near-empty data)", () => {
  // On revert (showing it regardless) this would be a string -> assertion FAILS.
  assert.equal(formatCagHeadline(summary({ total: 2 }), { minTotal: 3 }), null);
});

test("boundary: total === minTotal -> shown (>=, not >)", () => {
  assert.ok(formatCagHeadline(summary({ total: 3 }), { minTotal: 3 }));
});

test("top galaxies ordered by total desc, each with its own rate%", () => {
  const h = formatCagHeadline(summary({
    total: 10, hitRate: 0.6, galaxies: 3,
    byGalaxy: {
      mill: { total: 2, hitRate: 0.5 },
      lathe: { total: 6, hitRate: 0.83 },   // largest total -> first
      wedm: { total: 2, hitRate: 1 },
    },
  }));
  // lathe (total 6) must appear before mill/wedm in the "top:" clause
  const top = h.split("top:")[1] || "";
  assert.match(top, /lathe 83%/);
  assert.ok(top.indexOf("lathe") < top.indexOf("mill"), "lathe before mill");
});

test("empty byGalaxy -> headline without a 'top:' clause (no crash)", () => {
  const h = formatCagHeadline(summary({ byGalaxy: {} }));
  assert.ok(h);
  assert.doesNotMatch(h, /top:/);
});

test("0% hit-rate renders (not null, not NaN)", () => {
  const h = formatCagHeadline(summary({ hits: 0, misses: 5, total: 5, hitRate: 0, byGalaxy: { x: { total: 5, hitRate: 0 } } }));
  assert.match(h, /0% hit-rate/);
});

test("malformed input -> null (never throws)", () => {
  assert.equal(formatCagHeadline(null), null);
  assert.equal(formatCagHeadline("nope"), null);
  assert.equal(formatCagHeadline(undefined), null);
  assert.equal(formatCagHeadline({}), null); // no total -> 0 < minTotal
});

// ─── U-CAG-HITRATE-HONESTY (slot:alpha 2026-06-15): the warm-rate self-explainer clause ───

test("warm clause: cold-start-dominated substrate reads warm 100% + names the cold misses", () => {
  // The real-world case: 4h/38m raw (~10%) but every miss is a NOVEL first-ask -> warm 100%.
  const h = formatCagHeadline(summary({
    hits: 4, misses: 38, total: 42, hitRate: 4 / 42, galaxies: 34,
    warmHitRate: 1, coldMisses: 38, addressableMisses: 0,
    byGalaxy: { mill: { total: 3, hitRate: 0.33 } },
  }));
  assert.match(h, /Warm-traffic hit-rate 100%/);
  assert.match(h, /38 of 38 miss\(es\) are unavoidable first-asks/);
  assert.match(h, /0 recoverable misses \(cache healthy\)/);
  // raw line + footer still intact
  assert.match(h, /CAG substrate hit-rate/);
  assert.match(h, /PRISM_CAG_HEADLINE_DISABLE/);
});

test("warm clause: invalidation churn is surfaced as the real fixable signal", () => {
  const h = formatCagHeadline(summary({
    hits: 2, misses: 8, total: 10, hitRate: 0.2, galaxies: 3,
    warmHitRate: 0.25, coldMisses: 2, addressableMisses: 6,
  }));
  assert.match(h, /Warm-traffic hit-rate 25%/);
  assert.match(h, /6 recoverable \(doctrine-fingerprint churn/);
});

test("warm clause is OMITTED for legacy/untagged data (warmHitRate null|undefined) -- back-compat", () => {
  // Existing summaries carry no warm fields -> Number.isFinite(undefined) false -> no warm line.
  const hUndef = formatCagHeadline(summary());
  assert.doesNotMatch(hUndef, /Warm-traffic/);
  const hNull = formatCagHeadline(summary({ warmHitRate: null }));
  assert.doesNotMatch(hNull, /Warm-traffic/);
  // and the original headline contract is untouched
  assert.match(hUndef, /75% hit-rate/);
});
