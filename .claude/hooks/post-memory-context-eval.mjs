#!/usr/bin/env node
// tier: T2
/**
 * post-memory-context-eval.mjs
 *
 * OBSIDIAN-INTELLIGENCE-MS3/D5/U-CONTEXT-EVAL-GATE — PostToolUse advisory.
 *
 * Fires AFTER a memory / context-retrieval dispatcher call returns. The
 * retrieved context is the tool RESULT, not a request parameter — so the
 * gate must run PostToolUse (the earlier PreToolUse variant could only see
 * the request and was an architecturally-wrong no-op; superseded
 * 2026-05-17 per the D5 per-file-scrutiny Arm-B P0-1 finding).
 *
 * It pulls the agent's `query` from `tool_input` and the retrieved-context
 * text from `tool_response` (MCP `content[].text` / `output` / `stdout` /
 * `content` / JSON-stringified fallback), scores coverage against the
 * golden set via ContextEvalEngine (loaded through tsx/esm/api) and, on a
 * WARN / FAIL verdict, injects a one-line `additionalContext` advisory
 * naming the missing tokens so the next turn knows the retrieved context
 * was thin BEFORE acting on it.
 *
 * ADVISORY ONLY — always returns `{continue:true}`. Operator-in-the-loop is
 * unconditional; a heuristic coverage score must never gate the agent (R12:
 * surface the gap, do not hide it, but do not block on it either). Any
 * internal failure degrades to a silent pass — the hook can never break a
 * tool call.
 *
 * Knobs:
 *   PRISM_CONTEXT_EVAL_DISABLE=1      — hard off
 *   PRISM_CONTEXT_EVAL_GOLDEN=<path>  — override golden path
 *   PRISM_CONTEXT_EVAL_MIN=<0..1>     — only advise below this coverage
 *
 * @milestone OBSIDIAN-INTELLIGENCE-MS3/D5/U-CONTEXT-EVAL-GATE
 */

import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PRISM_ROOT = resolve(__dirname, "..", "..");
const ENGINE_PATH = join(PRISM_ROOT, "mcp-server", "src", "engines", "ContextEvalEngine.ts");

const PASS = JSON.stringify({ continue: true });

function emitPass() {
  process.stdout.write(PASS);
  process.exit(0);
}

async function readStdin() {
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  return Buffer.concat(chunks).toString("utf8");
}

async function loadEngine() {
  const { createRequire } = await import("node:module");
  const { pathToFileURL } = await import("node:url");
  const req = createRequire(pathToFileURL(join(PRISM_ROOT, "mcp-server", "package.json")));
  const tsxApi = req.resolve("tsx/esm/api");
  const tsx = await import(pathToFileURL(tsxApi).href);
  return tsx.tsImport(pathToFileURL(ENGINE_PATH).href, import.meta.url);
}

/**
 * Coerce an MCP / generic tool result into a single context string.
 * Handles: { content:[{type:"text",text}] } (MCP), { output|stdout|content }
 * (generic), or a bare string. Anything else → JSON-stringified (bounded).
 */
function contextFromToolResponse(tr) {
  if (tr == null) return "";
  if (typeof tr === "string") return tr;
  // MCP content array.
  if (Array.isArray(tr.content)) {
    const parts = [];
    for (const c of tr.content) {
      if (typeof c === "string") parts.push(c);
      else if (c && typeof c.text === "string") parts.push(c.text);
    }
    if (parts.length) return parts.join("\n");
  }
  if (typeof tr.output === "string") return tr.output;
  if (typeof tr.stdout === "string") return tr.stdout;
  if (typeof tr.content === "string") return tr.content;
  if (typeof tr.text === "string") return tr.text;
  try {
    return JSON.stringify(tr).slice(0, 200_000);
  } catch {
    return "";
  }
}

/**
 * Pull a query (from the request) + retrieved-context-ish blob (from the
 * result) out of a PostToolUse payload. Conservative: only acts when there
 * is a non-trivial query AND some context-bearing text, so non-memory tool
 * calls are a fast no-op.
 */
function extractQueryAndContext(payload) {
  const ti = payload?.tool_input ?? payload?.toolInput ?? {};
  const tr = payload?.tool_response ?? payload?.toolResponse ?? payload?.tool_result ?? null;
  const query =
    (typeof ti.query === "string" && ti.query) ||
    (typeof ti.prompt === "string" && ti.prompt) ||
    (typeof ti.q === "string" && ti.q) ||
    (typeof ti.task === "string" && ti.task) ||
    "";
  // Prefer the retrieved context from the RESULT; fall back to a request-side
  // retrieved_context only if the result is empty (covers the
  // context_eval_score dispatcher action, which passes both as input).
  let ctx = contextFromToolResponse(tr);
  if (!ctx) {
    ctx =
      (typeof ti.retrieved_context === "string" && ti.retrieved_context) ||
      (typeof ti.retrievedContext === "string" && ti.retrievedContext) ||
      (typeof ti.context === "string" && ti.context) ||
      "";
  }
  return { query: query.trim(), ctx };
}

async function main() {
  if (process.env.PRISM_CONTEXT_EVAL_DISABLE === "1") emitPass();

  let payload;
  try {
    const raw = await readStdin();
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    emitPass(); // unparseable stdin → never break the tool call
  }

  const { query, ctx } = extractQueryAndContext(payload ?? {});
  // Conservative gate: need a real query AND a context payload to score.
  if (query.length < 4 || ctx.length < 16) emitPass();

  let engineMod;
  try {
    engineMod = await loadEngine();
  } catch {
    emitPass(); // engine load failure → silent pass (advisory only)
  }

  let result;
  try {
    const opts = {};
    if (process.env.PRISM_CONTEXT_EVAL_GOLDEN) opts.goldenPath = process.env.PRISM_CONTEXT_EVAL_GOLDEN;
    result = engineMod.runContextEval(query, ctx, opts);
  } catch {
    emitPass();
  }

  // Only advise on WARN / FAIL. PASS and NO_MATCH are silent (NO_MATCH means
  // the golden set has no opinion on this query — no signal, no noise).
  if (!result || (result.verdict !== "WARN" && result.verdict !== "FAIL")) emitPass();

  const minGate = Number(process.env.PRISM_CONTEXT_EVAL_MIN);
  if (Number.isFinite(minGate) && result.coverage >= minGate) emitPass();

  const miss = [
    ...result.missingTokens.slice(0, 6),
    ...result.missingFiles.slice(0, 3).map((f) => `file:${f}`),
  ].join(", ");
  const advisory =
    `⚠️ Retrieved-context coverage ${result.verdict} (${(result.coverage * 100).toFixed(0)}% vs ${(result.threshold * 100).toFixed(0)}% for golden "${result.matchedGoldenId}"). ` +
    `Missing: ${miss || "(see verdict)"}. This is advisory — the context just retrieved looks incomplete; verify before acting on it.`;

  process.stdout.write(JSON.stringify({
    continue: true,
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: advisory,
    },
  }));
  process.exit(0);
}

main().catch(() => {
  // Absolute backstop — a hook must NEVER break the tool call.
  try { process.stdout.write(PASS); } catch { /* swallow */ }
  process.exit(0);
});
