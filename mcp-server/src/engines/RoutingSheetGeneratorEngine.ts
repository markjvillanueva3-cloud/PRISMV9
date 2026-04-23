/**
 * RoutingSheetGeneratorEngine — Job Routing Documentation (U-MIO33)
 * =================================================================
 *
 * Generates auditable routing sheets for shop floor execution. A routing
 * sheet is the shop's source-of-truth for how a job flows through operations,
 * which machine performs each op, estimated cycle times, and who owns each
 * step.
 *
 * Capabilities:
 *   1. Ingest operation plan (from orchestrator or OperationSequencerEngine)
 *   2. Emit per-op routing rows: op_num, op_name, machine, setup_min, run_min, notes
 *   3. Roll up totals (setup, run, total, lead_time) with queue-time assumption
 *   4. Render as structured JSON + human-readable Markdown
 *   5. Export to CSV for ERP/MES import
 *
 * Time standards model:
 *   - Setup time: fixed per-op allowance + optional per-tool adder
 *   - Run time:   cycle_time × pieces (or cycle_time alone for first-article)
 *   - Queue time: configurable buffer between ops (default 15 min)
 *   - Lead time:  sum(setup + run + queue) across all ops
 *
 * References:
 *   - ISO 9001:2015 §8.1: Operational planning & control
 *   - ANSI/ASME Y14.100: Engineering drawing practices (op sheet conventions)
 *   - Kanban / Lean routing: queue-time accounting
 *
 * @module engines/RoutingSheetGeneratorEngine
 * @milestone MIO-MS0 U-MIO33
 */

// ── Types ──────────────────────────────────────────────────────────────────

export interface RoutingOperation {
  /** Sequential op number (10, 20, 30 … — legacy ERP convention) */
  op_num: number;
  /** Human-readable op name (e.g. "Rough Turn OD") */
  op_name: string;
  /** Machine identifier (e.g. "OKUMA-LB3000", "HAAS-VF4") */
  machine_id: string;
  /** Machine type classification for quick filtering */
  machine_type?: "mill" | "lathe" | "wedm" | "sinker" | "grinder" | "saw" | "inspection" | "deburr" | "other";
  /** Estimated setup time in minutes */
  setup_min: number;
  /** Estimated run time per piece in minutes (cycle time) */
  cycle_min: number;
  /** Number of pieces (default 1 = first article) */
  pieces?: number;
  /** Optional notes for operator */
  notes?: string;
  /** Optional tool list for this op */
  tools?: string[];
  /** Optional work-holding fixture id */
  fixture_id?: string;
  /** Optional WCS (work coordinate system) */
  wcs?: string;
  /** Operator skill requirement */
  skill_level?: "apprentice" | "journeyman" | "master";
}

export interface RoutingSheetInput {
  /** Job identifier */
  job_id: string;
  /** Part number + revision */
  part_number: string;
  revision: string;
  /** Optional customer (for ERP linkage) */
  customer?: string;
  /** Optional due date (ISO) */
  due_date?: string;
  /** Number of pieces for the job (default 1) */
  quantity?: number;
  /** Operations in sequence */
  operations: RoutingOperation[];
  /** Queue time between ops in minutes (default 15) */
  queue_min_between_ops?: number;
}

export interface RoutingRow {
  op_num: number;
  op_name: string;
  machine_id: string;
  machine_type: string;
  setup_min: number;
  cycle_min: number;
  pieces: number;
  run_min: number;
  op_total_min: number;
  cumulative_min: number;
  tools: string[];
  fixture_id: string;
  wcs: string;
  skill_level: string;
  notes: string;
}

export interface RoutingTotals {
  op_count: number;
  total_setup_min: number;
  total_run_min: number;
  total_queue_min: number;
  total_min: number;
  total_hr: number;
  lead_time_business_days: number;
}

export interface RoutingSheet {
  routing_id: string;
  job_id: string;
  part_number: string;
  revision: string;
  customer: string;
  due_date: string;
  quantity: number;
  queue_min_between_ops: number;
  created: string;
  rows: RoutingRow[];
  totals: RoutingTotals;
  warnings: string[];
}

export interface RoutingForms {
  json: RoutingSheet;
  markdown: string;
  csv: string;
}

// ── Defaults & constants ───────────────────────────────────────────────────

const DEFAULT_QUEUE_MIN = 15;
const HOURS_PER_BUSINESS_DAY = 8;

// ── Engine ─────────────────────────────────────────────────────────────────

