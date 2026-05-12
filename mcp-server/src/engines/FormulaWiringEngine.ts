/**
 * FormulaWiringEngine — Formula-to-Engine Wiring Infrastructure
 *
 * Provides mapping between 509 registered formulas and their consuming engines.
 * Enables discovery of unwired formulas, auto-wiring patterns, and execution
 * with full tracing.
 *
 * Key capabilities:
 * - listUnwiredFormulas() — formulas without engine connections
 * - listWiredFormulas() — formulas with engine connections
 * - getFormulaConsumers(formulaId) — which engines use a formula
 * - wireFormula(formulaId, engineId) — create wiring
 * - getFormulasByDomain(domain) — physics, thermal, cutting, etc.
 * - validateFormula(formulaId, inputs) — validate formula inputs
 * - executeFormula(formulaId, inputs) — execute with tracing
 * - getWiringReport() — full wiring status report
 *
 * Reference: PRISM Formula Registry (509 formulas, 20+ domains)
 */

import { formulaRegistry, type Formula } from "../registries/FormulaRegistry.js";
import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export interface FormulaWiring {
  formulaId: string;
  engineId: string;
  wiredAt: string;
  source: "auto" | "manual" | "inferred";
  confidence: number;
}

export interface WiringReport {
  totalFormulas: number;
  wiredCount: number;
  unwiredCount: number;
  wiringPercentage: number;
  byDomain: Record<string, { total: number; wired: number; unwired: number }>;
  byCategory: Record<string, { total: number; wired: number; unwired: number }>;
  topConsumers: { engineId: string; formulaCount: number }[];
  autoWiredPatterns: { pattern: string; count: number }[];
}

export interface FormulaExecutionTrace {
  formulaId: string;
  inputs: Record<string, number>;
  output: number;
  executionTimeMs: number;
  validationResult: FormulaValidationResult;
  consumingEngines: string[];
}

export interface FormulaValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  missingInputs: string[];
  outOfRangeInputs: { name: string; value: number; range: { min: number; max: number } }[];
}

export interface FormulaSearchResult {
  formula: Formula;
  wiring: FormulaWiring[];
  consumerCount: number;
}

// ============================================================================
// AUTO-WIRING PATTERNS
// ============================================================================

/**
 * Auto-wiring patterns map formula ID prefixes/keywords to consuming engines.
 * Pattern format: { pattern: RegExp | string, engineIds: string[], confidence: number }
 */
