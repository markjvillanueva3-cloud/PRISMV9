#!/usr/bin/env node
/**
 * meta-task-suppressor.mjs — shared guard for noisy auto-injectors.
 *
 * Both `discipline-expert-inject.mjs` and `comprehensive-build-enforce.mjs`
 * fire generic boilerplate (PhD expert blocks / build enforcement directive)
 * on every UserPromptSubmit. The directives ARE useful for domain/build work
 * but PURE NOISE for meta tasks (audit/inventory/hook/skill/dispatcher/settings
 * /slot/fleet/etc — the prompts that are about PRISM machinery itself rather
 * than about cutting a part or shipping a feature).
 *
 * This helper is the single place to classify a prompt as meta-vs-domain;
 * both noise hooks call it before their existing rate-limit + emit, and
 * suppress when meta.
 *
 * AUTO-INVOCATION-MS0/U-AIM01 (2026-05-16). Sister to wiki-domain-bias.mjs.
 *
 * USAGE (from a hook):
 *   import { isMetaTask } from "../helpers/meta-task-suppressor.mjs";
 *   const verdict = isMetaTask(prompt);
 *   if (verdict.suppress) silentOk();
 *
 * The function is PURE (no I/O, no side effects). Callable from any context.
 *
 * Knobs (env):
 *   PRISM_META_SUPPRESS_DISABLE=1   never suppress (always treat as domain)
 *   PRISM_META_SUPPRESS_VERBOSE=1   log decision to telemetry (caller's job)
 *
 * --- DESIGN NOTE: why NOT contextPriorityEngine.classifyTask?
 * (OBSOLESCENCE-CLEANUP-MS0/U-OBS-A3, 2026-05-17)
 *
 * PRISM ships `contextPriorityEngine.classifyTask(prompt)` at
 * `mcp-server/src/engines/ContextPriorityEngine.ts`, surfaced via
 * `prism_context:priority_classify_task` (contextDispatcher.ts line 1207).
 * That engine returns rich classification {taskType, domain, complexity, ...}
 * and would technically subsume this helper's binary meta-vs-domain output.
 *
 * We deliberately DO NOT call it from here. Reasons:
 *   1. Latency budget — UserPromptSubmit hooks must complete in <50ms across
 *      ~150 wired hooks. A keyword scan is sub-ms; an MCP dispatcher round-trip
 *      is 50-200ms (cold). At 13 concurrent chats × every prompt, the cost is
 *      load-bearing. Karpathy R5: "Model only for judgment calls."
 *   2. Boot ordering — hooks fire BEFORE the MCP server may be reachable
 *      (e.g., SessionStart preceded by a server restart). A keyword fallback
 *      is required regardless; making the engine path "optional augmentation"
 *      doubles the failure surface for marginal accuracy gain.
 *   3. Determinism — keyword buckets are auditable in this file. Engine
 *      classification depends on state files + model weights that drift
 *      independently. Multi-chat fleet stability prefers determinism here.
 *
 * If future evidence shows keyword misclassification dominates, revisit by
 * adding `--via-engine` flag, NOT by replacing the keyword path. The engine
 * call should never be the SOLE classifier in a hot-path hook.
 */

// Meta-task keywords — suppress when ≥META_MIN_TOKEN_HITS distinct tokens match
// across all buckets. Each entry is a Set so membership check is O(1) per
// token; we lowercase the prompt once and split on word boundaries.
//
// Rule chosen 2026-05-16 after test failures: requiring ≥2 distinct *buckets*
// missed real meta prompts like "look for nodes that need updating reflecting
// whats now built" (multiple audit-bucket tokens, only one bucket). Counting
// individual token hits catches single-bucket-but-dense signal.
const META_MIN_TOKEN_HITS = 2;
const META_BUCKETS = [
  {
    name: "audit",
    tokens: new Set([
      "audit", "audits", "auditing",
      "inventory", "scan", "scanning",
      "drift", "stale", "staleness",
      "reflect", "reflecting", "reflection",
      "snapshot",
      "update", "updates", "updating",
      "optimize", "optimizing", "optimization",
      "usage", "utilization", "utilize", "utilizing", "underutilizing",
      "intake",
    ]),
  },
  {
    name: "harness",
    tokens: new Set([
      "hook", "hooks",
      "skill", "skills",
      "dispatcher", "dispatchers",
      "settings", "settings.json",
      "wrapper", "wrappers",
      "injector", "inject", "injection", "injections",
      "invocation", "invocations",
      "pipeline", "pipelines",
    ]),
  },
  {
    name: "fleet",
    tokens: new Set([
      "slot", "slots",
      "fleet",
      "chat", "chats", "chat-bus", "chatbus",
      "handoff", "handoffs",
      "worktree", "worktrees",
      "compact", "precompact",
      "claude.md", "memory.md",
    ]),
  },
  {
    name: "system",
    tokens: new Set([
      "system-viz", "systemviz",
      "obsidian", "vault",
      "wiki", "tribal",
      "awareness",
      "claude-code", "claude code",
      "mcp", "engine", "engines",
      "node", "nodes",
    ]),
  },
];

