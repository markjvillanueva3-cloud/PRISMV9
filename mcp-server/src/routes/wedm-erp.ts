/**
 * PRISM MCP Server — WEDM ERP Routes
 *
 * WEDM-ERP-MS0 U-WEDM-ERP04..07
 *
 * Consolidates the WEDM-specific quote, job, and invoice endpoints into
 * a single router. Engines are called directly rather than through the
 * dispatcher because this is a focused vertical and the dispatcher
 * layer would only add indirection without adding value.
 *
 * Endpoints:
 *   Quote   (U-WEDM-ERP04-05)
 *     POST /quote/estimate           quick cost estimate from dimensions
 *     POST /quote/from-program       quote from generated WEDMProgramResult
 *     POST /quote/quantity-breaks    cost per part across qty list
 *     POST /quote/credit-cost        credit units for credit-based plans
 *     POST /quote/create             persist full quote with line items
 *
 *   ERP     (U-WEDM-ERP06-07)
 *     POST /job/create               create job packet from program
 *     POST /job/:id/complete         mark complete, build invoice draft
 *     POST /overage/:id/approve      customer approves pending overage
 *     POST /overage/:id/reject       customer rejects overage
 *
 * All endpoints are protected with verifyToken except /quote/estimate
 * (quick dimensional estimate, no auth required for prospects).
 */
import { Router, type Request, type Response } from "express";
import { verifyToken } from "../middleware/auth.js";
import { EDMCostDocumentationEngine, type CostInput } from "../engines/EDMCostDocumentationEngine.js";
import { WEDMQuoteBridgeEngine } from "../engines/WEDMQuoteBridgeEngine.js";
import { WEDMCreditCostEngine } from "../engines/WEDMCreditCostEngine.js";
import { WEDMJobCreatorEngine } from "../engines/WEDMJobCreatorEngine.js";
import { WEDMInvoiceLineEngine } from "../engines/WEDMInvoiceLineEngine.js";
import { WEDMOverageApprovalEngine } from "../engines/WEDMOverageApprovalEngine.js";
import {
  wedmEstimateSchema,
  wedmFromProgramSchema,
  wedmQuantityBreaksSchema,
  wedmCreditCostSchema,
  wedmQuoteCreateSchema,
  wedmQuoteUpdateSchema,
  wedmQuoteSendSchema,
  wedmBatchEstimateSchema,
  wedmCompareProcessesSchema,
  wedmJobCreateSchema,
  wedmJobCompleteSchema,
  wedmJobStatusUpdateSchema,
  wedmJobListQuerySchema,
  wedmJobActualSchema,
  WEDM_JOB_STATUSES,
  type WEDMJobStatus,
  wedmOverageApproveSchema,
  wedmOverageRejectSchema,
} from "../schemas/wedmErpActionSchemas.js";
import {
  WEDM_DEFAULT_RATES,
  WEDM_WIRE_COST_USD_PER_M,
  lookupWireSpeed,
} from "../physics/wedm-constants.js";
import { wedmSafetyEnvelopeEngine, type EnvelopeReading } from "../engines/WEDMSafetyEnvelopeEngine.js";

/**
 * U-P2PFS21: Safety envelope validation for ERP routes.
 * Extracts envelope parameters from program result and validates.
 */
function validateProgramSafetyEnvelope(programResult: {
  pass_details?: Array<{ tension_N?: number; wire_speed_m_min?: number }>;
  setup_sheet?: { wire_type?: string };
}): { pass: boolean; warnings: string[]; critical: boolean } {
  const warnings: string[] = [];
  let critical = false;

  try {
    const passDetails = programResult.pass_details ?? [];
    if (passDetails.length === 0) {
      return { pass: true, warnings: ["No pass details to validate"], critical: false };
    }

    // Extract max tension and wire speed from passes
    const tensions = passDetails.map(p => p.tension_N).filter((t): t is number => t !== undefined);
    const maxTensionN = tensions.length > 0 ? Math.max(...tensions) : undefined;

    // Convert tension from N to gf for envelope check (1 N ≈ 101.972 gf)
    const reading: EnvelopeReading = {};
    if (maxTensionN !== undefined) {
      reading.wire_tension_gf = maxTensionN * 101.972;
    }

    const report = wedmSafetyEnvelopeEngine.check(reading);
    if (!report.pass) {
      const criticalViolations = report.violations.filter(v => v.severity === "critical");
      const softViolations = report.violations.filter(v => v.severity !== "critical");

      if (criticalViolations.length > 0) {
        critical = true;
        for (const v of criticalViolations) {
          warnings.push(`SAFETY CRITICAL: ${v.param} - ${v.reason}`);
        }
      }
      for (const v of softViolations) {
        warnings.push(`Safety warning: ${v.param} - ${v.reason}`);
      }
    }

    return { pass: !critical, warnings, critical };
  } catch (err) {
    warnings.push(`Safety envelope check unavailable: ${(err as Error)?.message || "unknown"}`);
    return { pass: true, warnings, critical: false };
  }
}

// In-memory stores (replaces DB for this milestone — swap for Postgres in M1).
const overageRequests = new Map<string, ReturnType<typeof WEDMOverageApprovalEngine.createRequest>>();
const invoiceDrafts = new Map<string, ReturnType<typeof WEDMInvoiceLineEngine.createInvoice>>();

// U-WEDM-ERP06: wrap packet with additional tracking metadata (status, actuals,
// history). The raw WEDMJobPacket from the engine is immutable; all mutable
// fields live alongside it so we preserve provenance.
interface JobActuals {
  actual_cutting_time_min?: number;
  actual_wire_m?: number;
  actual_passes?: number;
  break_count?: number;
  recovery_time_hr?: number;
  operator_notes?: string;
  updated_at: string;
}
interface JobStatusEvent {
  at: string;
  from: WEDMJobStatus;
  to: WEDMJobStatus;
  operator: string | null;
  note: string | null;
}
interface TrackedJobPacket {
  packet: ReturnType<typeof WEDMJobCreatorEngine.createJob>;
  /** Machine id the job was dispatched to — carried separately because the packet
   *  does not persist a top-level machineId field (options.machine_id is consumed
   *  during packet construction to derive department assignments). */
  machine_id: string | null;
  status: WEDMJobStatus;
  created_at: string;
  updated_at: string;
  history: JobStatusEvent[];
  actuals: JobActuals | null;
}
const jobPackets = new Map<string, TrackedJobPacket>();

