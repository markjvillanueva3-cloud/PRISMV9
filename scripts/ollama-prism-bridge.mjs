#!/usr/bin/env node
/**
 * ollama-prism-bridge.mjs — Ollama → PRISM agentic harness (OLLAMA-EXPAND-MS0/U-OE-BRIDGE-L2)
 *
 * Layer 2 of the OLLAMA→PRISM-MCP bridge ladder (Layer 1 = ask-ollama.mjs).
 *
 * Ollama is a model server, NOT an MCP client — it cannot "connect to MCP".
 * This script is the missing harness: it acts as the agent loop. It advertises
 * a curated, READ-ONLY set of PRISM knowledge tools to an Ollama model via the
 * /api/chat `tools` parameter, then runs the call → execute → feed-back loop
 * until the model produces a final answer. Ollama autonomously decides which
 * tool to use, like Claude Code does — but every step runs locally, so a
 * multi-step "where is X / how does Y work / what wires to Z" investigation
 * costs ~0 Claude tokens. Only the final compact answer returns.
 *
 * Tool surface (read-only by construction — no tool can mutate state or write):
 *   viz_search    ranked keyword search of the ~27 MB system-viz graph
 *   wiki_lookup   keyword search of the architecture wiki index
 *   read_excerpt  a byte-capped excerpt of a repo source file
 *
 * Trust model: tool results (file content, graph text) re-enter the model as
 * UNTRUSTED input — a crafted repo file could contain text that tries to
 * redirect the model. This is acceptable here precisely because every tool is
 * strictly read-only and the harness is single-user / local: the worst
 * outcome of a hostile file is a wrong answer, never a write or escalation.
 *
 * Scope (honest — see state/shared/specs/OLLAMA-PRISM-MCP-BRIDGE-DESIGN.md):
 * this L2 connects Ollama to PRISM's read-only KNOWLEDGE surface (graph + wiki
 * + files) — the reliable, server-free 80% that delivers the token-saving win.
 * Wiring the live prism_calc / prism_session MCP dispatchers as tools is a
 * narrower follow-on: it depends on resolving the MCP server's HTTP protocol
 * surface, its value is correctness (not token-saving), and a 3B model routing
 * across the full 97-dispatcher surface is an unproven empirical risk. Kept
 * separate on purpose.
 *
 * Usage:
 *   node scripts/ollama-prism-bridge.mjs "<question>"
 *   node scripts/ollama-prism-bridge.mjs "where is cutting force computed?" --trace
 *
 * Flags:
 *   --model <name>    tool-calling model (default qwen2.5-coder:32b)
 *   --max-calls <n>   hard cap on agent-loop iterations (default 6, cap 12)
 *   --timeout <ms>    per /api/chat timeout (default 180000)
 *   --json            machine-readable output
 *   --trace           print the full tool-call transcript
 *
 * Exit codes:
 *   0  ok (answer produced, even if the tool-call cap was hit)
 *   2  usage error (no question, bad flag)
 *   3  infrastructure failure (Ollama unreachable / chat error)
 *
 * Design: pure functions (exported, unit-tested) + a thin impure shell whose
 * I/O deps (chatImpl, toolImpls) are injected so the agent loop is testable
 * without a live model. Fail-loud (R12): every failure path states its reason.
 */

import { existsSync, realpathSync, readdirSync, statSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, isAbsolute, resolve, relative } from "node:path";
import {
  loadGraph,
  searchGraph,
  renderHits,
  readFileCapped,
  truncate,
} from "./ask-ollama.mjs";
// U-LOCAL-GENERATE-CONSUMER (2026-06-09, slot india): the MCP Streamable-HTTP
// client moved to a cycle-free leaf lib so ask-ollama.mjs can speak to the MCP
// server too (this bridge imports ask-ollama, so ask-ollama cannot import the
// bridge). Re-exported below byte-identically for existing importers/tests.
import {
  parseMcpResponse,
  mcpCallStreamable,
} from "./lib/mcp-streamable-client.mjs";
export { parseMcpResponse, mcpCallStreamable };
import { resolveEmbedUrl, withLaneOptions, withMainFallback } from "./lib/embed-endpoint.mjs";
// MCP_URL + MCP_TIMEOUT_MS live in the lib above; the bridge's mcpCallStreamable
// callers rely on the lib defaults, so they are not imported here (dead-import
// avoidance, scrutiny arm-C P3).

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..");
const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";

/** Tool-calling model. qwen2.5-coder:32b is the smallest installed model and
 *  is held warm by ask-ollama's keep_alive — reusing it avoids a cold load.
 *  A 7B (mistral:7b) routes tools more reliably; override with --model. */
const DEFAULT_MODEL = "qwen2.5-coder:32b";
/** keep_alive window — holds the model warm between agent-loop turns. */
const KEEP_ALIVE = "10m";
/** Low temperature — tool routing wants determinism, not creativity. */
const CHAT_TEMPERATURE = 0.1;
/** Default and minimum per /api/chat timeout (covers a cold load). */
const DEFAULT_TIMEOUT_MS = 180000;
const MIN_TIMEOUT_MS = 1000;
/** Default and hard ceiling on agent-loop iterations. A small model can loop
 *  on tool calls forever; the cap forces termination. */
const DEFAULT_MAX_CALLS = 6;
const MAX_CALLS_CEIL = 12;
/** Hard cap on the chars any single tool result feeds back into the model —
 *  tool output re-enters the context window, so it must stay bounded. */
const TOOL_RESULT_MAX_CHARS = 16 * 1024;
/** read_excerpt size limits (default kept small — the excerpt re-enters context). */
const READ_EXCERPT_DEFAULT_BYTES = 6 * 1024;
const READ_EXCERPT_MAX_BYTES = 16 * 1024;
const READ_EXCERPT_MIN_BYTES = 256;
/** viz_search hit limits. */
const VIZ_DEFAULT_HITS = 8;
const VIZ_MAX_HITS = 50;
/** wiki_lookup result-line limit. */
const WIKI_MAX_HITS = 12;
/** Shortest wiki query token kept. */
const WIKI_MIN_TOKEN_LEN = 3;
/** Wiki catalog index, relative to the repo root. NOTE: the catalog index is
 *  knowledge/wiki/index.md — knowledge/wiki/architecture/ holds per-entry leaf
 *  files but no index.md. Verified on disk 2026-05-18. */
const WIKI_INDEX_REL = join("knowledge", "wiki", "index.md");
/** Leaf-file directory — the 1500+ per-entry markdown files under
 *  knowledge/wiki/architecture/. U-OE-BRIDGE-L2B-WIKI-LEAVES (2026-05-18,
 *  slot charlie): index.md alone exposes ~722 entries to Ollama; the leaf
 *  tree exposes 23,981 architecture files (per CLAUDE-BRIEF), 33x more
 *  surface. We can't fold all of them into the model's context — too big —
 *  but a filename-only scan is fast and gives the model precise read_excerpt
 *  hints (each leaf's basename encodes the topic, since they're auto-
 *  generated by regen-wiki-from-viz.mjs). */
const WIKI_LEAVES_DIR_REL = join("knowledge", "wiki", "architecture");
/** Cap on leaf-filename hits appended to wiki_lookup output. The model gets
 *  index-line hits (existing behavior) PLUS this many leaf paths. Kept tight
 *  so leaf hits never crowd out the more curated index entries. */
const WIKI_LEAVES_MAX_HITS = 6;
/** Per-process cache TTL for the leaf-file list — leaves regenerate on
 *  post-commit + hourly cron, so 5min is well below the change frequency
 *  while still fresh enough for an active agent loop. */
const WIKI_LEAVES_CACHE_TTL_MS = 5 * 60 * 1000;
/** Max directory recursion depth when listing leaves. The architecture tree
 *  is typically 3-4 deep (action/<domain>/<file>.md, engines/<file>.md, etc).
 *  Cap defends against a future symlink loop. */
const WIKI_LEAVES_MAX_DEPTH = 5;
/** Obsidian-memory directory, relative to the repo root. Holds 644+ .md files
 *  under {feedback,reference,project,user}/. Distinct from the wiki: memories
 *  are cross-session tribal knowledge (auto-mirrored from the auto-memory
 *  store), wiki entries are project-lifetime architecture docs. U-OBSIDIAN-
 *  LOOKUP (2026-05-18, slot delta): a 4th read-only bridge tool gives Ollama
 *  autonomous access to memories in agent loops. */
const OBSIDIAN_MEMORIES_DIR_REL = join("knowledge", "memories");
/** Cap on obsidian-memory hits returned per query. */
const OBSIDIAN_MAX_HITS = 8;
/** Shortest obsidian query token kept (matches WIKI_MIN_TOKEN_LEN). */
const OBSIDIAN_MIN_TOKEN_LEN = 3;
/** Per-process cache TTL for the obsidian-memory file list — memories are
 *  appended on every Stop hook (auto-memory feed); 5min keeps an active agent
 *  loop fresh without thrashing the filesystem on every tool call. */
const OBSIDIAN_CACHE_TTL_MS = 5 * 60 * 1000;
/** Max recursion depth for the memories tree — typically 2 deep
 *  (memories/<type>/<file>.md). Same defense-in-depth as the wiki tree. */
const OBSIDIAN_MAX_DEPTH = 5;
/** Index / archive files at the memory-tree root — these are pointer indexes,
 *  not memory content, and would clutter Ollama's tool-result feedback. */
const OBSIDIAN_EXCLUDED_BASENAMES = Object.freeze(["MEMORY.md", "MEMORY-ARCHIVE.md"]);
/** Dispatcher digest — auto-generated by `scripts/generate-dispatcher-digest.mjs`
 *  on every dispatcher edit. Markdown table with one row per dispatcher,
 *  columns = `dispatcher | domain — description | actions`. 97 rows × ~120
 *  chars ≈ 12KB — comfortably under TOOL_RESULT_MAX_CHARS for the whole file.
 *  U-DISPATCHER-MAP (2026-05-18, slot delta): Ollama can now answer "what
 *  dispatcher does X" by scanning this artifact — no live MCP transport
 *  needed (port-3100 dependency avoided). */
