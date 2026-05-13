#!/usr/bin/env node
// tier: T4
/**
 * prompt-rewriter-ollama.mjs — UserPromptSubmit hook
 * RE-ENABLED: 2026-04-26 (LOCAL-LLM-MS0 U-LLMH03)
 *
 * WHY: The user's raw prompts are often short, pronoun-heavy, and omit
 * the implicit constraints that Claude needs to ship correct work ("just
 * do the thing", "continue", "build it", "keep going"). This hook calls
 * a local Ollama model to produce a STRUCTURED rewrite — the user's
 * literal prompt is never mutated, but a machine-friendly restatement
 * (goal / implicit constraints / file paths / acceptance criteria /
 * variability axes / scope / confidence) is injected as
 * `additionalContext` BEFORE the raw prompt reaches the model.
 *
 * FIRES ON:   UserPromptSubmit
 * BLOCKING:   never — silent no-op on every failure path
 * EXTERNAL:   HTTP to http://localhost:11434 (Ollama)
 * COST:       ~1 local inference / prompt. Model chosen dynamically
 *             (smallest available), temperature 0.1, 512-token output
 *             cap. Total call bounded at 3s (or OLLAMA_REWRITE_TIMEOUT).
 *
 * GRACEFUL DEGRADATION (all → silent no-op):
 *   - Ollama unreachable (connection refused, DNS, timeout on /api/tags)
 *   - No compatible models installed
 *   - Inference timeout
 *   - Invalid JSON response
 *   - Empty rewrite / confidence below floor
 *   - Prompt too short (<20 visible chars) or purely conversational
 *   - User opted out with [RAW] or [SKIP-REWRITE]
 *
 * CONFIG (env vars, all optional):
 *   OLLAMA_URL              default http://localhost:11434
 *   OLLAMA_REWRITE_MODEL    override auto-detect (e.g. "qwen2.5-coder:7b")
 *   OLLAMA_REWRITE_TIMEOUT  default 3000 ms (total wall budget)
 *   OLLAMA_REWRITE_MIN_CONF default 0.50 (below this → skip)
 *   OLLAMA_REWRITE_LOG      default .claude/cache/prompt-rewrites.jsonl
 *                           set to "off" to disable logging
 *   OLLAMA_REWRITE_DEBUG    "1" → write diagnostics to stderr (hooks don't
 *                           see stderr, but `node hook.mjs < payload.json`
 *                           does during dev)
 *
 * LOG FORMAT (JSONL): one line per invocation
 *   { ts, session, raw, rewrite | null, model, latency_ms, skip_reason? }
 */

import { readFileSync, existsSync, mkdirSync, appendFileSync } from "node:fs";
import path from "node:path";
import { exit } from "node:process";

// ── Constants ─────────────────────────────────────────────────────────
const OLLAMA_URL = (process.env.OLLAMA_URL || "http://localhost:11434").replace(/\/$/, "");
const MODEL_OVERRIDE = process.env.OLLAMA_REWRITE_MODEL || null;
const WALL_TIMEOUT_MS = parseInt(process.env.OLLAMA_REWRITE_TIMEOUT || "3000", 10);
const MIN_CONFIDENCE = parseFloat(process.env.OLLAMA_REWRITE_MIN_CONF || "0.50");
const DEBUG = process.env.OLLAMA_REWRITE_DEBUG === "1";
const LOG_PATH_ENV = process.env.OLLAMA_REWRITE_LOG;
const LOG_PATH = LOG_PATH_ENV === "off"
  ? null
  : (LOG_PATH_ENV || "H:/prism/.claude/cache/prompt-rewrites.jsonl");

const MIN_VISIBLE_CHARS = 20; // below this → skip (not worth an LLM call)
const OPTOUT_RE = /\[\s*(?:RAW|SKIP-REWRITE|NO-REWRITE)\s*\]/i;

// Model preference order — smartest first (user requested 32b).
// Dynamic lookup against /api/tags picks the first match in the installed set.
const MODEL_PREFERENCE = [
  "qwen2.5-coder:32b",  // Best quality (~15s)
  "qwen2.5-coder:14b",  // Great quality (~5s)
  "qwen2.5-coder:7b",   // Good balance (~2s)
  "qwen2.5-coder:3b",
  "qwen2.5-coder:1.5b",
  "llama3.1:70b",
  "llama3.1:8b",
  "llama3.2:3b",
  "llama3.2:1b",
  "codellama:34b",
  "codellama:7b",
  "mistral:7b",
];

