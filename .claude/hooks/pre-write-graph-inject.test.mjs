import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { renderInject } from "./pre-write-graph-inject.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HOOK = path.join(__dirname, "pre-write-graph-inject.mjs");

// ── renderInject — pure rendering ──────────────────────────────────────────

test("renderInject: empty hits → null (no inject)", () => {
  assert.equal(renderInject(["foo"], []), null);
});

test("renderInject: non-array hits → null", () => {
  assert.equal(renderInject(["foo"], null), null);
  assert.equal(renderInject(["foo"], undefined), null);
});

test("renderInject: hits → an advisory block with the key string and node lines", () => {
  const out = renderInject(["cutting", "force"], [
    { layer: "L7", status: "built", label: "CuttingForceEngine", info: "Kienzle force model" },
    { layer: "L7", status: "built", id: "node-2", info: "" },
  ]);
  assert.match(out, /Pre-Write graph context — 2 related node\(s\) for "cutting, force"/);
  assert.match(out, /CuttingForceEngine/);
  assert.match(out, /\[L7\/built\]/);
  // Advisory framing — must point at /dedup, never imply a block.
  assert.match(out, /\/dedup/);
  assert.match(out, /Disable: PRISM_PRE_WRITE_GRAPH_INJECT=0/);
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

test("renderInject: missing keys falls back to 'this name'", () => {
  const out = renderInject([], [{ layer: "L7", id: "n1", info: "" }]);
  assert.match(out, /related node\(s\) for "this name"/);
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
    { tool_name: "Write", tool_input: { file_path: "H:/prism/scripts/system-viz-on-commit.mjs", content: "x" } },
    { PRISM_PRE_WRITE_GRAPH_INJECT: "0" },
  );
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.equal(out.continue, true);
  assert.equal(out.hookSpecificOutput, undefined, "disabled → no graph context");
});

test("hook E2E: missing file_path → {continue:true} (no throw, no inject)", () => {
  const r = runHook({ tool_name: "Write", tool_input: { content: "x" } }, {});
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.equal(out.continue, true);
  assert.equal(out.hookSpecificOutput, undefined);
});

test("hook E2E: a stem-less path (.gitignore) → {continue:true} (deriveGraphKeys gates it out)", () => {
  const r = runHook({ tool_name: "Write", tool_input: { file_path: "H:/prism/.gitignore", content: "x" } }, {});
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.equal(out.continue, true);
  assert.equal(out.hookSpecificOutput, undefined, "no usable keys → no search → no inject");
});

test("hook E2E: a real multi-token filename DOES fire an injection (regression guard for the .hits contract)", () => {
  // "system-viz-on-commit.mjs" → deriveGraphKeys{write} drops "system"/"on"
  // (STOPWORDS) → keys ["viz","commit"]. Those nodes exist in PRISM's
  // 258K-node graph. If hookSpecificOutput is null, either the
  // runMasterIndexSearch .hits contract regressed or the graph is broken.
  const r = runHook(
    { tool_name: "Write", tool_input: { file_path: "H:/prism/scripts/system-viz-on-commit.mjs", content: "x" } },
    {},
  );
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.equal(out.continue, true);
  assert.ok(
    out.hookSpecificOutput,
    "a real multi-token filename MUST fire a graph-context injection — "
    + "null here means the .hits contract regressed or the graph is broken",
  );
  assert.equal(out.hookSpecificOutput.hookEventName, "PreToolUse");
  assert.match(out.hookSpecificOutput.additionalContext, /Pre-Write graph context/);
});

// ── exact-match collapse (U-SV-NAV-INJECT-GREP-WRITE) ───────────────────────

test("renderInject: exact match collapses to the 'already exists' EXACT MATCH banner", () => {
  const out = renderInject(["cuttingforceengine"], [{ label: "cuttingforceengine", status: "built", layer: "L7", info: "Kienzle" }]);
  assert.match(out, /Pre-Write EXACT MATCH/);
  assert.match(out, /already exists/);
  assert.doesNotMatch(out, /related node/, "exact match must collapse, not render the multi-hit block");
});

test("renderInject: exact match WITH a resolver emits a read-before-write repo path", () => {
  const resolve = (l) => (l === "cuttingforceengine"
    ? { path: "src/engines/CuttingForceEngine.ts", repoPath: "mcp-server/src/engines/CuttingForceEngine.ts", type: "engine" }
    : null);
  const out = renderInject(["cuttingforceengine"], [{ label: "cuttingforceengine", status: "built", layer: "L7" }], resolve);
  assert.match(out, /Read mcp-server\/src\/engines\/CuttingForceEngine\.ts/);
  assert.doesNotMatch(out, /Read src\//, "never the bare src/ dup");
});

test("renderInject: exact match WITHOUT a resolver omits the nav Read line", () => {
  const out = renderInject(["cuttingforceengine"], [{ label: "cuttingforceengine", status: "built", layer: "L7" }]);
  assert.match(out, /EXACT MATCH/);
  // tightened to the nav-line marker (→ `Read ) — the advisory footer legitimately
  // contains the word "Read it", which is NOT the injected path line.
  assert.doesNotMatch(out, /→ `Read/, "no nav path line without a resolver");
});

test("renderInject: a ghost-status exact label does NOT collapse (stays multi-hit advisory)", () => {
  const out = renderInject(["foo"], [{ label: "foo", status: "ghost.unwired-engine", layer: "L8", info: "" }]);
  assert.doesNotMatch(out, /EXACT MATCH/);
  assert.match(out, /related node/);
});
