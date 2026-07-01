/**
 * ErpAutofeedProjectionEngine -- QUOTING-ERP-AUTOFEED/U-ERP-PROJECTION.
 *
 * READ-ONLY projection layer that consumes a COMPLETED `QuoteToShipResult`
 * (the 28-stage print->ship pipeline output) and projects it into a single
 * `ErpAutofeedPayload`: the department / front-office / business-management
 * field-map a job needs when it passes through the shop, plus the
 * per-department / per-employee task+checkbox fan-out (composed from the
 * existing TravelerGenerationOrchestratorEngine + JobChecklistEngine) and the
 * advisory lean / manager-notes block.
 *
 * DESIGN (safety-first, R8/R7):
 *  - This engine NEVER mutates the 5450-line QuoteToShipOrchestratorEngine
 *    spine. It only READS a completed result. The spine stays byte-identical.
 *  - Every value is COMPOSED from an existing stage's `.output` or a top-level
 *    typed field -- nothing is recomputed (no second cost model, no 4th
 *    traveler store, no 2nd job package). It is pure connective tissue.
 *  - Reads are DEFENSIVE: a missing / failed / null stage yields a null field
 *    on the payload (with a recorded gap), never a throw -- a partial pipeline
 *    run must still project what completed (R12 fail-soft on a read).
 *  - CAD/CAM fields are entitlement-gated and FAIL CLOSED: an absent or
 *    unverified `cadcam_paid` entitlement withholds the CAD/CAM projection.
 *  - SoD on the employee-portal checklist is enforced by JobChecklistEngine
 *    itself (fail-closed for an unidentified actor); this engine only attaches
 *    the generated checklists and never widens their visibility.
 *
 * NO physics constants here -- pure projection. No I/O. No state.
 */

import type {
  QuoteToShipResult,
  StageResult,
  PipelineStageId,
} from "./QuoteToShipOrchestratorEngine.js";
import {
  travelerGenerationOrchestratorEngine,
  type GeneratedTraveler,
  type TravelerGenerationInput,
} from "./TravelerGenerationOrchestratorEngine.js";
import { jobChecklistEngine, type JobChecklist } from "./JobChecklistEngine.js";
import type { PartFeature } from "./ProcessPlanEngine.js";

// ============================================================================
// PAYLOAD TYPES -- the ERP/department/office/management field-map
// ============================================================================

/** A single read gap recorded when a stage was missing / failed / null. */
export interface ProjectionGap {
  /** The pipeline stage whose output could not be read. */
  stage: PipelineStageId;
  /** Why the field is absent (missing | failed | skipped | null-output). */
  reason: "missing" | "failed" | "skipped" | "null_output";
}

/** Front-office / sales-desk field block. */
export interface FrontOfficeFields {
  quote_id: string | null;
  customer_id: string | null;
  part_number: string | null;
  revision: string | null;
  quantity: number | null;
  quoted_price_usd: number | null;
  lead_time_days: number | null;
  complexity: string | null;
}

/** Cost-analysis breakdown block (management / accounting). */
export interface CostBreakdownFields {
  total_cost_usd: number | null;
  /** Per-bucket costs when JOB_LIFECYCLE produced them. */
  labor_usd: number | null;
  material_usd: number | null;
  tooling_usd: number | null;
  machine_usd: number | null;
  overhead_usd: number | null;
  cycle_time_min: number | null;
  setup_time_min: number | null;
  programming_hours: number | null;
}

/** A tool/machine selection line with its upgrade-ROI signal. */
export interface ToolSelectionLine {
  operation_id: string | null;
  tool_grade: string | null;
  tool_life_min: number | null;
  optimal_change_min: number | null;
}

/** Tool + machine selection block (incl upgrade ROI from the TOOL_SELECTION stage). */
export interface ToolingFields {
  selections: ToolSelectionLine[];
  /** Machine/tool upgrade ROI advisory, when the stage emitted one. */
  upgrade_roi: Record<string, unknown> | null;
}

