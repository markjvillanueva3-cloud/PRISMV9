/**
 * PRISM MCP Server - Formula Registry
 * Complete access to 109 formulas across 20 domains
 * Physics, Manufacturing, AI/ML, Optimization
 */

import * as path from "path";
import { BaseRegistry } from "./base.js";
import { PATHS, FORMULA_DOMAINS } from "../constants.js";
import { log } from "../utils/Logger.js";
import { fileExists, readJsonFile, listDirectory } from "../utils/files.js";

// ============================================================================
// FORMULA TYPES
// ============================================================================

export interface FormulaParameter {
  name: string;
  symbol: string;
  unit: string;
  description: string;
  type: "input" | "output" | "constant";
  range?: { min: number; max: number };
  default?: number;
}

export interface FormulaValidation {
  required_inputs: string[];
  output_range?: { min: number; max: number };
  constraints?: string[];
  safety_checks?: string[];
}

export interface Formula {
  // Identification
  formula_id: string;
  name: string;
  domain: string;           // physics, manufacturing, ai_ml, optimization, etc.
  category: string;         // cutting_force, tool_life, thermal, etc.
  
  // Mathematical representation
  equation: string;         // LaTeX or symbolic math
  equation_plain: string;   // Plain text version
  
  // Parameters
  parameters: FormulaParameter[];
  
  // Implementation
  implementation?: string;  // JavaScript/TypeScript code
  
  // Validation
  validation: FormulaValidation;
  
  // Documentation
  description: string;
  theory?: string;
  assumptions?: string[];
  limitations?: string[];
  references?: string[];
  
  // Usage
  consumers: string[];      // Tools/engines that use this formula
  examples?: {
    inputs: Record<string, number>;
    output: number;
    description: string;
  }[];
  
  // Metadata
  source?: string;
  version?: string;
  last_updated?: string;
}

// ============================================================================
// BUILT-IN FORMULAS (Core Manufacturing Physics)
// ============================================================================

