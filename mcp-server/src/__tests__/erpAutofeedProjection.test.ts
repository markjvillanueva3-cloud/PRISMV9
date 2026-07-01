/**
 * ErpAutofeedProjectionEngine tests -- QUOTING-ERP-AUTOFEED/U-ERP-PROJECTION.
 *
 * Verifies the read-only projection of a COMPLETED QuoteToShipResult into the
 * ERP-autofeed payload. The fixture mirrors the REAL per-stage `.output`
 * shapes the 28-stage pipeline emits (QUOTE/JOB_LIFECYCLE/TOOL_SELECTION/
 * MATERIAL_PROCUREMENT/SECONDARY_OPS/MAKE_VS_BUY/QUALITY). Asserts real
 * reference values map field-by-field, plus >=3 failure modes (missing /
 * failed / null-output stage) + >=2 adversarial inputs (not a result, NaN
 * cost, partial run). The CAD/CAM entitlement is proven to FAIL CLOSED, and
 * the employee-portal traveler/checklist compose is round-tripped through the
 * real TravelerGenerationOrchestratorEngine (not a fabricated shape).
 */
import { describe, it, expect } from "vitest";
import {
  erpAutofeedProjectionEngine as eng,
  type ProjectionInput,
} from "../engines/ErpAutofeedProjectionEngine.js";
import type {
  QuoteToShipResult,
  StageResult,
  PipelineStageId,
} from "../engines/QuoteToShipOrchestratorEngine.js";

function stage(
  id: PipelineStageId,
  status: StageResult["status"],
  output: Record<string, unknown> | null,
): StageResult {
  return {
    id,
    label: id,
    status,
    duration_ms: 1,
    result_summary: `${id} ${status}`,
    output,
    warnings: [],
    errors: [],
    completed_at: "2026-06-29T00:00:00.000Z",
  };
}

/** A realistic COMPLETED pipeline result mirroring real stage .output shapes. */
function completedResult(): QuoteToShipResult {
  return {
    pipeline_id: "PIPE-1001",
    status: "complete",
    stages: [
      stage("QUOTE", "pass", {
        quote_id: "Q-555",
        customer_id: "ALCOA",
        quoted_price: 1840.5,
        complexity: "medium",
        quantity: 25,
        cycle_time_min: 6.2,
        setup_time_min: 45,
        programming_hours: 2,
      }),
      // REAL executeJobLifecycle shape: output={ job, actual_cost: costReport, ... }
      // costReport.actual_cost = ActualCostEngine.calculate result (NESTED buckets).
      stage("JOB_LIFECYCLE", "pass", {
        job: { job_id: "JOB-1001", state: "created" },
        actual_cost: {
          job_id: "JOB-1001",
          actual_cost: {
            labor: { hours: 4, cost: 320 },
            material: { cost: 410, scrap_cost: 0, scrap_pct: 0 },
            tooling: { cost: 95, tools_used: 2, broken: 0 },
            machine: { hours: 6, cost: 540, rate_per_hour: 90 },
            overhead: { cost: 195.25, rate_pct: 18 },
            total_cost: 1560.25,
          },
          variance_report: [],
        },
        job_profitability: { margin_pct: 12 },
        gl_journal: { entry_id: "GL-1" },
        cost_savings: null,
      }),
      // REAL executeToolSelection shape: output={ tools, tool_wear_tco:{per_tool}, roi_advisor, tribal_tips }
      stage("TOOL_SELECTION", "pass", {
        tools: [
          { operation_id: "op-10", tool: { grade: "KC725M" }, roi: {} },
          { operation_id: "op-20", tool: { grade: "IC908" }, roi: {} },
        ],
        tool_wear_tco: {
          batch_quantity: 25,
          tools_analyzed: 2,
          per_tool: [
            { operation_id: "op-10", tool_grade: "KC725M", tool_life_min: 38, optimal_change_min: 30 },
            { operation_id: "op-20", tool_grade: "IC908", tool_life_min: 52, optimal_change_min: 45 },
          ],
        },
        roi_advisor: { recommend_upgrade: true, payback_months: 7.2 },
        tribal_tips: [],
      }),
      stage("MATERIAL_PROCUREMENT", "pass", {
        material_spec: "4140",
        stock: { form: "plate", order_vs_on_hand: "order", weight_kg: 4.1 },
        market_pricing: { usd_per_kg: 4.4 },
      }),
      stage("SECONDARY_OPS", "pass", { ops: ["anodize_type_ii"], op_count: 1 }),
      stage("MAKE_VS_BUY", "pass", {
        decisions: [
          { operation: "grind", decision: "make" },
          { operation: "anodize", decision: "buy" },
        ],
      }),
      // REAL executeQuality shape: output={ quality_management, fai_id, fai_report, ... }
      stage("QUALITY", "pass", {
        quality_management: { ok: true },
        fai_id: "FAI-1",
        fai_report: {
          part_number: "DEMO-PART-A",
          revision: "A",
          features: [{ feature_id: "F1", nominal: 20 }],
        },
        spc_charts: [],
        inspection_plan: {},
      }),
    ],
    total_cost_usd: 1560.25,
    lead_time_days: 12,
    program_paths: ["/programs/JOB-1001-op10.nc", "/programs/JOB-1001-op20.nc"],
    setup_sheet: { tools: 4, work_offset: "G54" },
    production_package: { ref: "PKG-1001" },
    total_duration_ms: 4200,
    warnings: ["Tight tolerance on bore -- verify gauge availability"],
    started_at: "2026-06-29T00:00:00.000Z",
    completed_at: "2026-06-29T00:01:00.000Z",
    pipeline_version: "1.0",
  };
}

