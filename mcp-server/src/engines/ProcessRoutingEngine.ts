/**
 * ProcessRoutingEngine -- auto-route a manufacturing process plan to JM Die's
 * REAL machines, across the FULL build process.
 *
 * Closes the keystone gap exposed by the C-033626 flattening-die-set quote
 * (machining times were LLM-guessed because nothing routed a part's operations
 * to specific JM machines). This engine decomposes a part into an ordered
 * operation sequence and assigns each operation to a capable JM machine from
 * ShopConfigurationEngine (with its effective hourly rate + setup count),
 * INCLUDING the hardened-tool / die-build stages -- heat-treat, surface/jig
 * grind, wire & sinker EDM, jig-bore, assembly, inspection -- that the
 * milling-only ProcessPlanEngine does not cover.
 *
 * Composes (no duplication -- verified against ProcessPlanEngine /
 * JobRoutingTemplateEngine / MachineSelectionEngine on 2026-06-18):
 *   - ProcessPlanEngine.generate ............ milling feature decomposition
 *   - ShopConfigurationEngine.selectCapableMachines  capability -> JM machine + rate
 *   - ShopConfigurationEngine.getRates ...... bench / setup / inspection labor rates
 *
 * SCOPE (U1): routing + machine assignment + setup model + PROVISIONAL time.
 * Each operation carries an explicit `time_source`. Physics-grounded cycle time
 * (mill/turn/drill via SpeedFeedOrchestrator, wire-EDM via mrr_mm2_min, grind
 * via mrr_mm3_per_s) is layered on by ProcessCycleTimeEngine (U2), which
 * replaces every `pending-physics` / `process-plan-parametric` entry. This unit
 * never fabricates a machining minute it cannot ground -- it flags it instead.
 *
 * Convention: matches ProcessPlanEngine / JobRoutingTemplateEngine (plain typed
 * result objects, not AtomicValue -- this is an orchestration/routing engine, not
 * a physics calc engine). Rates come ONLY from ShopConfigurationEngine -- never
 * inline a shop rate here (charlie soul refuse: inline-shop-rate-constants).
 *
 * Actions: quote_route_operations (businessDispatcher)
 *
 * @milestone QUOTE-GROUNDING-MS0/U1-PROCESS-ROUTING (slot:charlie, 2026-06-18)
 */

import { shopConfigurationEngine } from "./ShopConfigurationEngine.js";
import { processPlanEngine, type PartFeature, type ProcessPlan } from "./ProcessPlanEngine.js";

// ============================================================================
// TYPES
// ============================================================================

/** Every manufacturing process stage PRISM routes for a JM build. */
export type ProcessKind =
  | "saw"
  | "mill"
  | "turn"
  | "drill"
  | "tap"
  | "heat_treat"
  | "surface_grind"
  | "jig_grind"
  | "jig_bore"
  | "wire_edm"
  | "sinker_edm"
  | "assembly"
  | "inspect";

/** How an operation's hourly cost is sourced. */
export type RateBasis = "machine" | "bench_labor" | "inspection" | "outsource";

/** Provenance of an operation's time estimate (honesty -- never a bare guess). */
export type TimeSource =
  | "process-plan-parametric" // from ProcessPlanEngine (milling, parametric)
  | "operator-hint"           // caller supplied provisional_time_min
  | "setup-model"             // bench/assembly modeled from setup labor
  | "pending-physics";        // routed but NOT yet grounded -- U2 must fill

/**
 * A non-milling / die-build step the caller declares explicitly (the stages
 * ProcessPlanEngine cannot derive from milling features). Geometry hints are
 * carried verbatim so U2 can compute grounded time from them.
 */
export interface ProcessStepRequirement {
  kind: ProcessKind;
  description?: string;
  tolerance_mm?: number;
  setup_count?: number;
  /** Optional known time (operator/estimator). Wins over the setup model. */
  provisional_time_min?: number;
  /** Geometry carried through for U2 grounded cycle-time. */
  geometry?: {
    cut_length_mm?: number;   // wire/sinker EDM profile length
    height_mm?: number;       // EDM workpiece height
    passes?: number;          // EDM rough + skim passes
    stock_volume_mm3?: number;// grinding stock to remove
    bores?: number;           // jig-bore hole count
  };
}