// ── Helpers ───────────────────────────────────────────────────────────
function dbg(msg) {
  if (DEBUG) process.stderr.write(`[prompt-rewriter] ${msg}\n`);
}

function writeLog(entry) {
  if (!LOG_PATH) return;
  try {
    const dir = path.dirname(LOG_PATH);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    appendFileSync(LOG_PATH, JSON.stringify(entry) + "\n", "utf-8");
  } catch {
    // logging is best-effort
  }
}

// fetch is builtin on Node 18+ (confirmed running 24.13 per session output)
async function ollamaFetch(pathname, init, signal) {
  const url = `${OLLAMA_URL}${pathname}`;
  const res = await fetch(url, { ...init, signal });
  if (!res.ok) throw new Error(`ollama ${pathname} HTTP ${res.status}`);
  return res.json();
}

async function pickModel(signal) {
  if (MODEL_OVERRIDE) return MODEL_OVERRIDE;
  const data = await ollamaFetch("/api/tags", { method: "GET" }, signal);
  const installed = new Set((data?.models || []).map((m) => m?.name).filter(Boolean));
  if (installed.size === 0) return null;
  for (const want of MODEL_PREFERENCE) {
    if (installed.has(want)) return want;
  }
  // Fall back to the first installed model (whatever it is).
  return (data.models[0] && data.models[0].name) || null;
}

const SYSTEM_PROMPT = [
  "You are a prompt rewriter for an AI coding assistant (Claude Code)",
  "working on the PRISM CNC manufacturing platform.",
  "",
  "Your job: take the user's raw prompt and extract a STRUCTURED",
  "restatement that makes intent unambiguous. You NEVER change the",
  "meaning, you NEVER add requirements the user did not imply, and you",
  "NEVER remove anything the user wrote.",
  "",
  "Output STRICT JSON with exactly these keys (no markdown fences):",
  '  "goal": string — the top-level ask in ONE sentence.',
  '  "implicit_constraints": string[] — constraints the user did not',
  "     state but a reasonable reader would assume (e.g.",
  '     "don\'t break existing tests", "follow existing code style",',
  '     "use existing engines — check dedup"). Max 5. Empty [] if none.',
  '  "file_paths": string[] — file/dir paths mentioned OR strongly',
  "     implied by the prompt. Max 10. Empty [] if none.",
  '  "acceptance_criteria": string[] — 2–5 observable signals the user',
  "     would accept as DONE.",
  '  "variability_axes": string[] — configurations the work spans',
  "     (materials, machines, controllers, CAM systems). Empty if N/A.",
  '  "scope": "narrow" | "moderate" | "exhaustive" — infer from words:',
  '     "everything|all|exhaustive|comprehensive" → exhaustive;',
  '     "just|only|quick|minimal|tiny" → narrow; default moderate.',
  '  "confidence": number — 0.0–1.0 your confidence the rewrite',
  "     preserves the user's intent.",
  "",
  "If the prompt is too short, purely conversational, or a pronoun-only",
  'continuation ("ok", "continue", "yes"), output exactly {"skip": true}',
  "and nothing else.",
].join("\n");

async function rewriteWithOllama(rawPrompt, model, signal) {
  const body = {
    model,
    stream: false,
    format: "json", // Ollama native JSON mode
    options: {
      temperature: 0.1,
      num_predict: 512,
    },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: rawPrompt },
    ],
  };
  const data = await ollamaFetch(
    "/api/chat",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    signal,
  );
  const content = data?.message?.content ?? "";
  // Ollama in format=json mode returns a stringified JSON in content.
  const parsed = JSON.parse(content);
  return parsed;
}

