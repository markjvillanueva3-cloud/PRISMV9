// tier: T4
// NOTE: no shebang. The hook runs via explicit `node X.mjs` in the harness's
// UserPromptSubmit chain — never chmod+x. vite's SSR transform does not strip
// a line-1 `#!` and injects its preamble above, stranding the `#!` mid-file
// and breaking vitest's import of this file. Removing it is the cleanest fix.
/**
 * ollama-task-offloader.mjs — UserPromptSubmit hook
 * RE-ENABLED: 2026-04-26 (LOCAL-LLM-MS0 U-LLMH01)
 *
 * Analyzes incoming prompts and suggests offloading simple tasks to Ollama:
 * - Code explanations → Ollama (free)
 * - Search summaries → Ollama (free)
 * - Documentation → Ollama (free)
 * - Code generation → Keep on Claude (quality)
 *
 * FIRES ON: UserPromptSubmit
 * BLOCKING: never — advisory only
 * TOKEN SAVINGS: 80-95% for offloadable tasks
 *
 * RATE LIMITING (LOCAL-LLM-MS0):
 * - Max 1 suggestion per 5 minutes per task category
 * - Confidence threshold: >80% to inject context
 * - Silent mode: logs to file, only injects when offload_score > 0.9
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { recordOllamaEvent } from "./lib/ollama-stats.mjs";
// SYSTEM-VIZ-BRAIN-MS0/U-P4-OLLAMA-COST-ROUTING: cost-aware model selection.
// Replaces the previous hardcoded preference list — same category, smaller
// model when the task is trivial; escalates upward (never downward) when the
// target tier is absent. Pure function, deterministic, fully tested.
import { routeModelForTask } from "./lib/ollama-cost-router.mjs";

// OLLAMA-DEV-01: prefer 127.0.0.1 over `localhost` — on Windows the latter
// often resolves to ::1 (IPv6) but Ollama binds IPv4 by default, causing
// a silent 2s timeout that masquerades as "Ollama not installed".
const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const STATS_PATH = "H:/prism/mcp-server/data/state/ollama-offload-stats.json";
const HOOK_NAME = "ollama-task-offloader";
const RATE_LIMIT_PATH = "H:/prism/mcp-server/data/state/ollama-rate-limits.json";
// FLEET-REAPER-MS1: the routing hint written by scripts/fleet-reaper-sweep.mjs.
// CROSS-PROCESS CONTRACT — this literal MUST match the producer's
// DEFAULT_HINT_PATH (fleet-reaper-sweep.mjs). Hardcoded to the MAIN tree like
// STATS_PATH / RATE_LIMIT_PATH: hooks always run from H:/prism in production
// (settings.json points there), never a worktree, and the producer pins the
// hint to this same absolute path for exactly that reason. Injectable in tests
// via loadRoutingHint(now, hintPath).
const HINT_PATH = "H:/prism/state/shared/.ollama-routing-hint.json";
// OLLAMA-DEV-01: bumped from 2s to 4s — qwen2.5-coder:32b cold-load can
// take 3+s, and the /api/tags probe should never be the bottleneck.
const TIMEOUT_MS = 4000;
// OLLAMA-OFFLOAD-R4 (2026-05-17): lowered from 5min to 60s per category.
// 5min caps offload activity ~12x/hour; 60s allows ~60x/hour, raising
// offload rate toward 30% target (was stuck at 22.2%). Per-category gate
// still prevents storming a single classifier path. See CLAUDE.md F2 R4.
const RATE_LIMIT_MS = 60 * 1000;
const CONFIDENCE_THRESHOLD = 0.80;
// OLLAMA-OFFLOAD-R2 (2026-05-17): lowered from 0.90 to 0.80 so the
// inject threshold matches CONFIDENCE_THRESHOLD — eliminates the
// dead-band where a classifier was confident enough to route (>= 0.80)
// but not confident enough to inject (>= 0.90). Per CLAUDE.md F2 R2.
const INJECT_THRESHOLD = 0.80;
// FLEET-REAPER-MS1: hard clamp on the hint's thresholdDelta — mirrors the
// producer-side clamp in fleet-reaper-sweep.mjs so a tampered/corrupt hint
// file can never push the effective thresholds far out of range.
const HINT_THRESHOLD_DELTA_CAP = 0.30;
// FLEET-REAPER-MS1: the hint schema version this consumer understands. Mirrors
// the producer's HINT_SCHEMA_VERSION. A hint stamped with a DIFFERENT version
// is fail-soft rejected (a future producer could rename fields) — a hint with
// NO version is accepted leniently (forward-compat with the v1 producer).
const HINT_SCHEMA_VERSION = 1;

// Patterns evaluated in order — first match wins. PRISM-specific patterns
// MUST come before generic catalog patterns: a prompt like
// "list all WEDM engines" should match `prism_inventory` (savings 0.85) and
// not the generic `list all/the` catalog pattern (savings 0.75, below
// CONFIDENCE_THRESHOLD → recorded as silent suggest instead of offload).
const OFFLOADABLE_PATTERNS = [
  // PRISM-specific (added 2026-04-30 after audit found 26/27 keeps were
  // category="unknown" because the catalog patterns matched none of the
  // user's actual orchestration prompts). Higher confidence — catch first.
  { pattern: /\b(list|show|enumerate)\s+.*(engines?|dispatchers?|hooks?|skills?|actions?)\b/i, category: "prism_inventory", savings: 0.85 },
  { pattern: /\bwhat\s+(actions?|methods?|fields?)\s+.*(in|on|of|does)\s+\w+(dispatcher|engine|registry|schema)/i, category: "prism_introspect", savings: 0.85 },
  { pattern: /\b(summarize|recap|what.*happened in)\s+(the\s+)?(git\s+log|commits?|session|handoff)\b/i, category: "git_summary", savings: 0.88 },
  { pattern: /\b(check|verify|audit)\s+.*(inventory|count|digest|orphan|wiring)\b/i, category: "prism_audit", savings: 0.82 },
  { pattern: /\bdescribe\s+(this|the)\s+(file|module|function|class|engine|hook)\b/i, category: "explanation", savings: 0.88 },

  // Generic catalog patterns
  { pattern: /explain\s+(this|the|what|how|why)/i, category: "explanation", savings: 0.90 },
  { pattern: /what\s+(does|is|are)\s+/i, category: "explanation", savings: 0.85 },
  { pattern: /summarize|summary|tldr|overview/i, category: "summary", savings: 0.88 },
  { pattern: /search\s+(for|results?)|find\s+(files?|code)/i, category: "search_synthesis", savings: 0.80 },
  { pattern: /convert\s+(to|from)|format\s+(as|to)/i, category: "format_convert", savings: 0.92 },
  { pattern: /document|docstring|jsdoc|comment/i, category: "documentation", savings: 0.85 },
  { pattern: /list\s+(all|the)|show\s+(me|all)/i, category: "summary", savings: 0.75 },
];

// Keep-list: {pattern, category}[]. Tight patterns covering genuinely
// Claude-only signals. A positive OFFLOADABLE match wins; this list is
// the fallback labeler when no offload signal hits.
const KEEP_ON_CLAUDE = [
  // PRISM orchestration commands — keep on Claude (multi-tool, slot-binding,
  // /loop control-flow) but label honestly. This block was the missing tier:
  // every /checkin/loop/goal prompt previously fell through to "unknown".
  // Left-anchored to (start-of-string | whitespace) so a literal mention of a
  // slash-command inside English ("the /goal is ambitious") does NOT mis-label
  // as orchestration. Real invocations are always at line-start or after WS.
  { pattern: /(^|\s)\/(checkin|checkin-(alpha|bravo|charlie|delta|echo|foxtrot|golf|hotel|india|juliett|kilo|lima)|loop|goal|handoff|compact|precompact|forge-triple|forge-audit|forge|dedup|wire|scrutinize|pick-unit|pick-task|rgs|close-out-audit|close-out|fleet-reaper|envelope-sync|impact|smart|system-viz|wiki-query|master-index|pdf-learn|video-learn|shop-knowledge)\b/i, category: "orchestration" },
  // Safety+physics is fully gated by SAFETY_PRE at the top of classifyPrompt
  // (runs BEFORE OFFLOADABLE_PATTERNS). No keep-list entry needed here —
  // SAFETY_PRE returns before this loop is reached for any matching prompt.
  // Multi-file or codebase-wide work
  { pattern: /\b(refactor|restructure|reorganize)\s+(the|this|entire|whole|all)/i, category: "multi_file" },
  { pattern: /\b(across|throughout|all)\s+(files|the\s+codebase|the\s+repo)/i, category: "multi_file" },
  // Git ops that must run locally with full context
  { pattern: /\b(commit|push|deploy|merge|rebase)\s+(this|the|now|to|from)/i, category: "git_ops" },
  // Deep reasoning that needs Claude's chain-of-thought
  { pattern: /\b(root\s+cause|deep\s+(analysis|dive|reason|reasoning|thinking)|trace\s+through)\b/i, category: "deep_reasoning" },
  { pattern: /\b(forge|scrutinize)\b/i, category: "deep_reasoning" },
  // Operator directives (small, concrete imperatives that are NOT explanations)
  { pattern: /\b(fix|repair|diagnose|debug|investigate)\s+(this|the|that|prism|whatever|why)\b/i, category: "operator_directive" },
  { pattern: /\b(continue|resume|pick\s+up|where\s+you\s+left\s+off|keep\s+going|close\s+out|wrap\s+up|finish\s+up)\b/i, category: "operator_directive" },
  { pattern: /\b(sync|make\s+sure|ensure)\s+(the|h|c|files?|settings|drive|peer|chats)/i, category: "operator_directive" },
];

function loadStats() {
  try {
    if (existsSync(STATS_PATH)) {
      return JSON.parse(readFileSync(STATS_PATH, "utf8"));
    }
  } catch { /* use defaults */ }
  return {
    offloaded: 0,
    keptOnClaude: 0,
    estimatedTokensSaved: 0,
    lastUpdated: null,
    byCategory: {},
    byHook: {},
    events: [],
    silentSuggestions: 0, // Suggestions logged but not injected
    injectedSuggestions: 0, // Suggestions actually injected into context
  };
}