const BUILT_IN_FORMULAS: Formula[] = [
  // F-KIENZLE-001: Kienzle Cutting Force
  {
    formula_id: "F-KIENZLE-001",
    name: "Kienzle Cutting Force",
    domain: "physics",
    category: "cutting_force",
    equation: "F_c = k_{c1.1} \\cdot h^{-m_c} \\cdot b",
    equation_plain: "Fc = kc1.1 * h^(-mc) * b",
    parameters: [
      { name: "kc1_1", symbol: "k_{c1.1}", unit: "N/mm²", description: "Specific cutting force at h=1mm", type: "input", range: { min: 500, max: 5000 } },
      { name: "mc", symbol: "m_c", unit: "-", description: "Kienzle exponent", type: "input", range: { min: 0.15, max: 0.45 } },
      { name: "h", symbol: "h", unit: "mm", description: "Chip thickness (undeformed)", type: "input", range: { min: 0.01, max: 2.0 } },
      { name: "b", symbol: "b", unit: "mm", description: "Width of cut", type: "input", range: { min: 0.1, max: 50 } },
      { name: "Fc", symbol: "F_c", unit: "N", description: "Main cutting force", type: "output" }
    ],
    validation: {
      required_inputs: ["kc1_1", "mc", "h", "b"],
      output_range: { min: 0, max: 100000 },
      safety_checks: ["Fc must not exceed machine spindle capacity"]
    },
    description: "Calculates main cutting force using Kienzle model. Essential for power calculations and tool load analysis.",
    theory: "Based on empirical relationship between specific cutting force and chip thickness, developed by Kienzle (1952).",
    assumptions: ["Orthogonal cutting", "Sharp tool", "No built-up edge", "Steady-state cutting"],
    limitations: ["Not accurate for interrupted cutting", "Requires material-specific coefficients"],
    references: ["Kienzle, O. (1952). Die Bestimmung von Kräften und Leistungen an spanenden Werkzeugen und Werkzeugmaschinen"],
    consumers: ["speed_feed", "cutting_force", "power_calc", "chatter_predict"],
    examples: [
      { inputs: { kc1_1: 1800, mc: 0.25, h: 0.1, b: 4.0 }, output: 4032, description: "Milling AISI 1045 steel" }
    ]
  },
  
  // F-TAYLOR-001: Taylor Tool Life
  {
    formula_id: "F-TAYLOR-001",
    name: "Taylor Tool Life",
    domain: "physics",
    category: "tool_life",
    equation: "V \\cdot T^n = C",
    equation_plain: "V * T^n = C",
    parameters: [
      { name: "V", symbol: "V", unit: "m/min", description: "Cutting speed", type: "input", range: { min: 1, max: 1000 } },
      { name: "T", symbol: "T", unit: "min", description: "Tool life", type: "output", range: { min: 1, max: 1000 } },
      { name: "n", symbol: "n", unit: "-", description: "Taylor exponent", type: "input", range: { min: 0.1, max: 0.5 } },
      { name: "C", symbol: "C", unit: "-", description: "Taylor constant", type: "input", range: { min: 50, max: 500 } }
    ],
    validation: {
      required_inputs: ["V", "n", "C"],
      output_range: { min: 0.1, max: 10000 },
      safety_checks: ["Tool life should be validated against actual wear measurements"]
    },
    description: "Predicts tool life based on cutting speed using Taylor equation.",
    theory: "Empirical relationship discovered by F.W. Taylor (1907) showing inverse power law between cutting speed and tool life.",
    assumptions: ["Constant feed and depth of cut", "Single-point tool", "Continuous cutting"],
    limitations: ["Coefficients vary with material, tool, and conditions", "Not accurate at extreme speeds"],
    references: ["Taylor, F.W. (1907). On the Art of Cutting Metals"],
    consumers: ["tool_life", "speed_feed", "cost_calc"],
    examples: [
      { inputs: { V: 200, n: 0.25, C: 300 }, output: 5.06, description: "Carbide tool in steel" }
    ]
  },
  
  // F-MRR-001: Material Removal Rate
  {
    formula_id: "F-MRR-001",
    name: "Material Removal Rate",
    domain: "manufacturing",
    category: "productivity",
    equation: "MRR = a_p \\cdot a_e \\cdot v_f",
    equation_plain: "MRR = ap * ae * vf",
    parameters: [
      { name: "ap", symbol: "a_p", unit: "mm", description: "Axial depth of cut", type: "input", range: { min: 0.1, max: 50 } },
      { name: "ae", symbol: "a_e", unit: "mm", description: "Radial depth of cut (width)", type: "input", range: { min: 0.1, max: 100 } },
      { name: "vf", symbol: "v_f", unit: "mm/min", description: "Feed rate", type: "input", range: { min: 10, max: 10000 } },
      { name: "MRR", symbol: "MRR", unit: "mm³/min", description: "Material removal rate", type: "output" }
    ],
    validation: {
      required_inputs: ["ap", "ae", "vf"],
      output_range: { min: 0, max: 1000000 }
    },
    description: "Calculates volumetric material removal rate for milling operations.",
    consumers: ["mrr_calc", "speed_feed", "cost_calc", "power_calc"]
  },
  
  // F-POWER-001: Cutting Power
  {
    formula_id: "F-POWER-001",
    name: "Cutting Power",
    domain: "physics",
    category: "power",
    equation: "P_c = \\frac{F_c \\cdot V_c}{60000 \\cdot \\eta}",
    equation_plain: "Pc = (Fc * Vc) / (60000 * eta)",
    parameters: [
      { name: "Fc", symbol: "F_c", unit: "N", description: "Cutting force", type: "input" },
      { name: "Vc", symbol: "V_c", unit: "m/min", description: "Cutting speed", type: "input" },
      { name: "eta", symbol: "\\eta", unit: "-", description: "Machine efficiency", type: "input", default: 0.85 },
      { name: "Pc", symbol: "P_c", unit: "kW", description: "Cutting power", type: "output" }
    ],
    validation: {
      required_inputs: ["Fc", "Vc"],
      safety_checks: ["Pc must not exceed machine spindle power rating"]
    },
    description: "Calculates power required at the spindle for cutting operation.",
    consumers: ["power_calc", "speed_feed", "machine_selection"]
  },
  
  // F-SURFACE-001: Surface Finish (Theoretical)
  {
    formula_id: "F-SURFACE-001",
    name: "Theoretical Surface Finish",
    domain: "manufacturing",
    category: "quality",
    equation: "R_a = \\frac{f^2}{32 \\cdot r}",
    equation_plain: "Ra = f^2 / (32 * r)",
    parameters: [
      { name: "f", symbol: "f", unit: "mm/rev", description: "Feed per revolution", type: "input" },
      { name: "r", symbol: "r", unit: "mm", description: "Tool nose radius", type: "input" },
      { name: "Ra", symbol: "R_a", unit: "µm", description: "Surface roughness (arithmetic mean)", type: "output" }
    ],
    validation: {
      required_inputs: ["f", "r"],
      output_range: { min: 0.01, max: 50 }
    },
    description: "Calculates theoretical surface roughness based on feed and tool geometry.",
    assumptions: ["Perfect tool geometry", "No vibration", "No material tearing"],
    consumers: ["surface_finish", "speed_feed", "quality_prediction"]
  },
  
  // F-CHIPTHK-001: Average Chip Thickness
  {
    formula_id: "F-CHIPTHK-001",
    name: "Average Chip Thickness",
    domain: "physics",
    category: "chip_formation",
    equation: "h_m = f_z \\cdot \\sqrt{\\frac{a_e}{D}}",
    equation_plain: "hm = fz * sqrt(ae / D)",
    parameters: [
      { name: "fz", symbol: "f_z", unit: "mm/tooth", description: "Feed per tooth", type: "input" },
      { name: "ae", symbol: "a_e", unit: "mm", description: "Radial depth of cut", type: "input" },
      { name: "D", symbol: "D", unit: "mm", description: "Cutter diameter", type: "input" },
      { name: "hm", symbol: "h_m", unit: "mm", description: "Average chip thickness", type: "output" }
    ],
    validation: {
      required_inputs: ["fz", "ae", "D"],
      constraints: ["ae <= D"]
    },
    description: "Calculates average undeformed chip thickness for milling.",
    consumers: ["chip_calc", "speed_feed", "cutting_force"]
  },
  
  // F-DEFLECT-001: Tool Deflection
  {
    formula_id: "F-DEFLECT-001",
    name: "Tool Deflection",
    domain: "physics",
    category: "mechanics",
    equation: "\\delta = \\frac{F \\cdot L^3}{3 \\cdot E \\cdot I}",
    equation_plain: "delta = (F * L^3) / (3 * E * I)",
    parameters: [
      { name: "F", symbol: "F", unit: "N", description: "Applied force", type: "input" },
      { name: "L", symbol: "L", unit: "mm", description: "Tool overhang length", type: "input" },
      { name: "E", symbol: "E", unit: "GPa", description: "Elastic modulus", type: "input", default: 620 },
      { name: "I", symbol: "I", unit: "mm⁴", description: "Moment of inertia", type: "input" },
      { name: "delta", symbol: "\\delta", unit: "mm", description: "Deflection at tip", type: "output" }
    ],
    validation: {
      required_inputs: ["F", "L", "E", "I"],
      safety_checks: ["Deflection should be < 10% of tolerance"]
    },
    description: "Calculates tool tip deflection as cantilever beam.",
    consumers: ["deflection_calc", "tool_selection", "quality_prediction"]
  },
  
  // F-CHATTER-001: Chatter Stability (Simplified)
  {
    formula_id: "F-CHATTER-001",
    name: "Chatter Stability Limit",
    domain: "physics",
    category: "dynamics",
    equation: "b_{lim} = \\frac{-1}{2 \\cdot K_s \\cdot Re[G]}",
    equation_plain: "blim = -1 / (2 * Ks * Re[G])",
    parameters: [
      { name: "Ks", symbol: "K_s", unit: "N/mm²", description: "Specific cutting stiffness", type: "input" },
      { name: "ReG", symbol: "Re[G]", unit: "mm/N", description: "Real part of FRF", type: "input" },
      { name: "blim", symbol: "b_{lim}", unit: "mm", description: "Limiting depth of cut", type: "output" }
    ],
    validation: {
      required_inputs: ["Ks", "ReG"],
      safety_checks: ["Actual depth must be < blim for stable cutting"]
    },
    description: "Calculates critical depth of cut for chatter-free machining.",
    consumers: ["chatter_predict", "stability_analysis", "speed_feed"]
  },
  
  // F-PSI-001: ILP Combination Engine
  {
    formula_id: "F-PSI-001",
    name: "ILP Combination Optimization",
    domain: "optimization",
    category: "resource_allocation",
    equation: "\\Psi = \\arg\\max \\left[ \\sum Cap(r,T) \\cdot Syn(R) \\cdot \\Omega(R) \\cdot K(R) / Cost(R) \\right]",
    equation_plain: "Psi = argmax [ sum Cap(r,T) * Syn(R) * Omega(R) * K(R) / Cost(R) ]",
    parameters: [
      { name: "Cap", symbol: "Cap(r,T)", unit: "-", description: "Capability score for resource r on task T", type: "input" },
      { name: "Syn", symbol: "Syn(R)", unit: "-", description: "Synergy score for resource set R", type: "input" },
      { name: "Omega", symbol: "\\Omega(R)", unit: "-", description: "Quality score for resource set", type: "input" },
      { name: "K", symbol: "K(R)", unit: "-", description: "Knowledge coverage", type: "input" },
      { name: "Cost", symbol: "Cost(R)", unit: "-", description: "Resource cost", type: "input" }
    ],
    validation: {
      required_inputs: ["Cap", "Syn", "Omega", "K", "Cost"],
      constraints: ["|skills| <= 8", "|agents| <= 8", "S >= 0.70", "M >= 0.60", "Coverage = 1.0"]
    },
    description: "Integer Linear Programming formulation for optimal resource combination.",
    consumers: ["ilp_optimize", "agent_swarm", "resource_allocation"]
  },
  
  // F-OMEGA-001: Master Quality Equation
  {
    formula_id: "F-OMEGA-001",
    name: "PRISM Master Quality Equation",
    domain: "quality",
    category: "scoring",
    equation: "\\Omega(x) = 0.25 \\cdot R(x) + 0.20 \\cdot C(x) + 0.15 \\cdot P(x) + 0.30 \\cdot S(x) + 0.10 \\cdot L(x)",
    equation_plain: "Omega(x) = 0.25*R(x) + 0.20*C(x) + 0.15*P(x) + 0.30*S(x) + 0.10*L(x)",
    parameters: [
      { name: "R", symbol: "R(x)", unit: "-", description: "Reasoning quality score", type: "input", range: { min: 0, max: 1 } },
      { name: "C", symbol: "C(x)", unit: "-", description: "Code quality score", type: "input", range: { min: 0, max: 1 } },
      { name: "P", symbol: "P(x)", unit: "-", description: "Process quality score", type: "input", range: { min: 0, max: 1 } },
      { name: "S", symbol: "S(x)", unit: "-", description: "Safety score", type: "input", range: { min: 0, max: 1 } },
      { name: "L", symbol: "L(x)", unit: "-", description: "Learning score", type: "input", range: { min: 0, max: 1 } },
      { name: "Omega", symbol: "\\Omega(x)", unit: "-", description: "Overall quality score", type: "output", range: { min: 0, max: 1 } }
    ],
    validation: {
      required_inputs: ["R", "C", "P", "S", "L"],
      output_range: { min: 0, max: 1 },
      constraints: ["S(x) >= 0.70 (HARD BLOCK)", "Omega(x) >= 0.70 (WARN)"]
    },
    description: "Master quality equation for PRISM output evaluation. Safety score is a hard constraint.",
    consumers: ["quality_check", "safety_check", "output_validation"]
  }
];