const STATUS_ALLOWED_TRANSITIONS: Record<WEDMJobStatus, WEDMJobStatus[]> = {
  scheduled: ["threading", "on_hold", "cancelled"],
  threading: ["rough_cutting", "on_hold", "cancelled"],
  rough_cutting: ["skim_cutting", "qc", "on_hold", "cancelled"],
  skim_cutting: ["qc", "on_hold", "cancelled"],
  qc: ["complete", "rough_cutting", "skim_cutting", "on_hold"],
  complete: [],
  on_hold: ["scheduled", "threading", "rough_cutting", "skim_cutting", "qc", "cancelled"],
  cancelled: [],
};

const STATUS_TO_DEPARTMENT: Partial<Record<WEDMJobStatus, string>> = {
  scheduled: "intake",
  threading: "setup",
  rough_cutting: "rough",
  skim_cutting: "skim1",
  qc: "qc",
  complete: "ship",
};

function priorityRank(priority: string | undefined): number {
  if (priority === "emergency") return 3;
  if (priority === "rush") return 2;
  if (priority === "standard") return 1;
  return 0;
}

// U-WEDM-ERP05: persisted WEDM quotes (in-memory, keyed by quote_number)
interface PersistedWEDMQuote {
  quote_number: string;
  customer: string | null;
  part_name: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  lead_time_days: number;
  margin_pct: number;
  line_items: Array<Record<string, unknown>>;
  terms: string[];
  valid_days: number;
  notes: string[];
  created_at: string;
  updated_at: string;
  sent_at: string | null;
  sent_to: string | null;
  revision: number;
}
const wedmQuotes = new Map<string, PersistedWEDMQuote>();

function ok(res: Response, data: unknown): void {
  res.json({ ok: true, data });
}
function fail(res: Response, status: number, error: string): void {
  res.status(status).json({ ok: false, error });
}

function handle(fn: (req: Request, res: Response) => unknown | Promise<unknown>) {
  return async (req: Request, res: Response) => {
    try {
      await fn(req, res);
    } catch (e: any) {
      const message = e instanceof Error ? e.message : String(e);
      fail(res, 400, message);
    }
  };
}

/**
 * Build a CostInput from a quick estimate request. Uses WEDM constants for
 * wire speed lookups and default rates when the caller doesn't override.
 */
function buildCostInput(input: ReturnType<typeof wedmEstimateSchema.parse>): CostInput {
  const wireSpeedLookup = lookupWireSpeed(input.material, input.thickness_mm);
  const cuttingTimeHr = (input.perimeter_mm * input.pass_count) / (wireSpeedLookup * 60);
  return {
    part_id: input.part_id,
    material: input.material,
    machine_time: {
      machine_rate_per_hr: input.machine_rate_per_hr ?? WEDM_DEFAULT_RATES.machine_rate_usd_hr,
      setup_hrs: input.setup_hrs,
      cutting_hrs: cuttingTimeHr,
    },
    wire: {
      wire_type: input.wire_type,
      wire_diameter_mm: input.wire_diameter_mm,
      cutting_hrs: cuttingTimeHr,
      wire_speed_mm_per_min: wireSpeedLookup,
    },
    consumables: {
      cutting_hrs: cuttingTimeHr,
    },
    overhead_pct: input.overhead_pct ?? WEDM_DEFAULT_RATES.overhead_pct,
    margin_pct: input.margin_pct ?? WEDM_DEFAULT_RATES.margin_pct,
    quantity: input.quantity,
  };
}

