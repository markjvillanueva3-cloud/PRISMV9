// WIRED: prism_pp:pp_outcome_emit (ppDispatcher) -> recordEmission. INDIA-AI-ORPHAN-WIRE (bravo,
// 2026-06-11): the prior "// WIRE-EXEMPT: called by PPG engines internally" marker was FALSE -- a grep
// of mcp-server/src found ZERO real callers (the only hit was a doc reference in wiring/PATHS.md), so
// the post->india OutcomeCaptureBus emit side was dark and the closed loop was OPEN. Now reachable.
/**
 * PPGOutcomeCaptureWireEngine — U-PPG-SFC-02
 * ===========================================
 *
 * Thin instrumentation layer that routes every PPG (Post Processor Generator)
 * recommendation through the U-LEARN-01 OutcomeCaptureBus so the learning
 * loop can correlate emitted G-code outputs with later operator edits,
 * machine-alarm events, cycle-time deltas, and run-log actuals.
 *
 * Design invariants (mirroring OutcomeCaptureBus):
 *   1. NEVER BLOCK THE CALLER. Every method returns a result object.
 *   2. NEVER THROW. The bus contract is best-effort append.
 *   3. AUTO-LINEAGE. Caller may pass lineageId; if absent the bus generates one.
 *   4. SUMMARIZE OPAQUE RESULTS. Extracts canonical subset for stable query surface.
 *   5. JSON-SAFE GUARD. Circular refs, BigInt, functions stripped before delegation.
 *
 * @module engines/PPGOutcomeCaptureWireEngine
 * @milestone PSAU-PPG-SFC U-PPG-SFC-02
 */

import {
  outcomeCaptureBusEngine,
  OutcomeCaptureBusEngine,
  type RecordOutcomeResult,
} from "./OutcomeCaptureBusEngine.js";

/**
 * Canonical subset of PPG output fields for downstream query surface.
 */
export interface PPGRecommendationSummary {
  block_count?: number;
  tool_changes?: number;
  controller?: string;
  dialect?: string;
  modal_state?: string;
  has_subprograms?: boolean;
  axis_count?: number;
  cycle_estimate_sec?: number;
  format?: string;
  machine_id?: string;
}

export interface PPGEmissionContext {
  customer?: string;
  part_number?: string;
  program?: string;
  machine_id?: string;
  material?: string;
  tool_id?: string;
  operation?: string;
  cam_system?: string;
  nci_file?: string;
}

export interface PPGEmissionInput {
  engine: string;
  action?: string;
  context?: PPGEmissionContext;
  recommended: unknown;
  lineageId?: string;
  agentId?: string;
  confidence?: number;
}

export interface PPGEmissionResult {
  ok: boolean;
  lineage_id: string;
  event_id: string;
  warning?: string;
  summary: PPGRecommendationSummary;
}

/**
 * Walks a PPG output object and extracts canonical summary subset.
 * If input is a raw G-code string, analyzes the content.
 */
export function summarizePPGRecommendation(
  recommended: unknown,
): PPGRecommendationSummary {
  const out: PPGRecommendationSummary = {};

  if (typeof recommended === "string") {
    return summarizeGcodeString(recommended);
  }

  if (recommended === null || typeof recommended !== "object") {
    return out;
  }

  const rec = recommended as Record<string, unknown>;

  // Extract numeric fields
  const blockCount = unwrapNumber(rec.block_count) ?? unwrapNumber(rec.blockCount) ?? unwrapNumber(rec.lineCount) ?? unwrapNumber(rec.line_count);
  if (blockCount !== undefined) out.block_count = blockCount;

  const toolChanges = unwrapNumber(rec.tool_changes) ?? unwrapNumber(rec.toolChanges) ?? unwrapNumber(rec.toolChangeCount);
  if (toolChanges !== undefined) out.tool_changes = toolChanges;

  const axisCount = unwrapNumber(rec.axis_count) ?? unwrapNumber(rec.axisCount) ?? unwrapNumber(rec.axes);
  if (axisCount !== undefined) out.axis_count = axisCount;

  const cycleEst = unwrapNumber(rec.cycle_estimate_sec) ?? unwrapNumber(rec.cycleTime) ?? unwrapNumber(rec.estimatedCycleTime);
  if (cycleEst !== undefined) out.cycle_estimate_sec = cycleEst;

  // Extract string fields
  const controller = unwrapString(rec.controller);
  if (controller !== undefined) out.controller = controller;

  const dialect = unwrapString(rec.dialect);
  if (dialect !== undefined) out.dialect = dialect;

  const modalState = unwrapString(rec.modal_state);
  if (modalState !== undefined) out.modal_state = modalState;

  const format = unwrapString(rec.format);
  if (format !== undefined) out.format = format;

  const machineId = unwrapString(rec.machine_id);
  if (machineId !== undefined) out.machine_id = machineId;

  // Boolean field
  if (typeof rec.has_subprograms === "boolean") {
    out.has_subprograms = rec.has_subprograms;
  } else if (typeof rec.hasSubprograms === "boolean") {
    out.has_subprograms = rec.hasSubprograms;
  }

  // If we have a gcode/output string nested in the result, analyze it
  const gcodeStr = rec.gcode ?? rec.output ?? rec.nc ?? rec.program;
  if (typeof gcodeStr === "string" && gcodeStr.length > 0) {
    const gcSummary = summarizeGcodeString(gcodeStr);
    if (out.block_count === undefined && gcSummary.block_count !== undefined) {
      out.block_count = gcSummary.block_count;
    }
    if (out.tool_changes === undefined && gcSummary.tool_changes !== undefined) {
      out.tool_changes = gcSummary.tool_changes;
    }
    if (out.has_subprograms === undefined && gcSummary.has_subprograms !== undefined) {
      out.has_subprograms = gcSummary.has_subprograms;
    }
    if (out.modal_state === undefined && gcSummary.modal_state !== undefined) {
      out.modal_state = gcSummary.modal_state;
    }
  }

  return out;
}

