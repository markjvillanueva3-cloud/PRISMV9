/**
 * AISummaryWriterEngine (G6) — natural-language summary layer.
 *
 * Consumes per-cadence metrics (daily/weekly/monthly) and produces a draft
 * narrative summary that lands in the G5 admin-approval queue. Admin reviews,
 * may edit, then approves — only THEN is the summary published downstream
 * (employee mobile portal digest / manager dashboard / executive rollup).
 *
 * R8 read-before-write: deterministic per-cadence metric engines already exist
 * (EmployeeDailyDigestEngine, ManagerDailyDashboardEngine, ExecutiveSummaryEngine).
 * This engine is the LLM-narrative layer on top — it does not duplicate any
 * metric calculation.
 *
 * Cadence (operator green-light 2026-05-26): all 3
 *   • daily   — per-employee end-of-shift summary
 *   • weekly  — per-department rollup
 *   • monthly — per-customer relationship summary (delivery + quality + spend)
 *
 * Narrative authoring strategy (token-budget aware):
 *   This engine produces a DETERMINISTIC TEMPLATED summary from the input
 *   metrics — no live LLM call required. Operator may swap in Ollama-generated
 *   prose later via the OllamaSummaryAdapter (deferred; the deterministic
 *   template is the production fallback when Ollama is offline per
 *   `prompt-rewriter-ollama silently broken` health banner).
 *
 * PSN synergy:
 *   Composes 4 PSN legs:
 *     • PSN-3 Wiki: links to existing wiki entries when subject_id matches.
 *     • PSN-5 Tribal: pulls top-3 relevant tribal tips for the subject.
 *     • PSN-11 PRISM AI: submits via aiProposalApprovalQueueEngine (G5).
 *     • G1 DepartmentEngine: scopes daily summaries to dept managers.
 *   systemVizRoost() emits an L7 hub for /system-viz integration.
 *
 * Hotel-soul invariants: PII-free (employee_id only in body, no SSN/full
 * names), Object.frozen, R12 fail-loud, NO direct publish (every summary
 * MUST flow through G5 → admin → downstream).
 *
 * @module AISummaryWriterEngine
 * @milestone HOTEL/U-AI-SUMMARY-WRITER (2026-05-26, slot:hotel iter7 /goal Phase 2)
 */

import { aiProposalApprovalQueueEngine } from "./AIProposalApprovalQueueEngine.js";

export type SummaryCadence = "daily" | "weekly" | "monthly";

export type SummarySubjectKind =
  | "employee"        // daily per-employee
  | "department"      // weekly per-dept
  | "customer";       // monthly per-customer

export interface DailyEmployeeMetrics {
  employee_id: string;
  department_code: string;
  shift_date: string;            // ISO YYYY-MM-DD
  parts_completed: number;
  setups_completed: number;
  /** Cycle time vs. estimated — > 1 = behind, < 1 = ahead. */
  cycle_time_ratio: number;
  /** Cpk on inspected parts (Six Sigma — Montgomery 6e). */
  cpk: number;
  /** DOWNTIME 8-waste observations logged today. */
  waste_count: number;
  notable_events: ReadonlyArray<string>;
}

export interface WeeklyDepartmentMetrics {
  department_code: string;
  week_start: string;
  week_end: string;
  /** Nakajima OEE % (0..100). */
  oee_pct: number;
  /** On-time delivery % (0..100). */
  on_time_pct: number;
  /** Open kaizen events. */
  open_kaizen: number;
  /** Open NCRs (non-conformance reports). */
  open_ncrs: number;
  /** Top wastes by count. */
  top_wastes: ReadonlyArray<{ waste: string; count: number }>;
  notable_events: ReadonlyArray<string>;
}

export interface MonthlyCustomerMetrics {
  customer_id: string;
  month: string;                 // ISO YYYY-MM
  orders_shipped: number;
  on_time_pct: number;
  total_revenue_cents: bigint;   // PII-safe: dollars-to-the-cent per hotel-soul
  open_complaints: number;
  rfqs_received: number;
  rfqs_won: number;
  notable_events: ReadonlyArray<string>;
}

