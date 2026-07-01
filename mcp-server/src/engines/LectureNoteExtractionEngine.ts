/**
 * LectureNoteExtractionEngine.ts
 * PDF-EXT-MS2 U-PDF11: Lecture note extraction → formulas, problem/solution pairs
 *
 * Extracts structured knowledge from MIT OCW lecture notes and assignments.
 */

import { BaseEngine, type EngineCapability } from "./BaseEngine.js";
import { logger } from "../utils/Logger.js";
import * as fs from "fs";
import * as path from "path";

// ============================================================================
// Types
// ============================================================================

export interface ExtractedFormula {
  id: string;
  name: string;
  latex?: string;
  plainText: string;
  variables: FormulaVariable[];
  units?: string;
  category: FormulaCategory;
  source: {
    courseId: string;
    lectureNumber?: number;
    page?: number;
    context: string;
  };
  prismEngines: string[]; // Mapped PRISM engines that use this formula
}

export interface FormulaVariable {
  symbol: string;
  description: string;
  units?: string;
  typical?: { min: number; max: number };
}

export type FormulaCategory =
  | "cutting_mechanics"
  | "dynamics"
  | "thermal"
  | "numerical"
  | "optimization"
  | "statistics"
  | "machine_learning"
  | "geometry"
  | "control"
  | "other";

export interface ProblemSolutionPair {
  id: string;
  courseId: string;
  source: string; // Assignment/exam filename
  problemNumber: number;
  problemText: string;
  solutionText?: string;
  difficulty: "basic" | "intermediate" | "advanced";
  topics: string[];
  formulasUsed: string[]; // Formula IDs
  prismRelevance: number; // 0-1 score
}

export interface LectureMetadata {
  courseId: string;
  lectureNumber: number;
  title: string;
  topics: string[];
  keyFormulas: string[];
  hasVideo: boolean;
  hasPDF: boolean;
  resourcePath: string;
}

export interface ExtractionSummary {
  courseId: string;
  lectures: number;
  assignments: number;
  formulas: number;
  problems: number;
  solutions: number;
  prismMappings: number;
}

