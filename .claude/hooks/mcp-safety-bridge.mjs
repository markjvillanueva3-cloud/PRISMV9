#!/usr/bin/env node
/**
 * mcp-safety-bridge.mjs — PostToolUse(Edit|Write|MultiEdit) → physics edit ⇒ run the safety validator.
 *
 * U-HKA08 of HOOKS-AUTOMATION-V2-MS0. (Spec asked for a `type:"mcp_tool"` hook; realised as a
 * `type:"command"` hook that *directs* Claude — the holder of the `prism_safety` MCP tool — to
 * run the validation, since a command hook can't reliably make an MCP tool call itself and the
 * harness's mcp_tool hook type can't be relied on.)
 *
 * WHY: a change to physics constants / a cutting-force / Taylor / Kienzle / safety-validator file
 * can silently flip the S(x) safety score below the 0.70 floor or de-canonicalise a kc1.1 value.
 * `physics-canonical-constants-guard.mjs` already catches *inlined* constants statically; this
 * hook is the dynamic complement — after such an edit it surfaces a directive to run
 * `prism_safety:validate_physics` and confirm S(x) ≥ 0.70 BEFORE committing. SOFT WARN ONLY:
 * it never blocks the edit (the hard S(x) ≥ 0.70 gate lives in the `safety-physics` agent /
 * the Stop hook stack, per CLAUDE.md §SAFETY) — it just makes sure the validation isn't skipped.
 *
 * @hook PostToolUse:(Edit|Write|MultiEdit)  (register in settings.json under that matcher)
 *
 * Env:
 *   PRISM_MCP_SAFETY_BRIDGE=0          → disable
 *   PRISM_MCP_SAFETY_BRIDGE_TESTS=1    → also fire for test/spec files (default: skip them)
 *   PRISM_MCP_URL                      → MCP daemon base URL probed for liveness (default http://127.0.0.1:3100)
 */

import * as fs from "node:fs";
import * as path from "node:path";

const PHYSICS_DIR_RX = /(^|[\\/])(?:mcp-server[\\/]+)?src[\\/]+physics[\\/]/i;
const CONSTANTS_RX = /(^|[\\/])physics[\\/]+constants\.ts$/i;
// physics-relevant engines/algorithms — name signals a cutting-mechanics / tool-life / thermal model
const PHYSICS_NAME_RX = /(kienzle|taylor|johnson.?cook|specific.?cutting.?energy|cutting.?force|tool.?life|chip.?thinning|chip.?thickness|deflection|thermal.?model|surface.?speed|mrr|material.?removal)/i;
const SAFETY_NAME_RX = /(safety.*valid|valid.*safety|s.?x.?scor|safety.?gate|safety.?oracle|physics.?valid)/i;
const ENGINE_DIRISH_RX = /(^|[\\/])(?:mcp-server[\\/]+)?src[\\/]+(?:engines|algorithms|safety)[\\/]/i;
const TESTISH_RX = /\.(test|spec)\.[tj]sx?$|(^|[\\/])(__tests__|__mocks__)[\\/]|\.d\.ts$|(^|[\\/])(dist|node_modules)[\\/]/i;

export function isDisabled(env = process.env) {
  return String(env.PRISM_MCP_SAFETY_BRIDGE ?? "") === "0";
}
function includeTests(env = process.env) {
  return String(env.PRISM_MCP_SAFETY_BRIDGE_TESTS ?? "") === "1";
}
export function mcpUrl(env = process.env) {
  return (env.PRISM_MCP_URL || "http://127.0.0.1:3100").replace(/\/+$/, "");
}

/** Does an edit to this path warrant a safety re-validation? */
export function isPhysicsCritical(filePath, env = process.env) {
  if (typeof filePath !== "string" || !filePath) return false;
  const wantTests = includeTests(env);
  const isTestish = TESTISH_RX.test(filePath);
  if (isTestish) {
    if (!wantTests) return false;                                          // default: never on a test/.d.ts/dist file
    if (/\.d\.ts$/i.test(filePath) || /(^|[\\/])(dist|node_modules)[\\/]/i.test(filePath)) return false; // these stay excluded even with the flag
    // with the flag: a physics-named test (e.g. KienzleX.test.ts) counts; an unrelated test doesn't
    return PHYSICS_NAME_RX.test(filePath) || SAFETY_NAME_RX.test(filePath) || CONSTANTS_RX.test(filePath) || PHYSICS_DIR_RX.test(filePath);
  }
  if (CONSTANTS_RX.test(filePath)) return true;
  if (PHYSICS_DIR_RX.test(filePath)) return true;
  if ((PHYSICS_NAME_RX.test(filePath) || SAFETY_NAME_RX.test(filePath)) && ENGINE_DIRISH_RX.test(filePath)) return true;
  return false;
}

