#!/usr/bin/env node
// tier: T1  (PreToolUse soft gate -- default-OFF, fail-open, governance-gated; can advise or, under ENABLE+ENFORCE+allowlist, block)
/**
 * reason-before-action-gate.mjs -- PreToolUse gate that actuates ReasonBeforeActionEngine.
 *
 * Before a consequential tool call this hook asks the LOCAL-ONLY octopus panel (via
 * the engine) whether to PROCEED | REVISE | BLOCK. It is the fleet-wide actuator for
 * the "reason before any action" capability -- so it is built to be SAFE BY DEFAULT
 * across all 26 concurrent chats:
 *
 *   - DEFAULT-OFF: does nothing (sub-ms approve) unless PRISM_RBA_GATE_ENABLE=1.
 *   - ADVISORY-FIRST: even when enabled, only ANNOTATES (additionalContext) unless
 *     PRISM_RBA_GATE_ENFORCE=1 AND an operator-authored governance allowlist matches.
 *     A gate that can block any tool in any chat IS fleet-control -- so blocking is a
 *     deliberate two-key (ENABLE+ENFORCE) + allowlist operation (governance opt-in).
 *   - FAIL-OPEN (3 layers): unparseable stdin / engine-not-loadable / engine-throws /
 *     cap-breach / ollama-down all APPROVE. "No verdict" is never "block".
 *   - NO-RECURSION: skips when PRISM_RBA_IN_FLIGHT=1 (the engine's sentinel) or depth
 *     >=1; sets PRISM_RBA_IN_FLIGHT + forces PRISM_LOCAL_LLM_VIA_MCP=0 + bumps
 *     PRISM_RBA_DEPTH around the consult; never gates mcp/prism dispatch, reads, or git commit.
 *   - LATENCY-CAPPED: a HOOK-side Promise.race cap (default 2500ms, PRISM_RBA_CAP_MS) is the
 *     real latency bound -- the engine's own timeout is untrusted defense-in-depth. The cap
 *     MUST exceed the warm vote latency of the engine's pinned model or the gate fail-opens
 *     every call (a WARM qwen3-vl:8b-instruct votes ~0.6-0.9s; a COLD load blows any cap). Activation
 *     therefore REQUIRES pre-warming the pinned model (keep_alive) -- see U-RBA-LIVE-VALIDATE.
 *   - KILL-SWITCH: PRISM_RBA_GATE_DISABLE=1 (alias PRISM_RBA_GATE_KILL) -> unconditional
 *     approve at the very top, overrides ENABLE+ENFORCE.
 *
 * Engine load: portable node here is v22.12 (NO TS type-strip), so a plain `node` hook
 * CANNOT import the .ts engine directly. The loadable module is supplied via
 * PRISM_RBA_ENGINE_PATH (a mock in tests; a built/tsx-resolvable module in production).
 * Absent or unloadable -> null -> fail-open. The gate is therefore inert+safe until the
 * operator both ENABLEs it and points it at a loadable engine during the one-slot rollout.
 *
 * Output protocol (verified vs duplication-hard-block.mjs): the field is `decision`.
 *   {decision:"approve"} | {decision:"approve", additionalContext} | {decision:"block", reason}
 */

import { readFileSync } from "node:fs";

// ---------------------------------------------------------------------------
// Pure, exported helpers (unit-testable without spawning)
// ---------------------------------------------------------------------------

export function isKilled(env = process.env) {
  return env.PRISM_RBA_GATE_DISABLE === "1" || env.PRISM_RBA_GATE_KILL === "1";
}
export function isEnabled(env = process.env) {
  return env.PRISM_RBA_GATE_ENABLE === "1";
}
export function isEnforcing(env = process.env) {
  return env.PRISM_RBA_GATE_ENFORCE === "1";
}

/**
 * Destructive Bash commands that warrant a reasoning check (not the lifeblood ops).
 * BEST-EFFORT / ADVISORY denylist -- it is NOT the destructive-op safety guard (other
 * hooks own that). A miss degrades to "no reasoning check", never to danger. Covers the
 * common cross-platform destroyers (POSIX + Windows + PowerShell); extend as new ones surface.
 */
const DESTRUCTIVE_BASH_RX =
  /\brm\s+-[a-z]*r[a-z]*f|\brm\s+-[a-z]*f[a-z]*r|\bgit\s+push\b[^\n]*(--force|-f\b)|--force-with-lease|\bgit\s+reset\s+--hard\b|\bgit\s+clean\s+-[a-z]*f|\bgit\s+filter-branch\b|--no-verify\b|\bDROP\s+(TABLE|DATABASE|SCHEMA)\b|\bDELETE\s+FROM\b|\bTRUNCATE\b|\bmkfs\b|\bdd\s+if=|\bformat\s+[a-z]:|\bshutdown\b|\breboot\b|\bremove-item\b[^\n]*-recurse|\bdel\s+\/[fq]/i;
