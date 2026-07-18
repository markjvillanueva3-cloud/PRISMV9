/**
 * PipelineIRConverterEngine -- PIPELINE-IR-MS0 / U-PIR02 (slot:bravo).
 *
 * Validates + normalizes a raw pipeline into a graph-valid PipelineIR, then
 * topologically orders its stages. The PipelineIR schema (U-PIR01) enforces
 * STRUCTURE; this converter enforces GRAPH INTEGRITY that a flat schema cannot:
 *   - duplicate stage ids
 *   - dangling dependsOn (a dep id with no matching stage)
 *   - dangling param/condition refs (ref.stage with no matching stage)
 *   - cycles (via Kahn's algorithm: if not every node drains, the residue is a cycle)
 * Returns a discriminated result (validation outcomes are DATA, not exceptions --
 * the caller wants the FULL error list, not the first throw). The topo order it
 * produces is what PipelineIRExecutorEngine (U-PIR03) runs.
 *
 * Pure + deterministic. No physics, no I/O.
 */
import {
  PipelineIRSchema,
  type PipelineIR,
  type ParamSpec,
} from "../schemas/PipelineIR.js";

export interface ConvertError {
  /** Machine-stable error class. */
  code:
    | "schema"
    | "duplicate-stage-id"
    | "dangling-depends-on"
    | "dangling-ref"
    | "self-dependency"
    | "cycle";
  message: string;
  /** Stage id the error attaches to (when applicable). */
  stage?: string;
}

export type ConvertResult =
  | { ok: true; ir: PipelineIR; order: string[]; errors: [] }
  | { ok: false; errors: ConvertError[] };

/** Collect every stage referenced by a stage's params + condition (ParamSpec refs). */
function refStages(params: Record<string, ParamSpec>, condition?: ParamSpec): string[] {
  const out: string[] = [];
  const add = (ps?: ParamSpec) => {
    if (ps && typeof ps === "object" && "ref" in ps && ps.ref) out.push(ps.ref.stage);
  };
  for (const k of Object.keys(params ?? {})) add(params[k]);
  add(condition);
  return out;
}

export class PipelineIRConverterEngine {
  /**
   * Convert + validate + topologically order a raw pipeline.
   * @returns ok:true with the normalized IR + a dependency-respecting stage order,
   *          or ok:false with EVERY graph error found (never throws on bad input).
   */
  static convert(raw: unknown): ConvertResult {
    // 1) Structural schema gate -- collect issues rather than throw.
    const parsed = PipelineIRSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        ok: false,
        errors: parsed.error.issues.map((i) => ({
          code: "schema" as const,
          message: `${i.path.join(".") || "<root>"}: ${i.message}`,
        })),
      };
    }
    const ir = parsed.data;
    const errors: ConvertError[] = [];

    // 2) Duplicate stage ids.
    const ids = new Set<string>();
    const dups = new Set<string>();
    for (const s of ir.stages) {
      if (ids.has(s.id)) dups.add(s.id);
      ids.add(s.id);
    }
    for (const d of dups) errors.push({ code: "duplicate-stage-id", message: `stage id "${d}" is declared more than once`, stage: d });

    // 3) Dangling dependsOn + 4) dangling refs + 5) self-dependency.
    for (const s of ir.stages) {
      for (const dep of s.dependsOn) {
        if (dep === s.id) errors.push({ code: "self-dependency", message: `stage "${s.id}" depends on itself`, stage: s.id });
        else if (!ids.has(dep)) errors.push({ code: "dangling-depends-on", message: `stage "${s.id}" dependsOn unknown stage "${dep}"`, stage: s.id });
      }
      for (const rs of refStages(s.params, s.condition)) {
        if (!ids.has(rs)) errors.push({ code: "dangling-ref", message: `stage "${s.id}" references output of unknown stage "${rs}"`, stage: s.id });
      }
    }

    // 6) Topological sort (Kahn). Only build edges among KNOWN stages so a dangling
    // dep doesn't corrupt the in-degree bookkeeping (it is already reported above).
    const order = PipelineIRConverterEngine.topoSort(ir, ids, errors);

    if (errors.length > 0) return { ok: false, errors };
    return { ok: true, ir, order, errors: [] };
  }

  /**
   * Kahn's algorithm over dependsOn edges (dep -> stage). Pushes a "cycle" error
   * (with the unresolved residue) when not every node drains. Deterministic: ready
   * nodes are emitted in original stage declaration order.
   */
  private static topoSort(ir: PipelineIR, knownIds: Set<string>, errors: ConvertError[]): string[] {
    const indeg = new Map<string, number>();
    const dependents = new Map<string, string[]>(); // dep -> [stages that depend on it]
    for (const s of ir.stages) indeg.set(s.id, 0);
    for (const s of ir.stages) {
      for (const dep of s.dependsOn) {
        if (!knownIds.has(dep) || dep === s.id) continue; // skip dangling/self (reported elsewhere)
        indeg.set(s.id, (indeg.get(s.id) ?? 0) + 1);
        if (!dependents.has(dep)) dependents.set(dep, []);
        dependents.get(dep)!.push(s.id);
      }
    }
    // Seed queue with in-degree-0 nodes, preserving declaration order.
    const order: string[] = [];
    const queue = ir.stages.filter((s) => (indeg.get(s.id) ?? 0) === 0).map((s) => s.id);
    while (queue.length > 0) {
      const id = queue.shift()!;
      order.push(id);
      for (const next of dependents.get(id) ?? []) {
        const d = (indeg.get(next) ?? 0) - 1;
        indeg.set(next, d);
        if (d === 0) queue.push(next);
      }
    }
    if (order.length !== ir.stages.length) {
      const residue = ir.stages.map((s) => s.id).filter((id) => !order.includes(id));
      errors.push({ code: "cycle", message: `dependency cycle among stages: ${residue.join(", ")}` });
    }
    return order;
  }
}

/** Singleton alias for dispatcher-wiring convenience (static-method engine). */
export const pipelineIRConverterEngine = PipelineIRConverterEngine;
