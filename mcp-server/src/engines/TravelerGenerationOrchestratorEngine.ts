/**
 * TravelerGenerationOrchestratorEngine -- auto-generates the FULL print->shipping
 * order-of-operations "job traveler" from a part/quote spec, with each step
 * assigned to a department + role and carrying a per-department checklist.
 *
 * This is the connective tissue the shop floor was missing: existing engines
 * cover the pieces, but none generated the *whole* print->shipping sequence with
 * department/role/checklist tagging. This orchestrator COMPOSES them:
 *
 *   - ProcessPlanEngine.generate()      -> machining order-of-ops (mill/turn ops)
 *   - DEPARTMENT_CHECKLIST_TEMPLATES    -> per-department check-off items
 *     (mirrors DigitalWorkInstructionEngine's requires_signoff/acceptance shape)
 *   - RoutingSheetGeneratorEngine       -> time roll-up + lead-time (via toRoutingInput)
 *
 * It is NOT a duplicate of:
 *   - RoutingSheetGeneratorEngine -- that FORMATS a supplied op list (no part-spec
 *     generation, no department/role/checklist). We feed INTO it.
 *   - JobTravelerEngine / ShopStateEngine -- those STORE routing steps + timers.
 *     We generate INTO them; the generated steps map to their step shape.
 *   - DigitalWorkInstructionEngine -- single-operation static sign-off doc.
 *
 * Pure generator: no I/O, no mutation of external state, deterministic given input.
 * Stateful check-off lives in the companion JobChecklistEngine.
 *
 * Department spine (each step included ONLY when the part/quote needs it --
 * data-driven, never bloated):
 *   Programming -> Material prep/Saw -> [machining ops, dept-tagged by machine_domain]
 *   -> Deburr -> [outside-service Finishing iff a finish was quoted]
 *   -> First-Article Inspection (gate) -> Final Inspection (gate) -> Shipping
 *
 * @module engines/TravelerGenerationOrchestratorEngine
 * @milestone QUOTING-TRAVELER/U-TRAVGEN (2026-06-29, slot:charlie)
 */

import { processPlanEngine, type ProcessPlanInput, type PartFeature } from "./ProcessPlanEngine.js";
import type { RoutingSheetInput, RoutingOperation } from "./RoutingSheetGeneratorEngine.js";

// ============================================================================
// TYPES
// ============================================================================

/** Canonical JM Die department taxonomy for the print->shipping spine.
 * Aligned with EmployeeEngine `Department` where they overlap (programming,
 * machining, quality, shipping) plus the shop-floor process departments the
 * HR taxonomy collapses (turning/grinding/edm/deburr live under "machining"
 * in HR but are distinct shop-floor workcenters here). */
export type TravelerDepartment =
  | "programming"
  | "saw"
  | "machining"   // mill
  | "turning"     // lathe
  | "grinding"
  | "edm"
  | "deburr"
  | "finishing"   // outside service (plating/anodize/coat)
  | "inspection"
  | "shipping";

/** Role that owns a step. Subset of EmployeeEngine `EmployeeRole`. */
export type TravelerRole =
  | "programmer"
  | "setup_tech"
  | "operator"
  | "inspector"
  | "planner"
  | "lead";

/** machine_domain matches PlaybookRulesEngine.MachineDomain ("lathe"|"mill"|"wedm"|"general"),
 * extended with the non-cutting workcenters this spine routes through. */
export type TravelerMachineDomain =
  | "mill"
  | "lathe"
  | "wedm"
  | "grinder"
  | "general";

/** A single check-off item on a step's checklist. */
export interface ChecklistItem {
  /** Stable id within the step (e.g. "programming-1-1"). */
  id: string;
  /** Human-readable item the employee checks off. */
  label: string;
  /** True = the step cannot be marked complete until this item is checked
   * (a hard gate). False = advisory / informational. */
  required: boolean;
  /** True = checking this item is a formal sign-off (inspection gate, safety). */
  signoff: boolean;
  /** Optional acceptance criterion (what "done" looks like). */
  acceptance_criteria?: string;
}