/** The advisory text surfaced to Claude. */
export function buildAdvisory(filePath, { mcpUp = null } = {}) {
  const lines = [
    `🛡️ Physics-critical edit detected: ${filePath}`,
    `Before you commit this, run the safety validator and CONFIRM the result:`,
    `  • Invoke the \`prism_safety\` MCP tool with { action: "validate_physics", ... } (or \`prism_calc:validate_physics\`).`,
    `  • Require S(x) ≥ 0.70 — that is a HARD floor (enforced by the safety-physics agent / Stop hooks). If it's below, do NOT commit; fix the physics.`,
    `  • Canonical kc1.1 per ISO group and all Kienzle/Taylor constants live ONLY in mcp-server/src/physics/constants.ts (and are documented in CLAUDE.md §SAFETY) — your edit must match them; never inline a constant elsewhere.`,
    `  • If you changed a formula: dimensional consistency + canonical-form check (the physics-reviewer agent / /physics-verify).`,
  ];
  if (mcpUp === true) lines.push(`  (MCP server at ${mcpUrl()} is reachable — run the validation now.)`);
  else if (mcpUp === false) lines.push(`  (MCP server at ${mcpUrl()} did not respond — start it first: SessionStart auto-starts the daemon, or \`cd mcp-server && npm run build\` then retry.)`);
  lines.push(`  (This is a soft reminder — it does NOT block the edit. Disable with PRISM_MCP_SAFETY_BRIDGE=0.)`);
  return lines.join("\n");
}

async function probeMcp(env = process.env, timeoutMs = 350) {
  try {
    const r = await fetch(mcpUrl(env) + "/", { signal: AbortSignal.timeout(timeoutMs) });
    return r.status >= 0; // any HTTP response (even 404/405) ⇒ something is listening
  } catch {
    return false; // ECONNREFUSED / AbortError / DNS / ...
  }
}

function findRoot(start = process.cwd()) {
  let cur = start;
  for (let i = 0; i < 12; i++) {
    if (fs.existsSync(path.join(cur, ".claude", "settings.json"))) return cur;
    const p = path.dirname(cur); if (p === cur) break; cur = p;
  }
  return start;
}
function telemetry(env, rec) {
  try {
    const f = path.join(findRoot(), ".claude", "cache", "hook-telemetry.jsonl");
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.appendFileSync(f, JSON.stringify({ hook: "mcp-safety-bridge", t: new Date().toISOString(), ...rec }) + "\n");
  } catch { /* ignore */ }
}

/**
 * @returns {{advise:boolean, message?:string, mcpUp?:boolean|null, file?:string}}
 */
export async function runBridge({ stdin, env = process.env, probeFn = probeMcp }) {
  if (isDisabled(env)) return { advise: false };
  const filePath = stdin?.tool_input?.file_path ?? stdin?.tool_input?.path;
  if (!isPhysicsCritical(filePath, env)) return { advise: false, file: typeof filePath === "string" ? filePath : null };
  let mcpUp = null;
  try { mcpUp = await probeFn(env); } catch { mcpUp = null; }
  return { advise: true, message: buildAdvisory(filePath, { mcpUp }), mcpUp, file: filePath };
}

async function main() {
  let stdin = null;
  try {
    if (!process.stdin.isTTY) {
      const raw = fs.readFileSync(0, "utf8");
      if (raw && raw.trim().startsWith("{")) stdin = JSON.parse(raw);
    }
  } catch { stdin = null; }

  let res;
  try { res = await runBridge({ stdin }); }
  catch { return process.stdout.write(JSON.stringify({ continue: true })); }

  if (!res.advise) return process.stdout.write(JSON.stringify({ continue: true }));

  telemetry(process.env, { event: "advised", mcpUp: res.mcpUp, file: res.file, session: stdin?.session_id ?? null });
  // SOFT warn — never block. additionalContext carries the directive.
  return process.stdout.write(JSON.stringify({
    continue: true,
    hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: res.message },
  }));
}

const invokedDirectly = (() => {
  try { return path.resolve(process.argv[1] || "").endsWith("mcp-safety-bridge.mjs"); }
  catch { return false; }
})();
if (invokedDirectly) main();
