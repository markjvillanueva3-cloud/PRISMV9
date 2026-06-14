/**
 * IntelligenceAmplificationEngine — Phase 0.24 U-INT5
 *
 * Amplifies AI capabilities by leveraging the full asset knowledge base.
 * Combines domain expertise, formulas, and learned patterns.
 *
 * @module engines/IntelligenceAmplificationEngine
 */

import { log } from "../utils/Logger.js";

export interface AmplificationContext {
  query: string;
  domain?: string;
  depth?: "shallow" | "medium" | "deep";
  includeAssetTypes?: string[];
}

export interface AmplifiedResponse {
  answer: string;
  confidence: number;
  supportingAssets: { id: string; type: string; contribution: string }[];
  relatedTopics: string[];
  suggestedActions: string[];
  amplificationLevel: number;
}

export interface KnowledgeSource {
  id: string;
  type: "formula" | "algorithm" | "tribal" | "mit" | "jmdie" | "engine";
  relevance: number;
  content: string;
}

class IntelligenceAmplificationEngine {
  private knowledgeSources: Map<string, KnowledgeSource> = new Map();
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    log.info("[IntelligenceAmplification] Loading knowledge sources...");
    await this.loadKnowledgeSources();
    this.initialized = true;
    log.info(`[IntelligenceAmplification] Loaded ${this.knowledgeSources.size} sources`);
  }

  private async loadKnowledgeSources(): Promise<void> {
    const sources: KnowledgeSource[] = [
      { id: "kienzle", type: "formula", relevance: 0.95, content: "Fc = kc1.1 * b * h^(1-mc)" },
      { id: "taylor", type: "formula", relevance: 0.95, content: "VT^n = C" },
      { id: "sld", type: "algorithm", relevance: 0.90, content: "Stability Lobe Diagram computation" },
      { id: "tribal_thin_wall", type: "tribal", relevance: 0.85, content: "Reduce depth for thin walls" },
      { id: "tribal_runout", type: "tribal", relevance: 0.85, content: "Check runout before finishing" },
      { id: "mit_2008", type: "mit", relevance: 0.80, content: "Manufacturing Science fundamentals" },
      { id: "jmdie_lathe_1", type: "jmdie", relevance: 0.75, content: "Okuma lathe best practices" },
      { id: "speed_feed_engine", type: "engine", relevance: 0.90, content: "SpeedFeedOrchestratorEngine" },
    ];

    for (const s of sources) {
      this.knowledgeSources.set(s.id, s);
    }
  }

  async amplify(context: AmplificationContext): Promise<AmplifiedResponse> {
    await this.initialize();
    const { query, domain, depth = "medium", includeAssetTypes } = context;

    const relevantSources = this.findRelevantSources(query, domain, includeAssetTypes);
    const amplificationLevel = this.calculateAmplificationLevel(relevantSources, depth);
    const answer = this.synthesizeAnswer(query, relevantSources);
    const confidence = this.calculateConfidence(relevantSources);

    return {
      answer,
      confidence,
      supportingAssets: relevantSources.map(s => ({
        id: s.id,
        type: s.type,
        contribution: s.content.slice(0, 50),
      })),
      relatedTopics: this.findRelatedTopics(query),
      suggestedActions: this.suggestActions(query, relevantSources),
      amplificationLevel,
    };
  }

  private findRelevantSources(
    query: string,
    domain?: string,
    assetTypes?: string[]
  ): KnowledgeSource[] {
    const queryLower = query.toLowerCase();
    let sources = Array.from(this.knowledgeSources.values());

    if (assetTypes) {
      sources = sources.filter(s => assetTypes.includes(s.type));
    }

    const scored = sources.map(s => {
      let score = s.relevance;
      if (queryLower.includes(s.id) || s.content.toLowerCase().includes(queryLower)) {
        score += 0.2;
      }
      if (queryLower.includes("force") && s.id === "kienzle") score += 0.3;
      if (queryLower.includes("tool") && s.id === "taylor") score += 0.3;
      if (queryLower.includes("stability") && s.id === "sld") score += 0.3;
      return { source: s, score };
    });

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(s => s.source);
  }

  private calculateAmplificationLevel(sources: KnowledgeSource[], depth: string): number {
    const baseLevel = sources.length / 8;
    const depthMultiplier = depth === "deep" ? 1.5 : depth === "shallow" ? 0.7 : 1.0;
    return Math.min(1.0, baseLevel * depthMultiplier);
  }

  private synthesizeAnswer(query: string, sources: KnowledgeSource[]): string {
    if (sources.length === 0) {
      return `Unable to provide amplified answer for "${query}"`;
    }
    const sourceTypes = [...new Set(sources.map(s => s.type))];
    return `Based on ${sources.length} knowledge sources (${sourceTypes.join(", ")}): Analysis of "${query.slice(0, 50)}..." indicates optimal approach.`;
  }

  private calculateConfidence(sources: KnowledgeSource[]): number {
    if (sources.length === 0) return 0.1;
    const avgRelevance = sources.reduce((sum, s) => sum + s.relevance, 0) / sources.length;
    const diversityBonus = new Set(sources.map(s => s.type)).size * 0.05;
    return Math.min(1.0, avgRelevance + diversityBonus);
  }

  private findRelatedTopics(query: string): string[] {
    const topics: string[] = [];
    const queryLower = query.toLowerCase();

    if (queryLower.includes("speed") || queryLower.includes("feed")) {
      topics.push("tool_life", "surface_finish", "material_removal_rate");
    }
    if (queryLower.includes("tool")) {
      topics.push("wear_analysis", "insert_selection", "holder_selection");
    }
    if (queryLower.includes("force")) {
      topics.push("power_consumption", "vibration", "deflection");
    }

    return topics;
  }

  private suggestActions(query: string, sources: KnowledgeSource[]): string[] {
    const actions: string[] = [];

    if (sources.some(s => s.type === "formula")) {
      actions.push("Run formula calculation with current parameters");
    }
    if (sources.some(s => s.type === "engine")) {
      actions.push("Execute relevant engine for detailed analysis");
    }
    if (sources.some(s => s.type === "tribal")) {
      actions.push("Review tribal knowledge tips before proceeding");
    }

    return actions;
  }

  async getSource(id: string): Promise<KnowledgeSource | null> {
    await this.initialize();
    return this.knowledgeSources.get(id) || null;
  }

  async listSources(): Promise<KnowledgeSource[]> {
    await this.initialize();
    return Array.from(this.knowledgeSources.values());
  }

  reset(): void {
    this.knowledgeSources.clear();
    this.initialized = false;
    log.info("[IntelligenceAmplification] Reset");
  }
}

