// WIRE-EXEMPT: U-CAD-APP add-in bridge -- constructor requires an injected CreoTransport (Creo Toolkit/J-Link daemon in prod, stub in tests); no singleton, not lazy-loadable as a prism_* dispatcher action. Driven by the Creo add-in host (delta/CAD), not a standalone capability.
/**
 * CreoToolkitBridgeEngine — U-CAD-APP-01 (PHASE-48)
 *
 * Provides a live bridge between PRISM and Creo Parametric via the Creo
 * Toolkit + J-Link protocol. All transport is injected — `CreoTransport`
 * is satisfied by a subprocess launching `ptcsetup; pro_toolkit_daemon` in
 * production, or by an in-memory stub in tests.
 *
 * Capabilities:
 *   - Read model parameters and feature tree
 *   - Set parameters with unit-aware conversion (mm ↔ in, kg ↔ lb, etc.)
 *   - Regenerate + track regenCount
 *   - Suppress / resume features by name
 *   - Save model
 *
 * Every call is logged to an audit trail and measured for latency, so the
 * add-in side can show real-time SLO health to the operator.
 *
 * @module engines/CreoToolkitBridgeEngine
 */

import {
  CreoModelSchema,
  CreoParameterSchema,
  CreoResponseSchema,
  type CreoModel,
  type CreoParameter,
  type CreoFeature,
  type CreoCommand,
  type CreoResponse,
  type CreoDimensionUnit,
} from "../schemas/cadCreoToolkitSchema.js";

export interface CreoClock {
  now(): string;
  monotonicMs(): number;
}

export interface CreoTransport {
  /**
   * Send a command to the Creo daemon and return its reply. The implementer
   * is responsible for JSON framing + daemon process management.
   */
  send(cmd: CreoCommand, args: Record<string, unknown>): CreoResponse;
}

export interface CreoCallLogEntry {
  command: CreoCommand;
  args: Record<string, unknown>;
  ok: boolean;
  error?: string;
  durationMs: number;
  at: string;
}

export class CreoToolkitBridgeEngine {
  private transport: CreoTransport;
  private clock: CreoClock;
  private log: CreoCallLogEntry[] = [];

  constructor(opts: { transport: CreoTransport; clock?: CreoClock }) {
    this.transport = opts.transport;
    this.clock = opts.clock ?? defaultClock();
  }

  // ── Commands ──────────────────────────────────────────────────────────────

  readModel(modelName: string): CreoModel {
    const res = this.run("read_model", { modelName });
    this.throwIfFailed(res);
    return CreoModelSchema.parse(res.result);
  }

  listModels(): string[] {
    const res = this.run("list_models", {});
    this.throwIfFailed(res);
    const arr = res.result as unknown;
    if (!Array.isArray(arr)) throw new Error("list_models expected array");
    return arr.map((x) => String(x));
  }

  /**
   * Set a parameter. If the incoming parameter unit differs from the model's
   * stored parameter unit, the value is converted first.
   */
  setParameter(
    modelName: string,
    name: string,
    value: number | string | boolean,
    opts: { unit?: CreoDimensionUnit; currentModel?: CreoModel } = {},
  ): CreoModel {
    const model = opts.currentModel ?? this.readModel(modelName);
    const existing = model.parameters.find((p) => p.name === name);
    let finalValue: number | string | boolean = value;
    let finalUnit: CreoDimensionUnit = opts.unit ?? existing?.unit ?? "none";
    if (
      existing &&
      typeof value === "number" &&
      opts.unit &&
      opts.unit !== existing.unit
    ) {
      finalValue = convert(value, opts.unit, existing.unit);
      finalUnit = existing.unit;
    }
    const parsed = CreoParameterSchema.parse({
      name,
      type: existing?.type ?? (typeof value === "number" ? "real" : typeof value === "boolean" ? "boolean" : "string"),
      value: finalValue,
      unit: finalUnit,
      designation: existing?.designation,
      description: existing?.description,
    });
    const res = this.run("set_parameter", {
      modelName,
      parameter: parsed,
    });
    this.throwIfFailed(res);
    return CreoModelSchema.parse(res.result);
  }

  regenerate(modelName: string): CreoModel {
    const res = this.run("regenerate", { modelName });
    this.throwIfFailed(res);
    return CreoModelSchema.parse(res.result);
  }

  suppressFeature(modelName: string, featureName: string): CreoModel {
    const res = this.run("suppress_feature", { modelName, featureName });
    this.throwIfFailed(res);
    return CreoModelSchema.parse(res.result);
  }

  resumeFeature(modelName: string, featureName: string): CreoModel {
    const res = this.run("resume_feature", { modelName, featureName });
    this.throwIfFailed(res);
    return CreoModelSchema.parse(res.result);
  }

  save(modelName: string): void {
    const res = this.run("save", { modelName });
    this.throwIfFailed(res);
  }

  /** Read-only view into the feature tree ordered by sequence. */
  featureTree(modelName: string): CreoFeature[] {
    const m = this.readModel(modelName);
    return [...m.features].sort((a, b) => a.sequence - b.sequence);
  }

  // ── Audit / telemetry ─────────────────────────────────────────────────────

  callLog(): CreoCallLogEntry[] {
    return [...this.log];
  }

  clearCallLog(): void {
    this.log = [];
  }

  /**
   * p95 round-trip latency across the call log. Useful for the ribbon SLO
   * widget. Returns null if fewer than 3 calls are recorded.
   */
  p95Latency(): number | null {
    if (this.log.length < 3) return null;
    const sorted = [...this.log.map((e) => e.durationMs)].sort((a, b) => a - b);
    const idx = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1);
    return sorted[Math.max(0, idx)];
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  private run(cmd: CreoCommand, args: Record<string, unknown>): CreoResponse {
    const t0 = this.clock.monotonicMs();
    let response: CreoResponse;
    try {
      response = CreoResponseSchema.parse(this.transport.send(cmd, args));
    } catch (err) {
      response = CreoResponseSchema.parse({
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
    const durationMs = this.clock.monotonicMs() - t0;
    this.log.push({
      command: cmd,
      args,
      ok: response.ok,
      error: response.error,
      durationMs,
      at: this.clock.now(),
    });
    return response;
  }

  private throwIfFailed(res: CreoResponse): void {
    if (!res.ok) throw new Error(`Creo transport error: ${res.error ?? "unknown"}`);
  }
}

// ── Unit conversions ────────────────────────────────────────────────────────

const TO_SI: Partial<Record<CreoDimensionUnit, number>> = {
  mm: 1e-3,
  cm: 1e-2,
  m: 1,
  in: 0.0254,
  ft: 0.3048,
  deg: Math.PI / 180,
  rad: 1,
  kg: 1,
  lb: 0.45359237,
  N: 1,
  lbf: 4.4482216,
  s: 1,
};

function convert(
  value: number,
  from: CreoDimensionUnit,
  to: CreoDimensionUnit,
): number {
  if (from === to) return value;
  if (from === "none" || to === "none") return value;
  const fromSi = TO_SI[from];
  const toSi = TO_SI[to];
  if (fromSi === undefined || toSi === undefined) {
    throw new Error(`Cannot convert ${from} → ${to}`);
  }
  return (value * fromSi) / toSi;
}

function defaultClock(): CreoClock {
  return {
    now: () => new Date().toISOString(),
    monotonicMs: () => Date.now(),
  };
}
