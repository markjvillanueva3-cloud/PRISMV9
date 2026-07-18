#!/usr/bin/env node
// tier: T3
/**
 * pre-tool-router-table-advise.mjs — unified router-table consumer hook
 *
 * PSN-TOOL-SAVINGS-MULTI (2026-05-24, slot:alpha — Agent 3 of router-table trio)
 *
 * PreToolUse advisory hook (any tool) that consults the unified router-table
 * (shipped by Agent 2 as `H:/prism/scripts/lib/token-savings-router-table.mjs`)
 * for the EXACT command/dispatcher/skill to use for a given tool invocation.
 *
 * Pipeline:
 *   1. tool_name + tool_input → candidateNodeId via commandToCandidateId()
 *   2. candidateNodeId → route via lookupRoute() (lazy-imported, fail-soft)
 *   3. Non-advisory kinds (rtk-wrap / mcp-route / ollama-offload / skill)
 *      → emit additionalContext nudge naming the exact replacement
 *   4. Advisory-kind / no-route / no-lib → continue silently
 *
 * Pure helpers exported for tests:
 *   - commandToCandidateId(toolName, toolInput) → string | null
 *   - buildNudge(route, candidateId) → string
 *   - decideRoute(toolName, toolInput, routerLib) → { nudge, reason, msg }
 *
 * Tier: T3 (advisory only — never blocks).
 * Knob: PRISM_ROUTER_TABLE_ADVISE_DISABLE=1 to silence entirely.
 * Telemetry: state/shared/dashboards/pre-tool-router-table-advise.jsonl
 *
 * Karpathy R5 checklist applied:
 *   1. CLASSIFY — heuristic-mapper + table-lookup (deterministic, no LLM)
 *   2. TECHNIQUE — lazy import + try/catch wrap (router lib may not exist yet)
 *   3. EDGE CASES — null tool_input, unknown tool_name, missing lib, malformed route
 *   4. FAILURE MODES — never block (T3 advisory), pass() on any error
 *   5. WRITE — fail-soft from line 1
 */

import { readFileSync, existsSync, mkdirSync, appendFileSync } from "node:fs";
import { dirname } from "node:path";
import { pathToFileURL } from "node:url";

const TELEMETRY = "H:/prism/state/shared/dashboards/pre-tool-router-table-advise.jsonl";
const ROUTER_LIB_PATH = "H:/prism/scripts/lib/token-savings-router-table.mjs";

// Non-advisory kinds — these have a concrete actionable replacement.
// Advisory kinds (advise-only, etc.) skip emission.
const ACTIONABLE_KINDS = new Set(["rtk-wrap", "mcp-route", "ollama-offload", "skill"]);

// ────────────────────────────────────────────────────────────────────────────
// commandToCandidateId — tool_name + tool_input → router-table node ID
// ────────────────────────────────────────────────────────────────────────────
//
// Heuristic mapper (deterministic). Returns null when no plausible candidate.
// Node-ID conventions match the spec:
//   • Bash `git log …`   → "rtk.git"
//   • Bash `node …`      → "rtk.node"
//   • Bash `gh …`        → "rtk.gh"
//   • Bash `npm …`       → "rtk.npm"
//   • Bash `vitest …`    → "rtk.vitest"
//   • Bash `tsc …`       → "rtk.tsc"
//   • Bash `docker …`    → "rtk.docker"
//   • Bash `grep …`      → "rtk.grep"
//   • Bash `cat …`       → "rtk.cat"
//   • Read on huge known file → "route.read-digest"
//   • WebSearch with PRISM keywords → "route.master-index"
//   • Grep with short broad pattern → "route.master-index"
//
// Already-wrapped commands (`rtk <x>` / `command <x>`) return null — no
// double-nudge.
export const RTK_WRAPPABLE_BIN = [
  "git", "node", "gh", "npm", "npx", "pnpm", "vitest", "tsc", "docker",
  "kubectl", "grep", "cat", "find", "ls", "curl", "wget", "prisma",
  "playwright", "cargo", "lint", "prettier",
];

