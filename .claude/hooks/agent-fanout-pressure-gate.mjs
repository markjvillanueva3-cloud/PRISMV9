#!/usr/bin/env node
// tier: T1
/**
 * agent-fanout-pressure-gate.mjs -- PreToolUse(Agent/Task/Workflow) fan-out admission gate.
 * GOLF-SKILLS-HOOKS-AUDIT / U-GSHA-FANOUT-GATE (slot:golf 2026-06-12).
 *
 * THE MISSING ARM. The Agent matcher already runs:
 *   - agent-vs-direct.mjs       -> "use a direct tool instead of an Agent" (zero-agent advice)
 *   - subagent-model-enforce.mjs-> DENIES a MECHANICAL task dispatched to opus/fable (model-tier leak)
 * Neither sees the failure mode that actually 429s the fleet: a BURST of agent spawns into an
 * already-hot multi-loop fleet. This session itself got "Server is temporarily limiting requests"
 * twice from spawning 4 *sonnet* review agents in <60s -- low per-agent cost, but a burst. A pure
 * cost gate cannot catch that; per-session BURST detection is the load-bearing signal here.
 *
 * Two cheap, in-process signals (no heavy fleet scan on the hot path):
 *   1. BURST  -- this session's own recent spawns (per-session sidecar, last-N ring). N spawns in a
 *                short window => the fleet-pressure pattern. Proxy for fleet load (every session's
 *                bursts compound the Anthropic-side concurrency limit).
 *   2. COST   -- this single spawn's projected cost = tier(model) x prompt-KB (Agent/Task), or
 *                concurrency x tier (Workflow, from the script's agent() count). Catches one big spawn.
 *
 * MODES (PRISM_AGENT_FANOUT_GATE): "warn" (advisory systemMessage -- DEFAULT, never blocks) |
 *   "strict" (DENY a flagged spawn unless [SCOPED]/force) | "off" (silent allow).
 * Default is ADVISORY -- a first-ship gate must never block a legit Agent call. Flip to strict only
 * after observing the advisories (the operator's call).
 *
 * FAIL-OPEN on every error path: a hook that throws must NEVER stop a tool call. All I/O is
 * best-effort and wrapped; any exception -> allow.
 *
 * Knobs: PRISM_AGENT_FANOUT_GATE(off|warn|strict) · PRISM_AGENT_FANOUT_BURST(default 4) ·
 *   PRISM_AGENT_FANOUT_WINDOW_MS(default 20000) · PRISM_AGENT_FANOUT_COST_CAP(default 12) ·
 *   PRISM_AGENT_FANOUT_MECHANICAL(strict|warn|off, default strict -- denies an all-mechanical
 *     Workflow fan-out, routing it to scripts/lib/ollama-fanout.mjs) ·
 *   PRISM_AGENT_FANOUT_FORCE=1 (one-shot bypass, also via [SCOPED] / --force-fanout in the prompt).
 */

