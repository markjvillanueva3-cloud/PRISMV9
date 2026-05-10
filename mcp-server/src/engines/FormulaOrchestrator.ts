/**
 * FormulaOrchestrator — Central Formula Discovery, Validation, and Wiring
 *
 * U-AWR31: Orchestrate formula discovery, validation, and wiring.
 * Scans all engines for formula usage, maps to source engines,
 * validates against physics constraints, and reports coverage.
 *
 * Exit Criteria:
 * - 509 formulas scanned and mapped
 * - Formula coverage report shows 100%
 * - Lathe/Mill/WEDM domain formulas mapped
 * - Physics validation gates in place
 * - Wired to UnifiedAwarenessOrchestrator
 *
 * @module engines/FormulaOrchestrator
 */

import { log } from "../utils/Logger.js";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { FormulaRegistry, Formula } from "../registries/FormulaRegistry.js";

// ============================================================================
// TYPES (per AI-AWARE-HARDEN.json typeScriptInterfaces)
// ============================================================================

export interface FormulaMetadata {
  id: string;
  name: string;
  domain: "lathe" | "mill" | "wedm" | "general";
  sourceEngine: string;
  inputs: { name: string; type: string; unit: string }[];
  outputs: { name: string; type: string; unit: string }[];
  citations: string[];
  physicsCategory: "force" | "thermal" | "deflection" | "wear" | "surface";
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  physicsGates: {
    force: boolean;
    thermal: boolean;
    deflection: boolean;
  };
}

export interface CoverageReport {
  totalFormulas: number;
  mappedFormulas: number;
  orphanFormulas: string[];
  byDomain: Record<string, number>;
  byCategory: Record<string, number>;
  byPhysicsCategory: Record<string, number>;
}

export interface FormulaEngineMapping {
  formulaId: string;
  formulaName: string;
  sourceEngines: string[];
  consumerEngines: string[];
  domain: string;
  category: string;
  validated: boolean;
}

// ============================================================================
// DOMAIN CLASSIFICATION
// ============================================================================

const DOMAIN_KEYWORDS: Record<string, string[]> = {
  lathe: [
    "turning", "lathe", "threading", "parting", "grooving", "boring",
    "chuck", "tailstock", "spindle", "css", "sfm", "rpm"
  ],
  mill: [
    "milling", "mill", "endmill", "facemill", "slot", "pocket", "contour",
    "trochoidal", "hsm", "adaptive", "roughing", "finishing", "3axis", "5axis"
  ],
  wedm: [
    "wedm", "wire", "edm", "spark", "discharge", "dielectric", "flushing",
    "skim", "rough", "ra", "recast", "wire_break", "crater"
  ],
  general: [
    "cutting", "force", "power", "torque", "mrr", "speed", "feed",
    "deflection", "thermal", "wear", "tool_life", "surface", "chatter"
  ]
};

const PHYSICS_CATEGORY_MAP: Record<string, string> = {
  cutting_force: "force",
  force: "force",
  power: "force",
  torque: "force",
  temperature: "thermal",
  thermal: "thermal",
  heat: "thermal",
  deflection: "deflection",
  vibration: "deflection",
  chatter: "deflection",
  wear: "wear",
  tool_life: "wear",
  surface: "surface",
  roughness: "surface",
  finish: "surface"
};

// ============================================================================
// PHYSICS VALIDATION GATES (per AI-AWARE-HARDEN exit criteria)
// ============================================================================

const PHYSICS_GATES = {
  force: {
    name: "Force Positive Gate",
    validate: (value: number): boolean => value > 0,
    description: "Force formulas must produce positive values"
  },
  thermal: {
    name: "Thermal Bounds Gate",
    validate: (value: number): boolean => value >= 20 && value <= 1500,
    description: "Thermal formulas bounded 20-1500°C"
  },
  deflection: {
    name: "Deflection Limits Gate",
    validateRoughing: (value: number): boolean => value < 0.2,
    validateFinishing: (value: number): boolean => value < 0.05,
    description: "Deflection < 0.2mm roughing, < 0.05mm finishing"
  }
};

// ============================================================================
// FORMULA ORCHESTRATOR ENGINE
// ============================================================================

export class FormulaOrchestrator {
  private static instance: FormulaOrchestrator;
  private formulaRegistry: typeof FormulaRegistry;
  private engineMappings: Map<string, FormulaEngineMapping> = new Map();
  private initialized: boolean = false;
  private stateFile: string;

