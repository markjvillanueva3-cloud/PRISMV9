/**
 * PRISM MCP Server - Formula Registry
 * Complete access to 109 formulas across 20 domains
 * Physics, Manufacturing, AI/ML, Optimization
 */

import * as fs from "fs/promises";
import * as path from "path";
import { BaseRegistry } from "./base.js";
import { PATHS, FORMULA_DOMAINS, DATA_LAYERS } from "../constants.js";
import { log } from "../utils/Logger.js";
import { fileExists, readJsonFile, writeJsonFile, listDirectory } from "../utils/files.js";
import { safeFormulaEval } from "../utils/safeMathEval.js";
import { HYPERMILL_FORMULAS } from "../data/hypermill-formula-registry.js";

// ============================================================================
// FORMULA TYPES
// ============================================================================

/** Formula Parameter configuration/data structure.
 */
export interface FormulaParameter {
  name: string;
  symbol: string;
  unit: string;
  description: string;
  type: "input" | "output" | "constant";
  range?: { min: number; max: number };
  default?: number;
}

/** Formula Validation configuration/data structure.
 */
export interface FormulaValidation {
  required_inputs: string[];
  output_range?: { min: number; max: number };
  constraints?: string[];
  safety_checks?: string[];
}

/** Formula configuration/data structure.
 */
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
// SOURCE FILE CATALOG (P-MS2: 12 extracted formula modules, 2,112 lines)
// ============================================================================

/** F O R M U L A_ S O U R C E_ F I L E_ C A T A L O G constant.
 */
