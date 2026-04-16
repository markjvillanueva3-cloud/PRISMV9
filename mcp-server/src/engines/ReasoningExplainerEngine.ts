/**
 * ReasoningExplainerEngine — Transparent AI
 *
 * AGENT-MS3 U-AGT10 — Makes agent reasoning transparent. "Why did you
 * recommend this?" gets a clear, traceable answer rooted in physics and
 * shop data. Produces audience-targeted explanations (machinist / engineer
 * / manager / auditor) with citations.
 *
 * NOTE: Source was recovered from a partially-corrupted file (null bytes
 * + stub re-export padding introduced by an earlier build artifact). The
 * ReasoningStepType union fragment at the top could not be recovered; it
 * was not referenced by the live class and has been omitted.
 *
 * @module engines/ReasoningExplainerEngine
 * @milestone AGENT-MS3 (U-AGT10)
 */

import type { ManufacturingReasoningChain } from "./ManufacturingReasoningEngine.js";
import type { MultiPathResult } from "./MultiPathReasoningEngine.js";

/** Explanation target — what kind of answer is being explained */
export type ExplanationTarget =
  | "recommendation"
  | "calculation"
  | "selection"
  | "warning"
  | "constraint"
  | "decision";

/** Explanation audience */
export type ExplanationAudience =
  | "machinist"    // Shop floor operator
  | "engineer"     // Technical engineer
  | "manager"      // Non-technical manager
  | "auditor";     // Compliance/quality auditor

/** Citation type */
export type CitationType =
  | "formula"      // Physics/math formula
  | "data"         // Shop/material data
  | "standard"     // Industry standard (ISO, etc.)
  | "tribal"       // Tribal knowledge
  | "inference"    // AI inference step
  | "constraint";  // Applied constraint

/** Explanation citation */
export interface Citation {
  type: CitationType;
  source: string;
  content: string;
  confidence: number;
  reference?: string;
}

/** Explanation section */
export interface ExplanationSection {
  heading: string;
  content: string;
  citations: Citation[];
  importance: "critical" | "important" | "informational";
}

/** Full explanation */
export interface Explanation {
  id: string;
  target: ExplanationTarget;
  audience: ExplanationAudience;
  summary: string;
  sections: ExplanationSection[];
  citations: Citation[];
  wordCount: number;
  readingLevelGrade: number;
  createdAt: string;
}

/** Explanation request */
export interface ExplanationRequest {
  question: string;
  context: ExplanationContext;
  audience?: ExplanationAudience;
  maxWords?: number;
}

/** Context for explanation */
export interface ExplanationContext {
  reasoningChain?: ManufacturingReasoningChain;
  multiPathResult?: MultiPathResult;
  recommendation?: string;
  calculation?: CalculationContext;
  selection?: SelectionContext;
}

/** Calculation context */
export interface CalculationContext {
  formula: string;
  inputs: Record<string, number | string>;
  result: number;
  unit: string;
  source: string;
}

/** Selection context */
export interface SelectionContext {
  selected: string;
  alternatives: string[];
  criteria: Record<string, number>;
}

/** Explanation template */
interface ExplanationTemplate {
  target: ExplanationTarget;
  audience: ExplanationAudience;
  introTemplate: string;
  sectionTemplates: string[];
  vocabularyLevel: "basic" | "technical" | "expert";
}

// ============================================================================
// ENGINE
// ============================================================================

export class ReasoningExplainerEngine {
  /** Word count limits by audience */
  private readonly WORD_LIMITS: Record<ExplanationAudience, number> = {
    machinist: 150,
    engineer: 300,
    manager: 200,
    auditor: 500
  };

  /** Vocabulary mappings for simplification */
  private readonly VOCABULARY_MAP: Record<string, string> = {
    "cutting velocity": "cutting speed",
    "feed per tooth": "feed per flute",
    "depth of cut": "how deep we're cutting",
    "surface feet per minute": "SFM",
    "specific cutting force": "how hard the material is to cut",
    "Kienzle model": "standard cutting force formula",
    "Taylor equation": "tool life formula",
    "deflection": "how much the tool bends",
    "chatter": "vibration",
    "thermal effects": "heat buildup"
  };

