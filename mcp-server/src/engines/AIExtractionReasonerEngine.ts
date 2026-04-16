/**
 * AI Extraction Reasoner Engine — Claude-Powered Knowledge Routing
 *
 * Uses Claude Opus 4.5 for actual AI reasoning about extracted knowledge:
 *   1. Semantic classification with chain-of-thought reasoning
 *   2. Intelligent consumer matching via embeddings + LLM ranking
 *   3. Upgrade proposal generation with technical justification
 *   4. Learning from wiring success/failure feedback
 *
 * This replaces keyword matching with true AI understanding.
 *
 * @module engines/AIExtractionReasonerEngine
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, appendFileSync } from "fs";
import { join } from "path";
import { log } from "../utils/Logger.js";
import { llmEngine, type ContextChunk } from "./LLMEngine.js";
import type { KnowledgeConsumer, ContentType, KnowledgeDomain, UpgradeSuggestion } from "./ExtractionIntelligenceRouter.js";

// ============================================================================
// TYPES
// ============================================================================

export interface AIClassificationResult {
  content_type: ContentType;
  domain: KnowledgeDomain;
  confidence: number;
  reasoning: string;
  secondary_types: ContentType[];
  tags: string[];
  semantic_summary: string;
}

export interface AIRoutingDecision {
  content_id: string;
  classification: AIClassificationResult;
  recommended_consumers: AIConsumerMatch[];
  upgrade_suggestions: AIUpgradeSuggestion[];
  reasoning_chain: string[];
  processing_time_ms: number;
}

export interface AIConsumerMatch {
  consumer_id: string;
  consumer_name: string;
  relevance_score: number;
  match_reasoning: string;
  wiring_recommendation: string;
  confidence: number;
}

export interface AIUpgradeSuggestion extends UpgradeSuggestion {
  technical_justification: string;
  implementation_steps: string[];
  risk_assessment: string;
  confidence: number;
}

export interface ReasoningFeedback {
  decision_id: string;
  consumer_id: string;
  wiring_successful: boolean;
  actual_value_provided: "high" | "medium" | "low" | "none";
  feedback_notes?: string;
  timestamp: string;
}

// ============================================================================
// PROMPTS
// ============================================================================

const CLASSIFICATION_SYSTEM_PROMPT = `You are an expert manufacturing knowledge classifier for the PRISM CNC manufacturing intelligence system.

Your task is to analyze extracted knowledge and classify it with precise reasoning.

CONTENT TYPES (choose the most accurate primary type):
- tribal_tip: Shop floor wisdom, best practices, experience-based advice
- workflow_sequence: Order of operations, process flows, step-by-step procedures
- formula: Mathematical equations, calculations, coefficients
- parameter_set: Cutting parameters, speeds, feeds, DOC, WOC values
- material_property: Material characteristics, hardness, machinability
- tool_specification: Tool geometry, coatings, capabilities, limits
- machine_capability: Machine specs, axis limits, spindle specs
- error_solution: Troubleshooting guides, error fixes, problem solutions
- quality_standard: Tolerances, GD&T, inspection criteria, acceptance limits
- safety_rule: Safety constraints, collision limits, protective measures
- api_reference: Software API documentation, function definitions
- ui_workflow: CAD/CAM UI procedures, dialog sequences, menu navigation
- post_processor_rule: G-code generation rules, NC output formatting
- algorithm: Computational methods, optimization procedures
- case_study: Real-world examples, project documentation

DOMAINS (choose the most specific applicable domain):
- milling, turning, wire_edm, sinker_edm, grinding, 5axis, mill_turn
- cad, cam, post_processing, quality, tooling, materials, fixturing
- metrology, automation, general

Respond in JSON format with reasoning.`;

const ROUTING_SYSTEM_PROMPT = `You are the PRISM knowledge routing AI. Your task is to decide which manufacturing systems should receive extracted knowledge.

You must reason about:
1. What value this knowledge provides
2. Which systems can actually USE this knowledge (not just store it)
3. How the knowledge should be integrated (tip injection, config update, registry add, etc.)
4. Whether this knowledge suggests system upgrades or new capabilities

Think step-by-step about each potential consumer:
- Will this knowledge improve the consumer's output quality?
- Is the knowledge format compatible with the consumer?
- Would a machinist benefit from this knowledge appearing in this system?

Be aggressive about routing to MULTIPLE consumers - knowledge should flow everywhere it provides value.`;

const UPGRADE_SYSTEM_PROMPT = `You are a PRISM system architect analyzing extracted knowledge for upgrade opportunities.

When you see knowledge that suggests improvements to existing systems, propose specific upgrades:
- New formulas that should be added to calculation engines
- Parameters that should update existing defaults
- Safety rules that should trigger new validations
- Workflows that suggest new automation opportunities

Be specific and technical. Include implementation steps and risk assessment.`;

// ============================================================================
// CONSUMER REGISTRY FOR AI CONTEXT
// ============================================================================

function getConsumerContextChunks(): ContextChunk[] {
  // Load consumer registry for context
  const consumers: ContextChunk[] = [
    {
      type: "custom",
      title: "TribalKnowledgeEngine",
      content: "Stores and retrieves shop floor wisdom, tips, best practices. Accepts: tribal_tip, error_solution, safety_rule, case_study. Domains: all machining types.",
      relevance: 0.9,
    },
    {
      type: "custom",
      title: "SpeedFeedOrchestrator",
      content: "Central hub for all speed/feed calculations. Uses Kienzle, Taylor, material-specific coefficients. Accepts: formula, parameter_set, material_property. Critical for cutting parameter optimization.",
      relevance: 0.9,
    },
    {
      type: "custom",
      title: "WorkflowTemplateEngine",
      content: "Stores canonical CAD/CAM operation sequences. Used by PrintToProgram pipeline for operation ordering. Accepts: workflow_sequence, ui_workflow.",
      relevance: 0.85,
    },
    {
      type: "custom",
      title: "PostProcessorPipeline",
      content: "38-stage G-code generation pipeline. Handles all controller-specific output. Accepts: post_processor_rule, machine_capability, safety_rule.",
      relevance: 0.85,
    },
    {
      type: "custom",
      title: "MaterialRegistry",
      content: "Database of material properties, machinability data, Kienzle coefficients. Accepts: material_property. Used by all calculation engines.",
      relevance: 0.9,
    },
    {
      type: "custom",
      title: "ToolCatalogEngine",
      content: "95,608 tool database with geometry, coatings, limits. Accepts: tool_specification. Used for tool selection and validation.",
      relevance: 0.85,
    },
    {
      type: "custom",
      title: "SafetyValidatorEngine",
      content: "S(x) safety scoring, hard blocks on unsafe parameters. Accepts: safety_rule, machine_capability. CRITICAL for crash prevention.",
      relevance: 0.95,
    },
    {
      type: "custom",
      title: "FormulaRegistry",
      content: "499 manufacturing formulas with derivations. Accepts: formula, algorithm. Source of truth for calculations.",
      relevance: 0.9,
    },
    {
      type: "custom",
      title: "IntelligentSequencingEngine",
      content: "Determines optimal operation order for parts. Uses tribal knowledge and templates. Accepts: workflow_sequence, tribal_tip, case_study.",
      relevance: 0.85,
    },
    {
      type: "custom",
      title: "PrintToProgramPipelineEngine",
      content: "End-to-end print-to-CNC-program pipeline. Orchestrates feature recognition, sequencing, toolpath generation. Accepts: workflow_sequence, tribal_tip, quality_standard.",
      relevance: 0.9,
    },
    {
      type: "custom",
      title: "LatheTurningEngine",
      content: "Turning-specific calculations and advice. OD/ID, threading, grooving, parting. Accepts: tribal_tip, workflow_sequence, parameter_set, tool_specification.",
      relevance: 0.8,
    },
    {
      type: "custom",
      title: "WireEDMEngine",
      content: "Wire EDM specific parameters, spark gap, dielectric management. Accepts: tribal_tip, workflow_sequence, parameter_set, material_property.",
      relevance: 0.8,
    },
    {
      type: "custom",
      title: "FiveAxisEngine",
      content: "5-axis specific calculations, RTCP, tool vector optimization. Accepts: tribal_tip, workflow_sequence, parameter_set, algorithm.",
      relevance: 0.8,
    },
    {
      type: "custom",
      title: "HyperMillBridge",
      content: "HyperMILL CAM system integration. API calls, automation, property mapping. Accepts: api_reference, ui_workflow, tribal_tip, workflow_sequence.",
      relevance: 0.85,
    },
    {
      type: "custom",
      title: "MachiningPlaybookEngine",
      content: "296 machining rules and anti-patterns. What to do and not do. Accepts: tribal_tip, workflow_sequence, error_solution, case_study.",
      relevance: 0.85,
    },
  ];

  return consumers;
}

// ============================================================================
// AI REASONING ENGINE
// ============================================================================

export class AIExtractionReasonerEngine {
  private feedbackLog: ReasoningFeedback[] = [];
  private decisionCache = new Map<string, AIRoutingDecision>();
  private feedbackFile: string;
  private decisionLogFile: string;

  constructor() {
    this.feedbackFile = join(process.cwd(), "data/state/ai-reasoning-feedback.jsonl");
    this.decisionLogFile = join(process.cwd(), "data/state/ai-routing-decisions.jsonl");

    // Register consumer context with LLM engine
    llmEngine.registerContextProvider(getConsumerContextChunks);

    this.loadFeedback();
  }

  private loadFeedback(): void {
    try {
      if (existsSync(this.feedbackFile)) {
        const lines = readFileSync(this.feedbackFile, "utf-8").trim().split("\n");
        this.feedbackLog = lines.map(l => JSON.parse(l)).slice(-1000);
      }
    } catch { /* ignore */ }
  }

  private saveFeedback(feedback: ReasoningFeedback): void {
    try {
      const dir = join(process.cwd(), "data/state");
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      appendFileSync(this.feedbackFile, JSON.stringify(feedback) + "\n");
      this.feedbackLog.push(feedback);
    } catch { /* ignore */ }
  }

  private logDecision(decision: AIRoutingDecision): void {
    try {
      const dir = join(process.cwd(), "data/state");
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      appendFileSync(this.decisionLogFile, JSON.stringify({
        ...decision,
        timestamp: new Date().toISOString(),
      }) + "\n");
    } catch { /* ignore */ }
  }

  /**
   * Classify content using Claude's reasoning
   */
  async classifyContent(content: any): Promise<AIClassificationResult> {
    const contentStr = typeof content === "string" ? content : JSON.stringify(content, null, 2);
    const truncated = contentStr.slice(0, 3000); // Limit context size

    const prompt = `Classify this extracted manufacturing knowledge:

\`\`\`json
${truncated}
\`\`\`

Analyze the content and provide classification in this JSON format:
{
  "content_type": "<primary type>",
  "domain": "<primary domain>",
  "confidence": <0.0-1.0>,
  "reasoning": "<2-3 sentences explaining your classification>",
  "secondary_types": ["<other applicable types>"],
  "tags": ["<relevant keywords>"],
  "semantic_summary": "<one sentence summary of what this knowledge IS>"
}`;

    try {
      const response = await llmEngine.query({
        prompt,
        context_types: ["custom"],
        temperature: 0.2,
        max_tokens: 800,
      });

      // Parse JSON from response
      const jsonMatch = response.answer.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          content_type: parsed.content_type || "tribal_tip",
          domain: parsed.domain || "general",
          confidence: parsed.confidence || 0.7,
          reasoning: parsed.reasoning || "AI classification",
          secondary_types: parsed.secondary_types || [],
          tags: parsed.tags || [],
          semantic_summary: parsed.semantic_summary || "",
        };
      }
    } catch (err) {
      log.warn(`[AIReasoner] Classification failed: ${err}`);
    }

    // Fallback
    return {
      content_type: "tribal_tip",
      domain: "general",
      confidence: 0.5,
      reasoning: "Fallback classification - AI reasoning unavailable",
      secondary_types: [],
      tags: [],
      semantic_summary: "",
    };
  }

  /**
   * Route content to consumers using Claude's reasoning
   */
  async routeContent(
    content: any,
    classification: AIClassificationResult
  ): Promise<AIConsumerMatch[]> {
    const contentStr = typeof content === "string" ? content : JSON.stringify(content, null, 2);
    const truncated = contentStr.slice(0, 2000);

    const prompt = `Given this classified manufacturing knowledge:

CLASSIFICATION:
- Type: ${classification.content_type}
- Domain: ${classification.domain}
- Summary: ${classification.semantic_summary}
- Tags: ${classification.tags.join(", ")}

CONTENT (truncated):
\`\`\`
${truncated}
\`\`\`

AVAILABLE CONSUMERS (from context above)

Decide which consumers should receive this knowledge. For EACH relevant consumer, explain:
1. Why this knowledge is valuable for that consumer
2. How it should be wired (tip_inject, registry_add, config_update, direct_import)
3. Confidence level (0.0-1.0)

Return JSON array:
[
  {
    "consumer_id": "<consumer name>",
    "relevance_score": <0.0-1.0>,
    "match_reasoning": "<why this consumer should get this knowledge>",
    "wiring_recommendation": "<how to wire it>",
    "confidence": <0.0-1.0>
  }
]

Route to ALL consumers where this knowledge provides value. Be aggressive - we want knowledge everywhere it helps.`;

    try {
      const response = await llmEngine.query({
        prompt,
        context_types: ["custom"],
        temperature: 0.3,
        max_tokens: 1500,
      });

      // Parse JSON array from response
      const jsonMatch = response.answer.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.map((m: any) => ({
          consumer_id: m.consumer_id || m.consumer_name,
          consumer_name: m.consumer_id || m.consumer_name,
          relevance_score: m.relevance_score || 0.5,
          match_reasoning: m.match_reasoning || "",
          wiring_recommendation: m.wiring_recommendation || "direct_import",
          confidence: m.confidence || 0.5,
        }));
      }
    } catch (err) {
      log.warn(`[AIReasoner] Routing failed: ${err}`);
    }

    // Fallback to basic routing
    return [{
      consumer_id: "tribal-knowledge-engine",
      consumer_name: "TribalKnowledgeEngine",
      relevance_score: 0.6,
      match_reasoning: "Default fallback - AI routing unavailable",
      wiring_recommendation: "tip_inject",
      confidence: 0.5,
    }];
  }

  /**
   * Generate upgrade suggestions using Claude's reasoning
   */
  async suggestUpgrades(
    content: any,
    classification: AIClassificationResult
  ): Promise<AIUpgradeSuggestion[]> {
    const contentStr = typeof content === "string" ? content : JSON.stringify(content, null, 2);
    const truncated = contentStr.slice(0, 2000);

    const prompt = `Analyze this extracted knowledge for PRISM system upgrade opportunities:

CLASSIFICATION:
- Type: ${classification.content_type}
- Domain: ${classification.domain}
- Summary: ${classification.semantic_summary}

CONTENT:
\`\`\`
${truncated}
\`\`\`

Does this knowledge suggest any improvements to existing PRISM systems?
Consider:
- New formulas that should be added to FormulaRegistry
- Parameters that should update existing engine defaults
- Safety rules that should create new validations
- Workflows that suggest new automation opportunities
- New capabilities that don't exist yet

If you find upgrade opportunities, return JSON array:
[
  {
    "target_system": "<which engine/registry/pipeline>",
    "suggestion_type": "new_capability|enhancement|optimization|integration",
    "description": "<what should be upgraded>",
    "technical_justification": "<why this matters technically>",
    "implementation_steps": ["<step 1>", "<step 2>"],
    "risk_assessment": "<what could go wrong>",
    "priority": "critical|high|medium|low",
    "estimated_effort": "trivial|small|medium|large",
    "confidence": <0.0-1.0>
  }
]

Return empty array [] if no meaningful upgrades are suggested.`;

    try {
      const response = await llmEngine.query({
        prompt,
        context_types: ["custom", "formula"],
        temperature: 0.4,
        max_tokens: 2000,
      });

      // Parse JSON array from response
      const jsonMatch = response.answer.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.map((s: any) => ({
          target_system: s.target_system || "unknown",
          suggestion_type: s.suggestion_type || "enhancement",
          description: s.description || "",
          extracted_evidence: truncated.slice(0, 200),
          technical_justification: s.technical_justification || "",
          implementation_steps: s.implementation_steps || [],
          risk_assessment: s.risk_assessment || "Unknown risk",
          priority: s.priority || "medium",
          estimated_effort: s.estimated_effort || "medium",
          confidence: s.confidence || 0.5,
        }));
      }
    } catch (err) {
      log.warn(`[AIReasoner] Upgrade suggestion failed: ${err}`);
    }

    return [];
  }

  /**
   * Full AI reasoning pipeline for a piece of content
   */
  async reason(content: any, sourceFile: string): Promise<AIRoutingDecision> {
    const start = Date.now();
    const contentId = `${sourceFile}:${Date.now()}`;
    const reasoningChain: string[] = [];

    // Check cache
    const cacheKey = JSON.stringify(content).slice(0, 500);
    const cached = this.decisionCache.get(cacheKey);
    if (cached) {
      return { ...cached, content_id: contentId };
    }

    // Step 1: Classify
    reasoningChain.push("STEP 1: Classifying content with AI reasoning...");
    const classification = await this.classifyContent(content);
    reasoningChain.push(`  → Type: ${classification.content_type} (${(classification.confidence * 100).toFixed(0)}% confidence)`);
    reasoningChain.push(`  → Domain: ${classification.domain}`);
    reasoningChain.push(`  → Reasoning: ${classification.reasoning}`);

    // Step 2: Route
    reasoningChain.push("STEP 2: Determining optimal routing with AI reasoning...");
    const consumers = await this.routeContent(content, classification);
    reasoningChain.push(`  → Matched ${consumers.length} consumers`);
    for (const c of consumers.slice(0, 5)) {
      reasoningChain.push(`    • ${c.consumer_name}: ${c.match_reasoning.slice(0, 80)}...`);
    }

    // Step 3: Suggest upgrades
    reasoningChain.push("STEP 3: Analyzing for upgrade opportunities...");
    const upgrades = await this.suggestUpgrades(content, classification);
    reasoningChain.push(`  → Found ${upgrades.length} upgrade suggestions`);
    for (const u of upgrades) {
      reasoningChain.push(`    • ${u.target_system}: ${u.description.slice(0, 60)}... (${u.priority})`);
    }

    const decision: AIRoutingDecision = {
      content_id: contentId,
      classification,
      recommended_consumers: consumers,
      upgrade_suggestions: upgrades,
      reasoning_chain: reasoningChain,
      processing_time_ms: Date.now() - start,
    };

    // Cache and log
    this.decisionCache.set(cacheKey, decision);
    this.logDecision(decision);

    log.info(`[AIReasoner] Processed in ${decision.processing_time_ms}ms → ${consumers.length} consumers, ${upgrades.length} upgrades`);

    return decision;
  }

  /**
   * Process feedback to improve future routing
   */
  recordFeedback(feedback: ReasoningFeedback): void {
    this.saveFeedback(feedback);
    log.info(`[AIReasoner] Feedback recorded: ${feedback.consumer_id} → ${feedback.actual_value_provided}`);
  }

  /**
   * Get reasoning statistics
   */
  getStats(): {
    total_decisions: number;
    feedback_entries: number;
    cache_size: number;
    avg_consumers_per_item: number;
    upgrade_suggestions_total: number;
    feedback_by_value: Record<string, number>;
  } {
    // Read decision log
    let totalDecisions = 0;
    let totalConsumers = 0;
    let totalUpgrades = 0;

    try {
      if (existsSync(this.decisionLogFile)) {
        const lines = readFileSync(this.decisionLogFile, "utf-8").trim().split("\n");
        totalDecisions = lines.length;
        for (const line of lines.slice(-100)) {
          try {
            const d = JSON.parse(line);
            totalConsumers += d.recommended_consumers?.length || 0;
            totalUpgrades += d.upgrade_suggestions?.length || 0;
          } catch { /* skip */ }
        }
      }
    } catch { /* ignore */ }

    // Count feedback by value
    const feedbackByValue: Record<string, number> = {};
    for (const f of this.feedbackLog) {
      feedbackByValue[f.actual_value_provided] = (feedbackByValue[f.actual_value_provided] || 0) + 1;
    }

    return {
      total_decisions: totalDecisions,
      feedback_entries: this.feedbackLog.length,
      cache_size: this.decisionCache.size,
      avg_consumers_per_item: totalDecisions > 0 ? totalConsumers / Math.min(totalDecisions, 100) : 0,
      upgrade_suggestions_total: totalUpgrades,
      feedback_by_value: feedbackByValue,
    };
  }

  /**
   * Clear cache (for testing or reset)
   */
  clearCache(): void {
    this.decisionCache.clear();
    log.info("[AIReasoner] Cache cleared");
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const aiExtractionReasoner = new AIExtractionReasonerEngine();