export interface ProcessRoutingInput {
  part_name: string;
  /** ISO machinability group P|M|K|N|S|H -- drives ProcessPlanEngine speeds. */
  material_iso_group: string;
  material_name?: string;
  /** Rockwell C hardness of the FINISHED part. >= HARDENED_HRC auto-injects
   *  heat-treat + forces post-HT finishing (grind/EDM) routing. */
  hardness_hrc?: number;
  /** Milling features -> ProcessPlanEngine. */
  features?: PartFeature[];
  /** Die-build / non-milling steps the caller declares. */
  extra_steps?: ProcessStepRequirement[];
  /** Stock / part envelope (mm) for machine travel feasibility. */
  envelope_mm: { x: number; y: number; z: number };
  /** Tightest tolerance anywhere on the part (mm) -- flags precision routing. */
  tightest_tolerance_mm?: number;
  batch_size?: number;
  /** Shop profile (defaults to JM Die "jm-die"). */
  shop_profile_id?: string;
}

export interface RoutedOperation {
  seq: number;
  kind: ProcessKind;
  operation: string;
  /** Assigned JM machine id, or null for bench-labor / outsourced steps. */
  machine_id: string | null;
  machine_name: string;
  /** Effective $/hr for this op (machine rate, bench labor, or 0 if outsourced). */
  hourly_rate: number;
  rate_basis: RateBasis;
  setup_count: number;
  time_min: number;
  time_source: TimeSource;
  outsource: boolean;
  feature_ids?: string[];
  notes: string[];
}

export interface ProcessRoutingResult {
  part_name: string;
  shop_profile_id: string;
  hardened: boolean;
  operations: RoutedOperation[];
  total_setups: number;
  /** Sum of in-house machine minutes (excludes outsourced + bench). */
  total_machine_minutes: number;
  total_outsource_ops: number;
  /** Steps that could NOT be routed to any JM machine (no capable machine). */
  unroutable: Array<{ kind: ProcessKind; reason: string }>;
  warnings: string[];
}

// ============================================================================
// ROUTING TABLES (capability tags only -- NO rates inline; rates come from
// ShopConfigurationEngine.selectCapableMachines / getRates)
// ============================================================================

/** Rockwell C at/above which a part is treated as hardened (HT + post-HT finish). */
const HARDENED_HRC = 50;
/** Tolerance (mm) at/below which an op is flagged precision-class. */
const PRECISION_TOLERANCE_MM = 0.013; // ~0.0005"

/** ProcessKind -> ShopConfiguration capability tags (primary, then fallback). */
const KIND_CAPABILITY: Record<ProcessKind, { primary: string[]; fallback?: string[] }> = {
  saw:           { primary: ["cutoff"] },
  mill:          { primary: ["milling"] },
  turn:          { primary: ["turning"] },
  drill:         { primary: ["drilling"], fallback: ["milling"] },
  tap:           { primary: ["tapping"], fallback: ["milling"] },
  jig_bore:      { primary: ["boring"], fallback: ["milling"] },
  surface_grind: { primary: ["surface_grinding"], fallback: ["flat_grinding"] },
  jig_grind:     { primary: ["surface_grinding"], fallback: ["flat_grinding"] }, // JM has no jig grinder
  wire_edm:      { primary: ["wire_edm"] },
  sinker_edm:    { primary: ["sinker_edm"] },
  inspect:       { primary: ["inspection"] },
  heat_treat:    { primary: [] }, // outsourced -- no in-house HT machine
  assembly:      { primary: [] }, // bench labor -- no machine
};

/** Canonical build order. Lower rank runs first. */
const STAGE_RANK: Record<ProcessKind, number> = {
  saw: 0,
  mill: 1,
  drill: 2,
  tap: 3,
  turn: 3,
  heat_treat: 4,
  surface_grind: 5,
  jig_grind: 5,
  wire_edm: 6,
  sinker_edm: 6,
  jig_bore: 7,
  assembly: 8,
  inspect: 9,
};

