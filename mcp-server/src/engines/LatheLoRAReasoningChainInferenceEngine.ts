/**
 * LatheLoRAReasoningChainInferenceEngine — LATHE-LORA-MS0 U-LLR26
 * ===============================================================
 *
 * Implements chain-of-thought reasoning for LatheLoRA inference.
 * Breaks complex machining questions into reasoning steps.
 *
 * Features:
 *   - Multi-step reasoning chains
 *   - Intermediate validation
 *   - Reasoning trace logging
 *   - Confidence propagation
 *
 * @module engines/LatheLoRAReasoningChainInferenceEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Reasoning step type */
export type ReasoningStepType =
  | "understand"
  | "retrieve"
  | "calculate"
  | "validate"
  | "synthesize"
  | "conclude";

/** Single reasoning step */
export interface ReasoningStep {
  id: number;
  type: ReasoningStepType;
  prompt: string;
  response?: string;
  confidence: number;
  duration_ms?: number;
  validated: boolean;
  error?: string;
}

/** Reasoning chain */
export interface ReasoningChain {
  id: string;
  original_query: string;
  steps: ReasoningStep[];
  final_answer?: string;
  overall_confidence: number;
  total_duration_ms: number;
  status: "pending" | "running" | "complete" | "failed";
  created_at: number;
}

/** Chain template */
export interface ChainTemplate {
  id: string;
  name: string;
  description: string;
  steps: Array<{
    type: ReasoningStepType;
    prompt_template: string;
  }>;
  applicable_queries: string[];
}

/** Engine configuration */
export interface ReasoningConfig {
  max_steps: number;
  confidence_threshold: number;
  timeout_per_step_ms: number;
  enable_validation: boolean;
  verbose_trace: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CONFIG: ReasoningConfig = {
  max_steps: 6,
  confidence_threshold: 0.7,
  timeout_per_step_ms: 10000,
  enable_validation: true,
  verbose_trace: false,
};

/** Standard chain templates */
const CHAIN_TEMPLATES: ChainTemplate[] = [
  {
    id: "speed-feed",
    name: "Speed & Feed Calculation",
    description: "Calculate optimal cutting parameters",
    steps: [
      { type: "understand", prompt_template: "What material and operation is being asked about? Query: {query}" },
      { type: "retrieve", prompt_template: "What are the recommended SFM and feed ranges for {material} with {operation}?" },
      { type: "calculate", prompt_template: "Calculate RPM for {sfm} SFM with {diameter} inch diameter." },
      { type: "validate", prompt_template: "Validate that {rpm} RPM is safe for this material and operation." },
      { type: "synthesize", prompt_template: "Combine the speed and feed recommendations into a complete answer." },
      { type: "conclude", prompt_template: "Provide the final recommendation with G-code format if applicable." },
    ],
    applicable_queries: ["speed", "feed", "sfm", "rpm", "cutting parameters"],
  },
  {
    id: "tool-selection",
    name: "Tool Selection",
    description: "Select appropriate cutting tool",
    steps: [
      { type: "understand", prompt_template: "What operation and material requires tool selection? Query: {query}" },
      { type: "retrieve", prompt_template: "What tool types are suitable for {operation} on {material}?" },
      { type: "calculate", prompt_template: "What insert geometry and grade is optimal for these conditions?" },
      { type: "validate", prompt_template: "Verify the tool can handle the required depth of cut and feed." },
      { type: "conclude", prompt_template: "Recommend the specific tool with holder and insert specifications." },
    ],
    applicable_queries: ["tool", "insert", "holder", "cutting tool", "tooling"],
  },
  {
    id: "gcode-generation",
    name: "G-code Generation",
    description: "Generate G-code for operation",
    steps: [
      { type: "understand", prompt_template: "What operation and geometry is needed? Query: {query}" },
      { type: "retrieve", prompt_template: "What are the Okuma OSP G-codes for {operation}?" },
      { type: "calculate", prompt_template: "Calculate the toolpath coordinates for {geometry}." },
      { type: "validate", prompt_template: "Verify the G-code includes proper safety codes (G50, clearances)." },
      { type: "synthesize", prompt_template: "Assemble the complete program structure." },
      { type: "conclude", prompt_template: "Output the final G-code with comments." },
    ],
    applicable_queries: ["g-code", "gcode", "program", "write code", "generate code"],
  },
  {
    id: "troubleshoot",
    name: "Troubleshooting",
    description: "Diagnose machining problems",
    steps: [
      { type: "understand", prompt_template: "What symptoms or problems are described? Query: {query}" },
      { type: "retrieve", prompt_template: "What are common causes of {symptom} in lathe operations?" },
      { type: "calculate", prompt_template: "What parameter adjustments would address each cause?" },
      { type: "validate", prompt_template: "Verify the suggested fixes are safe and practical." },
      { type: "conclude", prompt_template: "Provide prioritized troubleshooting steps." },
    ],
    applicable_queries: ["chatter", "vibration", "finish", "problem", "issue", "why"],
  },
];

// ============================================================================
// ENGINE CLASS
// ============================================================================

class LatheLoRAReasoningChainInferenceEngine {
  private config: ReasoningConfig = DEFAULT_CONFIG;
  private templates: ChainTemplate[] = [...CHAIN_TEMPLATES];
  private chains: Map<string, ReasoningChain> = new Map();

