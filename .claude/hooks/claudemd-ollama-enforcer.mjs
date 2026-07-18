#!/usr/bin/env node
// tier: T4
/**
 * claudemd-ollama-enforcer.mjs — UserPromptSubmit hook
 *
 * REVOLUTIONARY APPROACH: Instead of injecting 2000+ tokens of static
 * CLAUDE.md rules, Ollama reads the FULL ruleset locally and outputs
 * ONLY the 3-5 most relevant rules for THIS specific prompt.
 *
 * Token savings: 85-90% (2000 → 150-300 tokens)
 * Enforcement quality: BETTER (contextual, not static)
 *
 * ARCHITECTURE:
 *   1. Parse incoming prompt
 *   2. Load full CLAUDE.md content (user + project)
 *   3. Send to Ollama: "Given this prompt, which 3-5 rules are most critical?"
 *   4. Inject ONLY the relevant rules (compact format)
 *   5. Graceful fallback: if Ollama offline, inject nothing (other hooks cover basics)
 *
 * FIRES ON: UserPromptSubmit
 * BLOCKING: never
 * TIMEOUT: 2000ms (fast local inference)
 * COST: 0 API tokens (100% local)
 */

import { readFileSync, existsSync, appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

// ── Config ────────────────────────────────────────────────────────────
const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434"; // 127 NOT localhost (Windows IPv6 ::1 unreachable; reference_ollama_localhost_systemic_2026_06_09)
const TIMEOUT_MS = parseInt(process.env.CLAUDEMD_ENFORCER_TIMEOUT || "2000", 10);
const MODEL = process.env.CLAUDEMD_ENFORCER_MODEL || "qwen2.5-coder:32b";
const LOG_PATH = "H:/prism/.claude/cache/claudemd-enforcer.jsonl";
const MAX_OUTPUT_TOKENS = 300; // Keep injection compact

// CLAUDE.md locations — portable across PCs (home: wompu / work: Mark Villanueva)
const USER_CLAUDEMD = `${(process.env.USERPROFILE || process.env.HOME || "").replace(/\\/g, "/")}/.claude/CLAUDE.md`;
const PROJECT_CLAUDEMD = "H:/prism/CLAUDE.md";

// Rate limiting: max 1 injection per 3 minutes (rules don't change that fast)
const RATE_FILE = "H:/prism/.claude/cache/claudemd-enforcer-rate.json";
const RATE_WINDOW_MS = 3 * 60 * 1000;

// ── Helpers ───────────────────────────────────────────────────────────
function log(entry) {
  try {
    const dir = dirname(LOG_PATH);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    appendFileSync(LOG_PATH, JSON.stringify({ ts: new Date().toISOString(), ...entry }) + "\n");
  } catch { /* best effort */ }
}

function loadRate() {
  try {
    if (existsSync(RATE_FILE)) return JSON.parse(readFileSync(RATE_FILE, "utf8"));
  } catch { /* ignore */ }
  return { lastInject: 0 };
}

function saveRate(state) {
  try {
    const dir = dirname(RATE_FILE);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    require("node:fs").writeFileSync(RATE_FILE, JSON.stringify(state));
  } catch { /* ignore */ }
}

function isRateLimited() {
  const state = loadRate();
  return Date.now() - (state.lastInject || 0) < RATE_WINDOW_MS;
}

function recordInjection() {
  saveRate({ lastInject: Date.now() });
}

function loadClaudeMd() {
  const parts = [];

  // Load user CLAUDE.md (global rules)
  try {
    if (existsSync(USER_CLAUDEMD)) {
      const content = readFileSync(USER_CLAUDEMD, "utf8");
      // Extract key sections (skip the massive reference tables)
      const lines = content.split("\n");
      const extracted = [];
      let inSection = false;
      let skipSection = false;

      for (const line of lines) {
        // Skip massive tables and reference sections
        if (/^##.*(?:Reference|Table|Triggers|Domain)/i.test(line)) {
          skipSection = true;
          continue;
        }
        if (/^##/.test(line)) {
          skipSection = false;
          inSection = true;
        }
        if (!skipSection && (inSection || /^#\s/.test(line) || /^\*\*/.test(line) || /^-\s/.test(line))) {
          extracted.push(line);
        }
      }
      parts.push("=== USER CLAUDE.MD ===\n" + extracted.slice(0, 150).join("\n"));
    }
  } catch { /* ignore */ }

  // Load project CLAUDE.md
  try {
    if (existsSync(PROJECT_CLAUDEMD)) {
      const content = readFileSync(PROJECT_CLAUDEMD, "utf8");
      // Extract first 200 lines (core rules, not the full inventory)
      const lines = content.split("\n").slice(0, 200);
      parts.push("=== PROJECT CLAUDE.MD ===\n" + lines.join("\n"));
    }
  } catch { /* ignore */ }

  return parts.join("\n\n");
}

const SYSTEM_PROMPT = `You are a rule-selector for Claude Code working on the PRISM manufacturing platform.

Given:
1. The user's prompt
2. The full CLAUDE.md ruleset

Your job: Select the 3-5 MOST CRITICAL rules for THIS SPECIFIC prompt.

Output format (STRICT - no markdown, no explanation):
RULE 1: [rule name] — [1-line summary of what to do/avoid]
RULE 2: [rule name] — [1-line summary]
RULE 3: [rule name] — [1-line summary]
[optional RULE 4, RULE 5 if highly relevant]

Selection criteria:
- Pick rules that DIRECTLY apply to the prompt's intent
- Prioritize: safety > correctness > efficiency > style
- Skip generic rules (those are always in effect)
- Focus on rules the model might violate without the reminder

If the prompt is trivial (yes/no, continue, ok), output exactly: SKIP
If no specific rules apply, output exactly: GENERIC`;

/**
 * P1-U05: query the chunked CLAUDE.md vault via prism_memory:semantic_search.
 * Returns up to 3 hits with score >= MIN_SEMANTIC_SCORE, or null on any error.
 */
const MCP_URL_FOR_SEMSEARCH = process.env.MCP_HTTP_URL || "http://127.0.0.1:3100/mcp";
const MIN_SEMANTIC_SCORE = 0.5;
const SEMANTIC_TIMEOUT_MS = 4000;
async function querySemanticVault(prompt) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), SEMANTIC_TIMEOUT_MS);
  try {
    const res = await fetch(MCP_URL_FOR_SEMSEARCH, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name: "prism_memory", arguments: { action: "semantic_search", params: { query: prompt, kind: "rule", limit: 3, threshold: MIN_SEMANTIC_SCORE } } },
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const body = await res.json();
    const inner = body?.result?.content?.[0]?.text;
    if (!inner) return null;
    const parsed = JSON.parse(inner);
    if (parsed?.ok !== true || !Array.isArray(parsed?.items)) return null;
    return parsed.items.filter((it) => (it?.score ?? 0) >= MIN_SEMANTIC_SCORE);
  } catch {
    clearTimeout(timer);
    return null;
  }
}

