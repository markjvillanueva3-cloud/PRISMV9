// WIRE-EXEMPT: U-CAD-APP add-in bridge -- injected CatiaTransport, no singleton; referenced by CATIAAddinPluginEngine (shares its transport; CATIA CAA V5 add-in host), not a standalone prism_* dispatcher action.
/**
 * CATIACAAV5BridgeEngine — U-CAD-APP-04 (PHASE-48)
 *
 * Live bridge between PRISM and Dassault CATIA V5/V6 via the CAA (Component
 * Application Architecture) V5 automation surface plus EKL (Engineering
 * Knowledge Language) scripting. All transport is injected — `CatiaTransport`
 * is typically backed by a CAA-hosted TCP daemon in production or an
 * in-memory stub in tests.
 *
 * Capabilities:
 *   - Read / list CATPart / CATProduct / CATDrawing models
 *   - Update parameters with unit-aware conversion (mm ↔ in, kg ↔ lb, etc.)
 *   - Trigger the CATIA Update (regenerate) cycle
 *   - Deactivate / activate specification-tree features
 *   - Run EKL rules / checks / reactions and capture verdicts + messages
 *   - Advance PLM state (in_work → frozen → released → obsolete) — one-way
 *   - Save model
 *
 * Every call is logged with round-trip latency so the CATIA add-in can
 * surface SLO health and EKL check verdicts in its dockable panel.
 *
 * @module engines/CATIACAAV5BridgeEngine
 */

import {
  CatiaModelSchema,
  CatiaParameterSchema,
  CatiaResponseSchema,
  CATIA_PLM_STATES,
  type CatiaModel,
  type CatiaParameter,
  type CatiaFeature,
  type CatiaEklRelation,
  type CatiaCommand,
  type CatiaResponse,
  type CatiaDimensionUnit,
  type CatiaPlmState,
} from "../schemas/cadCatiaCaaV5Schema.js";

export interface CatiaClock {
  now(): string;
  monotonicMs(): number;
}

export interface CatiaTransport {
  /**
   * Send a command to the CATIA CAA V5 daemon and return its reply. The
   * implementer is responsible for framing, process management, and (in
   * production) wrapping CAA interactive errors into `{ ok: false }`.
   */
  send(cmd: CatiaCommand, args: Record<string, unknown>): CatiaResponse;
}

export interface CatiaCallLogEntry {
  command: CatiaCommand;
  args: Record<string, unknown>;
  ok: boolean;
  error?: string;
  durationMs: number;
  at: string;
}

/** Legal PLM state transitions — CATIA PLM lifecycle is one-way. */
const PLM_ORDER: readonly CatiaPlmState[] = CATIA_PLM_STATES;

export class CATIACAAV5BridgeEngine {
  private transport: CatiaTransport;
  private clock: CatiaClock;
  private log: CatiaCallLogEntry[] = [];

  constructor(opts: { transport: CatiaTransport; clock?: CatiaClock }) {
    this.transport = opts.transport;
    this.clock = opts.clock ?? defaultClock();
  }

  // ── Commands ──────────────────────────────────────────────────────────────