/** Material order-vs-stock block (procurement). */
export interface MaterialFields {
  material_spec: string | null;
  /** Resolved stock decision (size / form / order-vs-on-hand). */
  stock: Record<string, unknown> | null;
  /** Market pricing when MATERIAL_PROCUREMENT priced it. */
  market_pricing: Record<string, unknown> | null;
}

/** Secondary-operations + outsource block. */
export interface SecondaryOpsFields {
  /** Secondary ops (heat-treat / plating / NDT) resolved for the job. */
  secondary_ops: Record<string, unknown> | null;
  /** Make-vs-buy / outsource decisions per operation. */
  make_vs_buy: Record<string, unknown> | null;
}

/** Quality / QC-sheet block. */
export interface QualityFields {
  /** FAI / inspection plan from the QUALITY stage. */
  fai: Record<string, unknown> | null;
}

/** CAD/CAM document block -- WITHHELD unless the job is entitled. */
export interface CadCamFields {
  /** True = the entitlement was verified and CAD/CAM fields are populated. */
  entitled: boolean;
  /** Generated CNC program paths (only when entitled). */
  program_paths: string[];
  /** Setup sheet (only when entitled). */
  setup_sheet: Record<string, unknown> | null;
}

/** Per-employee task + checkbox fan-out for the portal. */
export interface EmployeePortalFields {
  /** The generated print->ship traveler (per-department routed steps). */
  traveler: GeneratedTraveler | null;
  /** The stateful per-job checklist (per step x item check-off). */
  checklist: JobChecklist | null;
}

/** Advisory lean / manager-notes block (NEVER gates the job). */
export interface ManagerNotesFields {
  /** Lean-manufacturing watch-outs + manager notes (advisory only). */
  lean_watchouts: string[];
  manager_notes: string[];
  /** Always true -- this block is advisory and must never block a job. */
  advisory: true;
}

/** The full ERP-autofeed payload a job materializes into. */
export interface ErpAutofeedPayload {
  /** Source pipeline run id (traceability). */
  pipeline_id: string;
  /** Source pipeline status (complete | partial | failed | awaiting_approval). */
  pipeline_status: QuoteToShipResult["status"];
  /** Job id assigned to this materialization (caller-supplied or derived). */
  job_id: string;
  front_office: FrontOfficeFields;
  cost_breakdown: CostBreakdownFields;
  tooling: ToolingFields;
  material: MaterialFields;
  secondary_ops: SecondaryOpsFields;
  quality: QualityFields;
  cad_cam: CadCamFields;
  employee_portal: EmployeePortalFields;
  manager_notes: ManagerNotesFields;
  /** Per-stage read gaps (R12 transparency -- which fields could not be read). */
  gaps: ProjectionGap[];
  /** ISO timestamp the projection was produced. */
  projected_at: string;
}

/** Job metadata + entitlements supplied alongside the pipeline result. */
export interface ProjectionInput {
  /** Completed (or partial) pipeline result to project. */
  result: QuoteToShipResult;
  /** Job id for the materialization (defaults to the pipeline_id). */
  job_id?: string;
  /** Part number for the traveler (falls back to the QUALITY stage's value). */
  part_number?: string;
  revision?: string;
  customer?: string;
  /** Material ISO group for the traveler (P/M/K/N/S/H). Defaults "P". */
  material_iso_group?: string;
  material_name?: string;
  /** Part features for the traveler (drives dept inclusion). */
  features?: PartFeature[];
  /** Stock envelope (mm) for the traveler. */
  stock?: { x_mm: number; y_mm: number; z_mm: number };
  batch_size?: number;
  quoted_finish?: string;
  has_proven_program?: boolean;
  stock_precut?: boolean;
  /** ENTITLEMENT: true ONLY when the authenticated job/customer record proves
   *  the CAD/CAM option was paid for. MUST come from the verified record, not
   *  caller input passed straight through -- fails closed when absent. */
  cadcam_paid?: boolean;
  /** ISO timestamp (injectable for deterministic tests). */
  now?: string;
}

// ============================================================================
// ENGINE
// ============================================================================

const ISO_GROUPS = new Set(["P", "M", "K", "N", "S", "H"]);

