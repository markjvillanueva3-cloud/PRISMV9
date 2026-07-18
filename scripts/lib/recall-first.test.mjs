// scripts/lib/recall-first.test.mjs — U-GCF-RECALL-FIRST hermetic test suite (node:test).
// Run: node --test scripts/lib/recall-first.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  classifyRecallable,
  estimateSavings,
  shouldNudgeRecall,
  renderRecallNudge,
  recordRecallSavings,
  recallSavingsSummary,
  recallFirst,
  CHARS_PER_TOKEN,
  DEFAULT_RECALL_TOKENS,
  DEFAULT_MIN_BYTES,
} from "./recall-first.mjs";

// ── classifyRecallable ────────────────────────────────────────────────────────
test("classifyRecallable: galaxy-brain (engines/<g>/MEMORY.md) + galaxy name extraction", () => {
  const c = classifyRecallable("mcp-server/src/engines/wedm/MEMORY.md");
  assert.equal(c.recallable, true);
  assert.equal(c.surface, "galaxy-brain");
  assert.equal(c.galaxy, "wedm");
});

test("classifyRecallable: obsidian-memory — relative, absolute, and C: source dir all match", () => {
  for (const p of [
    "knowledge/memories/reference/reference_x.md",
    "H:/prism/knowledge/memories/feedback/f.md",
    "C:/Users/wompu/.claude/projects/H--prism/memory/reference_y.md",
  ]) {
    assert.equal(classifyRecallable(p).surface, "obsidian-memory", `${p} should be obsidian-memory`);
  }
});

test("classifyRecallable: master-brain (projects/.../memory/MEMORY.md)", () => {
  assert.equal(classifyRecallable("C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md").surface, "master-brain");
});

// FAIL-ON-REVERT: the wiki surface must NOT be recallable here — wiki-recall-on-read / wiki-read-offload
// own it. If this regressed, recall-first would double-cover wiki (the dedup boundary).
test("classifyRecallable: wiki paths are NOT recallable (deferred to the wiki hooks — dedup boundary)", () => {
  const c = classifyRecallable("H:/prism/knowledge/wiki/architecture/foo.md");
  assert.equal(c.recallable, false);
  assert.equal(c.surface, "wiki");
});

test("classifyRecallable: non-memory file / empty / null → not recallable", () => {
  assert.equal(classifyRecallable("scripts/lib/x.mjs").recallable, false);
  assert.equal(classifyRecallable("").recallable, false);
  assert.equal(classifyRecallable(null).recallable, false);
});

// FAIL-ON-REVERT for the leading-anchor fix: a path STARTING with knowledge/memories (no leading slash) must match.
test("classifyRecallable: a relative path starting with 'knowledge/memories' matches (anchor fix)", () => {
  assert.equal(classifyRecallable("knowledge/memories/x.md").surface, "obsidian-memory");
});

// ── estimateSavings ───────────────────────────────────────────────────────────
test("estimateSavings: readTokens=bytes/CHARS_PER_TOKEN, recall default, savings = read - recall", () => {
  const e = estimateSavings(8000);
  assert.equal(e.readTokens, Math.round(8000 / CHARS_PER_TOKEN));
  assert.equal(e.recallTokens, DEFAULT_RECALL_TOKENS);
  assert.equal(e.savings, e.readTokens - e.recallTokens);
});

test("estimateSavings: tiny file → negative savings; custom params honored; bad bytes → 0 read", () => {
  assert.ok(estimateSavings(400).savings < 0);
  assert.equal(estimateSavings(4000, { recallTokens: 100, charsPerToken: 10 }).readTokens, 400);
  assert.equal(estimateSavings(NaN).readTokens, 0);
});

// ── shouldNudgeRecall ───────────────────────────────────────────────────────────
test("shouldNudgeRecall: large recallable file → nudge with positive savings", () => {
  const d = shouldNudgeRecall("mcp-server/src/engines/quoting/MEMORY.md", 87177);
  assert.equal(d.nudge, true);
  assert.equal(d.surface, "galaxy-brain");
  assert.ok(d.savings > 0);
  assert.equal(d.reason, "nudge");
});

