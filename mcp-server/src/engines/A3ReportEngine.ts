/**
 * A3ReportEngine -- A3 (Toyota PDCA one-pager) problem-solving reports for the ERP "A3 Report" surface.
 *
 * Backs prism_business a3_report_create/list/get (the Kienzle ERP A3 page). erp-live-smoke found these
 * as 501/Unknown-action stubs with NO backing capability (a3_report_create was also absent). This is a
 * real, persisted CRUD store -- create writes a structured A3, list/get read it back. Durable via the
 * same registerMap pattern as TimeClock/GeneralLedger (registered in BusinessStore + PersistenceBridge).
 *
 * Distinct from root_cause_* (8D corrective-action records on a specific NC) and Kaizen DMAIC events:
 * an A3 is the standalone PDCA storyboard. PII discipline: stores employee/job IDs only, never names.
 */
import { persistenceBridge } from "../db/PersistenceBridge.js";

/** Strip HTML/script, trim, cap length (mirrors the shop-floor text sanitizer). */
function sanitize(input: string | undefined | null, maxLen = 2000): string | undefined {
  if (input == null) return undefined;
  let text = String(input)
    .replace(/<[^>]*>/g, "")
    .replace(/on\w+\s*=/gi, "")
    .replace(/javascript\s*:/gi, "")
    .replace(/\beval\s*\(/gi, "")
    .trim();
  if (text.length > maxLen) text = text.slice(0, maxLen);
  return text || undefined;
}

export type A3Status = "draft" | "in_progress" | "complete" | "closed";

export interface A3Countermeasure {
  action: string;
  owner_employee_id?: string;
  due_date?: string;
  status: "open" | "done";
}

export interface A3Report {
  id: string;
  title: string;
  problem_statement: string;
  background?: string;
  current_condition?: string;
  target_condition?: string;
  root_cause?: string;
  countermeasures: A3Countermeasure[];
  status: A3Status;
  owner_employee_id?: string;
  job_id?: string;
  created_at: string;
  updated_at: string;
}

export interface A3CreateInput {
  title: string;
  problem_statement: string;
  background?: string;
  current_condition?: string;
  target_condition?: string;
  root_cause?: string;
  countermeasures?: Array<Partial<A3Countermeasure> & { action: string }>;
  status?: A3Status;
  owner_employee_id?: string;
  job_id?: string;
}

const VALID_STATUS: ReadonlySet<string> = new Set<A3Status>(["draft", "in_progress", "complete", "closed"]);

export class A3ReportEngine {
  private reports: Map<string, A3Report> = new Map();
  private nextId = 1;
  private nextIdSeeded = false;

  /**
   * Seed nextId from the largest existing A3-NNNNN suffix exactly once (lazily, after registerMap has
   * reloaded persisted rows on startup). Without this, a restart in postgres mode would reset nextId to
   * 1 and re-mint A3-00001, silently overwriting a reloaded report (soul: no silent clobber). O(n) once.
   */
  private seedNextId(): void {
    if (this.nextIdSeeded) return;
    let max = 0;
    for (const id of this.reports.keys()) {
      const m = id.match(/^A3-(\d+)$/);
      if (m) max = Math.max(max, Number(m[1]));
    }
    this.nextId = max + 1;
    this.nextIdSeeded = true;
  }

  /**
   * Create an A3 report. `title` and `problem_statement` are required (throws on empty -- a real
   * validation error, surfaced by the dispatcher try/catch, not a silent stub). All free text is
   * sanitized; an invalid status falls back to "draft".
   */
  create(input: A3CreateInput): A3Report {
    this.seedNextId();
    const title = sanitize(input.title, 200);
    const problem = sanitize(input.problem_statement);
    if (!title) throw new Error("A3 report requires a non-empty title");
    if (!problem) throw new Error("A3 report requires a non-empty problem_statement");

    const now = new Date().toISOString();
    const id = `A3-${String(this.nextId++).padStart(5, "0")}`;
    const status: A3Status = input.status && VALID_STATUS.has(input.status) ? input.status : "draft";
    const report: A3Report = {
      id,
      title,
      problem_statement: problem,
      background: sanitize(input.background),
      current_condition: sanitize(input.current_condition),
      target_condition: sanitize(input.target_condition),
      root_cause: sanitize(input.root_cause),
      countermeasures: (input.countermeasures ?? []).map((c) => ({
        action: sanitize(c.action, 500) ?? "",
        owner_employee_id: c.owner_employee_id,
        due_date: c.due_date,
        status: c.status === "done" ? "done" : "open",
      })),
      status,
      owner_employee_id: input.owner_employee_id,
      job_id: input.job_id,
      created_at: now,
      updated_at: now,
    };
    this.reports.set(id, report);
    persistenceBridge.persist("a3_reports", id, report as any);
    return report;
  }

  /**
   * List A3 reports (newest first), optionally filtered. data_available:false when the store is empty.
   */
  list(opts: { status?: string; owner_employee_id?: string; job_id?: string; limit?: number } = {}): {
    data_available: boolean;
    generated_at: string;
    total: number;
    returned: number;
    reports: A3Report[];
  } {
    const limit = Math.min(1000, Number(opts.limit) > 0 ? Math.floor(Number(opts.limit)) : 100);
    let rows = [...this.reports.values()];
    if (opts.status) rows = rows.filter((r) => r.status === opts.status);
    if (opts.owner_employee_id) rows = rows.filter((r) => r.owner_employee_id === opts.owner_employee_id);
    if (opts.job_id) rows = rows.filter((r) => r.job_id === opts.job_id);
    rows.sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : (a.id < b.id ? 1 : -1)));
    const total = rows.length;
    return {
      data_available: total > 0,
      generated_at: new Date().toISOString(),
      total,
      returned: Math.min(total, limit),
      reports: rows.slice(0, limit),
    };
  }

  /** Get one A3 report by id; returns { found:false } when absent (honest, not a throw). */
  get(id: string): A3Report | { found: false; id: string } {
    const r = this.reports.get(id);
    return r ?? { found: false, id };
  }
}

export const a3ReportEngine = new A3ReportEngine();

persistenceBridge.registerMap({
  entity: "a3_reports",
  getMap: () => (a3ReportEngine as any).reports as Map<string, any>,
  keyField: "id",
});
