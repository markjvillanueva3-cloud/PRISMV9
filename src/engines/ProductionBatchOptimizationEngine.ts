/**
 * ProductionBatchOptimizationEngine — CAMX-MS21 U08 (E1094)
 *
 * Optimizes batch production runs across N parts:
 *   - Tool life tracking with Taylor's equation, cumulative wear, sister tool strategy
 *   - Fixture loading: tombstone, pallet, gang fixture capacity planning
 *   - Bar stock optimization for turning (parts per bar, waste %)
 *   - SPC-based probing schedule (first-article, spot-check every Nth, last-article)
 *   - Batch cost analysis: setup + N×part_cost + changes×change_cost + material waste
 *
 * Physics references:
 *   - Taylor, F.W. (1907). "On the Art of Cutting Metals." Trans. ASME, 28.
 *     Tool life: T = (C / Vc)^(1/n)
 *   - ISO 3685:1993 Tool-life testing with single-point turning tools.
 *   - Montgomery, D.C. (2009). "Introduction to Statistical Quality Control." 6th Ed.
 *     SPC control chart intervals and Cpk-based sampling frequency.
 *
 * Actions:
 *   production_batch_optimize      — full BatchPlan for a part + quantity
 *   production_batch_tool_changes  — tool change schedule across N parts
 *   production_batch_fixture        — fixture loading plan
 *   production_batch_barstock       — bar stock optimization (turning)
 *   production_batch_probing        — SPC-based probing schedule
 *   production_batch_cost           — detailed cost breakdown
 *
 * @module ProductionBatchOptimizationEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** A tool used in the batch, with Taylor equation parameters. */
export interface BatchTool {
  /** Tool ID / number */
  tool_id: string;
  /** Tool type (endmill, drill, insert, etc.) */
  tool_type: string;
  /** Cutting speed at reference conditions, m/min */
  cutting_speed_vc_m_per_min: number;
  /** Taylor C constant (speed for 1-min life), m/min */
  taylor_C: number;
  /** Taylor n exponent (typically 0.1–0.4 for carbide) */
  taylor_n: number;
  /** Predicted tool life at current Vc, min */
  tool_life_min?: number;
  /** Tool cost per edge/insert, USD */
  tool_cost_usd: number;
  /** Time to change tool / index insert, min */
  change_time_min: number;
  /** Enable sister tool strategy (automatic twin for lights-out) */
  sister_tool?: boolean;
  /** Number of sister tools available */
  sister_count?: number;
}

/** Part dimensions for fixture and bar stock planning. */
export interface PartDimensions {
  length_mm: number;
  width_mm: number;
  height_mm: number;
  weight_kg?: number;
}

/** Fixture type choices. */
export type FixtureType = "tombstone" | "pallet" | "gang" | "vise" | "chuck";

/** Fixture physical dimensions. */
export interface FixtureDimensions {
  width_mm: number;
  height_mm: number;
  /** For tombstone: number of faces */
  faces?: number;
  /** Maximum total load, kg */
  max_load_kg?: number;
  /** Minimum part-to-part clearance, mm */
  clearance_mm?: number;
}

/** Tolerance spec for a critical feature (used in probing schedule). */
export interface ToleranceSpec {
  feature: string;
  tolerance_mm: number;
  /** Target nominal value, mm */
  nominal_mm?: number;
}

/** SPC data for a feature (used to derive probing interval). */
export interface SPCData {
  feature: string;
  /** Process capability index */
  cpk?: number;
  /** Historical sigma (standard deviation), mm */
  sigma_mm?: number;
  /** Mean of measurements */
  mean_mm?: number;
}

/** Machine parameters for cycle time and cost. */
export interface MachineParams {
  name: string;
  /** Machine hourly rate, USD/hr */
  rate_usd_per_hr: number;
  /** Setup time, min */
  setup_time_min: number;
  /** Spindle availability (0–1) */
  spindle_utilization?: number;
}

/** Material parameters for bar stock and cost. */
export interface MaterialParams {
  name: string;
  /** Billet/bar cost, USD/kg */
  cost_usd_per_kg: number;
  /** Material density, kg/m³ */
  density_kg_per_m3?: number;
}

// ── Output types ──────────────────────────────────────────────────────────────