test("shouldNudgeRecall: recallable but below min-bytes → no nudge", () => {
  const d = shouldNudgeRecall("knowledge/memories/x.md", 1000);
  assert.equal(d.nudge, false);
  assert.equal(d.reason, "below-min-bytes");
});

test("shouldNudgeRecall: not-recallable (wiki/code) → no nudge", () => {
  assert.equal(shouldNudgeRecall("knowledge/wiki/x.md", 99999).reason, "not-recallable");
  assert.equal(shouldNudgeRecall("scripts/x.mjs", 99999).nudge, false);
});

test("shouldNudgeRecall: recallable + above min-bytes but savings<=0 (low minBytes) → no-savings", () => {
  // minBytes 100 lets a 200-byte file through size-gate; 200/4=50 read < 300 recall → savings negative
  const d = shouldNudgeRecall("knowledge/memories/x.md", 200, { minBytes: 100 });
  assert.equal(d.nudge, false);
  assert.equal(d.reason, "no-savings");
});

// ── renderRecallNudge ───────────────────────────────────────────────────────────
test("renderRecallNudge: text on nudge (surface + savings + semantic_search), '' when not", () => {
  const d = shouldNudgeRecall("mcp-server/src/engines/wedm/MEMORY.md", 9000);
  const txt = renderRecallNudge(d, "wedm/MEMORY.md");
  assert.match(txt, /recall-first/);
  assert.match(txt, /galaxy-brain/);
  assert.match(txt, /semantic_search/);
  assert.match(txt, new RegExp(`~${d.savings} tok`));
  assert.equal(renderRecallNudge({ nudge: false }), "");
});

// ── recordRecallSavings (metric, single-writer) ──────────────────────────────────
test("recordRecallSavings: writes OWN sidecar (cumulative + bySurface); SINGLE-WRITER", () => {
  const writes = {};
  const d = shouldNudgeRecall("mcp-server/src/engines/wedm/MEMORY.md", 9000);
  const r1 = recordRecallSavings(d, { savingsPath: "/s.json", readImpl: () => null, writeImpl: (f, x) => { writes[f] = x; } });
  assert.equal(r1.ok, true);
  assert.equal(r1.totalNudges, 1);
  // accumulate a 2nd
  const r2 = recordRecallSavings(d, { savingsPath: "/s.json", readImpl: () => writes["/s.json"], writeImpl: (f, x) => { writes[f] = x; } });
  assert.equal(r2.totalNudges, 2);
  const state = JSON.parse(writes["/s.json"]);
  assert.equal(state.schemaVersion, "1.0.0");
  assert.equal(state.bySurface["galaxy-brain"].nudges, 2);
  assert.equal(state.totalEstSavingsTokens, d.savings * 2);
  // SINGLE-WRITER: only the savings sidecar written, nothing else
  assert.deepEqual(Object.keys(writes), ["/s.json"]);
  assert.ok(!Object.keys(writes).some((p) => /offload-stats|wiki-recall-counts/.test(p)));
});

test("recordRecallSavings: no-nudge decision → no-op; write-error fail-soft", () => {
  assert.equal(recordRecallSavings({ nudge: false }, {}).ok, false);
  const d = shouldNudgeRecall("knowledge/memories/big.md", 9000);
  const r = recordRecallSavings(d, { savingsPath: "/s.json", readImpl: () => null, writeImpl: () => { throw new Error("disk"); } });
  assert.equal(r.ok, false);
  assert.equal(r.reason, "write-error");
});