// ============================================================================
// FORMULA REGISTRY CLASS
// ============================================================================

export class FormulaRegistry extends BaseRegistry<Formula> {
  private indexByDomain: Map<string, string[]> = new Map();
  private indexByCategory: Map<string, string[]> = new Map();
  private indexByConsumer: Map<string, string[]> = new Map();
  
  constructor() {
    super(
      "FormulaRegistry",
      path.join(PATHS.STATE_DIR, "formula-registry.json"),
      "1.0.0"
    );
  }

  /**
   * Load formulas from files and built-ins
   */
  async load(): Promise<void> {
    if (this.loaded) return;
    
    log.info("Loading FormulaRegistry...");
    
    // Load built-in formulas first
    for (const formula of BUILT_IN_FORMULAS) {
      this.entries.set(formula.formula_id, {
        id: formula.formula_id,
        data: formula,
        metadata: {
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          version: 1,
          source: "built-in"
        }
      });
    }
    
    // Load from main FORMULA_REGISTRY.json (490 formulas)
    await this.loadFromRegistryFile();
    
    // Load from formula skill files (additional overrides)
    await this.loadFromSkillFiles();
    
    // Build indexes
    this.buildIndexes();
    
    this.loaded = true;
    log.info(`FormulaRegistry loaded: ${this.entries.size} formulas across ${this.indexByDomain.size} domains`);
  }