class ErpAutofeedProjectionEngine {
  /**
   * Find a stage's result by id, recording a gap when it is absent / not a
   * pass. Returns the StageResult only when it passed AND carries output.
   *
   * @param result - the completed pipeline result
   * @param stage - the stage id to read
   * @param gaps - the running gap list (mutated)
   * @returns the passing StageResult with output, or null
   */
  private readStage(
    result: QuoteToShipResult,
    stage: PipelineStageId,
    gaps: ProjectionGap[],
  ): StageResult | null {
    const s = result.stages.find((x) => x.id === stage);
    if (!s) {
      gaps.push({ stage, reason: "missing" });
      return null;
    }
    if (s.status === "fail") {
      gaps.push({ stage, reason: "failed" });
      return null;
    }
    if (s.status === "skip" || s.status === "pending" || s.status === "blocked") {
      gaps.push({ stage, reason: "skipped" });
      return null;
    }
    if (s.output == null) {
      gaps.push({ stage, reason: "null_output" });
      return null;
    }
    return s;
  }

  /** Safe finite-number read; returns null for NaN / Infinity / non-number. */
  private num(v: unknown): number | null {
    return typeof v === "number" && Number.isFinite(v) ? v : null;
  }

  /**
   * Read a USD figure from an ActualCostEngine bucket. The buckets are NESTED
   * objects carrying a `.cost` (e.g. labor:{hours,cost}); accept either the
   * nested object's `.cost` or a bare number for forward-compat.
   */
  private bucketCost(v: unknown): number | null {
    const direct = this.num(v);
    if (direct != null) return direct;
    const o = this.obj(v);
    return o ? this.num(o.cost) : null;
  }

  /** Safe string read; returns null for non-string / empty. */
  private str(v: unknown): string | null {
    return typeof v === "string" && v.trim().length > 0 ? v : null;
  }

  /** Safe object read; returns null for non-object / null. */
  private obj(v: unknown): Record<string, unknown> | null {
    return v != null && typeof v === "object" && !Array.isArray(v)
      ? (v as Record<string, unknown>)
      : null;
  }