function loadRateLimits() {
  try {
    if (existsSync(RATE_LIMIT_PATH)) {
      return JSON.parse(readFileSync(RATE_LIMIT_PATH, "utf8"));
    }
  } catch { /* use defaults */ }
  return { lastSuggestion: {} };
}

function saveRateLimits(limits) {
  try {
    const dir = dirname(RATE_LIMIT_PATH);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(RATE_LIMIT_PATH, JSON.stringify(limits, null, 2));
  } catch { /* ignore */ }
}

function isRateLimited(category) {
  const limits = loadRateLimits();
  const lastTime = limits.lastSuggestion[category];
  if (!lastTime) return false;
  const elapsed = Date.now() - new Date(lastTime).getTime();
  return elapsed < RATE_LIMIT_MS;
}

function recordSuggestion(category) {
  const limits = loadRateLimits();
  limits.lastSuggestion[category] = new Date().toISOString();
  saveRateLimits(limits);
}

/**
 * FLEET-REAPER-MS1: load the routing hint written by scripts/fleet-reaper-sweep.mjs.
 *
 * The fleet-reaper coordinator writes this file when the host is under memory
 * pressure AND the GPU can absorb more Ollama work — it nudges this hook to
 * offload MORE aggressively (a NEGATIVE thresholdDelta lowers the confidence
 * bar so more tasks clear it). Best-effort + fail-soft: a missing / corrupt /
 * expired / non-aggressive hint returns null (no behaviour change). Never
 * throws — a hook must never break on an advisory side-channel.
 *
 * @param {number} [now]       clock injection (tests)
 * @param {string} [hintPath]  path injection (tests)
 * @returns {{ thresholdDelta:number, reason:string }|null}
 */