/** Traveler-enabling job meta (features + stock + iso group). */
function jobMeta(): Partial<ProjectionInput> {
  return {
    job_id: "JOB-1001",
    part_number: "DEMO-PART-A",
    revision: "A",
    customer: "ALCOA",
    material_iso_group: "P",
    features: [
      { id: "p1", type: "pocket", dimensions: { width_mm: 40, length_mm: 40, depth_mm: 10 } },
      { id: "b1", type: "bore", dimensions: { diameter_mm: 20, depth_mm: 25 }, tolerance_mm: 0.008 },
    ],
    stock: { x_mm: 80, y_mm: 80, z_mm: 20 },
    batch_size: 25,
    quoted_finish: "anodize",
    now: "2026-06-29T12:00:00.000Z",
  };
}

describe("ErpAutofeedProjectionEngine -- field mapping (real reference values)", () => {
  it("maps front-office fields from the QUOTE stage + top-level lead time", () => {
    const p = eng.project({ result: completedResult(), ...jobMeta() });
    expect(p.front_office.quote_id).toBe("Q-555");
    expect(p.front_office.customer_id).toBe("ALCOA");
    expect(p.front_office.quoted_price_usd).toBe(1840.5);
    expect(p.front_office.quantity).toBe(25);
    expect(p.front_office.complexity).toBe("medium");
    expect(p.front_office.lead_time_days).toBe(12);
    expect(p.front_office.part_number).toBe("DEMO-PART-A");
    expect(p.front_office.revision).toBe("A");
    expect(p.front_office.complexity).toBe("medium");
  });

  it("falls back to the QUALITY fai_report part_number/revision when caller omits them", () => {
    // caller supplies NO part_number/revision; QUOTE stage has none either ->
    // the QUALITY fai_report (real pipeline source) must supply them.
    const meta = jobMeta();
    delete meta.part_number;
    delete meta.revision;
    const p = eng.project({ result: completedResult(), ...meta });
    expect(p.front_office.part_number).toBe("DEMO-PART-A");
    expect(p.front_office.revision).toBe("A");
  });

  it("maps the cost breakdown from JOB_LIFECYCLE.cost_breakdown + top-level total", () => {
    const p = eng.project({ result: completedResult(), ...jobMeta() });
    expect(p.cost_breakdown.total_cost_usd).toBe(1560.25);
    expect(p.cost_breakdown.labor_usd).toBe(320);
    expect(p.cost_breakdown.material_usd).toBe(410);
    expect(p.cost_breakdown.tooling_usd).toBe(95);
    expect(p.cost_breakdown.machine_usd).toBe(540);
    expect(p.cost_breakdown.overhead_usd).toBe(195.25);
    expect(p.cost_breakdown.cycle_time_min).toBe(6.2);
    expect(p.cost_breakdown.setup_time_min).toBe(45);
  });

  it("maps tool selections + upgrade ROI from TOOL_SELECTION.output", () => {
    const p = eng.project({ result: completedResult(), ...jobMeta() });
    expect(p.tooling.selections.length).toBe(2);
    expect(p.tooling.selections[0].operation_id).toBe("op-10");
    expect(p.tooling.selections[0].tool_grade).toBe("KC725M");
    expect(p.tooling.selections[0].tool_life_min).toBe(38);
    expect(p.tooling.upgrade_roi).toEqual({ recommend_upgrade: true, payback_months: 7.2 });
  });

  it("maps material order-vs-stock from MATERIAL_PROCUREMENT.output", () => {
    const p = eng.project({ result: completedResult(), ...jobMeta() });
    expect(p.material.material_spec).toBe("4140");
    expect(p.material.stock).toEqual({ form: "plate", order_vs_on_hand: "order", weight_kg: 4.1 });
    expect(p.material.market_pricing).toEqual({ usd_per_kg: 4.4 });
  });

  it("maps secondary ops + the make-vs-buy outsource verdict", () => {
    const p = eng.project({ result: completedResult(), ...jobMeta() });
    expect(p.secondary_ops.secondary_ops).toEqual({ ops: ["anodize_type_ii"], op_count: 1 });
    const decisions = (p.secondary_ops.make_vs_buy as { decisions: unknown[] }).decisions;
    expect(decisions.length).toBe(2);
  });

  it("maps the QC plan from the QUALITY stage", () => {
    const p = eng.project({ result: completedResult(), ...jobMeta() });
    expect(p.quality.fai).not.toBeNull();
    expect((p.quality.fai as { part_number: string }).part_number).toBe("DEMO-PART-A");
  });
});

