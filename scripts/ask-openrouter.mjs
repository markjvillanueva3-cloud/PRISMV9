#!/usr/bin/env node
/**
 * ask-openrouter.mjs -- OpenRouter cloud query service
 * (CLOUD-OVERFLOW-MS0/U-ASK-OPENROUTER, slot:alpha 2026-06-15).
 *
 * Operator directive (2026-06-15): "wire cloud version, network is 1gb/sec". The
 * executable counterpart to ask-ollama.mjs, but for the CLOUD long-context tier:
 * routes deep-research / huge-document / free-overflow work to NVIDIA Nemotron-3 on
 * OpenRouter (1M context, $0 on the :free tier). Claude invokes this via Bash; only the
 * compact answer returns to the Claude context. The heavy input (a 2 MB doc, a whole
 * corpus) is processed in this subprocess and discarded.
 *
 * WHY CLOUD AND NOT LOCAL: the assessment found the local 87 GB Nemotron quant barely
 * fits 96 GB VRAM with no KV headroom and is slower than gpt-oss:120b -- it cannot use
 * its own long-context edge locally. OpenRouter gives the full 1M context for $0.
 *
 * Modes:
 *   ask <question>        general question, no PRISM context
 *   research <question>   deep-research system prompt (thorough, multi-angle, cite)
 *   summarize <file|->    compact digest of a file (256 KB cap)   "-" = stdin
 *   longread <file|->     analyze a LARGE doc end-to-end (2 MB cap, 1M-ctx showcase);
 *                         --ask "<q>" focuses it on a question
 *   models                list the OpenRouter model registry (no network, no key)
 *
 * Flags: --model <key|slug> --json --timeout <ms> --max-tokens <n> --max-bytes <n>
 *        --ask "<q>" (longread focus) --allow-unsafe (override the NC/G-code refusal)
 *
 * Exit codes: 0 ok · 2 usage / missing input / safety refusal · 3 cloud failure
 * (missing key, unreachable, empty) -- emits an explicit Claude-fallback directive.
 *
 * SAFETY (PRISM): NC/G-code program content is NEVER sent to an external cloud
 * (looksLikeNcProgram, reused from ask-ollama -- R8). Sending content to a third-party
 * service publishes it; the caller owns not piping private/safety-critical bytes here.
 *
 * Design: pure functions (exported, unit-tested) + a thin impure shell. Fail-loud (R12).
 */

import { readFileSync, existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, isAbsolute } from "node:path";
import {
  callOpenRouter, buildMessages, cloudFooter, keyStatus, resolveModelSlug,
  OPENROUTER_MODELS, DEFAULT_TIMEOUT_MS, DEFAULT_MAX_TOKENS, MIN_TIMEOUT_MS,
} from "./lib/openrouter-client.mjs";
import { looksLikeNcProgram, readStdin } from "./ask-ollama.mjs";

const HERE = fileURLToPath(import.meta.url);

export const FILE_MODES = new Set(["summarize", "longread"]);
export const TEXT_MODES = new Set(["ask", "research"]);
export const META_MODES = new Set(["models"]);
export const ALL_MODES = new Set([...FILE_MODES, ...TEXT_MODES, ...META_MODES]);

/** Input caps (chars ~= bytes for ASCII). longread exploits the 1M-token context. */
export const MAX_SUMMARIZE_BYTES = 256 * 1024;        // quick digest
export const MAX_LONGREAD_BYTES = 2 * 1024 * 1024;    // ~500K tokens -- 1M-ctx showcase, with headroom
export const MAX_INPUT_CEILING = 3 * 1024 * 1024;     // hard ceiling, never exceed
/** research wants room for a thorough answer; ask is a normal short answer. */
const RESEARCH_MAX_TOKENS = 4096;
/** Back-of-envelope chars/token, the fallback when OpenRouter usage is absent. */
const CHARS_PER_TOKEN = 4;

// ---------------------------------------------------------------------------
// Pure helpers (exported for unit tests)
// ---------------------------------------------------------------------------

/**
 * Parse argv (the slice AFTER `node ask-openrouter.mjs`). Returns
 * { mode, input, flags } or { error }. Fail loud on any usage problem.
 */
