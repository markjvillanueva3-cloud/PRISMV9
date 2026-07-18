import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { renderInject, renderTopCardBlock } from "./pre-grep-graph-inject.mjs";

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
  // header uses ASCII double-dash (not em-dash)
  assert.match(out, /Pre-Grep graph context -- 2 node\(s\) already match "graph, lock"/);
  assert.match(out, /system-graph-write-lock/);
  assert.match(out, /\[L6\/built\]/);
  assert.match(out, /Disable: PRISM_PRE_GREP_GRAPH_INJECT=0/);
});

test("renderInject: caps at 5 hits even if more are passed", () => {
  const many = Array.from({ length: 12 }, (_, i) => ({ layer: "L6", id: `n${i}`, info: "" }));
  const out = renderInject(["x"], many);
  // bullets use the unicode bullet (matches sibling pre-read/write/bash hooks)
  const bullets = (out.match(/^  • /gm) || []).length;
  assert.equal(bullets, 5, "must render at most 5 node lines");
});

test("renderInject: oversize block is truncated to the byte cap", () => {
  const huge = Array.from({ length: 5 }, (_, i) => ({
    layer: "L6", id: `n${i}`, label: "x".repeat(400), info: "y".repeat(400),
  }));
  const out = renderInject(["x"], huge);
  // truncation reserves room for the 3-char "..." marker, so the cap is exact (1500)
  assert.ok(out.length <= 1500, `block must be byte-capped; got ${out.length}`);
  assert.ok(out.endsWith("..."), "a truncated block must carry the truncation marker");
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

// ── GAP-A: high-confidence top-hit inline card ────────────────────────────

test("renderTopCardBlock: returns a card string with id, layer, score, info", () => {
  const hit = { id: "eng.kienzle", label: "KienzleForceModel", layer: "L7", status: "built", info: "Kienzle cutting force", score: 14.2 };
  const out = renderTopCardBlock(hit, undefined);
  assert.ok(typeof out === "string" && out.length > 0, "must return a non-empty string");
  assert.match(out, /\[card\]/, "must contain [card] marker");
  assert.match(out, /\[L7\/built\]/, "must include layer/status");
  assert.match(out, /KienzleForceModel/, "must include label");
  assert.match(out, /14\.2/, "must include score formatted to 1dp");
  assert.match(out, /Kienzle cutting force/, "must include info");
});

test("renderTopCardBlock: null hit returns null", () => {
  assert.equal(renderTopCardBlock(null, undefined), null);
});

test("renderTopCardBlock: hit with no id or label returns null", () => {
  assert.equal(renderTopCardBlock({ layer: "L7", status: "built" }, undefined), null);
});

test("renderTopCardBlock: seekDocs doc pointers are included when present", () => {
  const hit = { id: "eng.kienzle", label: "KienzleForceModel", layer: "L7", status: "built", score: 15 };
  const seekDocs = (id) => ({ wiki: ["wiki/concepts/kienzle.md"], mem: ["memory_patterns.mill_synthesis"] });
  const out = renderTopCardBlock(hit, seekDocs);
  assert.match(out, /wiki\/concepts\/kienzle\.md/, "wiki path must appear");
  assert.match(out, /mill_synthesis/, "mem path must appear");
});

test("renderTopCardBlock: seekDocs that throws still renders the card (error swallowed by vaultPathsLine, not a throw)", () => {
  const hit = { id: "eng.x", label: "X", layer: "L7", status: "built", score: 12 };
  // seekDocs throws -- vaultPathsLine catches internally; card still returns content (not null)
  const seekDocs = () => { throw new Error("card seek failed"); };
  const out = renderTopCardBlock(hit, seekDocs);
  // should still render the card body (seekDocs error is swallowed by vaultPathsLine)
  assert.ok(typeof out === "string", "seekDocs throw must not crash renderTopCardBlock");
  assert.match(out, /\[card\]/, "card body must still render despite seekDocs throw");
});

// ── GAP-A integration via renderInject ───────────────────────────────────

test("renderInject GAP-A: high-confidence top non-exact hit injects card content inline", () => {
  // score=15 >= threshold=10 -- card must be prepended before the names block
  const hits = [
    { id: "eng.kienzle", label: "KienzleForceModel", layer: "L7", status: "built", info: "Kienzle force", score: 15 },
    { id: "eng.taylor",  label: "TaylorToolLife",   layer: "L7", status: "built", info: "Taylor tool",  score: 8 },
  ];
  // Pass threshold explicitly so test is env-independent
  const out = renderInject(["kienzle", "force"], hits, undefined, undefined, 10);
  assert.ok(out, "must return a block");
  assert.match(out, /\[card\]/, "GAP-A: card marker must appear for high-confidence top hit");
  assert.match(out, /KienzleForceModel/, "card must name the top hit");
  assert.match(out, /15\.0/, "card must include the score");
  // The names block must still follow
  assert.match(out, /Pre-Grep graph context --/, "names block header must also appear");
});

test("renderInject GAP-A: below-threshold top hit renders names only -- no card", () => {
  // score=8 < threshold=10 -- no card
  const hits = [
    { id: "eng.misc", label: "MiscEngine", layer: "L7", status: "built", info: "misc", score: 8 },
  ];
  const out = renderInject(["misc"], hits, undefined, undefined, 10);
  assert.ok(out, "must return a block");
  assert.doesNotMatch(out, /\[card\]/, "below-threshold top hit must NOT inject card");
  assert.match(out, /Pre-Grep graph context --/, "names block must appear");
});

test("renderInject GAP-A: score EXACTLY at threshold injects the card (boundary, >= not >)", () => {
  // score=10 === threshold=10 -- the boundary must INCLUDE (>= semantics).
  // Pins the boundary so a future change from `>=` to `>` is caught (R9).
  const hits = [
    { id: "eng.edge", label: "EdgeEngine", layer: "L7", status: "built", info: "edge", score: 10 },
  ];
  const out = renderInject(["edge"], hits, undefined, undefined, 10);
  assert.ok(out, "must return a block");
  assert.match(out, /\[card\]/, "score === threshold must inject the card (inclusive boundary)");
  assert.match(out, /EdgeEngine/, "card must name the boundary hit");
});

test("renderInject GAP-A: threshold=0 disables inline card entirely", () => {
  const hits = [
    { id: "eng.kienzle", label: "KienzleForceModel", layer: "L7", status: "built", info: "x", score: 999 },
  ];
  // threshold=0 disables regardless of score
  const out = renderInject(["kienzle"], hits, undefined, undefined, 0);
  assert.ok(out, "must return a block");
  assert.doesNotMatch(out, /\[card\]/, "threshold=0 must disable inline card");
});

test("renderInject GAP-A: seekCard miss (seekDocs returns null) -- graceful names-only fallback", () => {
  // Label "OrphanEngine" does NOT match the search key "kienzle" so exact-match
  // collapse does NOT fire; score=20 >= threshold=10 so GAP-A card path fires.
  // seekDocs returns null (simulating a node id not present in the offset index).
  const hits = [
    { id: "not-a-real-node-id", label: "OrphanEngine", layer: "L7", status: "built", info: "x", score: 20 },
  ];
  const seekDocs = (_id) => null;
  const out = renderInject(["kienzle"], hits, undefined, seekDocs, 10);
  assert.ok(out, "must return a block even when seekDocs misses");
  // card body still renders (renderTopCardBlock does not require seekDocs to succeed)
  assert.match(out, /\[card\]/, "card body must render even when seekDocs returns null");
  assert.match(out, /Pre-Grep graph context --/, "names block must follow");
});

test("renderInject GAP-A: byte cap respected -- card skipped when combined block would overflow", () => {
  // Create a top hit whose card + names block would exceed 1500 bytes,
  // and verify the output never exceeds the cap.
  const longInfo = "z".repeat(400);
  const longLabel = "A".repeat(200);
  const hits = Array.from({ length: 5 }, (_, i) => ({
    id: `eng.n${i}`, label: longLabel + i, layer: "L7", status: "built",
    info: longInfo, score: i === 0 ? 20 : 5,
  }));
  const out = renderInject(["x"], hits, undefined, undefined, 10);
  assert.ok(out, "must return a block");
  // The output must respect the 1500-byte cap in all cases
  assert.ok(out.length <= 1500, `output must be within byte cap; got ${out.length}`);
});