const DEFAULT_PROFILE = "jm-die";

// ============================================================================
// ENGINE
// ============================================================================

export class ProcessRoutingEngine {
  /**
   * Decompose a part and route every operation to a JM machine.
   * Fail-loud (R12) on structurally invalid input.
   */
  route(input: ProcessRoutingInput): ProcessRoutingResult {
    if (!input || typeof input !== "object") {
      throw new Error("ProcessRoutingEngine.route: input object required");
    }
    if (typeof input.part_name !== "string" || input.part_name.trim().length === 0) {
      throw new Error("ProcessRoutingEngine.route: part_name required");
    }
    if (!input.material_iso_group || typeof input.material_iso_group !== "string") {
      throw new Error("ProcessRoutingEngine.route: material_iso_group required");
    }
    const env = input.envelope_mm;
    if (!env || !Number.isFinite(env.x) || !Number.isFinite(env.y) || !Number.isFinite(env.z) ||
        env.x <= 0 || env.y <= 0 || env.z <= 0) {
      throw new Error("ProcessRoutingEngine.route: envelope_mm {x,y,z} must be positive");
    }

    const profileId = input.shop_profile_id ?? DEFAULT_PROFILE;
    const hardened = (input.hardness_hrc ?? 0) >= HARDENED_HRC;
    const warnings: string[] = [];
    const unroutable: Array<{ kind: ProcessKind; reason: string }> = [];
    const rates = shopConfigurationEngine.getRates(profileId);

    // ---- 1. Collect raw (un-routed) steps ---------------------------------
    type RawStep = {
      kind: ProcessKind;
      operation: string;
      tolerance_mm?: number;
      setup_count: number;
      provisional_time_min?: number;
      time_source: TimeSource;
      feature_ids?: string[];
      notes: string[];
    };
    const raw: RawStep[] = [];

    // 1a. Milling features -> ProcessPlanEngine (parametric time).
    if (Array.isArray(input.features) && input.features.length > 0) {
      let plan: ProcessPlan | null = null;
      try {
        plan = processPlanEngine.generate({
          part_name: input.part_name,
          material_iso_group: input.material_iso_group,
          material_name: input.material_name,
          features: input.features,
          stock: { x_mm: env.x, y_mm: env.y, z_mm: env.z },
          batch_size: input.batch_size,
        });
      } catch (e) {
        warnings.push(`ProcessPlanEngine failed (${(e as Error).message}); milling ops skipped`);
      }
      if (plan) {
        for (const op of plan.operations) {
          raw.push({
            kind: classifyMillingOp(op.operation),
            operation: op.operation,
            tolerance_mm: input.tightest_tolerance_mm,
            setup_count: 1,
            provisional_time_min: op.estimated_time_min,
            time_source: "process-plan-parametric",
            feature_ids: op.feature_ids,
            notes: [],
          });
        }
      }
    }

    // 1b. Auto-inject heat-treat for hardened parts (between soft machining and finish).
    if (hardened && !(input.extra_steps ?? []).some(s => s.kind === "heat_treat")) {
      raw.push({
        kind: "heat_treat",
        operation: `Heat treat to Rc ${input.hardness_hrc} (outside service)`,
        setup_count: 0,
        time_source: "setup-model",
        notes: ["auto-injected: hardness_hrc >= " + HARDENED_HRC],
      });
    }

    // 1c. Explicit non-milling / die-build steps.
    for (const step of input.extra_steps ?? []) {
      if (!step || !Object.prototype.hasOwnProperty.call(STAGE_RANK, step.kind)) {
        warnings.push(`extra_steps: ignored unknown kind '${step?.kind}'`);
        continue;
      }
      raw.push({
        kind: step.kind,
        operation: step.description ?? defaultOpName(step.kind),
        tolerance_mm: step.tolerance_mm ?? input.tightest_tolerance_mm,
        setup_count: Number.isFinite(step.setup_count as number) ? Math.max(0, step.setup_count as number) : 1,
        provisional_time_min: step.provisional_time_min,
        time_source: step.provisional_time_min !== undefined ? "operator-hint" : "pending-physics",
        notes: [],
      });
    }

    if (raw.length === 0) {
      throw new Error("ProcessRoutingEngine.route: no operations -- supply features and/or extra_steps");
    }

    // ---- 2. Stable canonical-order sort ------------------------------------
    const ordered = raw
      .map((s, i) => ({ s, i }))
      .sort((a, b) => {
        const r = STAGE_RANK[a.s.kind] - STAGE_RANK[b.s.kind];
        return r !== 0 ? r : a.i - b.i; // stable within a stage (preserve decomposition order)
      })
      .map(x => x.s);

    // ---- 3. Route each step to a machine ----------------------------------
    const operations: RoutedOperation[] = [];
    let seq = 0;
    for (const step of ordered) {
      seq += 1;
      const routed = this.routeStep(step, profileId, rates, env, unroutable);
      operations.push({ ...routed, seq });
    }

    // ---- 4. Aggregate ------------------------------------------------------
    const total_machine_minutes = round2(
      operations
        .filter(o => o.rate_basis === "machine" || o.rate_basis === "inspection")
        .reduce((s, o) => s + o.time_min, 0),
    );
    const total_outsource_ops = operations.filter(o => o.outsource).length;
    // Setups = number of machine transitions (a new setup whenever the machine changes).
    let total_setups = 0;
    let prevMachine: string | null | undefined = undefined;
    for (const o of operations) {
      if (o.machine_id !== null && o.machine_id !== prevMachine) {
        total_setups += o.setup_count > 0 ? o.setup_count : 1;
        prevMachine = o.machine_id;
      }
    }
    if (total_setups === 0) total_setups = 1;

    if (operations.some(o => o.time_source === "pending-physics")) {
      warnings.push("Some operations have pending-physics time -- run ProcessCycleTimeEngine (U2) to ground them before costing.");
    }

    return {
      part_name: input.part_name,
      shop_profile_id: profileId,
      hardened,
      operations,
      total_setups,
      total_machine_minutes,
      total_outsource_ops,
      unroutable,
      warnings,
    };
  }