export function parseArgs(argv) {
  const flags = {
    json: false, model: "", timeout: DEFAULT_TIMEOUT_MS, timeoutExplicit: false,
    maxTokens: 0, maxBytes: 0, ask: "", allowUnsafe: false,
  };
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") flags.json = true;
    else if (a === "--allow-unsafe") flags.allowUnsafe = true;
    else if (a === "--model") {
      const v = argv[++i];
      if (v === undefined) return { error: "--model needs a value" };
      flags.model = v;
    } else if (a === "--ask") {
      const v = argv[++i];
      if (v === undefined) return { error: "--ask needs a value" };
      flags.ask = v;
    } else if (a === "--timeout") {
      const n = Number.parseInt(argv[++i], 10);
      if (!Number.isFinite(n) || n < MIN_TIMEOUT_MS) return { error: `--timeout needs an integer >= ${MIN_TIMEOUT_MS} (ms)` };
      flags.timeout = n; flags.timeoutExplicit = true;
    } else if (a === "--max-tokens") {
      const n = Number.parseInt(argv[++i], 10);
      if (!Number.isFinite(n) || n < 1) return { error: "--max-tokens needs a positive integer" };
      flags.maxTokens = n;
    } else if (a === "--max-bytes") {
      const n = Number.parseInt(argv[++i], 10);
      if (!Number.isFinite(n) || n < 1) return { error: "--max-bytes needs a positive integer" };
      flags.maxBytes = Math.min(n, MAX_INPUT_CEILING);
    } else if (a.startsWith("--")) {
      return { error: `unknown flag: ${a}` };
    } else positional.push(a);
  }
  const mode = positional.shift();
  if (!mode) return { error: "no mode given" };
  if (!ALL_MODES.has(mode)) return { error: `unknown mode: ${mode}` };
  const input = positional.join(" ").trim();
  if (META_MODES.has(mode)) return { mode, input: "", flags };
  if (!input) return { error: `mode '${mode}' needs ${FILE_MODES.has(mode) ? "a file path (or '-')" : "a query"}` };
  return { mode, input, flags };
}

/** Pure: the system prompt for a mode (research/longread are thorough; ask is bare). */
export function systemPromptFor(mode, focusQuestion = "") {
  if (mode === "research") {
    return [
      "You are a rigorous research assistant. Answer the question thoroughly and accurately.",
      "Cover the obvious AND non-obvious angles, note trade-offs and caveats, and cite concrete",
      "facts. If you are uncertain, say so explicitly rather than guessing. Be structured and dense.",
    ].join(" ");
  }
  if (mode === "longread") {
    const base =
      "You are analyzing a LARGE document provided in full. Read all of it before answering. " +
      "Be precise and cite the relevant parts.";
    return focusQuestion && focusQuestion.trim()
      ? `${base} Focus your analysis on this question: ${focusQuestion.trim()}`
      : `${base} Produce a thorough structured summary: purpose, key sections, notable details, and anything surprising.`;
  }
  if (mode === "summarize") {
    return "Summarize this file for an engineer who has not seen it. State its purpose, key sections, and anything surprising. Be concise.";
  }
  return ""; // ask: no system prompt
}

/** Pure: the cap (bytes) for a file mode, honoring an explicit --max-bytes override. */
export function capForMode(mode, maxBytesFlag = 0) {
  const base = mode === "longread" ? MAX_LONGREAD_BYTES : MAX_SUMMARIZE_BYTES;
  const cap = maxBytesFlag > 0 ? Math.min(maxBytesFlag, MAX_INPUT_CEILING) : base;
  return cap;
}

/**
 * Pure: when the cloud route fails (no key, unreachable, empty) the CLI must NOT
 * dead-end -- it emits an explicit Claude fallback directive (mirrors ask-ollama's
 * buildFallbackSignal). Exit stays 3; the OUTPUT becomes actionable. ASCII-only.
 */
export function buildFallbackSignal({ mode, target, error, json }) {
  const reason = `OpenRouter cloud route failed (${error})`;
  if (json) {
    return JSON.stringify({
      cloudUnavailable: true, lane: "claude", fellBack: true, mode,
      target: target || null, reason,
      directive: "The cloud model could not run this task -- you are the fallback. Handle it directly.",
    }, null, 2);
  }
  return [
    "[ask-openrouter] CLOUD FALLBACK -> Claude.",
    `The cloud "${mode}" task could not run: ${error}.`,
    "You are the fallback. Handle it directly -- do not retry the cloud in a loop.",
  ].join("\n");
}

/** Pure: render the model registry for the `models` mode. */
export function renderModels() {
  const rows = Object.entries(OPENROUTER_MODELS).map(([key, m]) => {
    const price = m.tier === "free" ? "$0 (free)" : `$${m.promptUsdPerM}/$${m.completionUsdPerM} per 1M`;
    return `  ${key.padEnd(20)} ${m.slug.padEnd(40)} ctx=${m.ctx} ${price}`;
  });
  return ["OpenRouter model registry (verified 2026-06-15):", ...rows,
    "", "Default: nemotron-super-free. Override per-call: --model <key|slug>; session: OPENROUTER_MODEL=<key>."].join("\n");
}

