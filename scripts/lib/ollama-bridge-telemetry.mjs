/**
 * ollama-bridge-telemetry.mjs — per-call telemetry for ollama-prism-bridge
 * (OLLAMA-EXPAND-MS0/U-OE-BRIDGE-TELEMETRY).
 *
 * Load-bearing prerequisite for U-OE-BRIDGE-L2B: the L2b spec calls model
 * tool-selection accuracy "an unproven empirical risk". We cannot scale the
 * tool surface without first measuring how the existing 3-tool surface
 * performs. This module records every bridge tool-call to an append-only
 * JSONL ledger and exposes a pure summarizer so L2b can gate scope on real
 * measurement, not optimism.
 *
 * Design contract (pure-core + injected-impure-shell, matches the bridge):
 *   - `recordToolCallEvent(state, event)` is a pure builder — returns a frozen
 *     event object with normalized fields. No I/O.
 *   - `summarizeTelemetry(events, opts)` is pure — group + count.
 *   - `appendTelemetryEvent(event, opts)` is the only side-effectful entry.
 *     I/O deps (`appendImpl`, `now`, `ledgerPath`) are injected so the suite
 *     runs without touching disk. Fail-soft on disk error (R12 honest:
 *     telemetry is observability, not load-bearing for correctness — a write
 *     failure must NEVER crash the agent loop).
 *
 * Schema (one JSON object per line, schemaVersion="1.0.0"):
 *   {
 *     schemaVersion: "1.0.0",
 *     ts: "2026-05-18T13:00:00.000Z",
 *     model: "qwen2.5-coder:3b",
 *     tool: "viz_search" | "wiki_lookup" | "read_excerpt" | "(malformed)" | "(other)",
 *     outcome: "ok" | "error" | "malformed" | "unknown-tool",
 *     latencyMs: 42,         // null if not measured
 *     argsBytes: 17,          // byte size of JSON.stringify(args) — cardinality-free
 *     resultBytes: 1024,      // byte size of result string; 0 on error
 *     iteration: 3,           // 1-based agent-loop iteration that issued the call
 *     errorClass: "abort" | "timeout" | "unknown-tool" | "validation" | "exception" | null,
 *     runId: "uuidv4-or-hex",
 *   }
 *
 * Knob: PRISM_OBB_TELEMETRY_DISABLE=1 makes append a no-op (returns
 * {ok:true, written:false, reason:"disabled"}). Disable is a kill switch for
 * fleet-wide rollback per [[feedback_never_delete_only_disable]].
 */

import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, join, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..", "..");
export const SCHEMA_VERSION = "1.0.0";
export const DEFAULT_LEDGER_REL = join("state", "shared", "ollama-bridge-telemetry.jsonl");
/** Tool names from the L2 bridge — KEEP IN SYNC with TOOL_NAMES in
 *  scripts/ollama-prism-bridge.mjs. Used to bucket events; an event whose
 *  `tool` is outside this set is recorded under its literal name (no silent
 *  remapping — R12) so the analyst can spot new tools the moment L2b ships. */
export const KNOWN_TOOLS = Object.freeze(["viz_search", "wiki_lookup", "read_excerpt"]);
/** Maximum line length the ledger writer will emit (defensive bound on a
 *  pathological event payload). 4KB is two orders of magnitude above the
 *  typical event; well under the per-line jq/grep practical limit. */
export const MAX_EVENT_BYTES = 4096;
/** Error-class enum kept in sync with bridge call-sites. */
export const ERROR_CLASSES = Object.freeze([
  "abort",
  "timeout",
  "unknown-tool",
  "validation",
  "exception",
]);

/** True iff `disable` envvar is asserted (truthy "1"/"true"). Pure on env. */
export function telemetryDisabled(env = process.env) {
  const v = env && env.PRISM_OBB_TELEMETRY_DISABLE;
  if (v == null) return false;
  const s = String(v).trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes";
}

/**
 * Normalize a raw event into the schema-compliant ledger record. Pure.
 * Any field not understood is dropped; missing required fields are
 * surfaced as `null`/`"unknown"` rather than guessed — fail-loud (R12).
 */
export function recordToolCallEvent(raw, opts = {}) {
  const now = opts.now || (() => new Date());
  const ts = (raw && typeof raw.ts === "string" && raw.ts) || now().toISOString();
  const model = raw && typeof raw.model === "string" && raw.model.trim() ? raw.model.trim() : "unknown";
  const toolRaw = raw && typeof raw.tool === "string" ? raw.tool.trim() : "";
  const tool = toolRaw || "(malformed)";
  const outcomeRaw = raw && typeof raw.outcome === "string" ? raw.outcome.trim() : "";
  const outcome = outcomeRaw === "ok" || outcomeRaw === "error" || outcomeRaw === "malformed" || outcomeRaw === "unknown-tool"
    ? outcomeRaw
    : "error";
  const latencyRaw = raw && raw.latencyMs;
  const latencyMs = Number.isFinite(latencyRaw) && latencyRaw >= 0 ? Math.round(latencyRaw) : null;
  const argsBytes = raw && Number.isFinite(raw.argsBytes) && raw.argsBytes >= 0
    ? Math.round(raw.argsBytes)
    : (raw && raw.args != null ? Buffer.byteLength(JSON.stringify(raw.args), "utf8") : 0);
  const resultBytes = raw && Number.isFinite(raw.resultBytes) && raw.resultBytes >= 0
    ? Math.round(raw.resultBytes)
    : (raw && typeof raw.result === "string" ? Buffer.byteLength(raw.result, "utf8") : 0);
  const iteration = raw && Number.isFinite(raw.iteration) && raw.iteration >= 1
    ? Math.round(raw.iteration)
    : null;
  const errorClassRaw = raw && typeof raw.errorClass === "string" ? raw.errorClass.trim() : "";
  const errorClass = ERROR_CLASSES.includes(errorClassRaw) ? errorClassRaw : null;
  const runIdRaw = raw && typeof raw.runId === "string" ? raw.runId.trim() : "";
  const runId = runIdRaw || "unknown";
  return Object.freeze({
    schemaVersion: SCHEMA_VERSION,
    ts,
    model,
    tool,
    outcome,
    latencyMs,
    argsBytes,
    resultBytes,
    iteration,
    errorClass,
    runId,
  });
}

