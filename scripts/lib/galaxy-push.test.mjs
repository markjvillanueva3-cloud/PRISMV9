// scripts/lib/galaxy-push.test.mjs — U-GCF-PUSH hermetic test suite (node:test).
// Run: node --test scripts/lib/galaxy-push.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  compactLearning,
  matchTargets,
  renderPushPointer,
  buildPushQueue,
  loadLearnings,
  pushBuild,
  DEFAULT_PUSH_K,
} from "./galaxy-push.mjs";

// Synthetic knows-map: distinctive tokens route strongly; one shared token routes weakly. whoKnows-compatible.
const KM = {
  inverted: {
    discharge: [{ galaxy: "wedm", score: 5 }, { galaxy: "speed-feed", score: 2 }],
    cutting: [{ galaxy: "speed-feed", score: 4 }, { galaxy: "mill", score: 1 }],
    margin: [{ galaxy: "quoting", score: 4 }],
    physics: [{ galaxy: "wedm", score: 0.7 }, { galaxy: "speed-feed", score: 0.7 }, { galaxy: "quoting", score: 0.7 }],
  },
};

// ── compactLearning ──────────────────────────────────────────────────────────────
test("compactLearning: collapses whitespace, strips bold, caps length", () => {
  assert.equal(compactLearning("**Bold**   lead\n  here"), "Bold lead here");
  const long = "word ".repeat(60).trim();
  const out = compactLearning(long, 40);
  assert.ok(out.length <= 40 && out.endsWith("…"));
  assert.equal(compactLearning(""), "");
  assert.equal(compactLearning(null), "");
});

// ── matchTargets (selective fan-out core) ─────────────────────────────────────────
test("matchTargets: routes a learning to the OTHER galaxy whose domain matches, excludes source", () => {
  // speed-feed ships a learning about 'discharge' → relevant to wedm (not itself)
  const t = matchTargets({ galaxy: "speed-feed", topFact: "discharge spark" }, { knowsMap: KM, threshold: 1.5, k: 3 });
  assert.equal(t.length, 1);
  assert.equal(t[0].galaxy, "wedm");
  assert.ok(t[0].score >= 1.5);
});

// FAIL-ON-REVERT: the source galaxy must NEVER appear in its own push targets (no self-push).
test("matchTargets: NEVER includes the source galaxy (exclude-self)", () => {
  // wedm's learning about 'discharge' — wedm itself scores highest, must be excluded
  const t = matchTargets({ galaxy: "wedm", topFact: "discharge" }, { knowsMap: KM, threshold: 1.5, k: 5 });
  assert.ok(!t.some((x) => x.galaxy === "wedm"), "source must be excluded from its own targets");
  // only speed-feed (score 2) clears threshold among the non-source carriers
  assert.deepEqual(t.map((x) => x.galaxy), ["speed-feed"]);
});

test("matchTargets: threshold gates out weak matches (no broadcast on a ubiquitous token)", () => {
  // 'physics' is shared by 3 galaxies at 0.7 each — all below threshold 1.5 → no push
  const t = matchTargets({ galaxy: "mill", topFact: "physics" }, { knowsMap: KM, threshold: 1.5, k: 3 });
  assert.deepEqual(t, []);
});

test("matchTargets: caps at k (selective — never broadcasts to all)", () => {
  const big = { inverted: { widget: Array.from({ length: 20 }, (_, i) => ({ galaxy: `g${i}`, score: 9 })) } };
  const t = matchTargets({ galaxy: "src", topFact: "widget" }, { knowsMap: big, threshold: 1, k: 3 });
  assert.equal(t.length, 3, "fan-out capped at k — never a broadcast");
});

test("matchTargets: no knowsMap / no topFact → []", () => {
  assert.deepEqual(matchTargets({ galaxy: "a", topFact: "cutting" }, { knowsMap: null }), []);
  assert.deepEqual(matchTargets({ galaxy: "a", topFact: "" }, { knowsMap: KM }), []);
});