// ---------------------------------------------------------------------------
// Impure shell (deps injected so the pure path stays unit-testable)
// ---------------------------------------------------------------------------

/** Read a file capped at maxBytes. { ok, content, bytes, truncated } | { ok:false, error }. */
export function readCapped(path, maxBytes, { readImpl = readFileSync, existsImpl = existsSync, statImpl = statSync } = {}) {
  const abs = isAbsolute(path) ? path : resolve(process.cwd(), path);
  if (!existsImpl(abs)) return { ok: false, error: `file not found: ${path}` };
  let st;
  try { st = statImpl(abs); } catch (e) { return { ok: false, error: `cannot stat ${path}: ${e.message}` }; }
  if (!st.isFile()) return { ok: false, error: `not a file: ${path}` };
  let content;
  try { content = String(readImpl(abs, "utf8")); } catch (e) { return { ok: false, error: `cannot read ${path}: ${e.message}` }; }
  const truncated = content.length > maxBytes;
  return { ok: true, content: truncated ? content.slice(0, maxBytes) : content, bytes: st.size, truncated };
}

/**
 * Execute one request. All I/O goes through injected deps so the whole function is
 * unit-testable. Returns { exitCode, output }. The caller prints + exits.
 */
export async function runRequest(parsed, deps = {}) {
  const { mode, input, flags } = parsed;
  const call = deps.callOpenRouter || callOpenRouter;
  const model = resolveModelSlug(flags.model);

  // ---- models: registry listing, no network, no key ----
  if (mode === "models") {
    const out = flags.json ? JSON.stringify(OPENROUTER_MODELS, null, 2) : renderModels();
    return { exitCode: 0, output: out };
  }

  // ---- text modes: ask / research ----
  // No NC/G-code egress guard here (unlike the file modes below): text-mode input is the
  // operator's typed positional query, never a file/stdin read, so program content cannot
  // arrive unless deliberately typed. If a stdin path is ever added to a text mode, re-add
  // the looksLikeNcProgram refusal (3-of-3 arm-A P2 note 2026-06-15).
  if (TEXT_MODES.has(mode)) {
    const messages = buildMessages({ system: systemPromptFor(mode), user: input });
    const maxTokens = flags.maxTokens || (mode === "research" ? RESEARCH_MAX_TOKENS : DEFAULT_MAX_TOKENS);
    const gen = await call({ messages, model, maxTokens, timeoutMs: flags.timeout });
    if (!gen.ok) return { exitCode: 3, output: buildFallbackSignal({ mode, target: input, error: gen.error, json: flags.json }) };
    const out = flags.json
      ? JSON.stringify({ mode, model: gen.model, answer: gen.text, usage: gen.usage }, null, 2)
      : `${gen.text}\n\n${cloudFooter({ model: gen.model, usage: gen.usage, durationMs: gen.durationMs })}`;
    return { exitCode: 0, output: out, telemetry: { mode, model: gen.model, usage: gen.usage, inChars: input.length, outChars: gen.text.length } };
  }

  // ---- file modes: summarize / longread (file path or "-" stdin) ----
  const cap = capForMode(mode, flags.maxBytes);
  const isStdin = input === "-";
  const file = isStdin
    ? await (deps.readStdin || readStdin)({ maxBytes: cap })
    : (deps.readCapped || readCapped)(input, cap, deps);
  if (!file.ok) return { exitCode: 2, output: `[ask-openrouter] ${file.error}` };
  // SAFETY: never send NC/G-code program output to an external cloud. Refuse unless --allow-unsafe.
  if (!flags.allowUnsafe && (deps.looksLikeNcProgram || looksLikeNcProgram)(file.content)) {
    return {
      exitCode: 2,
      output:
        "[ask-openrouter] refusing to send NC/G-code program output to an external cloud " +
        "(safety-routing rule: safety-critical output stays on Claude, and cloud egress publishes content). " +
        "Pass --allow-unsafe if this content is not safety-relevant.",
    };
  }
  const displayName = isStdin ? "(stdin)" : input;
  const messages = buildMessages({ system: systemPromptFor(mode, flags.ask), user: `FILE: ${displayName}\n\n${file.content}` });
  const maxTokens = flags.maxTokens || (mode === "longread" ? RESEARCH_MAX_TOKENS : DEFAULT_MAX_TOKENS);
  const gen = await call({ messages, model, maxTokens, timeoutMs: flags.timeout });
  if (!gen.ok) return { exitCode: 3, output: buildFallbackSignal({ mode, target: displayName, error: gen.error, json: flags.json }) };
  const note = file.truncated ? ` (first ${cap} of ${file.bytes} bytes)` : "";
  const out = flags.json
    ? JSON.stringify({ mode, model: gen.model, file: displayName, truncated: file.truncated, answer: gen.text, usage: gen.usage }, null, 2)
    : `${gen.text}\n\n${cloudFooter({ model: gen.model, usage: gen.usage, durationMs: gen.durationMs })}${note}`;
  return { exitCode: 0, output: out, telemetry: { mode, model: gen.model, usage: gen.usage, inChars: file.content.length, outChars: gen.text.length } };
}

