// tier: T4
// Tests for scripts/call-engine.mjs — the server-free PRISM engine invoker.
//
// node:test — BLACK-BOX: call-engine.mjs is a CLI whose logic lives in main()
// (not exported fns), so we exercise it the way a user does — spawn it through
// tsx and assert on stdout/stderr + exit code. This touches REAL engine source
// on the H: drive (no mocks): that is the point — it proves the harness invokes
// engines with the MCP server uninvolved. Cheap cases hit the pure `validators`
// module; one case hits the heavy PRISMSelfAwarenessEngine singleton (slow import).
//
// Exit-code contract under test (from call-engine.mjs header):
//   0 ok · 2 usage/JSON error · 3 module not found · 4 export/method not found · 5 threw
//
// Run: node --test H:/prism/scripts/call-engine.test.mjs
//   (spawns tsx internally; needs mcp-server/node_modules — i.e. run on the dev box)

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

const HARNESS = "H:/prism/scripts/call-engine.mjs";
const MCP = "H:/prism/mcp-server";
// tsx's loader entry — invoked via `node <cli.mjs>` so we avoid spawning through a
// shell. shell:true on Windows re-parses argv and mangles JSON args (strips inner
// quotes, splits on spaces) — that corrupted cases 1/2/8 on the first run. Routing
// `node` (PATH-resolved, no shell) with tsx as a script arg passes args verbatim.
const TSX_CLI = `${MCP}/node_modules/tsx/dist/cli.mjs`;

// Invoke the harness through tsx, capture the result. NO shell:true → args reach
// call-engine.mjs byte-for-byte. 120s budget: case 7 imports the full
// self-awareness engine graph (slow cold TS import).
function run(args, timeoutMs = 120_000) {
  const r = spawnSync(
    process.execPath, // the node binary running this test
    [TSX_CLI, HARNESS, ...args],
    { encoding: "utf8", timeout: timeoutMs }
  );
  if (r.error) throw r.error; // spawn itself failed (tsx missing, timeout) — fail loud
  return { code: r.status, out: r.stdout ?? "", err: r.stderr ?? "" };
}

// ── CASE 1: named-export function, positional array → real physics result ──────
test("named-export fn with positional array args returns the engine result", () => {
  const { code, out } = run(["utils/validators", "validateKienzle", '[1800,0.25,"P"]']);
  assert.equal(code, 0, "exit 0 on success");
  const parsed = JSON.parse(out);
  // validateKienzle(1800,0.25,'P') — 1800 & 0.25 are inside ISO-P canonical ranges.
  // This asserts INTENT (valid P-group coefficients pass), not a hardcoded blob:
  // change the inputs out of range and `valid` must flip — see CASE 1b.
  assert.equal(parsed.valid, true);
  assert.equal(parsed.metadata.isoGroup, "P");
});

// ── CASE 1b: same fn, OUT-OF-RANGE input → result flips (R9: test fails if logic changes) ──
test("named-export fn surfaces a failing validation for out-of-range input", () => {
  // kc1.1 = 50000 is far above any ISO group's range → must be invalid.
  const { code, out } = run(["utils/validators", "validateKienzle", '[50000,0.25,"P"]']);
  assert.equal(code, 0, "harness still exits 0 — the ENGINE reports invalid, not the harness");
  const parsed = JSON.parse(out);
  assert.equal(parsed.valid, false, "out-of-range kc1.1 must be reported invalid");
});

// ── CASE 2: --list enumerates module exports ───────────────────────────────────
test("--list returns the module's exports", () => {
  const { code, out } = run(["--list", "utils/validators"]);
  assert.equal(code, 0);
  const parsed = JSON.parse(out);
  assert.ok(Array.isArray(parsed.exports));
  assert.ok(parsed.exports.includes("validateKienzle"), "known export present");
  assert.ok(parsed.module.includes("validators"), "resolved module path echoed");
});

// ── CASE 3: FAILURE — unknown module → exit 3, names what it tried ─────────────
test("unknown module fails loud with exit 3", () => {
  const { code, err } = run(["engines/NoSuchEngine", "foo.bar", "[]"]);
  assert.equal(code, 3);
  assert.match(err, /module not found/i);
  assert.match(err, /NoSuchEngine/);
});

// ── CASE 4: FAILURE — bad method on real module → exit 4 + lists what IS callable ──
test("non-function export fails loud with exit 4 and lists real exports", () => {
  const { code, err } = run(["utils/validators", "notAFunction", "[]"]);
  assert.equal(code, 4);
  assert.match(err, /not a function/i);
  // fail-loud quality: the error must point the user at real callables
  assert.match(err, /validateKienzle/);
});

// ── CASE 5: FAILURE — malformed JSON params → exit 2 (usage), not a silent crash ──
test("malformed JSON params fails loud with exit 2", () => {
  const { code, err } = run(["utils/validators", "validateKienzle", "{bad json"]);
  assert.equal(code, 2);
  assert.match(err, /not valid JSON/i);
});

// ── CASE 6: --methods lists methods on a real singleton export ─────────────────
test("--methods lists methods on a singleton export", () => {
  const { code, out } = run(["--methods", "PRISMSelfAwarenessEngine", "prismSelfAwarenessEngine"]);
  assert.equal(code, 0);
  const parsed = JSON.parse(out);
  assert.ok(Array.isArray(parsed.methods));
  // findCapabilities is the documented public contract method — verified present last session.
  assert.ok(parsed.methods.includes("findCapabilities"), "known method enumerated");
});

// ── CASE 7: singleton.method LIVE call → real ranked data, server uninvolved ───
test("singleton.method invocation returns real engine output", () => {
  const { code, out } = run([
    "PRISMSelfAwarenessEngine",
    "prismSelfAwarenessEngine.findCapabilities",
    '["cutting force prediction"]',
  ]);
  assert.equal(code, 0, "exit 0 on a real singleton method call");
  const parsed = JSON.parse(out);
  assert.ok(Array.isArray(parsed), "findCapabilities returns an array");
  assert.ok(parsed.length > 0, "query 'cutting force prediction' must match >=1 capability");
  // INTENT: a force query must surface a force engine — not an arbitrary match.
  const labels = parsed.map((m) => m.capability ?? m.engine ?? "").join(" ").toLowerCase();
  assert.match(labels, /force/, "top matches relate to cutting force");
});
