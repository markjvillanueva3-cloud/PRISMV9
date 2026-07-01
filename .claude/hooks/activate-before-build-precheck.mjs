#!/usr/bin/env node
// tier: T0
/**
 * activate-before-build-precheck.mjs — PreToolUse:Write/MultiEdit advisory hook
 *
 * U-ACTIVATE-BEFORE-BUILD-PRECHECK (JULIETT-12CHAT-ALLOCATION-MS0)
 *
 * Surfaces top-K master-index hits BEFORE a chat writes a NEW engine / hook /
 * skill file. Advisory only — does NOT block (sibling `duplication-hard-block.mjs`
 * handles exact-name match; this is the "what's similar / what should I activate
 * first" layer that catches a chat about to re-derive existing functionality
 * under a fresh name).
 *
 * Path filter (source files only — NOT tests, NOT dispatchers):
 *   - mcp-server/src/engines/<Name>Engine.ts
 *   - .claude/hooks/<name>.mjs
 *   - .claude/commands/<name>.md
 *
 * Skips:
 *   - *.test.ts / *.test.mjs / *.spec.* (test files reference patterns; not new builds)
 *   - Files that already exist (this is an EDIT, not a create)
 *   - Empty / silent-fail on any error (advisory layer; never block production)
 *
 * Knob: PRISM_ACTIVATE_PRECHECK_DISABLE=1 → silent no-op
 * Knob: PRISM_ACTIVATE_PRECHECK_K=N → top-K (default 5; clamp 1..15)
 * Knob: PRISM_ACTIVATE_PRECHECK_LIB_PATH → override the master-index-search-lib path
 *       (testability + portability — defaults to H:/prism/scripts/lib/master-index-search-lib.mjs).
 *
 * Reads stdin: {tool, input:{file_path,content?,new_string?}}.
 * Emits:       hookSpecificOutput.additionalContext OR suppressOutput on empty.
 *
 * Doctrine driver: [[feedback_dont_wire_for_wiring_sake_2026_05_16]] — 4
 * collision incidents in 24h prove chats still build before searching.
 */

import { readFileSync, existsSync } from "fs";
import { pathToFileURL } from "url";

// ─────────────────────────────────────────────────────────────────────────────
// Pure: path classification + asset-name extraction
// ─────────────────────────────────────────────────────────────────────────────

const SOURCE_PATTERNS = [
  // Engines: *Engine.ts (NOT .test.ts, NOT .d.ts)
  { kind: "engine", re: /\/engines\/([A-Za-z0-9_]+Engine)\.ts$/ },
  // Hooks: <name>.mjs (NOT .test.mjs)
  { kind: "hook", re: /\/\.claude\/hooks\/([A-Za-z0-9_-]+)\.mjs$/ },
  // Skills: <name>.md
  { kind: "skill", re: /\/\.claude\/commands\/([A-Za-z0-9_-]+)\.md$/ },
];

const TEST_OR_NONSOURCE = /\.(test|spec|d)\.(ts|mjs|js)$/i;

/**
 * Returns { kind, name } if filePath is a new-source create target, else null.
 * Normalizes Windows backslashes to forward-slash so the regexes are portable.
 *
 * @param {string} filePath
 * @returns {{kind:"engine"|"hook"|"skill", name:string}|null}
 */
export function classifyPath(filePath) {
  if (typeof filePath !== "string" || !filePath) return null;
  const norm = filePath.replace(/\\/g, "/");
  // Strip drive prefix variations (H:/prism/, /h/prism/, .) — patterns match
  // anywhere in the path so we don't need to anchor them.
  if (TEST_OR_NONSOURCE.test(norm)) return null;
  for (const { kind, re } of SOURCE_PATTERNS) {
    const m = norm.match(re);
    if (m && m[1]) return { kind, name: m[1] };
  }
  return null;
}

/**
 * Build the search query — the asset name with CamelCase / kebab / snake split
 * so the BM25 tokenizer can match multi-token blobs.
 *
 * Example:
 *   "DuplicationGuardEngine" → "DuplicationGuardEngine Duplication Guard Engine"
 *   "activate-before-build-precheck" → "activate-before-build-precheck activate before build precheck"
 *
 * The lib's `tokenize` will split on non-alphanumerics anyway; we just feed it
 * BOTH the joined form AND the split form so single-token kebab queries (which
 * the lib would emit as one token) still hit multi-word engine labels.
 *
 * @param {string} name
 * @returns {string}
 */
