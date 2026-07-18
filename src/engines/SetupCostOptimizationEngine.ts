/**
 * SetupCostOptimizationEngine — CAMX-MS13 U05 (E1155)
 *
 * Minimize total setup cost across multi-setup parts.
 *
 * Cost model:
 *   setup_cost_per_part = Σ(setup_time_i × labor_rate + fixture_cost_i / batch) / batch_size
 *
 * Key capabilities:
 *   - Setup time estimation from complexity tier (simple/moderate/complex/extreme)
 *   - Fixture cost amortization over batch size with break-even analysis
 *   - Datum chain optimization — minimize cumulative error accumulation
 *   - Setup reduction suggestions: combine ops, use 5-axis, palletize
 *
 * Setup complexity reference:
 *   simple   = 15 min (vice, 1-2 datums, standard stock)
 *   moderate = 30 min (custom soft jaws, 3-4 datums, probing)
 *   complex  = 60 min (compound angle, 5+ datums, shimming required)
 *   extreme  = 120 min (multiple fixtures, part-specific tooling)
 *
 * References:
 *   - Shingo (1985): "A Revolution in Manufacturing: The SMED System"
 *   - Toyota Production System: setup reduction, standard work
 *   - Boothroyd & Knight (2006): "Fundamentals of Machining and Machine Tools"
 *   - GD&T datum chain: ASME Y14.5-2018 §4
 *
 * @module SetupCostOptimizationEngine
 * @shortcode E1155
 * @dispatcher camDispatcher
 * @actions setup_cost_optimize, setup_time_estimate, setup_suggest_reductions
 * @milestone CAMX-MS13/U05
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// CONSTANTS
// ============================================================================

/** Setup time [min] by complexity tier */
const SETUP_TIME_MIN: Record<SetupComplexity, number> = {
  simple:   15,
  moderate: 30,
  complex:  60,
  extreme:  120,
};

/** Default labor rate [$/hr] */
const DEFAULT_LABOR_RATE_PER_HR = 45;

/** Default fixture amortization batches (number of production runs) */
const DEFAULT_AMORT_RUNS = 50;

/** 5-axis eliminates setups: typical reduction 60-80% of total setups */
const FIVE_AXIS_SETUP_REDUCTION = 0.70;

/** Pallet system reduces setup time by ~70% once pallet is proven */
const PALLET_TIME_REDUCTION = 0.70;

/** Datum error accumulation factor per additional datum reference */
const DATUM_ERROR_PER_LINK = 0.005; // 5 µm per datum link (typical)

// ============================================================================
// TYPES
// ============================================================================

export type SetupComplexity = "simple" | "moderate" | "complex" | "extreme";

export interface SetupDefinition {
  /** Setup identifier/name */
  id: string;
  /** Human label */
  label?: string;
  /** Complexity tier — drives time estimate if setup_time_min omitted */
  complexity: SetupComplexity;
  /** Override setup time [min] — if provided, used instead of complexity estimate */
  setup_time_min?: number;
  /** Fixture cost [$] for this setup */
  fixture_cost_usd?: number;
  /** Number of datums established in this setup */
  datum_count?: number;
  /** Datum references chain from previous setups (IDs) */
  datum_references?: string[];
  /** Operations performed in this setup */
  operations?: string[];
  /** Can this setup be combined with another? */
  combinable_with?: string[];
  /** Does this setup require 5-axis capability? */
  requires_5axis?: boolean;
  /** Does this setup require a pallet? */
  pallet_compatible?: boolean;
}

export interface SetupOptimizationInput {
  setups: SetupDefinition[];
  batch_size: number;
  /** Labor rate [$/hr] — defaults to DEFAULT_LABOR_RATE_PER_HR */
  labor_rate_per_hr?: number;
  /** Annual production volume (total parts/year) for amortization */
  annual_volume?: number;
  /** Machine has 5-axis capability */
  has_5axis?: boolean;
  /** Machine has pallet system */
  has_pallet?: boolean;
}