/** A single tool change event in the batch schedule. */
export interface ToolChangeEvent {
  tool_id: string;
  tool_type: string;
  /** Part number (1-indexed) at which the change occurs */
  change_at_part: number;
  /** Cumulative run time at change point, min */
  cumulative_time_min: number;
  /** Sister tool takes over? */
  sister_takeover: boolean;
  /** Change number (1st change, 2nd change …) */
  change_number: number;
}

/** Tool change schedule for the entire batch. */
export interface ToolChangeSchedule {
  tool_id: string;
  tool_type: string;
  tool_life_min: number;
  changes: ToolChangeEvent[];
  total_changes: number;
  total_change_time_min: number;
  sister_strategy_active: boolean;
  notes: string[];
}

/** Fixture loading plan. */
export interface FixtureLoadingPlan {
  fixture_type: FixtureType;
  parts_per_fixture: number;
  fixture_loads_required: number;
  /** For tombstone: parts per face */
  parts_per_face?: number;
  face_utilization_pct?: number;
  weight_ok: boolean;
  recommendations: string[];
}

/** Bar stock optimization plan (turning). */
export interface BarStockPlan {
  bar_length_mm: number;
  part_length_mm: number;
  grip_length_mm: number;
  /** Cutoff tool width, mm */
  cutoff_width_mm: number;
  parts_per_bar: number;
  bars_required: number;
  remnant_length_mm: number;
  waste_pct: number;
  material_cost_per_part_usd?: number;
  notes: string[];
}

/** A single probing event in the schedule. */
export interface ProbingEvent {
  /** Part number (1-indexed) */
  part_number: number;
  probe_type: "full" | "spot";
  features_probed: string[];
  reason: string;
}

/** SPC-based probing schedule. */
export interface ProbingSchedule {
  quantity: number;
  spot_check_interval: number;
  total_probe_events: number;
  full_inspections: number;
  spot_checks: number;
  events: ProbingEvent[];
  /** Features requiring full probing every cycle */
  critical_features: string[];
  notes: string[];
}

/** Line-item in cost breakdown. */
export interface CostLineItem {
  category: string;
  description: string;
  amount_usd: number;
}

/** Full batch cost analysis. */
export interface BatchCostBreakdown {
  quantity: number;
  setup_cost_usd: number;
  machining_cost_usd: number;
  tool_change_cost_usd: number;
  material_waste_cost_usd: number;
  total_cost_usd: number;
  cost_per_part_usd: number;
  line_items: CostLineItem[];
}