/** One generated step in the print->shipping traveler. */
export interface GeneratedTravelerStep {
  /** 1-based sequential position in the traveler. */
  seq: number;
  /** Legacy-ERP op number (seq x 10) for routing-sheet compatibility. */
  op_num: number;
  /** Operation name (e.g. "Program & prove out", "Rough Pocket", "Final Inspection"). */
  operation: string;
  /** Department that owns this step. */
  department: TravelerDepartment;
  /** Role required to execute this step. */
  role: TravelerRole;
  /** Machine domain when the step runs on a machine; undefined for office/QC/ship. */
  machine_domain?: TravelerMachineDomain;
  /** Estimated setup minutes. */
  est_setup_min: number;
  /** Estimated cycle (run-per-piece) minutes. */
  est_cycle_min: number;
  /** True = this step is a quality gate (first-article / final inspection). */
  is_inspection_gate: boolean;
  /** True = this step is an outside service (the part leaves the building). */
  is_outside_service: boolean;
  /** The per-department checklist the assigned employee works. */
  checklist: ChecklistItem[];
}

export interface TravelerGenerationInput {
  job_id: string;
  part_number: string;
  /** Part revision (default "A"). */
  revision?: string;
  customer?: string;
  /** Material ISO group (P/M/K/N/S/H) -- drives ProcessPlanEngine speeds. */
  material_iso_group: string;
  material_name?: string;
  /** Part features (from blueprint extraction / quote). Drives machining ops
   * AND data-driven department inclusion (grind/edm/inspection). */
  features: PartFeature[];
  /** Stock envelope (mm). */
  stock: { x_mm: number; y_mm: number; z_mm: number };
  /** Job quantity (default 1 = first article). */
  batch_size?: number;
  /** Quoted finish / outside service (e.g. "black_oxide", "anodize", "zinc_plate").
   * Presence adds the Finishing step. Absence omits it. */
  quoted_finish?: string;
  /** A proven program already exists -> skip the Programming step. */
  has_proven_program?: boolean;
  /** Stock comes pre-cut to size -> skip the Saw step. */
  stock_precut?: boolean;
}

export interface GeneratedTraveler {
  job_id: string;
  part_number: string;
  revision: string;
  customer: string;
  total_steps: number;
  departments: TravelerDepartment[];
  steps: GeneratedTravelerStep[];
  /** Sum of est setup+cycle minutes across all steps (cycle x batch). */
  est_total_min: number;
  /** Advisory notes from generation (e.g. why a dept was included/omitted). */
  notes: string[];
}

// ============================================================================
// DEPARTMENT CHECKLIST TEMPLATES
// (mirrors DigitalWorkInstructionEngine's requires_signoff/acceptance shape;
//  generic safety items prepend every machining step)
// ============================================================================

/** Items prepended to every cutting/machine step (programming/QC/ship are exempt). */
const SAFETY_CHECKLIST: Omit<ChecklistItem, "id">[] = [
  { label: "Safety glasses + guards verified, E-stop functional", required: true, signoff: false },
  { label: "Coolant level + chip evacuation checked", required: false, signoff: false },
];