export function loadRoutingHint(now = Date.now(), hintPath = HINT_PATH) {
  let raw;
  try {
    if (!existsSync(hintPath)) return null;
    raw = readFileSync(hintPath, "utf8");
  } catch {
    return null; // unreadable — treat as no hint
  }
  let hint;
  try {
    hint = JSON.parse(raw);
  } catch {
    // Fail loud (one stderr line) but never throw — a corrupt hint is ignored.
    process.stderr.write("ollama-task-offloader: routing hint file is corrupt JSON — ignoring\n");
    return null;
  }
  if (!hint || typeof hint !== "object") return null;
  // Forward-compat: a hint stamped with a version we don't understand is
  // fail-soft rejected (a future producer may rename fields). A versionless
  // hint is accepted leniently — the v1 producer always stamps v1, so a
  // missing version means a hand-edited / pre-v1 file, treated as best-effort.
  if (hint.schemaVersion != null && hint.schemaVersion !== HINT_SCHEMA_VERSION) return null;
  // Only "aggressive-offload" applies a delta. "auto" and "disabled" both mean
  // "no threshold change" — the producer writes "auto" to NEUTRALIZE a stale
  // aggressive hint, so an "auto" file is the canonical "do nothing" statement.
  if (hint.mode !== "aggressive-offload") return null;
  const validUntilMs = Date.parse(hint.validUntil);
  if (!Number.isFinite(validUntilMs) || now > validUntilMs) return null; // expired / unparseable
  const rawDelta = Number(hint.thresholdDelta);
  if (!Number.isFinite(rawDelta) || rawDelta === 0) return null;
  // Clamp to [-CAP, +CAP] — defence-in-depth over the producer's own clamp.
  const thresholdDelta = Math.max(
    -HINT_THRESHOLD_DELTA_CAP, Math.min(HINT_THRESHOLD_DELTA_CAP, rawDelta),
  );
  return { thresholdDelta, reason: typeof hint.reason === "string" ? hint.reason : "" };
}

