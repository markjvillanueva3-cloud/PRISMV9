/**
 * pre-read-graph-inject.test.mjs
 *
 * Coverage for PRISM-SEARCH-MS0/U-PSM01, refactored under
 * GRAPH-OCTOPUS-AUTOWIRE-MS0/U-GO-A5 onto the shared graph-key-derive lib.
 *
 * U-GO-A5 replaced the bespoke string-returning deriveQueryKey() with the
 * shared deriveGraphKeys({tool:"read"}) (array-returning, lowercasing). The
 * old deriveQueryKey unit tests are therefore gone — key derivation is now
 * tested once, in graph-key-derive.test.mjs (the single source of truth).
 * This file covers what is unique to THIS hook: renderInject rendering and
 * the end-to-end fail-open / inject behavior, mirroring the three sibling
 * hook tests (pre-grep / pre-write / pre-bash).
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { renderInject } from "./pre-read-graph-inject.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HOOK = path.join(__dirname, "pre-read-graph-inject.mjs");

// ── renderInject — pure rendering ──────────────────────────────────────────

test("renderInject: empty hits → null (no inject)", () => {
  assert.equal(renderInject(["foo"], []), null);
});

test("renderInject: non-array hits → null", () => {
  assert.equal(renderInject(["foo"], null), null);
  assert.equal(renderInject(["foo"], undefined), null);
  assert.equal(renderInject(["foo"], { a: 1 }), null);
});

test("renderInject: hits → a block with the joined key string and node lines", () => {
  const out = renderInject(["kienzle", "force"], [
    { layer: "L7", status: "built", label: "KienzleForceEngine", info: "Computes cutting force" },
    { layer: "L10", status: "wiki", id: "wiki:kienzle-physics", info: "" },
  ]);
  assert.match(out, /Pre-Read graph context — top-2 hits for "kienzle, force"/);
  assert.match(out, /KienzleForceEngine/);
  assert.match(out, /\[L7\/built\]/);
  assert.match(out, /Computes cutting force/);
  assert.match(out, /Disable: PRISM_PRE_READ_GRAPH_INJECT=0/);
});

test("renderInject: caps at 5 hits even if more are passed", () => {
  const many = Array.from({ length: 12 }, (_, i) => ({ layer: "L7", id: `n${i}`, info: "" }));
  const out = renderInject(["x"], many);
  const bullets = (out.match(/^  • /gm) || []).length;
  assert.equal(bullets, 5, "must render at most 5 node lines");
});

test("renderInject: oversize block is truncated to the byte cap", () => {
  const huge = Array.from({ length: 5 }, (_, i) => ({
    layer: "L7", id: `n${i}`, label: "x".repeat(400), info: "y".repeat(400),
  }));
  const out = renderInject(["x"], huge);
  assert.ok(out.length <= 1501, `block must be byte-capped; got ${out.length}`);
  assert.ok(out.endsWith("…"), "a truncated block must carry the ellipsis marker");
});

test("renderInject: missing keys falls back to 'this file'", () => {
  const out = renderInject([], [{ layer: "L7", id: "n1", info: "" }]);
  assert.match(out, /top-1 hits for "this file"/);
});

test("renderInject: tolerates hits missing label/info/layer/status fields", () => {
  const out = renderInject(["partial"], [{ id: "only-id" }, { label: "only-label" }, {}]);
  assert.ok(out, "must still render with '?' placeholders");
  assert.match(out, /only-id|only-label|\?/);
});

// ── hook E2E — real subprocess ─────────────────────────────────────────────

function runHook(stdinObj, env) {
  return spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify(stdinObj), encoding: "utf8",
    env: { ...process.env, ...env },
  });
}

test("hook E2E: disable knob → plain {continue:true}, no inject", () => {
  const r = runHook(
    { tool_name: "Read", tool_input: { file_path: "H:/prism/scripts/system-viz-on-commit.mjs" } },
    { PRISM_PRE_READ_GRAPH_INJECT: "0" },
  );
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.equal(out.continue, true);
  assert.equal(out.hookSpecificOutput, undefined, "disabled → no graph context");
});

test("hook E2E: missing file_path → {continue:true} (no throw, no inject)", () => {
  const r = runHook({ tool_name: "Read", tool_input: {} }, {});
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.equal(out.continue, true);
  assert.equal(out.hookSpecificOutput, undefined);
});

test("hook E2E: a stem-less path (.gitignore) → {continue:true} (deriveGraphKeys gates it out)", () => {
  // ".gitignore" → basename → split(".")[0] is "" → deriveGraphKeys → [].
  const r = runHook({ tool_name: "Read", tool_input: { file_path: "H:/prism/.gitignore" } }, {});
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.equal(out.continue, true);
  assert.equal(out.hookSpecificOutput, undefined, "no usable keys → no search → no inject");
});

test("hook E2E: a real multi-token filename DOES fire an injection (regression guard for the shared-lib refactor)", () => {
  // "system-viz-on-commit.mjs" → deriveGraphKeys{read} → keys
  // ["viz","commit"] (STOPWORDS drops "system"/"on"). Those nodes exist in
  // PRISM's 258K-node graph. A null hookSpecificOutput here means the
  // U-GO-A5 deriveGraphKeys refactor or the .hits contract regressed.
  const r = runHook(
    { tool_name: "Read", tool_input: { file_path: "H:/prism/scripts/system-viz-on-commit.mjs" } },
    {},
  );
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.equal(out.continue, true);
  assert.ok(
    out.hookSpecificOutput,
    "a real multi-token filename MUST fire a graph-context injection — "
    + "null here means the U-GO-A5 shared-lib refactor regressed",
  );
  assert.equal(out.hookSpecificOutput.hookEventName, "PreToolUse");
  assert.match(out.hookSpecificOutput.additionalContext, /Pre-Read graph context/);
});
