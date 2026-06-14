import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { renderInject, exactMatchHit } from "./pre-bash-graph-inject.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HOOK = path.join(__dirname, "pre-bash-graph-inject.mjs");

// ── renderInject — pure rendering ──────────────────────────────────────────

test("renderInject: empty hits → null (no inject)", () => {
  assert.equal(renderInject(["foo"], []), null);
});

test("renderInject: non-array hits → null", () => {
  assert.equal(renderInject(["foo"], null), null);
  assert.equal(renderInject(["foo"], undefined), null);
});

test("renderInject: hits → a block with the key string and node lines", () => {
  const out = renderInject(["cutting", "force"], [
    { layer: "L7", status: "built", label: "CuttingForceEngine", info: "Kienzle force model" },
    { layer: "L7", status: "built", id: "node-2", info: "" },
  ]);
  assert.match(out, /Pre-Bash graph context — 2 node\(s\) already match "cutting, force"/);
  assert.match(out, /CuttingForceEngine/);
  assert.match(out, /\[L7\/built\]/);
  assert.match(out, /Disable: PRISM_PRE_BASH_GRAPH_INJECT=0/);
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

test("renderInject: missing keys falls back to 'this search'", () => {
  const out = renderInject([], [{ layer: "L7", id: "n1", info: "" }]);
  assert.match(out, /already match "this search"/);
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
    { tool_name: "Bash", tool_input: { command: "grep -rn kienzle mcp-server/src" } },
    { PRISM_PRE_BASH_GRAPH_INJECT: "0" },
  );
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.equal(out.continue, true);
  assert.equal(out.hookSpecificOutput, undefined, "disabled → no graph context");
});

test("hook E2E: missing command → {continue:true} (no throw, no inject)", () => {
  const r = runHook({ tool_name: "Bash", tool_input: {} }, {});
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.equal(out.continue, true);
  assert.equal(out.hookSpecificOutput, undefined);
});

test("hook E2E: a non-file-search command (git status) → {continue:true} (deriveGraphKeys gates it out)", () => {
  // deriveGraphKeys{bash} returns [] for any verb not in FILE_SEARCH_CMDS —
  // git/npm/node/build commands carry no graph signal, so no search fires.
  const r = runHook({ tool_name: "Bash", tool_input: { command: "git status --short" } }, {});
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.equal(out.continue, true);
  assert.equal(out.hookSpecificOutput, undefined, "non-file-search verb → no keys → no inject");
});

test("hook E2E: a file-search command with no non-flag args → {continue:true} (no keys)", () => {
  // `ls -la` has only a flag after the verb — deriveGraphKeys returns [].
  const r = runHook({ tool_name: "Bash", tool_input: { command: "ls -la" } }, {});
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.equal(out.continue, true);
  assert.equal(out.hookSpecificOutput, undefined, "no non-flag args → no keys → no inject");
});

test("hook E2E: a real file-search command DOES fire an injection (regression guard for the .hits contract)", () => {
  // `grep -rn "kienzle cutting" mcp-server/src` → deriveGraphKeys{bash} sees
  // verb "grep" (file-search), tokenizes the non-flag args → keys
  // ["kienzle","cutting","mcp","server","src"]. Those nodes exist in
  // PRISM's 258K-node graph. If hookSpecificOutput is null, either the
  // runMasterIndexSearch .hits contract regressed or the graph is broken.
  const r = runHook(
    { tool_name: "Bash", tool_input: { command: 'grep -rn "kienzle cutting" mcp-server/src' } },
    {},
  );
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.equal(out.continue, true);
  assert.ok(
    out.hookSpecificOutput,
    "a real file-search bash command MUST fire a graph-context injection — "
    + "null here means the .hits contract regressed or the graph is broken",
  );
  assert.equal(out.hookSpecificOutput.hookEventName, "PreToolUse");
  assert.match(out.hookSpecificOutput.additionalContext, /Pre-Bash graph context/);
});

// ── exactMatchHit + node-path line (U-SV-NODE-PATH-TEMPLATE) ────────────────

test("exactMatchHit: label==key + concrete + no rank-2 dup → returns the hit", () => {
  const h = exactMatchHit(["kienzle"], [{ label: "kienzle", status: "built", layer: "L7" }]);
  assert.ok(h);
  assert.equal(h.label, "kienzle");
});

test("exactMatchHit: no key equals the label → null (multi-hit render path)", () => {
  assert.equal(exactMatchHit(["cutting", "force"], [{ label: "CuttingForceEngine", status: "built" }]), null);
});

test("exactMatchHit: ghost status → null (never point at an unbuilt node)", () => {
  assert.equal(exactMatchHit(["foo"], [{ label: "foo", status: "ghost.unwired-engine" }]), null);
});

test("exactMatchHit: rank-2 hit shares the label (ambiguous) → null", () => {
  assert.equal(exactMatchHit(["foo"], [
    { label: "foo", status: "built" },
    { label: "Foo", status: "built" },
  ]), null);
});

test("exactMatchHit: empty keys / empty hits → null", () => {
  assert.equal(exactMatchHit([], [{ label: "foo", status: "built" }]), null);
  assert.equal(exactMatchHit(["foo"], []), null);
});

test("renderInject: exact match WITH a resolver emits the repo-root-relative `Read` line", () => {
  const resolve = (label) => (label === "kienzle"
    ? { path: "src/engines/KienzleEngine.ts", repoPath: "mcp-server/src/engines/KienzleEngine.ts", type: "engine" }
    : null);
  const out = renderInject(["kienzle"], [{ label: "kienzle", status: "built", layer: "L7", info: "force model" }], resolve);
  assert.match(out, /EXACT MATCH/);
  assert.match(out, /Read mcp-server\/src\/engines\/KienzleEngine\.ts/, "must surface the repo-root-relative path (directly Readable)");
  assert.doesNotMatch(out, /Read src\//, "must NOT emit the bare src/ path (that opens the untracked top-level dup)");
  assert.match(out, /\(engine\)/, "must surface the asset type");
});

test("renderInject: a resolver returning only a bare path (no repoPath) emits NO line", () => {
  // defends the gate: only repoPath is directly Readable, so a resolver that omits
  // it must not leak a bare src/ path into the banner.
  const resolve = () => ({ path: "src/engines/KienzleEngine.ts", type: "engine" });
  const out = renderInject(["kienzle"], [{ label: "kienzle", status: "built", layer: "L7" }], resolve);
  assert.match(out, /EXACT MATCH/);
  assert.doesNotMatch(out, /Read /, "no repoPath → no path line (never the bare src/ dup)");
});

test("renderInject: exact match WITHOUT a resolver omits the path line (back-compat)", () => {
  const out = renderInject(["kienzle"], [{ label: "kienzle", status: "built", layer: "L7", info: "force model" }]);
  assert.match(out, /EXACT MATCH/);
  assert.doesNotMatch(out, /Read src\//, "no resolver → no path line");
});

test("renderInject: a resolver that throws → banner still renders (fail-soft)", () => {
  const boom = () => { throw new Error("resolver down"); };
  const out = renderInject(["kienzle"], [{ label: "kienzle", status: "built", layer: "L7" }], boom);
  assert.match(out, /EXACT MATCH/);
  assert.doesNotMatch(out, /Read src\//);
});

test("renderInject: resolver returning null (unindexed/ambiguous) → no path line", () => {
  const out = renderInject(["kienzle"], [{ label: "kienzle", status: "built", layer: "L7" }], () => null);
  assert.match(out, /EXACT MATCH/);
  assert.doesNotMatch(out, /Read src\//);
});

// ── seekDocs — node→vault/wiki/memory paths inline (U-SV-NODE-VAULT-PATHS) ──

test("renderInject: exact match WITH seekDocs emits the node's vault wiki/mem paths", () => {
  const seekDocs = (id) => (id === "kienzle"
    ? { wiki: ["lessons/kienzle-force.md", "concepts/cutting.md"], mem: ["reference_kienzle.md"] }
    : null);
  const out = renderInject(
    ["kienzle"], [{ label: "kienzle", status: "built", layer: "L7", info: "force model" }],
    undefined, seekDocs,
  );
  assert.match(out, /EXACT MATCH/);
  assert.match(out, /📂 vault paths/, "must surface the node's Obsidian doc paths inline");
  assert.match(out, /wiki: lessons\/kienzle-force\.md · concepts\/cutting\.md/);
  assert.match(out, /mem: reference_kienzle\.md/);
});

test("renderInject: seekDocs caps at 2 wiki + 2 mem entries (banner stays compact)", () => {
  const seekDocs = () => ({ wiki: ["a", "b", "c", "d"], mem: ["m1", "m2", "m3"] });
  const out = renderInject(["kienzle"], [{ label: "kienzle", status: "built", layer: "L7" }], undefined, seekDocs);
  assert.match(out, /wiki: a · b\b/, "only the first 2 wiki entries");
  assert.doesNotMatch(out, /· c\b/, "third wiki entry must not appear");
});

test("renderInject: seekDocs returning null → NO vault-paths line (no regression)", () => {
  const out = renderInject(["kienzle"], [{ label: "kienzle", status: "built", layer: "L7" }], undefined, () => null);
  assert.match(out, /EXACT MATCH/);
  assert.doesNotMatch(out, /vault paths/, "no card → banner unchanged");
});

test("renderInject: seekDocs with empty wiki+mem arrays → NO vault-paths line", () => {
  const out = renderInject(["kienzle"], [{ label: "kienzle", status: "built", layer: "L7" }], undefined, () => ({ wiki: [], mem: [] }));
  assert.doesNotMatch(out, /vault paths/, "empty doc arrays → no line");
});

test("renderInject: seekDocs that THROWS → banner still renders (fail-soft)", () => {
  const boom = () => { throw new Error("offset index down"); };
  const out = renderInject(["kienzle"], [{ label: "kienzle", status: "built", layer: "L7" }], undefined, boom);
  assert.match(out, /EXACT MATCH/, "a seekDocs failure must never break the banner");
  assert.doesNotMatch(out, /vault paths/);
});

test("renderInject: seekDocs prefers h0.id over label when present", () => {
  const seekDocs = (id) => (id === "eng.kienzle" ? { wiki: ["w.md"], mem: [] } : null);
  const out = renderInject(
    ["kienzle"], [{ id: "eng.kienzle", label: "kienzle", status: "built", layer: "L7" }],
    undefined, seekDocs,
  );
  assert.match(out, /vault paths/, "must seek by the node id (eng.kienzle), not the human label");
  assert.match(out, /wiki: w\.md/);
});