describe("ErpAutofeedProjectionEngine -- CAD/CAM entitlement (FAILS CLOSED)", () => {
  it("WITHHOLDS CAD/CAM program paths + setup sheet when cadcam_paid is absent", () => {
    const p = eng.project({ result: completedResult(), ...jobMeta() }); // no cadcam_paid
    expect(p.cad_cam.entitled).toBe(false);
    expect(p.cad_cam.program_paths).toEqual([]);
    expect(p.cad_cam.setup_sheet).toBeNull();
  });

  it("WITHHOLDS CAD/CAM when cadcam_paid is a truthy non-true (no caller bypass)", () => {
    // only an exact boolean true entitles -- a string/number must not bypass.
    const p = eng.project({ result: completedResult(), ...jobMeta(), cadcam_paid: "yes" as unknown as boolean });
    expect(p.cad_cam.entitled).toBe(false);
    expect(p.cad_cam.program_paths).toEqual([]);
  });

  it("POPULATES CAD/CAM only when cadcam_paid === true", () => {
    const p = eng.project({ result: completedResult(), ...jobMeta(), cadcam_paid: true });
    expect(p.cad_cam.entitled).toBe(true);
    expect(p.cad_cam.program_paths.length).toBe(2);
    expect(p.cad_cam.setup_sheet).toEqual({ tools: 4, work_offset: "G54" });
  });
});

describe("ErpAutofeedProjectionEngine -- employee portal (traveler + checklist compose)", () => {
  it("composes a real routed traveler + per-step checklists through the real engine", () => {
    const p = eng.project({ result: completedResult(), ...jobMeta() });
    expect(p.employee_portal.traveler).not.toBeNull();
    expect(p.employee_portal.traveler!.steps.length).toBeGreaterThan(0);
    // every step carries a department + a checklist (the portal fan-out)
    for (const s of p.employee_portal.traveler!.steps) {
      expect(typeof s.department).toBe("string");
      expect(Array.isArray(s.checklist)).toBe(true);
    }
    expect(p.employee_portal.checklist).not.toBeNull();
    expect(p.employee_portal.checklist!.total_required).toBeGreaterThan(0);
  });

  it("leaves the portal empty (fail-soft) when no features/stock to route", () => {
    // job meta WITHOUT features/stock -> cannot route a traveler
    const p = eng.project({ result: completedResult(), job_id: "JOB-X", part_number: "X" });
    expect(p.employee_portal.traveler).toBeNull();
    expect(p.employee_portal.checklist).toBeNull();
    expect(p.gaps.some((g) => g.stage === "PROCESS_PLAN")).toBe(true);
  });
});