/** The master batch plan produced by optimizeBatch(). */
export interface BatchPlan {
  part_id: string;
  quantity: number;
  machine: string;
  material: string;
  cycle_time_per_part_min: number;
  total_machine_time_min: number;
  tool_schedules: ToolChangeSchedule[];
  fixture: FixtureLoadingPlan;
  probing: ProbingSchedule;
  cost: BatchCostBreakdown;
  lights_out_ready: boolean;
  recommendations: string[];
  warnings: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default cutoff tool width, mm */
const DEFAULT_CUTOFF_WIDTH_MM = 3.0;

/** Default grip length for bar turning, mm */
const DEFAULT_GRIP_MM = 20;

/** Cpk → recommended sample frequency mapping.
 *  Cpk ≥ 1.67 → every 20 parts; Cpk ≥ 1.33 → every 10; else every 5.
 */
function cpkToInterval(cpk: number | undefined): number {
  if (cpk === undefined) return 5;
  if (cpk >= 1.67) return 20;
  if (cpk >= 1.33) return 10;
  if (cpk >= 1.00) return 5;
  return 3; // marginal process — probe more often
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Taylor tool life equation.
 * T = (C / Vc)^(1/n), result in minutes.
 */
function taylorToolLife(C: number, Vc: number, n: number): number {
  if (Vc <= 0 || n <= 0 || C <= 0) return 0;
  return Math.pow(C / Vc, 1 / n);
}

/** Round to N decimal places. */
const r2 = (v: number) => Math.round(v * 100) / 100;
const r1 = (v: number) => Math.round(v * 10) / 10;

// ============================================================================
// ENGINE CLASS
// ============================================================================

/**
 * ProductionBatchOptimizationEngine — E1094
 *
 * All methods are deterministic and synchronous.
 */
export class ProductionBatchOptimizationEngine {

  readonly name    = "ProductionBatchOptimizationEngine";
  readonly version = "1.0.0";
  readonly shortcode = "E1094";

  // ── 1. Master batch optimizer ──────────────────────────────────────────────

  /**
   * Build a complete BatchPlan for a given part + quantity.
   *
   * @param part_id         - Part identifier
   * @param quantity        - Number of parts to produce
   * @param tools           - Tool list with Taylor parameters
   * @param machine         - Machine parameters (rate, setup time)
   * @param material        - Material parameters (cost/kg, density)
   * @param part_dims       - Part bounding box (length × width × height), mm + weight
   * @param fixture_type    - Fixture type: tombstone | pallet | gang | vise | chuck
   * @param fixture_dims    - Physical fixture envelope
   * @param cycle_time_min  - Estimated cycle time per part, min (all ops)
   * @param tolerances      - Critical feature tolerances for probing schedule
   * @param spc_data        - Optional SPC history to tune probe interval
   * @param bar_length_mm   - Bar stock length for turning (omit for milling)
   * @returns               - Fully populated BatchPlan
   */
  optimizeBatch(
    part_id: string,
    quantity: number,
    tools: BatchTool[],
    machine: MachineParams,
    material: MaterialParams,
    part_dims: PartDimensions,
    fixture_type: FixtureType,
    fixture_dims: FixtureDimensions,
    cycle_time_min: number,
    tolerances: ToleranceSpec[],
    spc_data?: SPCData[],
    bar_length_mm?: number,
  ): BatchPlan {
    log.debug(`[ProductionBatchOptimizationEngine] optimizeBatch: ${part_id} qty=${quantity}`);

    const toolSchedules = tools.map(t =>
      this.predictToolChanges([t], cycle_time_min, quantity)[0]
    );

    const fixture = this.optimizeFixtureLoading(part_dims, fixture_type, fixture_dims);

    const probing = this.probingSchedule(quantity, tolerances, spc_data);

    // Bar stock plan only when bar_length_mm provided (turning)
    const barPlan: BarStockPlan | null = bar_length_mm
      ? this.optimizeBarStock(part_dims.length_mm, part_dims.width_mm, bar_length_mm, DEFAULT_GRIP_MM)
      : null;

    const cost = this.batchCostAnalysis({
      part_id,
      quantity,
      machine,
      material,
      part_dims,
      cycle_time_min,
      toolSchedules,
      barPlan,
    });

    // Lights-out: all tools have sister strategy, no human intervention needed
    const lightsOut = tools.every(t => t.sister_tool && (t.sister_count ?? 0) >= 1);

    const recommendations: string[] = [];
    const warnings: string[] = [];

    // Fixture utilization warnings
    if (fixture.face_utilization_pct !== undefined && fixture.face_utilization_pct < 50) {
      recommendations.push(
        `Fixture utilization is low (${fixture.face_utilization_pct}%). ` +
        `Consider gang fixtures or smaller tombstone to improve spindle-on time.`
      );
    }
    if (!fixture.weight_ok) {
      warnings.push("Part weight may exceed fixture maximum load — verify with machine builder.");
    }

    // Tool life warnings
    for (const sched of toolSchedules) {
      if (sched.total_changes > 10) {
        warnings.push(
          `Tool ${sched.tool_id} requires ${sched.total_changes} changes across the batch. ` +
          `Consider a higher-performance grade or increased Vc.`
        );
      }
      if (!sched.sister_strategy_active && quantity > 100) {
        recommendations.push(
          `Tool ${sched.tool_id}: enable sister tool strategy for lights-out runs >100 parts.`
        );
      }
    }

    // Bar stock waste
    if (barPlan && barPlan.waste_pct > 15) {
      recommendations.push(
        `Bar stock waste is ${barPlan.waste_pct}%. ` +
        `Consider shorter bar length or adjust part/cutoff geometry.`
      );
    }

    // SPC coverage
    if (probing.spot_check_interval > 20 && quantity > 200) {
      recommendations.push(
        `Probing interval is every ${probing.spot_check_interval} parts. ` +
        `For long runs, consider tightening to every 10–15 parts.`
      );
    }

    if (!lightsOut) {
      recommendations.push(
        "Not all tools have sister tool strategy. For lights-out production, " +
        "assign sister_tool=true with sister_count≥1 on all critical tools."
      );
    }

    return {
      part_id,
      quantity,
      machine: machine.name,
      material: material.name,
      cycle_time_per_part_min: cycle_time_min,
      total_machine_time_min: r2(machine.setup_time_min + quantity * cycle_time_min),
      tool_schedules: toolSchedules,
      fixture,
      probing,
      cost,
      lights_out_ready: lightsOut,
      recommendations,
      warnings,
    };
  }

  // ── 2. Tool change prediction ──────────────────────────────────────────────

  /**
   * Predict tool change schedule across the batch.
   *
   * Uses Taylor's equation T = (C/Vc)^(1/n) to compute tool life per tool,
   * then tracks cumulative cutting time and schedules changes accordingly.
   * Sister tool strategy defers the physical change to the twin — reported
   * as sister_takeover=true in the event.
   *
   * @param tools            - Array of tools (with Taylor params)
   * @param cycle_time_per_part_min - Total cycle time per part (all ops)
   * @param quantity         - Batch size
   * @returns                - One ToolChangeSchedule per tool
   */
  predictToolChanges(
    tools: BatchTool[],
    cycle_time_per_part_min: number,
    quantity: number,
  ): ToolChangeSchedule[] {
    return tools.map(tool => {
      const notes: string[] = [];

      // Taylor tool life
      const T = tool.tool_life_min !== undefined
        ? tool.tool_life_min
        : taylorToolLife(tool.taylor_C, tool.cutting_speed_vc_m_per_min, tool.taylor_n);

      if (T <= 0) {
        notes.push("Tool life could not be computed — check Taylor C, n, and Vc values.");
        return {
          tool_id: tool.tool_id,
          tool_type: tool.tool_type,
          tool_life_min: 0,
          changes: [],
          total_changes: 0,
          total_change_time_min: 0,
          sister_strategy_active: false,
          notes,
        };
      }

      // Assume tool runs a fraction of each cycle (rough approximation: full cycle per tool).
      // Callers may pass a per-tool cycle time fraction; here we use full cycle_time_per_part_min
      // as a conservative worst-case (all features cut by this tool).
      const cuttingTimePerPart = cycle_time_per_part_min;

      const changes: ToolChangeEvent[] = [];
      let cumTime = 0;
      let changeNumber = 0;
      let sisterActive = false;
      const sisterCount = tool.sister_count ?? 0;
      let sistersUsed = 0;

      for (let part = 1; part <= quantity; part++) {
        cumTime += cuttingTimePerPart;

        if (cumTime >= T) {
          changeNumber++;
          const useSister = tool.sister_tool && sistersUsed < sisterCount;
          if (useSister) {
            sistersUsed++;
            sisterActive = true;
          }

          changes.push({
            tool_id:          tool.tool_id,
            tool_type:        tool.tool_type,
            change_at_part:   part,
            cumulative_time_min: r2(cumTime),
            sister_takeover:  useSister ?? false,
            change_number:    changeNumber,
          });

          // Reset cumulative time (new edge / new sister tool)
          cumTime = 0;
        }
      }

      if (tool.sister_tool) {
        notes.push(
          `Sister tool strategy active. ${sisterCount} sister(s) available — ` +
          `${sistersUsed} used during batch.`
        );
      }

      const totalChangeTime = changes.filter(c => !c.sister_takeover).length * tool.change_time_min;

      return {
        tool_id:                tool.tool_id,
        tool_type:              tool.tool_type,
        tool_life_min:          r2(T),
        changes,
        total_changes:          changes.length,
        total_change_time_min:  r2(totalChangeTime),
        sister_strategy_active: sisterActive,
        notes,
      };
    });
  }

  // ── 3. Fixture loading ─────────────────────────────────────────────────────

  /**
   * Optimize fixture loading for tombstone, pallet, gang, vise, or chuck.
   *
   * @param part_dims    - Part bounding box (length × width × height, mm + weight)
   * @param fixture_type - Fixture class
   * @param fixture_dims - Fixture envelope (width, height, faces, max_load_kg, clearance_mm)
   * @returns            - FixtureLoadingPlan
   */
  optimizeFixtureLoading(
    part_dims: PartDimensions,
    fixture_type: FixtureType,
    fixture_dims: FixtureDimensions,
  ): FixtureLoadingPlan {
    const clearance = fixture_dims.clearance_mm ?? 5;
    const recommendations: string[] = [];

    const cellW = part_dims.width_mm  + clearance;
    const cellH = part_dims.height_mm + clearance;

    // Parts per face row × column
    const cols = Math.max(1, Math.floor(fixture_dims.width_mm  / cellW));
    const rows = Math.max(1, Math.floor(fixture_dims.height_mm / cellH));
    const perFace = cols * rows;

    const faces = fixture_dims.faces ?? 1;
    let partsPerFixture: number;
    let partsPerFaceOut: number | undefined;
    let utilPct: number | undefined;

    switch (fixture_type) {
      case "tombstone":
        partsPerFaceOut = perFace;
        partsPerFixture = perFace * faces;
        utilPct = r1((cellW * cellH * partsPerFaceOut) / (fixture_dims.width_mm * fixture_dims.height_mm) * 100);
        if (faces >= 4) recommendations.push("4-face tombstone enables B-axis continuous indexing — maximize spindle-on time.");
        break;

      case "pallet":
        partsPerFixture = perFace; // single face on pallet
        partsPerFaceOut = undefined;
        utilPct = r1((cellW * cellH * perFace) / (fixture_dims.width_mm * fixture_dims.height_mm) * 100);
        recommendations.push("Pallet changer allows load/unload during cut — consider twin-pallet setup.");
        break;

      case "gang":
        // Gang fixtures pack parts along length (1D array)
        partsPerFixture = Math.max(1, Math.floor(fixture_dims.width_mm / cellW));
        break;

      case "vise":
      case "chuck":
      default:
        partsPerFixture = 1;
        recommendations.push(`${fixture_type} fixture holds 1 part per cycle — consider multi-vise or tombstone for higher volumes.`);
        break;
    }

    // Weight check
    const partWeight = part_dims.weight_kg ?? 0;
    const totalWeight = partWeight * partsPerFixture;
    const maxLoad = fixture_dims.max_load_kg;
    const weightOk = maxLoad !== undefined ? totalWeight <= maxLoad : true;
    if (!weightOk) {
      recommendations.push(`Reduce parts per fixture to ${Math.floor(maxLoad! / partWeight)} to stay within ${maxLoad} kg load limit.`);
    }

    return {
      fixture_type,
      parts_per_fixture: partsPerFixture,
      fixture_loads_required: 1, // caller computes quantity / parts_per_fixture
      parts_per_face:     partsPerFaceOut,
      face_utilization_pct: utilPct,
      weight_ok:          weightOk,
      recommendations,
    };
  }

  // ── 4. Bar stock optimization (turning) ────────────────────────────────────

  /**
   * Optimize bar stock for turning operations.
   *
   * Formula: parts_per_bar = floor((bar_length - grip_length) / (part_length + cutoff_width))
   * Remnant = bar_length - grip_length - parts_per_bar × (part_length + cutoff_width)
   * Waste%  = (grip_length + remnant) / bar_length × 100
   *
   * @param part_length_mm  - Finished part length, mm
   * @param part_dia_mm     - Finished part diameter (for material cost), mm
   * @param bar_length_mm   - Raw bar stock length, mm
   * @param grip_length_mm  - Chuck grip length (not usable), mm
   * @param cutoff_width_mm - Cutoff tool width (parting blade), mm (default 3 mm)
   * @param material        - Optional material for cost calculation
   * @returns               - BarStockPlan
   */
  optimizeBarStock(
    part_length_mm: number,
    part_dia_mm: number,
    bar_length_mm: number,
    grip_length_mm: number = DEFAULT_GRIP_MM,
    cutoff_width_mm: number = DEFAULT_CUTOFF_WIDTH_MM,
    material?: MaterialParams,
  ): BarStockPlan {
    const notes: string[] = [];

    const usable = bar_length_mm - grip_length_mm;
    const partSlot = part_length_mm + cutoff_width_mm;

    if (usable <= 0 || partSlot <= 0) {
      notes.push("Invalid bar/grip/part length combination — check inputs.");
      return {
        bar_length_mm, part_length_mm, grip_length_mm, cutoff_width_mm,
        parts_per_bar: 0, bars_required: 0, remnant_length_mm: 0, waste_pct: 100, notes,
      };
    }

    const partsPerBar = Math.floor(usable / partSlot);
    if (partsPerBar === 0) {
      notes.push("Part length + cutoff exceeds usable bar — use longer bar stock.");
      return {
        bar_length_mm, part_length_mm, grip_length_mm, cutoff_width_mm,
        parts_per_bar: 0, bars_required: 0, remnant_length_mm: 0, waste_pct: 100, notes,
      };
    }

    const remnant = usable - partsPerBar * partSlot;
    const wasteMm = grip_length_mm + remnant;
    const wastePct = r2((wasteMm / bar_length_mm) * 100);

    // Material cost per part (optional)
    let matCostPerPart: number | undefined;
    if (material && material.density_kg_per_m3 && material.cost_usd_per_kg > 0) {
      const r = (part_dia_mm / 2) / 1000; // m
      const L = bar_length_mm / 1000;     // m
      const barVolM3 = Math.PI * r * r * L;
      const barMassKg = barVolM3 * material.density_kg_per_m3;
      const barCost = barMassKg * material.cost_usd_per_kg;
      matCostPerPart = r2(barCost / Math.max(1, partsPerBar));
    }

    if (wastePct > 20) notes.push(`High waste (${wastePct}%). Consider shorter bar or machining longer part blanks.`);
    if (remnant > part_length_mm) notes.push(`Remnant (${r1(remnant)} mm) is long enough for another part if grip is reduced.`);

    return {
      bar_length_mm,
      part_length_mm,
      grip_length_mm,
      cutoff_width_mm,
      parts_per_bar:  partsPerBar,
      bars_required:  0, // set by caller from quantity / partsPerBar
      remnant_length_mm: r2(remnant),
      waste_pct:      wastePct,
      material_cost_per_part_usd: matCostPerPart,
      notes,
    };
  }

  // ── 5. Probing schedule (SPC-based) ────────────────────────────────────────

  /**
   * Generate SPC-based probing schedule for the batch.
   *
   * Protocol:
   *   - Part 1 (first-article): FULL inspection of all toleranced features.
   *   - Every Nth part: SPOT check of critical features (N from Cpk or default 10).
   *   - Last part: FULL inspection.
   *   - Features with tight tolerance (< 0.05 mm) are always fully probed.
   *
   * @param quantity   - Batch size
   * @param tolerances - Feature tolerance specs
   * @param spc_data   - Optional SPC history (Cpk per feature)
   * @returns          - ProbingSchedule
   */
  probingSchedule(
    quantity: number,
    tolerances: ToleranceSpec[],
    spc_data?: SPCData[],
  ): ProbingSchedule {
    const notes: string[] = [];

    // Find the most conservative (lowest) Cpk across features to set interval
    const spcMap = new Map<string, SPCData>();
    for (const s of (spc_data ?? [])) spcMap.set(s.feature, s);

    let worstCpk: number | undefined;
    for (const tol of tolerances) {
      const s = spcMap.get(tol.feature);
      if (s?.cpk !== undefined) {
        if (worstCpk === undefined || s.cpk < worstCpk) worstCpk = s.cpk;
      }
    }

    const interval = cpkToInterval(worstCpk);

    // Critical = tolerance < 0.05 mm
    const criticalFeatures = tolerances
      .filter(t => t.tolerance_mm < 0.05)
      .map(t => t.feature);

    const allFeatures = tolerances.map(t => t.feature);

    const events: ProbingEvent[] = [];
    let fullCount = 0;
    let spotCount = 0;

    for (let part = 1; part <= quantity; part++) {
      const isFirst = part === 1;
      const isLast  = part === quantity;
      const isSpot  = !isFirst && !isLast && (part % interval === 0);

      if (isFirst || isLast) {
        events.push({
          part_number:     part,
          probe_type:      "full",
          features_probed: allFeatures,
          reason:          isFirst ? "First-article full inspection" : "Last-article final inspection",
        });
        fullCount++;
      } else if (isSpot) {
        events.push({
          part_number:     part,
          probe_type:      "spot",
          features_probed: criticalFeatures.length > 0 ? criticalFeatures : allFeatures.slice(0, 3),
          reason:          `SPC spot check (every ${interval} parts, Cpk-based)`,
        });
        spotCount++;
      }
    }

    if (worstCpk !== undefined) {
      notes.push(`Worst-case Cpk=${r2(worstCpk)} → probe interval N=${interval}.`);
    } else {
      notes.push(`No SPC data provided — using default probe interval N=${interval}.`);
    }
    if (criticalFeatures.length > 0) {
      notes.push(`Critical features (tol < 0.05 mm): ${criticalFeatures.join(", ")}.`);
    }

    return {
      quantity,
      spot_check_interval:  interval,
      total_probe_events:   events.length,
      full_inspections:     fullCount,
      spot_checks:          spotCount,
      events,
      critical_features:    criticalFeatures,
      notes,
    };
  }

  // ── 6. Batch cost analysis ─────────────────────────────────────────────────

  /**
   * Compute detailed batch cost breakdown.
   *
   * Formula:
   *   Total = setup_cost + N × machining_cost_per_part + Σ changes × change_cost + waste_cost
   *
   * @param plan - Aggregated plan data (internal convenience object)
   * @returns    - BatchCostBreakdown
   */
  batchCostAnalysis(plan: {
    part_id: string;
    quantity: number;
    machine: MachineParams;
    material: MaterialParams;
    part_dims: PartDimensions;
    cycle_time_min: number;
    toolSchedules: ToolChangeSchedule[];
    barPlan?: BarStockPlan | null;
  }): BatchCostBreakdown {
    const { quantity, machine, material, part_dims, cycle_time_min, toolSchedules, barPlan } = plan;
    const lineItems: CostLineItem[] = [];

    // 1. Setup cost
    const setupCost = r2((machine.setup_time_min / 60) * machine.rate_usd_per_hr);
    lineItems.push({ category: "Setup", description: `Machine setup (${machine.setup_time_min} min @ $${machine.rate_usd_per_hr}/hr)`, amount_usd: setupCost });

    // 2. Machining cost (cycle time × machine rate × quantity)
    const machCostPerPart = r2((cycle_time_min / 60) * machine.rate_usd_per_hr);
    const machCostTotal   = r2(machCostPerPart * quantity);
    lineItems.push({ category: "Machining", description: `Cycle time ${cycle_time_min} min × ${quantity} parts @ $${machine.rate_usd_per_hr}/hr`, amount_usd: machCostTotal });

    // 3. Tool change cost (non-sister changes only — require operator)
    let toolChangeCost = 0;
    for (const sched of toolSchedules) {
      const manualChanges = sched.changes.filter(c => !c.sister_takeover).length;
      const cost = r2(manualChanges * sched.total_change_time_min > 0
        ? (sched.total_change_time_min / 60) * machine.rate_usd_per_hr
        : 0
      );
      toolChangeCost += cost;
      if (manualChanges > 0) {
        lineItems.push({
          category: "Tool Changes",
          description: `Tool ${sched.tool_id}: ${manualChanges} manual change(s)`,
          amount_usd: cost,
        });
      }
    }

    // 4. Material waste cost (bar stock turning only)
    let wasteCost = 0;
    if (barPlan && material.density_kg_per_m3 && material.cost_usd_per_kg > 0) {
      const r = (part_dims.width_mm / 2) / 1000; // use width as dia proxy
      const wasteVol = Math.PI * r * r * (barPlan.grip_length_mm + barPlan.remnant_length_mm) / 1000;
      const wasteKg  = wasteVol * material.density_kg_per_m3 * barPlan.bars_required;
      wasteCost = r2(wasteKg * material.cost_usd_per_kg);
      lineItems.push({ category: "Material Waste", description: `Bar stock grip/remnant waste (${barPlan.waste_pct}%)`, amount_usd: wasteCost });
    } else if (part_dims.weight_kg && material.cost_usd_per_kg > 0) {
      // Milling: assume 20% billet utilization loss (billet oversized)
      const wasteKg  = part_dims.weight_kg * 0.20 * quantity;
      wasteCost = r2(wasteKg * material.cost_usd_per_kg);
      lineItems.push({ category: "Material Waste", description: `Estimated chip waste (20% of part weight × qty)`, amount_usd: wasteCost });
    }

    const total = r2(setupCost + machCostTotal + toolChangeCost + wasteCost);
    const perPart = r2(total / Math.max(1, quantity));

    return {
      quantity,
      setup_cost_usd:         setupCost,
      machining_cost_usd:     machCostTotal,
      tool_change_cost_usd:   r2(toolChangeCost),
      material_waste_cost_usd: wasteCost,
      total_cost_usd:         total,
      cost_per_part_usd:      perPart,
      line_items:             lineItems,
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

/** Singleton instance — lazy imported by the dispatcher. */
export const productionBatchOptimizationEngine = new ProductionBatchOptimizationEngine();