// FAIL-ON-REVERT: the distinctive-token filter (forward-map gated) strips generic prose tokens so they
// can't drive spurious cross-galaxy pushes. Without it, the generic 'reference' would route to wedm (noise).
test("matchTargets: distinctive-token filter — matches the domain topic, drops the generic prose token", () => {
  const km = {
    forward: { academy: [{ topic: "curriculum", score: 5 }, { topic: "course", score: 4 }] }, // distinctive (no 'reference')
    inverted: {
      reference: [{ galaxy: "wedm", score: 3 }, { galaxy: "database-expansion", score: 3 }], // generic prose token
      curriculum: [{ galaxy: "lima", score: 5 }], // distinctive — academy's real domain peer
    },
  };
  // academy's learning contains both the generic 'reference' and the distinctive 'curriculum'
  const t = matchTargets({ galaxy: "academy", topFact: "reference curriculum" }, { knowsMap: km, threshold: 1.5, k: 5 });
  assert.deepEqual(t.map((x) => x.galaxy), ["lima"], "must match only the distinctive forward-topic, not generic prose");
  assert.ok(!t.some((x) => x.galaxy === "wedm"), "generic 'reference' must NOT spuriously route to wedm");
});

// ── renderPushPointer ─────────────────────────────────────────────────────────────
test("renderPushPointer: one-line advisory pointer naming source + summary + matched topics", () => {
  const p = renderPushPointer("speed-feed", { topFact: "**Kienzle** cutting force model" }, { galaxy: "wedm", matchedTopics: ["cutting", "force"] });
  assert.match(p, /push ← speed-feed/);
  assert.match(p, /Kienzle cutting force model/);
  assert.match(p, /advisory match/);          // honest framing, not "relevant to your domain"
  assert.match(p, /topics: cutting, force/);
  assert.match(p, /speed-feed\.card\.md/);
  assert.ok(!/\[weak: 1 topic\]/.test(p), "a 2-topic match is NOT flagged weak");
});

test("renderPushPointer: a single-topic match is flagged [weak: 1 topic] (honest signal strength)", () => {
  const p = renderPushPointer("business", { topFact: "Refine CLAUDE.md across all sub-galaxies" }, { galaxy: "quoting", matchedTopics: ["across"] });
  assert.match(p, /\[weak: 1 topic\]/);
});

// ── buildPushQueue ────────────────────────────────────────────────────────────────
test("buildPushQueue: emits pushes + per-target inbox; selective (no-match source → no push)", () => {
  const learnings = [
    { galaxy: "speed-feed", topFact: "discharge spark", salience: 7 }, // → wedm
    { galaxy: "quoting", topFact: "margin pricing", salience: 6 },      // → (only quoting carries 'margin' → excluded self → no target)
    { galaxy: "mill", topFact: "physics", salience: 5 },               // → weak, below threshold → no push
  ];
  const q = buildPushQueue({ learnings, knowsMap: KM, threshold: 1.5, k: 3 });
  assert.equal(q.sourceCount, 1); // only speed-feed produced a push
  assert.equal(q.totalPushes, 1);
  assert.equal(q.pushes[0].source, "speed-feed");
  assert.equal(q.pushes[0].targets[0].galaxy, "wedm");
  // inbox: wedm received one push from speed-feed
  assert.ok(q.inbox.wedm && q.inbox.wedm[0].from === "speed-feed");
});

test("buildPushQueue: inbox sorted by score desc; skips invalid learnings", () => {
  const km = { inverted: { topic: [{ galaxy: "B", score: 5 }, { galaxy: "C", score: 3 }] } };
  const learnings = [
    { galaxy: "A", topFact: "topic", salience: 1 },
    null,                                  // skipped
    { galaxy: "X", topFact: "" },          // empty topFact skipped
    { galaxy: 42, topFact: "topic" },      // non-string galaxy skipped
  ];
  const q = buildPushQueue({ learnings, knowsMap: km, threshold: 1, k: 5 });
  assert.equal(q.sourceCount, 1);
  // both B and C receive from A; their own inbox entries sorted by score (single entry each here)
  assert.equal(q.pushes[0].targets.length, 2);
  assert.equal(q.pushes[0].targets[0].galaxy, "B"); // higher score first
});

// ── loadLearnings ─────────────────────────────────────────────────────────────────
test("loadLearnings: from MASTER-DIGEST ranked; filters no-topFact; fail-soft", () => {
  const digest = JSON.stringify({ ranked: [
    { galaxy: "a", topFact: "fact a", salience: 3 },
    { galaxy: "b", topFact: null },   // no delta → filtered
    { galaxy: "c", topFact: "fact c" },
  ] });
  const ls = loadLearnings({ readImpl: () => digest });
  assert.equal(ls.length, 2);
  assert.deepEqual(ls.map((l) => l.galaxy), ["a", "c"]);
  // fail-soft
  assert.deepEqual(loadLearnings({ readImpl: () => null }), []);
  assert.deepEqual(loadLearnings({ readImpl: () => "{bad" }), []);
});