export interface DraftSummary {
  cadence: SummaryCadence;
  subject_kind: SummarySubjectKind;
  subject_id: string;
  /** Generated narrative paragraphs (≤ 5). */
  narrative: ReadonlyArray<string>;
  /** Quick-glance bullet points for the mobile digest. */
  bullets: ReadonlyArray<string>;
  /** Highlighted KPIs that drive the narrative. */
  kpi_callouts: Readonly<Record<string, string | number>>;
  /** ISO-8601 source-data window. */
  window_start: string;
  window_end: string;
  /** Affected dept codes (for G5 routing). */
  affected_departments: ReadonlyArray<string>;
}

export interface SystemVizRoost {
  engine_name: string;
  layer: number;
  node_type: "hub" | "sink" | "source" | "orphan" | "ghost" | "normal";
  psn_legs: ReadonlyArray<number>;
  edges_out: ReadonlyArray<string>;
  edges_in: ReadonlyArray<string>;
}

const ALLOWED_CADENCES = new Set<SummaryCadence>(["daily", "weekly", "monthly"]);
const ALLOWED_SUBJECTS = new Set<SummarySubjectKind>(["employee", "department", "customer"]);

class AISummaryWriterEngine {
  private historyById: Map<string, DraftSummary> = new Map();
  private nextId = 1;

  /**
   * Build a daily per-employee draft summary from metrics. Pure function —
   * no I/O, no submission. Use submitDraft() to send through G5.
   */
  buildDailyEmployeeSummary(m: DailyEmployeeMetrics): DraftSummary {
    this.validateDaily(m);
    const cycleStatus = m.cycle_time_ratio > 1.1
      ? `${((m.cycle_time_ratio - 1) * 100).toFixed(0)}% behind plan`
      : m.cycle_time_ratio < 0.95
        ? `${((1 - m.cycle_time_ratio) * 100).toFixed(0)}% ahead of plan`
        : "on plan";
    const cpkBand = this.classifyCpk(m.cpk);
    const wasteLine = m.waste_count === 0
      ? "no DOWNTIME wastes observed"
      : `${m.waste_count} DOWNTIME waste observation${m.waste_count === 1 ? "" : "s"} logged`;

    const narrative: string[] = [
      `${m.employee_id} (${m.department_code}) completed ${m.parts_completed} parts across ${m.setups_completed} setups on ${m.shift_date}.`,
      `Cycle time ${cycleStatus}; Cpk ${m.cpk.toFixed(2)} (${cpkBand}); ${wasteLine}.`,
    ];
    if (m.notable_events.length > 0) {
      narrative.push(`Notable: ${m.notable_events.join("; ")}.`);
    }

    const bullets: string[] = [
      `${m.parts_completed} parts / ${m.setups_completed} setups`,
      `Cpk ${m.cpk.toFixed(2)} — ${cpkBand}`,
      `Cycle ${cycleStatus}`,
      wasteLine,
    ];
    if (m.notable_events.length > 0) {
      bullets.push(...m.notable_events.map((e) => `event: ${e}`));
    }

    return Object.freeze({
      cadence: "daily" as const,
      subject_kind: "employee" as const,
      subject_id: m.employee_id,
      narrative: Object.freeze(narrative),
      bullets: Object.freeze(bullets),
      kpi_callouts: Object.freeze({
        parts_completed: m.parts_completed,
        setups_completed: m.setups_completed,
        cycle_time_ratio: m.cycle_time_ratio,
        cpk: m.cpk,
        waste_count: m.waste_count,
      }),
      window_start: `${m.shift_date}T00:00:00.000Z`,
      window_end: `${m.shift_date}T23:59:59.999Z`,
      affected_departments: Object.freeze([m.department_code]),
    });
  }

