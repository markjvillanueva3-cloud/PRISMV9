/**
 * Tests for ai-synergy-awareness-inject.mjs (AI-SYNERGY-AUDIT-MS0/U-AISYN-AWARENESS).
 * Pure-function reference-value tests + a subprocess fail-soft smoke. Run:
 *   node --test .claude/hooks/__tests__/ai-synergy-awareness-inject.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveSlot, renderBlock } from "../ai-synergy-awareness-inject.mjs";
import { galaxyForSlot } from "../../../scripts/lib/slot-galaxy-map.mjs";

const HOOK = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "ai-synergy-awareness-inject.mjs");

const SLOTS = {
  slots: {
    charlie: { chatId: "claude-32c4ef87" },
    foxtrot: { chatId: "claude-aabbccdd" },
    november: { chatId: "claude-deadbeef" },
  },
};

const REPORT = {
  generatedAt: "2026-06-10T20:00:00.000Z",
  galaxies: [
    {
      galaxy: "quoting",
      score: 0.96,
      band: "strong",
      subScores: { discoverability: 1, ownsOrWiresAi: 1, vaultSynergy: 1, crossSubstrate: 0.8, awarenessSurface: 1 },
      gaps: [],
      recommendations: [],
    },
    {
      galaxy: "mill",
      score: 0.6,
      band: "partial",
      subScores: { discoverability: 1, ownsOrWiresAi: 0, vaultSynergy: 1, crossSubstrate: 0.8, awarenessSurface: 1 },
      gaps: [{ dimension: "ownsOrWiresAi" }],
      recommendations: ["Wire a reasoning bridge for mill."],
    },
  ],
};

// --- resolveSlot ---
test("resolveSlot: exact chatId match", () => {
  assert.equal(resolveSlot("claude-32c4ef87", SLOTS), "charlie");
});

test("resolveSlot: stable-id prefix match (sessionId starts with short chatId)", () => {
  assert.equal(resolveSlot("32c4ef87-567e-4db1-aef8-17e4186ddcf6", SLOTS), "charlie");
});

test("resolveSlot: FAILURE unknown session / null inputs -> null (no throw)", () => {
  assert.equal(resolveSlot("zzzzzzzz-no-match", SLOTS), null);
  assert.equal(resolveSlot(null, SLOTS), null);
  assert.equal(resolveSlot("x", null), null);
  assert.equal(resolveSlot("x", { slots: null }), null);
});

// --- renderBlock ---
test("renderBlock: happy path injects galaxy posture + rank + dims", () => {
  const b = renderBlock("charlie", "quoting", REPORT);
  assert.ok(b.includes("AI-synergy posture"));
  assert.ok(b.includes("quoting"));
  assert.ok(b.includes("slot:charlie"));
  assert.ok(b.includes("score **0.96**"));
  assert.ok(b.includes("fleet rank 1/2")); // quoting 0.96 > mill 0.6
  // R15 WIRE: the reasoning-bridge invocation is surfaced to the galaxy chat
  assert.ok(b.includes("galaxy-reasoning-bridge.mjs quoting"));
});

test("renderBlock: surfaces gaps + top recommendation for a partial galaxy", () => {
  const b = renderBlock("foxtrot", "mill", REPORT);
  assert.ok(b.includes("fleet rank 2/2"));
  assert.ok(b.includes("gaps: ownsOrWiresAi"));
  assert.ok(b.includes("next: Wire a reasoning bridge for mill."));
});

test("renderBlock: ADVERSARIAL galaxy absent from report -> null (no crash)", () => {
  assert.equal(renderBlock("x", "does-not-exist", REPORT), null);
  assert.equal(renderBlock("x", "mill", { galaxies: [] }), null);
});

// --- subprocess fail-soft smoke ---
function runHook(stdin, env = {}) {
  const r = spawnSync(process.execPath, [HOOK], {
    input: stdin,
    env: { ...process.env, ...env },
    encoding: "utf8",
    timeout: 10000,
  });
  return r;
}

test("hook: disable knob -> {continue:true}, no injection, exit 0", () => {
  const r = runHook('{"session_id":"32c4ef87-567e"}', { PRISM_AI_SYNERGY_AWARENESS_DISABLE: "1" });
  assert.equal(r.status, 0);
  const out = JSON.parse(r.stdout);
  assert.equal(out.continue, true);
  assert.equal(out.hookSpecificOutput, undefined);
});

test("hook: ADVERSARIAL malformed stdin -> {continue:true}, never throws", () => {
  const r = runHook("not json at all", { PRISM_AI_SYNERGY_AWARENESS_NO_REGEN: "1" });
  assert.equal(r.status, 0);
  const out = JSON.parse(r.stdout);
  assert.equal(out.continue, true);
});

test("hook: ADVERSARIAL unbound session -> silent skip {continue:true}", () => {
  const r = runHook('{"session_id":"nobody-home-zzzz"}', { PRISM_AI_SYNERGY_AWARENESS_NO_REGEN: "1" });
  assert.equal(r.status, 0);
  const out = JSON.parse(r.stdout);
  assert.equal(out.continue, true);
  assert.equal(out.hookSpecificOutput, undefined);
});

test("unmapped slots (november/yankee) -> null galaxy: the hook's `if(!galaxy) skip` contract", () => {
  // The hook does `galaxy = galaxyForSlot(slot); if (!galaxy) return ok();` so a bound
  // but unmapped slot must resolve to null (silent skip, never inject a wrong galaxy).
  assert.equal(galaxyForSlot("november"), null);
  assert.equal(galaxyForSlot("yankee"), null);
  assert.equal(galaxyForSlot("charlie"), "quoting");
});