const DEPARTMENT_CHECKLIST_TEMPLATES: Record<TravelerDepartment, Omit<ChecklistItem, "id">[]> = {
  programming: [
    { label: "Program written & verified against print revision", required: true, signoff: true, acceptance_criteria: "Toolpath matches drawing geometry + tolerances" },
    { label: "Tool list generated & cross-checked vs tool crib", required: true, signoff: false },
    { label: "Setup sheet attached to job packet", required: true, signoff: false },
    { label: "Program proven out (dry run / single block)", required: true, signoff: true, acceptance_criteria: "No collisions, all moves within travel" },
  ],
  saw: [
    { label: "Stock material + heat/lot verified vs traveler", required: true, signoff: true, acceptance_criteria: "Material cert matches quoted grade" },
    { label: "Cut length + qty verified (incl. saw kerf allowance)", required: true, signoff: false },
    { label: "Blanks deburred & labeled with job number", required: true, signoff: false },
  ],
  machining: [
    { label: "Correct program loaded + work offsets (G54..) set", required: true, signoff: true },
    { label: "Tool offsets verified before first cut", required: true, signoff: true, acceptance_criteria: "Z + diameter offsets confirmed at the control" },
    { label: "First part to inspection before running batch", required: true, signoff: true, acceptance_criteria: "First-article approved by QC" },
    { label: "In-process check every N parts per control plan", required: false, signoff: false },
  ],
  turning: [
    { label: "Correct program loaded + work offsets set", required: true, signoff: true },
    { label: "Tool offsets + tool nose radius comp verified", required: true, signoff: true },
    { label: "First part to inspection before running batch", required: true, signoff: true, acceptance_criteria: "First-article approved by QC" },
  ],
  grinding: [
    { label: "Wheel dressed + balanced; spark-out confirmed", required: true, signoff: true },
    { label: "Stock allowance verified before grinding", required: true, signoff: false },
    { label: "Size + finish to print after grind", required: true, signoff: true, acceptance_criteria: "Ra + dimension within print tolerance" },
  ],
  edm: [
    { label: "Wire/electrode + dielectric verified", required: true, signoff: false },
    { label: "Start hole / reference established", required: true, signoff: false },
    { label: "Skim passes completed to size + finish", required: true, signoff: true, acceptance_criteria: "Final pass to print tolerance" },
  ],
  deburr: [
    { label: "All edges deburred / broken per print", required: true, signoff: false },
    { label: "Part cleaned of chips, swarf, coolant", required: true, signoff: false },
    { label: "Visual check -- no nicks, burrs, or handling damage", required: true, signoff: true },
  ],
  finishing: [
    { label: "Outside-service PO issued to vendor", required: true, signoff: true, acceptance_criteria: "Finish spec + qty match quote" },
    { label: "Masking / plating callouts communicated to vendor", required: false, signoff: false },
    { label: "Parts logged out + return date tracked", required: true, signoff: false },
    { label: "Finish + cert verified on return", required: true, signoff: true, acceptance_criteria: "Coating thickness / color per spec" },
  ],
  inspection: [
    { label: "Measure all critical dimensions per print", required: true, signoff: true, acceptance_criteria: "All dimensions within drawing tolerance" },
    { label: "GD&T / form tolerances verified", required: true, signoff: true },
    { label: "Inspection report / FAI completed & signed", required: true, signoff: true, acceptance_criteria: "AS9102 / customer FAI form complete" },
  ],
  shipping: [
    { label: "Quantity matches customer PO", required: true, signoff: true },
    { label: "Certificate of Conformance attached", required: true, signoff: true, acceptance_criteria: "Material + process certs included" },
    { label: "Packaging per customer spec; labeled with PO + part #", required: true, signoff: false },
    { label: "Shipment booked + tracking recorded", required: true, signoff: false },
  ],
};

/** Default role per department for the non-machining spine. */
const DEPARTMENT_DEFAULT_ROLE: Record<TravelerDepartment, TravelerRole> = {
  programming: "programmer",
  saw: "operator",
  machining: "operator",
  turning: "operator",
  grinding: "operator",
  edm: "operator",
  deburr: "operator",
  finishing: "planner",
  inspection: "inspector",
  shipping: "operator",
};

// ============================================================================
// FEATURE -> DEPARTMENT INCLUSION (data-driven spine)
// ============================================================================

/** Feature types that require the Grinding department (tight-tolerance ground surfaces). */
const GRIND_FEATURE_TYPES = new Set(["bore"]);
/** Feature types that require the EDM department. */
const EDM_FEATURE_TYPES = new Set(["edm", "wire", "sinker"]);
/** Feature types that are turned (lathe) rather than milled. */
const TURN_FEATURE_TYPES = new Set(["groove", "thread"]);

/** Tolerance (mm) below which a bore feature is treated as ground (precision).
 * ~0.0005 in -- the JM convention for "must be ground" surfaces. */
const GRIND_TOLERANCE_MM = 0.013;