async function isOllamaAvailable() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return { available: false, models: [] };
    const data = await res.json();
    const models = (data.models || []).map(m => m.name);
    return { available: models.length > 0, models };
  } catch {
    clearTimeout(timeout);
    return { available: false, models: [] };
  }
}

// SAFETY_PRE: prompts mentioning canonical physics constants or safety-critical
// terms must NEVER offload, even if they also say "explain" or "summarize".
// Local Ollama models DO NOT carry mcp-server/src/physics/constants.ts (kc1.1
// per ISO group / Taylor / Johnson-Cook) — sending an "explain the kienzle
// model" prompt to a model lacking the constants produces wrong / hallucinated
// values, the exact failure class CLAUDE.md §SAFETY forbids one layer up.
//
// Token disambiguation rules:
//   • kienzle / johnson-cook / safety-critical — bare match (vanishingly rare
//     outside physics)
//   • taylor — must be followed by a physics-life-equation context word
//     (tool-life / wear / equation / formula). Excludes math (taylor series /
//     expansion) and names ("taylor swift").
//   • collision-check — must be followed by a manufacturing-context word
//     (on / for / the / toolpath / cycle / spindle / fixture / machine).
//     Excludes hash/git/CS collision-check usage.
const SAFETY_PRE = /\b(?:kienzle|johnson[-\s]cook|safety[-\s]critical|taylor\s+(?:tool[-\s]life|wear|equation|formula)|collision[-\s]check\s+(?:on|for|the|toolpath|cycle|spindle|fixture|machine)|(?:force|stress|thermal|deflection)\s+(?:calculation|model|verify|validate))\b/i;

// Unicode-confusable homoglyph map covering the three highest-volume confusable
// script families (Cyrillic + Greek + Latin-Extended) for ASCII lowercase
// targets in the safety vocab. Per Unicode TR39 §4 confusablesSummary.txt.
// Keys are the confusable codepoint; values the ASCII equivalent SAFETY_PRE
// expects. Without this map, an attacker (or copy-paste from a paper with
// Greek omicron pasted as Latin o) bypasses the canonical-name match.
const UNICODE_HOMOGLYPHS = {
  // Cyrillic
  "а": "a", "е": "e", "о": "o", "р": "p", "с": "c", "х": "x", "у": "y",
  "і": "i", "ј": "j", "к": "k",
  // Greek
  "α": "a", "ε": "e", "ο": "o", "ρ": "p", "ν": "v", "χ": "x", "ι": "i",
  "κ": "k", "μ": "u", "τ": "t", "γ": "y",
  // Latin-Extended (turkish dotless-i + slashed-o/l + others; NFKD does NOT
  // decompose these because they have no canonical equivalent).
  "ı": "i", "ł": "l", "đ": "d", "ø": "o",
};
const HOMOGLYPH_RX = /[аеорсхуіјкαεορνχικμτγıłđø]/g;
// Default_Ignorable_Code_Point covers the entire Unicode-defined set of
// invisible / format / control chars an attacker can splice into a banned word
// to evade \b: ZWSP/ZWNJ/ZWJ, BOM, SHY, bidi controls (LRO/RLO/LRM/RLM/LRE/
// RLE/PDF/LRI/RLI/FSI/PDI), word-joiner, Mongolian VS, variation selectors
// (FE00-FE0F + E0100-E01EF), tag chars (E0000-E007F). ~4174 codepoints in
// total — one regex covers all of them per Unicode TR9 + TR39.
const INVISIBLE_RX = /[̀-ͯ]|\p{Default_Ignorable_Code_Point}/gu;

