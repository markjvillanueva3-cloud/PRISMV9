/**
 * ActionTraceEngine.ts — append-only agent-write trace log + query API.
 *
 * OBSIDIAN-INTELLIGENCE-MS3 / U-ACTION-TRACES (D4).
 *
 * Every agent write (memory mirror, wiki write, file Edit/Write) can be
 * recorded as a single graph edge:
 *
 *   { ts, agent, sessionId, promptHash, tool, target, action }
 *
 * The log is an APPEND-ONLY JSONL at `state/shared/action-traces.jsonl`.
 * Append-only is the load-bearing invariant: `recordTrace` only ever
 * `appendFileSync`s a single newline-terminated line; the file is never
 * rewritten, truncated, or sorted. Rollback per the unit spec is simply
 * "stop calling recordTrace — the existing JSONL stays as the historical
 * record". `queryTraces` is read-only.
 *
 * Path resolution is done PER CALL (not at module load) so that the
 * `PRISM_ACTION_TRACE_FILE` env override is honoured by tests that set it
 * after import — the hermetic-temp-file pattern used across PRISM.
 *
 * Wiring: queryable via `prism_session:action_trace_query` (D4 dispatcher
 * deliverable). The `recordTrace` write-path is the engine API consumed by
 * a future PostToolUse trace hook (natural follow-up — NOT in D4 scope; the
 * engine is genuinely wired via the query action so this is not an orphan).
 *
 * Concurrency: `fs.appendFileSync` of one short line is a single write
 * syscall — adequate for single-host trace volume across the ≤12-chat
 * fleet (POSIX/Win append semantics keep lines intact at this size). A
 * cross-host shared-volume scenario would need an advisory lock; out of
 * scope for D4 (single-host fleet) and noted here for the follow-up.
 *
 * @module engines/ActionTraceEngine
 * @milestone OBSIDIAN-INTELLIGENCE-MS3/D4
 */

import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { PATHS } from "../constants.js";

export const ACTION_TRACE_SCHEMA_VERSION = "1.0.0";
export const ACTION_TRACE_ENGINE_VERSION = "1.0.0";

/**
 * The canonical action-trace edge. `.strict()` so a caller that fat-fingers
 * an extra key fails loud (Karpathy R12) rather than silently logging junk
 * that the overlay later can't interpret.
 */
export const ActionTraceEdgeSchema = z
  .object({
    ts: z
      .string()
      .min(1)
      .describe("ISO-8601 timestamp of the write (defaulted to now if omitted)"),
    agent: z
      .string()
      .min(1)
      .describe("chat/agent id, e.g. claude-c0f06dee"),
    sessionId: z
      .string()
      .min(1)
      .describe("stable session id the write happened under"),
    promptHash: z
      .string()
      .min(1)
      .describe("sha256(prompt) hex prefix — links a write to its driving prompt"),
    tool: z
      .string()
      .min(1)
      .describe("tool name: Write | Edit | MultiEdit | memory-mirror | ..."),
    target: z
      .string()
      .min(1)
      .describe("file path or memory key that was written"),
    action: z
      .string()
      .min(1)
      .describe("semantic action label, e.g. memory_save | engine_edit"),
  })
  .strict();

export type ActionTraceEdge = z.infer<typeof ActionTraceEdgeSchema>;

/** Input to recordTrace — `ts` optional (defaults to now). */
export type ActionTraceInput = Omit<ActionTraceEdge, "ts"> & { ts?: string };

export interface ActionTraceQuery {
  /** Filter by exact agent id. */
  agent?: string;
  /** Filter by exact target. */
  target?: string;
  /** Filter by exact tool. */
  tool?: string;
  /** Filter by exact sessionId. */
  sessionId?: string;
  /** Filter by exact action label. */
  action?: string;
  /** Only edges with ts >= sinceTs (string compare — ISO-8601 sorts lexically). */
  sinceTs?: string;
  /** Cap the number of returned edges (default 1000). Applied AFTER filtering. */
  limit?: number;
  /** "asc" (file/chronological order, default) or "desc" (most-recent first). */
  order?: "asc" | "desc";
}

export interface ActionTraceQueryResult {
  /** Total well-formed edges in the log (pre-filter). */
  total: number;
  /** Count of corrupt/unparseable JSONL lines that were skipped. */
  skipped: number;
  /** Edges matching the filters, capped at `limit`. */
  edges: ActionTraceEdge[];
  /** Count after filtering, before the `limit` cap (lets callers detect truncation). */
  matched: number;
  /** Absolute path of the log that was read. */
  file: string;
}

/**
 * Resolve the trace log path. `PRISM_ACTION_TRACE_FILE` wins so tests get a
 * hermetic temp file; default is `<state>/shared/action-traces.jsonl`.
 * Read per-call so an env set after import still takes effect.
 */
