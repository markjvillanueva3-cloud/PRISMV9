#!/usr/bin/env node
/**
 * ask-ollama.mjs — local Ollama query service (OLLAMA-EXPAND-MS0/U-OE01)
 *
 * Routes token-heavy work to a LOCAL Ollama model so it never enters the
 * Claude context window. Claude invokes this via Bash; only the compact
 * answer returns. Heavy inputs — the ~27 MB system-viz graph, large source
 * files, build-error dumps — are processed here in the subprocess and
 * discarded.
 *
 * Modes:
 *   viz <query>        ranked keyword search of the system-viz graph.
 *                      Default: returns compact hits (fast, no model).
 *                      --synth: also adds an Ollama-synthesized answer.
 *   rerank <query>     viz hits, then a VERIFIED ollama re-rank (model proposes
 *                      the order, code keeps only real candidate ids; fail-safe
 *                      to lexical). Enforces ollama for search/navigation ranking.
 *   summarize <file>   compact digest of a large file ("-" = read stdin)
 *   explain <file>     plain-language explanation of code ("-" = read stdin)
 *   triage <file>      diagnose a build/test/error dump ("-" = read stdin)
 *   ask <question>     general question, no PRISM context
 *
 * Flags:
 *   --synth            viz: add an Ollama-synthesized answer on top of hits
 *   --model <name>     override the model for this call
 *   --json             machine-readable output
 *   --max-hits <n>     viz: graph hits to keep (default 12, cap 50)
 *   --timeout <ms>     Ollama generate timeout (default 180000)
 *
 * Exit codes:
 *   0  ok
 *   2  usage error / missing input file
 *   3  infrastructure failure (graph unreadable, or Ollama unreachable in a
 *      mode that requires it). viz without --synth never needs Ollama; viz
 *      WITH --synth degrades to plain hits and still exits 0.
 *
 * Host note: the model's FIRST call cold-loads weights (~2 min on a
 * memory-pressured host). keep_alive holds it warm for 10 min after, so
 * later calls in a session are fast. One model is used for every mode to
 * avoid repeated cold-load thrash.
 *
 * Design: pure functions (exported, unit-tested) + a thin impure shell.
 * Fail-loud (R12): every failure path prints an explicit reason.
 */

import { readFileSync, existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, isAbsolute, resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolveSynthesisModel } from "./lib/host-aware-synthesis-model.mjs";
import { mcpCallStreamable } from "./lib/mcp-streamable-client.mjs";
import { buildRerankPrompt, rerankCandidates } from "./lib/ollama-search-rerank.mjs";
import { pickLoadedChatModel } from "./lib/ollama-loaded-chat-model.mjs";
import { loadedPreferenceForMode } from "./lib/ollama-mode-sufficiency.mjs";
import { primeCheapTier } from "./lib/ollama-cheap-tier-prime.mjs";
import { getVaultHints, formatVaultHintsBlock } from "./lib/vault-hints.mjs";
import { searchViaDaemon } from "./lib/master-index-search-lib.mjs";

/** Promisified execFile — argv-array form, never a shell string (injection-safe). */
const execFileAsync = promisify(execFile);

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..");
const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";

/**
 * Fail-soft fallback model when the host-aware resolver yields nothing
 * (resolveSynthesisModel is the normal path → gpt-oss:120b / qwen2.5-coder:32b
 * on the Blackwell). qwen2.5-coder:32b is the smallest KEPT model after the
 * BLACKWELL-MODEL-UPGRADE-PLAN retired the 3b/7b/14b coders — pointing the
 * floor at a deleted tag would cold-fail, so it must be a held model.
 * Override per-call with --model.
 */
const DEFAULT_MODEL = "qwen2.5-coder:32b";
/** keep_alive window -- holds the model warm so later calls skip cold-load. Reads
 *  OLLAMA_KEEP_ALIVE (operator sets 30m on the Blackwell host) so the per-call value
 *  does NOT override the server default down to 10m; fallback 30m for the 96GB box. */
const KEEP_ALIVE = process.env.OLLAMA_KEEP_ALIVE || "30m";
/**
 * Default num_predict (token CAP, not a target — short-answer models still stop
 * naturally at done_reason:"stop"). Reasoning models (gpt-oss harmony format)
 * emit a `thinking` channel BEFORE the final `response`; Ollama's 128-token
 * default starves them so `response` returns empty (done_reason:"length").
 * 1024 lets a reasoning model finish its chain-of-thought AND emit the answer.
 * Verified 2026-06-08: gpt-oss:120b @128 -> empty response; @1024 -> done_reason:"stop".
 */
const DEFAULT_NUM_PREDICT = 1024;
/** Default Ollama /api/generate timeout — covers a cold load on a slow host. */
const DEFAULT_TIMEOUT_MS = 180000;
const MIN_TIMEOUT_MS = 1000;
/** Default count, and hard ceiling, for viz graph hits. */
const DEFAULT_MAX_HITS = 12;
const MAX_HITS_CAP = 50;
/** Standard back-of-envelope characters-per-token ratio. */
const CHARS_PER_TOKEN = 4;
/** Largest file slice fed to a local model — keeps generation bounded. */
export const MAX_FILE_BYTES = 256 * 1024;
/** Shortest query token kept by the tokenizer. */
const MIN_TOKEN_LEN = 3;

/** Modes that take a file path; the rest take free text. */
export const FILE_MODES = new Set(["summarize", "explain", "triage"]);
export const TEXT_MODES = new Set(["viz", "ask", "rerank", "codegen"]);
export const ALL_MODES = new Set([...FILE_MODES, ...TEXT_MODES]);

/** Query filler words dropped before scoring graph nodes. */
const STOPWORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "of", "for", "to", "in", "on",
  "with", "and", "or", "that", "this", "which", "what", "where", "when", "how",
  "why", "does", "do", "did", "has", "have", "handle", "handles", "handled",
  "get", "gets", "find", "show", "me", "it", "its", "by", "as", "at", "from",
  "about", "use", "using", "used", "all", "any",
]);

/** Candidate graph files, newest-design first. */
const GRAPH_CANDIDATES = ["architecture-graph.json", "system-graph.json"];
/**
 * Largest graph file loadGraph will read. architecture-graph.json is ~27 MB;
 * the merged system-graph.json can be ~370 MB — far past what readFileSync +
 * JSON.parse can hold on a memory-pressured host. An over-cap candidate is
 * skipped with an explicit, actionable error rather than risking an OOM crash
 * (which would not be fail-loud — see R12).
 */
const MAX_GRAPH_BYTES = 80 * 1024 * 1024;
/** Bytes per megabyte — for human-readable size reporting. */
const BYTES_PER_MB = 1024 * 1024;

// ─────────────────────────────────────────────────────────────────────────
// Pure helpers (exported for unit tests)
// ─────────────────────────────────────────────────────────────────────────

/** Truncate `s` to `max` chars, appending an honest marker when cut. */
export function truncate(s, max) {
  const str = String(s == null ? "" : s);
  if (str.length <= max) return str;
  return str.slice(0, max) + `…[+${str.length - max} chars]`;
}

/** Rough token estimate — 4 chars/token, the standard back-of-envelope. */
export function estimateTokens(s) {
  return Math.ceil(String(s == null ? "" : s).length / CHARS_PER_TOKEN);
}

// OLLAMA-FLEET-AUDIT P1-5: the flat 180s default fails on large FILE inputs -- a
// cold-loaded 32B model summarizing a 57KB file does (cold) model-load +
// prompt-eval + generation that can exceed 180s, so the cap fires before the
// answer (FM-4: "large inputs always fail"). Scale the timeout with the input's
// estimated token count for file modes; free-text ask/viz/rerank stay on the
// default. An explicit --timeout always wins (handled at the call site).
const TIMEOUT_COLD_LOAD_MS = 60000;      // worst-case model cold-load headroom
const TIMEOUT_INPUT_MS_PER_TOKEN = 8;    // prompt-eval at a conservative ~125 tok/s
const TIMEOUT_OUTPUT_BUDGET_MS = 60000;  // num_predict generation at a slow local rate
const MAX_SCALED_TIMEOUT_MS = 600000;    // 10min hard ceiling -- never hang indefinitely

/**
 * Scale a generate timeout to the input size. Returns AT LEAST `base` (never
 * shorter than the caller's floor) and at most MAX_SCALED_TIMEOUT_MS. Pure.
 * @param {number} bytes  input length in chars (~= bytes for ASCII source)
 * @param {number} [base] floor timeout (default DEFAULT_TIMEOUT_MS)
 * @returns {number} ms
 */