  buildWeeklyDepartmentSummary(m: WeeklyDepartmentMetrics): DraftSummary {
    this.validateWeekly(m);
    const oeeBand = m.oee_pct >= 85 ? "world-class" : m.oee_pct >= 65 ? "industry-typical" : "below-target";
    const otBand = m.on_time_pct >= 95 ? "world-class" : m.on_time_pct >= 90 ? "acceptable" : "below-target";
    const wasteSummary = m.top_wastes.length === 0
      ? "no top wastes flagged"
      : `top wastes: ${m.top_wastes.slice(0, 3).map((w) => `${w.waste}(${w.count})`).join(", ")}`;

    const narrative: string[] = [
      `Department ${m.department_code} week ${m.week_start} → ${m.week_end}: OEE ${m.oee_pct.toFixed(1)}% (${oeeBand}); on-time ${m.on_time_pct.toFixed(1)}% (${otBand}).`,
      `${m.open_kaizen} open kaizen event${m.open_kaizen === 1 ? "" : "s"}, ${m.open_ncrs} open NCR${m.open_ncrs === 1 ? "" : "s"}; ${wasteSummary}.`,
    ];
    if (m.notable_events.length > 0) {
      narrative.push(`Notable: ${m.notable_events.join("; ")}.`);
    }

    const bullets: string[] = [
      `OEE ${m.oee_pct.toFixed(1)}% — ${oeeBand}`,
      `On-time ${m.on_time_pct.toFixed(1)}% — ${otBand}`,
      `Kaizen open: ${m.open_kaizen}`,
      `NCRs open: ${m.open_ncrs}`,
      wasteSummary,
    ];

    return Object.freeze({
      cadence: "weekly" as const,
      subject_kind: "department" as const,
      subject_id: m.department_code,
      narrative: Object.freeze(narrative),
      bullets: Object.freeze(bullets),
      kpi_callouts: Object.freeze({
        oee_pct: m.oee_pct,
        on_time_pct: m.on_time_pct,
        open_kaizen: m.open_kaizen,
        open_ncrs: m.open_ncrs,
      }),
      window_start: `${m.week_start}T00:00:00.000Z`,
      window_end: `${m.week_end}T23:59:59.999Z`,
      affected_departments: Object.freeze([m.department_code]),
    });
  }

  buildMonthlyCustomerSummary(m: MonthlyCustomerMetrics, customer_dept_code: string): DraftSummary {
    this.validateMonthly(m);
    if (!customer_dept_code) {
      throw new Error(
        "AISummaryWriterEngine.buildMonthlyCustomerSummary: customer_dept_code required (typically 'sales')",
      );
    }
    // Format dollars to the cent (hotel-soul: never round)
    const revenueDollars = Number(m.total_revenue_cents) / 100;
    const winRate = m.rfqs_received > 0 ? (m.rfqs_won / m.rfqs_received) * 100 : null;

    const narrative: string[] = [
      `Customer ${m.customer_id} for ${m.month}: ${m.orders_shipped} order${m.orders_shipped === 1 ? "" : "s"} shipped, on-time ${m.on_time_pct.toFixed(1)}%, revenue $${revenueDollars.toFixed(2)}.`,
      `RFQ activity: ${m.rfqs_won}/${m.rfqs_received} won${winRate !== null ? ` (${winRate.toFixed(0)}% win rate)` : ""}; ${m.open_complaints} open complaint${m.open_complaints === 1 ? "" : "s"}.`,
    ];
    if (m.notable_events.length > 0) {
      narrative.push(`Notable: ${m.notable_events.join("; ")}.`);
    }

    const bullets: string[] = [
      `${m.orders_shipped} orders shipped`,
      `On-time ${m.on_time_pct.toFixed(1)}%`,
      `Revenue $${revenueDollars.toFixed(2)}`,
      `RFQs ${m.rfqs_won}/${m.rfqs_received}${winRate !== null ? ` (${winRate.toFixed(0)}%)` : ""}`,
      `Open complaints: ${m.open_complaints}`,
    ];

    return Object.freeze({
      cadence: "monthly" as const,
      subject_kind: "customer" as const,
      subject_id: m.customer_id,
      narrative: Object.freeze(narrative),
      bullets: Object.freeze(bullets),
      kpi_callouts: Object.freeze({
        orders_shipped: m.orders_shipped,
        on_time_pct: m.on_time_pct,
        revenue_dollars: revenueDollars,
        rfqs_won: m.rfqs_won,
        rfqs_received: m.rfqs_received,
        open_complaints: m.open_complaints,
      }),
      window_start: `${m.month}-01T00:00:00.000Z`,
      window_end: `${m.month}-31T23:59:59.999Z`, // approx; bin uses YYYY-MM
      affected_departments: Object.freeze([customer_dept_code]),
    });
  }

