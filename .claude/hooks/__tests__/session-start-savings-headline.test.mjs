import { test } from "node:test";
import assert from "node:assert/strict";
import { formatHeadline, formatLedgerBreakdown } from "../session-start-savings-headline.mjs";

test("formatHeadline: null/missing → null", () => {
  assert.equal(formatHeadline(null), null);
  assert.equal(formatHeadline({}), null);
  assert.equal(formatHeadline({ totals: null }), null);
});

test("formatHeadline: under minHits floor → null", () => {
  const out = formatHeadline({ totals: { hits: 1, nudges: 1, savedTokens: 100, ledgersWithData: 1 } }, { minHits: 5 });
  assert.equal(out, null);
});

test("formatHeadline: above minHits → emits headline", () => {
  const out = formatHeadline({ totals: { hits: 10, nudges: 5, savedTokens: 12000, ledgersWithData: 3 } }, { minHits: 5 });
  assert.ok(out);
  assert.ok(out.includes("10 hits"));
  assert.ok(out.includes("5 nudges"));
  assert.ok(out.includes("12.0k"));
});

test("formatHeadline: nudges-only counts toward activity threshold", () => {
  const out = formatHeadline({ totals: { hits: 0, nudges: 6, savedTokens: 0, ledgersWithData: 1 } }, { minHits: 5 });
  assert.ok(out);
});

test("formatHeadline: source pointer included", () => {
  const out = formatHeadline({ totals: { hits: 10, nudges: 0, savedTokens: 5000, ledgersWithData: 1 } });
  assert.ok(out.includes("psn-savings-aggregate.json"));
  // U-PSA01 was the original; U-PSA02 extends with the breakdown line. Either is acceptable.
  assert.ok(out.includes("U-PSA0"));
});

// ---------------------------------------------------------------------------
// formatLedgerBreakdown — U-PSA02 (2026-05-24, slot:alpha)
// ---------------------------------------------------------------------------

test("formatLedgerBreakdown: empty/null/undefined → ''", () => {
  assert.equal(formatLedgerBreakdown({}), "");
  assert.equal(formatLedgerBreakdown(null), "");
  assert.equal(formatLedgerBreakdown(undefined), "");
});

test("formatLedgerBreakdown: bad input does not throw", () => {
  assert.doesNotThrow(() => formatLedgerBreakdown(null));
  assert.doesNotThrow(() => formatLedgerBreakdown(undefined));
  assert.doesNotThrow(() => formatLedgerBreakdown(42));
  assert.doesNotThrow(() => formatLedgerBreakdown("string"));
  assert.doesNotThrow(() => formatLedgerBreakdown([1, 2, 3]));
  // Per-entry malformed values
  assert.doesNotThrow(() => formatLedgerBreakdown({ multi: null, rtk: undefined, x: "no" }));
});

test("formatLedgerBreakdown: nudge-only ledger produces 'multi(Nn=Xk)'", () => {
  const out = formatLedgerBreakdown({
    "pre-tool-savings-multi": { lines: 100, nudges: 12, hits: 0, misses: 0, savedTokens: 2400 },
  });
  assert.equal(out, "multi(12n=2.4k)");
});

test("formatLedgerBreakdown: rtk-adoption-measure shows hits/misses split", () => {
  const out = formatLedgerBreakdown({
    "rtk-adoption-measure": { lines: 37, nudges: 0, hits: 0, misses: 37, savedTokens: 0 },
  });
  assert.ok(out.includes("rtkAdopt"));
  assert.ok(out.includes("0h/37m=0.0k"));
});

test("formatLedgerBreakdown: hit-only ledger uses Nh shape", () => {
  const out = formatLedgerBreakdown({
    "injection-dedup-cache": { lines: 7, nudges: 0, hits: 7, misses: 0, savedTokens: 0 },
  });
  assert.equal(out, "dedup(7h=0.0k)");
});

test("formatLedgerBreakdown: skips ledgers with zero activity AND zero lines", () => {
  const out = formatLedgerBreakdown({
    "rtk-savings-ledger": { lines: 50, nudges: 0, hits: 5, misses: 45, savedTokens: 1200 },
    "prompt-rewrites": { lines: 0, nudges: 0, hits: 0, misses: 0, savedTokens: 0 },
  });
  assert.ok(out.includes("rtk("));
  assert.ok(!out.includes("rewriter"));
});

test("formatLedgerBreakdown: 5+ ledgers respects 200-char cap", () => {
  const byLedger = {};
  for (let i = 0; i < 25; i += 1) {
    byLedger[`some-very-long-ledger-name-${i}`] = { lines: 100, nudges: 1234567, hits: 0, misses: 0, savedTokens: 9999 };
  }
  const out = formatLedgerBreakdown(byLedger);
  assert.ok(out.length <= 200, `length was ${out.length}: ${out}`);
  assert.ok(out.includes("more"), `expected '+N more' tail: ${out}`);
});

test("formatLedgerBreakdown: 5 reasonable ledgers stays under cap and lists all", () => {
  const out = formatLedgerBreakdown({
    "rtk-savings-ledger": { lines: 1957, nudges: 0, hits: 84, misses: 434, savedTokens: 42000 },
    "prompt-rewrites": { lines: 10, nudges: 2, hits: 0, misses: 0, savedTokens: 0 },
    "pre-tool-savings-multi": { lines: 1920, nudges: 3, hits: 0, misses: 0, savedTokens: 0 },
    "read-auto-limit": { lines: 223, nudges: 0, hits: 0, misses: 0, savedTokens: 0 },
    "rtk-adoption-measure": { lines: 37, nudges: 0, hits: 0, misses: 37, savedTokens: 0 },
    "injection-dedup-cache": { lines: 7, nudges: 0, hits: 7, misses: 0, savedTokens: 0 },
  });
  assert.ok(out.length <= 200, `length was ${out.length}: ${out}`);
  // All non-zero ledgers should appear (read-auto-limit has lines but no activity → still rendered as 0n=0.0k)
  assert.ok(out.includes("rtk("), out);
  assert.ok(out.includes("multi("), out);
  assert.ok(out.includes("rtkAdopt"), out);
  assert.ok(out.includes("dedup"), out);
});

test("formatHeadline: includes 'Detectors:' breakdown line when byLedger present", () => {
  const out = formatHeadline({
    totals: { hits: 10, nudges: 5, savedTokens: 12000, ledgersWithData: 2 },
    byLedger: {
      "pre-tool-savings-multi": { lines: 100, nudges: 5, hits: 0, misses: 0, savedTokens: 2400 },
      "rtk-savings-ledger": { lines: 200, nudges: 0, hits: 10, misses: 50, savedTokens: 9600 },
    },
  });
  assert.ok(out);
  assert.ok(out.includes("Detectors:"), `expected 'Detectors:' line: ${out}`);
  assert.ok(out.includes("multi("));
  assert.ok(out.includes("rtk("));
});

test("formatHeadline: omits Detectors line when byLedger is absent", () => {
  const out = formatHeadline({ totals: { hits: 10, nudges: 5, savedTokens: 12000, ledgersWithData: 1 } });
  assert.ok(out);
  // No byLedger → no Detectors prefix
  assert.ok(!out.includes("Detectors:"));
});
