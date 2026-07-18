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
  // truncation reserves room for the 3-char "..." marker, so the cap is exact (1500)
  assert.ok(out.length <= 1500, `block must be byte-capped; got ${out.length}`);
  assert.ok(out.endsWith("..."), "a truncated block must carry the truncation marker");
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

// ── GAP-A: high-confidence top-hit inline card (renderInject branch) ──────────
// signature: renderInject(keys, hits, resolve, seekDocs, inlineCardMinScore)

test("renderInject GAP-A: high-confidence top hit injects card content inline", () => {
  const hits = [
    { id: "eng.kienzle", label: "KienzleForceModel", layer: "L7", status: "built", info: "Kienzle force", score: 15 },
    { id: "eng.taylor",  label: "TaylorToolLife",   layer: "L7", status: "built", info: "Taylor tool",  score: 8 },
  ];
  const out = renderInject(["kienzle", "force"], hits, undefined, undefined, 10);
  assert.ok(out, "must return a block");
  assert.match(out, /\[card\]/, "GAP-A: card marker must appear for high-confidence top hit");
  assert.match(out, /KienzleForceModel/, "card must name the top hit");
  assert.match(out, /15\.0/, "card must include the score formatted to 1dp");
  assert.match(out, /Pre-Write graph context/, "names block header must also appear");
});

test("renderInject GAP-A: below-threshold top hit renders names only -- no card", () => {
  const hits = [{ id: "eng.misc", label: "MiscEngine", layer: "L7", status: "built", info: "misc", score: 8 }];
  const out = renderInject(["misc"], hits, undefined, undefined, 10);
  assert.ok(out, "must return a block");
  assert.doesNotMatch(out, /\[card\]/, "below-threshold top hit must NOT inject card");
  assert.match(out, /Pre-Write graph context/, "names block must appear");
});

test("renderInject GAP-A: score EXACTLY at threshold injects the card (boundary, >= not >)", () => {
  const hits = [{ id: "eng.edge", label: "EdgeEngine", layer: "L7", status: "built", info: "edge", score: 10 }];
  const out = renderInject(["edge"], hits, undefined, undefined, 10);
  assert.match(out, /\[card\]/, "score === threshold must inject the card (inclusive boundary)");
  assert.match(out, /EdgeEngine/, "card must name the boundary hit");
});

test("renderInject GAP-A: threshold=0 disables inline card entirely", () => {
  const hits = [{ id: "eng.kienzle", label: "KienzleForceModel", layer: "L7", status: "built", info: "x", score: 999 }];
  const out = renderInject(["kienzle"], hits, undefined, undefined, 0);
  assert.ok(out, "must return a block");
  assert.doesNotMatch(out, /\[card\]/, "threshold=0 must disable inline card");
});

test("renderInject GAP-A: an exact-match collapse is NOT affected by the card path", () => {
  // a single concrete label === key collapses to the EXACT MATCH banner BEFORE
  // any GAP-A card logic; the card branch must never fire on that path.
  const out = renderInject(["soloengine"], [{ label: "soloengine", status: "built", layer: "L7", info: "x", score: 99 }], undefined, undefined, 10);
  assert.match(out, /EXACT MATCH/, "single concrete exact label must still collapse");
  assert.doesNotMatch(out, /\[card\]/, "exact-match path must not emit a GAP-A card");
});

test("renderInject GAP-A: seekDocs miss (returns null) -- card body still renders, names follow", () => {
  const hits = [{ id: "not-a-real-node-id", label: "OrphanEngine", layer: "L7", status: "built", info: "x", score: 20 }];
  const out = renderInject(["orphan"], hits, undefined, () => null, 10);
  assert.ok(out, "must return a block even when seekDocs misses");
  assert.match(out, /\[card\]/, "card body must render even when seekDocs returns null");
  assert.match(out, /Pre-Write graph context/, "names block must follow");
});

test("renderInject GAP-A: byte cap respected -- card dropped when combined block would overflow, names-only stays <= cap", () => {
  const longInfo = "z".repeat(400);
  const longLabel = "A".repeat(200);
  const hits = Array.from({ length: 5 }, (_, i) => ({
    id: `eng.n${i}`, label: longLabel + i, layer: "L7", status: "built",
    info: longInfo, score: i === 0 ? 20 : 5,
  }));
  const out = renderInject(["x"], hits, undefined, undefined, 10);
  assert.ok(out, "must return a block");
  assert.ok(out.length <= 1500, `output must be within byte cap; got ${out.length}`);
});