export interface SetupCostBreakdown {
  setup_id: string;
  label: string;
  setup_time_min: number;
  setup_cost_per_batch: number;
  setup_cost_per_part: number;
  fixture_cost_per_part: number;
  total_cost_per_part: number;
  datum_chain_error_mm: number;
}

export interface SetupOptimizationResult {
  input_setup_count: number;
  batch_size: number;
  labor_rate_per_hr: number;
  breakdowns: SetupCostBreakdown[];
  total_setup_cost_per_part: number;
  total_setup_time_min: number;
  total_fixture_cost: number;
  datum_chain_analysis: DatumChainResult;
  suggestions: SetupReductionSuggestion[];
  optimized_cost_per_part?: number;
  potential_savings_per_part?: number;
}

export interface SetupTimeEstimate {
  complexity: SetupComplexity;
  base_time_min: number;
  adjusted_time_min: number;
  confidence: "high" | "medium" | "low";
  adjustments: { factor: string; delta_min: number }[];
  notes: string[];
}

export interface DatumChainResult {
  total_datum_links: number;
  max_chain_length: number;
  worst_case_error_mm: number;
  critical_path: string[];
  recommendations: string[];
}

export interface SetupReductionSuggestion {
  type: "combine" | "5axis" | "pallet" | "fixture_standardize" | "datum_optimize" | "smed";
  description: string;
  setups_affected: string[];
  estimated_time_saving_min: number;
  estimated_cost_saving_per_part: number;
  capital_required_usd: number;
  feasibility: "high" | "medium" | "low";
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class SetupCostOptimizationEngine {

  // --------------------------------------------------------------------------
  // optimizeSetupCost
  // --------------------------------------------------------------------------

  optimizeSetupCost(input: SetupOptimizationInput): SetupOptimizationResult {
    const laborRate = input.labor_rate_per_hr ?? DEFAULT_LABOR_RATE_PER_HR;
    const laborPerMin = laborRate / 60;

    const breakdowns: SetupCostBreakdown[] = input.setups.map(setup => {
      const setupTimeMin = setup.setup_time_min ?? SETUP_TIME_MIN[setup.complexity];
      const setupCostPerBatch = setupTimeMin * laborPerMin;
      const setupCostPerPart = setupCostPerBatch / input.batch_size;
      const fixturePerPart = (setup.fixture_cost_usd ?? 0) / (input.batch_size * DEFAULT_AMORT_RUNS);
      const total = setupCostPerPart + fixturePerPart;

      // Datum chain error: each datum reference from another setup adds error
      const chainLinks = setup.datum_references?.length ?? 0;
      const datumError = chainLinks * DATUM_ERROR_PER_LINK + (setup.datum_count ?? 1) * DATUM_ERROR_PER_LINK * 0.5;

      return {
        setup_id: setup.id,
        label: setup.label ?? setup.id,
        setup_time_min: setupTimeMin,
        setup_cost_per_batch: Math.round(setupCostPerBatch * 100) / 100,
        setup_cost_per_part: Math.round(setupCostPerPart * 100) / 100,
        fixture_cost_per_part: Math.round(fixturePerPart * 100) / 100,
        total_cost_per_part: Math.round(total * 100) / 100,
        datum_chain_error_mm: Math.round(datumError * 10000) / 10000,
      };
    });

    const totalCostPerPart = breakdowns.reduce((s, b) => s + b.total_cost_per_part, 0);
    const totalTimeMin = breakdowns.reduce((s, b) => s + b.setup_time_min, 0);
    const totalFixtureCost = input.setups.reduce((s, sv) => s + (sv.fixture_cost_usd ?? 0), 0);

    const datumChain = this._analyzeDatumChain(input.setups);
    const suggestions = this.suggestReductions(input);

    // Best optimized scenario from suggestions
    const totalSavings = suggestions.reduce((s, sg) => s + sg.estimated_cost_saving_per_part, 0);
    const optimized = Math.max(0, totalCostPerPart - totalSavings);

    return {
      input_setup_count: input.setups.length,
      batch_size: input.batch_size,
      labor_rate_per_hr: laborRate,
      breakdowns,
      total_setup_cost_per_part: Math.round(totalCostPerPart * 100) / 100,
      total_setup_time_min: totalTimeMin,
      total_fixture_cost: totalFixtureCost,
      datum_chain_analysis: datumChain,
      suggestions,
      optimized_cost_per_part: Math.round(optimized * 100) / 100,
      potential_savings_per_part: Math.round(totalSavings * 100) / 100,
    };
  }

  // --------------------------------------------------------------------------
  // estimateSetupTime
  // --------------------------------------------------------------------------

  estimateSetupTime(
    complexity: SetupComplexity,
    modifiers?: {
      /** Probe for datum? Adds time */
      probe_datum?: boolean;
      /** Custom soft jaws needed? */
      soft_jaws?: boolean;
      /** Shimming required for angle? */
      shimming?: boolean;
      /** Number of datums > 4? */
      many_datums?: boolean;
      /** Operator experience: junior adds time, expert reduces */
      operator_experience?: "junior" | "standard" | "expert";
      /** First article (first time running this setup) */
      first_article?: boolean;
    },
  ): SetupTimeEstimate {
    const base = SETUP_TIME_MIN[complexity];
    const adjustments: { factor: string; delta_min: number }[] = [];

    let delta = 0;
    if (modifiers?.probe_datum)    { delta += 5;  adjustments.push({ factor: "probe datum", delta_min: 5 }); }
    if (modifiers?.soft_jaws)      { delta += 10; adjustments.push({ factor: "soft jaw machining", delta_min: 10 }); }
    if (modifiers?.shimming)       { delta += 8;  adjustments.push({ factor: "shimming/angle setup", delta_min: 8 }); }
    if (modifiers?.many_datums)    { delta += 10; adjustments.push({ factor: "multiple datums (>4)", delta_min: 10 }); }
    if (modifiers?.first_article)  { delta += 20; adjustments.push({ factor: "first article verification", delta_min: 20 }); }

    const expMap = { junior: 1.3, standard: 1.0, expert: 0.8 };
    const expFactor = expMap[modifiers?.operator_experience ?? "standard"];
    const adjusted = Math.round((base + delta) * expFactor);
    if (expFactor !== 1.0) {
      adjustments.push({ factor: `operator experience (${modifiers?.operator_experience ?? "standard"}) ×${expFactor}`, delta_min: Math.round((base + delta) * (expFactor - 1)) });
    }

    const confidence: "high" | "medium" | "low" = modifiers?.first_article ? "low" : complexity === "simple" ? "high" : "medium";

    const notes: string[] = [];
    if (complexity === "extreme") notes.push("Extreme complexity — consider breaking into sub-setups or using 5-axis");
    if (modifiers?.soft_jaws) notes.push("Soft jaw machining time depends on material and profile — estimate may vary ±50%");
    if (modifiers?.first_article) notes.push("First article adds significant verification time — subsequent runs will be faster");

    return {
      complexity,
      base_time_min: base,
      adjusted_time_min: adjusted,
      confidence,
      adjustments,
      notes,
    };
  }

  // --------------------------------------------------------------------------
  // suggestReductions
  // --------------------------------------------------------------------------

  suggestReductions(input: SetupOptimizationInput): SetupReductionSuggestion[] {
    const suggestions: SetupReductionSuggestion[] = [];
    const laborRate = input.labor_rate_per_hr ?? DEFAULT_LABOR_RATE_PER_HR;
    const laborPerMin = laborRate / 60;
    const setups = input.setups;

    // 1. Combine compatible setups
    const combinablePairs: { a: SetupDefinition; b: SetupDefinition }[] = [];
    for (const s of setups) {
      if (s.combinable_with) {
        for (const otherId of s.combinable_with) {
          const other = setups.find(x => x.id === otherId);
          if (other && !combinablePairs.some(p => p.b.id === s.id && p.a.id === otherId)) {
            combinablePairs.push({ a: s, b: other });
          }
        }
      }
    }

    for (const pair of combinablePairs) {
      const aTime = pair.a.setup_time_min ?? SETUP_TIME_MIN[pair.a.complexity];
      const bTime = pair.b.setup_time_min ?? SETUP_TIME_MIN[pair.b.complexity];
      // Combined setup is ~75% of sum (elimination of one setup cycle)
      const timeSaving = Math.round((aTime + bTime) * 0.25);
      const costSavingPerPart = (timeSaving * laborPerMin) / input.batch_size;

      suggestions.push({
        type: "combine",
        description: `Combine setups "${pair.a.label ?? pair.a.id}" and "${pair.b.label ?? pair.b.id}" — reduce to 1 setup event`,
        setups_affected: [pair.a.id, pair.b.id],
        estimated_time_saving_min: timeSaving,
        estimated_cost_saving_per_part: Math.round(costSavingPerPart * 1000) / 1000,
        capital_required_usd: 0,
        feasibility: "high",
      });
    }

    // 2. 5-axis consolidation
    if (!input.has_5axis && setups.length >= 3) {
      const non5axis = setups.filter(s => !s.requires_5axis);
      const consolidatable = non5axis.length;
      if (consolidatable >= 2) {
        const totalTime = non5axis.reduce((s, sv) => s + (sv.setup_time_min ?? SETUP_TIME_MIN[sv.complexity]), 0);
        const timeSaving = Math.round(totalTime * FIVE_AXIS_SETUP_REDUCTION);
        const costPerPart = (timeSaving * laborPerMin) / input.batch_size;

        suggestions.push({
          type: "5axis",
          description: `Convert to 5-axis machining — eliminate ${consolidatable - 1} setups (${FIVE_AXIS_SETUP_REDUCTION * 100}% setup reduction potential)`,
          setups_affected: non5axis.map(s => s.id),
          estimated_time_saving_min: timeSaving,
          estimated_cost_saving_per_part: Math.round(costPerPart * 1000) / 1000,
          capital_required_usd: 120000, // typical 5-axis machine premium
          feasibility: "low",
        });
      }
    }

    // 3. Pallet system
    if (!input.has_pallet && setups.length >= 2) {
      const palletCompatible = setups.filter(s => s.pallet_compatible !== false);
      if (palletCompatible.length >= 2) {
        const totalTime = palletCompatible.reduce((s, sv) => s + (sv.setup_time_min ?? SETUP_TIME_MIN[sv.complexity]), 0);
        const timeSaving = Math.round(totalTime * PALLET_TIME_REDUCTION);
        const costPerPart = (timeSaving * laborPerMin) / input.batch_size;

        suggestions.push({
          type: "pallet",
          description: `Implement pallet system — ${PALLET_TIME_REDUCTION * 100}% setup time reduction on ${palletCompatible.length} compatible setups`,
          setups_affected: palletCompatible.map(s => s.id),
          estimated_time_saving_min: timeSaving,
          estimated_cost_saving_per_part: Math.round(costPerPart * 1000) / 1000,
          capital_required_usd: 15000, // pallet system cost
          feasibility: "medium",
        });
      }
    }

    // 4. SMED (convert internal to external)
    const complexSetups = setups.filter(s => s.complexity === "complex" || s.complexity === "extreme");
    if (complexSetups.length > 0) {
      const totalComplex = complexSetups.reduce((s, sv) => s + (sv.setup_time_min ?? SETUP_TIME_MIN[sv.complexity]), 0);
      const smedSaving = Math.round(totalComplex * 0.50); // typical 50% SMED first pass
      const costPerPart = (smedSaving * laborPerMin) / input.batch_size;

      suggestions.push({
        type: "smed",
        description: `Apply SMED (Single-Minute Exchange of Die) to ${complexSetups.length} complex setup(s) — convert internal to external tasks, target 50% reduction`,
        setups_affected: complexSetups.map(s => s.id),
        estimated_time_saving_min: smedSaving,
        estimated_cost_saving_per_part: Math.round(costPerPart * 1000) / 1000,
        capital_required_usd: 2000, // tooling pre-staging equipment
        feasibility: "high",
      });
    }

    // 5. Datum chain optimization
    const chainSetups = setups.filter(s => (s.datum_references?.length ?? 0) > 2);
    if (chainSetups.length > 0) {
      suggestions.push({
        type: "datum_optimize",
        description: `Reduce datum chain depth — ${chainSetups.length} setup(s) reference >2 upstream datums, increasing error accumulation. Use common primary datum throughout.`,
        setups_affected: chainSetups.map(s => s.id),
        estimated_time_saving_min: 5,
        estimated_cost_saving_per_part: 0.05,
        capital_required_usd: 0,
        feasibility: "high",
      });
    }

    // 6. Standardize fixtures
    const highFixtureSets = setups.filter(s => (s.fixture_cost_usd ?? 0) > 2000);
    if (highFixtureSets.length >= 2) {
      const totalFixture = highFixtureSets.reduce((s, sv) => s + (sv.fixture_cost_usd ?? 0), 0);
      const standardSaving = totalFixture * 0.30;
      const costPerPart = standardSaving / (input.batch_size * DEFAULT_AMORT_RUNS);

      suggestions.push({
        type: "fixture_standardize",
        description: `Standardize fixture bases across ${highFixtureSets.length} setups — modular sub-plates reduce fixture investment ~30%`,
        setups_affected: highFixtureSets.map(s => s.id),
        estimated_time_saving_min: 0,
        estimated_cost_saving_per_part: Math.round(costPerPart * 1000) / 1000,
        capital_required_usd: 3000,
        feasibility: "medium",
      });
    }

    return suggestions.sort((a, b) => b.estimated_cost_saving_per_part - a.estimated_cost_saving_per_part);
  }

  // --------------------------------------------------------------------------
  // Private: _analyzeDatumChain
  // --------------------------------------------------------------------------

  private _analyzeDatumChain(setups: SetupDefinition[]): DatumChainResult {
    // Build reference graph and find longest chain
    const chainLengths: Record<string, number> = {};
    const maxChainById: Record<string, string[]> = {};

    function chainOf(id: string, visited: Set<string>): [number, string[]] {
      if (visited.has(id)) return [0, []];
      visited.add(id);
      const setup = setups.find(s => s.id === id);
      if (!setup || !setup.datum_references || setup.datum_references.length === 0) {
        return [1, [id]];
      }
      let maxLen = 0;
      let bestPath: string[] = [];
      for (const ref of setup.datum_references) {
        const [len, path] = chainOf(ref, new Set(visited));
        if (len > maxLen) { maxLen = len; bestPath = path; }
      }
      return [maxLen + 1, [...bestPath, id]];
    }

    let worstLen = 0;
    let criticalPath: string[] = [];
    for (const s of setups) {
      const [len, path] = chainOf(s.id, new Set());
      chainLengths[s.id] = len;
      maxChainById[s.id] = path;
      if (len > worstLen) { worstLen = len; criticalPath = path; }
    }

    const totalLinks = setups.reduce((s, sv) => s + (sv.datum_references?.length ?? 0), 0);
    const worstError = worstLen * DATUM_ERROR_PER_LINK;

    const recommendations: string[] = [];
    if (worstLen > 3) recommendations.push(`Datum chain depth ${worstLen} exceeds recommended max of 3 — add precision machined reference features`);
    if (worstError > 0.020) recommendations.push(`Worst-case datum error ${(worstError * 1000).toFixed(1)} µm — may violate tight tolerances`);
    if (totalLinks === 0) recommendations.push("All setups reference primary datum — optimal datum chain");
    if (criticalPath.length > 2) recommendations.push(`Critical chain: ${criticalPath.join(" → ")} — consider re-datuming from common reference`);

    return {
      total_datum_links: totalLinks,
      max_chain_length: worstLen,
      worst_case_error_mm: Math.round(worstError * 100000) / 100000,
      critical_path: criticalPath,
      recommendations,
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const setupCostOptimizationEngine = new SetupCostOptimizationEngine();