export function createWedmErpRouter(): Router {
  const router = Router();
  const costEngine = new EDMCostDocumentationEngine();

  // ─── Quote ────────────────────────────────────────────────────────────────
  // /quote/estimate is public (quick dimensional quote for prospects).
  router.post(
    "/quote/estimate",
    handle(async (req, res) => {
      const parsed = wedmEstimateSchema.safeParse(req.body);
      if (!parsed.success) return fail(res, 400, `Invalid input: ${parsed.error.message}`);
      const costInput = buildCostInput(parsed.data);
      const cost = costEngine.estimateCost(costInput);
      const bridge = WEDMQuoteBridgeEngine.toQuoteLineItems(cost, parsed.data.quantity);
      ok(res, { cost_estimate: cost, quote: bridge });
    }),
  );

  router.post(
    "/quote/from-program",
    verifyToken,
    handle(async (req, res) => {
      const parsed = wedmFromProgramSchema.safeParse(req.body);
      if (!parsed.success) return fail(res, 400, `Invalid input: ${parsed.error.message}`);
      const program = parsed.data.program_result;
      if (!program?.setup_sheet) {
        return fail(res, 400, "program_result.setup_sheet is required");
      }

      // U-P2PFS21: Safety envelope check (non-blocking for quotes, adds warnings)
      const safetyCheck = validateProgramSafetyEnvelope(program);
      const safetyWarnings = safetyCheck.warnings;

      const cuttingHrs = (program.estimated_time_min ?? 60) / 60;
      const costInput: CostInput = {
        part_id: program.setup_sheet.part_number ?? "PROG",
        material: program.setup_sheet.material ?? "tool_steel",
        machine_time: {
          machine_rate_per_hr: WEDM_DEFAULT_RATES.machine_rate_usd_hr,
          setup_hrs: 1,
          cutting_hrs: cuttingHrs,
        },
        wire: {
          wire_type: program.setup_sheet.wire_type ?? "brass",
          wire_diameter_mm: program.setup_sheet.wire_diameter_mm ?? 0.25,
          cutting_hrs: cuttingHrs,
          wire_speed_mm_per_min: 100,
        },
        consumables: { cutting_hrs: cuttingHrs },
        overhead_pct: WEDM_DEFAULT_RATES.overhead_pct,
        margin_pct: parsed.data.margin_pct ?? WEDM_DEFAULT_RATES.margin_pct,
        quantity: parsed.data.quantity,
      };
      const cost = costEngine.estimateCost(costInput);
      const bridge = WEDMQuoteBridgeEngine.toQuoteLineItems(cost, parsed.data.quantity);
      ok(res, { cost_estimate: cost, quote: bridge, safety_warnings: safetyWarnings });
    }),
  );

  router.post(
    "/quote/quantity-breaks",
    verifyToken,
    handle(async (req, res) => {
      const parsed = wedmQuantityBreaksSchema.safeParse(req.body);
      if (!parsed.success) return fail(res, 400, `Invalid input: ${parsed.error.message}`);
      const breaks = WEDMQuoteBridgeEngine.getQuantityBreaks(parsed.data.cost_estimate, {
        quantities: parsed.data.quantities,
        learning_rate: parsed.data.learning_rate,
      });
      ok(res, { quantity_breaks: breaks });
    }),
  );

  router.post(
    "/quote/credit-cost",
    verifyToken,
    handle(async (req, res) => {
      const parsed = wedmCreditCostSchema.safeParse(req.body);
      if (!parsed.success) return fail(res, 400, `Invalid input: ${parsed.error.message}`);
      const result = WEDMCreditCostEngine.calculate(parsed.data);
      ok(res, result);
    }),
  );

  // U-WEDM-ERP04: GET /quote/rates -- shop WEDM rate card.
  // U-WEDMERP-RATES-REDACT (2026-06-24, slot:hotel): this route is intentionally anon-reachable (a
  // prospect-facing rate card) -- but it bundled `overhead_pct` + `margin_pct`, the shop's INTERNAL
  // margin/overhead structure, which must NEVER reach an unauthenticated surface (the same leak class as
  // the quoting cost sweep + the hotel-portal PII gate; charlie-soul refuse: no margin/overhead to a
  // customer/anon surface). Redact-when-anon: an authenticated caller still gets the full card incl.
  // margin/overhead; an anonymous prospect sees only the customer-facing machine/operator/wire rates.
  // (The router is mounted under /api where optionalToken sets req.userId for a valid Bearer, never anon.)
  router.get(
    "/quote/rates",
    handle(async (req, res) => {
      const authed = Boolean((req as { userId?: string }).userId);
      const card: Record<string, unknown> = {
        machine_rate_usd_hr: WEDM_DEFAULT_RATES.machine_rate_usd_hr,
        operator_rate_usd_hr: WEDM_DEFAULT_RATES.operator_rate_usd_hr,
        setup_hours_default: 1,
        wire_cost_usd_per_m: WEDM_WIRE_COST_USD_PER_M,
        updated_at: new Date().toISOString(),
        source: "WEDM_DEFAULT_RATES (src/physics/wedm-constants.ts)",
      };
      // Internal margin/overhead structure -- only for an authenticated caller.
      if (authed) {
        card.overhead_pct = WEDM_DEFAULT_RATES.overhead_pct;
        card.margin_pct = WEDM_DEFAULT_RATES.margin_pct;
      }
      ok(res, card);
    }),
  );

  // U-WEDM-ERP04: POST /quote/batch — batch estimate for multiple parts
  router.post(
    "/quote/batch",
    verifyToken,
    handle(async (req, res) => {
      const parsed = wedmBatchEstimateSchema.safeParse(req.body);
      if (!parsed.success) return fail(res, 400, `Invalid input: ${parsed.error.message}`);
      const results = parsed.data.parts.map((part, idx) => {
        try {
          const input = buildCostInput(part);
          const cost = costEngine.estimateCost(input);
          const bridge = WEDMQuoteBridgeEngine.toQuoteLineItems(cost, part.quantity);
          return {
            index: idx,
            part_id: part.part_id,
            quantity: part.quantity,
            cost_estimate: cost,
            quote_line_items: bridge.line_items,
            total_price: bridge.total,
            unit_price: bridge.total / Math.max(1, part.quantity),
            error: null,
          };
        } catch (err) {
          return {
            index: idx,
            part_id: part.part_id,
            quantity: part.quantity,
            cost_estimate: null,
            quote_line_items: [],
            total_price: 0,
            unit_price: 0,
            error: (err as Error)?.message ?? "estimation failed",
          };
        }
      });
      const batch_total = results.reduce((sum, r) => sum + (r.total_price || 0), 0);
      const failures = results.filter(r => r.error !== null).length;
      ok(res, {
        customer: parsed.data.customer ?? null,
        part_count: parsed.data.parts.length,
        batch_total,
        failures,
        combine_rates: parsed.data.combine_rates,
        results,
      });
    }),
  );

  // U-WEDM-ERP04: POST /quote/compare — WEDM vs alternative processes
  router.post(
    "/quote/compare",
    verifyToken,
    handle(async (req, res) => {
      const parsed = wedmCompareProcessesSchema.safeParse(req.body);
      if (!parsed.success) return fail(res, 400, `Invalid input: ${parsed.error.message}`);

      // Baseline — always include WEDM
      const wedmInput = buildCostInput(parsed.data.part);
      const wedmCost = costEngine.estimateCost(wedmInput);
      const wedmBridge = WEDMQuoteBridgeEngine.toQuoteLineItems(wedmCost, parsed.data.part.quantity);

      // Process capability envelope (µm tolerance, Ra µm, relative cost, lead time)
      // Source: Machinery's Handbook 29th Ed, Table 12-14 "Process capability comparison"
      const PROCESS_CAPABILITY: Record<string, {
        min_tolerance_um: number;
        min_ra_um: number;
        relative_cost_vs_wedm: number;
        lead_time_days: number;
        notes: string;
      }> = {
        laser:     { min_tolerance_um: 50,  min_ra_um: 3.2,  relative_cost_vs_wedm: 0.35, lead_time_days: 2, notes: "fast, HAZ present, limited to <25mm thick" },
        waterjet:  { min_tolerance_um: 100, min_ra_um: 6.3,  relative_cost_vs_wedm: 0.45, lead_time_days: 3, notes: "no HAZ, rougher edge, any thickness" },
        stamping:  { min_tolerance_um: 50,  min_ra_um: 3.2,  relative_cost_vs_wedm: 0.10, lead_time_days: 20, notes: "tooling cost amortized at 1000+ parts" },
        grinding:  { min_tolerance_um: 2,   min_ra_um: 0.2,  relative_cost_vs_wedm: 1.50, lead_time_days: 5, notes: "best Ra, limited to simple profiles" },
        milling:   { min_tolerance_um: 10,  min_ra_um: 0.8,  relative_cost_vs_wedm: 0.80, lead_time_days: 3, notes: "complex 3D, tool access limits thin slots" },
      };

      type Comparison = {
        process: string;
        feasible: boolean;
        reason: string | null;
        est_total_price_usd: number | null;
        est_unit_price_usd: number | null;
        lead_time_days: number;
        relative_cost_vs_wedm: number;
        notes: string;
      };

      const alternatives: Comparison[] = parsed.data.alternatives.map(proc => {
        const cap = PROCESS_CAPABILITY[proc];
        let feasible = true;
        let reason: string | null = null;
        if (parsed.data.tolerance_um !== undefined && cap.min_tolerance_um > parsed.data.tolerance_um) {
          feasible = false;
          reason = `${proc} min tolerance ${cap.min_tolerance_um}µm exceeds required ${parsed.data.tolerance_um}µm`;
        } else if (parsed.data.surface_finish_ra_um !== undefined && cap.min_ra_um > parsed.data.surface_finish_ra_um) {
          feasible = false;
          reason = `${proc} min Ra ${cap.min_ra_um}µm exceeds required ${parsed.data.surface_finish_ra_um}µm`;
        }
        const est = feasible ? wedmBridge.total * cap.relative_cost_vs_wedm : null;
        return {
          process: proc,
          feasible,
          reason,
          est_total_price_usd: est,
          est_unit_price_usd: est === null ? null : est / Math.max(1, parsed.data.part.quantity),
          lead_time_days: cap.lead_time_days,
          relative_cost_vs_wedm: cap.relative_cost_vs_wedm,
          notes: cap.notes,
        };
      });

      const feasibleAlternatives = alternatives.filter(a => a.feasible && a.est_total_price_usd !== null);
      const cheapest = feasibleAlternatives.length > 0
        ? feasibleAlternatives.reduce((lo, a) => a.est_total_price_usd! < lo.est_total_price_usd! ? a : lo)
        : null;

      ok(res, {
        baseline: {
          process: "wedm",
          feasible: true,
          est_total_price_usd: wedmBridge.total,
          est_unit_price_usd: wedmBridge.total / Math.max(1, parsed.data.part.quantity),
          lead_time_days: 5,
          relative_cost_vs_wedm: 1.0,
          line_items: wedmBridge.line_items,
        },
        alternatives,
        recommendation: cheapest
          ? {
              process: cheapest.process,
              savings_usd: wedmBridge.total - cheapest.est_total_price_usd!,
              savings_pct: ((wedmBridge.total - cheapest.est_total_price_usd!) / wedmBridge.total) * 100,
              reason: `${cheapest.process} is feasible and ${((1 - cheapest.relative_cost_vs_wedm) * 100).toFixed(0)}% cheaper than WEDM`,
            }
          : { process: "wedm", savings_usd: 0, savings_pct: 0, reason: "no feasible alternative — WEDM required" },
      });
    }),
  );

  router.post(
    "/quote/create",
    verifyToken,
    handle(async (req, res) => {
      const parsed = wedmQuoteCreateSchema.safeParse(req.body);
      if (!parsed.success) return fail(res, 400, `Invalid input: ${parsed.error.message}`);
      const bridge = WEDMQuoteBridgeEngine.toQuoteLineItems(parsed.data.cost_estimate, parsed.data.quantity);
      const quoteNumber =
        parsed.data.quote_number ?? `Q-WEDM-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      const now = new Date().toISOString();
      const quote: PersistedWEDMQuote = {
        quote_number: quoteNumber,
        customer: parsed.data.customer ?? null,
        part_name: parsed.data.part_name ?? null,
        quantity: parsed.data.quantity,
        unit_price: bridge.total / Math.max(1, parsed.data.quantity),
        total_price: bridge.total,
        lead_time_days: parsed.data.lead_time_days,
        margin_pct: 0,
        line_items: bridge.line_items as unknown as Array<Record<string, unknown>>,
        terms: ["Net 30", "FOB Origin"],
        valid_days: parsed.data.valid_days,
        notes: [`Generated by WEDM-ERP pipeline at ${now}`],
        created_at: now,
        updated_at: now,
        sent_at: null,
        sent_to: null,
        revision: 1,
      };
      // U-WEDM-ERP05: persist so PUT/send/pdf can find it
      wedmQuotes.set(quote.quote_number, quote);
      ok(res, { quote });
    }),
  );

  // U-WEDM-ERP05: GET /quote/:id — read a persisted quote
  router.get(
    "/quote/:id",
    verifyToken,
    handle(async (req, res) => {
      const id = String(req.params.id);
      const quote = wedmQuotes.get(id);
      if (!quote) return fail(res, 404, `Quote ${id} not found`);
      ok(res, { quote });
    }),
  );

  // U-WEDM-ERP05: PUT /quote/:id — update an existing quote
  router.put(
    "/quote/:id",
    verifyToken,
    handle(async (req, res) => {
      const id = String(req.params.id);
      const existing = wedmQuotes.get(id);
      if (!existing) return fail(res, 404, `Quote ${id} not found`);
      if (existing.sent_at !== null) return fail(res, 409, `Quote ${id} has already been sent (${existing.sent_at}) and cannot be edited`);

      const parsed = wedmQuoteUpdateSchema.safeParse(req.body);
      if (!parsed.success) return fail(res, 400, `Invalid input: ${parsed.error.message}`);

      const updated: PersistedWEDMQuote = {
        ...existing,
        customer: parsed.data.customer ?? existing.customer,
        part_name: parsed.data.part_name ?? existing.part_name,
        quantity: parsed.data.quantity ?? existing.quantity,
        margin_pct: parsed.data.margin_pct ?? existing.margin_pct,
        lead_time_days: parsed.data.lead_time_days ?? existing.lead_time_days,
        valid_days: parsed.data.valid_days ?? existing.valid_days,
        notes: parsed.data.notes ?? existing.notes,
        terms: parsed.data.terms ?? existing.terms,
        revision: existing.revision + 1,
        updated_at: new Date().toISOString(),
      };
      // If quantity changed, recompute unit_price (total is still the line-item sum — not re-priced)
      if (parsed.data.quantity !== undefined) {
        updated.unit_price = existing.total_price / Math.max(1, parsed.data.quantity);
      }
      wedmQuotes.set(id, updated);
      ok(res, { quote: updated });
    }),
  );

  // U-WEDM-ERP05: POST /quote/:id/send — mark quote as sent to customer
  router.post(
    "/quote/:id/send",
    verifyToken,
    handle(async (req, res) => {
      const id = String(req.params.id);
      const existing = wedmQuotes.get(id);
      if (!existing) return fail(res, 404, `Quote ${id} not found`);

      const parsed = wedmQuoteSendSchema.safeParse(req.body);
      if (!parsed.success) return fail(res, 400, `Invalid input: ${parsed.error.message}`);

      const now = new Date().toISOString();
      const updated: PersistedWEDMQuote = {
        ...existing,
        sent_at: now,
        sent_to: parsed.data.to,
        updated_at: now,
      };
      wedmQuotes.set(id, updated);

      // Send receipt — in production this would invoke the email delivery engine.
      // For this unit we return a signed record the front-end can display.
      const receipt = {
        quote_number: id,
        sent_at: now,
        to: parsed.data.to,
        cc: parsed.data.cc ?? [],
        message_preview: (parsed.data.message ?? "").slice(0, 120),
        attached: parsed.data.attach_pdf,
        delivery_mode: "queued",
        delivery_id: `DEL-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      };
      ok(res, { quote: updated, receipt });
    }),
  );

  // U-WEDM-ERP05: GET /quote/:id/pdf — render a PDF-ready document
  // Returns text/plain by default (PDF-ready structured text); front-end/
  // gateway can convert to real PDF via a downstream rendering service.
  router.get(
    "/quote/:id/pdf",
    verifyToken,
    handle(async (req, res) => {
      const id = String(req.params.id);
      const quote = wedmQuotes.get(id);
      if (!quote) return fail(res, 404, `Quote ${id} not found`);

      const lines: string[] = [];
      lines.push("=".repeat(72));
      lines.push(`  QUOTE ${quote.quote_number}    rev ${quote.revision}`);
      lines.push("=".repeat(72));
      lines.push("");
      lines.push(`Customer:   ${quote.customer ?? "—"}`);
      lines.push(`Part:       ${quote.part_name ?? "—"}`);
      lines.push(`Quantity:   ${quote.quantity}`);
      lines.push(`Unit price: $${quote.unit_price.toFixed(2)}`);
      lines.push(`Total:      $${quote.total_price.toFixed(2)}`);
      lines.push(`Lead time:  ${quote.lead_time_days} days`);
      lines.push(`Valid for:  ${quote.valid_days} days`);
      lines.push("");
      lines.push("LINE ITEMS");
      lines.push("-".repeat(72));
      for (const item of quote.line_items) {
        const desc = (item.description ?? item.category ?? "line").toString();
        const amt = Number(item.extended_price ?? item.amount ?? 0);
        lines.push(`  ${desc.padEnd(50)} $${amt.toFixed(2).padStart(12)}`);
      }
      lines.push("-".repeat(72));
      lines.push(`${"TOTAL".padEnd(52)} $${quote.total_price.toFixed(2).padStart(12)}`);
      lines.push("");
      lines.push("TERMS");
      for (const t of quote.terms) lines.push(`  • ${t}`);
      if (quote.notes.length > 0) {
        lines.push("");
        lines.push("NOTES");
        for (const n of quote.notes) lines.push(`  • ${n}`);
      }
      lines.push("");
      lines.push(`Created:    ${quote.created_at}`);
      lines.push(`Updated:    ${quote.updated_at}`);
      if (quote.sent_at) lines.push(`Sent to:    ${quote.sent_to} at ${quote.sent_at}`);
      lines.push("=".repeat(72));

      const body = lines.join("\n");
      const accept = (req.headers.accept ?? "").toString();
      if (accept.includes("application/json")) {
        ok(res, {
          quote_number: id,
          content_type: "text/plain",
          filename: `${id}.txt`,
          body,
          pdf_convertible: true,
        });
        return;
      }
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${id}.txt"`);
      res.send(body);
    }),
  );

  // ─── ERP ──────────────────────────────────────────────────────────────────
  router.post(
    "/job/create",
    verifyToken,
    handle(async (req, res) => {
      const parsed = wedmJobCreateSchema.safeParse(req.body);
      if (!parsed.success) return fail(res, 400, `Invalid input: ${parsed.error.message}`);

      // U-P2PFS21: Safety envelope check (BLOCKING for job creation)
      const safetyCheck = validateProgramSafetyEnvelope(parsed.data.program_result);
      if (safetyCheck.critical) {
        return fail(res, 400, `Job creation blocked: ${safetyCheck.warnings.join("; ")}`);
      }

      const packet = WEDMJobCreatorEngine.createJob(
        parsed.data.program_result,
        parsed.data.options,
        parsed.data.quote,
      );
      // Attach any non-critical safety warnings to job packet
      if (safetyCheck.warnings.length > 0) {
        (packet as { safety_warnings?: string[] }).safety_warnings = safetyCheck.warnings;
      }
      const now = new Date().toISOString();
      const tracked: TrackedJobPacket = {
        packet,
        machine_id: parsed.data.options?.machine_id ?? null,
        status: "scheduled",
        created_at: now,
        updated_at: now,
        history: [],
        actuals: null,
      };
      jobPackets.set(packet.jobId, tracked);
      ok(res, { job: packet, status: tracked.status, machine_id: tracked.machine_id, created_at: now });
    }),
  );

  // U-WEDM-ERP06: GET /job/list — MUST register before /job/:id to avoid `id=list` collision
  router.get(
    "/job/list",
    verifyToken,
    handle(async (req, res) => {
      const parsed = wedmJobListQuerySchema.safeParse(req.query);
      if (!parsed.success) return fail(res, 400, `Invalid query: ${parsed.error.message}`);
      const q = parsed.data;

      let jobs = Array.from(jobPackets.values());
      if (q.status) jobs = jobs.filter((t) => t.status === q.status);
      if (q.machine_id) jobs = jobs.filter((t) => t.machine_id === q.machine_id);
      if (q.customer) {
        const needle = q.customer.toLowerCase();
        jobs = jobs.filter((t) => (t.packet.customer ?? "").toLowerCase().includes(needle));
      }
      if (q.priority) {
        jobs = jobs.filter((t) => t.packet.priority === q.priority);
      }

      const total = jobs.length;
      jobs.sort((a, b) => {
        switch (q.sort) {
          case "due_date_asc":
            return (a.packet.dueDate ?? "").localeCompare(b.packet.dueDate ?? "");
          case "due_date_desc":
            return (b.packet.dueDate ?? "").localeCompare(a.packet.dueDate ?? "");
          case "created_desc":
            return b.created_at.localeCompare(a.created_at);
          case "priority_desc":
          default: {
            const pr = priorityRank(b.packet.priority) - priorityRank(a.packet.priority);
            return pr !== 0 ? pr : (a.packet.dueDate ?? "").localeCompare(b.packet.dueDate ?? "");
          }
        }
      });

      const slice = jobs.slice(q.offset, q.offset + q.limit);
      ok(res, {
        total,
        limit: q.limit,
        offset: q.offset,
        sort: q.sort,
        count: slice.length,
        jobs: slice.map((t) => ({
          job_id: t.packet.jobId,
          job_name: t.packet.jobName,
          customer: t.packet.customer,
          part_number: t.packet.partNumber,
          quantity: t.packet.quantity,
          priority: t.packet.priority,
          due_date: t.packet.dueDate,
          machine_id: t.machine_id,
          status: t.status,
          updated_at: t.updated_at,
          has_actuals: t.actuals !== null,
        })),
      });
    }),
  );

  // U-WEDM-ERP06: GET /job/queue/:machine_id — jobs queued on a specific machine
  router.get(
    "/job/queue/:machine_id",
    verifyToken,
    handle(async (req, res) => {
      const machineId = String(req.params.machine_id);
      if (!machineId || machineId === "undefined") {
        return fail(res, 400, "machine_id path parameter is required");
      }
      const activeStatuses: WEDMJobStatus[] = ["scheduled", "threading", "rough_cutting", "skim_cutting", "qc", "on_hold"];
      const queue = Array.from(jobPackets.values()).filter(
        (t) => t.machine_id === machineId && activeStatuses.includes(t.status),
      );
      queue.sort((a, b) => {
        const pr = priorityRank(b.packet.priority) - priorityRank(a.packet.priority);
        return pr !== 0 ? pr : (a.packet.dueDate ?? "").localeCompare(b.packet.dueDate ?? "");
      });
      ok(res, {
        machine_id: machineId,
        count: queue.length,
        total_estimated_minutes: queue.reduce((s, t) => {
          const ops = t.packet.operations ?? [];
          return s + ops.reduce((op_s, op) => op_s + (op.estimatedMinutes ?? 0), 0);
        }, 0),
        queue: queue.map((t) => ({
          job_id: t.packet.jobId,
          part_number: t.packet.partNumber,
          priority: t.packet.priority,
          due_date: t.packet.dueDate,
          status: t.status,
          quantity: t.packet.quantity,
        })),
      });
    }),
  );

  router.get(
    "/job/:id",
    verifyToken,
    handle(async (req, res) => {
      const jobId = String(req.params.id);
      const tracked = jobPackets.get(jobId);
      if (!tracked) return fail(res, 404, `Job ${jobId} not found`);
      ok(res, {
        job: tracked.packet,
        status: tracked.status,
        created_at: tracked.created_at,
        updated_at: tracked.updated_at,
        history: tracked.history,
        actuals: tracked.actuals,
      });
    }),
  );

  // U-WEDM-ERP06: PATCH /job/:id/status — update job status with transition rules
  router.patch(
    "/job/:id/status",
    verifyToken,
    handle(async (req, res) => {
      const parsed = wedmJobStatusUpdateSchema.safeParse(req.body);
      if (!parsed.success) return fail(res, 400, `Invalid input: ${parsed.error.message}`);
      const jobId = String(req.params.id);
      const tracked = jobPackets.get(jobId);
      if (!tracked) return fail(res, 404, `Job ${jobId} not found`);

      const from = tracked.status;
      const to = parsed.data.status;
      if (from === to) {
        return fail(res, 400, `Job ${jobId} is already in status "${to}"`);
      }
      const allowed = STATUS_ALLOWED_TRANSITIONS[from];
      if (!allowed.includes(to)) {
        return fail(res, 409, `Illegal transition "${from}" → "${to}" (allowed: ${allowed.length === 0 ? "none, terminal state" : allowed.join(", ")})`);
      }

      const deptTarget = parsed.data.department_id ?? STATUS_TO_DEPARTMENT[to];
      if (deptTarget) {
        let foundCurrent = false;
        for (const d of tracked.packet.departments) {
          if (d.id === deptTarget) {
            d.status = "current";
            foundCurrent = true;
          } else if (!foundCurrent) {
            // Mark prior departments complete when advancing forward
            if (d.status !== "complete") d.status = "complete";
          } else {
            // Mark subsequent departments pending
            if (d.status === "current") d.status = "pending";
          }
        }
        if (to === "complete") {
          for (const d of tracked.packet.departments) d.status = "complete";
        }
      }

      const now = new Date().toISOString();
      tracked.history.push({
        at: now,
        from,
        to,
        operator: parsed.data.operator ?? null,
        note: parsed.data.note ?? null,
      });
      tracked.status = to;
      tracked.updated_at = now;
      ok(res, {
        job_id: jobId,
        from,
        to,
        updated_at: now,
        history: tracked.history,
      });
    }),
  );

  // U-WEDM-ERP06: GET /job/list — list jobs with filters + pagination
  // U-WEDM-ERP07: POST /job/:id/actual — partial actuals recording (mid-job)
  router.post(
    "/job/:id/actual",
    verifyToken,
    handle(async (req, res) => {
      const parsed = wedmJobActualSchema.safeParse(req.body);
      if (!parsed.success) return fail(res, 400, `Invalid input: ${parsed.error.message}`);
      const jobId = String(req.params.id);
      const tracked = jobPackets.get(jobId);
      if (!tracked) return fail(res, 404, `Job ${jobId} not found`);

      const now = new Date().toISOString();
      const merged: JobActuals = {
        ...(tracked.actuals ?? {}),
        ...parsed.data,
        updated_at: now,
      };
      tracked.actuals = merged;
      tracked.updated_at = now;
      ok(res, { job_id: jobId, actuals: merged });
    }),
  );

  // U-WEDM-ERP07: GET /job/:id/variance — compare estimated vs actual
  router.get(
    "/job/:id/variance",
    verifyToken,
    handle(async (req, res) => {
      const jobId = String(req.params.id);
      const tracked = jobPackets.get(jobId);
      if (!tracked) return fail(res, 404, `Job ${jobId} not found`);
      if (!tracked.actuals) {
        return fail(res, 404, `No actuals recorded for job ${jobId}`);
      }

      const packet = tracked.packet as typeof tracked.packet & {
        programMeta?: { estimated_time_min?: number; wire_consumption_m?: number; passes_per_profile?: number };
      };
      const est_time_min = packet.programMeta?.estimated_time_min ?? 0;
      const est_wire_m = packet.programMeta?.wire_consumption_m ?? 0;
      const est_passes = packet.programMeta?.passes_per_profile ?? 0;

      const act_time = tracked.actuals.actual_cutting_time_min ?? 0;
      const act_wire = tracked.actuals.actual_wire_m ?? 0;
      const act_passes = tracked.actuals.actual_passes ?? 0;

      function pct(actual: number, estimated: number): number | null {
        if (estimated === 0) return null;
        return Math.round(((actual - estimated) / estimated) * 10000) / 100;
      }

      ok(res, {
        job_id: jobId,
        estimated: {
          cutting_time_min: est_time_min,
          wire_m: est_wire_m,
          passes: est_passes,
        },
        actual: {
          cutting_time_min: act_time,
          wire_m: act_wire,
          passes: act_passes,
          break_count: tracked.actuals.break_count ?? 0,
          recovery_time_hr: tracked.actuals.recovery_time_hr ?? 0,
        },
        variance_pct: {
          cutting_time: pct(act_time, est_time_min),
          wire: pct(act_wire, est_wire_m),
          passes: pct(act_passes, est_passes),
        },
        recorded_at: tracked.actuals.updated_at,
      });
    }),
  );

  // U-WEDM-ERP07: POST /job/:id/invoice — trigger invoice generation from
  // already-recorded actuals (alternative to /complete when actuals were
  // recorded incrementally via POST /job/:id/actual).
  router.post(
    "/job/:id/invoice",
    verifyToken,
    handle(async (req, res) => {
      const jobId = String(req.params.id);
      const tracked = jobPackets.get(jobId);
      if (!tracked) return fail(res, 404, `Job ${jobId} not found`);
      if (!tracked.actuals) {
        return fail(res, 400, `Cannot invoice job ${jobId}: no actuals recorded. POST /job/${jobId}/actual first.`);
      }
      const a = tracked.actuals;
      if (a.actual_cutting_time_min === undefined || a.actual_wire_m === undefined || a.actual_passes === undefined) {
        return fail(
          res,
          400,
          `Cannot invoice job ${jobId}: actuals incomplete (need actual_cutting_time_min + actual_wire_m + actual_passes).`,
        );
      }

      const bodyOpts = (req.body ?? {}) as Record<string, unknown>;
      const customer_id = typeof bodyOpts.customer_id === "string" ? bodyOpts.customer_id : undefined;
      const customer_email = typeof bodyOpts.customer_email === "string" ? bodyOpts.customer_email : undefined;
      const machine_rate_usd_per_hr =
        typeof bodyOpts.machine_rate_usd_per_hr === "number" ? bodyOpts.machine_rate_usd_per_hr : undefined;
      const wire_cost_usd_per_m =
        typeof bodyOpts.wire_cost_usd_per_m === "number" ? bodyOpts.wire_cost_usd_per_m : WEDM_WIRE_COST_USD_PER_M.brass_0_25mm;
      const tax_rate_pct = typeof bodyOpts.tax_rate_pct === "number" ? bodyOpts.tax_rate_pct : undefined;
      const overage_threshold_pct =
        typeof bodyOpts.overage_threshold_pct === "number" ? bodyOpts.overage_threshold_pct : undefined;

      // Derive actual_cost_usd from time + wire using the rates we just resolved.
      const hourly = machine_rate_usd_per_hr ?? WEDM_DEFAULT_RATES.machine_rate_usd_hr;
      const actualCostUsd =
        (a.actual_cutting_time_min / 60) * hourly + a.actual_wire_m * wire_cost_usd_per_m;

      const draft = WEDMInvoiceLineEngine.createInvoice(
        tracked.packet,
        {
          actual_cutting_time_min: a.actual_cutting_time_min,
          actual_wire_m: a.actual_wire_m,
          actual_passes: a.actual_passes,
          actual_cost_usd: actualCostUsd,
        },
        {
          customer_id,
          customer_email,
          machine_rate_usd_per_hr,
          wire_cost_usd_per_m,
          tax_rate_pct,
          overage_threshold_pct,
        },
      );
      invoiceDrafts.set(draft.invoice_number, draft);
      if (draft.overage_approval) {
        overageRequests.set(draft.overage_approval.request_id, draft.overage_approval);
      }
      // Auto-complete the job if not already
      if (tracked.status !== "complete" && tracked.status !== "cancelled") {
        const now = new Date().toISOString();
        tracked.history.push({
          at: now,
          from: tracked.status,
          to: "complete",
          operator: null,
          note: "auto-advanced by /invoice endpoint",
        });
        tracked.status = "complete";
        tracked.updated_at = now;
        for (const d of tracked.packet.departments) d.status = "complete";
      }
      ok(res, { job_id: jobId, invoice: draft });
    }),
  );

  router.post(
    "/job/:id/complete",
    verifyToken,
    handle(async (req, res) => {
      const parsed = wedmJobCompleteSchema.safeParse(req.body);
      if (!parsed.success) return fail(res, 400, `Invalid input: ${parsed.error.message}`);
      const jobId = String(req.params.id);
      const tracked = jobPackets.get(jobId);
      if (!tracked) return fail(res, 404, `Job ${jobId} not found`);
      const packet = tracked.packet;
      const { customer_id, customer_email, machine_rate_usd_per_hr, wire_cost_usd_per_m, tax_rate_pct, overage_threshold_pct, ...actuals } = parsed.data;
      // Record actuals so GET /job/:id/variance can report them
      const now = new Date().toISOString();
      tracked.actuals = {
        actual_cutting_time_min: actuals.actual_cutting_time_min,
        actual_wire_m: actuals.actual_wire_m,
        actual_passes: actuals.actual_passes,
        break_count: tracked.actuals?.break_count,
        recovery_time_hr: tracked.actuals?.recovery_time_hr,
        operator_notes: tracked.actuals?.operator_notes,
        updated_at: now,
      };
      // Auto-advance status to complete on /complete
      if (tracked.status !== "complete") {
        tracked.history.push({
          at: now,
          from: tracked.status,
          to: "complete",
          operator: null,
          note: "auto-advanced by /complete endpoint",
        });
        tracked.status = "complete";
        for (const d of tracked.packet.departments) d.status = "complete";
      }
      tracked.updated_at = now;
      const draft = WEDMInvoiceLineEngine.createInvoice(packet, actuals, {
        customer_id,
        customer_email,
        machine_rate_usd_per_hr,
        wire_cost_usd_per_m: wire_cost_usd_per_m ?? WEDM_WIRE_COST_USD_PER_M.brass_0_25mm,
        tax_rate_pct,
        overage_threshold_pct,
      });
      invoiceDrafts.set(draft.invoice_number, draft);
      if (draft.overage_approval) {
        overageRequests.set(draft.overage_approval.request_id, draft.overage_approval);
      }
      ok(res, { invoice: draft });
    }),
  );

  router.post(
    "/overage/:id/approve",
    verifyToken,
    handle(async (req, res) => {
      const parsed = wedmOverageApproveSchema.safeParse(req.body);
      if (!parsed.success) return fail(res, 400, `Invalid input: ${parsed.error.message}`);
      const overageId = String(req.params.id);
      const record = overageRequests.get(overageId);
      if (!record) return fail(res, 404, `Overage request ${overageId} not found`);
      const approved = WEDMOverageApprovalEngine.approve(record, parsed.data.approver);
      overageRequests.set(approved.request_id, approved);
      // Update any draft that references this overage
      for (const [k, draft] of invoiceDrafts.entries()) {
        if (draft.overage_approval?.request_id === approved.request_id) {
          invoiceDrafts.set(k, WEDMInvoiceLineEngine.finalizeAfterApproval(draft, approved));
        }
      }
      ok(res, { overage: approved });
    }),
  );

  router.post(
    "/overage/:id/reject",
    verifyToken,
    handle(async (req, res) => {
      const parsed = wedmOverageRejectSchema.safeParse(req.body);
      if (!parsed.success) return fail(res, 400, `Invalid input: ${parsed.error.message}`);
      const overageId = String(req.params.id);
      const record = overageRequests.get(overageId);
      if (!record) return fail(res, 404, `Overage request ${overageId} not found`);
      const rejected = WEDMOverageApprovalEngine.reject(record, parsed.data.approver, parsed.data.reason);
      overageRequests.set(rejected.request_id, rejected);
      ok(res, { overage: rejected });
    }),
  );

  return router;
}

/** Test helper — exposes in-memory stores so tests can reset between runs. */
export function _resetWedmErpState(): void {
  overageRequests.clear();
  invoiceDrafts.clear();
  jobPackets.clear();
  wedmQuotes.clear();
}