const GATED_EDIT_TOOLS = new Set(["Write", "Edit", "MultiEdit", "NotebookEdit"]);
/** git ops that are lifeblood on a busy shared tree -- never gate (unless ALSO destructive). */
const GIT_LIFEBLOOD_RX = /\bgit\s+(commit|add|worktree|status|log|diff|fetch|pull|stash|branch|checkout)\b/i;

/** Should this tool call be reasoned about? Conservative: gates editors + destructive Bash only. */
export function isGatedTool(toolName, toolInput) {
  if (typeof toolName !== "string" || !toolName) return false;
  // NEVER gate the gate's own lifeblood: MCP/prism dispatch + reads.
  if (/^mcp__|^prism_/i.test(toolName)) return false;
  if (GATED_EDIT_TOOLS.has(toolName)) return true;
  if (toolName === "Bash") {
    const cmd = toolInput && typeof toolInput.command === "string" ? toolInput.command : "";
    if (!DESTRUCTIVE_BASH_RX.test(cmd)) return false;
    // a destructive token wins even if it co-occurs with a git lifeblood verb
    // (e.g. `git commit --no-verify` IS gated); a pure lifeblood op is not gated.
    if (GIT_LIFEBLOOD_RX.test(cmd) && !DESTRUCTIVE_BASH_RX.test(cmd)) return false;
    return true;
  }
  return false;
}

/** A short, safe preview of the tool input for the reasoning prompt. */
export function headOf(toolInput) {
  try {
    if (!toolInput || typeof toolInput !== "object") return "";
    if (typeof toolInput.command === "string") return toolInput.command.slice(0, 400);
    if (typeof toolInput.file_path === "string") return toolInput.file_path.slice(0, 400);
    return JSON.stringify(toolInput).slice(0, 400);
  } catch {
    return "";
  }
}

/**
 * A BLOCK is only ENFORCED if the operator-authored allowlist matches the tool.
 * Absent / unreadable allowlist -> false -> never enforce (advisory only). C9 governance.
 */
export function governanceAllows(toolName, env = process.env, readFile = readFileSync) {
  const file = env.PRISM_RBA_GOVERNANCE_ALLOWLIST;
  if (!file) return false;
  try {
    const list = JSON.parse(readFile(file, "utf8"));
    const tools = Array.isArray(list.tools) ? list.tools : [];
    return tools.includes("*") || tools.includes(toolName);
  } catch {
    return false;
  }
}

/** Quick Ollama liveness probe (the gate must not stall if the local model is down). */
export async function ollamaAlive(env = process.env, timeoutMs = 300) {
  if (env.PRISM_RBA_SKIP_PROBE === "1") return true;
  const url = (env.PRISM_RBA_OLLAMA_URL || env.OLLAMA_URL || "http://127.0.0.1:11434").replace(/\/+$/, "");
  try {
    const r = await fetch(url + "/api/tags", { signal: AbortSignal.timeout(timeoutMs) });
    return r.ok;
  } catch {
    return false;
  }
}

/** Default engine loader: import the module named by PRISM_RBA_ENGINE_PATH (else null). */
export async function loadEngine(env = process.env) {
  const p = env.PRISM_RBA_ENGINE_PATH;
  if (!p) return null;
  const mod = await import(p);
  return mod.reasonBeforeActionEngine ?? mod.default ?? null;
}

/** Race the engine consult against a cap; clears the timer so a fast PROCEED exits promptly. */
function raceWithCap(promise, capMs) {
  let timer;
  const capP = new Promise((res) => {
    timer = setTimeout(
      () => res({ verdict: "PROCEED", agreementScore: 1, rationale: "RBA cap-breach", path: "fail-open" }),
      capMs,
    );
  });
  return Promise.race([
    promise.then((v) => {
      clearTimeout(timer);
      return v;
    }),
    capP,
  ]);
}

/**
 * The gate decision. Pure-ish: all side-channels (engine, ollama probe) are injected.
 * Returns a plain object the caller serializes; never throws.
 */
