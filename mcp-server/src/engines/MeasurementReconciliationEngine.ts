/**
 * MeasurementReconciliationEngine — apply real-world measurements (caliper,
 * CMM, mic, gage block) to a parametric CAD template, overwriting the named
 * params and re-emitting CADOperation[] with overrides applied. Flags
 * geometric contradictions.
 *
 * Companion to PartMediaToCADEngine — closes the (e) clause from the dedup
 * scout: operator photographs part → gets starting-bad parametric template
 * → measures with calipers → calls this engine to refine the template.
 *
 * Reuses:
 *   • `ReverseEngineeredTemplate` from CADReverseTemplateEngine
 *   • `CADOperation` from cad-operation-kinds
 *
 * No vision, no I/O — pure deterministic dimension-table reconciliation.
 *
 * Authored 2026-05-25 (slot:echo, user reverse-engineering capability ask)
 */

import { log } from "../utils/Logger.js";
import type { ReverseEngineeredTemplate, TemplateParam } from "./CADReverseTemplateEngine.js";
import type { CADOperation } from "../interfaces/ICADCodeGenerator.js";

// ── Inputs ────────────────────────────────────────────────────────────────────

export interface Measurement {
  /** Name of a TemplateParam (e.g. "diameter_op0") OR a friendly alias the
   *  engine resolves via the param table (e.g. "od" → "diameter_op0"). */
  paramName: string;
  /** Measured value in `unit`. */
  value: number;
  /** Default "mm". Supported: "mm" | "in" | "thou" | "um". Auto-converted. */
  unit?: "mm" | "in" | "thou" | "um";
  /** Optional measurement uncertainty (±, same unit). */
  uncertainty?: number;
  /** Instrument used (caliper / micrometer / cmm / gage_block / optical). */
  instrument?: "caliper" | "micrometer" | "cmm" | "gage_block" | "optical" | "ruler" | "other";
  /** Free-text annotation ("on rim", "centerline", "average of 3"). */
  note?: string;
}

export interface ReconciliationInput {
  template: ReverseEngineeredTemplate;
  measurements: Measurement[];
  /** When two ops carry the same dimension key, the engine picks the
   *  largest-value-magnitude op by default. Operator can override here. */
  preferOpIndex?: Record<string, number>;
  /** Strict mode: flag any unresolved measurement as an error (default false). */
  strict?: boolean;
}

// ── Outputs ───────────────────────────────────────────────────────────────────

export interface ParamOverride {
  paramName: string;
  oldValue: number;
  newValue: number;
  /** Absolute delta in mm (always normalized). */
  delta_mm: number;
  /** Relative delta as fraction of old value. */
  delta_rel: number;
  /** Vision-then-measurement provenance line for the audit trail. */
  source: string;
  /** Measurement uncertainty propagated through. */
  uncertainty_mm?: number;
}

export interface Contradiction {
  /** "hole-larger-than-bore" | "depth-exceeds-thickness" | "negative-dim" | ... */
  rule: string;
  message: string;
  affected_params: string[];
}

export interface ReconciliationResult {
  /** Updated template (deep-cloned; original untouched). */
  template: ReverseEngineeredTemplate;
  /** Re-emitted ops with overrides applied (round-trip-lossless). */
  cad_ops: CADOperation[];
  /** Per-measurement override records. */
  overrides: ParamOverride[];
  /** Unresolved measurements (no matching param in template). */
  unresolved: Measurement[];
  /** Geometric contradictions detected post-reconciliation. */
  contradictions: Contradiction[];
  /** Stats. */
  meta: {
    measurements_in: number;
    applied: number;
    unresolved: number;
    contradictions: number;
    reconciled_at: string;
  };
}

// ── Engine ────────────────────────────────────────────────────────────────────

/** Unit-to-mm conversion factors. */
const UNIT_TO_MM: Record<NonNullable<Measurement["unit"]>, number> = {
  mm: 1,
  in: 25.4,
  thou: 0.0254,
  um: 0.001,
};

