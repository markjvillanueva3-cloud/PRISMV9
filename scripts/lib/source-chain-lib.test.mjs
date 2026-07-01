#!/usr/bin/env node
// Behavior + fail-soft + adversarial tests for source-chain-lib.mjs.
// Parity-with-the-TS-engine is asserted separately (vitest) in
// mcp-server/src/__tests__/sourceChainLibParity.test.ts. THIS file covers the
// hook-grade fail-soft contract (never throws) and the hit→citation helpers.
//
// Run: node --test scripts/lib/source-chain-lib.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  digest,
  renderMarkdown,
  decorate,
  normalizeCitation,
  citeGraphHit,
  citeTribalHit,
  citeMemoryHit,
  decorateHits,
  renderHitProvenance,
  CITATION_SOURCE_TYPES,
} from "./source-chain-lib.mjs";

const NOW = "2026-06-06T00:00:00.000Z";

// ---- pure primitives -------------------------------------------------------

test("digest: empty + deterministic + order-independent", () => {
  assert.equal(digest([]), digest([]));
  const a = [
    { path: "b", source_type: "memory", score: 0.5 },
    { path: "a", source_type: "wiki" },
  ];
  assert.equal(digest(a), digest([...a].reverse())); // sorted by path before hash
  assert.match(digest(a), /^[0-9a-f]{64}$/);
});

test("digest: null/garbage input does not throw", () => {
  assert.doesNotThrow(() => digest(null));
  assert.doesNotThrow(() => digest(undefined));
  assert.doesNotThrow(() => digest("not-an-array"));
});

test("renderMarkdown: empty sentinel + line shape", () => {
  assert.equal(renderMarkdown([]), "_(no sources cited)_");
  const md = renderMarkdown([{ path: "eng.mill", source_type: "engine", score: 0.913, used_for: "x" }]);
  assert.equal(md, "**Sources:**\n- [engine] `eng.mill` (score=0.913) — x");
});

test("renderMarkdown: non-finite score never emits NaN/Infinity garbage (fail-soft superset)", () => {
  assert.equal(renderMarkdown([{ path: "p", source_type: "engine", score: NaN }]), "**Sources:**\n- [engine] `p`");
  assert.equal(renderMarkdown([{ path: "p", source_type: "engine", score: Infinity }]), "**Sources:**\n- [engine] `p`");
});

// ---- normalizeCitation (fail-soft — the divergence from the throwing TS engine)

test("normalizeCitation: valid citation round-trips on parity-relevant fields, no unverified flag", () => {
  const c = normalizeCitation({ path: "eng.mill", source_type: "engine", score: 0.5, retrieved_at: NOW, used_for: "x" });
  assert.equal(c.path, "eng.mill");
  assert.equal(c.source_type, "engine");
  assert.equal(c.score, 0.5);
  assert.equal(c.used_for, "x");
  assert.equal(c.provenance, undefined);
});

test("normalizeCitation: missing path → (unknown) + unverified, never throws", () => {
  const c = normalizeCitation({ source_type: "engine" }, { now: NOW });
  assert.equal(c.path, "(unknown)");
  assert.equal(c.provenance, "unverified");
});

test("normalizeCitation: unmapped source_type → external + unverified", () => {
  const c = normalizeCitation({ path: "p", source_type: "bogus" }, { now: NOW });
  assert.equal(c.source_type, "external");
  assert.equal(c.provenance, "unverified");
});

test("normalizeCitation: score=0 kept (falsy-but-valid); out-of-range dropped", () => {
  assert.equal(normalizeCitation({ path: "p", source_type: "wiki", score: 0, retrieved_at: NOW }).score, 0);
  assert.equal(normalizeCitation({ path: "p", source_type: "wiki", score: 1, retrieved_at: NOW }).score, 1);
  assert.equal("score" in normalizeCitation({ path: "p", source_type: "wiki", score: 1.5, retrieved_at: NOW }), false);
  assert.equal("score" in normalizeCitation({ path: "p", source_type: "wiki", score: -0.1, retrieved_at: NOW }), false);
  assert.equal("score" in normalizeCitation({ path: "p", source_type: "wiki", score: NaN, retrieved_at: NOW }), false);
});

test("normalizeCitation: injects retrieved_at + clamps used_for/excerpt lengths", () => {
  const c = normalizeCitation({ path: "p", source_type: "wiki", used_for: "u".repeat(500), excerpt: "e".repeat(900) }, { now: NOW });
  assert.equal(c.retrieved_at, NOW);
  assert.equal(c.used_for.length, 200);
  assert.equal(c.excerpt.length, 500);
});

test("normalizeCitation: null/undefined input does not throw", () => {
  assert.doesNotThrow(() => normalizeCitation(null, { now: NOW }));
  assert.doesNotThrow(() => normalizeCitation(undefined, { now: NOW }));
});

// ---- decorate (fail-soft) --------------------------------------------------

test("decorate: invalid citations never throw, digest stable", () => {
  let out;
  assert.doesNotThrow(() => { out = decorate({ q: 1 }, [null, { source_type: "bogus" }, "garbage"]); });
  assert.equal(out.value.q, 1);
  assert.equal(out.sources.length, 3);
  assert.match(out.digest, /^[0-9a-f]{64}$/);
});

// ---- hit → citation helpers ------------------------------------------------