export function buildQuery(name) {
  if (typeof name !== "string" || !name) return "";
  // Camel split: insert space before each capital letter mid-word
  const camel = name.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  // Kebab/snake: replace with spaces
  const split = camel.replace(/[-_]+/g, " ");
  return `${name} ${split}`.trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// Pure: result formatting
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Renders the top-K hits block. Empty hits → empty string (caller suppresses).
 *
 * @param {string} assetKind
 * @param {string} assetName
 * @param {Array<{id:string,label?:string,layer?:string,status?:string,score?:number}>} hits
 * @returns {string}
 */
export function renderBlock(assetKind, assetName, hits) {
  if (!Array.isArray(hits) || hits.length === 0) return "";
  const lines = [
    `## 🔍 Activate-before-build precheck — ${assetKind} \`${assetName}\``,
    `Top ${hits.length} similar existing asset(s) in PRISM. Before writing a new ${assetKind}, verify none of these already solve your problem (R8 — read before you write):`,
    "",
  ];
  for (const h of hits) {
    if (!h || typeof h.id !== "string") continue;
    const label = (typeof h.label === "string" && h.label) ? ` — ${h.label}` : "";
    const layer = (typeof h.layer === "string") ? `${h.layer}/` : "";
    const status = (typeof h.status === "string") ? `${h.status}` : "?";
    const score = (typeof h.score === "number") ? ` (score=${h.score.toFixed(2)})` : "";
    lines.push(`  • [${layer}${status}] **${h.id}**${label}${score}`);
  }
  lines.push("");
  lines.push(`_Source: master-index search over system-viz graph + tribal index. Knob: \`PRISM_ACTIVATE_PRECHECK_DISABLE=1\` to silence. Hits are advisory only — \`duplication-hard-block.mjs\` runs next and will hard-block on exact-name match._`);
  return lines.join("\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: stdin reader (matches sibling-hook pattern)
// ─────────────────────────────────────────────────────────────────────────────

function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return "";
    return readFileSync(0, "utf-8");
  } catch {
    return "";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: clamped K
// ─────────────────────────────────────────────────────────────────────────────

export function clampedTopK() {
  const raw = Number(process.env.PRISM_ACTIVATE_PRECHECK_K);
  if (!Number.isFinite(raw) || raw <= 0) return 5;
  return Math.min(15, Math.max(1, Math.floor(raw)));
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: search-with-timeout (Promise race)
//
// The lib's `runMasterIndexSearch` is synchronous today, but with the sidecar
// shipped (U-MASTER-INDEX-SIDECAR) a cold load on the 105.6 MB sidecar is
// ~1.45 s. The hook's PreToolUse harness timeout is 2000 ms — we add an internal
// 1800 ms watchdog so the harness never sees a slow exit. On timeout we
// return [] (silent).
//
// Honest scope (R12 — Reviewer-B P1-3 from the per-file scrutiny gate): Node is
// single-threaded, so a timer cannot preempt a CPU-bound SYNCHRONOUS runSearch.
// The watchdog DOES work for an async runSearch (Promise-returning) — the timer
// fires while the search is awaiting I/O. The setImmediate wrapper plus the
// `await Promise.resolve(...)` auto-unwrap below give us correct behavior in
// BOTH cases: sync runs to completion uninterrupted; async can be raced. Today
// the lib is sync; the watchdog is correctness scaffolding for the day the lib
// adds an async/streaming variant.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {(q:string,opts:object)=>{tokens:string[],hits:Array}|Promise<{tokens:string[],hits:Array}>} runSearch
 * @param {string} query
 * @param {object} opts
 * @param {number} timeoutMs
 * @returns {Promise<Array>}
 */
export async function searchWithTimeout(runSearch, query, opts, timeoutMs) {
  return new Promise((resolve) => {
    let done = false;
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      resolve([]);
    }, timeoutMs);
    setImmediate(() => {
      if (done) return;
      // Promise.resolve() auto-unwraps a sync return AND awaits a Promise return,
      // so both lib variants race the timer correctly.
      Promise.resolve()
        .then(() => runSearch(query, opts))
        .then((out) => {
          if (done) return;
          done = true;
          clearTimeout(timer);
          resolve(Array.isArray(out?.hits) ? out.hits : []);
        })
        .catch(() => {
          if (done) return;
          done = true;
          clearTimeout(timer);
          resolve([]);
        });
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Pure: decide the hook output given inputs + a search-results array
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The pure decision core — injectable for tests. Returns the JSON payload the
 * hook would emit. Never throws (R12: callers also catch as a backstop).
 *
 * @param {{tool:string, input:{file_path?:string}}} payload
 * @param {(q:string)=>Promise<Array>} runSearchAsync   — pre-bound search fn
 * @returns {Promise<object>}
 */
export async function decide(payload, runSearchAsync) {
  // Disabled → silent no-op
  if (process.env.PRISM_ACTIVATE_PRECHECK_DISABLE === "1") {
    return { continue: true, suppressOutput: true };
  }
  const tool = payload?.tool;
  if (tool !== "Write" && tool !== "MultiEdit") {
    return { continue: true, suppressOutput: true };
  }
  const filePath = payload?.input?.file_path;
  if (typeof filePath !== "string" || !filePath) {
    return { continue: true, suppressOutput: true };
  }
  // Already exists → this is an edit, not a create → no precheck
  if (existsSync(filePath)) {
    return { continue: true, suppressOutput: true };
  }
  const classified = classifyPath(filePath);
  if (!classified) {
    return { continue: true, suppressOutput: true };
  }
  const query = buildQuery(classified.name);
  if (!query) {
    return { continue: true, suppressOutput: true };
  }
  let hits;
  try {
    hits = await runSearchAsync(query);
  } catch {
    return { continue: true, suppressOutput: true };
  }
  if (!Array.isArray(hits) || hits.length === 0) {
    return { continue: true, suppressOutput: true };
  }
  const block = renderBlock(classified.kind, classified.name, hits);
  if (!block) {
    return { continue: true, suppressOutput: true };
  }
  return {
    continue: true,
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      additionalContext: block,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CLI entry
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  let payload;
  try {
    const raw = readStdinSafe();
    if (!raw) {
      console.log(JSON.stringify({ continue: true, suppressOutput: true }));
      return;
    }
    payload = JSON.parse(raw);
  } catch {
    // Bad stdin → silent approve (advisory hook, never block on bad input)
    console.log(JSON.stringify({ continue: true, suppressOutput: true }));
    return;
  }

  // Bind the real search lib lazily — keeps the hook fast on the no-op fast-paths
  // (disabled / wrong-tool / wrong-path / exists). Only loaded when we will
  // actually search.
  const tool = payload?.tool;
  const filePath = payload?.input?.file_path;
  const willSearch = (tool === "Write" || tool === "MultiEdit")
    && typeof filePath === "string"
    && !existsSync(filePath)
    && !!classifyPath(filePath)
    && process.env.PRISM_ACTIVATE_PRECHECK_DISABLE !== "1";

  let runSearchAsync;
  if (willSearch) {
    try {
      const libPath = process.env.PRISM_ACTIVATE_PRECHECK_LIB_PATH
        || "H:/prism/scripts/lib/master-index-search-lib.mjs";
      const lib = await import(pathToFileURL(libPath).href);
      const topK = clampedTopK();
      runSearchAsync = (q) => searchWithTimeout(lib.runMasterIndexSearch, q, { topK }, 1800);
    } catch {
      // Lib load failure → silent (advisory hook). R12: this branch IS exercised
      // by the test suite via PRISM_ACTIVATE_PRECHECK_LIB_PATH=/nonexistent.
      console.log(JSON.stringify({ continue: true, suppressOutput: true }));
      return;
    }
  } else {
    // Will short-circuit before the search call; harmless stub
    runSearchAsync = async () => [];
  }

  const result = await decide(payload, runSearchAsync);
  console.log(JSON.stringify(result));
}

// Script guard — run main only when invoked directly, not when imported by tests
const _entryUrl = import.meta.url;
const _argvUrl = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (_entryUrl === _argvUrl) {
  main().catch(() => {
    // R12: even the outermost catch is a fail-safe silent approve — this hook
    // is ADVISORY; never crash the harness.
    console.log(JSON.stringify({ continue: true, suppressOutput: true }));
  });
}