  private constructor() {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    this.stateFile = path.join(__dirname, "../data/state/FORMULA_ORCHESTRATOR_STATE.json");
    this.formulaRegistry = FormulaRegistry;
  }

  static getInstance(): FormulaOrchestrator {
    if (!FormulaOrchestrator.instance) {
      FormulaOrchestrator.instance = new FormulaOrchestrator();
    }
    return FormulaOrchestrator.instance;
  }

  /**
   * Initialize the orchestrator by scanning all engines
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    log.info("[FormulaOrchestrator] Initializing...");

    // Load existing state if available
    await this.loadState();

    // Scan engines for formula references
    await this.scanEnginesForFormulas();

    this.initialized = true;
    log.info(`[FormulaOrchestrator] Initialized with ${this.engineMappings.size} formula mappings`);
  }

  /**
   * Scan all engine files for formula references
   * Returns metadata for all discovered formulas
   */
  async scanEnginesForFormulas(): Promise<FormulaMetadata[]> {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const enginesDir = path.join(__dirname, "../engines");
    const results: FormulaMetadata[] = [];

    try {
      // Get all formulas from registry
      const allFormulas = await this.formulaRegistry.list();
      log.info(`[FormulaOrchestrator] Scanning ${allFormulas.length} registered formulas`);

      // Get list of engine files
      const engineFiles = fs.readdirSync(enginesDir)
        .filter(f => f.endsWith(".ts") && !f.endsWith(".test.ts"));

      log.info(`[FormulaOrchestrator] Scanning ${engineFiles.length} engine files`);

      // For each formula, find which engines reference it
      for (const formula of allFormulas) {
        const metadata = this.createFormulaMetadata(formula);
        const sourceEngines: string[] = [];
        const consumerEngines: string[] = [];

        // Scan engine files for references
        for (const engineFile of engineFiles) {
          const enginePath = path.join(enginesDir, engineFile);
          try {
            const content = fs.readFileSync(enginePath, "utf-8");
            const engineName = engineFile.replace(".ts", "");

            // Check if engine references this formula
            if (this.engineReferencesFormula(content, formula)) {
              // Determine if source or consumer based on implementation patterns
              if (this.isFormulaSource(content, formula)) {
                sourceEngines.push(engineName);
              } else {
                consumerEngines.push(engineName);
              }
            }
          } catch {
            // Skip files that can't be read
          }
        }

        // Store mapping
        const mapping: FormulaEngineMapping = {
          formulaId: formula.formula_id,
          formulaName: formula.name,
          sourceEngines,
          consumerEngines,
          domain: metadata.domain,
          category: formula.category,
          validated: false
        };

        this.engineMappings.set(formula.formula_id, mapping);
        metadata.sourceEngine = sourceEngines[0] || "FormulaRegistry";
        results.push(metadata);
      }

      // Save state
      await this.saveState();

      return results;
    } catch (error) {
      log.error(`[FormulaOrchestrator] Scan failed: ${error}`);
      return results;
    }
  }

  /**
   * Check if engine content references a formula
   */
  private engineReferencesFormula(content: string, formula: Formula): boolean {
    const patterns = [
      formula.formula_id,
      formula.name.toLowerCase(),
      formula.equation_plain?.replace(/\s/g, ""),
      ...(formula.parameters?.map(p => p.symbol) || [])
    ].filter(Boolean);

    const contentLower = content.toLowerCase();
    return patterns.some(p => contentLower.includes(p.toLowerCase()));
  }

  /**
   * Determine if engine is a formula source (implements) vs consumer (uses)
   */
  private isFormulaSource(content: string, formula: Formula): boolean {
    // Source engines typically have:
    // - Implementation function
    // - Formula definition/registration
    // - Return calculation results
    const sourcePatterns = [
      `formula_id.*${formula.formula_id}`,
      `calculate.*${formula.name.replace(/\s/g, "")}`,
      `compute.*${formula.name.replace(/\s/g, "")}`,
      "export.*Formula",
      "registerFormula"
    ];

    return sourcePatterns.some(p => new RegExp(p, "i").test(content));
  }