const PRISM_LOCAL_KEYWORDS = [
  "PRISM", "MCP dispatcher", "atomic-roadmap", "duplicationGuard",
  "PRISMSelfAwareness", "ENGINE_DIGEST", "DISPATCHER_DIGEST",
  "system-graph.json", "BUILD_STATE", "MILESTONE_PROGRESS", "chat-slots",
  "JM Die", "Kienzle",
];

const READ_DIGEST_SUFFIXES = [
  "/state/shared/system-viz/system-graph.json",
  "/PRISM-INVENTORY-LATEST.md",
  "/state/shared/AGENT_CHAT.jsonl",
  "/mcp-server/data/docs/ENGINE_DIGEST.md",
  "/mcp-server/data/docs/DISPATCHER_DIGEST.md",
];

export function commandToCandidateId(toolName, toolInput) {
  if (!toolName || typeof toolName !== "string") return null;
  const ti = toolInput && typeof toolInput === "object" ? toolInput : {};

  if (toolName === "Bash") {
    const cmd = typeof ti.command === "string" ? ti.command.trim() : "";
    if (!cmd) return null;
    // Skip already-wrapped invocations (no double-nudge)
    if (/^(?:rtk|command)\s+\S/i.test(cmd)) return null;
    // First token of the command — strip leading env-var assignments
    const stripped = cmd.replace(/^(?:[A-Z_]+=\S+\s+)+/, "");
    const first = (stripped.match(/^([A-Za-z0-9_.-]+)/) || [])[1];
    if (!first) return null;
    const bin = first.toLowerCase().replace(/\.exe$/, "");
    if (RTK_WRAPPABLE_BIN.includes(bin)) {
      return `rtk.${bin}`;
    }
    return null;
  }

  if (toolName === "Read") {
    const fp = typeof ti.file_path === "string" ? ti.file_path : "";
    if (!fp) return null;
    const hasWindow = (typeof ti.offset === "number" && ti.offset > 0)
      || (typeof ti.limit === "number" && ti.limit > 0);
    if (hasWindow) return null;
    const norm = fp.replace(/\\/g, "/");
    for (const sfx of READ_DIGEST_SUFFIXES) {
      if (norm.endsWith(sfx)) return "route.read-digest";
    }
    return null;
  }

  if (toolName === "WebSearch") {
    const q = typeof ti.query === "string" ? ti.query : "";
    if (!q) return null;
    const lower = q.toLowerCase();
    for (const kw of PRISM_LOCAL_KEYWORDS) {
      if (lower.includes(kw.toLowerCase())) return "route.master-index";
    }
    return null;
  }

  if (toolName === "Grep") {
    const pattern = typeof ti.pattern === "string" ? ti.pattern : "";
    const path = typeof ti.path === "string" ? ti.path : "";
    if (!pattern) return null;
    const tokens = pattern.match(/[A-Za-z][A-Za-z0-9_]{2,}/g) || [];
    const isShort = tokens.length <= 2 && pattern.length <= 40;
    const isBroad = !path || /^[A-Za-z]:?[\\/]?$|^\.?$|^\/$/.test(path.trim());
    if (isShort && isBroad) return "route.master-index";
    return null;
  }

  return null;
}

// ────────────────────────────────────────────────────────────────────────────
// buildNudge — format a router-table route into a 1-line advisory message
// ────────────────────────────────────────────────────────────────────────────
//
// Route shape (Agent-2 contract):
//   { id, kind, replacement, savingsPct?, reason? }
// Tolerant of partial shapes — graceful degradation when fields are missing.
export function buildNudge(route, candidateId) {
  if (!route || typeof route !== "object") return "";
  const kind = route.kind || "unknown";
  const replacement = route.replacement || route.target || route.command || "";
  const savings = typeof route.savingsPct === "number" ? ` (~${route.savingsPct}% token savings)` : "";
  const reason = route.reason ? ` — ${route.reason}` : "";
  const prefix = kind === "ollama-offload" ? "🦙"
    : kind === "mcp-route" ? "🔌"
    : kind === "skill" ? "⚡"
    : "💡";
  const kindLabel = {
    "rtk-wrap": "RTK wrap",
    "mcp-route": "MCP dispatcher route",
    "ollama-offload": "Ollama local-LLM offload",
    "skill": "skill",
  }[kind] || kind;
  return `${prefix} Router-table suggests \`${replacement || candidateId}\` (${kindLabel})${savings}${reason}.`;
}

