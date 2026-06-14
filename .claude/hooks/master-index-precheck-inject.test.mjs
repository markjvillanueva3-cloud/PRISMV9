#!/usr/bin/env node
/**
 * master-index-precheck-inject.test.mjs — hermetic tests for the U-RAG-2
 * stage-2 lexical rerank wiring (RAG-UPGRADE-MS0).
 *
 * Focus: the exported `applyLexicalRerank` helper. The hook's `main()` reads
 * disk (system-graph.json + CODE_SYSTEM_INDEX.json) so an end-to-end test
 * isn't hermetic — these cover the integration helper in isolation, which
 * IS the unit U-RAG-2 ships into this hook.
 *
 * Run: node --test .claude/hooks/master-index-precheck-inject.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { applyLexicalRerank } from "./master-index-precheck-inject.mjs";
import { DEFAULT_STATE_DIR, safeSessionId, promptHash } from "../../scripts/lib/inject-throttle.mjs";

test("applyLexicalRerank: non-array → []", () => {
  assert.deepEqual(applyLexicalRerank("q", null, 3), []);
  assert.deepEqual(applyLexicalRerank("q", undefined, 3), []);
  assert.deepEqual(applyLexicalRerank("q", "not-array", 3), []);
  assert.deepEqual(applyLexicalRerank("q", 42, 3), []);
});

test("applyLexicalRerank: empty list → []", () => {
  assert.deepEqual(applyLexicalRerank("q", [], 5), []);
});

test("applyLexicalRerank: single hit passes through (no rerank needed)", () => {
  const items = [{ label: "foo", layer: "L7", status: "built", wiki: [], memory: [] }];
  const out = applyLexicalRerank("anything", items, 3);
  assert.equal(out.length, 1);
  assert.equal(out[0].label, "foo");
  // single-hit short-circuit must NOT inject the synthesized `text` field.
  assert.equal(out[0].text, undefined);
});

test("applyLexicalRerank: narrows to topK + strips the synthesized `text` field", () => {
  const items = [
    { label: "alpha-hook",   layer: "L7", status: "built", wiki: ["arch-alpha"], memory: ["mem-alpha"] },
    { label: "beta-hook",    layer: "L7", status: "built", wiki: ["arch-beta"],  memory: [] },
    { label: "gamma-hook",   layer: "L7", status: "built", wiki: [],             memory: [] },
    { label: "delta-hook",   layer: "L8", status: "built", wiki: [],             memory: [] },
    { label: "epsilon-hook", layer: "L8", status: "built", wiki: [],             memory: [] },
  ];
  const out = applyLexicalRerank("alpha hook", items, 2);
  assert.equal(out.length, 2, "narrowed to topK");
  for (const h of out) {
    assert.equal(typeof h.label, "string");
    assert.equal(typeof h.layer, "string");
    assert.equal(typeof h.status, "string");
    assert.ok(Array.isArray(h.wiki));
    assert.ok(Array.isArray(h.memory));
    // The synthesized `text` scoring input MUST be stripped from the returned
    // shape — the renderer doesn't use it; leaking it bloats the inject.
    assert.equal(h.text, undefined, "text scoring field must be stripped");
  }
});

test("applyLexicalRerank: hits with missing wiki/memory arrays don't crash", () => {
  const items = [
    { label: "minimal-1", layer: "L7", status: "built" },
    { label: "minimal-2", layer: "L7", status: "built" },
  ];
  const out = applyLexicalRerank("test", items, 5);
  assert.ok(Array.isArray(out));
  assert.ok(out.length <= 2);
});

test("applyLexicalRerank: hit missing `label` doesn't crash (fallback to empty string)", () => {
  // Master-index hits should always carry `label`, but a malformed source
  // shouldn't take the inject path down — the helper must be tolerant.
  const items = [
    { layer: "L7", status: "built", wiki: ["w"], memory: [] },
    { label: "real-one", layer: "L7", status: "built", wiki: [], memory: [] },
  ];
  const out = applyLexicalRerank("test", items, 2);
  assert.ok(Array.isArray(out));
  // both candidates can survive; their labels (possibly "") are present
  for (const h of out) {
    assert.equal(typeof h.label, "string");
  }
});

test("applyLexicalRerank: topK=0 returns []", () => {
  const items = [{ label: "a" }, { label: "b" }];
  const out = applyLexicalRerank("q", items, 0);
  assert.deepEqual(out, []);
});

// --- U-MASTER-INDEX-THROTTLE (2026-06-10 slot:bravo) ---
// Subprocess integration: a /loop re-submits the IDENTICAL prompt every tick;
// without a throttle the hook re-injects the same top-K block each tick. These
// spawn the real hook (it loads the live system-graph) and assert the 2nd
// identical inject is suppressed, the throttle state is stamped, and the
// PRISM_MASTER_INDEX_THROTTLE_MS=0 knob restores legacy always-inject.
const HOOK = "H:/prism/.claude/hooks/master-index-precheck-inject.mjs";
const NODE = process.execPath;

function runMI({ prompt, sessionId, env = {}, timeoutMs = 30000 }) {
  const r = spawnSync(NODE, [HOOK], {
    input: JSON.stringify({ prompt, session_id: sessionId }),
    encoding: "utf8",
    env: { ...process.env, ...env },
    timeout: timeoutMs,
  });
  return { status: r.status, stdout: r.stdout || "" };
}

function throttleStatePath(sessionId) {
  return join(DEFAULT_STATE_DIR, `${safeSessionId(sessionId)}.json`);
}

test("throttle: 1st inject stamps per-session state + suppresses an identical 2nd within TTL", () => {
  const S = "test-mi-throttle-suppress";
  const P = "master index precheck throttle wiring probe alpha bravo";
  const statePath = throttleStatePath(S);
  try { if (existsSync(statePath)) unlinkSync(statePath); } catch { /* clean slate */ }
  try {
    // Large TTL so a slow graph-load between the two spawns can never widen past
    // the window and flake the suppression assertion.
    const env = { PRISM_MASTER_INDEX_THROTTLE_MS: "600000" };
    const r1 = runMI({ prompt: P, sessionId: S, env });
    assert.equal(r1.status, 0);
    // Wiring is LIVE: the throttle stamped this session's prompt hash. Proves the
    // throttle ran regardless of whether the graph produced hits this turn.
    assert.ok(existsSync(statePath), "throttle state file written on 1st inject");
    const st = JSON.parse(readFileSync(statePath, "utf8"));
    assert.equal(st.hash, promptHash(P), "stamped hash matches the prompt");
    // Spawn 2 (same session+prompt, within TTL): MUST be suppressed -> empty.
    const r2 = runMI({ prompt: P, sessionId: S, env });
    assert.equal(r2.status, 0);
    assert.equal(r2.stdout.trim(), "", "identical 2nd inject is throttled (no re-emit)");
  } finally {
    try { if (existsSync(statePath)) unlinkSync(statePath); } catch { /* swallow */ }
  }
});

test("throttle: PRISM_MASTER_INDEX_THROTTLE_MS=0 disables throttle (2nd inject identical to 1st)", () => {
  const S = "test-mi-throttle-disabled";
  const P = "master index precheck throttle knob-off probe charlie delta";
  const statePath = throttleStatePath(S);
  try { if (existsSync(statePath)) unlinkSync(statePath); } catch { /* clean slate */ }
  try {
    const env = { PRISM_MASTER_INDEX_THROTTLE_MS: "0" };
    const r1 = runMI({ prompt: P, sessionId: S, env });
    const r2 = runMI({ prompt: P, sessionId: S, env });
    assert.equal(r1.status, 0);
    assert.equal(r2.status, 0);
    // ttl=0 -> shouldThrottleInject returns false BEFORE writing state, so no
    // suppression: identical inputs produce identical output on both ticks.
    assert.equal(r2.stdout, r1.stdout, "ttl=0 never throttles -> 2nd inject identical to 1st");
    assert.ok(!existsSync(statePath), "ttl=0 writes NO throttle state");
  } finally {
    try { if (existsSync(statePath)) unlinkSync(statePath); } catch { /* swallow */ }
  }
});
