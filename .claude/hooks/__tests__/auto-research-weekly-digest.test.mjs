/**
 * auto-research-weekly-digest — script tests (U-ALL10)
 *
 * Uses node:test (not vitest) to match sibling hook test convention.
 */

import { test } from "node:test";
import { strict as assert } from "node:assert";
import {
  parseJsonl,
  partition,
  sortPending,
  renderDigest,
  DEFAULT_MAX_ITEMS,
} from "../../../scripts/auto-research-weekly-digest.mjs";

const T0 = Date.UTC(2026, 4, 13, 12, 0, 0);

function pending(over = {}) {
  return {
    id: over.id ?? "U-AUTORES-01",
    title: over.title ?? "Headline",
    verdictScore: over.verdictScore ?? 0.85,
    bypassedRateLimit: over.bypassedRateLimit ?? false,
    source: over.source ?? "arxiv",
    guid: over.guid ?? "g-1",
    url: over.url,
    proposedAt: over.proposedAt ?? "2026-05-13T12:00:00Z",
    status: over.status ?? "pending",
  };
}

test("parseJsonl skips comments + blanks", () => {
  const buf = ["# comment", "", JSON.stringify(pending({ id: "A" })), JSON.stringify(pending({ id: "B" }))].join("\n");
  const out = parseJsonl(buf);
  assert.equal(out.length, 2);
});

test("parseJsonl skips malformed lines", () => {
  const buf = [JSON.stringify(pending()), "not-json{", JSON.stringify(pending({ id: "B" }))].join("\n");
  assert.equal(parseJsonl(buf).length, 2);
});

test("parseJsonl empty input → empty array", () => {
  assert.equal(parseJsonl("").length, 0);
  assert.equal(parseJsonl(null).length, 0);
});

test("partition splits by status", () => {
  const p = partition([pending({ status: "pending" }), pending({ status: "approved" }), pending({ status: "rejected" })]);
  assert.equal(p.pending.length, 1);
  assert.equal(p.approved.length, 1);
  assert.equal(p.rejected.length, 1);
});

test("partition missing status defaults to pending", () => {
  const p = partition([{ id: "x" }]);
  assert.equal(p.pending.length, 1);
});

test("sortPending sorts by score desc, then proposedAt asc", () => {
  const items = [
    pending({ id: "low", verdictScore: 0.3 }),
    pending({ id: "high", verdictScore: 0.9 }),
    pending({ id: "mid-early", verdictScore: 0.6, proposedAt: "2026-05-13T08:00:00Z" }),
    pending({ id: "mid-late", verdictScore: 0.6, proposedAt: "2026-05-13T18:00:00Z" }),
  ];
  const out = sortPending(items);
  assert.deepEqual(out.map((x) => x.id), ["high", "mid-early", "mid-late", "low"]);
});

test("renderDigest variability: 1 pending → 1 row", () => {
  const md = renderDigest([pending({ id: "A" })], { now: () => T0 });
  assert.ok(md.includes("Pending: 1"));
});

test("renderDigest variability: 10 pending → no overflow", () => {
  const items = Array.from({ length: 10 }, (_, i) => pending({ id: `X${i}` }));
  const md = renderDigest(items, { now: () => T0 });
  assert.ok(md.includes("Pending: 10"));
  assert.ok(!md.includes("additional pending items hidden"));
});

test("renderDigest variability: 100 pending → all in table, no overflow", () => {
  const items = Array.from({ length: 100 }, (_, i) => pending({ id: `X${i}` }));
  const md = renderDigest(items, { now: () => T0 });
  assert.ok(md.includes("Pending: 100"));
  assert.ok(!md.includes("additional pending items hidden"));
});

test("renderDigest adversarial: 150 pending → 100 in table + overflow note", () => {
  const items = Array.from({ length: 150 }, (_, i) => pending({ id: `X${i}` }));
  const md = renderDigest(items, { now: () => T0 });
  assert.ok(md.includes("Pending: 150"));
  assert.ok(md.includes("top 100 of 150"));
  assert.ok(md.includes("50 additional pending items hidden"));
});

test("renderDigest custom max=5 → 5 rows + overflow note", () => {
  const items = Array.from({ length: 20 }, (_, i) => pending({ id: `X${i}` }));
  const md = renderDigest(items, { max: 5, now: () => T0 });
  assert.ok(md.includes("top 5 of 20"));
  assert.ok(md.includes("15 additional pending items"));
});

test("renderDigest empty input → steady-state message", () => {
  const md = renderDigest([], { now: () => T0 });
  assert.ok(md.includes("steady state"));
});

test("renderDigest approve/reject CLI snippet present", () => {
  const md = renderDigest([pending()], { now: () => T0 });
  assert.ok(md.includes("auto-research-decision.mjs"));
});

test("renderDigest bypass marker (⚡) emitted only when bypassedRateLimit=true", () => {
  const items = [pending({ id: "A", bypassedRateLimit: true }), pending({ id: "B", bypassedRateLimit: false })];
  const md = renderDigest(items, { now: () => T0 });
  assert.ok(md.includes("⚡"));
});

test("renderDigest idempotent: same input → byte-identical output", () => {
  const items = [pending({ id: "B" }), pending({ id: "A" }), pending({ id: "C" })];
  assert.equal(renderDigest(items, { now: () => T0 }), renderDigest(items, { now: () => T0 }));
});

test("DEFAULT_MAX_ITEMS = 100", () => {
  assert.equal(DEFAULT_MAX_ITEMS, 100);
});