/**
 * Normalize a (lowercased) prompt before safety-classifier inspection.
 * NFKD decomposition + default-ignorable strip + homoglyph remap closes the
 * bypass surface for: combining diacritics ("kïenzle"), zero-width / bidi
 * controls ("kien‮zle"), Cyrillic ("кienzle"), Greek ("jοhnson"), Latin-
 * Extended ("kıenzle"). Idempotent — safe to call on already-normalized input.
 * Operates on lowercased input — caller is responsible for `.toLowerCase()`.
 */
function normalizeForSafety(s) {
  return s.normalize("NFKD")
    .replace(INVISIBLE_RX, "")
    .replace(HOMOGLYPH_RX, (c) => UNICODE_HOMOGLYPHS[c] || c);
}

function classifyPrompt(prompt) {
  const p = prompt.toLowerCase();

  // Safety-physics pre-gate — see SAFETY_PRE comment above. Normalize first so
  // Unicode homoglyphs / zero-width splicing cannot evade the gate.
  if (SAFETY_PRE.test(normalizeForSafety(p))) {
    return { offloadable: false, category: "safety_physics", savings: 0 };
  }

  // OLLAMA-DEV-01: positive offload signal wins. If a prompt explicitly
  // says "explain X" or "summarize Y", offload even if it incidentally
  // contains "fix" or "add" elsewhere.
  for (const { pattern, category, savings } of OFFLOADABLE_PATTERNS) {
    if (pattern.test(p)) {
      return { offloadable: true, category, savings };
    }
  }

  // No positive offload signal — apply the keep-list as a final filter.
  // Each entry now carries its own category label for accurate telemetry.
  for (const { pattern, category } of KEEP_ON_CLAUDE) {
    if (pattern.test(p)) {
      return { offloadable: false, category, savings: 0 };
    }
  }

  return { offloadable: false, category: "unknown", savings: 0 };
}

// Test-only export: the helper that pure-tests can reach without spawning
// the hook process. Same classifier the hook uses at runtime.
export { classifyPrompt };

// Legacy `selectBestModel` was a single hardcoded preference list applied to
// every task category. Replaced 2026-05-15 by U-P4-OLLAMA-COST-ROUTING — see
// lib/ollama-cost-router.mjs (routeModelForTask) for the cost-aware decision.