/** Setup-time allowances (min) by step, used when ProcessPlanEngine bundles
 * setup into the first op's run time. Named to avoid magic numbers. */
const SETUP_ALLOWANCE_MIN = {
  programming: 60,
  saw: 10,
  machining_first: 20,
  grinding: 25,
  edm: 30,
  finishing: 15,
} as const;

function hasGroundFeature(features: PartFeature[]): boolean {
  return features.some(
    (f) =>
      GRIND_FEATURE_TYPES.has(f.type) &&
      typeof f.tolerance_mm === "number" &&
      f.tolerance_mm > 0 &&
      f.tolerance_mm <= GRIND_TOLERANCE_MM,
  );
}

function hasEdmFeature(features: PartFeature[]): boolean {
  return features.some((f) => EDM_FEATURE_TYPES.has(String(f.type)));
}

/** A part is "turned" if every cutting feature is turn-type (no prismatic mill
 * features). Conservative: mill is the default. */
function isTurnedPart(features: PartFeature[]): boolean {
  if (features.length === 0) return false;
  const millFeatures = features.filter(
    (f) => !TURN_FEATURE_TYPES.has(f.type) && !EDM_FEATURE_TYPES.has(String(f.type)),
  );
  const turnFeatures = features.filter((f) => TURN_FEATURE_TYPES.has(f.type));
  return turnFeatures.length > 0 && millFeatures.length === 0;
}

// ============================================================================
// ENGINE
// ============================================================================

