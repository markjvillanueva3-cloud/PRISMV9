#!/usr/bin/env node
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

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const STATS_PATH = "H:/prism/mcp-server/data/state/ollama-offload-stats.json";
const RATE_LIMIT_PATH = "H:/prism/mcp-server/data/state/ollama-rate-limits.json";
const TIMEOUT_MS = 2000;
const RATE_LIMIT_MS = 5 * 60 * 1000; // 5 minutes per category
const CONFIDENCE_THRESHOLD = 0.80;
const INJECT_THRESHOLD = 0.90; // Only inject context above this score

const OFFLOADABLE_PATTERNS = [
  { pattern: /explain\s+(this|the|what|how|why)/i, category: "explanation", savings: 0.90 },
  { pattern: /what\s+(does|is|are)\s+/i, category: "explanation", savings: 0.85 },
  { pattern: /summarize|summary|tldr|overview/i, category: "summary", savings: 0.88 },
  { pattern: /search\s+(for|results?)|find\s+(files?|code)/i, category: "search_synthesis", savings: 0.80 },
  { pattern: /convert\s+(to|from)|format\s+(as|to)/i, category: "format_convert", savings: 0.92 },
  { pattern: /document|docstring|jsdoc|comment/i, category: "documentation", savings: 0.85 },
  { pattern: /list\s+(all|the)|show\s+(me|all)/i, category: "summary", savings: 0.75 },
];

const KEEP_ON_CLAUDE = [
  /create|build|implement|write|add|fix|refactor/i,
  /edit|modify|change|update|replace/i,
  /safety|critical|collision|force|stress/i,
  /kienzle|taylor|physics|thermal/i,
  /commit|push|deploy|merge/i,
  /forge|scrutinize|verify/i,
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
    silentSuggestions: 0, // Suggestions logged but not injected
    injectedSuggestions: 0, // Suggestions actually injected into context
  };
}

function saveStats(stats) {
  try {
    const dir = dirname(STATS_PATH);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    stats.lastUpdated = new Date().toISOString();
    writeFileSync(STATS_PATH, JSON.stringify(stats, null, 2));
  } catch { /* ignore */ }
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

  for (const re of KEEP_ON_CLAUDE) {
    if (re.test(p)) {
      return { offloadable: false, category: "complex", savings: 0 };
    }
  }

  for (const { pattern, category, savings } of OFFLOADABLE_PATTERNS) {
    if (pattern.test(p)) {
      return { offloadable: true, category, savings };
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
  const stats = loadStats();

  if (!classification.offloadable) {
    stats.keptOnClaude++;
    saveStats(stats);
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  // Rate limiting: max 1 suggestion per 5 minutes per category
  if (isRateLimited(classification.category)) {
    stats.silentSuggestions = (stats.silentSuggestions || 0) + 1;
    saveStats(stats);
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  // Confidence threshold: only proceed if savings > 80%
  if (classification.savings < CONFIDENCE_THRESHOLD) {
    stats.silentSuggestions = (stats.silentSuggestions || 0) + 1;
    saveStats(stats);
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const ollama = await isOllamaAvailable();
  if (!ollama.available) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const model = selectBestModel(ollama.models);
  const estimatedTokens = Math.ceil(prompt.length / 4) * 2;
  const savedTokens = Math.round(estimatedTokens * classification.savings);

  // Record the suggestion for rate limiting
  recordSuggestion(classification.category);

  // Update stats
  stats.offloaded++;
  stats.estimatedTokensSaved += savedTokens;
  stats.byCategory[classification.category] = (stats.byCategory[classification.category] || 0) + 1;

  // Silent mode: only inject context if offload_score > 0.9
  // Otherwise just log silently and continue
  if (classification.savings < INJECT_THRESHOLD) {
    stats.silentSuggestions = (stats.silentSuggestions || 0) + 1;
    saveStats(stats);
    // Log to file but don't inject into context
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  // High-value suggestion: inject into context
  stats.injectedSuggestions = (stats.injectedSuggestions || 0) + 1;
  saveStats(stats);

  const ctx = [
    `💡 OFFLOAD OPPORTUNITY (${classification.category})`,
    `This "${classification.category}" task could run on local Ollama (${model})`,
    `Est. token savings: ~${savedTokens} tokens (${Math.round(classification.savings * 100)}%)`,
    `Total saved this session: ~${stats.estimatedTokensSaved} tokens`,
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