const DISPATCHER_DIGEST_REL = join("mcp-server", "data", "docs", "DISPATCHER_DIGEST.md");
/** Cap on dispatcher_map hits. Higher than wiki/obsidian because dispatcher
 *  rows are short (≤120 chars) and a manufacturing question often spans 3-5
 *  related dispatchers (e.g. `cad`, `cam`, `calc`, `safety`). */
const DISPATCHER_MAP_MAX_HITS = 10;
/** Shortest token length kept when splitting a dispatcher_map query. */
const DISPATCHER_MIN_TOKEN_LEN = 3;
/** Pre-built semantic embedding index for the wiki + memory surface.
 *  U-SEMANTIC-LOOKUP (2026-05-18, slot delta): 14,738 nomic-embed-text 768-d
 *  vectors at int8 quantization. Lets Ollama do semantic recall instead of
 *  filename-substring matching — a query "kienzle force" can hit
 *  `kfm.md` even though "kienzle" isn't in the basename, by matching the
 *  embedding of the entry's text representation.
 *  Format: JSONL — first line `{__meta:true, model, dim, count, generatedAt}`,
 *  subsequent lines `{n, t, h, s, q:[int8...]}`. */
const EMBEDDINGS_REL = join("knowledge", "wiki", "architecture", "_embeddings.jsonl");
/** Embedding model — must match the model that generated the index file. */
const EMBEDDINGS_MODEL = "nomic-embed-text";
/** Vector dimensionality — also pinned by the index file's __meta line. */
const EMBEDDING_DIM = 768;
/** Int8 → float32 dequantization scale. Matches the producer's quantizer:
 *  `q[i] = round(v * 127)` so `v[i] = q[i] / 127`. */
const INT8_DEQUANT_SCALE = 127;
/** Cap on semantic_search hits returned. The model rapidly degrades past
 *  ~12 hits in tool-result feedback. */
const SEMANTIC_MAX_HITS = 10;
/** Minimum query length — embedding ≤3 chars is noise. */
const SEMANTIC_MIN_QUERY_LEN = 3;
/** Per-process cache TTL for the loaded embedding index. The file is
 *  regenerated by the wiki orchestrator at most hourly. */
const EMBEDDINGS_CACHE_TTL_MS = 30 * 60 * 1000;
/** Default per-embedding-call Ollama timeout (ms). nomic-embed-text is
 *  small (~140MB) so warm calls are <50ms; cold first call can be ~2-3s. */
const EMBEDDINGS_TIMEOUT_MS = 15000;
/** U-OE-BRIDGE-L2B (2026-05-18, slot foxtrot): live MCP-dispatcher tool
 *  surface — the 7th bridge tool. Speaks JSON-RPC 2.0 over the MCP Streamable
 *  HTTP transport at $PRISM_MCP_URL (default :3100/mcp). Probe verified
 *  2026-05-18: the server responds to initialize/tools/list with
 *  protocolVersion "2024-11-05" and Accept must include both application/json
 *  AND text/event-stream. Blocker named in
 *  OLLAMA-PRISM-MCP-BRIDGE-DESIGN.md §L2b is therefore RESOLVED.
 *
 *  SAFETY: the impl exposes a CURATED, FROZEN allowlist of `dispatcher:action`
 *  pairs only — every action is read-only computation or read-only query. A
 *  call to anything outside the allowlist is REJECTED before any HTTP work
 *  happens. The 3B local model cannot coax the bridge into writes, builds,
 *  process spawning, or any state mutation. */
// MCP_URL + MCP_TIMEOUT_MS now come from ./lib/mcp-streamable-client.mjs (single
// source of truth; the lib reads $PRISM_MCP_URL + the 8s budget identically).
/** Cap on stringified MCP result re-entering the model context. */
const MCP_RESULT_MAX_CHARS = 8 * 1024;
/** Cap on serialized `params` size — defends against a model that tries to
 *  inflate a numeric argument into a multi-MB payload. */
const MCP_PARAMS_MAX_CHARS = 4 * 1024;
/** READ-ONLY ALLOWLIST. Every (dispatcher, action) here must be a pure
 *  computation or a read-only query — NO state mutation, no file writes, no
 *  external network calls. This is the structural guard that keeps mcp_call
 *  safe even when a small model is doing the tool selection.
 *
 *  HONEST SCOPE (R12, per-file scrutiny arm-B P1.1, 2026-05-18):
 *   - Action NAMES are confirmed present in the dispatchers' Zod action enums
 *     (mcp-server/src/tools/dispatchers/calcDispatcher.ts +
 *     sessionDispatcher.ts) — the routing layer is verified.
 *   - Per-action PARAM CONTRACTS rely on the dispatcher's own Zod schema
 *     (ACTION_CALC_SCHEMAS, ACTION_SESSION_SCHEMAS) to validate inputs and
 *     return a fail-loud JSON-RPC error on shape mismatch. The agent loop
 *     surfaces that error to the model on the next turn for recovery — the
 *     bridge does NOT silently corrupt malformed inputs.
 *   - LIVE end-to-end is proven for `prism_session:master_index_query` (the
 *     E2E test in this file's test suite). Per-action live verification for
 *     the remaining 13 actions is queued as a follow-up unit; until that
 *     ships, a model attempting an unverified action will see one of two
 *     correct outcomes: a successful result (live contract held) or a
 *     fail-loud schema error (and a chance to retry with correct params). */
const MCP_ALLOWLIST = Object.freeze({
  prism_calc: Object.freeze([
    "cutting_force",
    "tool_life",
    "speed_feed",
    "surface_finish",
    "power",
    "torque",
    "mrr",
    "chip_load",
    "chip_thinning",
    "cycle_time",
  ]),
  prism_session: Object.freeze([
    "master_index_query",
    "dispatcher_map_compact",
    "action_search",
    "action_find",
  ]),
});
/** EXPLICIT DENYLIST — dispatchers that perform writes / spawns / shell calls
 *  and must NEVER be on the read-only allowlist. The negative assertion in
 *  this list is a regression guard for a future merge that mistakenly adds a
 *  mutating dispatcher to MCP_ALLOWLIST. Exported so the test suite can pin
 *  the contract. */
const MCP_DENYLIST = Object.freeze([
  "prism_dev",          // build/test/file_write — mutates the repo
  "prism_atcs",         // task state machine — mutates ledgers
  "prism_orchestrate",  // multi-step orchestration — invokes mutating steps
  "prism_cam",          // CAM toolpath generation — emits files
  "prism_safety",       // safety vetoes / writes
  "prism_memory",       // memory writes / store
  "prism_export",       // file emit
  "prism_cad",          // model emit
]);
/** Back-of-envelope characters-per-token ratio, for the savings footer. */
const CHARS_PER_TOKEN = 4;
/** Transcript line-length cap for --trace output. */
const TRACE_LINE_CHARS = 240;
const TRACE_ARGS_CHARS = 200;

/** The read-only tool allowlist. A name not in this set is rejected before
 *  any execution — the structural guard that keeps the bridge read-only. */
export const TOOL_NAMES = Object.freeze(["viz_search", "wiki_lookup", "read_excerpt", "obsidian_lookup", "dispatcher_map", "semantic_search", "mcp_call"]);

/** Exported view of the MCP_ALLOWLIST so tests + callers can introspect the
 *  curated dispatcher:action surface without reaching into module-private
 *  state. Object.freezed at the source — safe to expose. */
export function mcpAllowlist() { return MCP_ALLOWLIST; }

/** Exported view of the MCP_DENYLIST — the dispatchers that MUST NEVER appear
 *  on the allowlist (writes/spawns/shell). Tests use this as a regression
 *  guard against a future merge mistake. */
export function mcpDenylist() { return MCP_DENYLIST; }

/**
 * Validate a proposed mcp_call. Pure. Returns { ok:true, dispatcher, action,
 * params } or { ok:false, error }. The error string is fed back to the model
 * AS a tool result so it can recover (R12 fail-loud — never silent rejection).
 */
export function validateMcpCall(dispatcher, action, params) {
  if (typeof dispatcher !== "string" || !dispatcher.trim()) {
    return { ok: false, error: "mcp_call needs a non-empty 'dispatcher' (e.g. 'prism_calc')" };
  }
  if (typeof action !== "string" || !action.trim()) {
    return { ok: false, error: "mcp_call needs a non-empty 'action' (e.g. 'cutting_force')" };
  }
  const d = String(dispatcher).trim();
  const a = String(action).trim();
  const allowedActions = MCP_ALLOWLIST[d];
  if (!allowedActions) {
    const dispatchers = Object.keys(MCP_ALLOWLIST).join(", ");
    return { ok: false, error: `mcp_call dispatcher '${d}' not in read-only allowlist — allowed: ${dispatchers}` };
  }
  if (!allowedActions.includes(a)) {
    return { ok: false, error: `mcp_call action '${d}:${a}' not in read-only allowlist — allowed actions for ${d}: ${allowedActions.join(", ")}` };
  }
  let p = params;
  if (p == null) p = {};
  if (typeof p !== "object" || Array.isArray(p)) {
    return { ok: false, error: "mcp_call 'params' must be a JSON object" };
  }
  // Defend against an inflated payload: serialize once, refuse if too big.
  let serialized;
  try {
    serialized = JSON.stringify(p);
  } catch (e) {
    return { ok: false, error: `mcp_call 'params' is not JSON-serializable: ${e && e.message ? e.message : e}` };
  }
  if (serialized.length > MCP_PARAMS_MAX_CHARS) {
    return { ok: false, error: `mcp_call 'params' is too large (${serialized.length} > ${MCP_PARAMS_MAX_CHARS} chars)` };
  }
  return { ok: true, dispatcher: d, action: a, params: p };
}

// ─────────────────────────────────────────────────────────────────────────
// Pure helpers (exported for unit tests)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Parse argv (the slice AFTER `node ollama-prism-bridge.mjs`).
 * Returns { question, flags } or { error }.
 */