// Patterns for recognizing formulas in text
const FORMULA_PATTERNS = {
  // Cutting mechanics
  kienzle: /F_?c?\s*=\s*k_?c\s*[×x*·]\s*b\s*[×x*·]\s*h\s*\^?\s*\(?\s*1\s*[-−]\s*m/gi,
  taylor: /[VvT]\s*[×x*·]\s*T\s*\^?\s*n\s*=\s*C/gi,
  merchant: /[φϕ]\s*=\s*(?:45|π\/4)\s*[+-]\s*[βα]/gi,
  mrrBasic: /MRR\s*=\s*(?:V|v)_?c\s*[×x*·]\s*(?:a_?p|DOC)\s*[×x*·]\s*f/gi,

  // Dynamics
  naturalFreq: /[ωf]_?n\s*=\s*√?\s*\(?\s*k\s*\/\s*m\s*\)?/gi,
  dampingRatio: /[ζξ]\s*=\s*c\s*\/\s*\(?\s*2\s*[×x*·]\s*√?\s*\(?\s*k\s*[×x*·]\s*m/gi,
  vibration: /x\s*\(?\s*t\s*\)?\s*=\s*[AX]\s*[×x*·]?\s*(?:sin|cos|e\^)/gi,

  // Thermal
  heatConduction: /q\s*=\s*[-−]?\s*k\s*[×x*·]\s*(?:dT\/dx|∇T|A\s*[×x*·]\s*ΔT)/gi,
  convection: /q\s*=\s*h\s*[×x*·]\s*A\s*[×x*·]\s*\(?T_?s\s*[-−]\s*T/gi,

  // Numerical methods
  newtonRaphson: /x_?\{?(?:n\+1|i\+1)\}?\s*=\s*x_?\{?[ni]\}?\s*[-−]\s*f\s*\(?\s*x\s*\)?\s*\/\s*f['′]/gi,
  rungeKutta: /k_?[1-4]\s*=\s*(?:h\s*[×x*·]?\s*)?f\s*\(/gi,
  euler: /y_?\{?(?:n\+1|i\+1)\}?\s*=\s*y_?\{?[ni]\}?\s*\+\s*h\s*[×x*·]\s*f/gi,

  // Optimization
  gradient: /∇f\s*=\s*\[|x_?\{?(?:k\+1|i\+1)\}?\s*=\s*x_?\{?[ki]\}?\s*[-−]\s*α\s*[×x*·]\s*∇/gi,
  lagrangian: /L\s*\(?\s*x\s*,\s*λ\s*\)?\s*=\s*f\s*\(?\s*x\s*\)?\s*[-−+]\s*λ/gi,

  // Statistics
  leastSquares: /(?:β|b)\s*=\s*\(?\s*X['ᵀT]\s*X\s*\)?\s*⁻¹\s*[×x*·]?\s*X['ᵀT]\s*y/gi,
  bayesian: /P\s*\(?\s*[AθH]\s*\|?\s*[BD]\s*\)?\s*=\s*P\s*\(?\s*[BD]/gi,
};

// Map formula categories to PRISM engines
const FORMULA_TO_ENGINE_MAP: Record<string, string[]> = {
  kienzle: ["PRISM_KIENZLE_FORCE", "PRISM_FORCE_CALCULATOR"],
  taylor: ["PRISM_TAYLOR_TOOL_LIFE", "PRISM_TOOL_LIFE_ENGINE"],
  merchant: ["PRISM_MERCHANT_FORCE", "PRISM_CHIP_FORMATION_ENGINE"],
  mrrBasic: ["PRISM_MRR_CALCULATOR", "PRISM_MACHINING_TIME_ENGINE"],
  naturalFreq: ["PRISM_VIBRATION_ANALYSIS_ENGINE", "PRISM_STABILITY_LOBES"],
  dampingRatio: ["PRISM_CHATTER_PREDICTION_ENGINE", "PRISM_DAMPING_OPTIMIZATION"],
  vibration: ["PRISM_VIBRATION_ANALYSIS_ENGINE"],
  heatConduction: ["PRISM_HEAT_TRANSFER_ENGINE", "PRISM_CUTTING_THERMAL_ENGINE"],
  convection: ["PRISM_HEAT_TRANSFER_ENGINE", "PRISM_COOLANT_OPTIMIZATION"],
  newtonRaphson: ["PRISM_TRUST_REGION_OPTIMIZER", "PRISM_CONSTRAINED_OPTIMIZER"],
  rungeKutta: ["PRISM_RIGID_BODY_DYNAMICS_ENGINE", "PRISM_ODE_SOLVER"],
  euler: ["PRISM_ODE_SOLVER"],
  gradient: ["PRISM_GRADIENT_DESCENT", "PRISM_ADAM_OPTIMIZER"],
  lagrangian: ["PRISM_CONSTRAINED_OPTIMIZER"],
  leastSquares: ["PRISM_LINEAR_REGRESSION", "PRISM_BAYESIAN_SYSTEM"],
  bayesian: ["PRISM_BAYESIAN_SYSTEM", "PRISM_BAYESIAN_LEARNING"],
};

// ============================================================================
// Engine
// ============================================================================

export class LectureNoteExtractionEngine extends BaseEngine {
  private extractedFormulas: Map<string, ExtractedFormula> = new Map();
  private problemSolutions: Map<string, ProblemSolutionPair> = new Map();
  private lectureMetadata: Map<string, LectureMetadata[]> = new Map();

  private resourcesPath: string;

  constructor(resourcesPath?: string) {
    super({
      name: "LectureNoteExtractionEngine",
      version: "1.0.0",
      domain: "academy",
      description:
        "Extracts formulas + problem/solution pairs from MIT OCW lecture notes " +
        "for PRISM Academy curriculum + engine grounding.",
    });
    this.resourcesPath = resourcesPath || "H:/prism/resources/MIT COURSES";
  }

  // ── BaseEngine contract ────────────────────────────────────────────────────

  getCapabilities(): EngineCapability[] {
    return [
      {
        name: "scan_course",
        description: "Scan an MIT OCW course directory for formulas + problem/solution pairs",
        actions: ["scanCourse"],
        input: "{ courseId: string }",
        output: "ExtractionSummary",
      },
      {
        name: "extract_formulas",
        description: "Extract formulas from raw lecture-note text",
        actions: ["extractFormulasFromText"],
      },
      {
        name: "query_formulas",
        description: "Query extracted formulas by category or target engine",
        actions: ["getFormulas", "getFormulasByCategory", "getFormulasForEngine"],
      },
      {
        name: "query_problems",
        description: "Query extracted problem/solution pairs",
        actions: ["getProblems", "getProblemsByCourse", "getHighRelevanceProblems"],
      },
    ];
  }

  validate(input: unknown): string | null {
    if (input == null || typeof input !== "object") return "input must be an object";
    const obj = input as Record<string, unknown>;
    if (typeof obj.courseId !== "string" || obj.courseId.trim().length === 0) {
      return "courseId (non-empty string) is required";
    }
    return null;
  }

  protected async executeImpl(input: unknown): Promise<unknown> {
    const err = this.validate(input);
    if (err) throw new Error(`LectureNoteExtractionEngine: ${err}`);
    const obj = input as { courseId: string };
    return this.scanCourse(obj.courseId);
  }

  /**
   * Scan an extracted course for lecture notes and extract formulas
   */
  async scanCourse(courseId: string): Promise<ExtractionSummary> {
    const coursePath = path.join(this.resourcesPath, courseId);
    if (!fs.existsSync(coursePath)) {
      logger.warn(`[LectureNoteExtraction] Course path not found: ${coursePath}`);
      return this.emptyResults(courseId);
    }

    const summary: ExtractionSummary = {
      courseId,
      lectures: 0,
      assignments: 0,
      formulas: 0,
      problems: 0,
      solutions: 0,
      prismMappings: 0,
    };

    try {
      // Load content map
      const contentMapPath = path.join(coursePath, "content_map.json");
      if (!fs.existsSync(contentMapPath)) {
        logger.warn(`[LectureNoteExtraction] No content_map.json for ${courseId}`);
        return summary;
      }

      const contentMap = JSON.parse(fs.readFileSync(contentMapPath, "utf-8"));

      // Process each resource
      for (const [uid, resourcePath] of Object.entries(contentMap)) {
        const resPath = resourcePath as string;

        // Identify resource type
        if (resPath.includes("lec") || resPath.includes("lecture")) {
          summary.lectures++;
          await this.processLecture(courseId, uid, resPath, coursePath);
        } else if (resPath.includes("hw") || resPath.includes("assignment") || resPath.includes("problem")) {
          summary.assignments++;
          await this.processAssignment(courseId, uid, resPath, coursePath);
        } else if (resPath.includes("exam") || resPath.includes("quiz")) {
          await this.processExam(courseId, uid, resPath, coursePath);
        }
      }

      // Update summary counts
      const courseFormulas = Array.from(this.extractedFormulas.values())
        .filter((f) => f.source.courseId === courseId);
      summary.formulas = courseFormulas.length;
      summary.prismMappings = courseFormulas.reduce((sum, f) => sum + f.prismEngines.length, 0);

      const courseProblems = Array.from(this.problemSolutions.values())
        .filter((p) => p.courseId === courseId);
      summary.problems = courseProblems.length;
      summary.solutions = courseProblems.filter((p) => p.solutionText).length;

      logger.info(`[LectureNoteExtraction] Scanned ${courseId}: ${summary.formulas} formulas, ${summary.problems} problems`);

    } catch (err) {
      logger.error(`[LectureNoteExtraction] Error scanning ${courseId}:`, err);
    }

    return summary;
  }

  /**
   * Process a lecture resource to extract formulas
   */
  private async processLecture(
    courseId: string,
    uid: string,
    resourcePath: string,
    coursePath: string
  ): Promise<void> {
    // Try to load the resource data.json
    const dataPath = path.join(coursePath, resourcePath);
    if (!fs.existsSync(dataPath)) return;

    try {
      const data = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
      const title = data.title || data.resource_title || "";
      const description = data.description || "";

      // Extract lecture number from title or path
      const lectureMatch = title.match(/(?:lecture|lec)\s*(\d+)/i) ||
        resourcePath.match(/lec(\d+)/i);
      const lectureNumber = lectureMatch ? parseInt(lectureMatch[1]) : 0;

      // Extract formulas from description/content
      const text = `${title} ${description}`;
      await this.extractFormulasFromText(text, courseId, lectureNumber);

    } catch (err) {
      // Silently skip malformed resources
    }
  }

  /**
   * Process assignment/problem set
   */
  private async processAssignment(
    courseId: string,
    uid: string,
    resourcePath: string,
    coursePath: string
  ): Promise<void> {
    const dataPath = path.join(coursePath, resourcePath);
    if (!fs.existsSync(dataPath)) return;

    try {
      const data = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
      const title = data.title || "";
      const description = data.description || "";

      // Create problem/solution entry
      const problemMatch = title.match(/(?:problem|hw|homework)\s*(\d+)/i);
      const problemNumber = problemMatch ? parseInt(problemMatch[1]) : 1;

      const pair: ProblemSolutionPair = {
        id: `${courseId}-${uid}`,
        courseId,
        source: resourcePath,
        problemNumber,
        problemText: description,
        difficulty: this.inferDifficulty(description),
        topics: this.extractTopics(description),
        formulasUsed: [],
        prismRelevance: this.calculateRelevance(description),
      };

      this.problemSolutions.set(pair.id, pair);

    } catch (err) {
      // Silently skip
    }
  }

  /**
   * Process exam/quiz
   */
  private async processExam(
    courseId: string,
    uid: string,
    resourcePath: string,
    coursePath: string
  ): Promise<void> {
    // Similar to assignment processing
    await this.processAssignment(courseId, uid, resourcePath, coursePath);
  }

  /**
   * Extract formulas from text using pattern matching
   */
  async extractFormulasFromText(
    text: string,
    courseId: string,
    lectureNumber?: number
  ): Promise<ExtractedFormula[]> {
    const formulas: ExtractedFormula[] = [];

    for (const [patternName, regex] of Object.entries(FORMULA_PATTERNS)) {
      const matches = text.match(regex);
      if (matches) {
        for (const match of matches) {
          const formula: ExtractedFormula = {
            id: `${courseId}-${patternName}-${formulas.length}`,
            name: this.getFormulaName(patternName),
            plainText: match,
            variables: this.inferVariables(patternName),
            category: this.inferCategory(patternName),
            source: {
              courseId,
              lectureNumber,
              context: match,
            },
            prismEngines: FORMULA_TO_ENGINE_MAP[patternName] || [],
          };

          formulas.push(formula);
          this.extractedFormulas.set(formula.id, formula);
        }
      }
    }

    return formulas;
  }

  /**
   * Get human-readable formula name
   */
  private getFormulaName(patternName: string): string {
    const names: Record<string, string> = {
      kienzle: "Kienzle Cutting Force",
      taylor: "Taylor Tool Life Equation",
      merchant: "Merchant Shear Angle",
      mrrBasic: "Material Removal Rate",
      naturalFreq: "Natural Frequency",
      dampingRatio: "Damping Ratio",
      vibration: "Vibration Response",
      heatConduction: "Fourier Heat Conduction",
      convection: "Convective Heat Transfer",
      newtonRaphson: "Newton-Raphson Method",
      rungeKutta: "Runge-Kutta Method",
      euler: "Euler's Method",
      gradient: "Gradient Descent",
      lagrangian: "Lagrangian Multipliers",
      leastSquares: "Least Squares Regression",
      bayesian: "Bayes' Theorem",
    };
    return names[patternName] || patternName;
  }

  /**
   * Infer formula variables from pattern name
   */
  private inferVariables(patternName: string): FormulaVariable[] {
    const variableMap: Record<string, FormulaVariable[]> = {
      kienzle: [
        { symbol: "Fc", description: "Cutting force", units: "N" },
        { symbol: "kc", description: "Specific cutting force", units: "N/mm²" },
        { symbol: "b", description: "Width of cut", units: "mm" },
        { symbol: "h", description: "Chip thickness", units: "mm" },
        { symbol: "m", description: "Kienzle exponent", units: "-" },
      ],
      taylor: [
        { symbol: "V", description: "Cutting speed", units: "m/min" },
        { symbol: "T", description: "Tool life", units: "min" },
        { symbol: "n", description: "Taylor exponent", units: "-" },
        { symbol: "C", description: "Taylor constant", units: "m/min" },
      ],
      naturalFreq: [
        { symbol: "ωn", description: "Natural frequency", units: "rad/s" },
        { symbol: "k", description: "Stiffness", units: "N/m" },
        { symbol: "m", description: "Mass", units: "kg" },
      ],
    };
    return variableMap[patternName] || [];
  }

  /**
   * Infer formula category
   */
  private inferCategory(patternName: string): FormulaCategory {
    const categoryMap: Record<string, FormulaCategory> = {
      kienzle: "cutting_mechanics",
      taylor: "cutting_mechanics",
      merchant: "cutting_mechanics",
      mrrBasic: "cutting_mechanics",
      naturalFreq: "dynamics",
      dampingRatio: "dynamics",
      vibration: "dynamics",
      heatConduction: "thermal",
      convection: "thermal",
      newtonRaphson: "numerical",
      rungeKutta: "numerical",
      euler: "numerical",
      gradient: "optimization",
      lagrangian: "optimization",
      leastSquares: "statistics",
      bayesian: "statistics",
    };
    return categoryMap[patternName] || "other";
  }

  /**
   * Infer problem difficulty
   */
  private inferDifficulty(text: string): "basic" | "intermediate" | "advanced" {
    const advancedKeywords = /advanced|graduate|research|complex|multi-|coupled/i;
    const basicKeywords = /introduction|basic|simple|tutorial|example/i;

    if (advancedKeywords.test(text)) return "advanced";
    if (basicKeywords.test(text)) return "basic";
    return "intermediate";
  }

  /**
   * Extract topics from text
   */
  private extractTopics(text: string): string[] {
    const topics: string[] = [];
    const topicPatterns: Record<string, RegExp> = {
      "cutting forces": /cutting\s+force|force\s+model/i,
      "tool life": /tool\s+life|wear|taylor/i,
      "stability": /stability|chatter|vibration/i,
      "thermal": /heat|thermal|temperature/i,
      "optimization": /optimi[sz]/i,
      "numerical methods": /numerical|iteration|convergence/i,
    };

    for (const [topic, pattern] of Object.entries(topicPatterns)) {
      if (pattern.test(text)) {
        topics.push(topic);
      }
    }

    return topics;
  }

  /**
   * Calculate PRISM relevance score
   */
  private calculateRelevance(text: string): number {
    let score = 0;
    const keywords = [
      { pattern: /machining|cutting|milling|turning|drilling/i, weight: 0.2 },
      { pattern: /force|power|torque/i, weight: 0.15 },
      { pattern: /tool\s+life|wear/i, weight: 0.15 },
      { pattern: /speed|feed|rpm/i, weight: 0.15 },
      { pattern: /surface\s+finish|roughness/i, weight: 0.1 },
      { pattern: /chatter|vibration|stability/i, weight: 0.15 },
      { pattern: /thermal|heat|temperature/i, weight: 0.1 },
    ];

    for (const { pattern, weight } of keywords) {
      if (pattern.test(text)) {
        score += weight;
      }
    }

    return Math.min(score, 1);
  }

  /**
   * Get all extracted formulas
   */
  getFormulas(): ExtractedFormula[] {
    return Array.from(this.extractedFormulas.values());
  }

  /**
   * Get formulas by category
   */
  getFormulasByCategory(category: FormulaCategory): ExtractedFormula[] {
    return this.getFormulas().filter((f) => f.category === category);
  }

  /**
   * Get formulas mapped to a PRISM engine
   */
  getFormulasForEngine(engineName: string): ExtractedFormula[] {
    return this.getFormulas().filter((f) => f.prismEngines.includes(engineName));
  }

  /**
   * Get all problem/solution pairs
   */
  getProblems(): ProblemSolutionPair[] {
    return Array.from(this.problemSolutions.values());
  }

  /**
   * Get problems for a specific course
   */
  getProblemsByCourse(courseId: string): ProblemSolutionPair[] {
    return this.getProblems().filter((p) => p.courseId === courseId);
  }

  /**
   * Get high-relevance problems (PRISM-applicable)
   */
  getHighRelevanceProblems(minRelevance = 0.5): ProblemSolutionPair[] {
    return this.getProblems().filter((p) => p.prismRelevance >= minRelevance);
  }

  /**
   * Get stats
   */
  getStats(): {
    totalFormulas: number;
    byCategory: Record<FormulaCategory, number>;
    totalProblems: number;
    withSolutions: number;
    averageRelevance: number;
    mappedEngines: number;
  } {
    const formulas = this.getFormulas();
    const problems = this.getProblems();

    const byCategory: Record<FormulaCategory, number> = {
      cutting_mechanics: 0,
      dynamics: 0,
      thermal: 0,
      numerical: 0,
      optimization: 0,
      statistics: 0,
      machine_learning: 0,
      geometry: 0,
      control: 0,
      other: 0,
    };

    for (const f of formulas) {
      byCategory[f.category]++;
    }

    const uniqueEngines = new Set(formulas.flatMap((f) => f.prismEngines));

    return {
      totalFormulas: formulas.length,
      byCategory,
      totalProblems: problems.length,
      withSolutions: problems.filter((p) => p.solutionText).length,
      averageRelevance: problems.length > 0
        ? problems.reduce((sum, p) => sum + p.prismRelevance, 0) / problems.length
        : 0,
      mappedEngines: uniqueEngines.size,
    };
  }

  private emptyResults(courseId: string): ExtractionSummary {
    return {
      courseId,
      lectures: 0,
      assignments: 0,
      formulas: 0,
      problems: 0,
      solutions: 0,
      prismMappings: 0,
    };
  }

  /**
   * Clear extracted data (for testing)
   */
  clear(): void {
    this.extractedFormulas.clear();
    this.problemSolutions.clear();
    this.lectureMetadata.clear();
  }
}

// Singleton
export const lectureNoteExtractionEngine = new LectureNoteExtractionEngine();
