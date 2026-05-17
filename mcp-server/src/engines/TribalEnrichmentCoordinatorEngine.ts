/**
 * TribalEnrichmentCoordinatorEngine — U-P2PFS10
 *
 * Single unified engine for all P2P pipelines to fetch tribal knowledge,
 * playbook rules, and controller-specific tips in one call.
 *
 * Returns: { tribal_tips, playbook_rules, controller_tips, merged_advisory }
 *
 * Actions: wedm_tribal_enrich
 */

import type { KnowledgeTip } from "./TribalKnowledgeEngine.js";
import type { PlaybookRule } from "./MachiningPlaybookEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export type ProcessType = "wire_edm" | "sinker_edm" | "milling" | "turning" | "grinding" | "multi_axis";
export type ControllerType = "fanuc" | "sodick" | "makino" | "mitsubishi" | "agiecharmilles" | "siemens" | "haas" | "okuma" | "mazak";

export interface EnrichmentInput {
  process_type: ProcessType;
  material?: string;
  controller?: ControllerType;
  thickness_mm?: number;
  tolerance_mm?: number;
  surface_finish_Ra_um?: number;
  is_thin_wall?: boolean;
  hardness_hrc?: number;
}

export interface SimpleTip {
  id: string;
  title: string;
  body: string;
  confidence: number;
}

export interface SimpleRule {
  id: string;
  title: string;
  severity: string;
  rule: string;
}

export interface EnrichmentResult {
  tribal_tips: SimpleTip[];
  playbook_rules: SimpleRule[];
  controller_tips: SimpleTip[];
  merged_advisory: string;
  knowledge_sources: Array<{ source: string; type: string; count: number }>;
}

// ============================================================================
// CONTROLLER TAG MAPPING
// ============================================================================

const CONTROLLER_TAG_MAP: Record<ControllerType, string[]> = {
  fanuc: ["fanuc", "macro-b", "e-pack", "31i", "0i"],
  sodick: ["sodick", "edm", "wire-edm", "ln-professional", "awt"],
  makino: ["makino", "hyper-i", "pro6", "sgi"],
  mitsubishi: ["mitsubishi", "wire-edm", "m70", "m800", "m80"],
  agiecharmilles: ["agie", "charmilles", "cut-series", "ispg"],
  siemens: ["siemens", "sinumerik", "840d"],
  haas: ["haas", "ngc", "next-generation"],
  okuma: ["okuma", "osp", "p300", "thinc"],
  mazak: ["mazak", "mazatrol", "smooth"],
};

// ============================================================================
// ENRICHMENT FUNCTIONS
// ============================================================================

async function fetchTribalTips(input: EnrichmentInput): Promise<SimpleTip[]> {
  try {
    const { tribalKnowledgeEngine } = await import("./TribalKnowledgeEngine.js");
    const tips = tribalKnowledgeEngine.search({
      operation_type: input.process_type,
      material_iso_group: input.material,
      min_confidence: 75,
      limit: 5,
    });
    return tips.map((t: KnowledgeTip) => ({
      id: t.id,
      title: t.title,
      body: t.body,
      confidence: t.confidence ?? 80,
    }));
  } catch {
    return [];
  }
}

async function fetchPlaybookRules(input: EnrichmentInput): Promise<SimpleRule[]> {
  try {
    const { machiningPlaybookEngine } = await import("./MachiningPlaybookEngine.js");
    // PlaybookQuery accepts material_iso + operation_type; the prior call wrote four
    // non-canonical fields (process/depth_of_cut_mm/tool_diameter_mm/thin_wall) that
    // never reached the matcher. Drop them — behavior is unchanged, types now satisfied.
    // (Per [[reference_tribal_enrichment_engine_bug]]: a richer semantic redesign would
    // map thin-wall and depth-ratio into Condition[], but that is out of scope here.)
    const advice = machiningPlaybookEngine.advise({
      operation_type: input.process_type,
      material_iso: input.material,
    });
    return advice.rules.slice(0, 5).map((r: PlaybookRule) => ({
      id: r.id,
      title: r.title,
      severity: r.severity,
      rule: r.rule,
    }));
  } catch {
    return [];
  }
}