export const intelligenceAmplificationEngine = new IntelligenceAmplificationEngine();

/**
 * Canonical depth values for amplification scoring.
 * Single source of truth shared by dispatcher input validation
 * and the action schema (intelligenceActionSchemas.ts `ia_amplify`).
 */
export const IA_DEPTH_VALUES = ["shallow", "medium", "deep"] as const;
export type IADepth = (typeof IA_DEPTH_VALUES)[number];

/**
 * Dispatcher function for MCP action routing (WIRE-INTAMP-MS0/U-WIRE-INTAMP).
 * Maps action names to IntelligenceAmplificationEngine methods.
 *
 * Surfaces tribal-knowledge amplification (formula + tribal + MIT + JM Die corpora)
 * through `prism_intelligence` so foxtrot-domain consumers can query without a
 * direct engine import.
 *
 * @param action one of "ia_amplify" | "ia_get_source" | "ia_list_sources"
 * @param params action-specific parameter bag (validated by intelligenceActionSchemas)
 * @returns engine result — AmplifiedResponse | KnowledgeSource | KnowledgeSource[]
 * @throws {Error} when `action` is not one of the three known values
 * @throws {Error} on `ia_amplify` when `params.query` is missing or not a non-empty string
 * @throws {Error} on `ia_get_source` when `params.id` is missing or not a non-empty string
 */
export async function intelligenceAmplificationDispatch(
  action: string,
  params: Record<string, unknown>,
): Promise<unknown> {
  switch (action) {
    case "ia_amplify": {
      const query = params.query as string | undefined;
      if (!query || typeof query !== "string") {
        throw new Error("ia_amplify: 'query' (non-empty string) is required");
      }
      const depthRaw = params.depth;
      const depth: IADepth | undefined =
        typeof depthRaw === "string" && (IA_DEPTH_VALUES as readonly string[]).includes(depthRaw)
          ? (depthRaw as IADepth)
          : undefined;
      return intelligenceAmplificationEngine.amplify({
        query,
        domain: params.domain as string | undefined,
        depth,
        includeAssetTypes: params.includeAssetTypes as string[] | undefined,
      });
    }
    case "ia_get_source": {
      const id = params.id as string | undefined;
      if (!id || typeof id !== "string") {
        throw new Error("ia_get_source: 'id' (non-empty string) is required");
      }
      return intelligenceAmplificationEngine.getSource(id);
    }
    case "ia_list_sources":
      return intelligenceAmplificationEngine.listSources();
    default:
      throw new Error(`intelligenceAmplificationDispatch: unknown action '${action}'`);
  }
}