import { readFileSync, appendFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const GATED_TOOLS = new Set(["Agent", "Task", "Workflow"]);
const TIER = { haiku: 0.25, sonnet: 1, opus: 5, fable: 5 };
const UNKNOWN_TIER = 3;            // unspecified model inherits the parent (here: opus-class) -> mild
const DEFAULT_BURST = 4;           // >= N spawns inside the window = a burst
const DEFAULT_WINDOW_MS = 20000;
const DEFAULT_COST_CAP = 12;       // tier x KB (Agent) or concurrency x tier (Workflow)
const RING_KEEP = 50;              // cap the per-session sidecar at the last N lines

const PRISM_ROOT = process.env.PRISM_ROOT || "H:/prism";
const SIDE_DIR = join(PRISM_ROOT, "state/shared/agent-fanout-pressure");

export function modelTier(model) {
  if (!model) return UNKNOWN_TIER;
  return TIER[String(model).toLowerCase()] ?? UNKNOWN_TIER;
}

// Rough concurrency for a Workflow: count agent()/parallel()/pipeline() fan-out in the script.
export function workflowConcurrency(script) {
  if (!script || typeof script !== "string") return 1;
  const agentCalls = (script.match(/\bagent\s*\(/g) || []).length;
  const parallels = (script.match(/\b(parallel|pipeline)\s*\(/g) || []).length;
  // each parallel/pipeline can fan many items; weight them, floor at the agent() count, min 1.
  return Math.max(1, agentCalls, parallels * 4);
}

// --- Mechanical-fan-out classification (U-FANOUT-MECH-ENFORCE) -----------------------------
// The leak the burst/cost arms miss: a Workflow whose agent() tasks are ALL mechanical
// (read/summarize/extract/map) belongs on the local GPU via scripts/lib/ollama-fanout.mjs, not N
// Claude agents (this session's own 707K-token recon was exactly that). Reuses routeClaudeTier
// (injected -> dynamically imported in main, so a classifier bug stays fail-open) instead of
// duplicating the tier classifier. [[feedback_auto_route_mechanical_fanout_to_ollama]]

/** Extract the string-literal first arg of each agent(...) call in a Workflow script. */
export function extractAgentPrompts(script) {
  if (!script || typeof script !== "string") return [];
  const re = /\bagent\s*\(\s*(`(?:[^`\\]|\\.)*`|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g;
  return [...script.matchAll(re)].map((m) => m[1].slice(1, -1));
}

// Confidently-cheap mechanical task-classes (the classifyTaskClass class labels for read/transform
// work). A fan-out is "mechanical" (route to local GPU) ONLY when EVERY agent is one of these.
// Everything else -- codegen/audit/synthesize/reason (heavy/judgment), safety_critical, OR an
// UNKNOWN/unclassified prompt -- counts as judgment => allow. This is a POSITIVE allowlist, NOT a
// tier-name check: it is robust to the 2026-06-18 coding->Sonnet retier (coding routes to sonnet but
// is never in this set) AND conservative (an unrecognized prompt like "refactor the routing module",
// which routes to sonnet but classifies as `unknown`, is judgment -> never a false hard-block).
const MECHANICAL_CLASSES = new Set(["summarize", "explain", "document", "classify", "format", "git_summary", "extract"]);

/**
 * Mechanical-heavy iff >=1 agent task classifies mechanical AND ZERO classify judgment.
 * Conservative by design (R12): any judgment/synthesis/CODING/unknown agent -> NOT mechanical ->
 * never false-block a real fan-out (a synthesis OR a builder pass must always pass). A classify
 * failure counts as judgment (allow).
 * @param {string[]} prompts  extracted agent() prompts
 * @param {(a:{task:string})=>{tier:string,taskClass?:string}} routeFn  classifier (DI: testable + fail-open)
 */
export function classifyWorkflowMechanical(prompts, routeFn) {
  if (!Array.isArray(prompts) || prompts.length === 0 || typeof routeFn !== "function") {
    return { mechanical: false, mechanicalCount: 0, judgmentCount: 0, total: 0 };
  }
  let mech = 0, judg = 0;
  for (const p of prompts) {
    let mechanical = false;
    try {
      const v = routeFn({ task: String(p || "") }) || {};
      const tier = String(v.tier || "").toLowerCase();
      const taskClass = String(v.taskClass || "").toLowerCase();
      // mechanical iff a confidently-cheap class AND not a top tier (belt-and-suspenders: a cheap
      // class never routes to opus/fable, but never count a top-tier verdict as mechanical).
      mechanical = MECHANICAL_CLASSES.has(taskClass) && !tier.includes("opus") && !tier.includes("fable");
    } catch { mechanical = false; } // classify-fail -> judgment (fail-safe: allow)
    if (mechanical) mech++; else judg++;
  }
  return { mechanical: mech >= 1 && judg === 0, mechanicalCount: mech, judgmentCount: judg, total: prompts.length };
}

export function estimateSpawnCost({ tool, model, prompt, description, script }) {
  const tier = modelTier(model);
  if (tool === "Workflow") {
    const concurrency = workflowConcurrency(script);
    return { tier, concurrency, kb: 0, cost: concurrency * tier };
  }
  const kb = (String(prompt || "").length + String(description || "").length) / 1024;
  return { tier, concurrency: 1, kb: Math.round(kb * 10) / 10, cost: Math.round(tier * Math.max(1, kb) * 10) / 10 };
}

// Pure decision: given this spawn's cost + burst count + mechanical-fan-out flag + modes, decide.
// TWO independent leak classes, each with its own enforce mode:
//   - rate (burst|cost): 429-protection. Denies only when `mode` === "strict" (default warn -> advise).
//   - mechanical: an all-mechanical Workflow fan-out belongs on Ollama. Denies when `mechMode`
//     === "strict" (DEFAULT -- the unambiguous leak, mirroring subagent-model-enforce's strict default).
// `scoped` (/[SCOPED]/ /--force-fanout/ /FORCE=1) always downgrades any deny to advise.
export function decideFanout({ cost, recentCount, costCap, burstCap, mode, scoped, mechanical = false, mechMode = "strict" }) {
  const reasons = [];
  if (recentCount >= burstCap) reasons.push(`burst: ${recentCount} agent spawns in the last window (>= ${burstCap}) -- bursts into the active fleet trigger server-side 429s`);
  if (cost >= costCap) reasons.push(`cost: projected spawn cost ${cost} >= cap ${costCap} (tier x prompt-KB / concurrency)`);
  const rateFlagged = reasons.length > 0;
  if (mechanical) reasons.push(`mechanical: every agent() task classifies mechanical (read/summarize/extract/map) -- route to scripts/lib/ollama-fanout.mjs (free local GPU), not N Claude agents`);
  if (reasons.length === 0) return { action: "allow", reasons };
  const deny = ((rateFlagged && mode === "strict") || (mechanical && mechMode === "strict")) && !scoped;
  return { action: deny ? "deny" : "advise", reasons };
}

function readRecentCount(sidecar, windowMs, nowMs) {
  try {
    if (!existsSync(sidecar)) return 0;
    const lines = readFileSync(sidecar, "utf8").split("\n").filter(Boolean).slice(-RING_KEEP);
    let n = 0;
    for (const ln of lines) {
      try { if (nowMs - JSON.parse(ln).ts <= windowMs) n++; } catch { /* skip bad line */ }
    }
    return n;
  } catch { return 0; }
}

function recordSpawn(sidecar, entry) {
  try {
    if (!existsSync(SIDE_DIR)) mkdirSync(SIDE_DIR, { recursive: true });
    appendFileSync(sidecar, JSON.stringify(entry) + "\n");
  } catch { /* best-effort telemetry; never block */ }
}

function emit(obj) { try { process.stdout.write(JSON.stringify(obj)); } catch { /* ignore */ } }

async function main() {
  const mode = (process.env.PRISM_AGENT_FANOUT_GATE || "warn").toLowerCase();
  if (mode === "off") { emit({ continue: true }); return; }

  let payload;
  try { payload = JSON.parse(readFileSync(0, "utf8")); } catch { emit({ continue: true }); return; }
  const tool = payload?.tool_name || payload?.tool || "";
  if (!GATED_TOOLS.has(tool)) { emit({ continue: true }); return; }

  const ti = payload?.tool_input || {};
  const text = `${ti.prompt || ""} ${ti.description || ""}`;
  const scoped = /\[SCOPED\]|--force-fanout/i.test(text) || process.env.PRISM_AGENT_FANOUT_FORCE === "1";

  const burstCap = Number(process.env.PRISM_AGENT_FANOUT_BURST || DEFAULT_BURST);
  const windowMs = Number(process.env.PRISM_AGENT_FANOUT_WINDOW_MS || DEFAULT_WINDOW_MS);
  const costCap = Number(process.env.PRISM_AGENT_FANOUT_COST_CAP || DEFAULT_COST_CAP);

  const session = String(payload?.session_id || payload?.sessionId || "unknown").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 64) || "unknown";
  const sidecar = join(SIDE_DIR, `${session}.jsonl`);
  const nowMs = Date.now();

  const est = estimateSpawnCost({ tool, model: ti.model, prompt: ti.prompt, description: ti.description, script: ti.script });
  const recentCount = readRecentCount(sidecar, windowMs, nowMs);
  // record THIS spawn (after reading the prior window, so it counts toward the NEXT call's burst)
  recordSpawn(sidecar, { ts: nowMs, tool, model: ti.model || "inherit", cost: est.cost });

  // Mechanical-fan-out arm: only a Workflow carries a multi-agent script worth classifying.
  // Dynamic import keeps a classifier bug fail-open (broken import -> mechanical=false -> allow).
  const mechMode = (process.env.PRISM_AGENT_FANOUT_MECHANICAL || "strict").toLowerCase();
  let mechanical = false;
  if (tool === "Workflow" && mechMode !== "off") {
    try {
      const { routeClaudeTier } = await import("../../scripts/lib/claude-tier-router.mjs");
      mechanical = classifyWorkflowMechanical(extractAgentPrompts(ti.script), routeClaudeTier).mechanical;
    } catch { mechanical = false; }
  }

  const verdict = decideFanout({ cost: est.cost, recentCount, costCap, burstCap, mode, scoped, mechanical, mechMode });
  if (verdict.action === "allow") { emit({ continue: true }); return; }

  const ladder = "FALLBACK LADDER (R5): route mine/read/summarize/classify arms to Ollama (free) or model:'sonnet'; reserve opus for judgment/synthesis. Serialize bursts -- spawn sequentially or in one parallel() barrier, not back-to-back messages.";
  const head = `[fanout-gate] ${tool} spawn flagged (model=${ti.model || "inherit"}, tier=${est.tier}${tool === "Workflow" ? `, ~${est.concurrency} agents` : `, ~${est.kb}KB`}, cost=${est.cost}).`;
  const body = verdict.reasons.map((r) => `  - ${r}`).join("\n");

  if (verdict.action === "deny") {
    emit({ decision: "block", reason: `${head}\n${body}\n${ladder}\nOverride: append [SCOPED] / --force-fanout, or set PRISM_AGENT_FANOUT_GATE=warn (rate arm) / PRISM_AGENT_FANOUT_MECHANICAL=warn (mechanical arm).` });
    return;
  }
  emit({ continue: true, hookSpecificOutput: { hookEventName: "PreToolUse", additionalContext: `${head}\n${body}\n${ladder}` } });
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop());
if (isMain) {
  // Top-level fail-open: this fires on EVERY Agent/Workflow spawn across all 26 slots.
  // Any uncaught error must degrade to "allow", never a non-zero exit that could stall a
  // legit tool call. emit() is itself try-wrapped; this is the last line of defense.
  main().catch(() => { try { process.stdout.write('{"continue":true}'); } catch { /* give up silently */ } });
}