export class TravelerGenerationOrchestratorEngine {
  /**
   * Generate the full print->shipping traveler from a part/quote spec.
   * @param input - part spec + quoted finish + flags
   * @returns ordered GeneratedTravelerStep[] with dept/role/checklist
   * @throws if job_id / part_number missing, or material_iso_group invalid
   */
  generate(input: TravelerGenerationInput): GeneratedTraveler {
    if (!input || !input.job_id || input.job_id.trim().length === 0) {
      throw new Error("TravelerGenerationOrchestrator: job_id is required");
    }
    if (!input.part_number || input.part_number.trim().length === 0) {
      throw new Error("TravelerGenerationOrchestrator: part_number is required");
    }
    if (!input.material_iso_group || !/^[PMKNSH]$/.test(input.material_iso_group.toUpperCase())) {
      throw new Error(
        `TravelerGenerationOrchestrator: material_iso_group must be one of P/M/K/N/S/H, got '${input.material_iso_group}'`,
      );
    }
    const features = Array.isArray(input.features) ? input.features : [];
    const batch =
      Number.isFinite(input.batch_size) && (input.batch_size as number) > 0
        ? Math.floor(input.batch_size as number)
        : 1;
    const notes: string[] = [];

    const steps: GeneratedTravelerStep[] = [];
    let seq = 0;

    const push = (
      operation: string,
      department: TravelerDepartment,
      opts: {
        role?: TravelerRole;
        machine_domain?: TravelerMachineDomain;
        est_setup_min?: number;
        est_cycle_min?: number;
        is_inspection_gate?: boolean;
        is_outside_service?: boolean;
        prepend_safety?: boolean;
      } = {},
    ): void => {
      seq += 1;
      const tmpl = DEPARTMENT_CHECKLIST_TEMPLATES[department] ?? [];
      const raw: Omit<ChecklistItem, "id">[] = [
        ...(opts.prepend_safety ? SAFETY_CHECKLIST : []),
        ...tmpl,
      ];
      const checklist: ChecklistItem[] = raw.map((c, i) => ({
        id: `${department}-${seq}-${i + 1}`,
        label: c.label,
        required: c.required,
        signoff: c.signoff,
        ...(c.acceptance_criteria !== undefined ? { acceptance_criteria: c.acceptance_criteria } : {}),
      }));
      steps.push({
        seq,
        op_num: seq * 10,
        operation,
        department,
        role: opts.role ?? DEPARTMENT_DEFAULT_ROLE[department],
        ...(opts.machine_domain !== undefined ? { machine_domain: opts.machine_domain } : {}),
        est_setup_min: round1(opts.est_setup_min ?? 0),
        est_cycle_min: round1(opts.est_cycle_min ?? 0),
        is_inspection_gate: opts.is_inspection_gate ?? false,
        is_outside_service: opts.is_outside_service ?? false,
        checklist,
      });
    };

    // -- 1. Programming -------------------------------------------------------
    if (input.has_proven_program) {
      notes.push("Programming step omitted -- proven program already exists.");
    } else {
      push("Program & prove out", "programming", {
        role: "programmer",
        est_setup_min: SETUP_ALLOWANCE_MIN.programming,
        est_cycle_min: 0,
      });
    }

    // -- 2. Material prep / Saw -----------------------------------------------
    if (input.stock_precut) {
      notes.push("Saw step omitted -- stock supplied pre-cut to size.");
    } else {
      push("Saw stock to size", "saw", {
        role: "operator",
        est_setup_min: SETUP_ALLOWANCE_MIN.saw,
        est_cycle_min: 2,
      });
    }

    // -- 3. Machining ops (from ProcessPlanEngine, dept-tagged) ---------------
    const turned = isTurnedPart(features);
    const machineDept: TravelerDepartment = turned ? "turning" : "machining";
    const machineDomain: TravelerMachineDomain = turned ? "lathe" : "mill";

    const planInput: ProcessPlanInput = {
      part_name: input.part_number,
      material_iso_group: input.material_iso_group.toUpperCase(),
      ...(input.material_name !== undefined ? { material_name: input.material_name } : {}),
      features,
      stock: input.stock,
      batch_size: batch,
    };
    let machiningOpCount = 0;
    try {
      const plan = processPlanEngine.generate(planInput);
      for (const op of plan.operations) {
        machiningOpCount += 1;
        const isFirstSetupOp = machiningOpCount === 1 && /face|rough/i.test(op.operation);
        push(op.operation, machineDept, {
          role: isFirstSetupOp ? "setup_tech" : "operator",
          machine_domain: machineDomain,
          // ProcessPlanEngine bundles setup into the first op's time; attribute a
          // setup allowance to the first machining op, run-time to all.
          est_setup_min: machiningOpCount === 1 ? SETUP_ALLOWANCE_MIN.machining_first : 0,
          est_cycle_min: op.estimated_time_min,
          prepend_safety: true,
        });
      }
      if (plan.playbook_warnings?.length) {
        notes.push(...plan.playbook_warnings.map((w) => `Playbook: ${w}`));
      }
    } catch (e) {
      // Generation is best-effort on the machining slice -- fail loud in notes,
      // never silently drop the whole traveler (R12). A traveler with no
      // machining ops (e.g. pure-purchase part) is still valid downstream.
      notes.push(`Machining ops could not be generated: ${(e as Error).message}`);
    }
    if (machiningOpCount === 0) {
      notes.push("No machining operations generated (no cuttable features supplied).");
    }

    // -- 3b. Grinding (data-driven: only if a tight-tolerance ground feature) -
    if (hasGroundFeature(features)) {
      push("Grind to size & finish", "grinding", {
        role: "operator",
        machine_domain: "grinder",
        est_setup_min: SETUP_ALLOWANCE_MIN.grinding,
        est_cycle_min: 8,
        prepend_safety: true,
      });
    } else {
      notes.push("Grinding omitted -- no ground (<=0.013 mm) bore feature.");
    }

    // -- 3c. EDM (data-driven: only if an EDM feature) ------------------------
    if (hasEdmFeature(features)) {
      push("Wire / sinker EDM", "edm", {
        role: "operator",
        machine_domain: "wedm",
        est_setup_min: SETUP_ALLOWANCE_MIN.edm,
        est_cycle_min: 15,
        prepend_safety: true,
      });
    } else {
      notes.push("EDM omitted -- no EDM feature.");
    }

    // -- 4. Deburr ------------------------------------------------------------
    if (machiningOpCount > 0 || hasGroundFeature(features) || hasEdmFeature(features)) {
      push("Deburr & clean", "deburr", { role: "operator", est_setup_min: 0, est_cycle_min: 3 });
    }

    // -- 4b. Outside-service Finishing (only if a finish was quoted) ----------
    if (input.quoted_finish && input.quoted_finish.trim().length > 0) {
      push(`Outside finishing: ${input.quoted_finish}`, "finishing", {
        role: "planner",
        est_setup_min: SETUP_ALLOWANCE_MIN.finishing,
        est_cycle_min: 0,
        is_outside_service: true,
      });
    } else {
      notes.push("Finishing omitted -- no finish quoted.");
    }

    // -- 5. First-article + Final inspection (gates) -------------------------
    push("First-article inspection", "inspection", {
      role: "inspector",
      est_setup_min: 0,
      est_cycle_min: 15,
      is_inspection_gate: true,
    });
    if (batch > 1) {
      push("Final inspection", "inspection", {
        role: "inspector",
        est_setup_min: 0,
        est_cycle_min: 10,
        is_inspection_gate: true,
      });
    }

    // -- 6. Shipping ----------------------------------------------------------
    push("Pack & ship", "shipping", { role: "operator", est_setup_min: 0, est_cycle_min: 5 });

    // -- Roll-up --------------------------------------------------------------
    const estTotal = steps.reduce(
      (sum, s) => sum + s.est_setup_min + s.est_cycle_min * batch,
      0,
    );
    const departments = Array.from(new Set(steps.map((s) => s.department)));

    return {
      job_id: input.job_id,
      part_number: input.part_number,
      revision: input.revision ?? "A",
      customer: input.customer ?? "N/A",
      total_steps: steps.length,
      departments,
      steps,
      est_total_min: round1(estTotal),
      notes,
    };
  }

