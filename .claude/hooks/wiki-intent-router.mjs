#!/usr/bin/env node
/**
 * wiki-intent-router.mjs — UserPromptSubmit hook
 * INTEL-OLLAMA-OBSIDIAN-MS0/P4-U04
 *
 * Detects general-knowledge or wiki-intent prompts and injects the top-k
 * relevant entries from knowledge/wiki/index.md as additional context.
 *
 * Why: ~600 tokens saved vs the user (or main agent) reading raw wiki files.
 * The TF-IDF index scores 722 entries in <2 ms, so this is essentially free
 * on every prompt. We rate-limit to one injection per 30 s to avoid drowning
 * the agent in repeated wiki nudges during back-to-back prompts.
 *
 * Hook protocol — Claude Code:
 *   stdin  = JSON { hook_event_name, prompt, session_id, ... }
 *   stdout = JSON { continue: true, hookSpecificOutput?: { additionalContext } }
 *
 * Detection criteria (match ANY):
 *   1. Prompt explicitly contains "wiki", "wiki-lookup", "look up", "what is the"
 *   2. Prompt is a "what is X / how does X work / explain X / define X" form
 *   3. Prompt mentions an engine slug pattern (CamelCase ending in "Engine")
 *
 * Idempotent: best-effort, never throws into hook output, always emits {continue:true}.
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

// ──────────────────────────────────────────────────────────────────────────
// Path resolution — robust to invocation CWD
// ──────────────────────────────────────────────────────────────────────────

const HOOK_DIR = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w):\//, "$1:/"));
const REPO_ROOT = path.resolve(HOOK_DIR, "../..");
const ENGINE_BUILT = path.join(REPO_ROOT, "mcp-server", "dist", "engines", "WikiIndexQueryEngine.js");
const ENGINE_SRC = path.join(REPO_ROOT, "mcp-server", "src", "engines", "WikiIndexQueryEngine.ts");
const RATE_LIMIT_PATH = path.join(REPO_ROOT, "mcp-server", "data", "state", "wiki-intent-router-rate.json");

// Tuning constants
const RATE_LIMIT_MS = 30_000;       // one injection per 30 s
const TOP_K = 3;                    // results to inject
const MIN_SCORE = 0.05;             // ignore weak matches
const MAX_INJECT_TOKENS = 250;      // soft budget — abort if injection > this many ~tokens
const TOKEN_PER_CHAR = 0.25;        // rough estimate
const HARD_TIMEOUT_MS = 4_000;

// ──────────────────────────────────────────────────────────────────────────
// stdin / stdout helpers
// ──────────────────────────────────────────────────────────────────────────

function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return "";
    return fs.readFileSync(0, "utf-8");
  } catch {
    return "";
  }
}

function parsePayload(raw) {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

function emitContinue(extra = {}) {
  try { process.stdout.write(JSON.stringify({ continue: true, ...extra })); }
  catch { /* swallow */ }
}

// ──────────────────────────────────────────────────────────────────────────
// Intent detection — pure function, exported for testing
// ──────────────────────────────────────────────────────────────────────────

const EXPLICIT_INTENT_PATTERNS = [
  /\bwiki\b/i,
  /\blook\s*up\b/i,
  /\bwhat\s+is\s+the\b/i,
];

const KNOWLEDGE_QUESTION_PATTERNS = [
  /^\s*what\s+is\s+/i,
  /^\s*how\s+(does|do)\s+/i,
  /^\s*explain\s+/i,
  /^\s*define\s+/i,
  /^\s*tell\s+me\s+about\s+/i,
];

const ENGINE_SLUG_RE = /\b([A-Z][a-z0-9]+(?:[A-Z][a-z0-9]+)+Engine)\b/;

export function detectWikiIntent(prompt) {
  if (typeof prompt !== "string" || prompt.length === 0) {
    return { match: false, reason: "empty_prompt" };
  }
  for (const re of EXPLICIT_INTENT_PATTERNS) {
    if (re.test(prompt)) return { match: true, reason: "explicit_keyword" };
  }
  for (const re of KNOWLEDGE_QUESTION_PATTERNS) {
    if (re.test(prompt)) return { match: true, reason: "knowledge_question" };
  }
  const m = prompt.match(ENGINE_SLUG_RE);
  if (m) return { match: true, reason: "engine_slug", slug: m[1] };
  return { match: false, reason: "no_match" };
}

// ──────────────────────────────────────────────────────────────────────────
// Rate limit — best-effort file lock with timestamp
// ──────────────────────────────────────────────────────────────────────────