  /**
   * Load formulas from main FORMULA_REGISTRY.json (490 formulas)
   */
  private async loadFromRegistryFile(): Promise<void> {
    const registryPaths = [
      path.join(PATHS.PRISM_ROOT, "registries", "FORMULA_REGISTRY.json"),
      path.join(PATHS.DATA_DIR, "FORMULA_REGISTRY.json")
    ];
    
    for (const registryPath of registryPaths) {
      try {
        if (!await fileExists(registryPath)) continue;
        
        const data = await readJsonFile<any>(registryPath);
        
        // R1: Handle multiple JSON structures:
        // 1. { formulaRegistry: { formulas: { "ID": {...}, ... } } } (actual file format)
        // 2. { formulas: [...] } (array format)
        // 3. [...] (direct array)
        let formulaEntries: any[] = [];
        
        const rawFormulas = data?.formulaRegistry?.formulas || data?.formulas;
        if (rawFormulas) {
          if (Array.isArray(rawFormulas)) {
            formulaEntries = rawFormulas;
          } else if (typeof rawFormulas === "object") {
            // Object with formula IDs as keys
            formulaEntries = Object.values(rawFormulas);
          }
        } else if (Array.isArray(data)) {
          formulaEntries = data;
        }
        
        let loaded = 0;
        
        for (const formula of formulaEntries) {
          // Map schema: registry uses "id", built-in uses "formula_id"
          const formulaId = formula.formula_id || formula.id;
          if (!formulaId) continue;
          
          // Don't overwrite built-in formulas (they have calculate implementations)
          if (this.has(formulaId)) continue;
          
          this.entries.set(formulaId, {
            id: formulaId,
            data: {
              ...formula,
              formula_id: formulaId,
              domain: (formula.domain || formula.category || "unknown").toLowerCase(),
              category: (formula.category || "unknown").toLowerCase(),
              equation: formula.equation || formula.definition?.form || "",
              equation_plain: formula.equation_plain || formula.definition?.expanded || formula.definition?.form || "",
              parameters: formula.parameters || (formula.variables || formula.inputs || []).map((v: any) => ({
                name: v.name || v.symbol,
                symbol: v.symbol || v.name,
                unit: v.unit || "-",
                description: v.description || v.name || v.symbol,
                type: v.type === "float" || v.type === "integer" || v.type === "binary" ? "input" as const : (v.type || "input") as any
              })),
              validation: formula.validation || {
                required_inputs: (formula.inputs || []).map((i: any) => i.name)
              },
              consumers: formula.consumers || formula.feeds_into || [],
              description: formula.description || formula.name,
              name: formula.name
            } as Formula,
            metadata: {
              created: new Date().toISOString(),
              updated: new Date().toISOString(),
              version: 1,
              source: registryPath
            }
          });
          loaded++;
        }
        
        log.info(`Loaded ${loaded} formulas from ${registryPath}`);
        if (loaded > 0) return; // Use first successful source
      } catch (error) {
        log.warn(`Failed to load formula registry from ${registryPath}: ${error}`);
      }
    }
  }