export function scaleTimeoutForBytes(bytes, base = DEFAULT_TIMEOUT_MS) {
  const tokens = Math.ceil(Math.max(0, Number(bytes) || 0) / CHARS_PER_TOKEN);
  const need = TIMEOUT_COLD_LOAD_MS + tokens * TIMEOUT_INPUT_MS_PER_TOKEN + TIMEOUT_OUTPUT_BUDGET_MS;
  return Math.min(MAX_SCALED_TIMEOUT_MS, Math.max(base, need));
}

/** Resolve the model for this call: explicit override else the default. */
export function pickModel(override) {
  return override && String(override).trim() ? String(override).trim() : DEFAULT_MODEL;
}

/**
 * Quality-ordered preference of SUBSTANTIAL chat models for the loaded-first
 * selection (U-ASK-OLLAMA-LOADED-FIRST, slot:alpha). When one of these is ALREADY
 * resident in VRAM (/api/ps), runRequest uses it instead of cold-loading the
 * resolver's best-installed pick. WHY: a cold-load (~3-5s for a 32B, far longer for
 * a ~60GB model) PLUS the eviction of the warm model thrash the single shared
 * Blackwell card for the whole fleet (exactly what gpu-vram-admission-guard warns
 * about), and a slow offload makes the loop fall back to Claude -> token waste.
 * Deliberately EXCLUDES the tiny coders (1.5b/7b): if only a tiny model is warm, a
 * cold-load of the resolver's pick is worth it for output quality (strict-preference
 * gate in pickLoadedChatModel). An un-installed tag here is harmless -- it simply
 * never appears in /api/ps, so over-listing kept tags is safe. The trivial-task
 * offload path (the prompt rewriter) is a separate any-loaded consumer.
 */
export const OFFLOAD_LOADED_PREFERENCE = [
  "gpt-oss:120b", "qwen2.5-coder:32b", "qwen3-coder:30b", "deepseek-r1:32b",
  "gpt-oss:20b", "deepseek-r1:14b", "qwen2.5-coder:14b",
];

/**
 * Coder-first preference for `codegen` mode's loaded-first selection
 * (U-ASK-OLLAMA-CODEGEN, slot:zulu). A code-generation task wants a CODER model
 * (qwen-coder family), not a general reasoner (gpt-oss:120b) -- coders follow the
 * "emit only raw code" framing far more reliably. Same strict warm-pick semantics
 * as OFFLOAD_LOADED_PREFERENCE; DEFAULT_MODEL (qwen2.5-coder:32b) is the fail-soft
 * floor, so codegen always lands on a coder even when none is warm.
 */
export const CODER_LOADED_PREFERENCE = [
  "qwen2.5-coder:32b", "qwen3-coder:30b", "qwen2.5-coder:14b",
];

/**
 * Read the models currently RESIDENT in VRAM via /api/ps. Fail-soft: ANY error
 * (Ollama down, timeout, non-200, malformed JSON) -> [] so the caller transparently
 * falls back to the best-installed resolver -- this probe must never throw into
 * runRequest nor block the hot path. Short timeout (a local probe, not a generate).
 * fetchImpl injectable so the selection is unit-testable without a live GPU.
 * @returns {Promise<string[]>} resident model names (`name` or `model` field)
 */
export async function loadWarmModels(opts = {}) {
  const { fetchImpl = fetch, ollamaUrl = OLLAMA_URL, timeoutMs = 2000 } = opts;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetchImpl(`${ollamaUrl}/api/ps`, { signal: ctrl.signal });
    if (!res || !res.ok) return [];
    const json = await res.json();
    const models = Array.isArray(json && json.models) ? json.models : [];
    return models.map((m) => (m && (m.name || m.model)) || "").filter(Boolean);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Parse argv (the slice AFTER `node ask-ollama.mjs`). Returns
 * { mode, input, flags } or { error }. `error` is set on any usage problem
 * so the caller can fail loud rather than guess.
 */
export function parseArgs(argv) {
  const flags = {
    synth: false,
    json: false,
    model: "",
    allowUnsafe: false,
    maxHits: DEFAULT_MAX_HITS,
    timeout: DEFAULT_TIMEOUT_MS,
    timeoutExplicit: false, // true once --timeout is passed -> wins over size-scaling
    withContext: false,     // --with-context: prepend top-3 vault-memory excerpts (Gap 6 grounding)
  };
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--synth") flags.synth = true;
    else if (a === "--allow-unsafe") flags.allowUnsafe = true;
    else if (a === "--with-context") flags.withContext = true;
    else if (a === "--json") flags.json = true;
    else if (a === "--model") {
      const v = argv[++i];
      if (v === undefined) return { error: "--model needs a value" };
      flags.model = v;
    }
    else if (a === "--max-hits") {
      const n = Number.parseInt(argv[++i], 10);
      if (!Number.isFinite(n) || n < 1) return { error: "--max-hits needs a positive integer" };
      flags.maxHits = Math.min(n, MAX_HITS_CAP);
    } else if (a === "--timeout") {
      const n = Number.parseInt(argv[++i], 10);
      if (!Number.isFinite(n) || n < MIN_TIMEOUT_MS) {
        return { error: `--timeout needs an integer ≥ ${MIN_TIMEOUT_MS} (ms)` };
      }
      flags.timeout = n;
      flags.timeoutExplicit = true;
    } else if (a.startsWith("--")) {
      return { error: `unknown flag: ${a}` };
    } else {
      positional.push(a);
    }
  }
  const mode = positional.shift();
  if (!mode) return { error: "no mode given" };
  if (!ALL_MODES.has(mode)) return { error: `unknown mode: ${mode}` };
  const input = positional.join(" ").trim();
  if (!input) return { error: `mode '${mode}' needs ${FILE_MODES.has(mode) ? "a file path" : "a query"}` };
  return { mode, input, flags };
}

/**
 * Split a query into searchable tokens: lowercased, alphanumeric, ≥
 * MIN_TOKEN_LEN, stopwords removed. If that leaves nothing (e.g. an
 * all-stopword query), fall back to every word ≥ 2 chars so a search is
 * still attempted rather than silently returning nothing.
 */
export function tokenizeQuery(query) {
  const words = String(query == null ? "" : query)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  const kept = words.filter((w) => w.length >= MIN_TOKEN_LEN && !STOPWORDS.has(w));
  if (kept.length) return [...new Set(kept)];
  return [...new Set(words.filter((w) => w.length >= 2))];
}

/**
 * Score one graph node against query tokens. Each token found anywhere in
 * the node's text scores 1; a hit in the id or label (the strong signal)
 * scores 1 more. Returns 0 when no token matches.
 */
export function scoreNode(node, tokens) {
  if (!node || !tokens.length) return 0;
  const strong = `${node.id || ""} ${node.label || ""}`.toLowerCase();
  const full = `${strong} ${node.info || ""} ${node.domain || ""} ${node.subgroup || ""}`.toLowerCase();
  let score = 0;
  for (const t of tokens) {
    if (full.includes(t)) {
      score += 1;
      if (strong.includes(t)) score += 1;
    }
  }
  return score;
}

/**
 * Rank graph nodes against a free-text query. Pure: takes the already-parsed
 * graph object. Returns up to `maxHits` compact hit records, best first.
 */
export function searchGraph(query, graph, maxHits = DEFAULT_MAX_HITS) {
  const nodes = graph && Array.isArray(graph.nodes) ? graph.nodes : [];
  const tokens = tokenizeQuery(query);
  const scored = [];
  for (const n of nodes) {
    const score = scoreNode(n, tokens);
    if (score > 0) scored.push({ node: n, score });
  }
  scored.sort((a, b) => b.score - a.score || String(a.node.label || a.node.id || "").localeCompare(String(b.node.label || b.node.id || "")));
  return scored.slice(0, Math.max(1, maxHits)).map(({ node, score }) => ({
    id: node.id != null ? String(node.id) : "",
    label: node.label != null ? String(node.label) : "",
    layer: node.layer != null ? String(node.layer) : "",
    status: node.status != null ? String(node.status) : "",
    domain: node.domain != null ? String(node.domain) : "",
    info: truncate(node.info != null ? node.info : "", 180),
    score,
  }));
}