/** Serialize an event to a single JSONL line. Pure. Rejects oversized
 *  payloads (R12: caller sees the cap rather than silent truncation). */
export function eventToJsonLine(event) {
  const line = JSON.stringify(event);
  if (Buffer.byteLength(line, "utf8") > MAX_EVENT_BYTES) {
    return { ok: false, error: `event exceeds MAX_EVENT_BYTES=${MAX_EVENT_BYTES}` };
  }
  return { ok: true, line: line + "\n" };
}

/**
 * Append one event to the ledger. The ONLY side-effectful entry. Fail-soft:
 * a write failure logs+returns `{ok:false,error}` and NEVER throws so the
 * agent loop's correctness is not coupled to disk health. Disabled-by-env
 * short-circuits before any I/O.
 *
 * opts.appendImpl + opts.mkdirImpl let tests inject pure substitutes.
 * opts.ledgerPath overrides the default relative path (always under REPO_ROOT
 * unless the override is absolute — confined by resolve()).
 * opts.env exists so the disable knob is testable.
 */
export function appendTelemetryEvent(event, opts = {}) {
  const env = opts.env || process.env;
  if (telemetryDisabled(env)) {
    return { ok: true, written: false, reason: "disabled" };
  }
  const ledgerPath = pickLedgerPath(opts.ledgerPath);
  const ser = eventToJsonLine(event);
  if (!ser.ok) return { ok: false, written: false, error: ser.error };
  const appendImpl = opts.appendImpl || appendFileSync;
  const mkdirImpl = opts.mkdirImpl || mkdirSync;
  try {
    try {
      mkdirImpl(dirname(ledgerPath), { recursive: true });
    } catch (e) {
      if (!e || e.code !== "EEXIST") throw e;
    }
    appendImpl(ledgerPath, ser.line);
    return { ok: true, written: true, path: ledgerPath, bytes: Buffer.byteLength(ser.line, "utf8") };
  } catch (e) {
    return { ok: false, written: false, error: `telemetry append failed: ${e && e.message ? e.message : e}`, path: ledgerPath };
  }
}

/** Resolve a ledger path (relative → under REPO_ROOT). Pure. */
export function pickLedgerPath(override) {
  if (typeof override === "string" && override.trim()) {
    return isAbsolute(override) ? override : resolve(REPO_ROOT, override);
  }
  return resolve(REPO_ROOT, DEFAULT_LEDGER_REL);
}

/**
 * Summarize a list of events (in-memory). Pure — does NO I/O.
 * Returns:
 *   {
 *     total, byTool: { [tool]: count },
 *     byOutcome: { [outcome]: count },
 *     byErrorClass: { [class]: count },
 *     toolSuccessRate: { [tool]: 0..1 },
 *     latency: { count, min, max, mean, p50, p95 } | null
 *   }
 * `toolSuccessRate` is only computed for tools with ≥1 event (no false 0%s
 * for tools that were never called). Latency uses nearest-rank percentile.
 */
export function summarizeTelemetry(events) {
  if (!Array.isArray(events)) events = [];
  const out = {
    total: events.length,
    byTool: {},
    byOutcome: {},
    byErrorClass: {},
    toolSuccessRate: {},
    latency: null,
  };
  const okCountByTool = new Map();
  const totalByTool = new Map();
  const latencies = [];
  for (const ev of events) {
    if (!ev || typeof ev !== "object") continue;
    const tool = typeof ev.tool === "string" ? ev.tool : "(unknown)";
    const outcome = typeof ev.outcome === "string" ? ev.outcome : "error";
    out.byTool[tool] = (out.byTool[tool] || 0) + 1;
    out.byOutcome[outcome] = (out.byOutcome[outcome] || 0) + 1;
    if (ev.errorClass) {
      out.byErrorClass[ev.errorClass] = (out.byErrorClass[ev.errorClass] || 0) + 1;
    }
    totalByTool.set(tool, (totalByTool.get(tool) || 0) + 1);
    if (outcome === "ok") {
      okCountByTool.set(tool, (okCountByTool.get(tool) || 0) + 1);
    }
    if (Number.isFinite(ev.latencyMs) && ev.latencyMs >= 0) {
      latencies.push(ev.latencyMs);
    }
  }
  for (const [tool, total] of totalByTool) {
    out.toolSuccessRate[tool] = (okCountByTool.get(tool) || 0) / total;
  }
  if (latencies.length) {
    latencies.sort((a, b) => a - b);
    const sum = latencies.reduce((a, b) => a + b, 0);
    out.latency = {
      count: latencies.length,
      min: latencies[0],
      max: latencies[latencies.length - 1],
      mean: sum / latencies.length,
      p50: percentile(latencies, 0.5),
      p95: percentile(latencies, 0.95),
    };
  }
  return out;
}

/** Nearest-rank percentile of a sorted-ascending list. Pure. */
export function percentile(sorted, p) {
  if (!Array.isArray(sorted) || !sorted.length) return null;
  if (!(p > 0 && p <= 1)) return null;
  const rank = Math.ceil(p * sorted.length);
  return sorted[Math.min(Math.max(rank - 1, 0), sorted.length - 1)];
}