// ────────────────────────────────────────────────────────────────────────────
// decideRoute — pure decision function (router lib injected for testability)
// ────────────────────────────────────────────────────────────────────────────
//
// routerLib param shape: { lookupRoute(id) → route | null | undefined }
// Returns: { nudge: boolean, reason: string, msg: string, candidateId: string|null }
export function decideRoute(toolName, toolInput, routerLib) {
  const candidateId = commandToCandidateId(toolName, toolInput);
  if (!candidateId) {
    return { nudge: false, reason: "no-candidate-id", msg: "", candidateId: null };
  }
  if (!routerLib || typeof routerLib.lookupRoute !== "function") {
    return { nudge: false, reason: "router-lib-unavailable", msg: "", candidateId };
  }
  let route;
  try {
    route = routerLib.lookupRoute(candidateId);
  } catch {
    return { nudge: false, reason: "lookup-threw", msg: "", candidateId };
  }
  if (!route || typeof route !== "object") {
    return { nudge: false, reason: "no-route-for-candidate", msg: "", candidateId };
  }
  const kind = route.kind || "";
  if (!ACTIONABLE_KINDS.has(kind)) {
    return { nudge: false, reason: `non-actionable-kind:${kind || "missing"}`, msg: "", candidateId };
  }
  const msg = buildNudge(route, candidateId);
  if (!msg) {
    return { nudge: false, reason: "empty-nudge-message", msg: "", candidateId };
  }
  return { nudge: true, reason: `route-found:${kind}`, msg, candidateId };
}

// ────────────────────────────────────────────────────────────────────────────
// IO wrappers (not exercised by unit tests — covered by smoke runs)
// ────────────────────────────────────────────────────────────────────────────
function pass() { process.stdout.write(JSON.stringify({ continue: true })); }
function emit(msg) {
  process.stdout.write(JSON.stringify({
    continue: true,
    hookSpecificOutput: { hookEventName: "PreToolUse", additionalContext: msg },
  }));
}

function recordTelemetry(decision, toolName) {
  try {
    if (!existsSync(dirname(TELEMETRY))) mkdirSync(dirname(TELEMETRY), { recursive: true });
    appendFileSync(TELEMETRY, JSON.stringify({
      ts: new Date().toISOString(),
      tool: toolName,
      candidateId: decision.candidateId || null,
      nudge: decision.nudge,
      reason: decision.reason,
    }) + "\n");
  } catch { /* fail-soft */ }
}

// Lazy-load the router lib. Failure modes (file missing, syntax error, malformed
// exports) all silently degrade to "no nudge" — this hook is T3 advisory.
async function loadRouterLib() {
  try {
    if (!existsSync(ROUTER_LIB_PATH)) return null;
    const mod = await import(pathToFileURL(ROUTER_LIB_PATH).href);
    if (mod && typeof mod.lookupRoute === "function") return mod;
    return null;
  } catch {
    return null;
  }
}

async function main() {
  if (process.env.PRISM_ROUTER_TABLE_ADVISE_DISABLE === "1") return pass();
  let input;
  try { input = JSON.parse(readFileSync(0, "utf8") || "{}"); } catch { return pass(); }
  const toolName = input.tool_name || "";
  const toolInput = input.tool_input || {};
  const routerLib = await loadRouterLib();
  const decision = decideRoute(toolName, toolInput, routerLib);
  recordTelemetry(decision, toolName);
  if (!decision.nudge) return pass();
  emit(decision.msg);
}

if (process.argv[1] && process.argv[1].endsWith("pre-tool-router-table-advise.mjs")) {
  main().catch(() => pass());
}