  /** Submit a draft through G5. Returns the AI proposal id. */
  submitDraft(args: {
    draft: DraftSummary;
    explanation_ref: string;
    ttl_minutes?: number;
  }): string {
    if (!args.draft) {
      throw new Error(
        "AISummaryWriterEngine.submitDraft: draft required",
      );
    }
    if (!args.explanation_ref) {
      throw new Error(
        "AISummaryWriterEngine.submitDraft: explanation_ref required (Hotel AI invariant)",
      );
    }
    if (args.draft.affected_departments.length === 0) {
      throw new Error(
        "AISummaryWriterEngine.submitDraft: draft has no affected_departments",
      );
    }
    // Default TTL by cadence — operator can override
    const defaultTtl =
      args.draft.cadence === "daily" ? 240
      : args.draft.cadence === "weekly" ? 720
      : 1440; // monthly: 24h
    const submitted = aiProposalApprovalQueueEngine.submit({
      kind: "ai_summary",
      submitter_subsystem: "AISummaryWriterEngine",
      payload: {
        cadence: args.draft.cadence,
        subject_kind: args.draft.subject_kind,
        subject_id: args.draft.subject_id,
        narrative: args.draft.narrative,
        bullets: args.draft.bullets,
        kpi_callouts: args.draft.kpi_callouts,
        window_start: args.draft.window_start,
        window_end: args.draft.window_end,
      },
      explanation_ref: args.explanation_ref,
      affected_departments: [...args.draft.affected_departments],
      ttl_minutes: args.ttl_minutes ?? defaultTtl,
    });
    const cacheId = `SUMM-${String(this.nextId++).padStart(6, "0")}`;
    this.historyById.set(cacheId, args.draft);
    return submitted.id;
  }

  classifyCpk(cpk: number): "excellent" | "capable" | "marginal" | "not_capable" {
    if (!Number.isFinite(cpk) || cpk < 0) return "not_capable";
    if (cpk >= 1.67) return "excellent";
    if (cpk >= 1.33) return "capable";
    if (cpk >= 1.0) return "marginal";
    return "not_capable";
  }

  systemVizRoost(): SystemVizRoost {
    return Object.freeze({
      engine_name: "AISummaryWriterEngine",
      layer: 7,
      node_type: "hub",
      psn_legs: Object.freeze([3, 5, 11]), // Wiki, Tribal, PRISM AI
      edges_out: Object.freeze(["AIProposalApprovalQueueEngine"]),
      edges_in: Object.freeze([
        "EmployeeDailyDigestEngine",
        "ManagerDailyDashboardEngine",
        "ExecutiveSummaryEngine",
        "DepartmentEngine",
        "KaizenLeanSigmaEngine",
      ]),
    });
  }

  // ─── validation helpers ────────────────────────────────────────────────