const AUTO_WIRING_PATTERNS: {
  pattern: RegExp;
  engineIds: string[];
  confidence: number;
  description: string;
}[] = [
  // Kienzle cutting force formulas
  {
    pattern: /^F-KIENZLE|kienzle|cutting.?force/i,
    engineIds: ["CuttingForceEngine", "ManufacturingCalculations", "SpeedFeedOrchestratorEngine"],
    confidence: 0.95,
    description: "Kienzle cutting force model"
  },
  // Taylor tool life formulas
  {
    pattern: /^F-TAYLOR|taylor|tool.?life/i,
    engineIds: ["ToolLifeEngine", "StochasticToolLifeEngine", "BayesianToolLifeEngine", "ToolWearEngine"],
    confidence: 0.95,
    description: "Taylor tool life model"
  },
  // Thermal formulas
  {
    pattern: /^F-THERMAL|thermal|temperature|heat/i,
    engineIds: ["ThermalEngine", "CuttingThermalEngine", "StochasticThermalEngine", "ToolpathThermalEngine"],
    confidence: 0.90,
    description: "Thermal/temperature models"
  },
  // Deflection formulas
  {
    pattern: /^F-DEFLECT|deflection|cantilever|beam/i,
    engineIds: ["DeflectionEngine", "ToolDeflectionEngine", "PartDeflectionEngine", "BoringBarDeflectionEngine", "TimoshenkoDeflectionEngine"],
    confidence: 0.92,
    description: "Deflection/stiffness models"
  },
  // Chatter/stability formulas
  {
    pattern: /^F-CHATTER|chatter|stability|SLD|lobe/i,
    engineIds: ["ChatterStabilityLobeEngine", "StabilityEngine", "RegenerativeChatterEngine"],
    confidence: 0.88,
    description: "Chatter stability models"
  },
  // Surface finish formulas
  {
    pattern: /^F-SURFACE|surface.?finish|roughness|Ra/i,
    engineIds: ["SurfaceFinishEngine", "SurfaceFinishPredictorEngine", "StochasticSurfaceFinishEngine"],
    confidence: 0.90,
    description: "Surface finish prediction"
  },
  // Material removal rate
  {
    pattern: /^F-MRR|mrr|material.?removal/i,
    engineIds: ["MRREngine", "ManufacturingCalculations", "SpeedFeedOrchestratorEngine"],
    confidence: 0.93,
    description: "Material removal rate"
  },
  // Power formulas
  {
    pattern: /^F-POWER|power|spindle.?power/i,
    engineIds: ["PowerEngine", "SpindleProtectionEngine", "ManufacturingCalculations"],
    confidence: 0.91,
    description: "Cutting power models"
  },
  // Torque formulas
  {
    pattern: /^F-TORQUE|torque|spindle.?torque/i,
    engineIds: ["TorqueEngine", "SpindleProtectionEngine", "ManufacturingCalculations"],
    confidence: 0.91,
    description: "Torque calculation"
  },
  // RPM/speed formulas
  {
    pattern: /^F-RPM|^F-CALC-001|rpm|spindle.?speed/i,
    engineIds: ["SpeedFeedOrchestratorEngine", "ManufacturingCalculations"],
    confidence: 0.94,
    description: "RPM/speed calculation"
  },
  // EDM formulas
  {
    pattern: /^F-EDM|edm|discharge/i,
    engineIds: ["EDMEngine", "WireEDMEngine", "SinkerEDMEngine"],
    confidence: 0.90,
    description: "EDM process models"
  },
  // Weibull/reliability formulas
  {
    pattern: /^F-WEIBULL|weibull|reliability/i,
    engineIds: ["StochasticToolLifeEngine", "ReliabilityEngine"],
    confidence: 0.88,
    description: "Weibull reliability"
  },
  // Chip thickness formulas
  {
    pattern: /^F-CHIP|chip.?thick|chip.?load/i,
    engineIds: ["ChipFormationEngine", "ManufacturingCalculations", "SpeedFeedOrchestratorEngine"],
    confidence: 0.89,
    description: "Chip thickness/load models"
  },
  // Moment of inertia
  {
    pattern: /^F-MOMENT|moment.?of.?inertia|second.?moment/i,
    engineIds: ["DeflectionEngine", "StructuralAnalysisEngine"],
    confidence: 0.87,
    description: "Moment of inertia"
  },
  // Linear algebra / SVD / QR
  {
    pattern: /^F-SVD|^F-QR|^F-CHOL|^F-EIGEN|^F-CG/i,
    engineIds: ["AlgorithmEngine", "SystemIdentificationEngine", "PrincipalComponentEngine"],
    confidence: 0.85,
    description: "Linear algebra operations"
  },
  // Optimization formulas
  {
    pattern: /^F-PSI|^F-OMEGA|optimization|objective/i,
    engineIds: ["OptimizationEngine", "QualityScoreEngine"],
    confidence: 0.82,
    description: "Optimization objectives"
  },
  // hyperMILL formulas
  {
    pattern: /^F-HM-|hypermill/i,
    engineIds: ["HyperMillStrategyEngine", "HyperMillCAMBridgeEngine"],
    confidence: 0.92,
    description: "hyperMILL specific"
  },
  // Johnson-Cook flow stress
  {
    pattern: /johnson.?cook|flow.?stress|constitutive/i,
    engineIds: ["ConstitutiveModelEngine", "ManufacturingCalculations"],
    confidence: 0.90,
    description: "Johnson-Cook model"
  },
  // Specific cutting energy
  {
    pattern: /^F-SPECIFIC|specific.?energy|specific.?cutting/i,
    engineIds: ["ManufacturingCalculations", "EnergyEfficiencyEngine"],
    confidence: 0.88,
    description: "Specific cutting energy"
  },
  // White layer / surface integrity
  {
    pattern: /^F-WHITE|white.?layer|surface.?integrity/i,
    engineIds: ["SurfaceIntegrityEngine", "ThermalEngine"],
    confidence: 0.86,
    description: "Surface integrity checks"
  }
];

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class FormulaWiringEngine {
  private wirings: Map<string, FormulaWiring[]> = new Map();
  private engineToFormulas: Map<string, Set<string>> = new Map();
  private initialized = false;

  /**
   * Initialize the wiring engine by loading formulas and applying auto-wiring
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    log.info("FormulaWiringEngine: Initializing...");

    // Ensure formula registry is loaded
    await formulaRegistry.load();

    // Apply auto-wiring patterns to all formulas
    await this.applyAutoWiring();

    this.initialized = true;
    log.info(`FormulaWiringEngine: Initialized with ${this.wirings.size} wired formulas`);
  }

  /**
   * Apply auto-wiring patterns to discover formula-engine connections
   */
  private async applyAutoWiring(): Promise<void> {
    const stats = await formulaRegistry.getStats();
    const allFormulas = formulaRegistry.all();

    for (const formula of allFormulas) {
      const formulaId = formula.formula_id;
      const wirings: FormulaWiring[] = [];

      // Check existing consumers declared in the formula
      if (formula.consumers && formula.consumers.length > 0) {
        for (const consumer of formula.consumers) {
          wirings.push({
            formulaId,
            engineId: consumer,
            wiredAt: new Date().toISOString(),
            source: "inferred",
            confidence: 0.80
          });
          this.addEngineMapping(consumer, formulaId);
        }
      }

      // Apply pattern-based auto-wiring
      const searchText = `${formulaId} ${formula.name} ${formula.category} ${formula.description}`;

      for (const patternDef of AUTO_WIRING_PATTERNS) {
        if (patternDef.pattern.test(searchText)) {
          for (const engineId of patternDef.engineIds) {
            // Skip if already wired to this engine
            if (wirings.some(w => w.engineId === engineId)) continue;

            wirings.push({
              formulaId,
              engineId,
              wiredAt: new Date().toISOString(),
              source: "auto",
              confidence: patternDef.confidence
            });
            this.addEngineMapping(engineId, formulaId);
          }
        }
      }

      if (wirings.length > 0) {
        this.wirings.set(formulaId, wirings);
      }
    }
  }

  /**
   * Add bidirectional engine-formula mapping
   */
  private addEngineMapping(engineId: string, formulaId: string): void {
    if (!this.engineToFormulas.has(engineId)) {
      this.engineToFormulas.set(engineId, new Set());
    }
    this.engineToFormulas.get(engineId)!.add(formulaId);
  }

  /**
   * List all unwired formulas (formulas without engine connections)
   */
  async listUnwiredFormulas(): Promise<Formula[]> {
    await this.initialize();

    const allFormulas = formulaRegistry.all();
    return allFormulas.filter(f => !this.wirings.has(f.formula_id));
  }

  /**
   * List all wired formulas (formulas with engine connections)
   */
  async listWiredFormulas(): Promise<FormulaSearchResult[]> {
    await this.initialize();

    const results: FormulaSearchResult[] = [];

    for (const [formulaId, wirings] of this.wirings) {
      const formula = formulaRegistry.get(formulaId);
      if (formula) {
        results.push({
          formula,
          wiring: wirings,
          consumerCount: wirings.length
        });
      }
    }

    return results.sort((a, b) => b.consumerCount - a.consumerCount);
  }

  /**
   * Get all engines that consume a specific formula
   */
  async getFormulaConsumers(formulaId: string): Promise<FormulaWiring[]> {
    await this.initialize();
    return this.wirings.get(formulaId) || [];
  }

  /**
   * Get all formulas consumed by a specific engine
   */
  async getEngineFormulas(engineId: string): Promise<Formula[]> {
    await this.initialize();

    const formulaIds = this.engineToFormulas.get(engineId);
    if (!formulaIds) return [];

    return Array.from(formulaIds)
      .map(id => formulaRegistry.get(id))
      .filter((f): f is Formula => f !== undefined);
  }

  /**
   * Manually wire a formula to an engine
   */
  async wireFormula(
    formulaId: string,
    engineId: string,
    options?: { confidence?: number; source?: "manual" | "auto" }
  ): Promise<FormulaWiring> {
    await this.initialize();

    const formula = formulaRegistry.get(formulaId);
    if (!formula) {
      throw new Error(`Formula ${formulaId} not found`);
    }

    const wiring: FormulaWiring = {
      formulaId,
      engineId,
      wiredAt: new Date().toISOString(),
      source: options?.source || "manual",
      confidence: options?.confidence || 1.0
    };

    // Add to wirings map
    const existing = this.wirings.get(formulaId) || [];

    // Check for duplicate
    if (!existing.some(w => w.engineId === engineId)) {
      existing.push(wiring);
      this.wirings.set(formulaId, existing);
      this.addEngineMapping(engineId, formulaId);
    }

    return wiring;
  }

  /**
   * Remove a formula-engine wiring
   */
  async unwireFormula(formulaId: string, engineId: string): Promise<boolean> {
    await this.initialize();

    const wirings = this.wirings.get(formulaId);
    if (!wirings) return false;

    const idx = wirings.findIndex(w => w.engineId === engineId);
    if (idx === -1) return false;

    wirings.splice(idx, 1);

    if (wirings.length === 0) {
      this.wirings.delete(formulaId);
    }

    // Remove from engine mapping
    const engineFormulas = this.engineToFormulas.get(engineId);
    if (engineFormulas) {
      engineFormulas.delete(formulaId);
    }

    return true;
  }

  /**
   * Get formulas by domain
   */
  async getFormulasByDomain(domain: string): Promise<FormulaSearchResult[]> {
    await this.initialize();

    const formulas = await formulaRegistry.getByDomain(domain.toLowerCase());

    return formulas.map(formula => ({
      formula,
      wiring: this.wirings.get(formula.formula_id) || [],
      consumerCount: this.wirings.get(formula.formula_id)?.length || 0
    }));
  }

  /**
   * Get formulas by category
   */
  async getFormulasByCategory(category: string): Promise<FormulaSearchResult[]> {
    await this.initialize();

    const formulas = await formulaRegistry.getByCategory(category.toLowerCase());

    return formulas.map(formula => ({
      formula,
      wiring: this.wirings.get(formula.formula_id) || [],
      consumerCount: this.wirings.get(formula.formula_id)?.length || 0
    }));
  }

  /**
   * Validate formula inputs before execution
   */
  async validateFormula(
    formulaId: string,
    inputs: Record<string, number>
  ): Promise<FormulaValidationResult> {
    await this.initialize();

    const formula = formulaRegistry.get(formulaId);
    if (!formula) {
      return {
        valid: false,
        errors: [`Formula ${formulaId} not found`],
        warnings: [],
        missingInputs: [],
        outOfRangeInputs: []
      };
    }

    const result: FormulaValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      missingInputs: [],
      outOfRangeInputs: []
    };

    // Check required inputs
    if (formula.validation?.required_inputs) {
      for (const required of formula.validation.required_inputs) {
        if (inputs[required] === undefined || inputs[required] === null) {
          result.missingInputs.push(required);
          result.valid = false;
          result.errors.push(`Missing required input: ${required}`);
        }
      }
    }

    // Check input ranges
    for (const param of formula.parameters || []) {
      if (param.type === "input" && inputs[param.name] !== undefined) {
        const value = inputs[param.name];

        // Check NaN/Infinity
        if (!Number.isFinite(value)) {
          result.valid = false;
          result.errors.push(`Invalid value for ${param.name}: ${value}`);
          continue;
        }

        // Check range
        if (param.range) {
          if (value < param.range.min || value > param.range.max) {
            result.outOfRangeInputs.push({
              name: param.name,
              value,
              range: param.range
            });
            result.warnings.push(
              `${param.name} (${value}) outside expected range [${param.range.min}, ${param.range.max}]`
            );
          }
        }
      }
    }

    // Check constraints
    if (formula.validation?.constraints) {
      for (const constraint of formula.validation.constraints) {
        // Basic constraint parsing for common patterns
        if (constraint.includes("<=")) {
          const [left, right] = constraint.split("<=").map(s => s.trim());
          const leftVal = inputs[left];
          const rightVal = inputs[right];
          if (leftVal !== undefined && rightVal !== undefined && leftVal > rightVal) {
            result.warnings.push(`Constraint violated: ${constraint}`);
          }
        }
      }
    }

    return result;
  }

  /**
   * Execute a formula with full tracing
   */
  async executeFormula(
    formulaId: string,
    inputs: Record<string, number>
  ): Promise<FormulaExecutionTrace> {
    await this.initialize();

    const startTime = Date.now();

    // Validate first
    const validation = await this.validateFormula(formulaId, inputs);

    // Get consumers
    const wirings = this.wirings.get(formulaId) || [];
    const consumingEngines = wirings.map(w => w.engineId);

    // Execute via registry calculate
    let output = NaN;
    try {
      if (validation.valid) {
        const result = await formulaRegistry.calculate(formulaId, inputs);
        output = result.result;

        // Merge validation info
        validation.warnings.push(...result.validation.warnings);
        if (!result.validation.valid) {
          validation.valid = false;
          validation.errors.push(...result.validation.errors);
        }
      }
    } catch (error: any) {
      validation.valid = false;
      validation.errors.push(`Execution error: ${error.message}`);
    }

    return {
      formulaId,
      inputs,
      output,
      executionTimeMs: Date.now() - startTime,
      validationResult: validation,
      consumingEngines
    };
  }

  /**
   * Get comprehensive wiring status report
   */
  async getWiringReport(): Promise<WiringReport> {
    await this.initialize();

    const stats = await formulaRegistry.getStats();
    const allFormulas = formulaRegistry.all();

    const wiredCount = this.wirings.size;
    const unwiredCount = stats.total - wiredCount;

    // Group by domain
    const byDomain: Record<string, { total: number; wired: number; unwired: number }> = {};
    for (const [domain, count] of Object.entries(stats.byDomain)) {
      const domainFormulas = await formulaRegistry.getByDomain(domain);
      const wiredInDomain = domainFormulas.filter(f => this.wirings.has(f.formula_id)).length;
      byDomain[domain] = {
        total: count,
        wired: wiredInDomain,
        unwired: count - wiredInDomain
      };
    }

    // Group by category
    const byCategory: Record<string, { total: number; wired: number; unwired: number }> = {};
    for (const [category, count] of Object.entries(stats.byCategory)) {
      const categoryFormulas = await formulaRegistry.getByCategory(category);
      const wiredInCategory = categoryFormulas.filter(f => this.wirings.has(f.formula_id)).length;
      byCategory[category] = {
        total: count,
        wired: wiredInCategory,
        unwired: count - wiredInCategory
      };
    }

    // Top consumers
    const consumerCounts: { engineId: string; formulaCount: number }[] = [];
    for (const [engineId, formulaIds] of this.engineToFormulas) {
      consumerCounts.push({ engineId, formulaCount: formulaIds.size });
    }
    consumerCounts.sort((a, b) => b.formulaCount - a.formulaCount);

    // Auto-wired pattern stats
    const patternCounts = AUTO_WIRING_PATTERNS.map(p => {
      let count = 0;
      for (const wirings of this.wirings.values()) {
        if (wirings.some(w => w.source === "auto" && p.engineIds.includes(w.engineId))) {
          count++;
        }
      }
      return { pattern: p.description, count };
    }).filter(p => p.count > 0).sort((a, b) => b.count - a.count);

    return {
      totalFormulas: stats.total,
      wiredCount,
      unwiredCount,
      wiringPercentage: (wiredCount / stats.total) * 100,
      byDomain,
      byCategory,
      topConsumers: consumerCounts.slice(0, 15),
      autoWiredPatterns: patternCounts
    };
  }

  /**
   * Search formulas by keyword
   */
  async searchFormulas(query: string): Promise<FormulaSearchResult[]> {
    await this.initialize();

    const allFormulas = formulaRegistry.all();
    const queryLower = query.toLowerCase();

    const matches = allFormulas.filter(f => {
      const searchText = `${f.formula_id} ${f.name} ${f.domain} ${f.category} ${f.description}`.toLowerCase();
      return searchText.includes(queryLower);
    });

    return matches.map(formula => ({
      formula,
      wiring: this.wirings.get(formula.formula_id) || [],
      consumerCount: this.wirings.get(formula.formula_id)?.length || 0
    }));
  }

  /**
   * Get all domains with formula counts
   */
  async getDomains(): Promise<{ domain: string; total: number; wired: number }[]> {
    await this.initialize();

    const stats = await formulaRegistry.getStats();
    const domains: { domain: string; total: number; wired: number }[] = [];

    for (const [domain, count] of Object.entries(stats.byDomain)) {
      const domainFormulas = await formulaRegistry.getByDomain(domain);
      const wiredCount = domainFormulas.filter(f => this.wirings.has(f.formula_id)).length;
      domains.push({ domain, total: count, wired: wiredCount });
    }

    return domains.sort((a, b) => b.total - a.total);
  }

  /**
   * Bulk wire multiple formulas to an engine
   */
  async bulkWireByPattern(
    pattern: RegExp,
    engineId: string,
    options?: { confidence?: number }
  ): Promise<{ wired: number; skipped: number }> {
    await this.initialize();

    const allFormulas = formulaRegistry.all();
    let wired = 0;
    let skipped = 0;

    for (const formula of allFormulas) {
      const searchText = `${formula.formula_id} ${formula.name} ${formula.category}`;

      if (pattern.test(searchText)) {
        const existing = this.wirings.get(formula.formula_id) || [];
        if (!existing.some(w => w.engineId === engineId)) {
          await this.wireFormula(formula.formula_id, engineId, {
            confidence: options?.confidence || 0.85,
            source: "auto"
          });
          wired++;
        } else {
          skipped++;
        }
      }
    }

    return { wired, skipped };
  }

  /**
   * Get statistics summary
   */
  async getStats(): Promise<{
    totalFormulas: number;
    wiredFormulas: number;
    unwiredFormulas: number;
    totalEngines: number;
    totalWirings: number;
    avgWiringsPerFormula: number;
  }> {
    await this.initialize();

    const stats = await formulaRegistry.getStats();
    let totalWirings = 0;
    for (const wirings of this.wirings.values()) {
      totalWirings += wirings.length;
    }

    return {
      totalFormulas: stats.total,
      wiredFormulas: this.wirings.size,
      unwiredFormulas: stats.total - this.wirings.size,
      totalEngines: this.engineToFormulas.size,
      totalWirings,
      avgWiringsPerFormula: this.wirings.size > 0 ? totalWirings / this.wirings.size : 0
    };
  }
}

// Export singleton
export const formulaWiringEngine = new FormulaWiringEngine();