  /** Physics formula explanations */
  private readonly FORMULA_EXPLANATIONS: Record<string, string> = {
    "Fc = kc1.1 × ap × fz^(1-mc)": "Cutting force depends on material hardness, depth of cut, and feed rate",
    "T = (C/Vc)^(1/n)": "Tool life decreases as speed increases",
    "P = Fc × Vc / (60 × 1000 × η)": "Power required is force times speed",
    "Ra = (fz^2) / (32 × r)": "Surface finish improves with smaller feed and larger tool radius",
    "δ = FL³ / (3EI)": "Tool deflection increases with cutting force and tool length"
  };

  /**
   * Generate explanation for a question
   */
  explain(request: ExplanationRequest): Explanation {
    const audience = request.audience || "machinist";
    const maxWords = request.maxWords || this.WORD_LIMITS[audience];

    // Determine what we're explaining
    const target = this.determineTarget(request);

    // Build explanation
    const sections = this.buildSections(request, target, audience);
    const citations = this.gatherCitations(request, sections);

    // Generate summary
    const summary = this.generateSummary(request, target, audience);

    // Calculate metrics
    const wordCount = this.countWords(summary + sections.map(s => s.content).join(" "));
    const readingLevel = this.assessReadingLevel(summary + sections.map(s => s.content).join(" "));

    // Truncate if needed
    const trimmedSections = this.trimToWordLimit(sections, maxWords - this.countWords(summary));

    return {
      id: `exp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      target,
      audience,
      summary,
      sections: trimmedSections,
      citations,
      wordCount: Math.min(wordCount, maxWords),
      readingLevelGrade: readingLevel,
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Determine what we're explaining
   */
  private determineTarget(request: ExplanationRequest): ExplanationTarget {
    const q = request.question.toLowerCase();

    if (q.includes("why") && q.includes("recommend")) return "recommendation";
    if (q.includes("calculate") || q.includes("formula") || q.includes("number")) return "calculation";
    if (q.includes("select") || q.includes("choose") || q.includes("pick")) return "selection";
    if (q.includes("warning") || q.includes("danger") || q.includes("risk")) return "warning";
    if (q.includes("limit") || q.includes("constraint") || q.includes("cannot")) return "constraint";

    return "decision";
  }

  /**
   * Build explanation sections
   */
  private buildSections(
    request: ExplanationRequest,
    target: ExplanationTarget,
    audience: ExplanationAudience
  ): ExplanationSection[] {
    const sections: ExplanationSection[] = [];

    // From reasoning chain
    if (request.context.reasoningChain) {
      sections.push(...this.sectionsFromChain(request.context.reasoningChain, audience));
    }

    // From multi-path result
    if (request.context.multiPathResult) {
      sections.push(...this.sectionsFromMultiPath(request.context.multiPathResult, audience));
    }

    // From calculation
    if (request.context.calculation) {
      sections.push(this.sectionFromCalculation(request.context.calculation, audience));
    }

    // From selection
    if (request.context.selection) {
      sections.push(this.sectionFromSelection(request.context.selection, audience));
    }

    // Always add a "why this matters" section for machinists
    if (audience === "machinist") {
      sections.push({
        heading: "Why This Matters",
        content: this.generatePracticalImplication(request, target),
        citations: [],
        importance: "important"
      });
    }

    return sections;
  }

  /**
   * Build sections from reasoning chain
   */
  private sectionsFromChain(chain: ManufacturingReasoningChain, audience: ExplanationAudience): ExplanationSection[] {
    const sections: ExplanationSection[] = [];

    // Key deductions
    const deductions = chain.steps.filter(s => s.type === "deduction");
    if (deductions.length > 0) {
      const content = deductions
        .slice(0, 3)
        .map(d => this.simplifyForAudience(d.content, audience))
        .join(". ");

      sections.push({
        heading: "How I Figured This Out",
        content,
        citations: deductions.slice(0, 3).map(d => ({
          type: "inference" as CitationType,
          source: "reasoning chain",
          content: d.inference_rule || "logical deduction",
          confidence: d.confidence
        })),
        importance: "important"
      });
    }

    // Physics validations
    if (chain.physics_validations.length > 0) {
      const validations = chain.physics_validations.slice(0, 2);
      const content = validations
        .map(v => {
          const formulaExp = this.FORMULA_EXPLANATIONS[v.formula] || v.formula;
          return `${v.parameter}: ${this.simplifyForAudience(formulaExp, audience)} (${v.passes ? "passed" : "needs attention"})`;
        })
        .join(". ");

      sections.push({
        heading: "The Math Behind It",
        content,
        citations: validations.map(v => ({
          type: "formula" as CitationType,
          source: v.source,
          content: v.formula,
          confidence: v.passes ? 0.95 : 0.7
        })),
        importance: chain.physics_validations.some(v => !v.passes) ? "critical" : "informational"
      });
    }

    // Safety considerations
    const criticalSafety = chain.safety_checks.filter(s => s.severity === "critical");
    if (criticalSafety.length > 0) {
      sections.push({
        heading: "Safety Considerations",
        content: criticalSafety.map(s => this.simplifyForAudience(s.concern, audience)).join(". "),
        citations: criticalSafety.map(s => ({
          type: "constraint" as CitationType,
          source: "safety protocol",
          content: s.concern,
          confidence: 1.0
        })),
        importance: "critical"
      });
    }

    // Cost implications
    if (chain.cost_implications.length > 0 && audience !== "machinist") {
      const totalCost = chain.cost_implications.reduce((sum, c) => sum + c.estimated_cost, 0);
      sections.push({
        heading: "Cost Impact",
        content: `Estimated cost impact: $${totalCost.toFixed(2)}. ` +
          chain.cost_implications.slice(0, 2).map(c => `${c.category}: $${c.estimated_cost.toFixed(2)}`).join(", "),
        citations: [{
          type: "data" as CitationType,
          source: "cost analysis",
          content: "Estimated costs",
          confidence: 0.7
        }],
        importance: "informational"
      });
    }

    return sections;
  }

  /**
   * Build sections from multi-path result
   */
  private sectionsFromMultiPath(result: MultiPathResult, audience: ExplanationAudience): ExplanationSection[] {
    const sections: ExplanationSection[] = [];

    // Why this approach was chosen
    const bestPath = result.bestPath;
    sections.push({
      heading: "Why This Approach",
      content: this.simplifyForAudience(
        `I chose the ${bestPath.approach} approach because it scored ${(bestPath.score.overall * 100).toFixed(0)}% overall. ` +
        `It has ${(bestPath.score.safety * 100).toFixed(0)}% safety score and ${(bestPath.score.confidence * 100).toFixed(0)}% confidence.`,
        audience
      ),
      citations: [{
        type: "inference" as CitationType,
        source: "multi-path analysis",
        content: `Selected ${bestPath.approach} from ${result.paths.length} options`,
        confidence: bestPath.score.overall
      }],
      importance: "important"
    });

    // Alternatives considered
    if (result.alternativePaths.length > 0) {
      const altText = result.alternativePaths
        .slice(0, 2)
        .map(p => `${p.approach} (${(p.score.overall * 100).toFixed(0)}%)`)
        .join(", ");

      sections.push({
        heading: "Other Options Considered",
        content: this.simplifyForAudience(
          `I also looked at: ${altText}. These scored lower but might work in different situations.`,
          audience
        ),
        citations: [],
        importance: "informational"
      });
    }

    // Pruned paths (why they were rejected)
    if (result.prunedPaths.length > 0 && audience !== "machinist") {
      const rejectedText = result.prunedPaths
        .slice(0, 2)
        .map(p => `${p.approach}: ${p.pruneReason || "didn't meet requirements"}`)
        .join("; ");

      sections.push({
        heading: "Rejected Options",
        content: rejectedText,
        citations: [],
        importance: "informational"
      });
    }

    return sections;
  }

  /**
   * Build section from calculation
   */
  private sectionFromCalculation(calc: CalculationContext, audience: ExplanationAudience): ExplanationSection {
    const formulaExp = this.FORMULA_EXPLANATIONS[calc.formula] || calc.formula;

    let content: string;
    if (audience === "machinist") {
      content = `The answer is ${calc.result} ${calc.unit}. ` +
        `I got this using ${this.simplifyForAudience(formulaExp, audience)} ` +
        `based on your inputs.`;
    } else {
      const inputStr = Object.entries(calc.inputs)
        .map(([k, v]) => `${k}=${v}`)
        .join(", ");
      content = `Calculated ${calc.result} ${calc.unit} using ${calc.formula} with inputs: ${inputStr}. ` +
        `Source: ${calc.source}.`;
    }

    return {
      heading: "The Calculation",
      content,
      citations: [{
        type: "formula",
        source: calc.source,
        content: calc.formula,
        confidence: 0.95
      }],
      importance: "important"
    };
  }

  /**
   * Build section from selection
   */
  private sectionFromSelection(sel: SelectionContext, audience: ExplanationAudience): ExplanationSection {
    const criteriaStr = Object.entries(sel.criteria)
      .slice(0, 3)
      .map(([k, v]) => `${k}: ${(v * 100).toFixed(0)}%`)
      .join(", ");

    let content: string;
    if (audience === "machinist") {
      content = `I picked ${sel.selected} because it scored best overall. ` +
        `Other options were: ${sel.alternatives.slice(0, 2).join(", ")}.`;
    } else {
      content = `Selected ${sel.selected} based on criteria: ${criteriaStr}. ` +
        `Alternatives: ${sel.alternatives.join(", ")}.`;
    }

    return {
      heading: "Why This Selection",
      content,
      citations: [{
        type: "data",
        source: "selection criteria",
        content: criteriaStr,
        confidence: 0.85
      }],
      importance: "important"
    };
  }

  /**
   * Generate practical implication for machinists
   */
  private generatePracticalImplication(request: ExplanationRequest, target: ExplanationTarget): string {
    switch (target) {
      case "recommendation":
        return "Following this recommendation should give you good results while keeping the operation safe and efficient.";
      case "calculation":
        return "These numbers are based on standard formulas that machinists have used for decades. They account for your specific material and setup.";
      case "selection":
        return "This choice balances your requirements - you'll get good quality without excessive wear or risk.";
      case "warning":
        return "Pay attention to these warnings - they're based on physics and real shop experience. Ignoring them could damage tools or workpieces.";
      case "constraint":
        return "These limits exist for safety and quality reasons. Exceeding them risks damaging your work or equipment.";
      default:
        return "This decision is based on your specific situation and standard machining principles.";
    }
  }

  /**
   * Simplify text for audience
   */
  private simplifyForAudience(text: string, audience: ExplanationAudience): string {
    if (audience === "engineer" || audience === "auditor") {
      return text; // Keep technical language
    }

    // Replace technical terms
    let simplified = text;
    for (const [technical, simple] of Object.entries(this.VOCABULARY_MAP)) {
      simplified = simplified.replace(new RegExp(technical, "gi"), simple);
    }

    return simplified;
  }

  /**
   * Generate summary
   */
  private generateSummary(
    request: ExplanationRequest,
    target: ExplanationTarget,
    audience: ExplanationAudience
  ): string {
    const context = request.context;

    let base: string;
    switch (target) {
      case "recommendation":
        if (context.multiPathResult) {
          base = `I recommend the ${context.multiPathResult.bestPath.approach} approach because it scored highest for safety and effectiveness.`;
        } else if (context.recommendation) {
          base = `I recommend this because the analysis shows it's the best option for your situation.`;
        } else {
          base = `This recommendation is based on analyzing your requirements against standard machining principles.`;
        }
        break;
      case "calculation":
        if (context.calculation) {
          base = `The answer is ${context.calculation.result} ${context.calculation.unit}, calculated using ${this.simplifyForAudience(context.calculation.source, audience)}.`;
        } else {
          base = `This calculation follows standard engineering formulas for your specific conditions.`;
        }
        break;
      case "selection":
        if (context.selection) {
          base = `I selected ${context.selection.selected} because it best meets your criteria among ${context.selection.alternatives.length + 1} options.`;
        } else {
          base = `This selection is based on matching your requirements to available options.`;
        }
        break;
      default:
        base = `This is based on analyzing your specific situation using physics and shop best practices.`;
    }

