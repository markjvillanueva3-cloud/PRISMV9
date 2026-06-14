#!/usr/bin/env node
// tier: T1
/**
 * commit-draft-suggest.mjs — OLLAMA-DEV-03
 *
 * PreToolUse hook on Bash that detects short/generic commit messages
 * (`git commit -m "wip"`, `-m "update"`, etc.) and asks the local
 * Ollama (via LocalCommitMessageEngine) for a richer draft. The
 * suggestion is injected as advisory context — never blocking — so
 * Claude can incorporate it into the next commit attempt without a
 * round-trip to the cloud LLM.
 *
 * WHY: Most commit messages cost 200-500 Claude tokens to draft when
 * the cloud model writes them. Routing to local Qwen costs 0 cloud
 * tokens and gives a structured suggestion the user can override.
 *
 * RULES:
 *  - Only fires when stdin is a `git commit -m <msg>` shell call
 *  - Short message threshold: < 30 chars OR matches generic patterns
 *  - Skips if message already follows PRISM `[SCOPE]/U-ID:` format
 *  - Skips if no staged diff (commit will fail anyway)
 *  - Total budget: 6s (Ollama call) — falls through silently on miss
 *  - Never blocks — only injects advice
 *
 * INPUT:  Claude Code PreToolUse JSON on stdin
 * OUTPUT: { hookSpecificOutput: { hookEventName: "PreToolUse",
 *           additionalContext: "<suggestion>" } } when relevant,
 *          else exit 0 silent.
 */

import { readFileSync, existsSync, mkdirSync, appendFileSync } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";
import { exit } from "node:process";

// ── Defensive stdin parse ────────────────────────────────────────────
let payload;
try {
  const raw = readFileSync(0, "utf-8");
  if (!raw.trim()) exit(0);
  payload = JSON.parse(raw);
} catch {
  exit(0);
}

const tool = payload?.tool_name || payload?.tool || "";
if (tool !== "Bash") exit(0);

const cmd = String(payload?.tool_input?.command || payload?.input?.command || "");
if (!cmd.trim()) exit(0);

// ── Detect git commit -m <msg> ───────────────────────────────────────
// Match both single and double quotes, and HEREDOC-style commits.
// Pattern is intentionally permissive — we'd rather skip on ambiguity
// than emit a bogus suggestion.
const commitRegex = /\bgit\s+commit\b[^|;&]*?-m\s*["']([^"']{1,200})["']/;
const match = commitRegex.exec(cmd);
if (!match) exit(0);

const message = match[1].trim();
if (!message) exit(0);

// ── Skip well-formed PRISM commits ───────────────────────────────────
const prismFormat = /^\[?[A-Z][\w-]*[\]:]?\s*\/?\s*U-[\w-]+:\s*\S/;
if (prismFormat.test(message)) exit(0);

// ── Generic / short pattern detection ────────────────────────────────
const GENERIC_PATTERNS = [
  /^wip\b/i,
  /^update\s*$/i,
  /^fix\s*$/i,
  /^changes?\s*$/i,
  /^stuff\s*$/i,
  /^misc\s*$/i,
  /^small fix\s*$/i,
  /^typo\s*$/i,
];

const isGeneric = message.length < 30 || GENERIC_PATTERNS.some((re) => re.test(message));
if (!isGeneric) exit(0);

// ── Verify there's something staged to commit ─────────────────────────
let stagedDiff = "";
try {
  stagedDiff = execSync("git diff --cached --stat", {
    encoding: "utf-8",
    maxBuffer: 64 * 1024,
    timeout: 2000,
  }).trim();
} catch {
  exit(0);
}
if (!stagedDiff) exit(0);

// ── Telemetry record ─────────────────────────────────────────────────
const STATS_DIR = "H:/prism/mcp-server/data/state";
const STATS_FILE = path.join(STATS_DIR, "commit-draft-suggest.jsonl");
function recordEvent(decision, suggestion, latencyMs) {
  try {
    if (!existsSync(STATS_DIR)) mkdirSync(STATS_DIR, { recursive: true });
    const event = {
      ts: new Date().toISOString(),
      decision,
      originalMessage: message.slice(0, 80),
      suggestion: suggestion ? suggestion.slice(0, 120) : null,
      latencyMs,
      sessionId: payload?.session_id || "unknown",
    };
    appendFileSync(STATS_FILE, JSON.stringify(event) + "\n");
  } catch {
    // telemetry must never throw
  }
}

// ── Ask local Ollama for a richer subject (via LocalCommitMessageEngine) ──
// We hit Ollama directly instead of going through the dispatcher to
// keep the hook self-contained and below the 100-line guideline.
const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.OLLAMA_COMMIT_MODEL ?? "qwen2.5-coder:32b";
const TIMEOUT_MS = 6_000;

async function suggestDraft() {
  const startedAt = Date.now();
  let stagedDetailedDiff = "";
  try {
    stagedDetailedDiff = execSync("git diff --cached", {
      encoding: "utf-8",
      maxBuffer: 256 * 1024,
      timeout: 2000,
    });
  } catch {
    return { suggestion: null, latencyMs: Date.now() - startedAt };
  }
  const truncated = stagedDetailedDiff.length > 3000
    ? stagedDetailedDiff.slice(0, 3000) + "\n... (truncated)"
    : stagedDetailedDiff;

  const prompt = [
    "You are a concise git commit message writer. The user wrote a short or generic message:",
    `  "${message}"`,
    "",
    "Generate a single one-line subject (<=72 chars) that describes WHAT changed.",
    "Use conventional-commit style: feat: / fix: / docs: / refactor: / test: / chore:",
    "Do not include a body. Respond with JSON only:",
    `{"subject":"<one line>"}`,
    "",
    "Staged diff:",
    "```",
    truncated,
    "```",
  ].join("\n");

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        stream: false,
        format: "json",
        options: { num_predict: 100, temperature: 0.2 },
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return { suggestion: null, latencyMs: Date.now() - startedAt };
    const body = (await res.json());
    const raw = String(body?.response ?? "").trim();
    if (!raw) return { suggestion: null, latencyMs: Date.now() - startedAt };
    let parsed;
    try { parsed = JSON.parse(raw); } catch { return { suggestion: null, latencyMs: Date.now() - startedAt }; }
    const subject = typeof parsed?.subject === "string" ? parsed.subject.trim() : "";
    if (!subject || subject.length < 8) return { suggestion: null, latencyMs: Date.now() - startedAt };
    return { suggestion: subject.slice(0, 100), latencyMs: Date.now() - startedAt };
  } catch {
    clearTimeout(timer);
    return { suggestion: null, latencyMs: Date.now() - startedAt };
  }
}

// ── Main ─────────────────────────────────────────────────────────────
(async () => {
  const { suggestion, latencyMs } = await suggestDraft();
  if (!suggestion) {
    recordEvent("ollama-miss", null, latencyMs);
    exit(0);
  }
  recordEvent("suggested", suggestion, latencyMs);
  const advice = [
    "💡 Local LLM commit-draft suggestion (advisory):",
    `   "${suggestion}"`,
    "",
    `   Your message "${message}" is short or generic. Consider replacing it with the suggestion above`,
    "   or another descriptive subject (`[SCOPE]/U-ID: title` for PRISM milestone work).",
  ].join("\n");
  process.stdout.write(JSON.stringify({
    systemMessage: advice,
  }));
  exit(0);
})().catch(() => exit(0));