  /**
   * Load formulas from skill files
   */
  private async loadFromSkillFiles(): Promise<void> {
    const formulaSkillPath = path.join(PATHS.SKILLS_DIR, "prism-universal-formulas");
    
    if (!await fileExists(formulaSkillPath)) {
      log.debug("Formula skill not found, using built-ins only");
      return;
    }
    
    try {
      const files = await listDirectory(formulaSkillPath);
      
      for (const file of files) {
        if (file.name.endsWith(".json")) {
          const filePath = file.path;
          const data = await readJsonFile<Formula | Formula[]>(filePath);
          const formulas = Array.isArray(data) ? data : [data];
          
          for (const formula of formulas) {
            if (formula.formula_id && !this.has(formula.formula_id)) {
              this.entries.set(formula.formula_id, {
                id: formula.formula_id,
                data: formula,
                metadata: {
                  created: new Date().toISOString(),
                  updated: new Date().toISOString(),
                  version: 1,
                  source: file
                }
              });
            }
          }
        }
      }
    } catch (error) {
      log.warn(`Failed to load formula skill files: ${error}`);
    }
  }

  /**
   * Build search indexes
   */
  private buildIndexes(): void {
    this.indexByDomain.clear();
    this.indexByCategory.clear();
    this.indexByConsumer.clear();
    
    for (const [id, entry] of this.entries) {
      const formula = entry.data;
      
      // Index by domain
      if (formula.domain) {
        if (!this.indexByDomain.has(formula.domain)) {
          this.indexByDomain.set(formula.domain, []);
        }
        this.indexByDomain.get(formula.domain)!.push(id);
      }
      
      // Index by category
      if (formula.category) {
        if (!this.indexByCategory.has(formula.category)) {
          this.indexByCategory.set(formula.category, []);
        }
        this.indexByCategory.get(formula.category)!.push(id);
      }
      
      // Index by consumer
      if (formula.consumers) {
        for (const consumer of formula.consumers) {
          if (!this.indexByConsumer.has(consumer)) {
            this.indexByConsumer.set(consumer, []);
          }
          this.indexByConsumer.get(consumer)!.push(id);
        }
      }
    }
  }