  private validateDaily(m: DailyEmployeeMetrics): void {
    if (!m || !m.employee_id) {
      throw new Error("AISummaryWriterEngine: daily.employee_id required");
    }
    if (!m.department_code) {
      throw new Error("AISummaryWriterEngine: daily.department_code required");
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(m.shift_date)) {
      throw new Error(
        `AISummaryWriterEngine: daily.shift_date must be YYYY-MM-DD (got '${m.shift_date}')`,
      );
    }
    for (const [k, v] of Object.entries({
      parts_completed: m.parts_completed,
      setups_completed: m.setups_completed,
      cycle_time_ratio: m.cycle_time_ratio,
      cpk: m.cpk,
      waste_count: m.waste_count,
    })) {
      if (!Number.isFinite(v) || v < 0) {
        throw new Error(
          `AISummaryWriterEngine: daily.${k} must be a finite non-negative number (got ${v})`,
        );
      }
    }
  }

  private validateWeekly(m: WeeklyDepartmentMetrics): void {
    if (!m || !m.department_code) {
      throw new Error("AISummaryWriterEngine: weekly.department_code required");
    }
    if (!m.week_start || !m.week_end) {
      throw new Error("AISummaryWriterEngine: weekly.week_start/week_end required");
    }
    if (m.oee_pct < 0 || m.oee_pct > 100 || !Number.isFinite(m.oee_pct)) {
      throw new Error(
        `AISummaryWriterEngine: weekly.oee_pct must be 0..100 (got ${m.oee_pct})`,
      );
    }
    if (m.on_time_pct < 0 || m.on_time_pct > 100 || !Number.isFinite(m.on_time_pct)) {
      throw new Error(
        `AISummaryWriterEngine: weekly.on_time_pct must be 0..100 (got ${m.on_time_pct})`,
      );
    }
    if (!Number.isFinite(m.open_kaizen) || m.open_kaizen < 0) {
      throw new Error("AISummaryWriterEngine: weekly.open_kaizen must be finite non-negative");
    }
    if (!Number.isFinite(m.open_ncrs) || m.open_ncrs < 0) {
      throw new Error("AISummaryWriterEngine: weekly.open_ncrs must be finite non-negative");
    }
  }

  private validateMonthly(m: MonthlyCustomerMetrics): void {
    if (!m || !m.customer_id) {
      throw new Error("AISummaryWriterEngine: monthly.customer_id required");
    }
    if (!/^\d{4}-\d{2}$/.test(m.month)) {
      throw new Error(
        `AISummaryWriterEngine: monthly.month must be YYYY-MM (got '${m.month}')`,
      );
    }
    if (typeof m.total_revenue_cents !== "bigint") {
      throw new Error(
        "AISummaryWriterEngine: monthly.total_revenue_cents must be a bigint (PII-safe currency rounding to the cent)",
      );
    }
    if (m.total_revenue_cents < 0n) {
      throw new Error(
        `AISummaryWriterEngine: monthly.total_revenue_cents must be non-negative (got ${m.total_revenue_cents})`,
      );
    }
    for (const [k, v] of Object.entries({
      orders_shipped: m.orders_shipped,
      on_time_pct: m.on_time_pct,
      open_complaints: m.open_complaints,
      rfqs_received: m.rfqs_received,
      rfqs_won: m.rfqs_won,
    })) {
      if (!Number.isFinite(v) || v < 0) {
        throw new Error(
          `AISummaryWriterEngine: monthly.${k} must be a finite non-negative number (got ${v})`,
        );
      }
    }
    if (m.rfqs_won > m.rfqs_received) {
      throw new Error(
        `AISummaryWriterEngine: monthly.rfqs_won (${m.rfqs_won}) cannot exceed rfqs_received (${m.rfqs_received})`,
      );
    }
  }

  reset(): void {
    this.historyById.clear();
    this.nextId = 1;
  }
}

export const aiSummaryWriterEngine = new AISummaryWriterEngine();

export function allowedCadences(): ReadonlyArray<SummaryCadence> {
  return Object.freeze([...ALLOWED_CADENCES]);
}

export function allowedSubjectKinds(): ReadonlyArray<SummarySubjectKind> {
  return Object.freeze([...ALLOWED_SUBJECTS]);
}
