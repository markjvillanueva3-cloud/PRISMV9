// injection-dedup-fs.test.mjs (U-ALPHA-INJECT-DEDUP-FS)
// Real-behavior tests for the FS dedup wrapper using an in-memory fsImpl (no disk).
import { test } from "node:test";
import assert from "node:assert/strict";
import { dedupeOrMarker, CANONICAL_TTL_MS } from "./injection-dedup-fs.mjs";
import { hasLoneSurrogate } from "./safe-truncate.mjs";

// In-memory fs double: one virtual file.
function memFs(initial = {}) {
  const store = { ...initial };
  return {
    store,
    readFileSync: (p) => { if (!(p in store)) { const e = new Error("ENOENT"); e.code = "ENOENT"; throw e; } return store[p]; },
    writeFileSync: (p, c) => { store[p] = c; },
    mkdirSync: () => {},
  };
}
const opts = (over = {}) => ({ sessionId: "99297b90-aaaa", hookName: "test-hook", root: "R", now: 1000, fsImpl: memFs(), ...over });

test("first emit returns the full block AND records state", () => {
  const fs = memFs();
  const r = dedupeOrMarker("BLOCK-CONTENT", opts({ fsImpl: fs }));
  assert.equal(r, "BLOCK-CONTENT", "first emit returns full block");
  assert.ok(Object.keys(fs.store).length === 1, "sidecar written");
});

test("second identical emit within TTL returns a 1-line dedup marker", () => {
  const fs = memFs();
  const bigBlock = "FULL BLOCK CONTENT ".repeat(40); // realistic ~760B injector block
  const first = dedupeOrMarker(bigBlock, opts({ fsImpl: fs, now: 1000 }));
  const second = dedupeOrMarker(bigBlock, opts({ fsImpl: fs, now: 1000 + 60_000 })); // within 5-min TTL
  assert.equal(first, bigBlock, "first emit = full block");
  assert.ok(second.includes("dedup") && second.includes("[test-hook"), "2nd is the dedup marker naming the hook");
  assert.ok(!second.includes("FULL BLOCK CONTENT"), "marker does NOT contain the block body (token-save)");
  assert.ok(second.length < bigBlock.length, "marker is shorter than the block it replaced");
});

test("CHANGED content re-emits in full (different hash, not a dedup-hit)", () => {
  const fs = memFs();
  dedupeOrMarker("V1", opts({ fsImpl: fs, now: 1000 }));
  const r = dedupeOrMarker("V2-different", opts({ fsImpl: fs, now: 1000 + 1000 }));
  assert.equal(r, "V2-different", "changed block re-emits full");
});

test("TTL expiry re-emits in full", () => {
  const fs = memFs();
  dedupeOrMarker("X", opts({ fsImpl: fs, now: 1000 }));
  const r = dedupeOrMarker("X", opts({ fsImpl: fs, now: 1000 + CANONICAL_TTL_MS + 1 }));
  assert.equal(r, "X", "after TTL the block re-emits");
});

test("disable knob -> always full block, no sidecar touch", () => {
  const fs = memFs();
  const r1 = dedupeOrMarker("B", opts({ fsImpl: fs, env: { PRISM_INJECTION_DEDUP_DISABLE: "1" } }));
  const r2 = dedupeOrMarker("B", opts({ fsImpl: fs, env: { PRISM_INJECTION_DEDUP_DISABLE: "1" } }));
  assert.equal(r1, "B"); assert.equal(r2, "B");
  assert.equal(Object.keys(fs.store).length, 0, "no sidecar write when disabled");
});

test("fail-soft: missing sessionId / empty block / read-throw -> returns block (pre-dedup behavior)", () => {
  assert.equal(dedupeOrMarker("B", opts({ sessionId: "" })), "B", "no session -> emit");
  assert.equal(dedupeOrMarker("", opts()), "", "empty block -> passthrough");
  assert.equal(dedupeOrMarker(null, opts()), null, "null block -> passthrough");
  // writeFileSync throws -> still emits the block (fail-soft)
  const throwFs = { readFileSync: () => { throw new Error("x"); }, writeFileSync: () => { throw new Error("y"); }, mkdirSync: () => {} };
  assert.equal(dedupeOrMarker("B", opts({ fsImpl: throwFs })), "B", "write-throw still emits");
});

test("adversarial: two different sessions do NOT cross-dedup (hookTag namespaced by sid)", () => {
  const fs = memFs();
  const a = dedupeOrMarker("SHARED", opts({ fsImpl: fs, sessionId: "aaaa1111", now: 1000 }));
  const b = dedupeOrMarker("SHARED", opts({ fsImpl: fs, sessionId: "bbbb2222", now: 1000 }));
  assert.equal(a, "SHARED", "session A first-emit");
  assert.equal(b, "SHARED", "session B first-emit (NOT deduped against A)");
});

// U-FLEET-SURROGATE-CHOKEPOINT (slot:alpha 2026-06-11): dedupeOrMarker is the shared emit path for 28
// hooks. A lone UTF-16 surrogate (left by an upstream naive str.slice(0,N) mid-emoji) in the emitted
// block makes the Anthropic API 400 the whole request body. The chokepoint must strip it on EVERY path.
test("surrogate-chokepoint: a lone high surrogate in the block is stripped before emit", () => {
  const poisoned = "before \uD83D after"; // lone high surrogate (no following low half)
  assert.ok(hasLoneSurrogate(poisoned), "fixture must actually carry a lone surrogate");
  const r = dedupeOrMarker(poisoned, opts());
  assert.ok(!hasLoneSurrogate(r), "emitted block must have NO lone surrogate (would 400 the API)");
  assert.ok(r.startsWith("before ") && r.endsWith(" after"), "surrounding content preserved");
});

test("surrogate-chokepoint: a lone LOW surrogate is also stripped", () => {
  const poisoned = "x\uDC00y"; // lone low surrogate (no preceding high half)
  assert.ok(hasLoneSurrogate(poisoned));
  assert.ok(!hasLoneSurrogate(dedupeOrMarker(poisoned, opts())));
});

test("surrogate-chokepoint: a WELL-FORMED emoji (paired surrogates) is preserved byte-identical", () => {
  const clean = "ok 🚀 rocket"; // U+1F680, a valid surrogate PAIR -- must NOT be touched
  assert.ok(!hasLoneSurrogate(clean));
  const r = dedupeOrMarker(clean, opts());
  assert.equal(r, clean, "valid emoji must round-trip unchanged (no false strip)");
});

test("surrogate-chokepoint: sanitize applies EVEN when dedup is disabled (safety is unconditional)", () => {
  const r = dedupeOrMarker("p\uD83Dq", opts({ env: { PRISM_INJECTION_DEDUP_DISABLE: "1" } }));
  assert.ok(!hasLoneSurrogate(r), "DISABLE must skip dedup but NOT the surrogate guard");
});

test("surrogate-chokepoint: dedup key is stable across the SAME poisoned block (hash on cleaned content)", () => {
  const fs = memFs();
  const first = dedupeOrMarker("z\uD83Dz", opts({ fsImpl: fs, now: 1000 }));
  const second = dedupeOrMarker("z\uD83Dz", opts({ fsImpl: fs, now: 2000 }));
  assert.ok(!hasLoneSurrogate(first), "first emit returns the sanitized block");
  assert.notEqual(second, first, "2nd identical poisoned block must NOT re-emit the full block");
  assert.ok(second.includes("dedup"), "2nd identical poisoned block dedups to the marker (stable hash on cleaned content)");
});