  /**
   * Create FormulaMetadata from Formula
   */
  private createFormulaMetadata(formula: Formula): FormulaMetadata {
    return {
      id: formula.formula_id,
      name: formula.name,
      domain: this.classifyDomain(formula),
      sourceEngine: "",
      inputs: formula.parameters
        ?.filter(p => p.type === "input")
        .map(p => ({ name: p.name, type: "number", unit: p.unit })) || [],
      outputs: formula.parameters
        ?.filter(p => p.type === "output")
        .map(p => ({ name: p.name, type: "number", unit: p.unit })) || [],
      citations: formula.references || [],
      physicsCategory: this.classifyPhysicsCategory(formula.category)
    };
  }

  /**
   * Classify formula domain (lathe, mill, wedm, general)
   */
  private classifyDomain(formula: Formula): "lathe" | "mill" | "wedm" | "general" {
    const text = `${formula.name} ${formula.description || ""} ${formula.category}`.toLowerCase();

    for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
      if (domain === "general") continue;
      if (keywords.some(kw => text.includes(kw))) {
        return domain as "lathe" | "mill" | "wedm";
      }
    }

    return "general";
  }

  /**
   * Classify physics category
   */
  private classifyPhysicsCategory(category: string): "force" | "thermal" | "deflection" | "wear" | "surface" {
    const cat = category?.toLowerCase() || "";
    for (const [key, value] of Object.entries(PHYSICS_CATEGORY_MAP)) {
      if (cat.includes(key)) {
        return value as "force" | "thermal" | "deflection" | "wear" | "surface";
      }
    }
    return "force"; // Default
  }

  /**
   * Validate a formula against physics constraints
   */
  validateFormula(formulaId: string, testValues?: Record<string, number | string>): ValidationResult {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      physicsGates: {
        force: true,
        thermal: true,
        deflection: true
      }
    };

    const mapping = this.engineMappings.get(formulaId);
    if (!mapping) {
      result.valid = false;
      result.errors.push(`Formula ${formulaId} not found in registry`);
      // Still validate test values even if formula not found
    }

    // If test values provided, validate against physics gates
    if (testValues) {
      // Force gate
      if (testValues.force !== undefined || testValues.Fc !== undefined) {
        const forceValue = testValues.force || testValues.Fc || 0;
        result.physicsGates.force = PHYSICS_GATES.force.validate(forceValue);
        if (!result.physicsGates.force) {
          result.errors.push(`Force value ${forceValue} failed positive gate`);
          result.valid = false;
        }
      }

      // Thermal gate
      if (testValues.temperature !== undefined || testValues.T !== undefined) {
        const tempValue = testValues.temperature || testValues.T || 0;
        result.physicsGates.thermal = PHYSICS_GATES.thermal.validate(tempValue);
        if (!result.physicsGates.thermal) {
          result.errors.push(`Temperature ${tempValue}°C outside bounds [20, 1500]`);
          result.valid = false;
        }
      }

      // Deflection gate
      if (testValues.deflection !== undefined || testValues.delta !== undefined) {
        const deflValue = testValues.deflection || testValues.delta || 0;
        const isRoughing = testValues.operation === "roughing" || !testValues.operation;
        const deflLimit = isRoughing ? 0.2 : 0.05;
        const passed = deflValue < deflLimit;
        result.physicsGates.deflection = passed;
        if (!passed) {
          result.warnings.push(`Deflection ${deflValue}mm exceeds ${isRoughing ? "roughing" : "finishing"} limit ${deflLimit}mm`);
        }
      }
    }

    // Check if formula has source engines (only if mapping exists)
    if (mapping) {
      if (mapping.sourceEngines.length === 0) {
        result.warnings.push(`Formula ${formulaId} has no identified source engine`);
      }

      // Mark as validated
      mapping.validated = true;
      this.engineMappings.set(formulaId, mapping);
    }

    return result;
  }

  /**
   * Wire a formula to an engine (establish relationship)
   */
  wireFormulaToEngine(formulaId: string, engineId: string, role: "source" | "consumer" = "consumer"): void {
    const mapping = this.engineMappings.get(formulaId);
    if (!mapping) {
      log.warn(`[FormulaOrchestrator] Cannot wire: formula ${formulaId} not found`);
      return;
    }

    if (role === "source") {
      if (!mapping.sourceEngines.includes(engineId)) {
        mapping.sourceEngines.push(engineId);
      }
    } else {
      if (!mapping.consumerEngines.includes(engineId)) {
        mapping.consumerEngines.push(engineId);
      }
    }

    this.engineMappings.set(formulaId, mapping);
    log.info(`[FormulaOrchestrator] Wired ${formulaId} to ${engineId} as ${role}`);
  }

  /**
   * Get formulas by domain
   */
  getFormulasByDomain(domain: "lathe" | "mill" | "wedm" | "general" | "all"): FormulaMetadata[] {
    const results: FormulaMetadata[] = [];

    for (const [id, mapping] of this.engineMappings) {
      if (domain === "all" || mapping.domain === domain) {
        results.push({
          id: mapping.formulaId,
          name: mapping.formulaName,
          domain: mapping.domain as "lathe" | "mill" | "wedm" | "general",
          sourceEngine: mapping.sourceEngines[0] || "unknown",
          inputs: [],
          outputs: [],
          citations: [],
          physicsCategory: this.classifyPhysicsCategory(mapping.category)
        });
      }
    }

    return results;
  }

  /**
   * Get comprehensive formula coverage report
   */
  getFormulaCoverage(): CoverageReport {
    const report: CoverageReport = {
      totalFormulas: this.engineMappings.size,
      mappedFormulas: 0,
      orphanFormulas: [],
      byDomain: { lathe: 0, mill: 0, wedm: 0, general: 0 },
      byCategory: {},
      byPhysicsCategory: { force: 0, thermal: 0, deflection: 0, wear: 0, surface: 0 }
    };

    for (const [id, mapping] of this.engineMappings) {
      // Count mapped vs orphan
      if (mapping.sourceEngines.length > 0 || mapping.consumerEngines.length > 0) {
        report.mappedFormulas++;
      } else {
        report.orphanFormulas.push(id);
      }

      // Count by domain
      if (mapping.domain in report.byDomain) {
        report.byDomain[mapping.domain]++;
      }

      // Count by category
      const cat = mapping.category || "unknown";
      report.byCategory[cat] = (report.byCategory[cat] || 0) + 1;

      // Count by physics category
      const physCat = this.classifyPhysicsCategory(cat);
      if (physCat in report.byPhysicsCategory) {
        report.byPhysicsCategory[physCat]++;
      }
    }

    return report;
  }

  /**
   * Get mapping for a specific formula
   */
  getFormulaMapping(formulaId: string): FormulaEngineMapping | undefined {
    return this.engineMappings.get(formulaId);
  }

  /**
   * Get all orphan formulas (no source engine)
   */
  getOrphanFormulas(): string[] {
    const orphans: string[] = [];
    for (const [id, mapping] of this.engineMappings) {
      if (mapping.sourceEngines.length === 0) {
        orphans.push(id);
      }
    }
    return orphans;
  }

  /**
   * Save state to JSON file
   */
  private async saveState(): Promise<void> {
    try {
      const state = {
        schemaVersion: "1.0.0",
        lastUpdated: new Date().toISOString(),
        formulaCount: this.engineMappings.size,
        mappings: Object.fromEntries(this.engineMappings)
      };

      const dir = path.dirname(this.stateFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(this.stateFile, JSON.stringify(state, null, 2));
      log.info(`[FormulaOrchestrator] State saved to ${this.stateFile}`);
    } catch (error) {
      log.error(`[FormulaOrchestrator] Failed to save state: ${error}`);
    }
  }

  /**
   * Load state from JSON file
   */
  private async loadState(): Promise<void> {
    try {
      if (fs.existsSync(this.stateFile)) {
        const content = fs.readFileSync(this.stateFile, "utf-8");
        const state = JSON.parse(content);

        if (state.mappings) {
          this.engineMappings = new Map(Object.entries(state.mappings));
          log.info(`[FormulaOrchestrator] Loaded ${this.engineMappings.size} mappings from state`);
        }
      }
    } catch (error) {
      log.warn(`[FormulaOrchestrator] Could not load state: ${error}`);
    }
  }

  /**
   * Get validation statistics
   */
  getValidationStats(): { total: number; validated: number; pending: number } {
    let validated = 0;
    for (const mapping of this.engineMappings.values()) {
      if (mapping.validated) validated++;
    }
    return {
      total: this.engineMappings.size,
      validated,
      pending: this.engineMappings.size - validated
    };
  }
}

// Export singleton instance
export const formulaOrchestrator = FormulaOrchestrator.getInstance();

// Export for testing
export default FormulaOrchestrator;