function shouldInject(now = Date.now()) {
  try {
    if (!fs.existsSync(RATE_LIMIT_PATH)) return true;
    const last = JSON.parse(fs.readFileSync(RATE_LIMIT_PATH, "utf-8"));
    if (typeof last.last_fired_at !== "number") return true;
    return (now - last.last_fired_at) >= RATE_LIMIT_MS;
  } catch {
    return true;
  }
}

function recordFired(now = Date.now()) {
  try {
    fs.mkdirSync(path.dirname(RATE_LIMIT_PATH), { recursive: true });
    fs.writeFileSync(RATE_LIMIT_PATH, JSON.stringify({ last_fired_at: now }));
  } catch { /* best-effort */ }
}

// ──────────────────────────────────────────────────────────────────────────
// Engine load — degrades gracefully if not built
// ──────────────────────────────────────────────────────────────────────────

async function loadEngine() {
  const candidate = fs.existsSync(ENGINE_BUILT) ? ENGINE_BUILT : null;
  if (!candidate) return null; // dev mode — engine not transpiled
  try {
    const mod = await import(pathToFileURL(candidate).href);
    return mod.wikiIndexQueryEngine ?? null;
  } catch {
    return null;
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Format injection — bounded token budget
// ──────────────────────────────────────────────────────────────────────────

function formatInjection(results, intent) {
  if (results.length === 0) return null;
  const lines = [
    "## 🔍 Wiki bridge — top entries (TF-IDF backstop)",
    `_Intent: ${intent.reason}${intent.slug ? ` (slug: ${intent.slug})` : ""}_`,
    "",
  ];
  for (const r of results) {
    const desc = r.entry.description.length > 100
      ? r.entry.description.slice(0, 97) + "..."
      : r.entry.description;
    lines.push(`- **${r.entry.slug}** (${r.entry.category}, score=${r.score.toFixed(2)}) — ${r.entry.title}: ${desc}`);
    if (r.entry.source_path) lines.push(`  source: \`${r.entry.source_path}\``);
  }
  const text = lines.join("\n");
  // Soft token budget — abort if oversize
  const approxTokens = text.length * TOKEN_PER_CHAR;
  if (approxTokens > MAX_INJECT_TOKENS) {
    // Trim to top 1 result if too large
    const trimmed = [
      "## 🔍 Wiki bridge — top entry",
      `_Intent: ${intent.reason}_`,
      "",
      `- **${results[0].entry.slug}** — ${results[0].entry.title}`,
    ].join("\n");
    return { text: trimmed, trimmed: true };
  }
  return { text, trimmed: false };
}

// ──────────────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────────────

async function main() {
  const raw = readStdinSafe();
  const payload = parsePayload(raw);
  const prompt = typeof payload.prompt === "string" ? payload.prompt : "";

  const intent = detectWikiIntent(prompt);
  if (!intent.match) {
    emitContinue({ wiki_intent: false });
    return;
  }

  if (!shouldInject()) {
    emitContinue({ wiki_intent: true, rate_limited: true });
    return;
  }

  const engine = await loadEngine();
  if (engine === null) {
    // Engine not loadable (probably not built yet) — degrade silently.
    emitContinue({ wiki_intent: true, engine_loaded: false });
    return;
  }

  const queryText = intent.slug ?? prompt;
  const results = engine.query(queryText, { limit: TOP_K, minScore: MIN_SCORE });
  if (results.length === 0) {
    emitContinue({ wiki_intent: true, results: 0 });
    return;
  }

  const formatted = formatInjection(results, intent);
  if (formatted === null) {
    emitContinue({ wiki_intent: true, results: results.length, formatted: false });
    return;
  }

  recordFired();

  emitContinue({
    wiki_intent: true,
    results: results.length,
    trimmed: formatted.trimmed,
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: formatted.text,
    },
  });
}

// Hard timeout — never wedge UserPromptSubmit
setTimeout(() => {
  emitContinue({ timeout: true });
  process.exit(0);
}, HARD_TIMEOUT_MS);

const __isMain = (() => {
  try {
    const argv1 = process.argv[1] ? path.resolve(process.argv[1]) : "";
    const self = new URL(import.meta.url).pathname.replace(/^\/(\w):\//, "$1:/");
    return path.resolve(self) === argv1;
  } catch { return true; }
})();

if (__isMain) {
  main()
    .then(() => process.exit(0))
    .catch(() => { emitContinue(); process.exit(0); });
}