  /**
   * Project a completed QuoteToShipResult into the ERP-autofeed payload.
   *
   * Pure + read-only. Never mutates `input.result`. Never throws on a missing
   * stage -- records a gap and yields a null field instead. CAD/CAM fields are
   * withheld unless `cadcam_paid === true`.
   *
   * @param input - the completed result + job meta + entitlement
   * @returns the assembled ErpAutofeedPayload
   * @throws only when `input.result` is not a QuoteToShipResult-shaped object
   */
  project(input: ProjectionInput): ErpAutofeedPayload {
    const result = input?.result;
    if (
      result == null ||
      typeof result !== "object" ||
      !Array.isArray((result as QuoteToShipResult).stages)
    ) {
      throw new Error(
        "ErpAutofeedProjectionEngine.project: input.result must be a QuoteToShipResult with a stages[] array",
      );
    }

    const gaps: ProjectionGap[] = [];
    const jobId = this.str(input.job_id) ?? result.pipeline_id;
    const now = this.str(input.now) ?? new Date().toISOString();

    // ---- FRONT OFFICE (from QUOTE stage + top-level lead time) ----
    const quoteStage = this.readStage(result, "QUOTE", gaps);
    const quoteOut = quoteStage ? this.obj(quoteStage.output) : null;
    // Peek the QUALITY fai_report for a part_number/revision fallback WITHOUT
    // recording a gap here (the QUALITY block below owns the gap for that stage).
    const faiReportPeek = this.obj(
      this.obj(result.stages.find((s) => s.id === "QUALITY")?.output)?.fai_report,
    );
    const faiPartNumber = faiReportPeek?.part_number;
    const faiRevision = faiReportPeek?.revision;
    const front_office: FrontOfficeFields = {
      quote_id: this.str(quoteOut?.quote_id),
      customer_id: this.str(quoteOut?.customer_id),
      // part_number/revision: caller -> QUOTE stage -> QUALITY fai_report
      // (the FAI report is where the pipeline records the real part_number).
      part_number:
        this.str(input.part_number) ??
        this.str(quoteOut?.part_number) ??
        this.str(faiPartNumber) ??
        null,
      revision:
        this.str(input.revision) ??
        this.str(quoteOut?.revision) ??
        this.str(faiRevision),
      quantity: this.num(quoteOut?.quantity),
      // The QUOTE stage carries price under quoteOut.pricing.{total_price,unit_price}
      // (not a flat quoted_price). Fall through to the top-level cost when the margin
      // floor nulled the published price so the ERP still sees a cost figure.
      quoted_price_usd:
        this.num(quoteOut?.quoted_price) ??
        this.num(quoteOut?.quoted_price_usd) ??
        this.num(this.obj(quoteOut?.pricing)?.total_price) ??
        this.num(result.total_cost_usd),
      // lead_time lives in quoteOut.lead_time.total_standard_days; the top-level
      // result.lead_time_days is not populated by the scheduling stage.
      lead_time_days:
        this.num(result.lead_time_days) ??
        this.num(this.obj(quoteOut?.lead_time)?.total_standard_days),
      complexity: this.str(quoteOut?.complexity),
    };

    // ---- COST BREAKDOWN (from JOB_LIFECYCLE stage + top-level total) ----
    // Real shape (QuoteToShipOrchestratorEngine executeJobLifecycle):
    //   output = { job, actual_cost: costReport, job_profitability, gl_journal, cost_savings }
    //   costReport = { job_id, actual_cost: <ActualCostEngine.calculate>, variance_report, ... }
    //   ActualCostEngine buckets are NESTED objects carrying a `.cost`:
    //     labor:{hours,cost} material:{cost,scrap_cost} tooling:{cost,...}
    //     machine:{hours,cost} overhead:{cost,rate_pct} total_cost:<number>
    const jobStage = this.readStage(result, "JOB_LIFECYCLE", gaps);
    const jobOut = jobStage ? this.obj(jobStage.output) : null;
    const costReport = this.obj(jobOut?.actual_cost);
    const actualCost = this.obj(costReport?.actual_cost);
    const cost_breakdown: CostBreakdownFields = {
      total_cost_usd:
        this.num(result.total_cost_usd) ?? this.num(actualCost?.total_cost),
      labor_usd: this.bucketCost(actualCost?.labor),
      material_usd: this.bucketCost(actualCost?.material),
      tooling_usd: this.bucketCost(actualCost?.tooling),
      machine_usd: this.bucketCost(actualCost?.machine),
      overhead_usd: this.bucketCost(actualCost?.overhead),
      // Cycle/setup/programming time live under quoteOut.costs.{machining,setup,
      // programming}, not as flat quoteOut.cycle_time_min keys.
      cycle_time_min:
        this.num(quoteOut?.cycle_time_min) ??
        this.num(this.obj(this.obj(quoteOut?.costs)?.machining)?.cycle_time_min),
      setup_time_min:
        this.num(quoteOut?.setup_time_min) ??
        this.num(this.obj(this.obj(quoteOut?.costs)?.setup)?.setup_minutes),
      programming_hours:
        this.num(quoteOut?.programming_hours) ??
        this.num(this.obj(this.obj(quoteOut?.costs)?.programming)?.hours),
    };

    // ---- TOOLING + UPGRADE ROI (from TOOL_SELECTION stage) ----
    // Real shape (executeToolSelection):
    //   output = { tools, tool_wear_tco: { per_tool: [...] }, roi_advisor, tribal_tips }
    //   The per-op grade/life/change live in tool_wear_tco.per_tool[]:
    //     { operation_id, tool_grade, tool_life_min, optimal_change_min, ... }
    const toolStage = this.readStage(result, "TOOL_SELECTION", gaps);
    const toolOut = toolStage ? this.obj(toolStage.output) : null;
    const tco = this.obj(toolOut?.tool_wear_tco);
    const perTool = Array.isArray(tco?.per_tool) ? (tco!.per_tool as unknown[]) : [];
    const selections: ToolSelectionLine[] = perTool.map((raw) => {
      const t = this.obj(raw) ?? {};
      return {
        operation_id: this.str(t.operation_id),
        tool_grade: this.str(t.tool_grade),
        tool_life_min: this.num(t.tool_life_min),
        optimal_change_min: this.num(t.optimal_change_min),
      };
    });
    const tooling: ToolingFields = {
      selections,
      upgrade_roi: this.obj(toolOut?.roi_advisor),
    };

    // ---- MATERIAL ORDER-VS-STOCK (from MATERIAL_PROCUREMENT stage) ----
    const matStage = this.readStage(result, "MATERIAL_PROCUREMENT", gaps);
    const matOut = matStage ? this.obj(matStage.output) : null;
    const material: MaterialFields = {
      material_spec: this.str(matOut?.material_spec),
      stock: this.obj(matOut?.stock),
      market_pricing: this.obj(matOut?.market_pricing),
    };

    // ---- SECONDARY OPS + MAKE-VS-BUY / OUTSOURCE ----
    const secStage = this.readStage(result, "SECONDARY_OPS", gaps);
    const mvbStage = this.readStage(result, "MAKE_VS_BUY", gaps);
    // The SECONDARY_OPS stage output can be null/empty; the QUOTE stage's
    // costs.secondary_ops carries the resolved secondary-op list (e.g. heat-treat,
    // black-oxide) the quote priced -- use it as the fallback so the ERP always sees
    // the secondary-op plan when one exists.
    const quoteSecondaryOps = this.obj(this.obj(quoteOut?.costs)?.secondary_ops);
    const secondary_ops: SecondaryOpsFields = {
      secondary_ops: (secStage ? this.obj(secStage.output) : null) ?? quoteSecondaryOps,
      make_vs_buy: mvbStage ? this.obj(mvbStage.output) : null,
    };

    // ---- QUALITY / QC SHEET ----
    // Real shape (executeQuality): output = { quality_management, fai_id,
    //   fai_report, spc_charts, cpk_summary, metrology, inspection_plan, ... }
    // The FAI plan (with the part_number/revision/features) is fai_report.
    const qualStage = this.readStage(result, "QUALITY", gaps);
    const qualOut = qualStage ? this.obj(qualStage.output) : null;
    const faiReport = this.obj(qualOut?.fai_report);
    const quality: QualityFields = {
      fai: faiReport ?? qualOut,
    };

    // ---- CAD/CAM (ENTITLEMENT-GATED, FAILS CLOSED) ----
    const entitled = input.cadcam_paid === true;
    const cad_cam: CadCamFields = {
      entitled,
      program_paths: entitled ? [...(result.program_paths ?? [])] : [],
      setup_sheet: entitled ? this.obj(result.setup_sheet) : null,
    };

    // ---- EMPLOYEE PORTAL (traveler + checklist, SoD enforced downstream) ----
    const employee_portal = this.buildEmployeePortal(input, jobId, front_office, gaps);

    // ---- LEAN / MANAGER NOTES (advisory) ----
    const manager_notes = this.buildManagerNotes(
      result,
      gaps,
      secondary_ops,
      cost_breakdown,
    );

    return {
      pipeline_id: result.pipeline_id,
      pipeline_status: result.status,
      job_id: jobId,
      front_office,
      cost_breakdown,
      tooling,
      material,
      secondary_ops,
      quality,
      cad_cam,
      employee_portal,
      manager_notes,
      gaps,
      projected_at: now,
    };
  }