export async function decide({ stdin, env = process.env, engineLoader = loadEngine, aliveFn = ollamaAlive }) {
  if (isKilled(env)) return { decision: "approve", reason: "killed" };
  if (!isEnabled(env)) return { decision: "approve", reason: "default-off" };
  if (env.PRISM_RBA_IN_FLIGHT === "1") return { decision: "approve", reason: "in-flight (recursion guard)" };
  if (Number(env.PRISM_RBA_DEPTH || 0) >= 1) return { decision: "approve", reason: "depth cap" };

  let h;
  try {
    h = JSON.parse(stdin);
  } catch {
    return { decision: "approve", reason: "unparseable stdin" };
  }
  // The live harness sends tool_name/tool_input; {tool,input} is the legacy form.
  // Reading only `tool` would be fail-DEAF (silent approve-on-undefined), worse than fail-open.
  const toolName = h?.tool_name ?? h?.tool;
  const toolInput = h?.tool_input ?? h?.input ?? {};
  if (!isGatedTool(toolName, toolInput)) return { decision: "approve", reason: "non-gated tool" };

  if (!(await aliveFn(env, 300))) return { decision: "approve", reason: "ollama not alive (fail-open)" };

  let engine = null;
  try {
    engine = await engineLoader(env);
  } catch {
    engine = null;
  }
  if (!engine || typeof engine.plan !== "function") {
    return { decision: "approve", reason: "engine not loadable (fail-open)" };
  }

  const prevInflight = env.PRISM_RBA_IN_FLIGHT;
  const prevViaMcp = env.PRISM_LOCAL_LLM_VIA_MCP;
  const prevDepth = env.PRISM_RBA_DEPTH;
  env.PRISM_RBA_IN_FLIGHT = "1";
  env.PRISM_LOCAL_LLM_VIA_MCP = "0";
  env.PRISM_RBA_DEPTH = String(Number(prevDepth || 0) + 1);
  // RBA-INFERENCE-LANE-MS0 (producer side): hold a HIGH-priority cross-process lease for the
  // duration of the vote so background Ollama callers can yield to it (the consumer wiring in the
  // shared bridges is operator-gated, separate). Reached ONLY when RBA is enabled (default-off,
  // line 156), so this is dormant by default. Fail-soft: a missing lease lib -> no priority, the
  // gate proceeds exactly as before. The lease TTL self-expires so a missed release never starves.
  const capMs = Number(env.PRISM_RBA_CAP_MS || 2500);
  let lease = { release() {} };
  try {
    const leaseMod = await import("../../scripts/lib/ollama-priority-lease.mjs");
    lease = leaseMod.acquireLease({ priority: leaseMod.PRIORITY.RBA, ttlMs: capMs + 200, holder: `rba-${process.pid}` });
  } catch { /* lease unavailable -> proceed without priority (fail-open) */ }
  let v;
  try {
    v = await raceWithCap(
      engine.plan({ intent: `${toolName}: ${headOf(toolInput)}`, tool_name: toolName, tool_input: toolInput }),
      capMs,
    );
  } catch {
    v = { verdict: "PROCEED", agreementScore: 1, rationale: "engine threw (fail-open)", path: "fail-open" };
  } finally {
    try { lease.release(); } catch { /* best-effort; the TTL self-expires regardless */ }
    if (prevInflight === undefined) delete env.PRISM_RBA_IN_FLIGHT;
    else env.PRISM_RBA_IN_FLIGHT = prevInflight;
    if (prevViaMcp === undefined) delete env.PRISM_LOCAL_LLM_VIA_MCP;
    else env.PRISM_LOCAL_LLM_VIA_MCP = prevViaMcp;
    if (prevDepth === undefined) delete env.PRISM_RBA_DEPTH;
    else env.PRISM_RBA_DEPTH = prevDepth;
  }

  const verdict = v && typeof v.verdict === "string" ? v.verdict : "PROCEED";
  const score = v && typeof v.agreementScore === "number" ? v.agreementScore : 1;
  const rationale = (v && v.rationale) || "";

  if (verdict === "BLOCK" && isEnforcing(env) && governanceAllows(toolName, env)) {
    return { decision: "block", reason: `[RBA GATE] BLOCK score=${score.toFixed(2)}: ${rationale}` };
  }
  if (verdict !== "PROCEED") {
    return { decision: "approve", additionalContext: `[RBA ${verdict}] ${rationale} (score ${score.toFixed(2)})` };
  }
  return { decision: "approve" };
}

// ---------------------------------------------------------------------------
// Entry point (runs only when invoked directly, not when imported by a test)
// ---------------------------------------------------------------------------

function readStdin() {
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function emit(out) {
  if (out.decision === "block") {
    process.stdout.write(JSON.stringify({ decision: "block", reason: out.reason }));
  } else if (out.additionalContext) {
    process.stdout.write(JSON.stringify({ decision: "approve", additionalContext: out.additionalContext }));
  } else {
    process.stdout.write(JSON.stringify({ decision: "approve" }));
  }
}

async function main() {
  emit(await decide({ stdin: readStdin(), env: process.env }));
}

const invokedPath = (process.argv[1] || "").replace(/\\/g, "/");
if (invokedPath.endsWith("reason-before-action-gate.mjs")) {
  main().catch(() => process.stdout.write(JSON.stringify({ decision: "approve" })));
}