export class RoutingSheetGeneratorEngine {
  private routingStore: Map<string, RoutingSheet> = new Map();
  private counter = 0;

  /**
   * Generate a routing sheet from the supplied job + operation plan.
   *
   * Cycle math:
   *   run_min         = cycle_min × pieces
   *   op_total_min    = setup_min + run_min
   *   total_setup     = Σ setup_min
   *   total_run       = Σ run_min
   *   total_queue     = queue_min × (op_count − 1)   (no queue before first op)
   *   total_min       = total_setup + total_run + total_queue
   *   lead_time_days  = ceil(total_hr / 8)
   */
  generate(input: RoutingSheetInput): RoutingSheet {
    if (!input || !input.operations || input.operations.length === 0) {
      throw new Error("RoutingSheetGenerator: at least one operation is required");
    }

    const queueMin = input.queue_min_between_ops ?? DEFAULT_QUEUE_MIN;
    const quantity = input.quantity ?? 1;
    const warnings: string[] = [];

    // Validate op_num monotonicity
    const opNums = input.operations.map(o => o.op_num);
    for (let i = 1; i < opNums.length; i++) {
      if (opNums[i] <= opNums[i - 1]) {
        warnings.push(`Op sequence not monotonic at op ${opNums[i]} (previous ${opNums[i - 1]})`);
      }
    }

    const rows: RoutingRow[] = [];
    let cumulative = 0;

    for (let i = 0; i < input.operations.length; i++) {
      const op = input.operations[i];
      const pieces = op.pieces ?? quantity;
      const run = round(op.cycle_min * pieces, 2);
      const opTotal = round(op.setup_min + run, 2);

      // Queue time added before each op except the first
      if (i > 0) cumulative += queueMin;
      cumulative = round(cumulative + opTotal, 2);

      // Sanity: negative or NaN
      if (op.setup_min < 0 || !isFinite(op.setup_min)) {
        warnings.push(`Op ${op.op_num}: invalid setup_min=${op.setup_min}`);
      }
      if (op.cycle_min < 0 || !isFinite(op.cycle_min)) {
        warnings.push(`Op ${op.op_num}: invalid cycle_min=${op.cycle_min}`);
      }

      rows.push({
        op_num: op.op_num,
        op_name: op.op_name,
        machine_id: op.machine_id,
        machine_type: op.machine_type ?? "other",
        setup_min: round(op.setup_min, 2),
        cycle_min: round(op.cycle_min, 4),
        pieces,
        run_min: run,
        op_total_min: opTotal,
        cumulative_min: cumulative,
        tools: op.tools ?? [],
        fixture_id: op.fixture_id ?? "N/A",
        wcs: op.wcs ?? "G54",
        skill_level: op.skill_level ?? "journeyman",
        notes: op.notes ?? "",
      });
    }

    const totalSetup = round(rows.reduce((s, r) => s + r.setup_min, 0), 2);
    const totalRun = round(rows.reduce((s, r) => s + r.run_min, 0), 2);
    const totalQueue = round(queueMin * Math.max(0, rows.length - 1), 2);
    const totalMin = round(totalSetup + totalRun + totalQueue, 2);
    const totalHr = round(totalMin / 60, 2);
    const leadDays = Math.ceil(totalHr / HOURS_PER_BUSINESS_DAY);

    this.counter++;
    const routingId = `RT-${String(this.counter).padStart(5, "0")}`;

    const sheet: RoutingSheet = {
      routing_id: routingId,
      job_id: input.job_id,
      part_number: input.part_number,
      revision: input.revision,
      customer: input.customer ?? "N/A",
      due_date: input.due_date ?? "N/A",
      quantity,
      queue_min_between_ops: queueMin,
      created: new Date().toISOString(),
      rows,
      totals: {
        op_count: rows.length,
        total_setup_min: totalSetup,
        total_run_min: totalRun,
        total_queue_min: totalQueue,
        total_min: totalMin,
        total_hr: totalHr,
        lead_time_business_days: leadDays,
      },
      warnings,
    };

    this.routingStore.set(routingId, sheet);
    return sheet;
  }

  /**
   * Retrieve a previously generated routing sheet by id.
   */
  get(routing_id: string): RoutingSheet | null {
    return this.routingStore.get(routing_id) ?? null;
  }