  /** Route a single step to its JM machine / bench / outsource lane. */
  private routeStep(
    step: { kind: ProcessKind; operation: string; tolerance_mm?: number; setup_count: number; provisional_time_min?: number; time_source: TimeSource; feature_ids?: string[]; notes: string[] },
    profileId: string,
    rates: { labor_per_hr: number; inspection_per_hr: number; setup_per_hr: number },
    env: { x: number; y: number; z: number },
    unroutable: Array<{ kind: ProcessKind; reason: string }>,
  ): Omit<RoutedOperation, "seq"> {
    const notes = [...step.notes];
    const time_min = step.provisional_time_min !== undefined ? round2(step.provisional_time_min) : 0;

    // Heat treat -> outside service (no in-house HT machine in the JM roster).
    if (step.kind === "heat_treat") {
      return {
        kind: step.kind, operation: step.operation,
        machine_id: null, machine_name: "Outside heat treater",
        hourly_rate: 0, rate_basis: "outsource",
        setup_count: 0, time_min, time_source: step.time_source,
        outsource: true, feature_ids: step.feature_ids,
        notes: [...notes, "outside service -- pass-through cost (priced by U5 expenses)"],
      };
    }

    // Assembly -> bench labor (no machine).
    if (step.kind === "assembly") {
      return {
        kind: step.kind, operation: step.operation,
        machine_id: null, machine_name: "Bench (assembly)",
        hourly_rate: rates.labor_per_hr, rate_basis: "bench_labor",
        setup_count: step.setup_count, time_min,
        time_source: step.provisional_time_min !== undefined ? "operator-hint" : "setup-model",
        outsource: false, feature_ids: step.feature_ids, notes,
      };
    }

    // Everything else -> capability-route to a JM machine.
    const tags = KIND_CAPABILITY[step.kind];
    let capable = shopConfigurationEngine.selectCapableMachines(
      { capabilities: tags.primary, min_work_envelope_mm: { x: env.x, y: env.y, z: env.z } },
      profileId,
    ).filter(m => m.rejection_reasons.length === 0);

    // Envelope filter can over-reject machines whose envelope isn't populated for
    // EDM/grind/inspect; retry capability-only before declaring unroutable.
    if (capable.length === 0) {
      capable = shopConfigurationEngine.selectCapableMachines({ capabilities: tags.primary }, profileId)
        .filter(m => m.rejection_reasons.length === 0);
    }
    // Fallback capability (e.g. tap/drill/jig_bore -> milling machine).
    if (capable.length === 0 && tags.fallback) {
      capable = shopConfigurationEngine.selectCapableMachines({ capabilities: tags.fallback }, profileId)
        .filter(m => m.rejection_reasons.length === 0);
      if (capable.length > 0) notes.push(`routed via fallback capability ${tags.fallback.join("/")}`);
    }

    if (capable.length === 0) {
      unroutable.push({ kind: step.kind, reason: `no JM machine with capability ${tags.primary.join("/")}` });
      return {
        kind: step.kind, operation: step.operation,
        machine_id: null, machine_name: "UNROUTABLE (outsource candidate)",
        hourly_rate: 0, rate_basis: "outsource",
        setup_count: step.setup_count, time_min, time_source: step.time_source,
        outsource: true, feature_ids: step.feature_ids,
        notes: [...notes, `no in-house ${step.kind} capability -- flag for outside vendor`],
      };
    }

    // Precision-class ops: selectCapableMachines already sorted cheapest-first
    // (lowest effective rate). It does NOT filter by accuracy, so flag tight
    // tolerances for an operator feasibility check rather than silently trusting.
    const precision = (step.tolerance_mm ?? Infinity) <= PRECISION_TOLERANCE_MM;
    const chosen = capable[0];
    if (precision) {
      notes.push(`precision op (tol <= ${PRECISION_TOLERANCE_MM}mm) -- verify ${chosen.machine_name} holds the callout`);
    }
    if (step.kind === "jig_grind") {
      notes.push("JM roster has no dedicated jig grinder -- routed to surface grinder; confirm fixturing");
    }

    return {
      kind: step.kind, operation: step.operation,
      machine_id: chosen.machine_id, machine_name: chosen.machine_name,
      hourly_rate: chosen.effective_rate, rate_basis: step.kind === "inspect" ? "inspection" : "machine",
      setup_count: step.setup_count, time_min, time_source: step.time_source,
      outsource: false, feature_ids: step.feature_ids, notes,
    };
  }
}

// ============================================================================
// HELPERS
// ============================================================================

/** Map a ProcessPlanEngine operation label to a ProcessKind. */
function classifyMillingOp(label: string): ProcessKind {
  const l = label.toLowerCase();
  if (l.includes("drill") || l.includes("center drill")) return "drill";
  if (l.includes("thread") || l.includes("tap")) return "tap";
  if (l.includes("bore")) return "jig_bore";
  return "mill"; // face/pocket/slot/profile/chamfer/3d
}

function defaultOpName(kind: ProcessKind): string {
  const names: Record<ProcessKind, string> = {
    saw: "Saw stock to size",
    mill: "Mill",
    turn: "Turn",
    drill: "Drill",
    tap: "Tap",
    heat_treat: "Heat treat (outside service)",
    surface_grind: "Surface grind to size",
    jig_grind: "Jig grind precision feature",
    jig_bore: "Jig bore precision hole(s)",
    wire_edm: "Wire EDM form contour",
    sinker_edm: "Sinker EDM cavity",
    assembly: "Assemble / press-fit / fit",
    inspect: "First-article inspection",
  };
  return names[kind];
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Process Routing Engine singleton. */
export const processRoutingEngine = new ProcessRoutingEngine();