export const FORMULA_SOURCE_FILE_CATALOG: Record<string, {
  filename: string;
  category: string;
  lines: number;
  safety_class: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  description: string;
  formulas_provided: string[];
  consumers: string[];
}> = {
  "PRISM_FORCE_LOOKUP": {
    filename: "PRISM_FORCE_LOOKUP.js",
    category: "physics",
    lines: 51,
    safety_class: "CRITICAL",
    description: "Cutting force coefficient lookup tables (kc1.1, mc) by material",
    formulas_provided: ["F-KIENZLE-001"],
    consumers: ["ManufacturingCalculations", "FormulaRegistry"]
  },
  "PRISM_MATERIAL_PHYSICS": {
    filename: "PRISM_MATERIAL_PHYSICS.js",
    category: "physics",
    lines: 54,
    safety_class: "HIGH",
    description: "Material-specific physics properties and deformation models",
    formulas_provided: ["F-CHIPTHK-001", "F-DEFLECT-001"],
    consumers: ["ManufacturingCalculations", "FormulaRegistry"]
  },
  "PRISM_MFG_PHYSICS": {
    filename: "PRISM_MFG_PHYSICS.js",
    category: "physics",
    lines: 197,
    safety_class: "CRITICAL",
    description: "Comprehensive manufacturing physics: force, power, deflection, chatter",
    formulas_provided: ["F-KIENZLE-001", "F-POWER-001", "F-DEFLECT-001", "F-CHATTER-001", "F-MRR-001"],
    consumers: ["ManufacturingCalculations", "FormulaRegistry", "OptimizationEngine"]
  },
  "PRISM_STANDALONE_CALCULATOR_API": {
    filename: "PRISM_STANDALONE_CALCULATOR_API.js",
    category: "calculator",
    lines: 304,
    safety_class: "MEDIUM",
    description: "Self-contained calculator API: RPM, feed rate, speed, chip load, torque, thread",
    formulas_provided: ["F-CALC-001", "F-CALC-002", "F-CALC-003", "F-CALC-004", "F-CALC-005", "F-CALC-006", "F-CALC-007", "F-CALC-008", "F-CALC-009"],
    consumers: ["ManufacturingCalculations", "FormulaRegistry"]
  },
  "PRISM_STRESS": {
    filename: "PRISM_STRESS.js",
    category: "physics",
    lines: 138,
    safety_class: "HIGH",
    description: "Stress analysis: Von Mises, principal stresses, safety factors",
    formulas_provided: [],
    consumers: ["ManufacturingCalculations", "ComplianceEngine"]
  },
  "PRISM_STRESS_ANALYSIS": {
    filename: "PRISM_STRESS_ANALYSIS.js",
    category: "physics",
    lines: 254,
    safety_class: "HIGH",
    description: "Advanced stress analysis: FEA integration, fatigue, creep models",
    formulas_provided: [],
    consumers: ["ManufacturingCalculations", "ComplianceEngine"]
  },
  "PRISM_THERMAL_COMPENSATION": {
    filename: "PRISM_THERMAL_COMPENSATION.js",
    category: "thermal",
    lines: 205,
    safety_class: "MEDIUM",
    description: "Thermal compensation: machine growth, tool expansion, workpiece deformation",
    formulas_provided: [],
    consumers: ["ManufacturingCalculations", "ToleranceEngine"]
  },
  "PRISM_THERMAL_LOOKUP": {
    filename: "PRISM_THERMAL_LOOKUP.js",
    category: "thermal",
    lines: 41,
    safety_class: "MEDIUM",
    description: "Thermal property lookup tables by material",
    formulas_provided: [],
    consumers: ["ManufacturingCalculations", "FormulaRegistry"]
  },
  "PRISM_THERMAL_PROPERTIES": {
    filename: "PRISM_THERMAL_PROPERTIES.js",
    category: "thermal",
    lines: 112,
    safety_class: "MEDIUM",
    description: "Material thermal properties: conductivity, specific heat, expansion coefficients",
    formulas_provided: [],
    consumers: ["ManufacturingCalculations", "FormulaRegistry"]
  },
  "PRISM_TOOL_LIFE_ESTIMATOR": {
    filename: "PRISM_TOOL_LIFE_ESTIMATOR.js",
    category: "tool_life",
    lines: 133,
    safety_class: "HIGH",
    description: "Tool life prediction: Taylor model, extended Taylor, multi-variable models",
    formulas_provided: ["F-TAYLOR-001"],
    consumers: ["ManufacturingCalculations", "FormulaRegistry", "OptimizationEngine"]
  },
  "PRISM_TOOL_WEAR_MODELS": {
    filename: "PRISM_TOOL_WEAR_MODELS.js",
    category: "tool_life",
    lines: 552,
    safety_class: "HIGH",
    description: "Advanced tool wear: Usui, diffusion, adhesive, abrasive, crater wear models",
    formulas_provided: [],
    consumers: ["ManufacturingCalculations", "FormulaRegistry"]
  },
  "PRISM_WEAR_LOOKUP": {
    filename: "PRISM_WEAR_LOOKUP.js",
    category: "tool_life",
    lines: 71,
    safety_class: "MEDIUM",
    description: "Tool wear rate lookup tables by material-tool combination",
    formulas_provided: [],
    consumers: ["ManufacturingCalculations", "FormulaRegistry"]
  }
};

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
    equation: "F_c = k_{c1.1} \\cdot h^{1-m_c} \\cdot b",
    equation_plain: "Fc = kc1.1 * h^(1-mc) * b",
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
      { inputs: { kc1_1: 1800, mc: 0.25, h: 0.1, b: 4.0 }, output: 1280, description: "Milling AISI 1045 steel" }
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
  },
  // ── SCIMATH-MS0: Linear Algebra Formulas ──────────────────────────────
  {
    formula_id: "F-SVD-001",
    name: "Singular Value Decomposition",
    domain: "numerical",
    category: "linear_algebra",
    equation: "A = U \\Sigma V^T",
    equation_plain: "A = U * diag(sigma) * V^T",
    parameters: [
      { name: "A", symbol: "A", unit: "matrix", description: "Input matrix (m × n)", type: "input" },
      { name: "U", symbol: "U", unit: "matrix", description: "Left singular vectors (m × k)", type: "output" },
      { name: "sigma", symbol: "\\Sigma", unit: "-", description: "Singular values (descending)", type: "output" },
      { name: "V", symbol: "V", unit: "matrix", description: "Right singular vectors (n × k)", type: "output" }
    ],
    validation: { required_inputs: ["A"] },
    description: "Decomposes any m×n matrix into orthogonal factors. Foundation for PCA, least-squares, pseudo-inverse, low-rank approximation, and condition number estimation.",
    references: ["Golub & Van Loan, 'Matrix Computations' 4th ed., Chapter 8", "Demmel & Veselic (1992), Jacobi SVD"],
    consumers: ["svd_decompose", "PrincipalComponentEngine", "SystemIdentificationEngine", "RandomMatrixEngine"]
  },
  {
    formula_id: "F-QR-001",
    name: "QR Factorization",
    domain: "numerical",
    category: "linear_algebra",
    equation: "A = QR",
    equation_plain: "A = Q * R (Q orthogonal, R upper triangular)",
    parameters: [
      { name: "A", symbol: "A", unit: "matrix", description: "Input matrix (m × n)", type: "input" },
      { name: "Q", symbol: "Q", unit: "matrix", description: "Orthogonal matrix (m × m or m × n thin)", type: "output" },
      { name: "R", symbol: "R", unit: "matrix", description: "Upper triangular (m × n or n × n thin)", type: "output" }
    ],
    validation: { required_inputs: ["A"] },
    description: "Householder/Givens QR for least-squares, eigenvalue computation, and rank-revealing decomposition. Used for Kienzle/Taylor coefficient regression.",
    references: ["Golub & Van Loan, 'Matrix Computations' 4th ed., Chapter 5"],
    consumers: ["qr_factorize", "RobustRegressionEngine", "EigensolverEngine"]
  },
  {
    formula_id: "F-CHOL-001",
    name: "Cholesky Factorization",
    domain: "numerical",
    category: "linear_algebra",
    equation: "A = LL^T",
    equation_plain: "A = L * L^T (L lower triangular, A must be SPD)",
    parameters: [
      { name: "A", symbol: "A", unit: "matrix", description: "Symmetric positive-definite matrix", type: "input" },
      { name: "L", symbol: "L", unit: "matrix", description: "Lower triangular Cholesky factor", type: "output" }
    ],
    validation: { required_inputs: ["A"], constraints: ["A must be symmetric positive-definite"] },
    description: "Half the cost of LU for SPD systems. Used for Bayesian posterior covariance, Kalman filter, FEM stiffness solves, and multivariate normal sampling.",
    references: ["Golub & Van Loan, 'Matrix Computations' 4th ed., Chapter 4"],
    consumers: ["cholesky_factor", "FiniteElementEngine", "IterativeSolverEngine"]
  },
  {
    formula_id: "F-EIGEN-001",
    name: "Eigenvalue Problem",
    domain: "numerical",
    category: "linear_algebra",
    equation: "Ax = \\lambda x",
    equation_plain: "A * x = lambda * x",
    parameters: [
      { name: "A", symbol: "A", unit: "matrix", description: "Square matrix", type: "input" },
      { name: "lambda", symbol: "\\lambda", unit: "-", description: "Eigenvalue", type: "output" },
      { name: "x", symbol: "x", unit: "vector", description: "Eigenvector", type: "output" }
    ],
    validation: { required_inputs: ["A"], constraints: ["A must be square"] },
    description: "Eigenvalue decomposition via QR algorithm, power iteration, or Lanczos. Used for modal analysis, PCA, chatter stability (SLD), and random matrix signal detection.",
    references: ["Parlett, 'The Symmetric Eigenvalue Problem' (1998)", "Golub & Van Loan, Chapter 7-8"],
    consumers: ["eigen_solve", "ChatterStabilityLobeEngine", "FiniteElementEngine", "PrincipalComponentEngine"]
  },
  {
    formula_id: "F-CG-001",
    name: "Conjugate Gradient Method",
    domain: "numerical",
    category: "iterative_solvers",
    equation: "x_{k+1} = x_k + \\alpha_k p_k",
    equation_plain: "x[k+1] = x[k] + alpha[k] * p[k] (minimize ||b - Ax||)",
    parameters: [
      { name: "A", symbol: "A", unit: "matrix", description: "SPD coefficient matrix", type: "input" },
      { name: "b", symbol: "b", unit: "vector", description: "Right-hand side", type: "input" },
      { name: "x", symbol: "x", unit: "vector", description: "Solution vector", type: "output" },
      { name: "tol", symbol: "\\epsilon", unit: "-", description: "Convergence tolerance", type: "input", default: 1e-10 }
    ],
    validation: { required_inputs: ["A", "b"], constraints: ["A must be SPD"] },
    description: "Krylov subspace method for large SPD systems. Converges in at most n iterations. Used with preconditioning for FEM, sparse solves, and thermal equilibrium.",
    references: ["Hestenes & Stiefel (1952)", "Saad, 'Iterative Methods for Sparse Linear Systems' 2nd ed."],
    consumers: ["iterative_solve", "FiniteElementEngine", "sparse_solve"]
  },
  {
    formula_id: "F-KPCA-001",
    name: "Kernel PCA",
    domain: "numerical",
    category: "dimensionality_reduction",
    equation: "K_c \\alpha = \\lambda \\alpha",
    equation_plain: "Centered_Kernel * alpha = lambda * alpha",
    parameters: [
      { name: "K", symbol: "K", unit: "matrix", description: "Kernel matrix K(x_i, x_j)", type: "input" },
      { name: "gamma", symbol: "\\gamma", unit: "-", description: "RBF kernel width: exp(-gamma * ||x-y||²)", type: "input" },
      { name: "alpha", symbol: "\\alpha", unit: "matrix", description: "Eigenvector coefficients", type: "output" },
      { name: "lambda", symbol: "\\lambda", unit: "-", description: "Eigenvalues", type: "output" }
    ],
    validation: { required_inputs: ["K"] },
    description: "Nonlinear PCA via kernel trick. Maps data to high-dimensional feature space for nonlinear process monitoring and anomaly detection.",
    references: ["Schölkopf, Smola, Müller (1998) 'Nonlinear Component Analysis as a Kernel Eigenvalue Problem'"],
    consumers: ["PrincipalComponentEngine.kernelPCA"]
  },
  {
    formula_id: "F-RPCA-001",
    name: "Robust PCA (Principal Component Pursuit)",
    domain: "numerical",
    category: "dimensionality_reduction",
    equation: "\\min ||L||_* + \\lambda ||S||_1 \\quad \\text{s.t.} \\quad L + S = X",
    equation_plain: "min nuclear_norm(L) + lambda * L1_norm(S) subject to L + S = X",
    parameters: [
      { name: "X", symbol: "X", unit: "matrix", description: "Data matrix with outliers", type: "input" },
      { name: "lambda", symbol: "\\lambda", unit: "-", description: "Sparsity trade-off: 1/sqrt(max(n,p))", type: "input" },
      { name: "L", symbol: "L", unit: "matrix", description: "Low-rank component", type: "output" },
      { name: "S", symbol: "S", unit: "matrix", description: "Sparse outlier component", type: "output" }
    ],
    validation: { required_inputs: ["X"] },
    description: "Separates data into low-rank structure + sparse outliers via ADMM. Used for sensor data cleaning, outlier detection in manufacturing process monitoring.",
    references: ["Candès, Li, Ma, Wright (2011) 'Robust Principal Component Analysis?'"],
    consumers: ["PrincipalComponentEngine.robustPCA"]
  },

  // ── F-MS509: 10 additional manufacturing physics formulas (499→509) ──────

  // F-TORQUE-001: Spindle Torque
  {
    formula_id: "F-TORQUE-001",
    name: "Spindle Torque",
    domain: "physics",
    category: "power",
    equation: "T = \\frac{F_c \\cdot D}{2000}",
    equation_plain: "T = (Fc * D) / 2000",
    parameters: [
      { name: "Fc", symbol: "F_c", unit: "N", description: "Cutting force", type: "input", range: { min: 0, max: 50000 } },
      { name: "D", symbol: "D", unit: "mm", description: "Tool diameter", type: "input", range: { min: 1, max: 200 } },
      { name: "T", symbol: "T", unit: "Nm", description: "Spindle torque", type: "output" }
    ],
    validation: {
      required_inputs: ["Fc", "D"],
      safety_checks: ["Torque must not exceed spindle rating"]
    },
    description: "Calculates spindle torque from cutting force and tool diameter. Essential for spindle load monitoring and machine selection.",
    theory: "Torque = Force × radius. The factor 2000 converts mm to m and applies the lever arm (D/2).",
    references: ["Altintas, Y. (2012). Manufacturing Automation, 2nd ed., Cambridge University Press, Ch. 2"],
    consumers: ["spindle_load", "machine_selection", "torque_limit_check"]
  },

  // F-RPM-001: RPM from Cutting Speed
  {
    formula_id: "F-RPM-001",
    name: "Spindle RPM from Cutting Speed",
    domain: "manufacturing",
    category: "speed_feed",
    equation: "N = \\frac{1000 \\cdot V_c}{\\pi \\cdot D}",
    equation_plain: "N = (1000 * Vc) / (pi * D)",
    parameters: [
      { name: "Vc", symbol: "V_c", unit: "m/min", description: "Cutting speed", type: "input", range: { min: 1, max: 2000 } },
      { name: "D", symbol: "D", unit: "mm", description: "Tool or workpiece diameter", type: "input", range: { min: 0.1, max: 1000 } },
      { name: "N", symbol: "N", unit: "rpm", description: "Spindle rotational speed", type: "output" }
    ],
    validation: {
      required_inputs: ["Vc", "D"],
      output_range: { min: 1, max: 100000 },
      safety_checks: ["RPM must not exceed spindle max speed"]
    },
    description: "Converts linear cutting speed to rotational spindle speed. Fundamental for CNC programming.",
    theory: "Derived from circumference relationship: V = π × D × N / 1000 (mm→m conversion).",
    references: ["Kalpakjian & Schmid (2014). Manufacturing Engineering and Technology, 7th ed., Pearson, Ch. 21"],
    consumers: ["speed_feed", "cnc_programming", "rpm_calc"]
  },

  // F-THERMAL-001: Cutting Temperature (Shaw model)
  {
    formula_id: "F-THERMAL-001",
    name: "Shaw Cutting Temperature Model",
    domain: "physics",
    category: "thermal",
    equation: "T = T_0 + \\frac{0.754 \\cdot U}{\\rho \\cdot c_p} \\cdot \\left( \\frac{V_c \\cdot h}{k} \\right)^{0.5}",
    equation_plain: "T = T0 + (0.754 * U) / (rho * cp) * sqrt((Vc * h) / k)",
    parameters: [
      { name: "T0", symbol: "T_0", unit: "°C", description: "Ambient temperature", type: "input", default: 20 },
      { name: "U", symbol: "U", unit: "J/mm³", description: "Specific cutting energy", type: "input" },
      { name: "rho", symbol: "\\rho", unit: "kg/m³", description: "Material density", type: "input" },
      { name: "cp", symbol: "c_p", unit: "J/(kg·K)", description: "Specific heat capacity", type: "input" },
      { name: "Vc", symbol: "V_c", unit: "m/min", description: "Cutting speed", type: "input" },
      { name: "h", symbol: "h", unit: "mm", description: "Uncut chip thickness", type: "input" },
      { name: "k", symbol: "k", unit: "W/(m·K)", description: "Thermal conductivity", type: "input" },
      { name: "T", symbol: "T", unit: "°C", description: "Cutting zone temperature", type: "output" }
    ],
    validation: {
      required_inputs: ["U", "rho", "cp", "Vc", "h", "k"],
      safety_checks: ["T must not exceed white layer threshold for material"]
    },
    description: "Estimates cutting zone temperature using Shaw's thermal model. Critical for tool life and surface integrity.",
    theory: "Based on heat partition between chip, tool, and workpiece. 0.754 is empirical coefficient from Shaw (2005).",
    references: ["Shaw, M.C. (2005). Metal Cutting Principles, 2nd ed., Oxford University Press, Ch. 12"],
    consumers: ["thermal_analysis", "tool_life", "white_layer_check", "surface_integrity"]
  },

  // F-WEIBULL-001: Weibull Tool Life Distribution
  {
    formula_id: "F-WEIBULL-001",
    name: "Weibull Tool Life Reliability",
    domain: "statistics",
    category: "tool_life",
    equation: "R(t) = \\exp\\left( -\\left( \\frac{t}{\\eta} \\right)^\\beta \\right)",
    equation_plain: "R(t) = exp(-((t / eta) ^ beta))",
    parameters: [
      { name: "t", symbol: "t", unit: "min", description: "Time or number of parts", type: "input", range: { min: 0, max: 10000 } },
      { name: "eta", symbol: "\\eta", unit: "min", description: "Scale parameter (characteristic life)", type: "input" },
      { name: "beta", symbol: "\\beta", unit: "-", description: "Shape parameter (failure mode)", type: "input", range: { min: 0.5, max: 5 } },
      { name: "R", symbol: "R(t)", unit: "-", description: "Reliability (survival probability)", type: "output", range: { min: 0, max: 1 } }
    ],
    validation: {
      required_inputs: ["t", "eta", "beta"],
      output_range: { min: 0, max: 1 },
      constraints: ["eta > 0", "beta > 0"]
    },
    description: "Models tool life reliability using Weibull distribution. Beta < 1 = infant mortality, beta = 1 = random, beta > 1 = wear-out.",
    theory: "Standard reliability model for fatigue and wear failure. Shape parameter indicates failure mechanism.",
    references: ["Weibull, W. (1951). A Statistical Distribution Function of Wide Applicability, J. Applied Mechanics"],
    consumers: ["tool_life_prediction", "reliability_analysis", "replacement_scheduling"]
  },

  // F-EDM-MRR-001: EDM Material Removal Rate (Kunieda model)
  {
    formula_id: "F-EDM-MRR-001",
    name: "EDM Material Removal Rate (Kunieda)",
    domain: "manufacturing",
    category: "edm",
    equation: "MRR = \\frac{\\eta \\cdot E \\cdot f}{\\rho \\cdot (c_p \\cdot \\Delta T + L_m)}",
    equation_plain: "MRR = (eta * E * f) / (rho * (cp * dT + Lm))",
    parameters: [
      { name: "eta", symbol: "\\eta", unit: "-", description: "Process efficiency (0.3-0.5)", type: "input", range: { min: 0.2, max: 0.6 } },
      { name: "E", symbol: "E", unit: "mJ", description: "Pulse energy", type: "input" },
      { name: "f", symbol: "f", unit: "Hz", description: "Pulse frequency", type: "input" },
      { name: "rho", symbol: "\\rho", unit: "kg/m³", description: "Workpiece density", type: "input" },
      { name: "cp", symbol: "c_p", unit: "J/(kg·K)", description: "Specific heat capacity", type: "input" },
      { name: "dT", symbol: "\\Delta T", unit: "K", description: "Temperature rise to melting", type: "input" },
      { name: "Lm", symbol: "L_m", unit: "J/kg", description: "Latent heat of melting", type: "input" },
      { name: "MRR", symbol: "MRR", unit: "mm³/min", description: "Material removal rate", type: "output" }
    ],
    validation: {
      required_inputs: ["eta", "E", "f", "rho", "cp", "dT", "Lm"],
      output_range: { min: 0, max: 1000 }
    },
    description: "Thermal energy balance model for EDM material removal. Accounts for efficiency losses and material thermal properties.",
    theory: "Based on thermal energy required to melt and eject material. Efficiency accounts for plasma losses.",
    references: ["Kunieda, M. et al. (2005). Advancing EDM through Fundamental Insight into the Process, CIRP Annals"],
    consumers: ["edm_parameter", "wedm_pipeline", "edm_cycle_time"]
  },

  // F-EDM-RA-001: EDM Surface Roughness (Klocke model)
  {
    formula_id: "F-EDM-RA-001",
    name: "EDM Surface Roughness (Klocke)",
    domain: "manufacturing",
    category: "edm",
    equation: "R_a = k_{ra} \\cdot I_p^\\alpha \\cdot t_{on}^\\beta",
    equation_plain: "Ra = k_ra * (Ip ^ alpha) * (t_on ^ beta)",
    parameters: [
      { name: "k_ra", symbol: "k_{ra}", unit: "µm/(A^α·µs^β)", description: "Material-specific coefficient", type: "input", range: { min: 0.2, max: 0.6 } },
      { name: "Ip", symbol: "I_p", unit: "A", description: "Peak discharge current", type: "input", range: { min: 1, max: 100 } },
      { name: "alpha", symbol: "\\alpha", unit: "-", description: "Current exponent (0.35-0.50)", type: "input", default: 0.40 },
      { name: "t_on", symbol: "t_{on}", unit: "µs", description: "Pulse-on time", type: "input", range: { min: 0.5, max: 500 } },
      { name: "beta", symbol: "\\beta", unit: "-", description: "Time exponent (0.24-0.32)", type: "input", default: 0.28 },
      { name: "Ra", symbol: "R_a", unit: "µm", description: "Surface roughness", type: "output" }
    ],
    validation: {
      required_inputs: ["k_ra", "Ip", "t_on"],
      output_range: { min: 0.1, max: 50 }
    },
    description: "Empirical model for EDM surface roughness based on discharge parameters. Higher current and longer pulses increase roughness.",
    theory: "Crater depth correlates with pulse energy. Model validated against steel, aluminum, and carbide.",
    references: ["Klocke, F. (2013). Manufacturing Processes 4, Springer, Table 8.3"],
    consumers: ["edm_quality", "wedm_pipeline", "edm_parameter"]
  },

  // F-WHITELAYER-001: White Layer Temperature Threshold
  {
    formula_id: "F-WHITELAYER-001",
    name: "White Layer Formation Check",
    domain: "physics",
    category: "surface_integrity",
    equation: "\\text{WhiteLayer} = \\begin{cases} 1 & T_{cut} > T_{threshold} \\\\ 0 & \\text{otherwise} \\end{cases}",
    equation_plain: "WhiteLayer = (T_cut > T_threshold) ? 1 : 0",
    parameters: [
      { name: "T_cut", symbol: "T_{cut}", unit: "°C", description: "Cutting zone temperature", type: "input" },
      { name: "T_threshold", symbol: "T_{threshold}", unit: "°C", description: "Material-specific threshold (700°C steel, 800°C Inconel)", type: "input" },
      { name: "WhiteLayer", symbol: "WL", unit: "-", description: "White layer risk flag (0 or 1)", type: "output" }
    ],
    validation: {
      required_inputs: ["T_cut", "T_threshold"],
      safety_checks: ["HARD BLOCK if WhiteLayer = 1 — surface integrity defect"]
    },
    description: "Boolean check for white layer formation risk. White layer is untempered martensite that causes subsurface cracks and 20-60% fatigue life reduction.",
    theory: "White layer forms when cutting zone exceeds austenitizing temperature. Thresholds: steel=700°C, hardened=720°C, Inconel=800°C, Ti=750°C.",
    references: ["Brinksmeier et al. (1999). Residual Stresses - Measurement and Causes in Machining Processes, CIRP Annals 48/2"],
    consumers: ["surface_integrity", "thermal_check", "safety_gate"]
  },

  // F-MOMENT-001: Second Moment of Area (circular section)
  {
    formula_id: "F-MOMENT-001",
    name: "Second Moment of Area (Circular)",
    domain: "physics",
    category: "mechanics",
    equation: "I = \\frac{\\pi \\cdot d^4}{64}",
    equation_plain: "I = (pi * d^4) / 64",
    parameters: [
      { name: "d", symbol: "d", unit: "mm", description: "Shaft/tool diameter", type: "input", range: { min: 0.1, max: 200 } },
      { name: "I", symbol: "I", unit: "mm⁴", description: "Second moment of area", type: "output" }
    ],
    validation: {
      required_inputs: ["d"],
      constraints: ["d > 0"]
    },
    description: "Calculates second moment of area for circular cross-section. Used in beam deflection and torsion calculations for tool stickout analysis.",
    theory: "Derived from integral of y² over cross-section area. Fundamental for Euler-Bernoulli beam theory.",
    references: ["Gere & Goodno (2012). Mechanics of Materials, 8th ed., Cengage, Ch. 12"],
    consumers: ["deflection_calc", "tool_stiffness", "torsion_analysis"]
  },

  // F-THERMAL-EXPAND-001: Linear Thermal Expansion
  {
    formula_id: "F-THERMAL-EXPAND-001",
    name: "Linear Thermal Expansion",
    domain: "physics",
    category: "thermal",
    equation: "\\Delta L = L_0 \\cdot \\alpha \\cdot \\Delta T",
    equation_plain: "dL = L0 * alpha * dT",
    parameters: [
      { name: "L0", symbol: "L_0", unit: "mm", description: "Original length", type: "input" },
      { name: "alpha", symbol: "\\alpha", unit: "1/°C", description: "Coefficient of thermal expansion", type: "input" },
      { name: "dT", symbol: "\\Delta T", unit: "°C", description: "Temperature change", type: "input" },
      { name: "dL", symbol: "\\Delta L", unit: "mm", description: "Length change", type: "output" }
    ],
    validation: {
      required_inputs: ["L0", "alpha", "dT"]
    },
    description: "Calculates dimensional change due to temperature variation. Critical for precision machining and tolerance analysis.",
    theory: "Linear approximation valid for small temperature changes. Steel α ≈ 12×10⁻⁶/°C, aluminum α ≈ 23×10⁻⁶/°C.",
    references: ["Callister & Rethwisch (2018). Materials Science and Engineering, 10th ed., Wiley, Ch. 19"],
    consumers: ["thermal_compensation", "tolerance_analysis", "metrology"]
  },

  // F-SPECIFIC-ENERGY-001: Specific Cutting Energy
  {
    formula_id: "F-SPECIFIC-ENERGY-001",
    name: "Specific Cutting Energy",
    domain: "physics",
    category: "cutting_force",
    equation: "U = \\frac{P_c}{MRR} = \\frac{F_c \\cdot V_c}{a_p \\cdot a_e \\cdot v_f}",
    equation_plain: "U = (Fc * Vc) / (ap * ae * vf)",
    parameters: [
      { name: "Fc", symbol: "F_c", unit: "N", description: "Cutting force", type: "input" },
      { name: "Vc", symbol: "V_c", unit: "m/min", description: "Cutting speed", type: "input" },
      { name: "ap", symbol: "a_p", unit: "mm", description: "Axial depth of cut", type: "input" },
      { name: "ae", symbol: "a_e", unit: "mm", description: "Radial width of cut", type: "input" },
      { name: "vf", symbol: "v_f", unit: "mm/min", description: "Feed rate", type: "input" },
      { name: "U", symbol: "U", unit: "J/mm³", description: "Specific cutting energy", type: "output" }
    ],
    validation: {
      required_inputs: ["Fc", "Vc", "ap", "ae", "vf"],
      output_range: { min: 0.1, max: 100 }
    },
    description: "Energy required to remove unit volume of material. Key metric for process efficiency and thermal analysis.",
    theory: "Ratio of cutting power to material removal rate. Higher U indicates harder material or inefficient cutting.",
    references: ["Groover, M.P. (2020). Fundamentals of Modern Manufacturing, 7th ed., Wiley, Ch. 21"],
    consumers: ["energy_efficiency", "thermal_analysis", "process_optimization"]
  },

  // ── HM-REV-MS10: 20 hyperMILL formulas (F-HM-001 to F-HM-020) ────────────
  ...HYPERMILL_FORMULAS,
];

