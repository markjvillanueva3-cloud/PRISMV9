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
 *   OLLAMA_REWRITE_MODEL    override auto-detect (e.g. "qwen2.5-coder:32b")
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
import { shouldThrottleInject } from "../../scripts/lib/inject-throttle.mjs";

// ── Constants ─────────────────────────────────────────────────────────
// 127.0.0.1 NOT localhost: on Windows `localhost` resolves to IPv6 ::1 first, but Ollama binds
// IPv4 127.0.0.1 -> `localhost:11434` is UNREACHABLE (the true root cause of this hook being
// "silently broken" / 46 fires + ~0 rewrites -- NOT the 3s timeout the 2026-05-28 8s bump targeted;
// same IPv6 bug fixed in OllamaClientEngine + ollama-fanout 2026-06-09). Env-overridable.
const OLLAMA_URL = (process.env.OLLAMA_URL || "http://127.0.0.1:11434").replace(/\/$/, "");
const MODEL_OVERRIDE = process.env.OLLAMA_REWRITE_MODEL || null;
// Bumped 3000→8000ms (2026-05-28 slot:alpha — operator: "fix ollama
// inefficiencies"). Root cause of 50/50 rewriter skip rate: 3s timeout
// covered both /api/tags + chat inference, and ollama spends 1-2s on a
// pure `/api/chat` call against a warm small model — narrow margin. 8s
// gives realistic warm-hit headroom without noticeable user-facing
// latency. Cold-load fallback handled by LOADED_MODEL_ONLY (below).
const WALL_TIMEOUT_MS = parseInt(process.env.OLLAMA_REWRITE_TIMEOUT || "8000", 10);
// Loaded-only mode (2026-05-28 slot:alpha): when LOADED_MODEL_ONLY=1
// (default on), pickModel() queries /api/ps and only returns a model that
// is ALREADY resident on the GPU. If no model is loaded, the hook skips
// the call entirely (returns original prompt). This eliminates the
// cold-load timeout failure mode that drove the 100% skip rate observed
// today (qwen2.5-coder:32b cold-load = ~60s, way past WALL_TIMEOUT_MS).
// Pair with the 24h `keep_alive` pin set on session start (see
// scripts/ollama-prewarm-on-pipeline.mjs) so a warm model is always
// available for the rewriter.
const LOADED_MODEL_ONLY = process.env.OLLAMA_REWRITE_LOADED_ONLY !== "0";
const MIN_CONFIDENCE = parseFloat(process.env.OLLAMA_REWRITE_MIN_CONF || "0.50");
// Same-prompt re-inject throttle (ms). Mirrors tribal/master-index (default 60s;
// 0 disables). Raised fleet-wide to 300s via settings env PRISM_PROMPT_REWRITE_THROTTLE_MS.
// The rewrite is identical for an identical prompt -> safe to suppress on /loop ticks.
const REWRITE_THROTTLE_MS = (() => {
  const n = parseInt(process.env.PRISM_PROMPT_REWRITE_THROTTLE_MS ?? "", 10);
  return Number.isFinite(n) ? Math.max(0, Math.min(3600000, n)) : 60000;
})();
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
  "qwen2.5-coder:32b",  // Best quality — always-installed Blackwell floor (retired 3b/7b/14b tags re-pointed here)
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
  // Loaded-only mode (2026-05-28 slot:alpha): prefer models already resident
  // on GPU per /api/ps. Eliminates cold-load timeout failure mode that drove
  // the 100% rewriter skip rate observed 2026-05-24 + 2026-05-27 + 2026-05-28.
  if (LOADED_MODEL_ONLY) {
    try {
      const ps = await ollamaFetch("/api/ps", { method: "GET" }, signal);
      const loaded = new Set((ps?.models || []).map((m) => m?.name || m?.model).filter(Boolean));
      if (loaded.size > 0) {
        for (const want of MODEL_PREFERENCE) {
          if (loaded.has(want)) return want;
        }
        // No preferred model loaded — return the FIRST loaded one, which is
        // probably an embedding model (e.g. nomic-embed-text) that can't chat.
        // Better to return null and skip than to chat against a non-chat model.
        const first = ps.models[0] && (ps.models[0].name || ps.models[0].model) || null;
        if (first && /chat|coder|llama|mistral|phi|gemma|qwen/i.test(first)) return first;
      }
      // No chat-capable model loaded — skip the rewriter call.
      dbg("LOADED_MODEL_ONLY=1 and no chat model in /api/ps — skipping rewrite");
      return null;
    } catch (e) {
      dbg(`pickModel /api/ps probe failed: ${e.message} — falling back to /api/tags`);
      // Fall through to legacy /api/tags path.
    }
  }
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

  // SAME-PROMPT THROTTLE (slot:alpha 2026-06-11): a /loop re-submits the IDENTICAL
  // prompt every tick; the rewrite is byte-identical and the model already holds the
  // earlier tick's injection. Skip the whole ~5s Ollama inference + re-injection for an
  // identical prompt+session within the TTL. Same proven lib + per-(session,prompt-hash)
  // semantics as tribal-by-domain / master-index-precheck. Fail-open (no real sid /
  // ttl<=0 / I/O error => proceed). Guard "unknown" so two sessions sharing a prompt
  // are never cross-suppressed.
  if (session !== "unknown" &&
      shouldThrottleInject({ sessionId: session, prompt: raw, nowMs: Date.now(), ttlMs: REWRITE_THROTTLE_MS })) {
    dbg("skip_throttled (identical prompt within TTL)");
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