/**
 * Pure: tokens saved by routing this offload to the cloud instead of into Claude's context.
 * The heavy INPUT was processed by OpenRouter (0 Claude tokens) and only the compact answer
 * returned -- so savings ~ input - output. Prefer OpenRouter's authoritative usage; else
 * estimate from chars. Never negative.
 */
export function cloudTokensSaved(telemetry) {
  const u = telemetry && telemetry.usage;
  const pt = u && Number(u.prompt_tokens);
  const ct = u && Number(u.completion_tokens);
  if (Number.isFinite(pt) && Number.isFinite(ct)) return Math.max(0, pt - ct);
  const inTok = Math.ceil(Math.max(0, Number(telemetry && telemetry.inChars) || 0) / CHARS_PER_TOKEN);
  const outTok = Math.ceil(Math.max(0, Number(telemetry && telemetry.outChars) || 0) / CHARS_PER_TOKEN);
  return Math.max(0, inTok - outTok);
}

/**
 * Record an EXECUTED cloud offload to the canonical offload-stats surface (mirrors
 * ask-ollama's recordExecution -- R8). decision:"offload" + extras.mode:"executed" routes
 * it to the SEPARATE executedOffloads/measuredTokensSaved adoption counters (NOT the Ollama
 * headline rate), under byHook["ask-openrouter"]; extras.lane:"cloud" lets the dashboard split
 * cloud from local. Fail-soft: telemetry must never break the CLI (dynamic import + catch);
 * disable with PRISM_ASK_OPENROUTER_TELEMETRY=0. Returns true when recorded.
 */
export async function recordCloudExecution(telemetry, importImpl = (s) => import(s)) {
  if (!telemetry || process.env.PRISM_ASK_OPENROUTER_TELEMETRY === "0") return false;
  try {
    const libUrl = new URL("../.claude/hooks/lib/ollama-stats.mjs", import.meta.url).href;
    const { recordOllamaEvent } = await importImpl(libUrl);
    recordOllamaEvent({
      hook: "ask-openrouter",
      decision: "offload",
      category: telemetry.mode,
      tokensSaved: cloudTokensSaved(telemetry),
      extras: { mode: "executed", lane: "cloud", model: telemetry.model },
    });
    return true;
  } catch { return false; /* stats lib unavailable -- never break the CLI */ }
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const USAGE = `ask-openrouter -- OpenRouter cloud query service (long-context / deep-research / free-overflow)

  node scripts/ask-openrouter.mjs ask <question>        general question
  node scripts/ask-openrouter.mjs research <question>   deep-research (thorough, cite)
  node scripts/ask-openrouter.mjs summarize <file|->    digest a file
  node scripts/ask-openrouter.mjs longread <file|->     analyze a LARGE doc (1M-ctx); --ask "<q>" to focus
  node scripts/ask-openrouter.mjs models                list the model registry

flags: --model <key|slug> --json --timeout <ms> --max-tokens <n> --max-bytes <n> --ask "<q>" --allow-unsafe

Needs OPENROUTER_API_KEY in env (free tier $0). Default model: nemotron-super-free (1M ctx).`;

async function main() {
  const parsed = parseArgs(process.argv.slice(2));
  if (parsed.error) { console.error(`[ask-openrouter] ${parsed.error}\n\n${USAGE}`); process.exit(2); }
  // A friendly heads-up (not a hard stop): the call itself fails loud without a key.
  if (parsed.mode !== "models" && !keyStatus().present) {
    console.error("[ask-openrouter] note: OPENROUTER_API_KEY is unset -- this call will fail loud. Set it: setx OPENROUTER_API_KEY \"sk-or-...\"");
  }
  const { exitCode, output, telemetry } = await runRequest(parsed);
  if (exitCode === 0 && telemetry) await recordCloudExecution(telemetry);
  (exitCode === 0 ? console.log : console.error)(output);
  process.exit(exitCode);
}

const INVOKED_DIRECTLY = process.argv[1] && resolve(process.argv[1]) === resolve(HERE);
if (INVOKED_DIRECTLY) {
  void main().catch((e) => { console.error(`[ask-openrouter] fatal: ${e && e.stack ? e.stack : e}`); process.exit(1); });
}