  /**
   * Map a generated traveler to RoutingSheetGeneratorEngine input (compose --
   * don't re-implement time roll-up / lead-time). The routing sheet renderer
   * then produces JSON/Markdown/CSV with totals + lead time.
   * @param traveler - a GeneratedTraveler from generate()
   * @param quantity - job quantity for the routing roll-up (default 1)
   * @returns RoutingSheetInput ready for routingSheetGeneratorEngine.generate()
   */
  toRoutingInput(traveler: GeneratedTraveler, quantity = 1): RoutingSheetInput {
    const operations: RoutingOperation[] = traveler.steps.map((s) => ({
      op_num: s.op_num,
      op_name: s.operation,
      machine_id: s.machine_domain ? `${s.machine_domain.toUpperCase()}-TBD` : `${s.department.toUpperCase()}`,
      machine_type: mapMachineType(s),
      setup_min: s.est_setup_min,
      cycle_min: s.est_cycle_min,
      skill_level: mapSkillLevel(s.role),
      notes: s.is_inspection_gate ? "Quality gate" : s.is_outside_service ? "Outside service" : "",
    }));
    return {
      job_id: traveler.job_id,
      part_number: traveler.part_number,
      revision: traveler.revision,
      customer: traveler.customer,
      quantity,
      operations,
    };
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function round1(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.round(x * 10) / 10;
}

/** Map a generated step to RoutingSheetGeneratorEngine's machine_type union. */
function mapMachineType(
  s: GeneratedTravelerStep,
): NonNullable<RoutingOperation["machine_type"]> {
  switch (s.department) {
    case "machining": return "mill";
    case "turning": return "lathe";
    case "grinding": return "grinder";
    case "edm": return s.machine_domain === "wedm" ? "wedm" : "sinker";
    case "saw": return "saw";
    case "inspection": return "inspection";
    case "deburr": return "deburr";
    default: return "other";
  }
}

/** Map a traveler role to RoutingSheetGeneratorEngine's skill_level union. */
function mapSkillLevel(role: TravelerRole): NonNullable<RoutingOperation["skill_level"]> {
  switch (role) {
    case "programmer":
    case "inspector":
    case "lead": return "master";
    case "setup_tech":
    case "planner": return "journeyman";
    default: return "apprentice";
  }
}

export const travelerGenerationOrchestratorEngine = new TravelerGenerationOrchestratorEngine();