// ============================================================================
// FORMULA REGISTRY CLASS
// ============================================================================

/** Formula Registry engine/manager.
 */
export class FormulaRegistry extends BaseRegistry<Formula> {
  private indexByDomain: Map<string, string[]> = new Map();
  private indexByCategory: Map<string, string[]> = new Map();
  private indexByConsumer: Map<string, string[]> = new Map();
  private _sourceFileCatalogSize = 0;

  get sourceFileCatalogSize(): number { return this._sourceFileCatalogSize; }
  
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
    /** For.
     * @param const - const
     * @returns void
     */
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

    // P-MS2: Catalog extracted formula source files
    await this.catalogExtractedFiles();

    // Build indexes
    this.buildIndexes();

    this.loaded = true;
    log.info(`FormulaRegistry loaded: ${this.entries.size} formulas across ${this.indexByDomain.size} domains, ${this.sourceFileCatalogSize} source files cataloged`);
  }

  /**
   * Load formulas from main FORMULA_REGISTRY.json (490 formulas)
   */
  private async loadFromRegistryFile(): Promise<void> {
    const registryPaths = [
      path.join(PATHS.PRISM_ROOT, "registries", "FORMULA_REGISTRY.json"),
      path.join(PATHS.DATA_DIR, "FORMULA_REGISTRY.json")
    ];
    
    /** For.
     * @param const - const
     * @returns void
     */
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
        /** If.
         * @param rawFormulas - raw formulas
         * @returns void
         */
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
        
        /** For.
         * @param const - const
         * @returns void
         */
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
      
      /** For.
       * @param const - const
       * @returns void
       */
      for (const file of files) {
        if (file.name.endsWith(".json")) {
          const filePath = file.path;
          const data = await readJsonFile<Formula | Formula[]>(filePath);
          const formulas = Array.isArray(data) ? data : [data];
          
          /** For.
           * @param const - const
           * @returns void
           */
          for (const formula of formulas) {
            if (formula.formula_id && !this.has(formula.formula_id)) {
              this.entries.set(formula.formula_id, {
                id: formula.formula_id,
                data: formula,
                metadata: {
                  created: new Date().toISOString(),
                  updated: new Date().toISOString(),
                  version: 1,
                  source: file.name
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
   * P-MS2: Catalog extracted formula source files
   * Scans PATHS.FORMULAS directory and verifies against SOURCE_FILE_CATALOG
   */
  private async catalogExtractedFiles(): Promise<void> {
    const formulasDir = PATHS.FORMULAS;

    try {
      if (!await fileExists(formulasDir)) {
        log.debug(`Formula source directory not found: ${formulasDir}`);
        return;
      }

      const files = await listDirectory(formulasDir);
      let cataloged = 0;

      /** For.
       * @param const - const
       * @returns void
       */
      for (const file of files) {
        if (!file.name.endsWith(".js")) continue;

        const moduleName = file.name.replace(".js", "");
        const catalogEntry = FORMULA_SOURCE_FILE_CATALOG[moduleName];

        /** If.
         * @param catalogEntry - catalog entry
         * @returns void
         */
        if (catalogEntry) {
          cataloged++;
          log.debug(`Formula source cataloged: ${moduleName} (${catalogEntry.category}, ${catalogEntry.lines} lines, ${catalogEntry.safety_class})`);
        } else {
          log.warn(`Formula source file not in catalog: ${file.name}`);
        }
      }

      this._sourceFileCatalogSize = cataloged;
      log.info(`Cataloged ${cataloged}/${Object.keys(FORMULA_SOURCE_FILE_CATALOG).length} formula source files from ${formulasDir}`);
    } catch (error) {
      log.warn(`Failed to catalog extracted formula files: ${error}`);
    }
  }

  /**
   * Get source file catalog
   */
  getSourceFileCatalog(): typeof FORMULA_SOURCE_FILE_CATALOG {
    return FORMULA_SOURCE_FILE_CATALOG;
  }

  /**
   * Get source files by category
   */
  getSourceFilesByCategory(category: string): string[] {
    return Object.entries(FORMULA_SOURCE_FILE_CATALOG)
      .filter(([_, entry]) => entry.category === category)
      .map(([name]) => name);
  }

  /**
   * Get source files by safety class
   */
  getSourceFilesBySafety(safetyClass: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"): string[] {
    return Object.entries(FORMULA_SOURCE_FILE_CATALOG)
      .filter(([_, entry]) => entry.safety_class === safetyClass)
      .map(([name]) => name);
  }

  /**
   * Build search indexes
   */
  private buildIndexes(): void {
    this.indexByDomain.clear();
    this.indexByCategory.clear();
    this.indexByConsumer.clear();
    
    /** For.
     * @param const - const
     * @param entry] - entry]
     * @returns void
     */
    for (const [id, entry] of this.entries) {
      const formula = entry.data;
      
      // Index by domain
      /** If.
       * @param formula.domain - formula.domain
       * @returns void
       */
      if (formula.domain) {
        if (!this.indexByDomain.has(formula.domain)) {
          this.indexByDomain.set(formula.domain, []);
        }
        this.indexByDomain.get(formula.domain)!.push(id);
      }
      
      // Index by category
      /** If.
       * @param formula.category - formula.category
       * @returns void
       */
      if (formula.category) {
        if (!this.indexByCategory.has(formula.category)) {
          this.indexByCategory.set(formula.category, []);
        }
        this.indexByCategory.get(formula.category)!.push(id);
      }
      
      // Index by consumer
      /** If.
       * @param formula.consumers - formula.consumers
       * @returns void
       */
      if (formula.consumers) {
        /** For.
         * @param const - const
         * @returns void
         */
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
    
    /** If.
     * @param options?.domain - options?.domain
     * @returns void
     */
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
    /** If.
     * @param !formula - !formula
     * @returns void
     */
    if (!formula) {
      throw new Error(`Formula ${formulaId} not found`);
    }
    
    const validation = { valid: true, errors: [] as string[], warnings: [] as string[] };
    
    // Check required inputs
    /** For.
     * @param const - const
     * @returns void
     */
    for (const required of formula.validation.required_inputs) {
      /** If.
       * @param inputs[required] - inputs[required]
       * @returns void
       */
      if (inputs[required] === undefined) {
        validation.valid = false;
        validation.errors.push(`Missing required input: ${required}`);
      }
    }
    
    // Check input ranges
    /** For.
     * @param const - const
     * @returns void
     */
    for (const param of formula.parameters) {
      /** If.
       * @param param.type - param.type
       * @returns void
       */
      if (param.type === "input" && inputs[param.name] !== undefined) {
        const value = inputs[param.name];
        /** If.
         * @param param.range - param.range
         * @returns void
         */
        if (param.range) {
          /** If.
           * @param value - value to set
           * @returns void
           */
          if (value < param.range.min) {
            validation.warnings.push(`${param.name} (${value}) below minimum (${param.range.min})`);
          }
          /** If.
           * @param value - value to set
           * @returns void
           */
          if (value > param.range.max) {
            validation.warnings.push(`${param.name} (${value}) above maximum (${param.range.max})`);
          }
        }
      }
    }
    
    /** If.
     * @param !validation.valid - !validation.valid
     * @returns void
     */
    if (!validation.valid) {
      return { result: NaN, formula, validation };
    }
    
    // Calculate result based on formula ID
    let result: number;
    
    /** Switch.
     * @param formulaId - formula id
     * @returns void
     */
    switch (formulaId) {
      case "F-KIENZLE-001":
        result = inputs.kc1_1 * Math.pow(inputs.h, 1 - inputs.mc) * inputs.b;
        break;
        
      case "F-TAYLOR-001":
        result = Math.pow(inputs.C / inputs.V, 1 / inputs.n);
        break;
        
      case "F-MRR-001":
        result = inputs.ap * inputs.ae * inputs.vf;
        break;
        
      case "F-POWER-001":
        const eta = (inputs.eta != null && inputs.eta > 0 && inputs.eta <= 1) ? inputs.eta : 0.85;
        result = (inputs.Fc * inputs.Vc) / (60000 * eta);
        break;
        
      case "F-SURFACE-001":
        result = inputs.r > 0 ? (inputs.f * inputs.f) / (32 * inputs.r) * 1000 : 0; // mm → µm
        break;
        
      case "F-CHIPTHK-001":
        result = inputs.D > 0 ? inputs.fz * Math.sqrt(inputs.ae / inputs.D) : 0;
        break;
        
      case "F-DEFLECT-001":
        const E = inputs.E || 620;
        result = (inputs.F * Math.pow(inputs.L, 3)) / (3 * E * 1000 * inputs.I);
        break;
        
      case "F-CHATTER-001":
        result = (inputs.Ks !== 0 && inputs.ReG !== 0) ? -1 / (2 * inputs.Ks * inputs.ReG) : 0;
        break;
        
      case "F-OMEGA-001":
        result = 0.25 * inputs.R + 0.20 * inputs.C + 0.15 * inputs.P + 0.30 * inputs.S + 0.10 * inputs.L;
        // Safety hard block check
        /** If.
         * @param inputs.S - inputs. s
         * @returns void
         */
        if (inputs.S < 0.70) {
          validation.errors.push("HARD BLOCK: S(x) < 0.70");
          validation.valid = false;
        }
        break;
        
      // === CALCULATOR FORMULAS (R1-MS8) ===
      case "F-CALC-001": result = (inputs.Vc * 1000) / (Math.PI * inputs.D); break;
      case "F-CALC-002": result = inputs.n_rpm * inputs.fz * inputs.z; break;
      case "F-CALC-003": result = (Math.PI * inputs.D * inputs.n_rpm) / 1000; break;
      case "F-CALC-004": { const sqArg = inputs.D * inputs.ae - inputs.ae * inputs.ae; const denom4 = 2 * Math.sqrt(Math.max(sqArg, 0)); result = denom4 > 1e-9 ? inputs.fz * inputs.D / denom4 : inputs.fz; break; }
      case "F-CALC-005": result = (inputs.P_kw * 30000) / (Math.PI * inputs.n_rpm); break;
      case "F-CALC-006": result = 25.4 / inputs.pitch_mm; break;
      case "F-CALC-007": result = inputs.D_major - inputs.pitch_mm; break;
      case "F-CALC-008": result = inputs.Vf > 0 ? inputs.L_mm / inputs.Vf : 0; break;
      case "F-CALC-009": result = (Math.PI * inputs.D_mm * inputs.n_rpm) / 1000; break;

      default: {
        // R1-MS8: formula_js fallback for registry formulas
        const formulaJs = (formula as any).formula_js;
        /** If.
         * @param formulaJs - formula js
         * @returns void
         */
        if (formulaJs && typeof formulaJs === "string") {
          try {
            const evalResult = safeFormulaEval(formulaJs, inputs as Record<string, number>);
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
    /** If.
     * @param formula.validation.output_range - formula.validation.output_range
     * @returns void
     */
    if (formula.validation.output_range) {
      /** If.
       * @param result - result
       * @returns void
       */
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
    sourceFiles: { total: number; cataloged: number; bySafety: Record<string, number> };
  }> {
    await this.load();

    const bySafety: Record<string, number> = {};
    for (const entry of Object.values(FORMULA_SOURCE_FILE_CATALOG)) {
      bySafety[entry.safety_class] = (bySafety[entry.safety_class] || 0) + 1;
    }

    const stats = {
      total: this.entries.size,
      byDomain: {} as Record<string, number>,
      byCategory: {} as Record<string, number>,
      consumerCount: this.indexByConsumer.size,
      sourceFiles: {
        total: Object.keys(FORMULA_SOURCE_FILE_CATALOG).length,
        cataloged: this._sourceFileCatalogSize,
        bySafety
      }
    };
    
    /** For.
     * @param const - const
     * @param ids] - ids]
     * @returns void
     */
    for (const [domain, ids] of this.indexByDomain) {
      stats.byDomain[domain] = ids.length;
    }
    
    /** For.
     * @param const - const
     * @param ids] - ids]
     * @returns void
     */
    for (const [category, ids] of this.indexByCategory) {
      stats.byCategory[category] = ids.length;
    }

    return stats;
  }

  // ============================================================================
  // MUTATION APIs (KAR-MS3 ENABLEMENT)
  // ============================================================================

  /**
   * Add formula to USER or LEARNED layer
   * @param formula - Formula to add
   * @param layer - Target layer (USER or LEARNED only)
   * @returns Formula ID
   */
  async addFormula(formula: Formula, layer: string = DATA_LAYERS.USER): Promise<string> {
    await this.load();

    const id = formula.formula_id || `F-${Date.now()}`;

    // Validate layer - only USER or LEARNED allowed for additions
    if (layer !== DATA_LAYERS.USER && layer !== DATA_LAYERS.LEARNED) {
      throw new Error(`Can only add formulas to USER or LEARNED layer, not ${layer}`);
    }

    // Check for duplicates
    if (this.has(id)) {
      throw new Error(`Formula ${id} already exists. Use enhanceFormula() to update.`);
    }

    // Set the ID
    formula.formula_id = id;

    // Add to registry
    this.set(id, formula, layer);

    // Incremental index update (avoids full rebuild)
    this.addToIndexes(id, formula);

    // Persist to layer file
    await this.persistToLayer(id, formula, layer);

    log.info(`Added formula ${id} to ${layer} layer`);
    return id;
  }

  /**
   * Enhance existing formula with new data
   * @param id - Formula ID to enhance
   * @param enhancements - Partial formula data to merge
   * @param source - Optional source identifier
   * @returns Enhanced formula
   */
  async enhanceFormula(
    id: string,
    enhancements: Partial<Formula>,
    source?: string
  ): Promise<Formula> {
    await this.load();

    const existing = this.get(id);
    if (!existing) {
      throw new Error(`Formula ${id} not found`);
    }

    // Deep merge enhancements
    const enhanced = this.deepMerge(existing, enhancements);

    // Update in registry
    this.set(id, enhanced, source || DATA_LAYERS.ENHANCED);

    // Rebuild indexes (enhancement may change domain/category/consumers)
    this.buildIndexes();

    // Persist to ENHANCED layer
    await this.persistToLayer(id, enhanced, DATA_LAYERS.ENHANCED);

    log.info(`Enhanced formula ${id}`);
    return enhanced;
  }

  /**
   * Deep merge objects (recursive)
   */
  private deepMerge(target: any, source: any): any {
    const result = { ...target };

    for (const key of Object.keys(source)) {
      if (source[key] !== null && typeof source[key] === "object" && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else if (source[key] !== undefined) {
        result[key] = source[key];
      }
    }

    return result;
  }

  /**
   * Persist formula to layer file
   */
  private async persistToLayer(id: string, formula: Formula, layer: string): Promise<void> {
    // Use FORMULAS path with layer subdirectory
    const layerPath = path.join(PATHS.FORMULAS, layer.toLowerCase());

    try {
      await fs.mkdir(layerPath, { recursive: true });

      const filePath = path.join(layerPath, `${id}.json`);
      await writeJsonFile(filePath, formula);

      log.debug(`Persisted formula ${id} to ${filePath}`);
    } catch (error) {
      log.error(`Failed to persist formula ${id}: ${error}`);
    }
  }

  // ============================================================================
  // KAR-MS3 MUTATION API ALIASES
  // ============================================================================

  /**
   * Register a new formula (alias for addFormula)
   * @param formula - Formula to register
   * @param layer - Target layer (default: USER)
   * @returns Formula ID
   */
  async register(formula: Formula, layer: string = DATA_LAYERS.USER): Promise<string> {
    return this.addFormula(formula, layer);
  }

  /**
   * Update an existing formula (alias for enhanceFormula)
   * @param id - Formula ID to update
   * @param updates - Partial formula data to merge
   * @param source - Optional source identifier
   * @returns Updated formula
   */
  async update(id: string, updates: Partial<Formula>, source?: string): Promise<Formula> {
    return this.enhanceFormula(id, updates, source);
  }

  /**
   * Persist registry to disk (alias for save)
   * @returns void
   */
  async persist(): Promise<void> {
    return this.save();
  }

  /**
   * Add formula to indexes without full rebuild
   */
  private addToIndexes(id: string, formula: Formula): void {
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

// Export singleton instance
/** Formula Registry constant.
 */
export const formulaRegistry = new FormulaRegistry();