/** Friendly-alias → argKey map for resolving measurements by intent. */
const FRIENDLY_ALIASES: Record<string, string[]> = {
  od: ["diameter", "outer_diameter"],
  id: ["bore", "inner_diameter", "diameter"],
  bore: ["bore", "inner_diameter", "diameter"],
  length: ["length"],
  width: ["width"],
  height: ["height", "depth"],
  depth: ["depth"],
  thickness: ["height", "thickness"],
  radius: ["radius"],
  pitch: ["pitch"],
  spacing: ["spacing"],
  pcd: ["spacing", "diameter"],
};

export class MeasurementReconciliationEngine {
  /**
   * Apply measurements to a parametric template + re-emit the CAD ops.
   * Pure deterministic — same inputs → same outputs.
   *
   * @returns updated template + new ops + per-measurement provenance +
   *          contradiction report.
   */
  reconcile(input: ReconciliationInput): ReconciliationResult {
    if (!input?.template) throw new TypeError("reconcile: input.template required");
    if (!Array.isArray(input.measurements)) throw new TypeError("reconcile: input.measurements must be an array");

    // Deep clone template so the input is untouched (round-trip immutability).
    const template: ReverseEngineeredTemplate = {
      ...input.template,
      params: input.template.params.map((p) => ({ ...p })),
      opTemplate: input.template.opTemplate.map((op) => ({
        ...op,
        args: op.args ? { ...op.args } : op.args,
      } as CADOperation)),
      opKindHistogram: { ...input.template.opKindHistogram },
    };

    const overrides: ParamOverride[] = [];
    const unresolved: Measurement[] = [];

    for (const m of input.measurements) {
      const valueMm = this.toMm(m.value, m.unit ?? "mm");
      const uncertaintyMm = m.uncertainty != null ? this.toMm(m.uncertainty, m.unit ?? "mm") : undefined;

      const matchedParam = this.resolveParam(
        m.paramName,
        template.params,
        input.preferOpIndex?.[m.paramName],
      );

      if (!matchedParam) {
        unresolved.push(m);
        continue;
      }

      const oldValue = matchedParam.value;
      const delta = valueMm - oldValue;
      matchedParam.value = valueMm;
      overrides.push({
        paramName: matchedParam.name,
        oldValue,
        newValue: valueMm,
        delta_mm: delta,
        delta_rel: oldValue !== 0 ? delta / oldValue : 0,
        source: `${m.instrument ?? "measurement"}${m.note ? ` · ${m.note}` : ""}`,
        uncertainty_mm: uncertaintyMm,
      });

      // Apply override back to the op's args
      const op = template.opTemplate[matchedParam.opIndex];
      if (op?.args) {
        (op.args as Record<string, any>)[matchedParam.argKey] = valueMm;
      }
    }

    // Detect contradictions on the reconciled template
    const contradictions = this.detectContradictions(template);

    if (input.strict && unresolved.length > 0) {
      log.warn(
        `[MeasurementReconciliationEngine] strict mode: ${unresolved.length} unresolved measurements (will be returned but not applied)`,
      );
    }

    return {
      template,
      cad_ops: template.opTemplate,
      overrides,
      unresolved,
      contradictions,
      meta: {
        measurements_in: input.measurements.length,
        applied: overrides.length,
        unresolved: unresolved.length,
        contradictions: contradictions.length,
        reconciled_at: new Date().toISOString(),
      },
    };
  }

  /** Convert a value to mm. */
  toMm(value: number, unit: NonNullable<Measurement["unit"]>): number {
    const factor = UNIT_TO_MM[unit];
    if (factor == null) throw new Error(`unsupported unit: ${unit}`);
    return value * factor;
  }