/** Render compact hits as a numbered list for a prompt or for plain output. */
export function renderHits(hits) {
  if (!hits.length) return "(no matching graph nodes)";
  return hits
    .map((h, i) => {
      const meta = [h.layer, h.status, h.domain].filter(Boolean).join(", ");
      return `${i + 1}. [${h.id}] ${h.label}${meta ? ` (${meta})` : ""}${h.info ? ` — ${h.info}` : ""}`;
    })
    .join("\n");
}

/** Build the viz-synthesis prompt: question + compacted graph hits. */
export function buildVizPrompt(query, hits) {
  return [
    "You are a code-architecture assistant for the PRISM manufacturing-intelligence platform.",
    "Answer the QUESTION using ONLY the SEARCH RESULTS below (nodes from the PRISM system graph).",
    "Be concise: 2-5 sentences. Cite node ids in [brackets]. If the results do not answer the question, say so plainly — do not invent nodes.",
    "",
    `QUESTION: ${query}`,
    "",
    "SEARCH RESULTS:",
    renderHits(hits),
    "",
    "ANSWER:",
  ].join("\n");
}

/** Build a file-mode prompt for summarize / explain / triage. */
export function buildFilePrompt(mode, filename, content) {
  const head = {
    summarize:
      "Summarize this file for an engineer who has not seen it. State its purpose, key exports/sections, and anything surprising. 4-8 sentences.",
    explain:
      "Explain what this code does in plain language: control flow, key functions, and edge cases handled. Be precise and concise.",
    triage:
      "This is a build/test/error dump. Identify the ROOT cause, the single most likely fix, and which file/line to look at. Be direct — 3-6 sentences.",
  }[mode];
  return [head, "", `FILE: ${filename}`, "```", content, "```", "", "RESPONSE:"].join("\n");
}

/** Build the ask-mode prompt: a bare question, no PRISM context. */
export function buildAskPrompt(question) {
  return `Answer concisely and accurately.\n\nQUESTION: ${question}\n\nANSWER:`;
}

/**
 * Build the codegen-mode prompt (U-ASK-OLLAMA-CODEGEN, slot:zulu): frame the spec
 * as a pure code-generation request for a local coder model. Emits ONLY code (no
 * prose, no markdown fences) so a caller can pipe the output straight into a file
 * or the /forge seam. Deterministic, single-turn.
 */
export function buildCodegenPrompt(spec) {
  return [
    "You are a senior software engineer. Generate ONLY the code that satisfies the",
    "spec below. No explanation, no prose, no markdown fences -- emit raw source only.",
    "Match the language/idiom implied by the spec. If the spec is ambiguous, choose",
    "the smallest correct implementation and add a one-line comment naming the assumption.",
    "",
    `SPEC: ${spec}`,
    "",
    "CODE:",
  ].join("\n");
}

/**
 * Detect a codegen SPEC that asks for safety-critical machine output -- a G-code /
 * NC program / post-processor output to actually RUN. Such output MUST flow through
 * prism_cam + the physics/safety engines, never a raw local LLM. The request-side
 * mirror of looksLikeNcProgram's content guard. Code that PROCESSES g-code (a
 * parser/visualizer/linter/reader) is NOT machine output and stays allowed.
 * ASCII-only; case-insensitive.
 * @param {string} spec
 * @returns {boolean}
 */
export function looksLikeGcodeRequest(spec) {
  if (!spec || typeof spec !== "string") return false;
  const s = spec.toLowerCase();
  // Code that READS/PROCESSES g-code is safe to generate -- not shop-floor output.
  if (/\b(pars|visuali|lint|read|interpret|simulat|render|highlight|tokeniz|format|view)\w*/.test(s)) {
    return false;
  }
  const wantsEmit = /\b(generat|writ|emit|output|produc|creat|mak)\w*/.test(s);
  const gcodeNoun =
    /\bg-?code\b/.test(s) ||
    /\bnc[\s-]?(program|file|code|output)\b/.test(s) ||
    /\bpost[\s-]?process(or|ed)?\b/.test(s) ||
    /\bm-?code\b/.test(s);
  return wantsEmit && gcodeNoun;
}

/** Minimum NC lines before stdin/file content is treated as a G-code program. */
export const NC_PROGRAM_MIN_LINES = 5;
/** Fraction of non-blank lines that must look like NC lines to flag a program. */
const NC_PROGRAM_MIN_RATIO = 0.3;
/**
 * Strong NC signals needed before bare coordinate-continuation lines are trusted as
 * program content (a coordinate CSV / data table with NO strong signal must NOT flag).
 */
const NC_STRONG_MIN = 2;
/**
 * Strong NC signal -- ISO/Fanuc/Haas G or M word block: optional N/O sequence number,
 * then a G or M word with the usual address letters. Matches "G01 X1.5", "N20 G0 Z0.1",
 * "M03 S1200", "g1x2" (lowercase, decimal-less).
 */
const NC_BLOCK_RE = /^\s*(?:[NO]\d+\s+)?[GM]\d{1,3}(?:[\s.]|$|[XYZABCUVWIJKRFSTHD])/i;
/**
 * Strong NC signal -- Heidenhain conversational keywords (distinctive; each requires a
 * following token so prose like "L is the length" never matches). Matches "BEGIN PGM",
 * "L X+10 ...", "CYCL DEF 200", "TOOL CALL 5", "CC X+0 Y+0", "FN 0:".
 */
const NC_HEIDENHAIN_RE = /^\s*(?:\d+\s+)?(?:BEGIN PGM|END PGM|TOOL CALL|CYCL\s+(?:DEF|CALL)|LBL\s|FN\s*\d|L[PT]?\s+[XYZ][-+]|C[CR]\s+[XYZ][-+])/i;
/**
 * Modal coordinate-continuation line -- axis words + numbers with NO leading G/M word
 * (e.g. "X5.0 Y2.5", "  Z-0.5 F100"). Dominant in real Fanuc/Haas contouring output.
 * Counted ONLY when strong NC context exists (>= NC_STRONG_MIN), so a coordinate data
 * table without any G/M or Heidenhain line is never mistaken for a program.
 */
const NC_COORD_CONT_RE = /^\s*(?:[NO]\d+\s+)?[XYZABCUVWIJK][-+]?\d*\.?\d+(?:\s+[XYZABCUVWIJKRF][-+]?\d*\.?\d+)*\s*$/i;

/**
 * Heuristic: does `text` look like an actual NC / G-code PROGRAM (not source code that
 * merely mentions a code, nor an error dump with one stray block)? PRISM safety rule:
 * generated NC output is safety-critical and must never be summarized/judged by a
 * non-Claude local model. Recognizes ISO/Fanuc/Haas (G/M words + modal coordinate
 * continuation) and Heidenhain conversational. Triggers ONLY on a DENSE block of NC
 * lines (>= NC_PROGRAM_MIN_LINES and >= NC_PROGRAM_MIN_RATIO of non-blank lines), so a
 * triage dump with one stray G-code line is NOT flagged. Continuation lines count only
 * with >= NC_STRONG_MIN strong signals so a plain coordinate table is not flagged.
 * KNOWN LIMIT: Mazatrol (tabular/binary) is not text-detectable here -- callers piping an
 * unrecognized dialect must rely on Claude-side judgment, not assume this guard saw it. Pure.
 */
export function looksLikeNcProgram(text) {
  const lines = String(text == null ? "" : text).split(/\r?\n/);
  let nonBlank = 0;
  let strong = 0;
  let cont = 0;
  for (const line of lines) {
    if (!line.trim()) continue;
    nonBlank += 1;
    if (NC_BLOCK_RE.test(line) || NC_HEIDENHAIN_RE.test(line)) strong += 1;
    else if (NC_COORD_CONT_RE.test(line)) cont += 1;
  }
  const ncLines = strong + (strong >= NC_STRONG_MIN ? cont : 0);
  if (ncLines < NC_PROGRAM_MIN_LINES) return false;
  return ncLines / Math.max(1, nonBlank) >= NC_PROGRAM_MIN_RATIO;
}

/** One-line honest token-economy footer: heavy bytes in vs. answer out. */
export function savingsFooter(rawInputChars, outputChars) {
  const inTok = Math.ceil(Math.max(0, Number(rawInputChars) || 0) / CHARS_PER_TOKEN);
  const outTok = Math.ceil(Math.max(0, Number(outputChars) || 0) / CHARS_PER_TOKEN);
  const saved = Math.max(0, inTok - outTok);
  return `↓ ollama-offload: ~${inTok} tok processed locally → ~${outTok} tok returned to Claude (~${saved} saved)`;
}