function traceFilePath(env: NodeJS.ProcessEnv = process.env): string {
  const override = env.PRISM_ACTION_TRACE_FILE;
  if (override && override.trim()) return override.trim();
  return path.join(PATHS.STATE_DIR, "shared", "action-traces.jsonl");
}

/**
 * sha256 hex prefix of a prompt string. 16 hex chars (64 bits) — collision-
 * safe for linking a write to its driving prompt at fleet volume, short
 * enough to keep JSONL lines compact.
 */
export function hashPrompt(prompt: string): string {
  return crypto
    .createHash("sha256")
    .update(String(prompt), "utf8")
    .digest("hex")
    .slice(0, 16);
}

/**
 * Append one trace edge. Validates against ActionTraceEdgeSchema FIRST
 * (fail-loud on a malformed edge — never write junk the overlay can't
 * read), then appends exactly one newline-terminated JSON line. Creates
 * the parent directory + file on first write. Returns the validated edge.
 */
export function recordTrace(
  input: ActionTraceInput,
  env: NodeJS.ProcessEnv = process.env,
): ActionTraceEdge {
  // Normalize ts to canonical UTC `Z` ISO-8601 BEFORE validation. This makes
  // the `sinceTs` lexical-compare invariant in queryTraces true BY
  // CONSTRUCTION — a caller passing an offset timestamp (`...-05:00`) or a
  // bare epoch would otherwise sort wrong under string `<`. An unparseable
  // `ts` throws RangeError here (still fail-loud, Karpathy R12).
  let normalizedTs: string;
  if (input.ts === undefined) {
    normalizedTs = new Date().toISOString();
  } else {
    const d = new Date(input.ts);
    if (Number.isNaN(d.getTime())) {
      throw new Error(
        `ActionTraceEngine.recordTrace: unparseable ts ${JSON.stringify(input.ts)}`,
      );
    }
    normalizedTs = d.toISOString();
  }
  const edge: ActionTraceEdge = ActionTraceEdgeSchema.parse({
    ts: normalizedTs,
    agent: input.agent,
    sessionId: input.sessionId,
    promptHash: input.promptHash,
    tool: input.tool,
    target: input.target,
    action: input.action,
  });
  const file = traceFilePath(env);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, JSON.stringify(edge) + "\n", "utf8");
  return edge;
}

/**
 * Read the append-only log and return edges matching `q`. Read-only.
 * Corrupt lines are skipped (counted in `skipped`) rather than aborting —
 * a single bad line must not blind the whole timeline. A missing file is
 * an empty result, not an error (the log is created lazily on first write).
 */
export function queryTraces(
  q: ActionTraceQuery = {},
  env: NodeJS.ProcessEnv = process.env,
): ActionTraceQueryResult {
  const file = traceFilePath(env);
  if (!fs.existsSync(file)) {
    return { total: 0, skipped: 0, edges: [], matched: 0, file };
  }
  const raw = fs.readFileSync(file, "utf8");
  const lines = raw.split("\n");
  const all: ActionTraceEdge[] = [];
  let skipped = 0;
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(t);
    } catch {
      skipped++;
      continue;
    }
    const res = ActionTraceEdgeSchema.safeParse(parsed);
    if (!res.success) {
      skipped++;
      continue;
    }
    all.push(res.data);
  }

  // The dispatcher gates `limit` through a Zod `.int().positive()` schema, so
  // via that path this guard never fires. But the engine is ALSO called
  // directly (the vitest suite + a future PostToolUse trace hook) with NO
  // schema in front of it — there the guard is load-bearing: a 0 / negative /
  // NaN / Infinity `limit` falls back to a sane 1000 instead of slicing to
  // an absurd or empty window. Defensive on purpose, not dead code.
  const limit =
    Number.isFinite(q.limit) && (q.limit as number) > 0
      ? Math.floor(q.limit as number)
      : 1000;

  let matchedEdges = all.filter((e) => {
    if (q.agent !== undefined && e.agent !== q.agent) return false;
    if (q.target !== undefined && e.target !== q.target) return false;
    if (q.tool !== undefined && e.tool !== q.tool) return false;
    if (q.sessionId !== undefined && e.sessionId !== q.sessionId) return false;
    if (q.action !== undefined && e.action !== q.action) return false;
    if (q.sinceTs !== undefined && e.ts < q.sinceTs) return false;
    return true;
  });

  const matched = matchedEdges.length;
  if (q.order === "desc") matchedEdges = matchedEdges.slice().reverse();
  const edges = matchedEdges.slice(0, limit);

  return { total: all.length, skipped, edges, matched, file };
}

/**
 * Singleton accessor — matches the catalog convention for direct API use
 * from skills + hooks + the sessionDispatcher.
 */
export const actionTraceEngine = Object.freeze({
  version: ACTION_TRACE_ENGINE_VERSION,
  schemaVersion: ACTION_TRACE_SCHEMA_VERSION,
  hashPrompt,
  recordTrace,
  queryTraces,
});
