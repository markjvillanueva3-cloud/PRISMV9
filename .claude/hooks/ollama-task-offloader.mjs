#!/usr/bin/env node
// tier: T4
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
import { dirname } from "node:path";
import { recordOllamaEvent } from "./lib/ollama-stats.mjs";

// OLLAMA-DEV-01: prefer 127.0.0.1 over `localhost` — on Windows the latter
// often resolves to ::1 (IPv6) but Ollama binds IPv4 by default, causing
// a silent 2s timeout that masquerades as "Ollama not installed".
const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const STATS_PATH = "H:/prism/mcp-server/data/state/ollama-offload-stats.json";
const HOOK_NAME = "ollama-task-offloader";
const RATE_LIMIT_PATH = "H:/prism/mcp-server/data/state/ollama-rate-limits.json";
// OLLAMA-DEV-01: bumped from 2s to 4s — qwen2.5-coder:32b cold-load can
// take 3+s, and the /api/tags probe should never be the bottleneck.
const TIMEOUT_MS = 4000;
const RATE_LIMIT_MS = 5 * 60 * 1000; // 5 minutes per category
const CONFIDENCE_THRESHOLD = 0.80;
const INJECT_THRESHOLD = 0.90; // Only inject context above this score

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
  { pattern: /\b(summarize|recap|what.*happened in)\s+.*(git\s+log|commits?|changes?|session|handoff)\b/i, category: "git_summary", savings: 0.88 },
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

// OLLAMA-DEV-01 fix: previous patterns were too broad (every dev prompt
// contains "add" / "fix" / "implement"), so 14/14 prompts were KEPT on
// Claude even when they were perfectly explainable. Two changes:
//   1. Tightened patterns to genuinely Claude-only signals (safety,
//      physics constants, multi-file changes, deep reasoning).
//   2. Order inverted in classifyPrompt: a positive OFFLOADABLE match
//      now wins over KEEP_ON_CLAUDE — the keep list is the FALLBACK
//      for prompts with no clear offload signal, not a veto.
const KEEP_ON_CLAUDE = [
  // Safety + physics — never offload
  /\b(safety[-\s]critical|collision[-\s]check|kienzle|taylor|johnson[-\s]cook)\b/i,
  /\b(force|stress|thermal|deflection)\s+(calculation|model|verify|validate)/i,
  // Multi-file or codebase-wide work
  /\b(refactor|restructure|reorganize)\s+(the|this|entire|whole|all)/i,
  /\b(across|throughout|all)\s+(files|the\s+codebase|the\s+repo)/i,
  // Git ops that must run locally with full context
  /\b(commit|push|deploy|merge|rebase)\s+(this|the|now|to|from)/i,
  // Deep reasoning that needs Claude's chain-of-thought
  /\b(root\s+cause|deep\s+(analysis|dive)|trace\s+through)\b/i,
  /\b(forge|scrutinize)\b/i,
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

function classifyPrompt(prompt) {
  const p = prompt.toLowerCase();

  // OLLAMA-DEV-01: positive offload signal wins. If a prompt explicitly
  // says "explain X" or "summarize Y", offload even if it incidentally
  // contains "fix" or "add" elsewhere.
  for (const { pattern, category, savings } of OFFLOADABLE_PATTERNS) {
    if (pattern.test(p)) {
      return { offloadable: true, category, savings };
    }
  }

  // No positive offload signal — apply the keep-list as a final filter.
  for (const re of KEEP_ON_CLAUDE) {
    if (re.test(p)) {
      return { offloadable: false, category: "complex", savings: 0 };
    }
  }

  return { offloadable: false, category: "unknown", savings: 0 };
}

function selectBestModel(models) {
  const preference = [
    "qwen2.5-coder:7b",
    "qwen2.5-coder:14b",
    "codellama:7b",
    "deepseek-coder:6.7b",
    "llama3.2:3b",
  ];
  for (const want of preference) {
    if (models.includes(want)) return want;
  }
  return models[0] || null;
}

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

  if (isRateLimited(classification.category)) {
    recordOllamaEvent({ hook: HOOK_NAME, decision: "suggest", extras: { mode: "silent", reason: "rate-limited" } });
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  if (classification.savings < CONFIDENCE_THRESHOLD) {
    recordOllamaEvent({ hook: HOOK_NAME, decision: "suggest", extras: { mode: "silent", reason: "below-confidence" } });
    console.log(JSON.stringify({ continue: true }));
    return;
  }

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

  const model = selectBestModel(ollama.models);
  const estimatedTokens = Math.ceil(prompt.length / 4) * 2;
  const savedTokens = Math.round(estimatedTokens * classification.savings);

  recordSuggestion(classification.category);

  recordOllamaEvent({
    hook: HOOK_NAME, decision: "offload",
    category: classification.category, tokensSaved: savedTokens,
  });

  if (classification.savings < INJECT_THRESHOLD) {
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

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
});