  /**
   * Get formula by ID
   */
  async getFormula(id: string): Promise<Formula | undefined> {
    await this.load();
    return this.get(id);
  }

  /**
   * Get formulas for a specific consumer (tool)
   */
  async getForConsumer(consumer: string): Promise<Formula[]> {
    await this.load();
    
    const ids = this.indexByConsumer.get(consumer) || [];
    return ids.map(id => this.get(id)).filter(Boolean) as Formula[];
  }

  /**
   * Get formulas by domain
   */
  async getByDomain(domain: string): Promise<Formula[]> {
    await this.load();
    
    const ids = this.indexByDomain.get(domain) || [];
    return ids.map(id => this.get(id)).filter(Boolean) as Formula[];
  }

  /**
   * Get formulas by category
   */
  async getByCategory(category: string): Promise<Formula[]> {
    await this.load();
    
    const ids = this.indexByCategory.get(category) || [];
    return ids.map(id => this.get(id)).filter(Boolean) as Formula[];
  }

  /**
   * List all formulas
   */
  async list(options?: {
    domain?: string;
    category?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ formulas: Formula[]; total: number }> {
    await this.load();
    
    let results: Formula[] = [];
    
    if (options?.domain) {
      results = await this.getByDomain(options.domain);
    } else if (options?.category) {
      results = await this.getByCategory(options.category);
    } else {
      results = this.all();
    }
    
    const total = results.length;
    
    // Pagination
    const offset = options?.offset || 0;
    const limit = options?.limit || 50;
    results = results.slice(offset, offset + limit);
    
    return { formulas: results, total };
  }

  /**
   * Calculate formula with given inputs
   */
  async calculate(formulaId: string, inputs: Record<string, number>): Promise<{
    result: number;
    formula: Formula;
    validation: { valid: boolean; errors: string[]; warnings: string[] };
  }> {
    await this.load();
    
    const formula = this.get(formulaId);
    if (!formula) {
      throw new Error(`Formula ${formulaId} not found`);
    }
    
    const validation = { valid: true, errors: [] as string[], warnings: [] as string[] };
    
    // Check required inputs
    for (const required of formula.validation.required_inputs) {
      if (inputs[required] === undefined) {
        validation.valid = false;
        validation.errors.push(`Missing required input: ${required}`);
      }
    }
    
    // Check input ranges
    for (const param of formula.parameters) {
      if (param.type === "input" && inputs[param.name] !== undefined) {
        const value = inputs[param.name];
        if (param.range) {
          if (value < param.range.min) {
            validation.warnings.push(`${param.name} (${value}) below minimum (${param.range.min})`);
          }
          if (value > param.range.max) {
            validation.warnings.push(`${param.name} (${value}) above maximum (${param.range.max})`);
          }
        }
      }
    }
    
    if (!validation.valid) {
      return { result: NaN, formula, validation };
    }
    
    // Calculate result based on formula ID
    let result: number;
    
    switch (formulaId) {
      case "F-KIENZLE-001":
        result = inputs.kc1_1 * Math.pow(inputs.h, -inputs.mc) * inputs.b;
        break;
        
      case "F-TAYLOR-001":
        result = Math.pow(inputs.C / inputs.V, 1 / inputs.n);
        break;
        
      case "F-MRR-001":
        result = inputs.ap * inputs.ae * inputs.vf;
        break;
        
      case "F-POWER-001":
        const eta = inputs.eta || 0.85;
        result = (inputs.Fc * inputs.Vc) / (60000 * eta);
        break;
        
      case "F-SURFACE-001":
        result = (inputs.f * inputs.f) / (32 * inputs.r);
        break;
        
      case "F-CHIPTHK-001":
        result = inputs.fz * Math.sqrt(inputs.ae / inputs.D);
        break;
        
      case "F-DEFLECT-001":
        const E = inputs.E || 620;
        result = (inputs.F * Math.pow(inputs.L, 3)) / (3 * E * 1000 * inputs.I);
        break;
        
      case "F-CHATTER-001":
        result = -1 / (2 * inputs.Ks * inputs.ReG);
        break;
        
      case "F-OMEGA-001":
        result = 0.25 * inputs.R + 0.20 * inputs.C + 0.15 * inputs.P + 0.30 * inputs.S + 0.10 * inputs.L;
        // Safety hard block check
        if (inputs.S < 0.70) {
          validation.errors.push("HARD BLOCK: S(x) < 0.70");
          validation.valid = false;
        }
        break;
        
      // === CALCULATOR FORMULAS (R1-MS8) ===
      case "F-CALC-001": result = (inputs.Vc * 1000) / (Math.PI * inputs.D); break;
      case "F-CALC-002": result = inputs.n_rpm * inputs.fz * inputs.z; break;
      case "F-CALC-003": result = (Math.PI * inputs.D * inputs.n_rpm) / 1000; break;
      case "F-CALC-004": result = inputs.fz * inputs.D / (2 * Math.sqrt(inputs.D * inputs.ae - inputs.ae * inputs.ae)); break;
      case "F-CALC-005": result = (inputs.P_kw * 30000) / (Math.PI * inputs.n_rpm); break;
      case "F-CALC-006": result = 25.4 / inputs.pitch_mm; break;
      case "F-CALC-007": result = inputs.D_major - inputs.pitch_mm; break;
      case "F-CALC-008": result = inputs.L_mm / inputs.Vf; break;
      case "F-CALC-009": result = (Math.PI * inputs.D_mm * inputs.n_rpm) / 1000; break;

      default: {
        // R1-MS8: formula_js fallback for registry formulas
        const formulaJs = (formula as any).formula_js;
        if (formulaJs && typeof formulaJs === "string") {
          try {
            const fn = new Function("return " + formulaJs)();
            const evalResult = fn(inputs);
            if (typeof evalResult === "number") { result = evalResult; }
            else if (typeof evalResult === "object") {
              const vals = Object.values(evalResult).filter(v => typeof v === "number");
              result = vals.length > 0 ? vals[0] as number : NaN;
            } else { result = NaN; }
          } catch (evalErr: any) {
            throw new Error("Formula " + formulaId + " evaluation failed: " + evalErr.message);
          }
        } else {
          throw new Error("No implementation for formula " + formulaId);
        }
        break;
      }
    }
    
    // Check output range
    if (formula.validation.output_range) {
      if (result < formula.validation.output_range.min || result > formula.validation.output_range.max) {
        validation.warnings.push(`Result ${result} outside expected range`);
      }
    }
    
    return { result, formula, validation };
  }

  /**
   * Get statistics
   */
  async getStats(): Promise<{
    total: number;
    byDomain: Record<string, number>;
    byCategory: Record<string, number>;
    consumerCount: number;
  }> {
    await this.load();
    
    const stats = {
      total: this.entries.size,
      byDomain: {} as Record<string, number>,
      byCategory: {} as Record<string, number>,
      consumerCount: this.indexByConsumer.size
    };
    
    for (const [domain, ids] of this.indexByDomain) {
      stats.byDomain[domain] = ids.length;
    }
    
    for (const [category, ids] of this.indexByCategory) {
      stats.byCategory[category] = ids.length;
    }
    
    return stats;
  }
}

// Export singleton instance
export const formulaRegistry = new FormulaRegistry();