describe("ErpAutofeedProjectionEngine -- lean / manager notes (advisory)", () => {
  it("surfaces the outsource watch-out + pipeline warnings, always advisory", () => {
    const p = eng.project({ result: completedResult(), ...jobMeta() });
    expect(p.manager_notes.advisory).toBe(true);
    // pipeline warning is a watch-out
    expect(p.manager_notes.lean_watchouts.some((w) => /tight tolerance/i.test(w))).toBe(true);
    // the "buy/outsource" decision raises a manager note
    expect(p.manager_notes.manager_notes.some((n) => /outsource/i.test(n))).toBe(true);
  });

  it("flags a high setup:cycle ratio as a SMED lean watch-out", () => {
    // setup 45 vs cycle 6.2 -> 45 > 6.2*3 -> SMED note
    const p = eng.project({ result: completedResult(), ...jobMeta() });
    expect(p.manager_notes.lean_watchouts.some((w) => /SMED|setup/i.test(w))).toBe(true);
  });
});

describe("ErpAutofeedProjectionEngine -- failure modes (>=3) + adversarial (>=2)", () => {
  it("FAILURE 1: a MISSING stage records a gap + nulls the field, never throws", () => {
    const r = completedResult();
    r.stages = r.stages.filter((s) => s.id !== "TOOL_SELECTION");
    const p = eng.project({ result: r, ...jobMeta() });
    expect(p.tooling.selections).toEqual([]);
    expect(p.tooling.upgrade_roi).toBeNull();
    expect(p.gaps.some((g) => g.stage === "TOOL_SELECTION" && g.reason === "missing")).toBe(true);
  });

  it("FAILURE 2: a FAILED stage records a gap + nulls the field", () => {
    const r = completedResult();
    const q = r.stages.find((s) => s.id === "QUOTE")!;
    q.status = "fail";
    const p = eng.project({ result: r, ...jobMeta() });
    expect(p.front_office.quote_id).toBeNull();
    expect(p.gaps.some((g) => g.stage === "QUOTE" && g.reason === "failed")).toBe(true);
  });

  it("FAILURE 3: a NULL-output stage records a null_output gap", () => {
    const r = completedResult();
    const m = r.stages.find((s) => s.id === "MATERIAL_PROCUREMENT")!;
    m.output = null;
    const p = eng.project({ result: r, ...jobMeta() });
    expect(p.material.material_spec).toBeNull();
    expect(p.gaps.some((g) => g.stage === "MATERIAL_PROCUREMENT" && g.reason === "null_output")).toBe(true);
  });

  it("FAILURE 4: a SKIPPED (optional) stage records a skipped gap", () => {
    const r = completedResult();
    const mvb = r.stages.find((s) => s.id === "MAKE_VS_BUY")!;
    mvb.status = "skip";
    const p = eng.project({ result: r, ...jobMeta() });
    expect(p.secondary_ops.make_vs_buy).toBeNull();
    expect(p.gaps.some((g) => g.stage === "MAKE_VS_BUY" && g.reason === "skipped")).toBe(true);
  });

  it("ADVERSARIAL 1: a non-result input THROWS a descriptive error", () => {
    expect(() => eng.project({ result: null as unknown as QuoteToShipResult })).toThrow(/must be a QuoteToShipResult/);
    expect(() => eng.project({ result: { stages: "nope" } as unknown as QuoteToShipResult })).toThrow(/stages\[\] array/);
  });

  it("ADVERSARIAL 2: NaN / Infinity cost values project to null, never propagate", () => {
    const r = completedResult();
    const j = r.stages.find((s) => s.id === "JOB_LIFECYCLE")!;
    const buckets = (j.output as { actual_cost: { actual_cost: Record<string, { cost: number }> } })
      .actual_cost.actual_cost;
    buckets.labor.cost = NaN;
    buckets.material.cost = Infinity;
    r.total_cost_usd = NaN;
    const p = eng.project({ result: r, ...jobMeta() });
    expect(p.cost_breakdown.labor_usd).toBeNull();
    expect(p.cost_breakdown.material_usd).toBeNull();
    // total falls back to the nested actual_cost.total_cost (finite) when top-level is NaN
    expect(p.cost_breakdown.total_cost_usd).toBe(1560.25);
  });

  it("ADVERSARIAL 3: a PARTIAL run (only QUOTE passed) still projects what completed", () => {
    const r = completedResult();
    r.status = "partial";
    r.stages = r.stages.filter((s) => s.id === "QUOTE");
    const p = eng.project({ result: r, ...jobMeta() });
    expect(p.pipeline_status).toBe("partial");
    expect(p.front_office.quote_id).toBe("Q-555"); // QUOTE still read
    expect(p.cost_breakdown.labor_usd).toBeNull(); // JOB_LIFECYCLE absent
    expect(p.gaps.length).toBeGreaterThan(0);
  });
});