// ── pushBuild orchestrator (hermetic) ─────────────────────────────────────────────
function hermeticPush(extra = {}) {
  const writes = {};
  const learnings = [{ galaxy: "speed-feed", topFact: "discharge spark", salience: 7 }];
  const res = pushBuild({
    roots: { cardsDir: "/cards" },
    queuePath: "/cards/PUSH-QUEUE.json",
    learnings,
    knowsMap: KM,
    threshold: 1.5,
    k: 3,
    writeImpl: (f, d) => { writes[f] = d; },
    now: () => 1735689600000,
    ...extra,
  });
  return { res, writes };
}

test("pushBuild: writes PUSH-QUEUE.json, returns written + counts", () => {
  const { res, writes } = hermeticPush();
  assert.equal(res.ok, true);
  assert.equal(res.written, true);
  assert.equal(res.totalPushes, 1);
  const json = JSON.parse(writes["/cards/PUSH-QUEUE.json"]);
  assert.equal(json.schemaVersion, "1.0.0");
  assert.equal(json.pushes[0].targets[0].galaxy, "wedm");
  assert.equal(json.k, 3);
});

test("pushBuild: SINGLE-WRITER GUARD — only PUSH-QUEUE.json, never INDEX.json / a MEMORY.md", () => {
  const { writes } = hermeticPush();
  const paths = Object.keys(writes);
  assert.deepEqual(paths, ["/cards/PUSH-QUEUE.json"]);
  for (const p of paths) {
    assert.ok(!/INDEX\.json$/i.test(p));
    assert.ok(!/MEMORY\.md$/i.test(p));
  }
});

test("pushBuild: no learnings → reason no-learnings (no broadcast, no write)", () => {
  const res = pushBuild({ learnings: [], knowsMap: KM, writeImpl: () => { throw new Error("must not write"); } });
  assert.equal(res.written, false);
  assert.equal(res.reason, "no-learnings");
});

test("pushBuild: no knows-map → reason no-knows-map", () => {
  const res = pushBuild({ learnings: [{ galaxy: "a", topFact: "x" }], knowsMap: null, readImpl: () => null, writeImpl: () => {} });
  assert.equal(res.written, false);
  assert.equal(res.reason, "no-knows-map");
});

test("pushBuild: disabled knob → no-op (no write)", () => {
  const prev = process.env.PRISM_GCF_PUSH_DISABLE;
  process.env.PRISM_GCF_PUSH_DISABLE = "1";
  try {
    const { res, writes } = hermeticPush({ writeImpl: () => { throw new Error("must not write"); } });
    assert.equal(res.disabled, true);
    assert.deepEqual(Object.keys(writes), []);
  } finally {
    if (prev === undefined) delete process.env.PRISM_GCF_PUSH_DISABLE; else process.env.PRISM_GCF_PUSH_DISABLE = prev;
  }
});

test("pushBuild: write-error fail-soft; null opts never throws", () => {
  const res = hermeticPush({ writeImpl: () => { throw new Error("disk full"); } }).res;
  assert.equal(res.ok, false);
  assert.equal(res.reason, "write-error");
  const prev = process.env.PRISM_GCF_PUSH_DISABLE;
  process.env.PRISM_GCF_PUSH_DISABLE = "1";
  try { assert.doesNotThrow(() => pushBuild(null)); assert.doesNotThrow(() => pushBuild("nope")); }
  finally { if (prev === undefined) delete process.env.PRISM_GCF_PUSH_DISABLE; else process.env.PRISM_GCF_PUSH_DISABLE = prev; }
});

// ── LIVE soft integration ──────────────────────────────────────────────────────────
test("LIVE: real federation artifacts → selective fan-out, NO source pushes to itself, K-capped", () => {
  let captured = null;
  const res = pushBuild({ writeImpl: (_f, d) => { captured = d; } }); // build from real artifacts, capture (don't touch the real sidecar)
  if (!res.ok || res.reason === "no-learnings" || res.reason === "no-knows-map") { console.log("  (skipped — no live artifacts)"); return; }
  const q = JSON.parse(captured);
  for (const p of q.pushes) {
    assert.ok(!p.targets.some((t) => t.galaxy === p.source), `${p.source} must not push to itself`);
    assert.ok(p.targets.length <= q.k, `fan-out from ${p.source} must be ≤ k (selective, no broadcast)`);
  }
});