  /**
   * Generate the sheet + Markdown + CSV representations in one shot.
   */
  generateAll(input: RoutingSheetInput): RoutingForms {
    const json = this.generate(input);
    return {
      json,
      markdown: this.renderMarkdown(json),
      csv: this.renderCSV(json),
    };
  }

  /** Render a RoutingSheet as a human-readable Markdown report. */
  renderMarkdown(sheet: RoutingSheet): string {
    const lines: string[] = [];
    lines.push(`# Routing Sheet ${sheet.routing_id}`);
    lines.push("");
    lines.push(`| Field | Value |`);
    lines.push(`|-------|-------|`);
    lines.push(`| Job | ${sheet.job_id} |`);
    lines.push(`| Part Number | ${sheet.part_number} Rev ${sheet.revision} |`);
    lines.push(`| Customer | ${sheet.customer} |`);
    lines.push(`| Due Date | ${sheet.due_date} |`);
    lines.push(`| Quantity | ${sheet.quantity} |`);
    lines.push(`| Created | ${sheet.created} |`);
    lines.push("");
    lines.push(`## Operations`);
    lines.push("");
    lines.push(`| Op# | Name | Machine | Setup (min) | Cycle (min) | Pcs | Run (min) | Total (min) | Cum. (min) | Tools | Fixture | WCS | Skill | Notes |`);
    lines.push(`|-----|------|---------|-------------|-------------|-----|-----------|-------------|------------|-------|---------|-----|-------|-------|`);
    for (const r of sheet.rows) {
      lines.push(
        `| ${r.op_num} | ${r.op_name} | ${r.machine_id} | ${r.setup_min} | ${r.cycle_min} | ${r.pieces} | ${r.run_min} | ${r.op_total_min} | ${r.cumulative_min} | ${r.tools.join(", ") || "—"} | ${r.fixture_id} | ${r.wcs} | ${r.skill_level} | ${r.notes || "—"} |`,
      );
    }
    lines.push("");
    lines.push(`## Totals`);
    lines.push("");
    lines.push(`- **Ops:** ${sheet.totals.op_count}`);
    lines.push(`- **Setup:** ${sheet.totals.total_setup_min} min`);
    lines.push(`- **Run:** ${sheet.totals.total_run_min} min`);
    lines.push(`- **Queue:** ${sheet.totals.total_queue_min} min`);
    lines.push(`- **Total:** ${sheet.totals.total_min} min (${sheet.totals.total_hr} hr)`);
    lines.push(`- **Lead time:** ${sheet.totals.lead_time_business_days} business day(s)`);
    lines.push("");

    if (sheet.warnings.length > 0) {
      lines.push(`## Warnings`);
      lines.push("");
      for (const w of sheet.warnings) lines.push(`- ⚠ ${w}`);
      lines.push("");
    }

    return lines.join("\n");
  }

  /** Render a RoutingSheet as CSV suitable for ERP/MES import. */
  renderCSV(sheet: RoutingSheet): string {
    const header = [
      "routing_id", "job_id", "part_number", "revision", "op_num", "op_name",
      "machine_id", "machine_type", "setup_min", "cycle_min", "pieces", "run_min",
      "op_total_min", "cumulative_min", "tools", "fixture_id", "wcs", "skill_level", "notes",
    ];
    const lines: string[] = [header.join(",")];
    for (const r of sheet.rows) {
      const row = [
        sheet.routing_id,
        sheet.job_id,
        sheet.part_number,
        sheet.revision,
        r.op_num,
        csvEscape(r.op_name),
        r.machine_id,
        r.machine_type,
        r.setup_min,
        r.cycle_min,
        r.pieces,
        r.run_min,
        r.op_total_min,
        r.cumulative_min,
        csvEscape(r.tools.join("|")),
        r.fixture_id,
        r.wcs,
        r.skill_level,
        csvEscape(r.notes),
      ];
      lines.push(row.join(","));
    }
    return lines.join("\n");
  }

  /** Clear in-memory store (for tests) */
  reset(): void {
    this.routingStore.clear();
    this.counter = 0;
  }
}

function round(x: number, digits: number): number {
  if (!isFinite(x)) return x;
  const p = Math.pow(10, digits);
  return Math.round(x * p) / p;
}

function csvEscape(v: string): string {
  if (!v) return "";
  if (v.includes(",") || v.includes("\"") || v.includes("\n")) {
    return '"' + v.replace(/"/g, '""') + '"';
  }
  return v;
}

export const routingSheetGeneratorEngine = new RoutingSheetGeneratorEngine();