  readModel(modelName: string): CatiaModel {
    const res = this.run("read_model", { modelName });
    this.throwIfFailed(res);
    return CatiaModelSchema.parse(res.result);
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
   * stored parameter unit, the value is converted first (mm↔in, kg↔lb, …).
   */
  setParameter(
    modelName: string,
    name: string,
    value: number | string | boolean,
    opts: { unit?: CatiaDimensionUnit; currentModel?: CatiaModel } = {},
  ): CatiaModel {
    const model = opts.currentModel ?? this.readModel(modelName);
    const existing = model.parameters.find((p) => p.name === name);
    let finalValue: number | string | boolean = value;
    let finalUnit: CatiaDimensionUnit = opts.unit ?? existing?.unit ?? "none";
    if (
      existing &&
      typeof value === "number" &&
      opts.unit &&
      opts.unit !== existing.unit
    ) {
      finalValue = convert(value, opts.unit, existing.unit);
      finalUnit = existing.unit;
    }
    const parsed = CatiaParameterSchema.parse({
      name,
      type:
        existing?.type ??
        (typeof value === "number"
          ? "Real"
          : typeof value === "boolean"
          ? "Boolean"
          : "String"),
      value: finalValue,
      unit: finalUnit,
      formula: existing?.formula,
      isPublished: existing?.isPublished ?? false,
      description: existing?.description,
    });
    const res = this.run("set_parameter", {
      modelName,
      parameter: parsed,
    });
    this.throwIfFailed(res);
    return CatiaModelSchema.parse(res.result);
  }

  /** Trigger the CATIA Update cycle — increments updateCount on success. */
  updateModel(modelName: string): CatiaModel {
    const res = this.run("update_model", { modelName });
    this.throwIfFailed(res);
    return CatiaModelSchema.parse(res.result);
  }

  deactivateFeature(modelName: string, featureName: string): CatiaModel {
    const res = this.run("deactivate_feature", { modelName, featureName });
    this.throwIfFailed(res);
    return CatiaModelSchema.parse(res.result);
  }

  activateFeature(modelName: string, featureName: string): CatiaModel {
    const res = this.run("activate_feature", { modelName, featureName });
    this.throwIfFailed(res);
    return CatiaModelSchema.parse(res.result);
  }

  /**
   * Run a stored EKL relation (rule / check / reaction / law) by name and
   * return its updated definition. For `check` relations, `lastVerdict` is
   * set to true/false. For `rule`, `lastVerdict` remains null.
   */
  runEklRelation(modelName: string, relationName: string): CatiaEklRelation {
    const res = this.run("run_ekl_relation", { modelName, relationName });
    this.throwIfFailed(res);
    const rel = CatiaModelSchema.pick({ relations: true })
      .extend({ relations: CatiaModelSchema.shape.relations })
      .parse({ relations: [res.result] }).relations[0];
    return rel;
  }

  /**
   * Advance the model's PLM state. Transitions are one-way:
   *   in_work → frozen → released → obsolete
   * Moving backwards throws — `released` models cannot return to `in_work`.
   */
  setPlmState(modelName: string, targetState: CatiaPlmState): CatiaModel {
    const current = this.readModel(modelName);
    const fromIdx = PLM_ORDER.indexOf(current.plmState);
    const toIdx = PLM_ORDER.indexOf(targetState);
    if (toIdx < fromIdx) {
      throw new Error(
        `Illegal PLM transition ${current.plmState} → ${targetState} (regression)`,
      );
    }
    const res = this.run("set_plm_state", { modelName, targetState });
    this.throwIfFailed(res);
    return CatiaModelSchema.parse(res.result);
  }

  save(modelName: string): void {
    const res = this.run("save", { modelName });
    this.throwIfFailed(res);
  }

  // ── Derived reads ─────────────────────────────────────────────────────────

  /** Read-only view into the spec tree ordered by sequence. */
  specTree(modelName: string): CatiaFeature[] {
    const m = this.readModel(modelName);
    return [...m.features].sort((a, b) => a.sequence - b.sequence);
  }

  /** Return every EKL check that last failed its verdict (false). */
  failingChecks(modelName: string): CatiaEklRelation[] {
    const m = this.readModel(modelName);
    return m.relations.filter(
      (r) => r.kind === "check" && r.lastVerdict === false,
    );
  }

  // ── Audit / telemetry ─────────────────────────────────────────────────────

  callLog(): CatiaCallLogEntry[] {
    return [...this.log];
  }

  clearCallLog(): void {
    this.log = [];
  }

  /**
   * p95 round-trip latency across the call log. Surfaces in the CATIA add-in
   * SLO widget. Returns null if fewer than 3 calls are recorded.
   */
  p95Latency(): number | null {
    if (this.log.length < 3) return null;
    const sorted = [...this.log.map((e) => e.durationMs)].sort((a, b) => a - b);
    const idx = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1);
    return sorted[Math.max(0, idx)];
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  private run(
    cmd: CatiaCommand,
    args: Record<string, unknown>,
  ): CatiaResponse {
    const t0 = this.clock.monotonicMs();
    let response: CatiaResponse;
    try {
      response = CatiaResponseSchema.parse(this.transport.send(cmd, args));
    } catch (err) {
      response = CatiaResponseSchema.parse({
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

  private throwIfFailed(res: CatiaResponse): void {
    if (!res.ok) {
      throw new Error(`CATIA CAA V5 transport error: ${res.error ?? "unknown"}`);
    }
  }
}

// ── Unit conversions (same canonical table as Creo bridge) ──────────────────

const TO_SI: Partial<Record<CatiaDimensionUnit, number>> = {
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
  from: CatiaDimensionUnit,
  to: CatiaDimensionUnit,
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

function defaultClock(): CatiaClock {
  return {
    now: () => new Date().toISOString(),
    monotonicMs: () => Date.now(),
  };
}

export const catiaCAAV5BridgeEngine = {
  create: (opts: { transport: CatiaTransport; clock?: CatiaClock }) =>
    new CATIACAAV5BridgeEngine(opts),
};