    return this.simplifyForAudience(base, audience);
  }

  /**
   * Gather all citations
   */
  private gatherCitations(request: ExplanationRequest, sections: ExplanationSection[]): Citation[] {
    const allCitations: Citation[] = [];

    for (const section of sections) {
      allCitations.push(...section.citations);
    }

    // Deduplicate by source
    const seen = new Set<string>();
    return allCitations.filter(c => {
      if (seen.has(c.source)) return false;
      seen.add(c.source);
      return true;
    });
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text.split(/\s+/).filter(w => w.length > 0).length;
  }

  /**
   * Assess reading level (Flesch-Kincaid grade level approximation)
   */
  private assessReadingLevel(text: string): number {
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);

    if (words.length === 0 || sentences.length === 0) return 6;

    const avgWordsPerSentence = words.length / sentences.length;
    const avgSyllablesPerWord = this.estimateSyllables(words) / words.length;

    // Simplified Flesch-Kincaid grade level
    const grade = 0.39 * avgWordsPerSentence + 11.8 * avgSyllablesPerWord - 15.59;
    return Math.max(1, Math.min(18, Math.round(grade)));
  }

  /**
   * Estimate syllable count
   */
  private estimateSyllables(words: string[]): number {
    return words.reduce((sum, word) => {
      // Simple syllable estimation: count vowel groups
      const matches = word.toLowerCase().match(/[aeiouy]+/g);
      return sum + (matches ? matches.length : 1);
    }, 0);
  }

  /**
   * Trim sections to word limit
   */
  private trimToWordLimit(sections: ExplanationSection[], maxWords: number): ExplanationSection[] {
    const result: ExplanationSection[] = [];
    let wordCount = 0;

    // Sort by importance
    const sorted = [...sections].sort((a, b) => {
      const order = { critical: 0, important: 1, informational: 2 };
      return order[a.importance] - order[b.importance];
    });

    for (const section of sorted) {
      const sectionWords = this.countWords(section.heading + " " + section.content);
      if (wordCount + sectionWords <= maxWords) {
        result.push(section);
        wordCount += sectionWords;
      } else if (wordCount < maxWords) {
        // Truncate this section to fit
        const availableWords = maxWords - wordCount;
        const words = section.content.split(/\s+/);
        const truncated = words.slice(0, availableWords - 5).join(" ") + "...";
        result.push({ ...section, content: truncated });
        break;
      }
    }

    return result;
  }

  /**
   * Generate "why" explanation for a recommendation
   */
  explainWhy(recommendation: string, chain: ManufacturingReasoningChain, audience: ExplanationAudience = "machinist"): string {
    const request: ExplanationRequest = {
      question: `Why did you recommend ${recommendation}?`,
      context: { reasoningChain: chain, recommendation },
      audience
    };

    const explanation = this.explain(request);
    return `${explanation.summary}\n\n${explanation.sections.map(s => `**${s.heading}:** ${s.content}`).join("\n\n")}`;
  }

  /**
   * Generate formula explanation
   */
  explainFormula(formula: string, audience: ExplanationAudience = "machinist"): string {
    const explanation = this.FORMULA_EXPLANATIONS[formula];
    if (!explanation) {
      return `This formula (${formula}) calculates a key machining parameter.`;
    }
    return this.simplifyForAudience(explanation, audience);
  }

  /**
   * Get reading level label
   */
  getReadingLevelLabel(grade: number): string {
    if (grade <= 6) return "Easy to read";
    if (grade <= 10) return "Moderate";
    if (grade <= 14) return "Technical";
    return "Expert level";
  }
}

// Export singleton
export const reasoningExplainerEngine = new ReasoningExplainerEngine();
