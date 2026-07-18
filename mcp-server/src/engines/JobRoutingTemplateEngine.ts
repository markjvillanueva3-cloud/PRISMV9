/**
 * JobRoutingTemplateEngine — reusable operation-sequence templates
 * (hotel iter18, 2026-05-24, U-JOB-ROUTING-TEMPLATE).
 *
 * Closes G7 from the ERP-comparison audit. A "routing template" is the
 * canonical operation sequence for a part family (e.g. "milled bracket" =
 * rough mill → finish mill → deburr → inspect; "turned shaft" = OD turn →
 * groove → thread → polish → inspect). Operator defines a template once,
 * then any new part of that family gets the routing instantiated with
 * estimated setup/run/inspect times pro-rated to actual qty.
 *
 * Pure in-memory state engine — caller owns persistence. Singleton
 * `jobRoutingTemplateEngine`.
 *
 * Hotel-soul:
 *   - **R12 fail-loud** — bad inputs throw with descriptive errors
 *   - **deterministic** — operation ids ordered by seq ASC; reproducible
 *     instantiation output
 *   - **time-invariant gate** — total_estimated_time of an instantiated
 *     routing equals sum of per-operation times within $0.01 minutes
 *   - **defensive copy** — every public read deep-clones internal state
 *
 * Reference: APICS CSCP body of knowledge §3.3 (Routing & Work Centers);
 * Heizer/Render "Operations Management" 12e Ch.7 (Process Strategy).
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface RoutingOperation {
  seq: number;                  // 10, 20, 30 — industry convention (gap for inserts)
  op_code: string;              // "MILL-ROUGH", "TURN-OD", "DEBURR" — opcodes shared across templates
  description: string;
  work_center_id: string;       // e.g. "MILL-VF2" "LATHE-OKUMA-MA600"
  setup_time_min: number;       // one-time per job
  run_time_per_part_min: number;// per-part cycle time
}

export interface RoutingTemplate {
  id: string;
  name: string;
  part_family: string;          // "milled-bracket", "turned-shaft" — categorization
  operations: RoutingOperation[];
  created_at: string;
  updated_at: string;
}

export interface RoutingTemplateInput {
  name: string;
  part_family: string;
  operations: RoutingOperation[];
}

export interface InstantiatedRoutingRow {
  seq: number;
  op_code: string;
  description: string;
  work_center_id: string;
  setup_time_min: number;
  run_time_per_part_min: number;
  total_time_min: number;       // setup + run_per_part × qty
}

export interface InstantiatedRouting {
  template_id: string;
  template_name: string;
  part_id: string;
  qty: number;
  rows: InstantiatedRoutingRow[];
  total_estimated_time_min: number;
  total_setup_min: number;
  total_run_min: number;
  rows_balanced: boolean;       // hotel-soul time-invariant gate
  fetched_at: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const ID_PREFIX = "RTE";
const MAX_OPERATIONS = 100;
const MIN_OPERATIONS = 1;
const MAX_NAME_LEN = 200;
const MAX_DESCRIPTION_LEN = 500;
const TIME_TOLERANCE_MIN = 0.01;

// ─── Helpers ────────────────────────────────────────────────────────────────

function assertPositive(x: number, label: string): void {
  if (!Number.isFinite(x)) throw new Error(`${label}: must be finite (got ${x})`);
  if (x <= 0) throw new Error(`${label}: must be > 0 (got ${x})`);
}

function assertNonNegative(x: number, label: string): void {
  if (!Number.isFinite(x)) throw new Error(`${label}: must be finite (got ${x})`);
  if (x < 0) throw new Error(`${label}: must be >= 0 (got ${x})`);
}

function assertNonEmptyStr(s: unknown, label: string, max: number): string {
  if (typeof s !== "string") throw new Error(`${label}: must be a string`);
  const t = s.trim();
  if (t.length === 0) throw new Error(`${label}: empty`);
  if (t.length > max) throw new Error(`${label}: exceeds ${max} chars`);
  return t;
}

function assertPositiveInt(x: number, label: string): void {
  if (!Number.isInteger(x) || x <= 0) throw new Error(`${label}: must be positive integer (got ${x})`);
}

function validateOperations(ops: unknown): RoutingOperation[] {
  if (!Array.isArray(ops)) throw new Error("operations: must be an array");
  if (ops.length < MIN_OPERATIONS) throw new Error(`operations: at least ${MIN_OPERATIONS} required`);
  if (ops.length > MAX_OPERATIONS) throw new Error(`operations: exceeds ${MAX_OPERATIONS}`);
  const seenSeq = new Set<number>();
  const validated: RoutingOperation[] = [];
  for (let i = 0; i < ops.length; i++) {
    const o = ops[i] as Record<string, unknown>;
    if (o === null || typeof o !== "object") throw new Error(`operations[${i}]: must be an object`);
    assertPositiveInt(o.seq as number, `operations[${i}].seq`);
    if (seenSeq.has(o.seq as number)) throw new Error(`operations[${i}].seq: duplicate sequence ${o.seq}`);
    seenSeq.add(o.seq as number);
    const opCode = assertNonEmptyStr(o.op_code, `operations[${i}].op_code`, 50);
    const desc = assertNonEmptyStr(o.description, `operations[${i}].description`, MAX_DESCRIPTION_LEN);
    const wc = assertNonEmptyStr(o.work_center_id, `operations[${i}].work_center_id`, 100);
    assertNonNegative(o.setup_time_min as number, `operations[${i}].setup_time_min`);
    assertNonNegative(o.run_time_per_part_min as number, `operations[${i}].run_time_per_part_min`);
    validated.push({
      seq: o.seq as number,
      op_code: opCode,
      description: desc,
      work_center_id: wc,
      setup_time_min: o.setup_time_min as number,
      run_time_per_part_min: o.run_time_per_part_min as number,
    });
  }
  // Sort by seq ASC for deterministic stored order
  return validated.sort((a, b) => a.seq - b.seq);
}

function makeId(seq: number): string {
  return `${ID_PREFIX}-${seq.toString().padStart(6, "0")}`;
}

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}

// ─── Engine ─────────────────────────────────────────────────────────────────

export class JobRoutingTemplateEngine {
  private readonly store = new Map<string, RoutingTemplate>();
  private seq = 0;

  /** Create a new routing template. R12 fail-loud on bad inputs. */
  create(input: RoutingTemplateInput): RoutingTemplate {
    const name = assertNonEmptyStr(input.name, "name", MAX_NAME_LEN);
    const family = assertNonEmptyStr(input.part_family, "part_family", MAX_NAME_LEN);
    const ops = validateOperations(input.operations);
    const now = new Date().toISOString();
    this.seq += 1;
    const tmpl: RoutingTemplate = {
      id: makeId(this.seq),
      name,
      part_family: family,
      operations: ops,
      created_at: now,
      updated_at: now,
    };
    this.store.set(tmpl.id, tmpl);
    return this.deepCopy(tmpl);
  }

  /** Read by id. Returns null if missing. */
  get(id: string): RoutingTemplate | null {
    if (typeof id !== "string" || id.length === 0) return null;
    const t = this.store.get(id);
    return t ? this.deepCopy(t) : null;
  }

  /** List templates (optionally filtered by part_family). Deterministic id ASC. */
  list(partFamily?: string): RoutingTemplate[] {
    const out: RoutingTemplate[] = [];
    for (const t of this.store.values()) {
      if (partFamily !== undefined && t.part_family !== partFamily) continue;
      out.push(this.deepCopy(t));
    }
    out.sort((a, b) => a.id.localeCompare(b.id));
    return out;
  }

  /**
   * Instantiate a template against a specific part + qty — produce the
   * per-operation total-time table for a job.
   *
   * Hotel-soul: rows_balanced confirms sum(row.total_time) == top-level
   * total_estimated_time_min within $0.01 minutes.
   */
  instantiate(templateId: string, partId: string, qty: number): InstantiatedRouting {
    const tmpl = this.store.get(templateId);
    if (!tmpl) throw new Error(`routing template '${templateId}' not found`);
    const pid = assertNonEmptyStr(partId, "part_id", 100);
    assertPositive(qty, "qty");

    const rows: InstantiatedRoutingRow[] = [];
    let totalSetup = 0;
    let totalRun = 0;
    for (const op of tmpl.operations) {
      const setupContrib = op.setup_time_min;
      const runContrib = op.run_time_per_part_min * qty;
      const total = round2(setupContrib + runContrib);
      totalSetup = round2(totalSetup + setupContrib);
      totalRun = round2(totalRun + runContrib);
      rows.push({
        seq: op.seq,
        op_code: op.op_code,
        description: op.description,
        work_center_id: op.work_center_id,
        setup_time_min: setupContrib,
        run_time_per_part_min: op.run_time_per_part_min,
        total_time_min: total,
      });
    }
    const totalEstimated = round2(totalSetup + totalRun);
    const rowSum = rows.reduce((s, r) => s + r.total_time_min, 0);
    const balanced = Math.abs(rowSum - totalEstimated) <= TIME_TOLERANCE_MIN;
    if (!balanced) {
      throw new Error(`instantiate: row-sum ${rowSum.toFixed(4)} min != total ${totalEstimated.toFixed(4)} min`);
    }
    return {
      template_id: tmpl.id,
      template_name: tmpl.name,
      part_id: pid,
      qty,
      rows,
      total_estimated_time_min: totalEstimated,
      total_setup_min: totalSetup,
      total_run_min: totalRun,
      rows_balanced: balanced,
      fetched_at: new Date().toISOString(),
    };
  }

  /** Reset internal state — test helper. */
  __resetForTests(): void {
    this.store.clear();
    this.seq = 0;
  }

  private deepCopy(t: RoutingTemplate): RoutingTemplate {
    return {
      ...t,
      operations: t.operations.map(o => ({ ...o })),
    };
  }
}

export const jobRoutingTemplateEngine = new JobRoutingTemplateEngine();