async function fetchControllerTips(controller: ControllerType | undefined): Promise<SimpleTip[]> {
  if (!controller) return [];

  try {
    const { CONTROLLER_KNOWLEDGE_TIPS } = await import("../data/controller-knowledge-tips.js");
    const targetTags = CONTROLLER_TAG_MAP[controller] ?? [];
    if (targetTags.length === 0) return [];

    const filtered = CONTROLLER_KNOWLEDGE_TIPS.filter(
      (tip: { tags: string[]; title: string; body: string }) => {
        const tipTags = tip.tags ?? [];
        return targetTags.some(t => tipTags.includes(t));
      }
    );

    return filtered.slice(0, 5).map(
      (tip: { id: string; title: string; body: string; confidence: number }) => ({
        id: tip.id,
        title: tip.title,
        body: tip.body,
        confidence: tip.confidence ?? 85,
      })
    );
  } catch {
    return [];
  }
}

function buildMergedAdvisory(
  tribal: SimpleTip[],
  playbook: SimpleRule[],
  controller: SimpleTip[],
  input: EnrichmentInput
): string {
  const lines: string[] = [];

  lines.push(`=== TRIBAL ENRICHMENT ADVISORY ===`);
  lines.push(`Process: ${input.process_type.toUpperCase()}`);
  if (input.material) lines.push(`Material: ${input.material}`);
  if (input.controller) lines.push(`Controller: ${input.controller}`);
  lines.push("");

  if (tribal.length > 0) {
    lines.push("--- TRIBAL KNOWLEDGE (Shop Floor Experience) ---");
    for (const tip of tribal) {
      lines.push(`• [${tip.id}] ${tip.title} (${tip.confidence}% confidence)`);
    }
    lines.push("");
  }

  if (playbook.length > 0) {
    lines.push("--- PLAYBOOK RULES (Best Practices) ---");
    for (const rule of playbook) {
      lines.push(`• [${rule.severity.toUpperCase()}] ${rule.title}`);
    }
    lines.push("");
  }

  if (controller.length > 0) {
    lines.push("--- CONTROLLER TIPS (Programming) ---");
    for (const tip of controller) {
      lines.push(`• [${tip.id}] ${tip.title}`);
    }
    lines.push("");
  }

  if (tribal.length === 0 && playbook.length === 0 && controller.length === 0) {
    lines.push("No relevant knowledge found for this configuration.");
  }

  return lines.join("\n");
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class TribalEnrichmentCoordinatorEngine {
  /**
   * Unified tribal enrichment for P2P pipelines.
   * Returns tribal tips, playbook rules, controller tips, and merged advisory.
   */
  async enrich(input: EnrichmentInput): Promise<EnrichmentResult> {
    const [tribal, playbook, controller] = await Promise.all([
      fetchTribalTips(input),
      fetchPlaybookRules(input),
      fetchControllerTips(input.controller),
    ]);

    const merged = buildMergedAdvisory(tribal, playbook, controller, input);

    const knowledgeSources: Array<{ source: string; type: string; count: number }> = [];
    if (tribal.length > 0) {
      knowledgeSources.push({ source: "Tribal Knowledge Database", type: "shop_experience", count: tribal.length });
    }
    if (playbook.length > 0) {
      knowledgeSources.push({ source: "Machining Playbook", type: "best_practices", count: playbook.length });
    }
    if (controller.length > 0) {
      knowledgeSources.push({ source: "Controller Knowledge", type: "controller_specific", count: controller.length });
    }

    return {
      tribal_tips: tribal,
      playbook_rules: playbook,
      controller_tips: controller,
      merged_advisory: merged,
      knowledge_sources: knowledgeSources,
    };
  }

  /**
   * Quick check if any knowledge exists for a configuration.
   */
  async hasKnowledge(input: EnrichmentInput): Promise<boolean> {
    const result = await this.enrich(input);
    return (
      result.tribal_tips.length > 0 ||
      result.playbook_rules.length > 0 ||
      result.controller_tips.length > 0
    );
  }

  /**
   * Get just tribal tips without playbook/controller.
   */
  async getTribalOnly(input: EnrichmentInput): Promise<SimpleTip[]> {
    return fetchTribalTips(input);
  }

  /**
   * Get just playbook rules without tribal/controller.
   */
  async getPlaybookOnly(input: EnrichmentInput): Promise<SimpleRule[]> {
    return fetchPlaybookRules(input);
  }

  /**
   * Get just controller tips.
   */
  async getControllerOnly(controller: ControllerType): Promise<SimpleTip[]> {
    return fetchControllerTips(controller);
  }
}

export const tribalEnrichmentCoordinatorEngine = new TribalEnrichmentCoordinatorEngine();
