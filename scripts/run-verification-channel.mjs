// FORGE-PIPELINE-ROUTING-MS0/U-FORGE-VERIFY-CHANNEL (2026-06-11, slot:tango)
// The REAL forge7 v7 HARD verification-gate wrapper. forge7 Phase 4C declares a
// per-unit `verifies_via: tool: <cmd>` channel and then "re-runs it to confirm
// the signal" -- but the script it called was never built, so the gate silently
// no-op'd (the #1 FLEET-HOOK-AUDIT forge7 bug). This runs the declared command,
// checks its exit code + optional pass-signal, and returns a BINDING pass/fail.
//
// Usage:
//   node scripts/run-verification-channel.mjs --tool "vitest run X.test.ts" [--expect-signal "Tests.*passed"] [--unit U-XXX] [--json]
//   node scripts/run-verification-channel.mjs --unit U-XXX --spec state/shared/specs/UNITS/U-XXX.md [--json]
// Exit 0 = PASS, exit 1 = FAIL (so a forge loop can gate on it), exit 2 = usage error.
//
// PURE core (decideVerification / parseCommand / readVerifiesVia) -- the CLI
// shell injects spawnSync. The declared command runs via `shell:true` so node/
// vitest/npx resolve on the Windows PATH (a no-shell spawn returns status:null
// for a bare `node`). This is SAFE: `verifies_via.tool` is author-declared in
// the unit spec -- the same trust level as the forge skill body, never untrusted
// user input -- so shell parsing introduces no new injection surface.

import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { pathToFileURL } from "node:url";

const DEFAULT_TIMEOUT_MS = 120000;

/** Decide PASS/FAIL from an execution result + the declared expectation. PURE. */
export function decideVerification({ exitCode, stdout = "", stderr = "", expectSignal = null, ran = true }) {
  if (!ran) return { pass: false, reason: "verification command did not run (spawn failed)" };
  if (exitCode !== 0) return { pass: false, reason: `exit ${exitCode} (non-zero)` };
  if (expectSignal) {
    let re;
    try { re = expectSignal instanceof RegExp ? expectSignal : new RegExp(expectSignal); }
    catch { return { pass: false, reason: `invalid expect-signal regex: ${String(expectSignal)}` }; }
    if (!re.test(`${stdout}\n${stderr}`)) return { pass: false, reason: `exit 0 but signal /${re.source}/ not found in output` };
    return { pass: true, reason: `exit 0 + signal /${re.source}/ matched` };
  }
  return { pass: true, reason: "exit 0 (no signal required)" };
}

/** Tokenize a declared command into argv WITHOUT a shell (quote aware). PURE. */
export function parseCommand(cmd) {
  if (typeof cmd !== "string" || !cmd.trim()) return null;
  const tokens = cmd.match(/"[^"]*"|'[^']*'|\S+/g);
  if (!tokens || tokens.length === 0) return null;
  return tokens.map((t) => t.replace(/^["']|["']$/g, ""));
}

/** Extract `verifies_via: tool: <cmd>` from a unit spec's text. PURE. */
export function readVerifiesVia(specText) {
  if (typeof specText !== "string") return null;
  const m = specText.match(/verifies_via\s*:\s*[\r\n]+(?:[^\S\r\n]+\w+\s*:.*[\r\n]+)*?[^\S\r\n]+tool\s*:\s*(.+)/i)
    || specText.match(/verifies_via\s*:\s*tool\s*:\s*(.+)/i);
  if (!m) return null;
  const tool = m[1].trim();
  return tool || null;
}

/** Run a verification command (impure shell -- injectable for tests). */
export function runVerification({ tool, expectSignal = null, timeoutMs = DEFAULT_TIMEOUT_MS, spawnImpl = spawnSync } = {}) {
  // parseCommand is the validity gate (null = nothing to run); execution itself
  // goes through shell:true so PATH-resolved tools (node/vitest/npx) work on Windows.
  if (!parseCommand(tool)) return { ran: false, exitCode: null, ...decideVerification({ ran: false }) };
  let res;
  try {
    res = spawnImpl(tool, { encoding: "utf8", timeout: timeoutMs, windowsHide: true, shell: true });
  } catch (e) {
    return { ran: false, exitCode: null, error: String(e), ...decideVerification({ ran: false }) };
  }
  // status null + signal set => killed (e.g. timeout) -> treat as -1 (fail).
  const exitCode = res.status == null ? (res.signal ? -1 : null) : res.status;
  return { ran: true, exitCode, stdout: res.stdout || "", stderr: res.stderr || "",
    ...decideVerification({ exitCode, stdout: res.stdout || "", stderr: res.stderr || "", expectSignal, ran: true }) };
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") out.json = true;
    else if (a === "--tool") out.tool = argv[++i];
    else if (a === "--expect-signal") out.expectSignal = argv[++i];
    else if (a === "--unit") out.unit = argv[++i];
    else if (a === "--spec") out.spec = argv[++i];
    else if (a === "--timeout") out.timeout = Number(argv[++i]);
  }
  return out;
}

function main() {
  const o = parseArgs(process.argv.slice(2));
  let tool = o.tool;
  if (!tool && o.spec) {
    if (!existsSync(o.spec)) { console.error(`run-verification-channel: spec not found: ${o.spec}`); process.exit(2); }
    tool = readVerifiesVia(readFileSync(o.spec, "utf8"));
  }
  if (!tool) {
    console.error('run-verification-channel: no verification channel -- pass --tool "<cmd>" or --spec <unit.md with verifies_via>');
    process.exit(2);
  }
  const r = runVerification({ tool, expectSignal: o.expectSignal, timeoutMs: Number.isFinite(o.timeout) ? o.timeout : DEFAULT_TIMEOUT_MS });
  const result = { unit: o.unit || null, tool, pass: r.pass, exitCode: r.exitCode, reason: r.reason };
  if (o.json) console.log(JSON.stringify(result));
  else console.log(`${r.pass ? "PASS" : "FAIL"} -- ${o.unit || "verify"} -- ${r.reason}`);
  process.exit(r.pass ? 0 : 1);
}

const invokedAsCli = (() => {
  try { return process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url; }
  catch { return false; }
})();
if (invokedAsCli) main();