  /**
   * Set configuration
   */
  setConfig(config: Partial<ReasoningConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get configuration
   */
  getConfig(): ReasoningConfig {
    return { ...this.config };
  }

  /**
   * Get available templates
   */
  getTemplates(): ChainTemplate[] {
    return [...this.templates];
  }

  /**
   * Add custom template
   */
  addTemplate(template: ChainTemplate): void {
    this.templates.push(template);
  }

  /**
   * Match query to best template
   */
  matchTemplate(query: string): ChainTemplate | null {
    const lower = query.toLowerCase();

    for (const template of this.templates) {
      for (const keyword of template.applicable_queries) {
        if (lower.includes(keyword.toLowerCase())) {
          return template;
        }
      }
    }

    return null;
  }

  /**
   * Create reasoning chain from template
   */
  createChain(query: string, template?: ChainTemplate): ReasoningChain {
    const t = template || this.matchTemplate(query);

    const chain: ReasoningChain = {
      id: `chain-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      original_query: query,
      steps: [],
      overall_confidence: 0,
      total_duration_ms: 0,
      status: "pending",
      created_at: Date.now(),
    };

    if (t) {
      chain.steps = t.steps.map((s, i) => ({
        id: i + 1,
        type: s.type,
        prompt: s.prompt_template.replace("{query}", query),
        confidence: 0,
        validated: false,
      }));
    } else {
      // Default generic chain
      chain.steps = [
        { id: 1, type: "understand", prompt: `Understand the question: ${query}`, confidence: 0, validated: false },
        { id: 2, type: "retrieve", prompt: `Retrieve relevant knowledge for: ${query}`, confidence: 0, validated: false },
        { id: 3, type: "calculate", prompt: `Perform any necessary calculations for: ${query}`, confidence: 0, validated: false },
        { id: 4, type: "conclude", prompt: `Provide final answer for: ${query}`, confidence: 0, validated: false },
      ];
    }

    this.chains.set(chain.id, chain);
    return chain;
  }

  /**
   * Record step response
   */
  recordStepResponse(
    chainId: string,
    stepId: number,
    response: string,
    confidence: number,
    durationMs: number
  ): boolean {
    const chain = this.chains.get(chainId);
    if (!chain) return false;

    const step = chain.steps.find(s => s.id === stepId);
    if (!step) return false;

    step.response = response;
    step.confidence = confidence;
    step.duration_ms = durationMs;
    step.validated = confidence >= this.config.confidence_threshold;

    chain.total_duration_ms += durationMs;

    // Update chain status
    const allComplete = chain.steps.every(s => s.response !== undefined);
    if (allComplete) {
      chain.status = "complete";
      chain.overall_confidence = this.calculateOverallConfidence(chain);
      chain.final_answer = this.synthesizeFinalAnswer(chain);
    } else {
      chain.status = "running";
    }

    return true;
  }

  /**
   * Calculate overall chain confidence
   */
  private calculateOverallConfidence(chain: ReasoningChain): number {
    if (chain.steps.length === 0) return 0;

    // Geometric mean of step confidences
    const product = chain.steps.reduce((acc, s) => acc * Math.max(0.01, s.confidence), 1);
    return Math.pow(product, 1 / chain.steps.length);
  }

  /**
   * Synthesize final answer from chain
   */
  private synthesizeFinalAnswer(chain: ReasoningChain): string {
    const concludeStep = chain.steps.find(s => s.type === "conclude");
    if (concludeStep?.response) {
      return concludeStep.response;
    }

    // Fallback: use last step's response
    const lastStep = chain.steps[chain.steps.length - 1];
    return lastStep?.response || "";
  }

  /**
   * Get chain by ID
   */
  getChain(chainId: string): ReasoningChain | undefined {
    return this.chains.get(chainId);
  }

  /**
   * Get all chains
   */
  getAllChains(limit: number = 100): ReasoningChain[] {
    return Array.from(this.chains.values()).slice(-limit);
  }

  /**
   * Generate prompts for chain execution
   */
  generatePrompts(chainId: string): Array<{ stepId: number; prompt: string }> {
    const chain = this.chains.get(chainId);
    if (!chain) return [];

    return chain.steps
      .filter(s => !s.response)
      .map(s => ({
        stepId: s.id,
        prompt: this.buildStepPrompt(s, chain),
      }));
  }

  /**
   * Build context-aware step prompt
   */
  private buildStepPrompt(step: ReasoningStep, chain: ReasoningChain): string {
    const previousResponses = chain.steps
      .filter(s => s.id < step.id && s.response)
      .map(s => `[${s.type.toUpperCase()}]: ${s.response}`)
      .join("\n");

    if (previousResponses) {
      return `Previous reasoning:\n${previousResponses}\n\nCurrent step (${step.type}):\n${step.prompt}`;
    }

    return step.prompt;
  }

  /**
   * Validate reasoning chain
   */
  validateChain(chainId: string): {
    valid: boolean;
    issues: string[];
    suggestions: string[];
  } {
    const chain = this.chains.get(chainId);
    if (!chain) {
      return { valid: false, issues: ["Chain not found"], suggestions: [] };
    }

    const issues: string[] = [];
    const suggestions: string[] = [];

    // Check for low confidence steps
    for (const step of chain.steps) {
      if (step.confidence < this.config.confidence_threshold) {
        issues.push(`Step ${step.id} (${step.type}) has low confidence: ${(step.confidence * 100).toFixed(0)}%`);
        suggestions.push(`Consider reprompting step ${step.id} with more context`);
      }
    }

    // Check for missing validation
    const hasValidateStep = chain.steps.some(s => s.type === "validate");
    if (!hasValidateStep && this.config.enable_validation) {
      suggestions.push("Add a validation step to verify calculations");
    }

    // Check overall confidence
    if (chain.overall_confidence < this.config.confidence_threshold) {
      issues.push(`Overall confidence ${(chain.overall_confidence * 100).toFixed(0)}% below threshold`);
    }

    return {
      valid: issues.length === 0,
      issues,
      suggestions,
    };
  }

  /**
   * Get reasoning trace
   */
  getTrace(chainId: string): string {
    const chain = this.chains.get(chainId);
    if (!chain) return "Chain not found";

    const lines = [
      `# Reasoning Trace: ${chainId}`,
      `Query: ${chain.original_query}`,
      `Status: ${chain.status}`,
      `Overall Confidence: ${(chain.overall_confidence * 100).toFixed(0)}%`,
      `Duration: ${chain.total_duration_ms}ms`,
      ``,
      `## Steps`,
    ];

    for (const step of chain.steps) {
      lines.push(`### ${step.id}. ${step.type.toUpperCase()}`);
      lines.push(`**Prompt:** ${step.prompt}`);
      if (step.response) {
        lines.push(`**Response:** ${step.response}`);
        lines.push(`**Confidence:** ${(step.confidence * 100).toFixed(0)}%`);
        lines.push(`**Duration:** ${step.duration_ms}ms`);
      } else {
        lines.push(`**Status:** Pending`);
      }
      lines.push(``);
    }

    if (chain.final_answer) {
      lines.push(`## Final Answer`);
      lines.push(chain.final_answer);
    }

    return lines.join("\n");
  }

  /**
   * Mark chain as failed
   */
  markFailed(chainId: string, stepId: number, error: string): boolean {
    const chain = this.chains.get(chainId);
    if (!chain) return false;

    const step = chain.steps.find(s => s.id === stepId);
    if (step) {
      step.error = error;
      step.validated = false;
    }

    chain.status = "failed";
    return true;
  }

  /**
   * Delete chain
   */
  deleteChain(chainId: string): boolean {
    return this.chains.delete(chainId);
  }

  /**
   * Reset engine state
   */
  reset(): void {
    this.chains.clear();
    this.templates = [...CHAIN_TEMPLATES];
    this.config = DEFAULT_CONFIG;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const latheLoRAReasoningChainInferenceEngine = new LatheLoRAReasoningChainInferenceEngine();