  /**
   * Resolve a measurement's paramName to an actual TemplateParam. Tries:
   *   1. Exact name match
   *   2. Friendly alias → argKey lookup, then pick the best op
   */
  private resolveParam(
    paramName: string,
    params: TemplateParam[],
    preferOpIndex?: number,
  ): TemplateParam | undefined {
    // 1. Exact match
    const exact = params.find((p) => p.name === paramName);
    if (exact) return exact;

    // 2. Friendly alias
    const aliasArgKeys = FRIENDLY_ALIASES[paramName.toLowerCase()];
    if (aliasArgKeys) {
      const candidates = params.filter((p) => aliasArgKeys.includes(p.argKey));
      if (candidates.length === 0) return undefined;
      if (typeof preferOpIndex === "number") {
        const pref = candidates.find((p) => p.opIndex === preferOpIndex);
        if (pref) return pref;
      }
      // Default: pick the largest-value param (likely the primary body dimension)
      return candidates.sort((a, b) => Math.abs(b.value) - Math.abs(a.value))[0];
    }

    return undefined;
  }

  /**
   * Detect common geometric contradictions post-reconciliation. Conservative
   * rule set — only catches obvious physical impossibilities, not subtle
   * design issues (those are operator domain).
   */
  private detectContradictions(template: ReverseEngineeredTemplate): Contradiction[] {
    const out: Contradiction[] = [];

    // Rule: any dimension <= 0
    for (const p of template.params) {
      if (p.value <= 0) {
        out.push({
          rule: "non-positive-dimension",
          message: `param ${p.name} (${p.argKey} on op ${p.opIndex}) is ${p.value} — must be > 0`,
          affected_params: [p.name],
        });
      }
    }

    // Rule: hole diameter exceeds enclosing cylinder/box dominant dimension
    // Find the largest body-dim and compare to the largest hole-dim
    const bodyKeys = ["diameter", "outer_diameter", "od", "width", "length", "height"];
    const bodyDims = template.params
      .filter((p) => bodyKeys.includes(p.argKey))
      .sort((a, b) => b.value - a.value);
    const holeOpIndices = new Set<number>();
    template.opTemplate.forEach((op, i) => {
      if (op.kind === "feature_hole") holeOpIndices.add(i);
    });
    const holeParams = template.params.filter((p) => holeOpIndices.has(p.opIndex) && p.argKey === "diameter");

    if (bodyDims.length > 0 && holeParams.length > 0) {
      const bodyMax = bodyDims[0];
      for (const h of holeParams) {
        if (h.value >= bodyMax.value) {
          out.push({
            rule: "hole-exceeds-body",
            message: `hole ${h.name}=${h.value}mm ≥ body ${bodyMax.name}=${bodyMax.value}mm — hole cannot exceed enclosing geometry`,
            affected_params: [h.name, bodyMax.name],
          });
        }
      }
    }

    // Rule: hole depth exceeds body length/thickness
    const lengthParams = template.params.filter((p) => p.argKey === "length" || p.argKey === "height" || p.argKey === "thickness");
    const holeDepthParams = template.params.filter((p) => holeOpIndices.has(p.opIndex) && p.argKey === "depth");
    if (lengthParams.length > 0 && holeDepthParams.length > 0) {
      const lengthMax = lengthParams.sort((a, b) => b.value - a.value)[0];
      for (const hd of holeDepthParams) {
        if (hd.value > lengthMax.value * 1.001) {
          out.push({
            rule: "hole-depth-exceeds-body",
            message: `hole depth ${hd.name}=${hd.value}mm exceeds body length ${lengthMax.name}=${lengthMax.value}mm`,
            affected_params: [hd.name, lengthMax.name],
          });
        }
      }
    }

    return out;
  }

  /**
   * Re-emit CAD ops from a template — useful when caller has already
   * mutated template.params and wants the corresponding ops back.
   */
  emitCADOps(template: ReverseEngineeredTemplate): CADOperation[] {
    const ops = template.opTemplate.map((op) => ({
      ...op,
      args: op.args ? { ...op.args } : op.args,
    } as CADOperation));
    // Project current param values back into op args (idempotent)
    for (const p of template.params) {
      const op = ops[p.opIndex];
      if (op?.args) (op.args as Record<string, any>)[p.argKey] = p.value;
    }
    return ops;
  }
}

export const measurementReconciliationEngine = new MeasurementReconciliationEngine();