export function parseArgs(argv) {
  const flags = {
    model: "",
    maxCalls: DEFAULT_MAX_CALLS,
    timeout: DEFAULT_TIMEOUT_MS,
    json: false,
    trace: false,
  };
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") flags.json = true;
    else if (a === "--trace") flags.trace = true;
    else if (a === "--model") {
      const v = argv[++i];
      if (v === undefined) return { error: "--model needs a value" };
      flags.model = v;
    } else if (a === "--max-calls") {
      const n = Number.parseInt(argv[++i], 10);
      if (!Number.isFinite(n) || n < 1) return { error: "--max-calls needs a positive integer" };
      flags.maxCalls = Math.min(n, MAX_CALLS_CEIL);
    } else if (a === "--timeout") {
      const n = Number.parseInt(argv[++i], 10);
      if (!Number.isFinite(n) || n < MIN_TIMEOUT_MS) {
        return { error: `--timeout needs an integer ≥ ${MIN_TIMEOUT_MS} (ms)` };
      }
      flags.timeout = n;
    } else if (a.startsWith("--")) {
      return { error: `unknown flag: ${a}` };
    } else {
      positional.push(a);
    }
  }
  const question = positional.join(" ").trim();
  if (!question) return { error: "no question given" };
  return { question, flags };
}

/** Resolve the model: explicit override else the default. */
export function pickModel(override) {
  return override && String(override).trim() ? String(override).trim() : DEFAULT_MODEL;
}

/**
 * The tool specifications advertised to Ollama via /api/chat `tools`.
 * Pure — returns the same structure every call. JSON-schema `parameters`
 * follow the OpenAI-compatible function-tool shape Ollama accepts.
 */