// ─────────────────────────────────────────────────────────────────────────
// Impure shell (deps injected so the pure path stays unit-testable)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Load + parse the system-viz graph. Tries the dedicated architecture graph
 * first, then the merged system graph. A candidate larger than
 * MAX_GRAPH_BYTES is SKIPPED (never read) so a ~370 MB merged graph cannot
 * OOM JSON.parse — the failure is explicit and actionable instead. Returns
 * { ok, graph, file, bytes } or { ok:false, error }.
 */
export function loadGraph({
  root = REPO_ROOT,
  readImpl = readFileSync,
  existsImpl = existsSync,
  statImpl = statSync,
} = {}) {
  const tooLarge = [];
  for (const name of GRAPH_CANDIDATES) {
    const path = join(root, "state", "shared", "system-viz", name);
    if (!existsImpl(path)) continue;
    let size;
    try {
      size = statImpl(path).size;
    } catch (e) {
      return { ok: false, error: `cannot stat ${name}: ${e.message}` };
    }
    if (!Number.isFinite(size)) {
      // Defensive: real statSync always yields a numeric size; a malformed
      // result must fail loud, never fall through and read an unsized file.
      return { ok: false, error: `cannot determine the size of ${name}` };
    }
    if (size > MAX_GRAPH_BYTES) {
      tooLarge.push(`${name} (${Math.round(size / BYTES_PER_MB)} MB)`);
      continue;
    }
    let text;
    try {
      text = String(readImpl(path, "utf8"));
    } catch (e) {
      return { ok: false, error: `cannot read ${name}: ${e.message}` };
    }
    let graph;
    try {
      graph = JSON.parse(text);
    } catch (e) {
      return { ok: false, error: `${name} is not valid JSON: ${e.message}` };
    }
    if (!graph || !Array.isArray(graph.nodes)) {
      return { ok: false, error: `${name} has no nodes array` };
    }
    return { ok: true, graph, file: name, bytes: text.length };
  }
  if (tooLarge.length) {
    return {
      ok: false,
      error:
        `system-viz graph too large to parse safely: ${tooLarge.join(", ")} ` +
        `exceed the ${Math.round(MAX_GRAPH_BYTES / BYTES_PER_MB)} MB cap — regenerate the ` +
        `compact architecture graph with: node scripts/generate-system-viz.mjs`,
    };
  }
  return { ok: false, error: `no system-viz graph found (looked for ${GRAPH_CANDIDATES.join(", ")})` };
}

/**
 * POST a single non-streaming /api/generate request. Returns
 * { ok, text, evalCount } or { ok:false, error }. Never throws.
 */