test("citeGraphHit: id prefix → source_type bucket", () => {
  assert.equal(citeGraphHit({ id: "eng.mill" }, { now: NOW }).source_type, "engine");
  assert.equal(citeGraphHit({ id: "disp.prism_calc" }, { now: NOW }).source_type, "dispatcher");
  assert.equal(citeGraphHit({ id: "wiki.foo" }, { now: NOW }).source_type, "wiki");
  assert.equal(citeGraphHit({ id: "memory_feedback.x" }, { now: NOW }).source_type, "memory");
  assert.equal(citeGraphHit({ id: "tribal-tip-1" }, { now: NOW }).source_type, "tribal");
  assert.equal(citeGraphHit({ id: "ghost.galaxy.wedm" }, { now: NOW }).source_type, "external");
  // Compound live namespaces (R12 live-validation catch): vault.wiki/vault.mem
  // must bucket as wiki/memory, not external.
  assert.equal(citeGraphHit({ id: "vault.wiki.architecture.actions.mill.x" }, { now: NOW }).source_type, "wiki");
  assert.equal(citeGraphHit({ id: "vault.mem.feedback.psn" }, { now: NOW }).source_type, "memory");
});

test("citeGraphHit: missing id → (unknown), never throws", () => {
  const c = citeGraphHit({}, { now: NOW });
  assert.equal(c.path, "(unknown)");
  assert.equal(c.source_type, "external");
});

test("citeTribalHit: prefers hit.path, falls back to id", () => {
  assert.equal(citeTribalHit({ path: "tribal/x.md", id: "t1" }, { now: NOW }).path, "tribal/x.md");
  assert.equal(citeTribalHit({ id: "t1" }, { now: NOW }).path, "t1");
  assert.equal(citeTribalHit({ id: "t1" }, { now: NOW }).source_type, "tribal");
});

test("citeMemoryHit: canonical namespace/slug path (no .md) — matches recordKey", () => {
  // The real hit shape from runMemoryIndexSearch carries `name` (the slug).
  const c = citeMemoryHit({ name: "feedback_psn_definition", fileName: "feedback_psn_definition.md", namespace: "feedback" }, { now: NOW });
  assert.equal(c.path, "feedback/feedback_psn_definition");
  assert.equal(c.source_type, "memory");
  // Fallback: no name, only fileName → strip .md.
  assert.equal(citeMemoryHit({ fileName: "reference_foo.md", namespace: "reference" }, { now: NOW }).path, "reference/reference_foo");
});

// ---- decorateHits (additive + non-mutating + fail-soft) --------------------

test("decorateHits: additive sourceChain, originals NOT mutated", () => {
  const hits = [{ id: "eng.mill", score: 5 }, { id: "disp.x", score: 3 }];
  const frozenCopy = JSON.parse(JSON.stringify(hits));
  const out = decorateHits(hits, "graph", { surface: "test", now: NOW });
  assert.equal(out[0].sourceChain.path, "eng.mill");
  assert.equal(out[0].score, 5); // original fields preserved on the copy
  assert.deepEqual(hits, frozenCopy); // originals untouched (no in-place mutation)
  assert.equal("sourceChain" in hits[0], false);
});

test("decorateHits: overwrites a caller-supplied (spoofed) sourceChain with the true one", () => {
  const hits = [{ id: "eng.mill", sourceChain: { path: "spoofed.trusted", source_type: "wiki" } }];
  const out = decorateHits(hits, "graph", { now: NOW });
  assert.equal(out[0].sourceChain.path, "eng.mill"); // true id wins
  assert.equal(out[0].sourceChain.source_type, "engine");
});

test("decorateHits: unknown kind → untouched; null/garbage hits handled", () => {
  const hits = [{ id: "eng.mill" }];
  assert.equal(decorateHits(hits, "nope"), hits);
  assert.doesNotThrow(() => decorateHits([null, 7, "x", { id: "eng.a" }], "graph", { now: NOW }));
  assert.deepEqual(decorateHits(null, "graph"), []);
});

test("decorateHits: PRISM_SOURCE_CHAIN_DISABLE=1 → pass-through", () => {
  const prev = process.env.PRISM_SOURCE_CHAIN_DISABLE;
  process.env.PRISM_SOURCE_CHAIN_DISABLE = "1";
  try {
    const hits = [{ id: "eng.mill" }];
    const out = decorateHits(hits, "graph", { now: NOW });
    assert.equal(out, hits);
    assert.equal("sourceChain" in out[0], false);
  } finally {
    if (prev === undefined) delete process.env.PRISM_SOURCE_CHAIN_DISABLE;
    else process.env.PRISM_SOURCE_CHAIN_DISABLE = prev;
  }
});

test("decorateHits: concurrent decoration of a shared source array does not corrupt", () => {
  const hits = [{ id: "eng.mill", score: 1 }];
  const a = decorateHits(hits, "graph", { surface: "A", now: NOW });
  const b = decorateHits(hits, "graph", { surface: "B", now: NOW });
  assert.equal(a[0].sourceChain.used_for, "A");
  assert.equal(b[0].sourceChain.used_for, "B"); // independent objects, no shared mutation
  assert.equal("sourceChain" in hits[0], false);
});

// ---- renderHitProvenance ---------------------------------------------------

test("renderHitProvenance: inline tag + unverified flag + empty when undecorated", () => {
  const [dec] = decorateHits([{ id: "eng.mill" }], "graph", { now: NOW });
  assert.equal(renderHitProvenance(dec), "[src: engine:eng.mill]");
  const [unv] = decorateHits([{}], "graph", { now: NOW });
  assert.equal(renderHitProvenance(unv), "[src: external:(unknown)?]"); // ? = unverified
  assert.equal(renderHitProvenance({ id: "eng.mill" }), ""); // no sourceChain → empty
});

test("CITATION_SOURCE_TYPES is the frozen 6-member enum", () => {
  assert.deepEqual([...CITATION_SOURCE_TYPES], ["wiki", "memory", "tribal", "engine", "dispatcher", "external"]);
  assert.equal(Object.isFrozen(CITATION_SOURCE_TYPES), true);
});