export function toolSpecs() {
  return [
    {
      type: "function",
      function: {
        name: "viz_search",
        description:
          "Search the PRISM system-architecture graph for nodes (engines, dispatchers, " +
          "actions, hooks, skills) matching a free-text query. Use this first to locate " +
          "where something lives in the codebase.",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string", description: "what to look for, e.g. 'kienzle cutting force'" },
            max_hits: { type: "integer", description: `results to return (1-${VIZ_MAX_HITS}, default ${VIZ_DEFAULT_HITS})` },
          },
          required: ["query"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "wiki_lookup",
        description:
          "Search the PRISM architecture wiki for documentation entries whose name " +
          "or description matches a query. Returns BOTH curated index lines AND leaf " +
          "wiki file paths under knowledge/wiki/architecture/. Use read_excerpt on a " +
          "returned leaf path to read the full entry. Best for design/architecture context.",
        parameters: {
          type: "object",
          properties: {
            name: { type: "string", description: "wiki entry name or keywords" },
          },
          required: ["name"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "read_excerpt",
        description:
          "Read a byte-capped excerpt of a source file inside the PRISM repository. " +
          "Paths are relative to the repo root. Use after viz_search/wiki_lookup point " +
          "you at a specific file.",
        parameters: {
          type: "object",
          properties: {
            path: { type: "string", description: "repo-relative file path, e.g. mcp-server/src/physics/constants.ts" },
            max_bytes: { type: "integer", description: `excerpt size (${READ_EXCERPT_MIN_BYTES}-${READ_EXCERPT_MAX_BYTES}, default ${READ_EXCERPT_DEFAULT_BYTES})` },
          },
          required: ["path"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "dispatcher_map",
        description:
          "Search the PRISM MCP dispatcher map for dispatchers whose name or domain " +
          "description matches a query. Returns top hits with action counts. Best for " +
          "'what dispatcher handles X' / 'what action computes Y' questions. The full " +
          "map lives at mcp-server/data/docs/DISPATCHER_DIGEST.md (97 dispatchers, " +
          "10818 actions) — use read_excerpt to drill in.",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string", description: "dispatcher domain or keywords, e.g. 'cutting force' or 'cad geometry'" },
          },
          required: ["query"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "semantic_search",
        description:
          "Semantic search across the PRISM architecture wiki + memory store " +
          "using pre-built nomic-embed-text vectors (14,738 entries). Use when " +
          "filename/keyword search misses — semantic_search('kienzle force') " +
          "hits 'kfm.md' even when the basename doesn't contain 'kienzle'. " +
          "Returns top-K (name, type, score) triples. Each hit's name maps to " +
          "a wiki leaf at knowledge/wiki/architecture/<n>.md — use read_excerpt " +
          "to drill in. Falls back to ERROR if Ollama is unreachable; in that " +
          "case use wiki_lookup or obsidian_lookup instead.",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string", description: "natural-language description of what to find, e.g. 'cutting force model for steel'" },
            max_hits: { type: "integer", description: `results to return (1-${SEMANTIC_MAX_HITS}, default ${SEMANTIC_MAX_HITS})` },
          },
          required: ["query"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "obsidian_lookup",
        description:
          "Search the PRISM Obsidian-memory store (cross-session tribal knowledge " +
          "written by prior chats: feedback rules, reference snapshots, project facts) " +
          "for memory files whose filename matches a query. Returns repo-relative " +
          "paths under knowledge/memories/. Use read_excerpt on a returned path to " +
          "read the full memory. Best for 'has anyone hit this before' / 'what did " +
          "we learn about X' questions.",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string", description: "memory topic or keywords, e.g. 'fleet reaper' or 'kienzle physics'" },
          },
          required: ["query"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "mcp_call",
        description:
          "Invoke a LIVE PRISM MCP dispatcher action over the local MCP server " +
          "(JSON-RPC over Streamable HTTP). RESTRICTED to a curated, read-only " +
          "allowlist of physics + query actions. Use for: computing a manufacturing " +
          "formula whose numeric answer matters (cutting force, tool life, MRR, " +
          "speed/feed, surface finish, power, torque), or running a structured " +
          "graph query that returns more than wiki/viz file lookups can. Allowed " +
          "dispatchers + actions:\n" +
          "  prism_calc: cutting_force, tool_life, speed_feed, surface_finish, " +
          "power, torque, mrr, chip_load, chip_thinning, cycle_time\n" +
          "  prism_session: master_index_query, dispatcher_map_compact, " +
          "action_search, action_find\n" +
          "Anything outside this list is rejected before any HTTP work. Prefer " +
          "viz_search/wiki_lookup/read_excerpt for read-only knowledge questions; " +
          "use mcp_call when you need a numeric answer or a structured dispatcher response.",
        parameters: {
          type: "object",
          properties: {
            dispatcher: { type: "string", description: "dispatcher name, e.g. 'prism_calc' or 'prism_session'" },
            action: { type: "string", description: "action within the dispatcher, e.g. 'cutting_force'" },
            params: { type: "object", description: "action-specific parameter object (default {})", additionalProperties: true },
          },
          required: ["dispatcher", "action"],
        },
      },
    },
  ];
}

/** The system message: tells the model what PRISM is and how to use the tools. */
export function buildSystemPrompt() {
  return [
    "You are a code-architecture assistant for PRISM, a manufacturing-intelligence platform",
    "(a large TypeScript codebase: engines, MCP dispatchers, hooks, skills).",
    "",
    "You have seven READ-ONLY tools:",
    "  - viz_search(query)      — find nodes in the architecture graph",
    "  - wiki_lookup(name)      — find docs by filename keyword match",
    "  - semantic_search(query) — semantic search via pre-built embeddings (best for concept questions)",
    "  - dispatcher_map(query)  — find MCP dispatchers by domain/keywords",
    "  - obsidian_lookup(query) — find cross-session memory files (feedback/reference)",
    "  - read_excerpt(path)     — read a source-file excerpt",
    "  - mcp_call(dispatcher, action, params) — LIVE PRISM dispatcher call (curated read-only",
    "      allowlist: prism_calc physics + prism_session queries). Use ONLY when you need a",
    "      numeric answer or a structured query result the other tools cannot provide.",
    "",
    "Investigate by chaining tools: search to locate, then read to confirm.",
    "Call a tool only when you need information you do not already have.",
    "When you have enough information, give a FINAL answer: concise (2-6 sentences),",
    "cite node ids in [brackets] and file paths verbatim. Never invent nodes or paths —",
    "if the tools do not answer the question, say so plainly.",
  ].join("\n");
}

/**
 * Normalize one tool call from an Ollama assistant message into
 * { name, args, id } | { error }. Ollama returns `arguments` as an object;
 * some models / OpenAI-compat paths return it as a JSON string — both are
 * handled. `id`, when the model supplies one, is carried through so the tool
 * result can be correlated back to the call.
 */
export function normalizeToolCall(call) {
  const fn = call && call.function ? call.function : call;
  if (!fn || typeof fn.name !== "string" || !fn.name) {
    return { error: "tool call has no function name" };
  }
  let args = fn.arguments;
  if (typeof args === "string") {
    if (args.trim() === "") {
      args = {};
    } else {
      try {
        args = JSON.parse(args);
      } catch (e) {
        return { error: `tool '${fn.name}' arguments are not valid JSON: ${e.message}` };
      }
    }
  }
  if (args == null) args = {};
  if (typeof args !== "object" || Array.isArray(args)) {
    return { error: `tool '${fn.name}' arguments must be an object` };
  }
  const id = call && (typeof call.id === "string" || typeof call.id === "number") ? call.id : null;
  return { name: fn.name, args, id };
}

/**
 * Validate a normalized tool call against the allowlist + required args.
 * Returns { ok:true, name, args } or { ok:false, error }. The error string is
 * fed back to the model AS a tool result so it can recover, not thrown.
 */
export function validateToolCall(name, args) {
  if (!TOOL_NAMES.includes(name)) {
    return { ok: false, error: `unknown tool '${name}' — available: ${TOOL_NAMES.join(", ")}` };
  }
  const a = args && typeof args === "object" ? args : {};
  if (name === "viz_search" && !String(a.query || "").trim()) {
    return { ok: false, error: "viz_search needs a non-empty 'query'" };
  }
  if (name === "wiki_lookup" && !String(a.name || "").trim()) {
    return { ok: false, error: "wiki_lookup needs a non-empty 'name'" };
  }
  if (name === "obsidian_lookup" && !String(a.query || "").trim()) {
    return { ok: false, error: "obsidian_lookup needs a non-empty 'query'" };
  }
  if (name === "dispatcher_map" && !String(a.query || "").trim()) {
    return { ok: false, error: "dispatcher_map needs a non-empty 'query'" };
  }
  if (name === "semantic_search" && !String(a.query || "").trim()) {
    return { ok: false, error: "semantic_search needs a non-empty 'query'" };
  }
  if (name === "read_excerpt" && !String(a.path || "").trim()) {
    return { ok: false, error: "read_excerpt needs a non-empty 'path'" };
  }
  if (name === "mcp_call") {
    // Delegate full validation (allowlist + params shape/size) to validateMcpCall.
    const v = validateMcpCall(a.dispatcher, a.action, a.params);
    if (!v.ok) return { ok: false, error: v.error };
  }
  return { ok: true, name, args: a };
}

/** Clamp / coerce tool args to safe ranges. Pure. */
export function clampToolArgs(name, args) {
  const a = args && typeof args === "object" ? args : {};
  if (name === "viz_search") {
    let maxHits = Number.parseInt(a.max_hits, 10);
    if (!Number.isFinite(maxHits) || maxHits < 1) maxHits = VIZ_DEFAULT_HITS;
    return { query: String(a.query || "").trim(), maxHits: Math.min(maxHits, VIZ_MAX_HITS) };
  }
  if (name === "wiki_lookup") {
    return { name: String(a.name || "").trim() };
  }
  if (name === "obsidian_lookup") {
    return { query: String(a.query || "").trim() };
  }
  if (name === "dispatcher_map") {
    return { query: String(a.query || "").trim() };
  }
  if (name === "semantic_search") {
    let maxHits = Number.parseInt(a.max_hits, 10);
    if (!Number.isFinite(maxHits) || maxHits < 1) maxHits = SEMANTIC_MAX_HITS;
    return { query: String(a.query || "").trim(), maxHits: Math.min(maxHits, SEMANTIC_MAX_HITS) };
  }
  if (name === "read_excerpt") {
    let maxBytes = Number.parseInt(a.max_bytes, 10);
    if (!Number.isFinite(maxBytes) || maxBytes < READ_EXCERPT_MIN_BYTES) {
      maxBytes = READ_EXCERPT_DEFAULT_BYTES;
    }
    return { path: String(a.path || "").trim(), maxBytes: Math.min(maxBytes, READ_EXCERPT_MAX_BYTES) };
  }
  if (name === "mcp_call") {
    const params = a.params && typeof a.params === "object" && !Array.isArray(a.params) ? a.params : {};
    return {
      dispatcher: String(a.dispatcher || "").trim(),
      action: String(a.action || "").trim(),
      params,
    };
  }
  return { ...a };
}

/** True when absolute path `abs` lies inside `root` (lexical check). */
function isInsideRoot(abs, root) {
  const rel = relative(root, abs);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

/**
 * Resolve `p` against `root` and confirm it stays INSIDE `root`. Returns the
 * absolute path, or null when the path escapes the repo. Two layers:
 *   1. lexical — resolve + relative, rejects `..` traversal and absolute paths
 *      pointing elsewhere (and Windows drive paths);
 *   2. physical — if the target exists, realpathSync resolves any symlink /
 *      junction and the containment check is re-run, so a symlink INSIDE the
 *      repo that points OUTSIDE it is also rejected.
 * The model picks read_excerpt paths, so this stops it being coaxed into
 * reading files outside the repository.
 */
export function confinePath(p, root = REPO_ROOT, opts = {}) {
  if (!p || typeof p !== "string") return null;
  const trimmed = p.trim();
  if (!trimmed) return null;
  const existsImpl = opts.existsImpl || existsSync;
  const realpathImpl = opts.realpathImpl || realpathSync;
  const abs = isAbsolute(trimmed) ? resolve(trimmed) : resolve(root, trimmed);
  if (!isInsideRoot(abs, root)) return null;
  if (!existsImpl(abs)) return abs; // nothing to symlink-resolve yet
  let realRoot = root;
  try {
    realRoot = realpathImpl(root);
  } catch {
    realRoot = root; // root should always resolve; degrade to lexical root
  }
  let real;
  try {
    real = realpathImpl(abs);
  } catch {
    return null; // cannot physically resolve — refuse rather than guess
  }
  return isInsideRoot(real, realRoot) ? real : null;
}

/** Cap a tool result string to TOOL_RESULT_MAX_CHARS, marking the cut. */
export function capToolResult(s) {
  return truncate(String(s == null ? "" : s), TOOL_RESULT_MAX_CHARS);
}

/**
 * Build a `role:"tool"` message for the agent loop. `tool_name` is the field
 * Ollama's native /api/chat expects; `tool_call_id` is echoed only when the
 * model supplied an id (OpenAI-compat paths) so a multi-call turn can be
 * correlated. Content is always capped.
 */
export function toolResultMessage(name, content, id) {
  const msg = { role: "tool", content: capToolResult(content) };
  if (name) msg.tool_name = name;
  if (id != null) msg.tool_call_id = id;
  return msg;
}

/** Render the tool-call transcript for human (--trace) output. */
export function renderTranscript(toolCalls) {
  if (!toolCalls || !toolCalls.length) return "(no tools used — answered directly)";
  return toolCalls
    .map((c, i) => {
      const argStr = JSON.stringify(c.args || {});
      const head = `${i + 1}. ${c.name}(${truncate(argStr, TRACE_ARGS_CHARS)})`;
      // A tool impl reports an expected failure as an `ERROR:` result STRING
      // (read-only design) — render that as a failure too, not a success.
      const failed =
        c.error || (typeof c.result === "string" && c.result.startsWith("ERROR:"));
      const body = failed
        ? `   ✗ ${truncate(String(c.error || c.result).replace(/\s+/g, " "), TRACE_LINE_CHARS)}`
        : `   → ${truncate(String(c.result || "").replace(/\s+/g, " "), TRACE_LINE_CHARS)}`;
      return `${head}\n${body}`;
    })
    .join("\n");
}

/**
 * Honest token-economy footer for an agent run. Counts the tool-output
 * characters the local model gathered and reasoned over — a LOWER BOUND on
 * local work (the model's own prompt/assistant tokens are extra and not
 * counted) — vs. the answer returned to Claude. Deliberately does not claim a
 * precise "tokens saved" figure.
 */
export function bridgeSavingsFooter(toolCalls, answer) {
  const toolOutChars = (toolCalls || []).reduce(
    (sum, c) => sum + String(c.result || c.error || "").length,
    0,
  );
  const gatheredTok = Math.ceil(toolOutChars / CHARS_PER_TOKEN);
  const answerTok = Math.ceil(String(answer || "").length / CHARS_PER_TOKEN);
  return `↓ ollama-prism-bridge: ~${gatheredTok} tok of tool output gathered locally → ~${answerTok} tok of answer returned to Claude`;
}

// ─────────────────────────────────────────────────────────────────────────
// U-OE-BRIDGE-L2B (2026-05-18, slot foxtrot) — MCP Streamable HTTP client
// ─────────────────────────────────────────────────────────────────────────

// parseMcpResponse + mcpCallStreamable now live in ./lib/mcp-streamable-client.mjs
// (imported + re-exported at the top of this file, so existing importers/tests
// that pull them from here keep resolving byte-identically). renderMcpResult
// stays below because it depends on truncate (ask-ollama.mjs) + MCP_RESULT_MAX_CHARS.

/**
 * Render an MCP tool-call result into the compact string Ollama re-reads. The
 * MCP `tools/call` result is conventionally `{ content: [{ type:'text',
 * text:'...' }], structuredContent?, isError? }`; we prefer textual content
 * when present, fall back to structuredContent JSON, then to the envelope
 * itself. Capped to MCP_RESULT_MAX_CHARS.
 *
 * Pure.
 */
export function renderMcpResult(result) {
  if (result == null) return "(MCP returned no result)";
  if (typeof result === "string") return truncate(result, MCP_RESULT_MAX_CHARS);
  const content = Array.isArray(result.content) ? result.content : null;
  if (content && content.length) {
    const text = content
      .filter((c) => c && typeof c.text === "string")
      .map((c) => c.text)
      .join("\n");
    if (text) return truncate(text, MCP_RESULT_MAX_CHARS);
  }
  if (result.structuredContent != null) {
    try {
      return truncate(JSON.stringify(result.structuredContent, null, 2), MCP_RESULT_MAX_CHARS);
    } catch {
      // fall through
    }
  }
  try {
    return truncate(JSON.stringify(result, null, 2), MCP_RESULT_MAX_CHARS);
  } catch {
    return "(MCP result not JSON-serializable)";
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Tool implementations (read-only; impure I/O, but each is small + injectable)
// ─────────────────────────────────────────────────────────────────────────

/**
 * U-OE-BRIDGE-L2B-WIKI-LEAVES (2026-05-18, slot charlie):
 * Walk knowledge/wiki/architecture/ for *.md leaf files (excluding _*.md
 * which are stats/index files generated by regen-wiki-from-viz.mjs). Returns
 * `[{ relPath, basename }]` with forward-slash relPaths relative to `root`.
 *
 * Pure (deps injected: readdirImpl, statImpl). Fail-soft — returns [] on any
 * fs error so wiki_lookup never breaks on a missing wiki tree (R12: caller
 * surfaces the empty result honestly via the "no leaf matches" branch).
 *
 * The `seen` set defends against symlink loops + the depth cap is a second
 * safety net. The exclusion of `_*.md` filenames matches the convention
 * documented in scripts/regen-wiki-from-viz.mjs (the generator that owns
 * the leaf tree).
 *
 * @param {object} opts
 * @param {string} [opts.root]          repo root, used for relative paths
 * @param {string} [opts.leavesDirRel]  override the leaves dir (test injection)
 * @param {number} [opts.maxDepth]      directory recursion cap
 * @param {(dir:string)=>Array<{name:string,isDirectory:()=>boolean,isFile:()=>boolean}>} [opts.readdirImpl]
 * @param {(p:string)=>{isDirectory:()=>boolean}} [opts.statImpl]
 * @returns {Array<{relPath:string, basename:string}>}
 */
export function listWikiLeafFiles({
  root = REPO_ROOT,
  leavesDirRel = WIKI_LEAVES_DIR_REL,
  maxDepth = WIKI_LEAVES_MAX_DEPTH,
  readdirImpl,
  statImpl,
} = {}) {
  const readdir = readdirImpl || ((p) => readdirSync(p, { withFileTypes: true }));
  const stat = statImpl || ((p) => statSync(p));
  const out = [];
  const seen = new Set();
  const startAbs = join(root, leavesDirRel);
  try {
    if (!stat(startAbs).isDirectory()) return [];
  } catch {
    return []; // missing dir — fail-soft
  }
  const walk = (absDir, depth) => {
    if (depth > maxDepth) return;
    if (seen.has(absDir)) return; // symlink-loop defense
    seen.add(absDir);
    let entries;
    try {
      entries = readdir(absDir);
    } catch {
      return; // unreadable subdir — skip, don't blow up
    }
    for (const ent of entries) {
      if (!ent || typeof ent.name !== "string") continue;
      const name = ent.name;
      const abs = join(absDir, name);
      if (ent.isDirectory && ent.isDirectory()) {
        walk(abs, depth + 1);
        continue;
      }
      if (!(ent.isFile && ent.isFile())) continue;
      if (!name.endsWith(".md")) continue;
      if (name.startsWith("_")) continue; // _stats.md, _orphans-rescue.md, etc
      const relAbs = relative(root, abs);
      // Normalize to forward slashes for cross-platform stability + so the
      // model sees the same path shape it sees from viz_search.
      const relPath = relAbs.split(/[\\/]+/).join("/");
      out.push({ relPath, basename: name });
    }
  };
  walk(startAbs, 0);
  return out;
}

/**
 * Score leaf-file basenames against tokens. Each token's case-insensitive
 * substring presence in the basename earns 1 point. The basename's `.md` is
 * stripped before scoring so a leaf "kienzle-force.md" matched by token
 * "kienzle" scores 1 (and by "kienzle force" scores 2). Returns a NEW sorted
 * array (highest score first); ties preserve input order (stable sort).
 *
 * @param {Array<{relPath:string, basename:string}>} leaves
 * @param {string[]} tokens  already lowercased, length ≥ WIKI_MIN_TOKEN_LEN
 * @returns {Array<{relPath:string, score:number}>}
 */
export function scoreLeafFilenames(leaves, tokens) {
  if (!Array.isArray(leaves) || !Array.isArray(tokens) || tokens.length === 0) return [];
  const out = [];
  for (const leaf of leaves) {
    if (!leaf || typeof leaf.basename !== "string") continue;
    const stem = leaf.basename.toLowerCase().replace(/\.md$/, "");
    let score = 0;
    for (const t of tokens) if (t && stem.includes(t)) score += 1;
    if (score > 0) out.push({ relPath: leaf.relPath, score });
  }
  out.sort((a, b) => b.score - a.score);
  return out;
}

// Per-process leaf cache. Lazy, TTL-bounded. Keyed on root path so a future
// multi-root test never cross-contaminates. NOT exported — internal mutable
// state. Tests reach `listWikiLeafFiles` directly without the cache.
const _leafCache = new Map(); // root → { at, leaves }

function getCachedLeaves(root) {
  const now = Date.now();
  const hit = _leafCache.get(root);
  if (hit && now - hit.at < WIKI_LEAVES_CACHE_TTL_MS) return hit.leaves;
  const leaves = listWikiLeafFiles({ root });
  _leafCache.set(root, { at: now, leaves });
  return leaves;
}

/**
 * U-OBSIDIAN-LOOKUP (2026-05-18, slot delta):
 * Walk knowledge/memories/ for *.md memory files. Returns
 * `[{ relPath, basename }]` with forward-slash relPaths relative to `root`.
 *
 * Exclusions: `_*.md` (matches wiki convention for stats/index files) AND
 * the two top-level index files (`MEMORY.md`, `MEMORY-ARCHIVE.md`) — those
 * are pointer indexes, not memory content; surfacing them to Ollama as
 * tool results would clutter the agent loop with metadata.
 *
 * Pure (deps injected). Fail-soft — returns [] on any fs error so
 * obsidian_lookup never breaks on a missing memories tree (R12: caller
 * surfaces the empty result honestly).
 *
 * @param {object} opts
 * @param {string} [opts.root]          repo root, used for relative paths
 * @param {string} [opts.dirRel]        override the memories dir (test injection)
 * @param {number} [opts.maxDepth]      directory recursion cap
 * @param {string[]} [opts.excludedBasenames]
 * @param {(dir:string)=>Array<{name:string,isDirectory:()=>boolean,isFile:()=>boolean}>} [opts.readdirImpl]
 * @param {(p:string)=>{isDirectory:()=>boolean}} [opts.statImpl]
 * @returns {Array<{relPath:string, basename:string}>}
 */
export function listObsidianMemoryFiles({
  root = REPO_ROOT,
  dirRel = OBSIDIAN_MEMORIES_DIR_REL,
  maxDepth = OBSIDIAN_MAX_DEPTH,
  excludedBasenames = OBSIDIAN_EXCLUDED_BASENAMES,
  readdirImpl,
  statImpl,
} = {}) {
  const readdir = readdirImpl || ((p) => readdirSync(p, { withFileTypes: true }));
  const stat = statImpl || ((p) => statSync(p));
  const excluded = new Set(excludedBasenames || []);
  const out = [];
  const seen = new Set();
  const startAbs = join(root, dirRel);
  try {
    if (!stat(startAbs).isDirectory()) return [];
  } catch {
    return [];
  }
  const walk = (absDir, depth) => {
    if (depth > maxDepth) return;
    if (seen.has(absDir)) return;
    seen.add(absDir);
    let entries;
    try {
      entries = readdir(absDir);
    } catch {
      return;
    }
    for (const ent of entries) {
      if (!ent || typeof ent.name !== "string") continue;
      const name = ent.name;
      const abs = join(absDir, name);
      if (ent.isDirectory && ent.isDirectory()) {
        walk(abs, depth + 1);
        continue;
      }
      if (!(ent.isFile && ent.isFile())) continue;
      if (!name.endsWith(".md")) continue;
      if (name.startsWith("_")) continue;
      if (excluded.has(name)) continue;
      const relAbs = relative(root, abs);
      const relPath = relAbs.split(/[\\/]+/).join("/");
      out.push({ relPath, basename: name });
    }
  };
  walk(startAbs, 0);
  return out;
}

// Per-process obsidian-memory cache. Lazy, TTL-bounded. Keyed on root path.
// NOT exported — internal mutable state; tests reach listObsidianMemoryFiles
// directly to avoid cache contamination.
const _obsidianCache = new Map(); // root → { at, files }

function getCachedObsidianFiles(root) {
  const now = Date.now();
  const hit = _obsidianCache.get(root);
  if (hit && now - hit.at < OBSIDIAN_CACHE_TTL_MS) return hit.files;
  const files = listObsidianMemoryFiles({ root });
  _obsidianCache.set(root, { at: now, files });
  return files;
}

// ─────────────────────────────────────────────────────────────────────────
// U-SEMANTIC-LOOKUP (2026-05-18, slot delta) — semantic-search support
// ─────────────────────────────────────────────────────────────────────────

/**
 * Dequantize an int8 vector array to a float32 unit vector matching the
 * producer's quantization: `q[i] = round(v[i] * INT8_DEQUANT_SCALE)`. The
 * producer's vectors are L2-normalized BEFORE quantization (nomic-embed-text
 * default), so after dequantization the cosine similarity ≈ dot product on
 * the dequantized vectors (with a tiny quantization-noise tolerance).
 *
 * Pure. Returns a NEW Float32Array.
 *
 * @param {number[]|Int8Array} q  the integer-quantized vector
 * @returns {Float32Array}
 */
export function dequantizeInt8(q) {
  if (!q || typeof q.length !== "number") return new Float32Array(0);
  const out = new Float32Array(q.length);
  for (let i = 0; i < q.length; i++) {
    out[i] = q[i] / INT8_DEQUANT_SCALE;
  }
  return out;
}

/**
 * Dot product of two same-length numeric vectors. Returns 0 if either
 * length mismatches or is empty. The input vectors are expected to be
 * unit-normalized (cosine-equivalent semantics).
 *
 * Pure.
 *
 * @param {Float32Array|number[]} a
 * @param {Float32Array|number[]} b
 * @returns {number}
 */
export function dotProduct(a, b) {
  if (!a || !b || a.length !== b.length || a.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

/**
 * Parse one JSONL line of the embedding index. Returns {entry} on success,
 * {error} on parse failure or schema-drift, {meta:true} on the __meta line.
 * Pure (no I/O).
 *
 * @param {string} line
 * @returns {{entry?:object, meta?:boolean, error?:string}}
 */
export function parseEmbeddingLine(line) {
  if (!line || !line.trim()) return { error: "empty line" };
  let obj;
  try { obj = JSON.parse(line); }
  catch (e) { return { error: `invalid JSON: ${e && e.message}` }; }
  if (obj && obj.__meta === true) return { meta: true, info: obj };
  if (!obj || typeof obj !== "object") return { error: "not an object" };
  if (typeof obj.n !== "string" || !obj.n) return { error: "missing 'n' name field" };
  if (!Array.isArray(obj.q)) return { error: "missing 'q' vector field" };
  if (obj.q.length !== EMBEDDING_DIM) return { error: `q length ${obj.q.length} ≠ EMBEDDING_DIM ${EMBEDDING_DIM}` };
  return { entry: obj };
}

/**
 * Load the embedding index from disk. Returns `{ok, meta, entries[], skipped}`
 * where skipped counts malformed lines (fail-soft per line). On a missing
 * file or unreadable disk → `{ok:false, error}`.
 *
 * Pure-shell: dep-injected `readImpl` so tests don't touch the real ~75MB file.
 *
 * @param {object} opts
 * @param {string} [opts.root]
 * @param {string} [opts.filePath]  override (test injection)
 * @param {(path:string)=>string} [opts.readImpl]
 * @returns {{ok:boolean, meta?:object, entries?:Array<{n:string,t?:string,q:number[]}>, skipped?:number, error?:string}}
 */
export function loadEmbeddingIndex({ root = REPO_ROOT, filePath = null, readImpl = null } = {}) {
  const abs = filePath || join(root, EMBEDDINGS_REL);
  let raw;
  try {
    raw = readImpl ? readImpl(abs) : readFileSync(abs, "utf-8");
  } catch (e) {
    return { ok: false, error: `cannot read embeddings file ${abs}: ${e && e.message}` };
  }
  const lines = raw.split(/\r?\n/);
  let meta = null;
  const entries = [];
  let skipped = 0;
  for (const line of lines) {
    if (!line) continue;
    const parsed = parseEmbeddingLine(line);
    if (parsed.meta) { meta = parsed.info; continue; }
    if (parsed.error) { skipped++; continue; }
    entries.push(parsed.entry);
  }
  if (entries.length === 0) {
    return { ok: false, error: "embedding index is empty (no valid entries)", skipped };
  }
  // P2-a (Arm B scrutiny): producer-model drift guard. The dim check inside
  // parseEmbeddingLine catches `dim 768 ≠ X`, but a different 768-d model
  // (e.g., mxbai-embed-large 768-d configurations) passes the dim guard and
  // produces SILENTLY MEANINGLESS rankings since the embedding spaces differ.
  // Fail-loud when the meta line declares a model other than the configured one.
  if (meta && typeof meta.model === "string" && meta.model !== EMBEDDINGS_MODEL) {
    return {
      ok: false,
      error: `embedding index was generated by model '${meta.model}' but consumer expects '${EMBEDDINGS_MODEL}' — re-generate with the matching model or update EMBEDDINGS_MODEL`,
      skipped,
    };
  }
  return { ok: true, meta, entries, skipped };
}

/**
 * Rank embedding entries by cosine similarity to a query vector. Returns
 * the top-K entries with their scores. Stable sort (highest first).
 *
 * Pure. BOTH the query and each entry vector are L2-normalized inside this
 * function — the int8 → float32 round-trip drifts producer-side vectors off
 * the unit sphere (live observation: pre-fix scores exceeded 1.0). Without
 * per-entry normalization, the score is a scaled dot product, not cosine
 * similarity — the ranking order is correct but the label would be wrong.
 * Normalize-on-rank is ~12ms at 14738 entries; trivial.
 *
 * P2-b (Arm B scrutiny, 2026-05-18): closes honesty gap on the user-facing
 * "cosine similarity" string in the impl body — now it's actually cosine.
 *
 * @param {Float32Array|number[]} queryVec  the embedding of the user query
 * @param {Array<{n:string,t?:string,q:number[]}>} entries
 * @param {number} k  max results to return
 * @returns {Array<{name:string, type:string|null, score:number}>}
 */
export function cosineRank(queryVec, entries, k) {
  if (!queryVec || !queryVec.length || !Array.isArray(entries) || entries.length === 0) return [];
  // Normalize the query vector (defensive against non-unit input).
  let qNorm = 0;
  for (let i = 0; i < queryVec.length; i++) qNorm += queryVec[i] * queryVec[i];
  qNorm = Math.sqrt(qNorm);
  if (qNorm === 0) return [];
  const q = new Float32Array(queryVec.length);
  for (let i = 0; i < queryVec.length; i++) q[i] = queryVec[i] / qNorm;
  const scored = [];
  for (const entry of entries) {
    if (!entry || !Array.isArray(entry.q) || entry.q.length !== q.length) continue;
    const v = dequantizeInt8(entry.q);
    // Per-entry L2 normalize so dot(q,v) is true cosine similarity ∈ [-1, 1].
    let vNorm = 0;
    for (let i = 0; i < v.length; i++) vNorm += v[i] * v[i];
    vNorm = Math.sqrt(vNorm);
    if (vNorm === 0) continue; // zero-vector entry → skip (no meaningful angle)
    const inv = 1 / vNorm;
    for (let i = 0; i < v.length; i++) v[i] *= inv;
    const s = dotProduct(q, v);
    scored.push({ name: entry.n, type: entry.t ?? null, score: s });
  }
  scored.sort((a, b) => b.score - a.score);
  const kk = Math.max(1, Math.min(k || SEMANTIC_MAX_HITS, SEMANTIC_MAX_HITS));
  return scored.slice(0, kk);
}

/**
 * Embed a query string via Ollama's `/api/embeddings`. Returns
 * `{ok:true, vector:number[]}` or `{ok:false, error}`. Never throws.
 *
 * Pure shell — `fetchImpl` injected for tests so this never opens a socket
 * in hermetic runs.
 *
 * @param {string} query
 * @param {object} [opts]
 * @param {string} [opts.model]
 * @param {string} [opts.ollamaUrl]
 * @param {number} [opts.timeoutMs]
 * @param {typeof fetch} [opts.fetchImpl]
 * @returns {Promise<{ok:boolean, vector?:number[], error?:string}>}
 */
async function embedViaOllamaAttempt(query, ollamaUrl, laneFlag, model, timeoutMs, fetchImpl) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const body = laneFlag ? withLaneOptions({ model, prompt: query }) : { model, prompt: query };
    const res = await fetchImpl(`${ollamaUrl}/api/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      return { ok: false, error: `Ollama embeddings HTTP ${res.status}: ${String(txt).slice(0, 200)} @ ${ollamaUrl}` };
    }
    const json = await res.json();
    if (!json || !Array.isArray(json.embedding)) {
      return { ok: false, error: `Ollama embeddings response missing 'embedding' array @ ${ollamaUrl}` };
    }
    if (json.embedding.length !== EMBEDDING_DIM) {
      return { ok: false, error: `Ollama embeddings dim ${json.embedding.length} != expected ${EMBEDDING_DIM} (model mismatch?) @ ${ollamaUrl}` };
    }
    return { ok: true, vector: json.embedding };
  } catch (e) {
    const why = e && e.name === "AbortError"
      ? `Ollama embeddings timed out after ${timeoutMs}ms @ ${ollamaUrl}`
      : `Ollama unreachable for embeddings: ${e && e.message} @ ${ollamaUrl}`;
    return { ok: false, error: why };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Embed a query string via Ollama's `/api/embeddings`. Returns
 * `{ok:true, vector:number[]}` or `{ok:false, error}`. Never throws.
 *
 * Pure shell -- `fetchImpl` injected for tests so this never opens a socket
 * in hermetic runs.
 *
 * U-INDIA-EMBED-LANE: no explicit opts.ollamaUrl + the REAL `fetch` in use ->
 * prefer the dedicated CPU embed lane (:11435) so this semantic_search tool
 * call survives fleet inference load on :11434. An injected fetchImpl (tests)
 * or an explicit ollamaUrl keeps legacy single-URL behavior untouched. A
 * FAILED lane attempt retries MAIN once (withMainFallback) -- a broken lane
 * degrades to today's exact behavior, never blackholes the agent loop.
 *
 * @param {string} query
 * @param {object} [opts]
 * @param {string} [opts.model]
 * @param {string} [opts.ollamaUrl]
 * @param {number} [opts.timeoutMs]
 * @param {typeof fetch} [opts.fetchImpl]
 * @returns {Promise<{ok:boolean, vector?:number[], error?:string}>}
 */
export async function embedViaOllama(query, opts = {}) {
  const { model = EMBEDDINGS_MODEL, ollamaUrl, timeoutMs = EMBEDDINGS_TIMEOUT_MS, fetchImpl = fetch } = opts;
  if (!query || typeof query !== "string" || !query.trim()) {
    return { ok: false, error: "embedViaOllama: empty query" };
  }
  const autoResolve = !ollamaUrl && fetchImpl === fetch;
  if (autoResolve) {
    const lane = await resolveEmbedUrl();
    return withMainFallback(lane, (url, laneFlag) =>
      embedViaOllamaAttempt(query, url, laneFlag, model, timeoutMs, fetchImpl));
  }
  return embedViaOllamaAttempt(query, ollamaUrl || OLLAMA_URL, false, model, timeoutMs, fetchImpl);
}

// Per-process cache for the (heavy) loaded embedding index. Keyed on root.
const _embeddingsCache = new Map(); // root → { at, result }

function getCachedEmbeddings(root) {
  const now = Date.now();
  const hit = _embeddingsCache.get(root);
  if (hit && now - hit.at < EMBEDDINGS_CACHE_TTL_MS) return hit.result;
  const result = loadEmbeddingIndex({ root });
  _embeddingsCache.set(root, { at: now, result });
  return result;
}

// P1.2 fix (per-file scrutiny arm-B, 2026-05-18): root-keyed graph cache,
// uniform with _leafCache / _obsidianCache / _embeddingsCache. Per-process,
// no TTL (the graph is regenerated at build time; in-process refresh is the
// regen orchestrator's job, not the bridge's). NOT exported — internal mutable
// state; tests reach loadGraph directly to avoid cache contamination.
const _graphCache = new Map(); // root → { ok, graph, file } | { ok:false, error }

function getCachedGraph(root) {
  const hit = _graphCache.get(root);
  if (hit) return hit;
  const result = loadGraph({ root });
  _graphCache.set(root, result);
  return result;
}

/**
 * Build the real read-only tool implementations. `graphCache` holds the parsed
 * system-viz graph so repeated viz_search calls in one run parse it once.
 * Each impl returns a string (the tool result) and never throws for an
 * expected failure — it returns an explicit `ERROR: …` string the model sees.
 */
export function buildToolImpls({ root = REPO_ROOT, mcpClient = null } = {}) {
  return {
    viz_search(args) {
      const { query, maxHits } = clampToolArgs("viz_search", args);
      // P1.2 fix (per-file scrutiny arm-B, 2026-05-18): graphCache was a
      // closure-local `let` shared across all 7 tool impls. Long-lived
      // bridges (containers per OLLAMA-PRISM-MCP-BRIDGE-DESIGN.md §"Layer 2+
      // deployment") would leak the ~80MB-capped graph per restart. Switching
      // to the root-keyed Map matches the existing _leafCache /
      // _obsidianCache / _embeddingsCache pattern in this file.
      const cached = getCachedGraph(root);
      if (!cached.ok) return `ERROR: ${cached.error}`;
      const hits = searchGraph(query, cached.graph, maxHits);
      const scanned = Array.isArray(cached.graph.nodes) ? cached.graph.nodes.length : 0;
      return capToolResult(
        `${renderHits(hits)}\n(scanned ${scanned} nodes in ${cached.file}, ${hits.length} hit(s))`,
      );
    },
    wiki_lookup(args) {
      const { name } = clampToolArgs("wiki_lookup", args);
      const idx = readFileCapped(WIKI_INDEX_REL, { root });
      if (!idx.ok) return `ERROR: ${idx.error}`;
      const tokens = String(name)
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((t) => t.length >= WIKI_MIN_TOKEN_LEN);
      if (!tokens.length) {
        return `ERROR: wiki_lookup query has no searchable terms (≥${WIKI_MIN_TOKEN_LEN} chars)`;
      }
      const lines = idx.content.split(/\r?\n/);
      const matched = [];
      for (const line of lines) {
        const lc = line.toLowerCase();
        let score = 0;
        for (const t of tokens) if (lc.includes(t)) score += 1;
        if (score > 0) matched.push({ line: line.trim(), score });
      }
      const truncNote = idx.truncated
        ? `\n(note: wiki index truncated at ${idx.content.length} of ${idx.bytes} bytes — search is partial)`
        : "";
      matched.sort((a, b) => b.score - a.score);
      const indexBody = matched.length
        ? matched.slice(0, WIKI_MAX_HITS).map((m) => m.line).join("\n")
        : "";
      // U-OE-BRIDGE-L2B-WIKI-LEAVES: ALSO scan the 1500+ leaf filenames
      // under knowledge/wiki/architecture/. The index hits curated 722
      // entries; the leaves expose the rest. Filename-only scan — fast,
      // BUT means a leaf whose CONTENT matches the query but whose basename
      // is compact (e.g. `engines/physics/kfm.md` containing "Kienzle force
      // model") will NOT match here. The model can fall back to viz_search
      // for those — viz scans node content, not paths.
      const leaves = getCachedLeaves(root);
      const leafHits = scoreLeafFilenames(leaves, tokens).slice(0, WIKI_LEAVES_MAX_HITS);
      const leafBody = leafHits.length
        ? "Leaf wiki files (use read_excerpt to read):\n" +
          leafHits.map((h) => `  ${h.relPath}`).join("\n")
        : "";
      // U-OE-BRIDGE-L2B-WIKI-LEAVES P2 (arm-B fail-loud): if the leaf scan
      // returned 0 leaves AND the directory itself is missing on disk, the
      // operator should KNOW the leaf surface is unavailable rather than
      // collapsing "scan broken" and "no match" into one ambiguous response.
      const leafScanNote =
        leaves.length === 0 && !existsSync(join(root, WIKI_LEAVES_DIR_REL))
          ? "\n(note: wiki leaf directory not found — only index.md was searched)"
          : "";
      if (!indexBody && !leafBody) {
        return `(no wiki entries match "${name}")${truncNote}${leafScanNote}`;
      }
      const parts = [];
      if (indexBody) parts.push(indexBody);
      if (leafBody) parts.push(leafBody);
      return capToolResult(parts.join("\n\n") + truncNote + leafScanNote);
    },
    read_excerpt(args) {
      const { path, maxBytes } = clampToolArgs("read_excerpt", args);
      const abs = confinePath(path, root);
      if (!abs) return `ERROR: path '${path}' is outside the PRISM repository — refused`;
      const f = readFileCapped(abs, { root });
      if (!f.ok) return `ERROR: ${f.error}`;
      const slice = f.content.length > maxBytes ? f.content.slice(0, maxBytes) : f.content;
      const isExcerpt = slice.length < f.content.length || f.truncated;
      const note = isExcerpt
        ? ` (excerpt: first ${slice.length} chars of a ${f.bytes}-byte file)`
        : ` (${f.bytes}-byte file, shown in full)`;
      return capToolResult(`FILE: ${path}${note}\n${slice}`);
    },
    dispatcher_map(args) {
      // L2b migration anchor: when the live MCP HTTP transport ships, the
      // body below should be replaced with a call to
      // prism_session:dispatcher_map_compact (already in
      // mcp-server/src/tools/dispatchers/sessionDispatcher.ts). File-scan is
      // the pragmatic L2b path because the bridge cannot speak MCP yet.
      // See [[reference_ollama_prism_bridge_l2]].
      const { query } = clampToolArgs("dispatcher_map", args);
      const tokens = String(query)
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((t) => t.length >= DISPATCHER_MIN_TOKEN_LEN);
      if (!tokens.length) {
        return `ERROR: dispatcher_map query has no searchable terms (≥${DISPATCHER_MIN_TOKEN_LEN} chars)`;
      }
      const file = readFileCapped(DISPATCHER_DIGEST_REL, { root });
      if (!file.ok) return `ERROR: ${file.error}`;
      // R12 schema-drift fail-loud (P1-B2): the consumer is bound to the
      // producer's exact header line. If the producer renames a column or
      // reorders, return loudly instead of silently corrupting the row filter.
      if (!file.content.includes("| Dispatcher | Domain | Actions |")) {
        return `ERROR: dispatcher digest schema drift detected at ${DISPATCHER_DIGEST_REL.replace(/\\/g, "/")} — re-run scripts/generate-dispatcher-digest.mjs`;
      }
      const lines = file.content.split(/\r?\n/);
      // Match only table rows (start with `|`) and skip the header/separator.
      // Markdown header: `| Dispatcher | Domain | Actions |`
      // Separator     : `|-----------|--------|---------|`
      // Row           : `| <name> | <domain> | <actions> |`
      const rows = lines.filter(
        (l) => l.startsWith("|") && !/^\|\s*-+/.test(l) && !/\|\s*Dispatcher\s*\|/i.test(l),
      );
      const matched = [];
      for (const row of rows) {
        const lc = row.toLowerCase();
        let score = 0;
        for (const t of tokens) if (lc.includes(t)) score += 1;
        if (score > 0) matched.push({ row: row.trim(), score });
      }
      matched.sort((a, b) => b.score - a.score);
      if (!matched.length) {
        return `(no dispatcher rows match "${query}" — scanned ${rows.length} rows in ${DISPATCHER_DIGEST_REL.replace(/\\/g, "/")})`;
      }
      const hits = matched.slice(0, DISPATCHER_MAP_MAX_HITS);
      const truncNote = file.truncated
        ? `\n(note: dispatcher digest truncated at ${file.content.length} of ${file.bytes} bytes — search is partial)`
        : "";
      const moreNote =
        matched.length > hits.length
          ? `\n(+${matched.length - hits.length} more match(es) not shown — refine query)`
          : "";
      const body =
        `PRISM dispatchers matching "${query}":\n` +
        hits.map((m) => m.row).join("\n") +
        `\n(${hits.length} of ${matched.length} matched rows from ${rows.length} total)` +
        moreNote +
        truncNote;
      return capToolResult(body);
    },
    async semantic_search(args) {
      const { query, maxHits } = clampToolArgs("semantic_search", args);
      if (!query || query.length < SEMANTIC_MIN_QUERY_LEN) {
        return `ERROR: semantic_search query is too short (need ≥${SEMANTIC_MIN_QUERY_LEN} chars)`;
      }
      // 1. Embed via Ollama. Fails-loud: a 5xx / unreachable returns ERROR
      // with an explicit fallback hint so the model can swap to wiki_lookup
      // or obsidian_lookup which don't need Ollama.
      const embed = await embedViaOllama(query);
      if (!embed.ok) {
        return `ERROR: ${embed.error} — fall back to wiki_lookup(name) or obsidian_lookup(query) which don't need Ollama embeddings`;
      }
      // 2. Load the (cached) embedding index.
      const idx = getCachedEmbeddings(root);
      if (!idx.ok) return `ERROR: ${idx.error}`;
      // 3. Rank by cosine similarity.
      const hits = cosineRank(embed.vector, idx.entries, maxHits);
      if (!hits.length) {
        return `(no semantic matches for "${query}" — searched ${idx.entries.length} indexed entries)`;
      }
      const body =
        `Semantic search hits for "${query}" (cosine similarity vs ${idx.entries.length} embedded entries):\n` +
        hits.map((h) => `  ${h.name} [${h.type ?? "?"}]  (score ${h.score.toFixed(3)})`).join("\n") +
        `\n(top ${hits.length} of ${idx.entries.length} ranked; each name maps to knowledge/wiki/architecture/<n>.md — use read_excerpt)`;
      return capToolResult(body);
    },
    obsidian_lookup(args) {
      const { query } = clampToolArgs("obsidian_lookup", args);
      const tokens = String(query)
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((t) => t.length >= OBSIDIAN_MIN_TOKEN_LEN);
      if (!tokens.length) {
        return `ERROR: obsidian_lookup query has no searchable terms (≥${OBSIDIAN_MIN_TOKEN_LEN} chars)`;
      }
      const files = getCachedObsidianFiles(root);
      // Fail-loud (R12): distinguish "no match" from "scan broken" so a missing
      // memories tree is never silently collapsed into "no results".
      if (files.length === 0 && !existsSync(join(root, OBSIDIAN_MEMORIES_DIR_REL))) {
        return `ERROR: obsidian memories directory not found at ${OBSIDIAN_MEMORIES_DIR_REL}`;
      }
      const hits = scoreLeafFilenames(files, tokens).slice(0, OBSIDIAN_MAX_HITS);
      if (!hits.length) {
        return `(no obsidian memory files match "${query}" — scanned ${files.length} files under ${OBSIDIAN_MEMORIES_DIR_REL})`;
      }
      const body =
        "Obsidian memory files (use read_excerpt to read full memory):\n" +
        hits.map((h) => `  ${h.relPath}  (score ${h.score})`).join("\n") +
        `\n(${hits.length} of ${files.length} memory files matched)`;
      return capToolResult(body);
    },
    async mcp_call(args) {
      // Validate AGAIN at the impl boundary — defense-in-depth: validateToolCall
      // upstream already rejected disallowed actions, but the impl re-checks so
      // a future caller invoking buildToolImpls() directly cannot bypass.
      const v = validateMcpCall(args && args.dispatcher, args && args.action, args && args.params);
      if (!v.ok) return `ERROR: ${v.error}`;
      // Inject the client so tests can pass a stub; default to the real
      // Streamable HTTP impl that hits MCP_URL.
      const client = mcpClient || mcpCallStreamable;
      let res;
      try {
        res = await client({ dispatcher: v.dispatcher, action: v.action, params: v.params });
      } catch (e) {
        return `ERROR: mcp_call threw (this is a bug — clients must return {ok,error}): ${e && e.message ? e.message : e}`;
      }
      if (!res || typeof res !== "object") {
        return "ERROR: mcp_call client returned a malformed response (expected {ok, result|error})";
      }
      if (!res.ok) {
        return `ERROR: ${res.error || "mcp_call failed (no error message)"}`;
      }
      const rendered = renderMcpResult(res.result);
      const header = `MCP ${v.dispatcher}:${v.action} →\n`;
      return capToolResult(header + rendered);
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Impure shell — Ollama I/O + the agent loop (deps injected for testing)
// ─────────────────────────────────────────────────────────────────────────

/**
 * POST one non-streaming /api/chat request, optionally advertising `tools`.
 * Returns { ok, message } or { ok:false, error }. Never throws.
 */
export async function chatOllama(model, messages, tools, opts = {}) {
  const { fetchImpl = fetch, timeoutMs = DEFAULT_TIMEOUT_MS, ollamaUrl = OLLAMA_URL } = opts;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const body = {
      model,
      messages,
      stream: false,
      keep_alive: KEEP_ALIVE,
      options: { temperature: CHAT_TEMPERATURE },
    };
    if (tools && tools.length) body.tools = tools;
    const res = await fetchImpl(`${ollamaUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      return { ok: false, error: `Ollama HTTP ${res.status}: ${String(txt).slice(0, 200)}` };
    }
    const json = await res.json();
    if (!json || !json.message) return { ok: false, error: "Ollama returned no message" };
    if (typeof json.message !== "object" || Array.isArray(json.message)) {
      return { ok: false, error: "Ollama returned a malformed message (not an object)" };
    }
    return { ok: true, message: json.message };
  } catch (e) {
    const why =
      e && e.name === "AbortError"
        ? `Ollama /api/chat timed out after ${timeoutMs}ms (model may be cold-loading — retry, or pre-warm with: ollama run ${model})`
        : `Ollama unreachable: ${e && e.message}`;
    return { ok: false, error: why };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Run the agent loop. Pure orchestration over injected deps:
 *   deps.chatImpl(model, messages, tools, opts) → { ok, message }
 *   deps.toolImpls — { [name]: (args) => string | Promise<string> }
 *
 * Returns {
 *   ok, answer, capped, iterations, toolCalls:[{name,args,result,error}],
 *   error
 * }. `capped` is true when the loop hit maxCalls still wanting tools — a final
 * no-tools turn is then forced so the model still produces an answer.
 *
 * A chatImpl that THROWS (rather than returning {ok:false}) is caught and
 * converted to a fail-loud { ok:false, error } — the harness never crashes
 * with an unexplained exception (R12).
 */
export async function runAgentLoop({ question, model, maxCalls = DEFAULT_MAX_CALLS, timeoutMs = DEFAULT_TIMEOUT_MS, deps = {} }) {
  const chatImpl = deps.chatImpl || chatOllama;
  const toolImpls = deps.toolImpls || buildToolImpls();
  const specs = toolSpecs();
  const messages = [
    { role: "system", content: buildSystemPrompt() },
    { role: "user", content: String(question || "") },
  ];
  const toolCalls = [];
  let iterations = 0;

  while (iterations < maxCalls) {
    iterations++;
    let res;
    try {
      res = await chatImpl(model, messages, specs, { timeoutMs });
    } catch (e) {
      return {
        ok: false,
        error: `chat call threw: ${e && e.message ? e.message : e}`,
        iterations,
        toolCalls,
        capped: false,
      };
    }
    if (!res || !res.ok) {
      return { ok: false, error: (res && res.error) || "chat call returned no result", iterations, toolCalls, capped: false };
    }
    const msg = res.message || {};
    messages.push(msg);
    const calls = Array.isArray(msg.tool_calls) ? msg.tool_calls : [];
    if (!calls.length) {
      // No tool calls — this is the final answer.
      return {
        ok: true,
        answer: String(msg.content || "").trim() || "(model returned an empty answer)",
        capped: false,
        iterations,
        toolCalls,
      };
    }
    // Execute every requested tool call; feed each result back as a tool
    // message (one per call, preserving 1:1 order so a multi-call turn stays
    // correlated even on a native /api/chat path without tool_call_id).
    for (const rawCall of calls) {
      const norm = normalizeToolCall(rawCall);
      if (norm.error) {
        toolCalls.push({ name: "(malformed)", args: {}, error: norm.error });
        messages.push(toolResultMessage(null, `ERROR: ${norm.error}`, null));
        continue;
      }
      const valid = validateToolCall(norm.name, norm.args);
      if (!valid.ok) {
        toolCalls.push({ name: norm.name, args: norm.args, error: valid.error });
        messages.push(toolResultMessage(norm.name, `ERROR: ${valid.error}`, norm.id));
        continue;
      }
      const impl = toolImpls[valid.name];
      let result;
      let error;
      if (typeof impl !== "function") {
        error = `tool '${valid.name}' has no implementation`;
      } else {
        try {
          result = await impl(valid.args);
        } catch (e) {
          error = `tool '${valid.name}' threw: ${e && e.message ? e.message : e}`;
        }
      }
      if (error) {
        toolCalls.push({ name: valid.name, args: valid.args, error });
        messages.push(toolResultMessage(valid.name, `ERROR: ${error}`, norm.id));
      } else {
        const resultStr = capToolResult(result);
        toolCalls.push({ name: valid.name, args: valid.args, result: resultStr });
        messages.push(toolResultMessage(valid.name, resultStr, norm.id));
      }
    }
  }

  // Cap reached while the model still wanted tools — force one final answer
  // with the tool surface withdrawn so it must synthesize from what it has.
  let final;
  try {
    final = await chatImpl(model, messages, undefined, { timeoutMs });
  } catch (e) {
    final = { ok: false, error: `final synthesis chat threw: ${e && e.message ? e.message : e}` };
  }
  if (!final || !final.ok) {
    return {
      ok: true,
      answer: `(tool-call cap reached; final synthesis failed: ${(final && final.error) || "no result"})`,
      capped: true,
      iterations,
      toolCalls,
    };
  }
  return {
    ok: true,
    answer: String((final.message && final.message.content) || "").trim() ||
      "(tool-call cap reached; model produced no final answer)",
    capped: true,
    iterations,
    toolCalls,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// CLI
// ─────────────────────────────────────────────────────────────────────────

const USAGE = `ollama-prism-bridge — Ollama agentic harness over PRISM read-only knowledge tools

  node scripts/ollama-prism-bridge.mjs "<question>"
  node scripts/ollama-prism-bridge.mjs "where is cutting force computed?" --trace

flags: --model <name> --max-calls <n> --timeout <ms> --json --trace

Ollama autonomously chains viz_search / wiki_lookup / read_excerpt locally;
only the final answer returns to Claude. Exit: 0 ok · 2 usage · 3 infra.`;

/**
 * Execute one bridge request. All I/O goes through injected deps so this is
 * unit-testable without a live model. Returns { exitCode, output }.
 */
export async function runBridge(parsed, deps = {}) {
  const { question, flags } = parsed;
  const model = pickModel(flags.model);
  const run = await runAgentLoop({
    question,
    model,
    maxCalls: flags.maxCalls,
    timeoutMs: flags.timeout,
    deps,
  });

  if (!run.ok) {
    const out = flags.json
      ? JSON.stringify({ ok: false, model, error: run.error, toolCalls: run.toolCalls }, null, 2)
      : `[ollama-prism-bridge] ${run.error}`;
    return { exitCode: 3, output: out };
  }

  if (flags.json) {
    return {
      exitCode: 0,
      output: JSON.stringify(
        {
          ok: true,
          model,
          question,
          answer: run.answer,
          capped: run.capped,
          iterations: run.iterations,
          toolCalls: run.toolCalls.map((c) => ({ name: c.name, args: c.args, error: c.error || null })),
        },
        null,
        2,
      ),
    };
  }

  const parts = [run.answer];
  if (flags.trace) {
    parts.push("", "── tool transcript ──", renderTranscript(run.toolCalls));
  }
  const cappedNote = run.capped ? " [tool-call cap hit — answer is best-effort]" : "";
  parts.push(
    "",
    `↓ ollama-prism-bridge: ${run.iterations} agent turn(s), ${run.toolCalls.length} tool call(s) ran locally${cappedNote}`,
    bridgeSavingsFooter(run.toolCalls, run.answer),
  );
  return { exitCode: 0, output: parts.join("\n") };
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2));
  if (parsed.error) {
    console.error(`[ollama-prism-bridge] ${parsed.error}\n\n${USAGE}`);
    process.exit(2);
  }
  const { exitCode, output } = await runBridge(parsed);
  (exitCode === 0 ? console.log : console.error)(output);
  process.exit(exitCode);
}

// Run only as a CLI, never on import (keeps the test harness clean).
const INVOKED_DIRECTLY =
  process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (INVOKED_DIRECTLY) {
  void main().catch((e) => {
    console.error(`[ollama-prism-bridge] fatal: ${e && e.stack ? e.stack : e}`);
    process.exit(1);
  });
}

// Exported constants for tests / callers.
export {
  REPO_ROOT,
  OLLAMA_URL,
  DEFAULT_MODEL,
  DEFAULT_MAX_CALLS,
  MAX_CALLS_CEIL,
  TOOL_RESULT_MAX_CHARS,
  READ_EXCERPT_DEFAULT_BYTES,
  READ_EXCERPT_MAX_BYTES,
  VIZ_DEFAULT_HITS,
  VIZ_MAX_HITS,
  WIKI_INDEX_REL,
  WIKI_LEAVES_DIR_REL,
  WIKI_LEAVES_MAX_HITS,
  WIKI_LEAVES_MAX_DEPTH,
  OBSIDIAN_MEMORIES_DIR_REL,
  OBSIDIAN_MAX_HITS,
  OBSIDIAN_MIN_TOKEN_LEN,
  OBSIDIAN_MAX_DEPTH,
  OBSIDIAN_EXCLUDED_BASENAMES,
  DISPATCHER_DIGEST_REL,
  DISPATCHER_MAP_MAX_HITS,
  DISPATCHER_MIN_TOKEN_LEN,
  EMBEDDINGS_REL,
  EMBEDDINGS_MODEL,
  EMBEDDING_DIM,
  INT8_DEQUANT_SCALE,
  SEMANTIC_MAX_HITS,
  SEMANTIC_MIN_QUERY_LEN,
  EMBEDDINGS_TIMEOUT_MS,
};