  /**
   * Compose the per-employee portal fan-out by generating the traveler +
   * attaching its checklists. Read-only w.r.t. the pipeline; the checklist's
   * SoD guard (fail-closed for an unidentified actor) lives in
   * JobChecklistEngine and is NOT widened here.
   */
  private buildEmployeePortal(
    input: ProjectionInput,
    jobId: string,
    front: FrontOfficeFields,
    gaps: ProjectionGap[],
  ): EmployeePortalFields {
    // Traveler needs a material ISO group + features + stock. When the caller
    // did not supply them we cannot generate a meaningful routed traveler --
    // record a gap and return nulls rather than fabricate a route.
    const iso = (input.material_iso_group ?? "P").toUpperCase();
    const isoGroup = ISO_GROUPS.has(iso) ? iso : "P";
    const features = Array.isArray(input.features) ? input.features : [];
    const stock = input.stock;
    const partNumber = front.part_number ?? input.part_number;

    if (!partNumber || !stock) {
      // Not enough to route a traveler -- portal stays empty (fail-soft).
      gaps.push({ stage: "PROCESS_PLAN", reason: "missing" });
      return { traveler: null, checklist: null };
    }

    try {
      const travelerInput: TravelerGenerationInput = {
        job_id: jobId,
        part_number: partNumber,
        revision: input.revision,
        customer: input.customer ?? front.customer_id ?? undefined,
        material_iso_group: isoGroup,
        material_name: input.material_name,
        features,
        stock,
        batch_size: input.batch_size ?? front.quantity ?? 1,
        quoted_finish: input.quoted_finish,
        has_proven_program: input.has_proven_program,
        stock_precut: input.stock_precut,
      };
      const traveler = travelerGenerationOrchestratorEngine.generate(travelerInput);
      const checklist = jobChecklistEngine.attachChecklists(jobId, traveler.steps);
      return { traveler, checklist };
    } catch {
      // Traveler generation failed (e.g. invalid features) -- fail soft so the
      // rest of the ERP autofeed still materializes.
      gaps.push({ stage: "PROCESS_PLAN", reason: "failed" });
      return { traveler: null, checklist: null };
    }
  }