async function main() {
  let payload;
  try {
    payload = JSON.parse(readFileSync(0, "utf-8"));
  } catch {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const prompt = payload.prompt || "";
  if (!prompt.trim() || prompt.length < 20) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const classification = classifyPrompt(prompt);

  if (!classification.offloadable) {
    recordOllamaEvent({
      hook: HOOK_NAME, decision: "keep", category: classification.category,
      extras: { snippet: prompt.slice(0, 80) },
    });
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  // FLEET-REAPER-MS1: apply the routing hint (if a valid one exists). A
  // negative thresholdDelta LOWERS the confidence bar so more tasks clear it —
  // the fleet-reaper coordinator writes this when commit pressure is high and
  // the GPU can absorb the work. Effective thresholds are clamped to [0,1].
  const hint = loadRoutingHint();
  const confidenceThreshold = hint
    ? Math.max(0, Math.min(1, CONFIDENCE_THRESHOLD + hint.thresholdDelta))
    : CONFIDENCE_THRESHOLD;
  const injectThreshold = hint
    ? Math.max(0, Math.min(1, INJECT_THRESHOLD + hint.thresholdDelta))
    : INJECT_THRESHOLD;

  if (isRateLimited(classification.category)) {
    recordOllamaEvent({ hook: HOOK_NAME, decision: "suggest", extras: { mode: "silent", reason: "rate-limited" } });
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  if (classification.savings < confidenceThreshold) {
    recordOllamaEvent({ hook: HOOK_NAME, decision: "suggest", extras: { mode: "silent", reason: "below-confidence" } });
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  // The hint CHANGED the outcome iff this task cleared the LOWERED bar but
  // would have failed the DEFAULT (un-hinted) bar. We don't fire a separate
  // event for it — that would land as a `suggest` and never reach the
  // dashboard's `byCategory` aggregate (only `offload` decisions do). Instead
  // the flag rides as `extras` on the real `offload` event below, so the
  // coordinator's extra-offload contribution is queryable per-category with
  // zero double-counting.
  const hintFlippedOutcome = !!(hint && classification.savings < CONFIDENCE_THRESHOLD);

  const ollama = await isOllamaAvailable();
  if (!ollama.available) {
    // OLLAMA-DEV-01: record the would-be-offloaded event so dashboards
    // show the lost-opportunity volume.
    recordOllamaEvent({
      hook: HOOK_NAME, decision: "suggest",
      category: classification.category,
      extras: { mode: "ollama-down", snippet: prompt.slice(0, 80) },
    });
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  // U-P4-OLLAMA-COST-ROUTING: pick a category-appropriate model tier instead
  // of always returning the first match from a hardcoded preference list. The
  // route result also carries `tier` (cheap/balanced/strong/best/fallback/none)
  // and `reason`, both of which ride along on the offload event so the
  // dashboard can audit whether the host actually held the model the task
  // wanted, or whether we escalated / fell back.
  const route = routeModelForTask({
    category: classification.category,
    available: ollama.models,
  });
  const model = route.model;
  const estimatedTokens = Math.ceil(prompt.length / 4) * 2;
  const savedTokens = Math.round(estimatedTokens * classification.savings);

  recordSuggestion(classification.category);

  // Always-on extras for cost-routing visibility. Merged with the optional
  // routing-hint extras below so a single offload event carries both signals.
  const costExtras = {
    modelTier: route.tier,
    modelReason: route.reason,
  };

  recordOllamaEvent({
    hook: HOOK_NAME, decision: "offload",
    category: classification.category, tokensSaved: savedTokens,
    extras: hintFlippedOutcome
      ? {
        ...costExtras,
        routingHint: true,
        thresholdDelta: hint.thresholdDelta,
        effectiveThreshold: confidenceThreshold,
        hintReason: hint.reason,
      }
      : costExtras,
  });

  if (classification.savings < injectThreshold) {
    recordOllamaEvent({ hook: HOOK_NAME, decision: "suggest", extras: { mode: "silent", reason: "below-inject-threshold" } });
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  recordOllamaEvent({ hook: HOOK_NAME, decision: "suggest", extras: { mode: "injected" } });

  // Reload stats just for the cumulative-savings display in the injected note.
  // Tolerate read failure (best-effort cosmetic only).
  let totalSaved = savedTokens;
  try {
    const cur = loadStats();
    totalSaved = cur.estimatedTokensSaved || savedTokens;
  } catch { /* best-effort */ }

  const ctx = [
    `💡 OFFLOAD OPPORTUNITY (${classification.category})`,
    `This "${classification.category}" task could run on local Ollama (${model})`,
    `Est. token savings: ~${savedTokens} tokens (${Math.round(classification.savings * 100)}%)`,
    `Total saved this session: ~${totalSaved} tokens`,
    "",
    "To use: the prompt-rewriter-ollama hook may already handle this.",
    "Or manually: ask Claude to delegate explanations/summaries to Ollama.",
  ].join("\n");

  console.log(JSON.stringify({
    continue: true,
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: ctx,
    },
  }));
}

// Import-safe guard: the FLEET-REAPER-MS1 test suite imports this module to
// exercise loadRoutingHint() directly. Without this guard, an import would run
// main() — which reads fd 0 (stdin) and would hang the vitest worker. Mirrors
// the same pattern in scripts/fleet-reaper-sweep.mjs.
const invokedAsCli = (() => {
  try {
    if (!process.argv[1]) return false;
    return pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
  } catch {
    return false;
  }
})();

if (invokedAsCli) {
  main().catch(() => {
    console.log(JSON.stringify({ continue: true }));
  });
}