function summarizeGcodeString(gcode: string): PPGRecommendationSummary {
  const out: PPGRecommendationSummary = {};
  const lines = gcode.split(/\r?\n/).filter((l) => l.trim().length > 0);

  out.block_count = lines.length;

  const toolChangePattern = /\bT\d+|M0?6\b/gi;
  const toolMatches = gcode.match(toolChangePattern);
  if (toolMatches) {
    const tCodes = new Set(
      toolMatches
        .filter((m) => m.toUpperCase().startsWith("T"))
        .map((m) => m.toUpperCase()),
    );
    out.tool_changes = tCodes.size;
  }

  const subprogramPattern = /\bM9[89]\b|CALL\s|O\d{4}/i;
  out.has_subprograms = subprogramPattern.test(gcode);

  const modalCodes: string[] = [];
  const lastLines = lines.slice(-20).join(" ");
  if (/G90\b/.test(lastLines)) modalCodes.push("G90");
  else if (/G91\b/.test(lastLines)) modalCodes.push("G91");
  if (/G20\b/.test(lastLines)) modalCodes.push("G20");
  else if (/G21\b/.test(lastLines)) modalCodes.push("G21");
  if (modalCodes.length > 0) {
    out.modal_state = modalCodes.join(" ");
  }

  return out;
}

function unwrapNumber(raw: unknown): number | undefined {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (raw && typeof raw === "object" && "value" in raw) {
    const v = (raw as { value: unknown }).value;
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  return undefined;
}

function unwrapString(raw: unknown): string | undefined {
  if (typeof raw === "string" && raw.length > 0) return raw;
  if (raw && typeof raw === "object" && "value" in raw) {
    const v = (raw as { value: unknown }).value;
    if (typeof v === "string" && v.length > 0) return v;
  }
  return undefined;
}

function jsonSafe(input: unknown, depth = 0): unknown {
  if (depth > 8) return "[max-depth]";
  if (input === null || input === undefined) return input;
  const t = typeof input;
  if (t === "number") return Number.isFinite(input as number) ? input : null;
  if (t === "string") {
    const s = input as string;
    if (s.length > 50_000) {
      return s.slice(0, 50_000) + "\n... [truncated, " + s.length + " chars total]";
    }
    return s;
  }
  if (t === "boolean") return input;
  if (t === "function" || t === "symbol" || t === "bigint") return undefined;
  if (Array.isArray(input)) {
    return input.map((v) => jsonSafe(v, depth + 1));
  }
  if (t === "object") {
    const seen = new WeakSet<object>();
    return cloneSafe(input as object, depth, seen);
  }
  return undefined;
}

function cloneSafe(
  obj: object,
  depth: number,
  seen: WeakSet<object>,
): Record<string, unknown> | string {
  if (seen.has(obj)) return "[circular]";
  seen.add(obj);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === "function" || typeof v === "symbol" || typeof v === "bigint")
      continue;
    if (v && typeof v === "object") {
      if (seen.has(v)) {
        out[k] = "[circular]";
        continue;
      }
      out[k] = jsonSafe(v, depth + 1);
    } else if (typeof v === "number" && !Number.isFinite(v)) {
      out[k] = null;
    } else if (typeof v === "string" && v.length > 50_000) {
      out[k] = v.slice(0, 50_000) + "\n... [truncated]";
    } else {
      out[k] = v;
    }
  }
  return out;
}

/**
 * PPGOutcomeCaptureWireEngine — singleton wire from PPG engines to the
 * OutcomeCaptureBus. Engines call `recordEmission(...)` once per public
 * G-code generation entry point.
 */
export class PPGOutcomeCaptureWireEngine {
  private readonly bus: OutcomeCaptureBusEngine;

  constructor(bus: OutcomeCaptureBusEngine = outcomeCaptureBusEngine) {
    this.bus = bus;
  }

  recordEmission(input: PPGEmissionInput): PPGEmissionResult {
    const summary = summarizePPGRecommendation(input.recommended);
    const safeRecommended = jsonSafe(input.recommended);

    const ctx: Record<string, unknown> = {
      ...(input.context ?? {}),
      engine: input.engine,
    };
    if (input.action) ctx.action = input.action;

    const busResult: RecordOutcomeResult = this.bus.record({
      domain: "post_processor",
      kind: "recommendation_emitted",
      source: "system",
      lineage_id: input.lineageId,
      agent_id: input.agentId,
      context: ctx,
      recommended: { summary, raw: safeRecommended },
      confidence: input.confidence,
    });

    return {
      ok: busResult.ok,
      lineage_id: busResult.lineage_id,
      event_id: busResult.event_id,
      warning: busResult.warning,
      summary,
    };
  }
}

export const ppgOutcomeCaptureWireEngine = new PPGOutcomeCaptureWireEngine();