function formatForInjection(rewrite, model, latencyMs) {
  if (rewrite.skip) return null;
  const lines = [];
  lines.push("━".repeat(70));
  lines.push(`OLLAMA PROMPT REWRITE (model=${model}, ${latencyMs}ms, conf=${rewrite.confidence?.toFixed?.(2) ?? "?"})`);
  lines.push("━".repeat(70));
  if (rewrite.goal) lines.push(`**Goal:** ${rewrite.goal}`);
  if (rewrite.scope) lines.push(`**Scope:** ${rewrite.scope}`);
  if (rewrite.implicit_constraints?.length) {
    lines.push("**Implicit constraints:**");
    for (const c of rewrite.implicit_constraints) lines.push(`  • ${c}`);
  }
  if (rewrite.file_paths?.length) {
    lines.push(`**File paths:** ${rewrite.file_paths.join(", ")}`);
  }
  if (rewrite.acceptance_criteria?.length) {
    lines.push("**Acceptance criteria:**");
    for (const a of rewrite.acceptance_criteria) lines.push(`  • ${a}`);
  }
  if (rewrite.variability_axes?.length) {
    lines.push(`**Variability axes:** ${rewrite.variability_axes.join(", ")}`);
  }
  lines.push("");
  lines.push(
    "This rewrite is a machine-generated restatement for planning only. " +
      "The user's literal prompt (below) remains authoritative — resolve " +
      "any discrepancy in favor of the raw prompt.",
  );
  lines.push("━".repeat(70));
  return lines.join("\n");
}

// ── Main ──────────────────────────────────────────────────────────────
(async () => {
  // Parse stdin
  let payload;
  try {
    payload = JSON.parse(readFileSync(0, "utf-8"));
  } catch {
    exit(0);
  }

  const raw = String(payload?.prompt ?? "");
  const session = payload?.session_id || payload?.sessionId || "unknown";

  // Short-circuit: empty, too short, opt-out
  if (!raw.trim()) exit(0);

  if (OPTOUT_RE.test(raw)) {
    dbg("opt-out via [RAW]/[SKIP-REWRITE]");
    writeLog({ ts: new Date().toISOString(), session, raw, rewrite: null, skip_reason: "optout" });
    exit(0);
  }

  const visible = raw.replace(/\s+/g, " ").trim();
  if (visible.length < MIN_VISIBLE_CHARS) {
    dbg(`too short (${visible.length} chars)`);
    // Don't log trivial skips — fills the log with noise.
    exit(0);
  }

  // Wall-clock budget for the whole operation.
  const ctl = new AbortController();
  const deadline = setTimeout(() => ctl.abort(), WALL_TIMEOUT_MS);
  const t0 = Date.now();

  try {
    const model = await pickModel(ctl.signal);
    if (!model) {
      dbg("no models installed");
      writeLog({ ts: new Date().toISOString(), session, raw, rewrite: null, skip_reason: "no-model" });
      exit(0);
    }
    dbg(`using model=${model}`);

    const rewrite = await rewriteWithOllama(raw, model, ctl.signal);
    const latencyMs = Date.now() - t0;

    if (rewrite.skip) {
      dbg("model returned skip:true");
      writeLog({ ts: new Date().toISOString(), session, raw, rewrite, model, latency_ms: latencyMs, skip_reason: "model-skip" });
      exit(0);
    }

    const conf = typeof rewrite.confidence === "number" ? rewrite.confidence : 0;
    if (conf < MIN_CONFIDENCE) {
      dbg(`confidence ${conf} < floor ${MIN_CONFIDENCE}`);
      writeLog({ ts: new Date().toISOString(), session, raw, rewrite, model, latency_ms: latencyMs, skip_reason: "low-confidence" });
      exit(0);
    }

    const additionalContext = formatForInjection(rewrite, model, latencyMs);
    if (!additionalContext) exit(0);

    writeLog({ ts: new Date().toISOString(), session, raw, rewrite, model, latency_ms: latencyMs });

    process.stdout.write(
      JSON.stringify({  continue: true,  hookSpecificOutput: {
          hookEventName: "UserPromptSubmit",
          additionalContext,
        },
      }),
    );
    exit(0);
  } catch (err) {
    const latencyMs = Date.now() - t0;
    const kind = err?.name === "AbortError"
      ? "timeout"
      : (err?.cause?.code === "ECONNREFUSED" || /ECONNREFUSED/.test(String(err)))
        ? "ollama-offline"
        : /HTTP/.test(String(err))
          ? "ollama-http-error"
          : /JSON/i.test(String(err))
            ? "parse-error"
            : "unknown";
    dbg(`skip reason=${kind}: ${err?.message || err}`);
    writeLog({
      ts: new Date().toISOString(),
      session,
      raw,
      rewrite: null,
      model: MODEL_OVERRIDE || null,
      latency_ms: latencyMs,
      skip_reason: kind,
      error: String(err?.message || err).slice(0, 200),
    });
    exit(0);
  } finally {
    clearTimeout(deadline);
  }
})();