// Strong-domain tokens — if any present, override meta classification.
// Domains we DEFINITELY want the discipline-expert + build-enforce to fire on
// even if some meta tokens incidentally appear.
const STRONG_DOMAIN = new Set([
  "kienzle", "feed-rate", "spindle-speed",
  "g-code", "gcode",
  "drilling", "milling-strategy", "turning-strategy",
  "blueprint-extract", "tolerance-stack",
  "wire-edm-program", "wedm-program",
  "5axis-toolpath", "rtcp",
  "quote", "quoting", "invoice", "invoicing",
  "fixture", "workholding",
  "spc", "cmm", "cpk",
  "customer", "shop-floor",
]);

const SAFE_MAX_LEN = 50000;
const TOKEN_RE = /[a-zA-Z][a-zA-Z0-9-_.]+/g;

/**
 * Classify a prompt as meta vs domain.
 * @param {string} prompt — raw UserPromptSubmit text
 * @returns {{suppress:boolean, reason:string, bucketsHit:number, strongDomainHit:boolean}}
 */
export function isMetaTask(prompt) {
  if (process.env.PRISM_META_SUPPRESS_DISABLE === "1") {
    return { suppress: false, reason: "disabled-via-env", bucketsHit: 0, strongDomainHit: false };
  }
  if (typeof prompt !== "string" || prompt.length === 0) {
    // Empty/non-string prompts are not meta — let the caller's normal flow run.
    return { suppress: false, reason: "empty-prompt", bucketsHit: 0, strongDomainHit: false };
  }
  // Cap scan length to bound CPU on adversarial-size inputs.
  const text = (prompt.length > SAFE_MAX_LEN ? prompt.slice(0, SAFE_MAX_LEN) : prompt).toLowerCase();

  const tokens = new Set(text.match(TOKEN_RE) || []);

  // Strong-domain check first — short-circuit if hit.
  for (const t of tokens) {
    if (STRONG_DOMAIN.has(t)) {
      return { suppress: false, reason: `strong-domain:${t}`, bucketsHit: 0, strongDomainHit: true };
    }
  }

  // Count individual meta-token hits across ALL buckets. Track distinct
  // buckets too (still useful for telemetry — informs whether the meta-ness
  // is cross-cutting or concentrated).
  let tokenHits = 0;
  const bucketsHitSet = new Set();
  const matchedTokens = [];
  for (const bucket of META_BUCKETS) {
    for (const t of bucket.tokens) {
      if (tokens.has(t)) {
        tokenHits++;
        bucketsHitSet.add(bucket.name);
        matchedTokens.push(t);
      }
    }
  }
  const bucketsHit = bucketsHitSet.size;

  if (tokenHits >= META_MIN_TOKEN_HITS) {
    return {
      suppress: true,
      reason: `meta-task: ${tokenHits} tokens (${matchedTokens.slice(0, 4).join(",")}) across ${bucketsHit} bucket(s)`,
      bucketsHit,
      tokenHits,
      strongDomainHit: false,
    };
  }
  return {
    suppress: false,
    reason: tokenHits === 1 ? `single-token:${matchedTokens[0]}` : "no-meta-tokens",
    bucketsHit,
    tokenHits,
    strongDomainHit: false,
  };
}

// Self-test when invoked directly (node meta-task-suppressor.mjs)
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}`) {
  const samples = [
    { p: "look for nodes that need updating reflecting whats now built and optimize their usage", expect: true },
    { p: "audit + replace auto-injection pipelines", expect: true },
    { p: "add a 13th chat slot to fleet (mike) — intake everywhere", expect: true },
    { p: "calculate kienzle feed rate for AISI 1045 with 12mm endmill", expect: false },
    { p: "implement a new dispatcher for the lathe", expect: false }, // single bucket
    { p: "set up wedm-program for sodick AQ327L with brass wire", expect: false }, // strong domain
    { p: "", expect: false }, // empty
    { p: "x".repeat(70000), expect: false }, // oversize
    { p: null, expect: false }, // non-string
    { p: undefined, expect: false }, // undefined
  ];
  let pass = 0, fail = 0;
  for (const s of samples) {
    const r = isMetaTask(s.p);
    const ok = r.suppress === s.expect;
    if (ok) pass++; else fail++;
    console.log(`${ok ? "PASS" : "FAIL"}  expect=${s.expect}  got=${r.suppress}  reason=${r.reason}  prompt=${JSON.stringify(typeof s.p === "string" ? s.p.slice(0, 60) : s.p)}`);
  }
  console.log(`\n${pass}/${pass+fail} pass`);
  process.exit(fail === 0 ? 0 : 1);
}