function formatSemanticInjection(hits, latencyMs) {
  const lines = [`⚡ CLAUDE.MD RULES (semantic-vault, ${latencyMs}ms, ${hits.length} hit${hits.length === 1 ? "" : "s"})`];
  for (let i = 0; i < hits.length; i++) {
    const h = hits[i];
    const section = (h?.metadata?.section ?? "").toString().slice(0, 80);
    const score = typeof h?.score === "number" ? h.score.toFixed(2) : "?";
    // First non-empty body line as the actionable summary
    const body = String(h?.text ?? "").split(/\r?\n/).filter((l) => l.trim() && !l.startsWith("##"));
    const summary = (body[0] ?? "").slice(0, 240);
    lines.push(`RULE ${i + 1} (score=${score}): ${section} — ${summary}`);
  }
  return lines.join("\n");
}

async function queryOllama(prompt, claudeMd) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const userMessage = `USER PROMPT:\n${prompt}\n\n${claudeMd}`;

    const res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        stream: false,
        options: {
          temperature: 0.1,
          num_predict: MAX_OUTPUT_TOKENS,
        },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`Ollama HTTP ${res.status}`);
    }

    const data = await res.json();
    return data?.message?.content?.trim() || null;
  } catch (err) {
    clearTimeout(timeout);
    const reason = err?.name === "AbortError" ? "timeout" :
                   /ECONNREFUSED/.test(String(err)) ? "offline" : "error";
    log({ action: "ollama-fail", reason, error: String(err?.message || err).slice(0, 100) });
    return null;
  }
}

function formatInjection(rules, latencyMs) {
  if (!rules || rules === "SKIP" || rules === "GENERIC") {
    return null;
  }

  // Validate we got actual rules
  if (!rules.includes("RULE")) {
    return null;
  }

  const lines = [
    `⚡ CLAUDE.MD RULES (${latencyMs}ms, contextual)`,
    rules,
  ];

  return lines.join("\n");
}

// ── Main ──────────────────────────────────────────────────────────────
async function main() {
  let payload;
  try {
    payload = JSON.parse(readFileSync(0, "utf-8"));
  } catch {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const prompt = String(payload?.prompt || "").trim();

  // Skip short/trivial prompts
  if (!prompt || prompt.length < 15) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  // Skip slash commands (they have their own rules)
  if (prompt.startsWith("/")) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  // Rate limiting
  if (isRateLimited()) {
    log({ action: "rate-limited" });
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  // Load CLAUDE.md content
  const claudeMd = loadClaudeMd();
  if (!claudeMd || claudeMd.length < 500) {
    log({ action: "no-claudemd" });
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  // P1-U05: try semantic search first against the chunked CLAUDE.md vault.
  // If we get top-3 hits with score ≥0.5, format and inject those instead
  // of paying for a full whole-doc Ollama call. Falls back to Ollama on
  // empty hits or MCP unreachable.
  const tSem = Date.now();
  const semHits = await querySemanticVault(prompt);
  const semLatencyMs = Date.now() - tSem;
  if (semHits && semHits.length > 0) {
    const injection = formatSemanticInjection(semHits, semLatencyMs);
    if (injection) {
      recordInjection();
      log({ action: "inject-semantic", hits: semHits.length, latencyMs: semLatencyMs, promptLen: prompt.length });
      console.log(JSON.stringify({
        continue: true,
        hookSpecificOutput: {
          hookEventName: "UserPromptSubmit",
          additionalContext: injection,
        },
      }));
      return;
    }
  }

  // Fallback: query Ollama for relevant rules across the whole doc
  const t0 = Date.now();
  const rules = await queryOllama(prompt, claudeMd);
  const latencyMs = Date.now() - t0;

  if (!rules) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const injection = formatInjection(rules, latencyMs);

  if (!injection) {
    log({ action: "skip", rules, latencyMs });
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  // Record successful injection for rate limiting
  recordInjection();

  log({ action: "inject", rules: rules.slice(0, 200), latencyMs, promptLen: prompt.length });

  console.log(JSON.stringify({
    continue: true,
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: injection,
    },
  }));
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
});