// HARDENING fail-on-revert: a corrupt/peer-poked prior sidecar (string totals, malformed bySurface, array)
// must coerce to numbers — never propagate NaN/string garbage into the metric.
test("recordRecallSavings: garbage-typed prior sidecar coerces cleanly (no NaN propagation)", () => {
  const writes = {};
  const d = shouldNudgeRecall("mcp-server/src/engines/wedm/MEMORY.md", 9000);
  const garbage = JSON.stringify({ totalNudges: "five", totalEstSavingsTokens: "lots", bySurface: { "galaxy-brain": { weird: true } } });
  const r = recordRecallSavings(d, { savingsPath: "/s.json", readImpl: () => garbage, writeImpl: (f, x) => { writes[f] = x; } });
  assert.equal(r.ok, true);
  const st = JSON.parse(writes["/s.json"]);
  assert.equal(st.totalNudges, 1);                          // "five" → 0 then +1
  assert.equal(st.totalEstSavingsTokens, d.savings);        // "lots" → 0 then + savings
  assert.equal(st.bySurface["galaxy-brain"].nudges, 1);     // malformed entry → 0 then +1
  assert.ok(Number.isFinite(st.bySurface["galaxy-brain"].estSavingsTokens)); // no NaN
});

test("recallSavingsSummary: reads cumulative; fail-soft → zeros", () => {
  const j = JSON.stringify({ totalNudges: 5, totalEstSavingsTokens: 12345, bySurface: { "galaxy-brain": { nudges: 5, estSavingsTokens: 12345 } } });
  const s = recallSavingsSummary({ readImpl: () => j });
  assert.equal(s.totalNudges, 5);
  assert.equal(s.totalEstSavingsTokens, 12345);
  assert.deepEqual(recallSavingsSummary({ readImpl: () => null }), { totalNudges: 0, totalEstSavingsTokens: 0, bySurface: {} });
});

// ── recallFirst orchestrator ──────────────────────────────────────────────────
test("recallFirst: stats bytes via injected statImpl, returns decision + text", () => {
  const r = recallFirst("mcp-server/src/engines/wedm/MEMORY.md", { statImpl: () => ({ size: 9000 }) });
  assert.equal(r.nudge, true);
  assert.match(r.text, /recall-first/);
});

test("recallFirst: disabled knob → no-op; stat failure → no nudge (fail-soft, never throws)", () => {
  const prev = process.env.PRISM_GCF_RECALL_DISABLE;
  process.env.PRISM_GCF_RECALL_DISABLE = "1";
  try {
    const r = recallFirst("mcp-server/src/engines/wedm/MEMORY.md", { statImpl: () => ({ size: 9000 }) });
    assert.equal(r.nudge, false);
    assert.equal(r.reason, "disabled");
  } finally { if (prev === undefined) delete process.env.PRISM_GCF_RECALL_DISABLE; else process.env.PRISM_GCF_RECALL_DISABLE = prev; }
  assert.doesNotThrow(() => recallFirst("x.md", { statImpl: () => { throw new Error("ENOENT"); } }));
});

// HARDENING fail-on-revert: env floor "0" must mean NO floor (the old `parseInt||DEFAULT` treated 0 as falsy → 4096).
test("recallFirst: PRISM_GCF_RECALL_MIN_BYTES=0 = no floor (a 2KB memory file nudges)", () => {
  const prev = process.env.PRISM_GCF_RECALL_MIN_BYTES;
  process.env.PRISM_GCF_RECALL_MIN_BYTES = "0";
  try {
    const r = recallFirst("knowledge/memories/x.md", { statImpl: () => ({ size: 2000 }) }); // 2000/4=500 read - 300 = +200
    assert.equal(r.nudge, true, "floor=0 lets a 2KB file through the size gate (savings still positive)");
  } finally { if (prev === undefined) delete process.env.PRISM_GCF_RECALL_MIN_BYTES; else process.env.PRISM_GCF_RECALL_MIN_BYTES = prev; }
});

// ── LIVE soft integration ──────────────────────────────────────────────────────
test("LIVE: a real galaxy MEMORY.md → recall nudge with positive savings", () => {
  const r = recallFirst("mcp-server/src/engines/quoting/MEMORY.md");
  // quoting is the 90 KB brain — if present, it must nudge with big savings; if absent (stat fails), no throw
  if (r.bytes && r.bytes >= DEFAULT_MIN_BYTES) {
    assert.equal(r.nudge, true);
    assert.ok(r.savings > 1000, `expected big savings on a large brain, got ${r.savings}`);
  } else { console.log("  (skipped — quoting brain not present / small)"); }
});
