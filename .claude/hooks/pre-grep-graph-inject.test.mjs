import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { renderInject } from "./pre-grep-graph-inject.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HOOK = path.join(__dirname, "pre-grep-graph-inject.mjs");

// ── renderInject — pure rendering ──────────────────────────────────────────

test("renderInject: empty hits → null (no inject)", () => {
  assert.equal(renderInject(["foo"], []), null);
});

test("renderInject: non-array hits → null", () => {
  assert.equal(renderInject(["foo"], null), null);
  assert.equal(renderInject(["foo"], undefined), null);
});

test("renderInject: hits → a block with the key string and node lines", () => {
  const out = renderInject(["graph", "lock"], [
    { layer: "L6", status: "built", label: "system-graph-write-lock", info: "the lock" },
    { layer: "L8", status: "built", id: "node-2", info: "" },
  ]);
  assert.match(out, /Pre-Grep graph context — 2 node\(s\) already match "graph, lock"/);
  assert.match(out, /system-graph-write-lock/);
  assert.match(out, /\[L6\/built\]/);
  assert.match(out, /Disable: PRISM_PRE_GREP_GRAPH_INJECT=0/);
});

test("renderInject: caps at 5 hits even if more are passed", () => {
  const many = Array.from({ length: 12 }, (_, i) => ({ layer: "L6", id: `n${i}`, info: "" }));
  const out = renderInject(["x"], many);
  const bullets = (out.match(/^  • /gm) || []).length;
  assert.equal(bullets, 5, "must render at most 5 node lines");
});

test("renderInject: oversize block is truncated to the byte cap", () => {
  const huge = Array.from({ length: 5 }, (_, i) => ({
    layer: "L6", id: `n${i}`, label: "x".repeat(400), info: "y".repeat(400),
  }));
  const out = renderInject(["x"], huge);
  assert.ok(out.length <= 1501, `block must be byte-capped; got ${out.length}`);
  assert.ok(out.endsWith("…"), "a truncated block must carry the ellipsis marker");
});

test("renderInject: missing keys falls back to 'your pattern'", () => {
  const out = renderInject([], [{ layer: "L6", id: "n1", info: "" }]);
  assert.match(out, /already match "your pattern"/);
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
    { tool_name: "Grep", tool_input: { pattern: "cuttingForce" } },
    { PRISM_PRE_GREP_GRAPH_INJECT: "0" },
  );
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.equal(out.continue, true);
  assert.equal(out.hookSpecificOutput, undefined, "disabled → no graph context");
});

test("hook E2E: missing pattern → {continue:true} (no throw, no inject)", () => {
  const r = runHook({ tool_name: "Grep", tool_input: {} }, {});
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.equal(out.continue, true);
  assert.equal(out.hookSpecificOutput, undefined);
});

test("hook E2E: an all-regex-metachar pattern → {continue:true} (deriveGraphKeys gates it out)", () => {
  const r = runHook({ tool_name: "Grep", tool_input: { pattern: "^$.*+()[]{}|?" } }, {});
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.equal(out.continue, true);
  assert.equal(out.hookSpecificOutput, undefined, "no usable keys → no search → no inject");
});

test("hook E2E: a high-certainty query DOES fire an injection (regression guard for the runMasterIndexSearch .hits contract)", () => {
  // "kienzle" + "cutting" are both non-stopword tokens overwhelmingly present
  // in PRISM's 258K-node graph (dozens of KienzleForceModel / cutting-force
  // nodes). This MUST fire an injection — if it returns null, either the
  // hook's `result.hits` access regressed (the lib renamed the field) or the
  // graph/sidecar is broken; both are real failures the silent-no-op `if`
  // guard in a shape-only test would hide.
  const r = runHook({ tool_name: "Grep", tool_input: { pattern: "kienzle cutting" } }, {});
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.equal(out.continue, true);
  assert.ok(
    out.hookSpecificOutput,
    "a high-certainty 'kienzle cutting' query MUST fire a graph-context injection — "
    + "null here means the runMasterIndexSearch .hits contract regressed or the graph is broken",
  );
  assert.equal(out.hookSpecificOutput.hookEventName, "PreToolUse");
  assert.match(out.hookSpecificOutput.additionalContext, /Pre-Grep graph context/);
});

// ── exact-match collapse (U-SV-NAV-INJECT-GREP-WRITE) ───────────────────────

test("renderInject: exact match collapses to the EXACT MATCH banner (not the multi-hit block)", () => {
  const out = renderInject(["kienzle"], [{ label: "kienzle", status: "built", layer: "L7", info: "force model" }]);
  assert.match(out, /Pre-Grep EXACT MATCH/);
  assert.match(out, /`kienzle`/);
  assert.doesNotMatch(out, /already match/, "exact match must collapse, not render the multi-hit block");
});

test("renderInject: exact match WITH a resolver emits the repo-root-relative Read line", () => {
  const resolve = (l) => (l === "kienzle"
    ? { path: "src/engines/KienzleEngine.ts", repoPath: "mcp-server/src/engines/KienzleEngine.ts", type: "engine" }
    : null);
  const out = renderInject(["kienzle"], [{ label: "kienzle", status: "built", layer: "L7" }], resolve);
  assert.match(out, /Read mcp-server\/src\/engines\/KienzleEngine\.ts/);
  assert.doesNotMatch(out, /Read src\//, "never the bare src/ dup");
});

test("renderInject: exact match WITHOUT a resolver omits the nav Read line", () => {
  const out = renderInject(["kienzle"], [{ label: "kienzle", status: "built", layer: "L7" }]);
  assert.match(out, /EXACT MATCH/);
  assert.doesNotMatch(out, /→ `Read/, "no nav path line without a resolver");
});

test("renderInject: a ghost-status exact label does NOT collapse (stays multi-hit)", () => {
  const out = renderInject(["foo"], [{ label: "foo", status: "ghost.unwired-engine", layer: "L8", info: "" }]);
  assert.doesNotMatch(out, /EXACT MATCH/, "ghost node must not be presented as the definitive answer");
  assert.match(out, /already match/);
});