  /**
   * Assemble the advisory lean / manager-notes block from pipeline signals.
   * This block is ADVISORY ONLY -- it never gates or blocks the job. Notes are
   * derived from real pipeline state (warnings, outsource verdicts, cost), not
   * fabricated.
   */
  private buildManagerNotes(
    result: QuoteToShipResult,
    gaps: ProjectionGap[],
    secondary: SecondaryOpsFields,
    cost: CostBreakdownFields,
  ): ManagerNotesFields {
    const lean_watchouts: string[] = [];
    const manager_notes: string[] = [];

    // Pipeline-level warnings are operator watch-outs.
    for (const w of result.warnings ?? []) {
      if (typeof w === "string" && w.trim().length > 0) lean_watchouts.push(w);
    }

    // Outsourced operations are a lean / scheduling watch-out (part leaves the
    // building -> queue + transit risk).
    const mvb = secondary.make_vs_buy;
    const decisions = Array.isArray(mvb?.decisions) ? (mvb!.decisions as unknown[]) : [];
    const buyCount = decisions.filter((d) => {
      const o = this.obj(d);
      const verdict = this.str(o?.decision) ?? this.str(o?.verdict);
      return verdict != null && /buy|outsource/i.test(verdict);
    }).length;
    if (buyCount > 0) {
      manager_notes.push(
        `${buyCount} operation(s) flagged make-vs-buy as OUTSOURCE -- confirm vendor lead time + transit in the schedule.`,
      );
    }

    // A high setup-to-cycle ratio is a lean SMED watch-out.
    if (
      cost.setup_time_min != null &&
      cost.cycle_time_min != null &&
      cost.cycle_time_min > 0 &&
      cost.setup_time_min > cost.cycle_time_min * 3
    ) {
      lean_watchouts.push(
        `Setup time (${cost.setup_time_min} min) is high vs cycle (${cost.cycle_time_min} min) -- SMED / fixture review may cut setup waste.`,
      );
    }

    // Read gaps are a data-completeness note for the planner.
    if (gaps.length > 0) {
      manager_notes.push(
        `${gaps.length} pipeline stage(s) did not produce data (${gaps
          .map((g) => g.stage)
          .join(", ")}) -- some ERP fields are incomplete.`,
      );
    }

    return { lean_watchouts, manager_notes, advisory: true };
  }
}

export const erpAutofeedProjectionEngine = new ErpAutofeedProjectionEngine();