export async function callOllama(model, prompt, opts = {}) {
  const {
    fetchImpl = fetch,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    ollamaUrl = OLLAMA_URL,
    numPredict = DEFAULT_NUM_PREDICT,
    numCtx,
  } = opts;
  // RBA-INFERENCE-LANE-MS0 (consumer): yield briefly to an in-flight higher-priority RBA pre-action
  // vote so it doesn't queue behind this background generate. Fail-open + cheap when idle (no lease
  // file -> instant). Placed before the timeout timer so the yield never eats the fetch budget.
  try { await (await import("./lib/ollama-priority-lease.mjs")).yieldToHigherPriority({ env: process.env }); } catch { /* no yield (fail-open) */ }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetchImpl(`${ollamaUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        keep_alive: KEEP_ALIVE,
        // num_predict caps generation; reasoning models (gpt-oss harmony) need
        // headroom to finish the `thinking` channel before emitting `response`.
        // num_ctx is opt-in (omitted -> model default): large-context callers
        // (e.g. transcript mining, chunked to fit 32768) pass it so the direct
        // path -- including the MCP fail-soft fallback -- does not truncate.
        options: { temperature: 0.2, num_predict: numPredict, ...(numCtx ? { num_ctx: numCtx } : {}) },
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `Ollama HTTP ${res.status}: ${String(body).slice(0, 200)}` };
    }
    const json = await res.json();
    const text = String(json.response || "").trim();
    if (!text) {
      // Honest diagnosis (R12): a reasoning model that filled `thinking` but not
      // `response` and stopped on "length" was truncated mid-chain-of-thought —
      // surface the real cause (raise num_predict) instead of a generic empty.
      const thinking = String(json.thinking || "").trim();
      if (thinking && json.done_reason === "length") {
        return {
          ok: false,
          error: `Ollama reasoning model truncated: response empty, ${thinking.length} thinking chars, done_reason=length — raise num_predict (current ${numPredict})`,
        };
      }
      return { ok: false, error: "Ollama returned an empty response" };
    }
    return { ok: true, text, evalCount: json.eval_count || 0 };
  } catch (e) {
    const why =
      e && e.name === "AbortError"
        ? `Ollama timed out after ${timeoutMs}ms (model may be cold-loading on a busy host — retry, or pre-warm with: ollama run ${model})`
        : `Ollama unreachable: ${e && e.message}`;
    return { ok: false, error: why };
  } finally {
    clearTimeout(timer);
  }
}

// ── Docker Models fallback (DOCKER-MCP-WIRE-MS0/U-MODELS-FALLBACK) ──────────
// When the Ollama daemon is wedged/down, route the same prompt to Docker
// Models (`docker model run`) so PRISM's local-LLM offload degrades instead
// of failing hard. Opt-in via callLocalModel; callOllama itself is untouched.

/** Ollama error substrings that mean "daemon down" — the only fallback trigger. */
const OLLAMA_DAEMON_DOWN_RE = /ECONNREFUSED|AbortError|timed out|Ollama unreachable|HTTP 50[23]/i;

/** Built-in Ollama→Docker-Models name map. gemma3 is the resident Docker model.
 *  Keyed by the KEPT routing models (post BLACKWELL-MODEL-UPGRADE-PLAN) — the
 *  retired 3b/7b coders are gone, so the floor coder (qwen2.5-coder:32b) and the
 *  pulled gpt-oss models map to the resident Docker fallback. */
const DEFAULT_DOCKER_MODEL_MAP = {
  "qwen2.5-coder:32b": "gemma3",
  "gpt-oss:120b": "gemma3",
  "gpt-oss:20b": "gemma3",
  "nomic-embed-text": null,
};

/**
 * Map an Ollama model name to its Docker Models equivalent. Returns null when
 * no equivalent exists — the caller then skips the fallback rather than
 * guessing a wrong model. Override the whole map with the
 * PRISM_DOCKER_MODEL_MAP env var (a JSON object); a malformed value is
 * ignored and the built-in defaults stand (fail-soft — an env typo must never
 * silently disable a known-good mapping).
 */
export function mapOllamaToDockerModel(ollamaModelName) {
  let map = DEFAULT_DOCKER_MODEL_MAP;
  const raw = process.env.PRISM_DOCKER_MODEL_MAP;
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        map = parsed;
      }
    } catch {
      // malformed PRISM_DOCKER_MODEL_MAP — fail-soft to the built-in defaults
    }
  }
  if (
    !ollamaModelName ||
    !Object.prototype.hasOwnProperty.call(map, ollamaModelName)
  ) {
    return null;
  }
  const mapped = map[ollamaModelName];
  return typeof mapped === "string" && mapped.trim() ? mapped : null;
}

/**
 * Run a prompt through a local Docker Models model — the Ollama-down fallback.
 * Docker Models exposes no /api/generate HTTP surface, so the CLI is the
 * integration point: `docker model run <model> <prompt>` prints the
 * completion to stdout. Uses execFile (argv-array form, never a shell string)
 * so a prompt with shell metacharacters cannot inject. Returns the callOllama
 * shape plus source:"docker-models". Never throws.
 */
export async function callDockerModel(model, prompt, opts = {}) {
  const { execFileImpl = execFileAsync, timeoutMs = DEFAULT_TIMEOUT_MS } = opts;
  try {
    const { stdout } = await execFileImpl(
      "docker",
      ["model", "run", model, prompt],
      { timeout: timeoutMs, maxBuffer: 8 * 1024 * 1024 },
    );
    const text = String(stdout || "").trim();
    if (!text) {
      return { ok: false, error: "Docker Models returned an empty response" };
    }
    return { ok: true, text, evalCount: 0, source: "docker-models" };
  } catch (e) {
    const timedOut = !!(e && (e.killed || e.signal));
    const why = timedOut
      ? `Docker Models timed out after ${timeoutMs}ms (model may be cold-loading)`
      : `Docker Models unreachable: ${e && e.message ? e.message : String(e)}`;
    return { ok: false, error: why };
  }
}

/**
 * Resilient local-model call: try Ollama, fall back to Docker Models when —
 * and only when — the Ollama failure looks like a dead daemon AND a Docker
 * Models equivalent for the model exists. A non-daemon Ollama failure (bad
 * model name, empty response) is a REAL error and is returned as-is, never
 * masked by a fallback attempt. opts.fallbackToDockerModels (default true)
 * disables the fallback. Every return path is tagged source:"ollama" |
 * "docker-models". Never throws.
 */
export async function callLocalModel(model, prompt, opts = {}) {
  const {
    fallbackToDockerModels = true,
    callOllamaImpl = callOllama,
    callDockerModelImpl = callDockerModel,
  } = opts;
  const primary = await callOllamaImpl(model, prompt, opts);
  if (primary.ok) return { ...primary, source: "ollama" };
  if (fallbackToDockerModels === false) return { ...primary, source: "ollama" };
  if (!OLLAMA_DAEMON_DOWN_RE.test(String(primary.error || ""))) {
    return { ...primary, source: "ollama" };
  }
  const dockerModel = mapOllamaToDockerModel(model);
  if (!dockerModel) return { ...primary, source: "ollama" };
  const fb = await callDockerModelImpl(dockerModel, prompt, opts);
  if (fb.ok) return fb;
  // Both paths failed — return the ORIGINAL Ollama error. It is the primary
  // route; surfacing the fallback's error would mislead the operator.
  return { ...primary, source: "ollama" };
}

// ── MCP routing (LOCAL-LLM-MS1/U-LOCAL-GENERATE-CONSUMER) ──────────────────
// Operator directive: "make sure the local LLMs route through the prism MCP
// server". prism_local:local_generate (LOCAL-LLM-MS1/U-LOCAL-GENERATE) is the
// server-side route; this is the client side. Opt-in + fail-soft: enabling it
// can only help (a down/stale MCP server falls back to direct Ollama), so it is
// never a hard dependency.

/**
 * True when local-LLM calls should route through the PRISM MCP server. Reads
 * PRISM_LOCAL_LLM_VIA_MCP (1/true/yes/on). Default OFF -> the direct Ollama
 * /api/generate path is byte-identical to the pre-MCP behavior. Pure.
 */
export function mcpRoutingEnabled(env = process.env) {
  const v = String((env && env.PRISM_LOCAL_LLM_VIA_MCP) || "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

/**
 * Margin added to the inner Ollama timeout for the OUTER MCP envelope timeout, so
 * the server-side generate gets to finish (or time out with its own message)
 * before the transport aborts. 5s comfortably covers MCP round-trip + dispatch.
 */
const MCP_ENVELOPE_MARGIN_MS = 5000;

/**
 * Unwrap a prism_local:local_generate MCP tools/call `result` into the
 * LocalGenerateOutput object { success, content, error?, model, ollamaUsed, ... }.
 * The transport may deliver it as `structuredContent` (already an object) or as
 * a `content[]` text part holding the JSON string. Pure; fail-loud (R12) on a
 * shape it cannot read. Returns { ok:true, data } | { ok:false, error }.
 */
export function extractLocalGeneratePayload(result) {
  if (!result || typeof result !== "object") {
    return { ok: false, error: "MCP result is not an object" };
  }
  // A tool-level error (MCP isError) carries failure text in content[]; do NOT
  // try to parse it as LocalGenerateOutput JSON -- surface it so the caller fails
  // soft cleanly. Seen live 2026-06-09: a running bundle predating local_generate
  // returns an "MCP error ..." text part rather than a JSON payload.
  if (result.isError === true) {
    const errText = Array.isArray(result.content)
      ? result.content.filter((c) => c && typeof c.text === "string").map((c) => c.text).join(" ").trim()
      : "";
    return { ok: false, error: errText || "MCP tool returned isError with no text" };
  }
  const sc = result.structuredContent;
  if (sc && typeof sc === "object" && typeof sc.success === "boolean") {
    return { ok: true, data: sc };
  }
  const content = Array.isArray(result.content) ? result.content : null;
  if (content && content.length) {
    const text = content
      .filter((c) => c && typeof c.text === "string")
      .map((c) => c.text)
      .join("")
      .trim();
    if (text) {
      try {
        const data = JSON.parse(text);
        if (data && typeof data === "object") return { ok: true, data };
        return { ok: false, error: "MCP local_generate payload is not a JSON object" };
      } catch (e) {
        return { ok: false, error: `MCP local_generate payload is not valid JSON: ${e && e.message ? e.message : e}` };
      }
    }
  }
  return { ok: false, error: "MCP result has neither structuredContent nor a text content part" };
}

/**
 * Route ONE local-LLM completion through prism_local:local_generate on the PRISM
 * MCP server. Returns callOllama's shape ({ ok, text, evalCount } | { ok:false,
 * error }) plus source:"mcp", so callers stay transport-agnostic. Never throws.
 * The inner Ollama timeout goes to the dispatcher; the MCP envelope timeout gets
 * a small margin on top so the server-side generate finishes before the
 * transport aborts. `numPredict` maps to the dispatcher's `maxTokens`.
 */
export async function callViaMcp(model, prompt, opts = {}) {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    numPredict = DEFAULT_NUM_PREDICT,
    system,
    numCtx,
    mcpCallImpl = mcpCallStreamable,
  } = opts;
  const params = { prompt, model, maxTokens: numPredict, timeoutMs };
  if (system && String(system).trim()) params.system = String(system);
  if (numCtx) params.numCtx = numCtx; // large-context tasks -> prism_local local_generate num_ctx
  const r = await mcpCallImpl({
    dispatcher: "prism_local",
    action: "local_generate",
    params,
    timeoutMs: timeoutMs + MCP_ENVELOPE_MARGIN_MS,
  });
  if (!r.ok) return { ok: false, error: `MCP route: ${r.error}`, source: "mcp" };
  const payload = extractLocalGeneratePayload(r.result);
  if (!payload.ok) return { ok: false, error: `MCP route: ${payload.error}`, source: "mcp" };
  const d = payload.data;
  const text = typeof d.content === "string" ? d.content.trim() : "";
  if (d.success && text) {
    return { ok: true, text, evalCount: 0, model: d.model || model, source: "mcp" };
  }
  return { ok: false, error: `MCP local_generate failed: ${d.error || "empty content"}`, source: "mcp" };
}

/**
 * Transport-aware local-LLM entry point used by runRequest. When MCP routing is
 * enabled (PRISM_LOCAL_LLM_VIA_MCP or opts.viaMcp), the call goes through the MCP
 * server first; ANY MCP failure (server down, stale bundle without local_generate,
 * timeout) FAILS SOFT to the direct Ollama path so enabling the route never makes
 * a working offload start failing. Gate OFF (default) is byte-identical to calling
 * callOllama directly. Returns callOllama's shape plus a source tag. Never throws.
 */
// Adaptive default context window (U-ALPHA-OLLAMA-NUMCTX-FIX, slot:alpha 2026-06-24).
// PROVEN: the server's global OLLAMA_CONTEXT_LENGTH (131072 on the Blackwell box) is
// reserved as KV cache PER PARALLEL SLOT, so at NUM_PARALLEL=4 a few concurrent
// offload calls exhaust VRAM and WEDGE the runner (measured: c=8 hung the server at
// default context; the same sweep at num_ctx=4096 completed 8/8 AND raised the
// concurrency knee c=2->c=4, peak 255->303 tok/s). Sizing num_ctx to the actual
// input+output instead of 131072 is PROVABLY output-safe: as long as num_ctx >= the
// real token count, the model sees the whole prompt -> byte-identical output, only the
// KV-cache RESERVATION shrinks; if the input genuinely needs > MAX it clamps to MAX
// (no worse than the old global default).
//
// SIZING BY UTF-8 BYTES (not char count). For the byte-level BPE tokenizers these
// models use (qwen2.5-coder, gpt-oss/o200k, deepseek-r1), every token covers >= 1
// byte, so the real token count is ALWAYS <= the UTF-8 byte length, for ANY script.
// Reserving `bytes` therefore provably >= the real tokens -> the whole prompt fits ->
// identical output, with NO truncation for English, code, CJK, or accented Latin
// alike. (An earlier chars/3 estimate UNDERSHOT CJK -- 1 char can be ~1-3 tokens --
// and the Polish/Spanish JM shop floor; scrutiny arm-B P1, slot:alpha 2026-06-24.)
const MIN_NUM_CTX = 2048;
const MAX_NUM_CTX = 131072;

/** Right-size num_ctx to fit prompt+system+output. PURE. Provably never truncates (tokens<=bytes). */
export function defaultNumCtxForPrompt(prompt, numPredict = DEFAULT_NUM_PREDICT, system = "") {
  const bytes = Buffer.byteLength(typeof prompt === "string" ? prompt : "", "utf8")
    + Buffer.byteLength(typeof system === "string" ? system : "", "utf8");
  const out = Number.isFinite(numPredict) && numPredict > 0 ? numPredict : DEFAULT_NUM_PREDICT;
  const estimate = bytes + out + 1024; // bytes >= real tokens; +1024 safety margin
  return Math.max(MIN_NUM_CTX, Math.min(MAX_NUM_CTX, estimate));
}

export async function callModel(model, prompt, opts = {}) {
  const {
    viaMcp = mcpRoutingEnabled(),
    callOllamaImpl = callOllama,
    callViaMcpImpl = callViaMcp,
    ...rest
  } = opts;
  // When the caller did not pin num_ctx, right-size it to the input so a short
  // mechanical offload reserves a small KV cache (safe concurrency, freed VRAM)
  // instead of the global 131072. Provably output-safe (overshoot -> no truncation).
  if (rest.numCtx == null) {
    rest.numCtx = defaultNumCtxForPrompt(prompt, rest.numPredict, rest.system);
  }
  if (viaMcp) {
    const m = await callViaMcpImpl(model, prompt, rest);
    if (m.ok) return { ...m, source: "mcp" };
    const direct = await callOllamaImpl(model, prompt, rest);
    return { ...direct, source: direct.ok ? "ollama-fallback" : "ollama", mcpError: m.error };
  }
  const direct = await callOllamaImpl(model, prompt, rest);
  return { ...direct, source: "ollama" };
}

/** Read a file safely, capping at MAX_FILE_BYTES. Returns { ok, content, bytes, truncated }. */
export function readFileCapped(path, { root = REPO_ROOT } = {}) {
  const abs = isAbsolute(path) ? path : resolve(root, path);
  if (!existsSync(abs)) return { ok: false, error: `file not found: ${path}` };
  let st;
  try {
    st = statSync(abs);
  } catch (e) {
    return { ok: false, error: `cannot stat ${path}: ${e.message}` };
  }
  if (!st.isFile()) return { ok: false, error: `not a file: ${path}` };
  let content;
  try {
    content = readFileSync(abs, "utf8");
  } catch (e) {
    return { ok: false, error: `cannot read ${path}: ${e.message}` };
  }
  const truncated = content.length > MAX_FILE_BYTES;
  return {
    ok: true,
    content: truncated ? content.slice(0, MAX_FILE_BYTES) : content,
    bytes: st.size,
    truncated,
  };
}

/**
 * Read all of stdin (the "-" input convention) into the readFileCapped shape, so
 * command output can be piped to a local model: `rtk grep foo | ask-ollama summarize -`.
 * This is the rtk-complementary seam: rtk filters command output structurally; the local
 * model then compresses what is left, on the Blackwell box, at $0. Caps at MAX_FILE_BYTES.
 * The stream is injectable so the path stays unit-testable. Returns
 * { ok, content, bytes, truncated } | { ok:false, error }. Never throws.
 */
export async function readStdin({ stream = process.stdin, maxBytes = MAX_FILE_BYTES } = {}) {
  try {
    const chunks = [];
    let total = 0;
    for await (const chunk of stream) {
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
      chunks.push(buf);
      total += buf.length;
      if (total > maxBytes) break;
    }
    const full = Buffer.concat(chunks).toString("utf8");
    if (!full.trim()) return { ok: false, error: "stdin was empty (nothing piped to '-')" };
    const truncated = full.length > maxBytes;
    return {
      ok: true,
      content: truncated ? full.slice(0, maxBytes) : full,
      bytes: full.length,
      truncated,
    };
  } catch (e) {
    return { ok: false, error: `cannot read stdin: ${e && e.message ? e.message : e}` };
  }
}

// ─────────────────────────────────────────────────────────────────────────
// CLI
// ─────────────────────────────────────────────────────────────────────────

const USAGE = `ask-ollama — local Ollama query service (offloads token-heavy work)

  node scripts/ask-ollama.mjs viz <query>        search the system-viz graph
  node scripts/ask-ollama.mjs viz <query> --synth   ...plus an Ollama answer
  node scripts/ask-ollama.mjs rerank <query>     verified ollama re-rank of the hits
  node scripts/ask-ollama.mjs summarize <file>   digest a large file
  node scripts/ask-ollama.mjs explain <file>     explain code
  node scripts/ask-ollama.mjs triage <file>      diagnose an error dump
  node scripts/ask-ollama.mjs ask <question>     general question
  node scripts/ask-ollama.mjs codegen <spec>     generate code via a local coder model

  file modes accept "-" to read stdin (pipe command output through a local model):
    rtk grep foo src | node scripts/ask-ollama.mjs summarize -

flags: --synth --model <n> --json --max-hits <n> --timeout <ms> --allow-unsafe --with-context
  --with-context   ask/codegen/file modes: prepend top-3 PRISM memory-vault excerpts to ground the answer`;

/**
 * buildFallbackSignal -- P0-3 (OLLAMA-FLEET-AUDIT FM-2 / Sonnet-fallback).
 * When LOCAL generation fails (Ollama down, model unreachable, timeout,
 * reasoning-truncation) ask-ollama must NOT dead-end at a cryptic exit 3.
 * It emits an explicit Claude/Sonnet FALLBACK directive so the caller (Claude,
 * running this command) knows IT is the fallback path the operator mandated.
 * Exit code stays 3 (a real failure for scripts that branch on it); the OUTPUT
 * becomes actionable. --json yields a machine-readable {lane:"claude"} hint so
 * a programmatic caller can escalate. Self-contained (no hooks/lib import keeps
 * this script hermetic + worktree-portable). ASCII-only.
 *
 * @param {{mode:string, target?:string, error:string, json?:boolean}} o
 * @returns {string}
 */
export function buildFallbackSignal({ mode, target, error, json }) {
  const reason = `local Ollama generation failed (${error})`;
  if (json) {
    return JSON.stringify({
      ollamaUnavailable: true,
      lane: "claude",
      fellBack: true,
      mode,
      target: target || null,
      reason,
      directive: "Ollama could not run this task -- you are the fallback. Handle it directly.",
    }, null, 2);
  }
  return [
    "[ask-ollama] OLLAMA FALLBACK -> Claude/Sonnet.",
    `The local "${mode}" task could not run: ${error}.`,
    "You are the fallback (operator directive: Sonnet fallback when Ollama fails).",
    `Handle "${target || "this task"}" directly -- do not retry the local model in a loop.`,
  ].join("\n");
}

/**
 * Execute one request. All I/O goes through injected deps so the whole
 * function is unit-testable. Returns { exitCode, output }; the caller
 * prints + exits.
 */
export async function runRequest(parsed, deps = {}) {
  const { mode, input, flags } = parsed;
  // Loaded-first model selection (U-ASK-OLLAMA-LOADED-FIRST, slot:alpha) over the
  // host-aware resolver (BLACKWELL-TOKEN-SYNERGY-MS0/U-BW-SYNTH-CONSUMERS):
  //   1. an explicit --model wins (operator intent; flags.model is "" when none was
  //      passed -- parseArgs sentinel). The /api/ps probe is skipped entirely here.
  //   2. else prefer a SUBSTANTIAL chat model ALREADY resident in VRAM -- avoids the
  //      cold-load + warm-model eviction that thrash the shared Blackwell card and
  //      slow the offload enough that the loop falls back to Claude (token waste).
  //   3. else fall back to the resolver's best-INSTALLED pick (accepts a cold-load);
  //      DEFAULT_MODEL is the final fail-soft floor (Ollama down / resolver empty).
  // loadWarmModels + resolveSynthesisModel are async + fail-soft (never throw here)
  // and injectable via deps so runRequest stays fully unit-testable.
  let model;
  if (flags.model) {
    model = pickModel(flags.model);
  } else if (mode === "codegen") {
    // codegen wants a CODER, but must still respect loaded-first (avoid the VRAM
    // thrash the whole selection design guards against):
    //   warm coder  ->  warm general substantial model  ->  cold-load the coder floor.
    // The synthesis resolver is deliberately SKIPPED here -- it biases to the largest
    // reasoner (gpt-oss:120b) and would cold-load ~60GB for mechanical codegen, worse
    // than the 32B coder floor (DEFAULT_MODEL, a coder).
    const warm = await (deps.loadWarmModels || loadWarmModels)();
    model =
      pickLoadedChatModel(warm, CODER_LOADED_PREFERENCE, { strict: true }) ||
      pickLoadedChatModel(warm, OFFLOAD_LOADED_PREFERENCE, { strict: true }) ||
      DEFAULT_MODEL;
  } else {
    // Per-mode loaded-first: for the MEASURED generative modes (summarize/explain) the judged ladder
    // proved qwen2.5-coder:7b is NON-INFERIOR to the 32b floor, so loadedPreferenceForMode PREPENDS
    // 7b -- a WARM 7b is then preferred at equal quality, ~5GB vs ~20GB VRAM (U-ALPHA-OLLAMA-MODE-
    // SUFFICIENCY). Strict semantics are unchanged: a COLD 7b is skipped and the big-first base wins,
    // so this can only ever upgrade a warm-cheap pick, never force a cold-load. UNMEASURED modes
    // (triage/viz/ask/rerank) get the base preference untouched.
    const pref = loadedPreferenceForMode(mode, OFFLOAD_LOADED_PREFERENCE);
    const warm = await (deps.loadWarmModels || loadWarmModels)();
    model =
      pickLoadedChatModel(warm, pref, { strict: true }) ||
      (await (deps.resolveSynthesisModel || resolveSynthesisModel)({ fallback: DEFAULT_MODEL })).model ||
      DEFAULT_MODEL;
    // Demand-driven activation: if a MEASURED mode (summarize/explain) did NOT land on its cheap
    // floor (7b was cold), warm 7b detached + rate-limited so the NEXT same-mode offload rides it.
    // No-op for unmeasured modes and when 7b was already the pick. Fire-and-forget, never blocks.
    try { (deps.primeCheapTier || primeCheapTier)(mode, model); } catch { /* never break the hot path */ }
  }

  // SUBSTRATE-UTIL Gap 6: opt-in vault grounding for the MODEL-CALL modes (NOT viz/rerank,
  // which already search the graph directly). getVaultHints is pure + fail-soft -> "" when
  // --with-context is off, no match, or the vault is unreadable, so this injects nothing
  // unless there is real grounding to add. `input` is the query (ask/codegen) or the file
  // path (file modes -- its basename tokens still surface topically-relevant memories).
  const vaultCtx = (flags.withContext && mode !== "viz" && mode !== "rerank")
    ? formatVaultHintsBlock(getVaultHints(input, { root: REPO_ROOT }))
    : "";

  // ── viz: keyword search of the graph (Ollama only when --synth) ───────
  if (mode === "viz") {
    // SUBSTRATE-UTIL (w0yjhqcp9): prefer the WARM master-index daemon (full-coverage ~110K-node
    // index over HTTP, NO local graph load) over the 80MB-capped in-process graph (~20K nodes).
    // Daemon hits carry id/label/layer/status, which renderHits/buildVizPrompt consume (they
    // tolerate the domain/info daemon hits lack). searchViaDaemon resolves null on ANY miss
    // (down/disabled/empty/non-200/timeout) -> fall back to the in-process graph with ZERO
    // behavior change. Injectable for hermetic tests; never throws.
    let hits = null;
    let scanned = 0;
    let source = "in-process";
    try {
      const dm = await (deps.searchViaDaemon || searchViaDaemon)(input, { topK: flags.maxHits });
      if (dm && Array.isArray(dm.hits) && dm.hits.length) { hits = dm.hits; source = "daemon"; }
    } catch { /* daemon miss -> in-process fallback below */ }
    if (hits === null) {
      const loaded = (deps.loadGraph || loadGraph)(deps);
      if (!loaded.ok) return { exitCode: 3, output: `[ask-ollama] ${loaded.error}` };
      hits = searchGraph(input, loaded.graph, flags.maxHits);
      scanned = Array.isArray(loaded.graph.nodes) ? loaded.graph.nodes.length : 0;
    }
    const hitText = renderHits(hits);
    const footer = source === "daemon"
      ? `viz: ${hits.length} hit(s) from the warm master-index daemon (full-coverage index) returned to Claude`
      : `viz: scanned ${scanned} graph nodes locally -> ${hits.length} hit(s) returned to Claude`;

    if (!flags.synth) {
      const out = flags.json
        ? JSON.stringify({ mode, synth: false, scanned, hits }, null, 2)
        : `${hitText}\n\n${footer}`;
      return { exitCode: 0, output: out };
    }
    // --synth: best-effort Ollama answer on top of the (already useful) hits.
    const gen = await (deps.callModel || callModel)(model, buildVizPrompt(input, hits), {
      timeoutMs: flags.timeout,
      callOllamaImpl: deps.callOllama,
      callViaMcpImpl: deps.callViaMcp,
    });
    if (!gen.ok) {
      const banner = `[ask-ollama] Ollama synthesis unavailable (${gen.error}) — graph hits below:`;
      const out = flags.json
        ? JSON.stringify({ mode, synth: true, model, ollamaError: gen.error, scanned, hits }, null, 2)
        : `${banner}\n\n${hitText}\n\n${footer}`;
      return { exitCode: 0, output: out };
    }
    const out = flags.json
      ? JSON.stringify({ mode, synth: true, model, answer: gen.text, scanned, hitCount: hits.length }, null, 2)
      : `${gen.text}\n\n${footer}`;
    return { exitCode: 0, output: out };
  }

  // ── rerank: lexical hits, then a VERIFIED ollama re-rank ───────────────
  // The model proposes a better ordering; verifyRerank keeps ONLY ids that are
  // real candidates (anti-hallucination), so a bad/empty/unreachable model
  // simply falls back to the lexical order. Never worse than `viz`, often better.
  if (mode === "rerank") {
    const loaded = (deps.loadGraph || loadGraph)(deps);
    if (!loaded.ok) return { exitCode: 3, output: `[ask-ollama] ${loaded.error}` };
    const hits = searchGraph(input, loaded.graph, flags.maxHits);
    const scanned = Array.isArray(loaded.graph.nodes) ? loaded.graph.nodes.length : 0;
    // run: injected model caller -> raw text. A model failure throws here, which
    // verifiedOffload catches and turns into the lexical fallback.
    const run = async () => {
      const gen = await (deps.callModel || callModel)(model, buildRerankPrompt(input, hits), {
        timeoutMs: flags.timeout,
        callOllamaImpl: deps.callOllama,
        callViaMcpImpl: deps.callViaMcp,
      });
      if (!gen.ok) throw new Error(gen.error);
      return gen.text;
    };
    const rr = await (deps.rerankCandidates || rerankCandidates)({
      query: input, candidates: hits, run, label: "ask-ollama-rerank",
    });
    const footer = `↓ rerank: scanned ${scanned} nodes locally → ${hits.length} lexical hit(s); ollama re-rank ${rr.verified ? "VERIFIED" : `fell back to lexical (${rr.reason || rr.source})`}`;
    const out = flags.json
      ? JSON.stringify({ mode, model, query: input, source: rr.source, verified: rr.verified, reason: rr.reason, scanned, ranked: rr.ranked }, null, 2)
      : `${renderHits(rr.ranked)}\n\n${footer}`;
    return { exitCode: 0, output: out };
  }

  // ── ask: bare question, no context ────────────────────────────────────
  if (mode === "ask") {
    const gen = await (deps.callModel || callModel)(model, vaultCtx + buildAskPrompt(input), {
      timeoutMs: flags.timeout,
      callOllamaImpl: deps.callOllama,
      callViaMcpImpl: deps.callViaMcp,
    });
    if (!gen.ok) return { exitCode: 3, output: buildFallbackSignal({ mode, target: input, error: gen.error, json: flags.json }) };
    const out = flags.json ? JSON.stringify({ mode, model, answer: gen.text }, null, 2) : gen.text;
    return { exitCode: 0, output: out, telemetry: { mode, model, inChars: input.length, outChars: gen.text.length } };
  }

  // ── codegen: emit code for a spec via a local coder model ─────────────
  // (U-ASK-OLLAMA-CODEGEN, slot:zulu) the CLI/forge-seam complement to the MCP
  // prism_local:local_generate path -- routes mechanical code generation to a warm
  // coder model so the /forge seam never spends a Claude turn on boilerplate.
  if (mode === "codegen") {
    // Safety-routing guard: a request to EMIT a G-code/NC program is shop-floor
    // output that must flow through prism_cam + the physics/safety engines, never a
    // raw local LLM. Refuse unless the operator marks the spec non-safety.
    if (!flags.allowUnsafe && looksLikeGcodeRequest(input)) {
      return {
        exitCode: 2,
        output:
          "[ask-ollama] refusing to generate G-code/NC program output from a local model " +
          "(safety-routing rule: shop-floor output flows through prism_cam + safety, not a raw LLM). " +
          "Pass --allow-unsafe if this is non-safety code (e.g. a parser/visualizer for G-code).",
      };
    }
    const gen = await (deps.callModel || callModel)(model, vaultCtx + buildCodegenPrompt(input), {
      timeoutMs: flags.timeout,
      callOllamaImpl: deps.callOllama,
      callViaMcpImpl: deps.callViaMcp,
    });
    if (!gen.ok) return { exitCode: 3, output: buildFallbackSignal({ mode, target: input, error: gen.error, json: flags.json }) };
    const out = flags.json ? JSON.stringify({ mode, model, code: gen.text }, null, 2) : gen.text;
    return { exitCode: 0, output: out, telemetry: { mode, model, inChars: input.length, outChars: gen.text.length } };
  }

  // ── file modes: summarize / explain / triage ──────────────────────────
  // input "-" reads stdin: the rtk-pipe path `rtk grep foo | ask-ollama summarize -`.
  const isStdin = input === "-";
  const file = isStdin
    ? await (deps.readStdin || readStdin)(deps)
    : (deps.readFileCapped || readFileCapped)(input, deps);
  if (!file.ok) return { exitCode: 2, output: `[ask-ollama] ${file.error}` };
  // Safety-routing guard (PRISM): never send NC/G-code program output to a non-Claude
  // local model. Dense G-code -> refuse; --allow-unsafe overrides for non-safety content.
  if (!flags.allowUnsafe && looksLikeNcProgram(file.content)) {
    return {
      exitCode: 2,
      output:
        "[ask-ollama] refusing to route NC/G-code program output to a local model " +
        "(safety-routing rule: safety-critical output stays on Claude). " +
        "Pass --allow-unsafe if this content is not safety-relevant.",
    };
  }
  const displayName = isStdin ? "(stdin)" : input;
  const gen = await (deps.callModel || callModel)(model, vaultCtx + buildFilePrompt(mode, displayName, file.content), {
    // P1-5: scale the timeout to the file size unless the operator pinned --timeout.
    timeoutMs: flags.timeoutExplicit ? flags.timeout : scaleTimeoutForBytes(file.content.length, flags.timeout),
    callOllamaImpl: deps.callOllama,
    callViaMcpImpl: deps.callViaMcp,
  });
  if (!gen.ok) return { exitCode: 3, output: buildFallbackSignal({ mode, target: displayName, error: gen.error, json: flags.json }) };
  const note = file.truncated ? ` (first ${MAX_FILE_BYTES} of ${file.bytes} bytes)` : "";
  const out = flags.json
    ? JSON.stringify({ mode, model, file: displayName, truncated: file.truncated, answer: gen.text }, null, 2)
    : `${gen.text}\n\n${savingsFooter(file.content.length, gen.text.length)}${note}`;
  return { exitCode: 0, output: out, telemetry: { mode, model, inChars: file.content.length, outChars: gen.text.length } };
}

// U-OFFLOAD-ACTION (2026-06-12, slot:zulu): record an EXECUTED offload event so
// the fleet dashboard's offload rate measures work that actually RAN locally,
// not directives issued. The offloader hook records decision:"offload" at
// DIRECTIVE time (before any adoption); this records at EXECUTION time with the
// MEASURED in/out token delta. extras.mode:"executed" routes the event to the
// SEPARATE executedOffloads/measuredTokensSaved totals (lib/ollama-stats.mjs
// bumpTotals) and the dashboard's adoption sub-metric -- never the headline
// offloaded/estimatedTokensSaved rate, which would double-count one adopted
// action (scrutiny P1 2026-06-12). Scope: ask + the file modes (summarize/explain/
// triage -- the SAFE_AUTOEXEC targets); viz/rerank have bespoke savings
// semantics and keep their own footers. Fail-soft: telemetry must never break
// the CLI (dynamic import + catch); disable with PRISM_ASK_OLLAMA_TELEMETRY=0.
export async function recordExecution(telemetry, importImpl = (s) => import(s)) {
  if (!telemetry || process.env.PRISM_ASK_OLLAMA_TELEMETRY === "0") return false;
  try {
    const libUrl = new URL("../.claude/hooks/lib/ollama-stats.mjs", import.meta.url).href;
    const { recordOllamaEvent } = await importImpl(libUrl);
    const inTok = Math.ceil(Math.max(0, Number(telemetry.inChars) || 0) / CHARS_PER_TOKEN);
    const outTok = Math.ceil(Math.max(0, Number(telemetry.outChars) || 0) / CHARS_PER_TOKEN);
    recordOllamaEvent({
      hook: "ask-ollama",
      decision: "offload",
      category: telemetry.mode,
      tokensSaved: Math.max(0, inTok - outTok),
      extras: { mode: "executed", model: telemetry.model },
    });
    return true;
  } catch { return false; /* stats lib unavailable -- never break the CLI */ }
}

// U-OLLAMA-OFFLOAD-SUCCESS-RATE (2026-06-20, slot:alpha): record a FAILED offload
// attempt so the offload SUCCESS RATE is measurable. Before this, recordExecution
// fired ONLY on exitCode 0 (success), so byHook["ask-ollama"] showed e.g. 18/18
// offloaded / 0 kept -- a 100% success ILLUSION that hid every Ollama-down /
// timeout / non-200 / bad-output failure (the work silently fell back to Claude,
// uncounted). A failure is recorded as decision:"keep" (the task did NOT run
// off-Claude -> it falls back to Claude), so the dashboard can compute the real
// success rate = byHook.offloaded / byHook.fired per bridge. Fail-soft + the same
// PRISM_ASK_OLLAMA_TELEMETRY=0 kill switch as recordExecution.
export async function recordFailure(info, importImpl = (s) => import(s)) {
  if (!info || !info.mode || process.env.PRISM_ASK_OLLAMA_TELEMETRY === "0") return false;
  try {
    const libUrl = new URL("../.claude/hooks/lib/ollama-stats.mjs", import.meta.url).href;
    const { recordOllamaEvent } = await importImpl(libUrl);
    recordOllamaEvent({
      hook: "ask-ollama",
      decision: "keep", // a failed offload = the task falls back to Claude
      category: info.mode,
      extras: { mode: "failed", ...(info.reason ? { reason: String(info.reason).slice(0, 120) } : {}) },
    });
    return true;
  } catch { return false; /* never break the CLI on telemetry */ }
}

// U-OLLAMA-OFFLOAD-SUCCESS-RATE-EXITCODE (2026-06-20, slot:alpha): pure decision
// for WHEN a runRequest outcome counts as a failed offload. ONLY exitCode 3
// (model-infrastructure failure -- graph unreadable / Ollama unreachable, per the
// exit-code contract) qualifies. exitCode 2 (usage error / NC safety refusal /
// missing input) is NEITHER a success NOR an Ollama failure -- counting it would
// deflate the success rate with non-Ollama outcomes (R12). viz/rerank are
// pure-local non-model modes (a viz graph-load failure exits 3 but is not an
// offload), so they are excluded from BOTH the success and failure counts.
export function shouldRecordFailure(exitCode, mode) {
  return exitCode === 3 && !!mode && mode !== "viz" && mode !== "rerank";
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2));
  if (parsed.error) {
    console.error(`[ask-ollama] ${parsed.error}\n\n${USAGE}`);
    process.exit(2);
  }
  const { exitCode, output, telemetry } = await runRequest(parsed);
  if (exitCode === 0 && telemetry) await recordExecution(telemetry);
  // U-OLLAMA-OFFLOAD-SUCCESS-RATE: record a failed offload so the success rate
  // is real -- contract + rationale live in shouldRecordFailure() above.
  else if (shouldRecordFailure(exitCode, parsed.mode)) {
    await recordFailure({ mode: parsed.mode });
  }
  (exitCode === 0 ? console.log : console.error)(output);
  process.exit(exitCode);
}

// Run only as a CLI, never on import (keeps the test harness clean).
const INVOKED_DIRECTLY =
  process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (INVOKED_DIRECTLY) {
  void main().catch((e) => {
    console.error(`[ask-ollama] fatal: ${e && e.stack ? e.stack : e}`);
    process.exit(1);
  });
}
