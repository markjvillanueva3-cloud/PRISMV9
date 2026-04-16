/**
 * PPScenarioTemplateLibraryEngine — PP-AGI Proven Templates
 *
 * Catalog of known-good machining scenarios (controller + machine +
 * material + toolpath + tool) that have been validated in production.
 * Serves as the reference library for the advisor to recommend
 * proven approaches when confidence is needed.
 *
 * Each template encodes:
 *   - The complete scenario spec
 *   - Operation metadata (part type, industry, etc.)
 *   - Validation source (JM DIE program, shop feedback, vendor guide)
 *   - Performance metrics (cycle time, tool life, surface finish)
 *   - Fused embedding vector for similarity search
 *
 * @module PPScenarioTemplateLibraryEngine
 */

import { ppMultiModalFusionEngine, type ScenarioInput } from "./PPMultiModalFusionEngine.js";
import { ppToolpathStrategyEncoderEngine, type ToolpathSpec } from "./PPToolpathStrategyEncoderEngine.js";
import { ppCuttingToolEncoderEngine, type ToolSpec } from "./PPCuttingToolEncoderEngine.js";

// ── Types ─────────────────────────────────────────────────────────────

export interface ScenarioTemplate {
  id: string;
  label: string;
  scenario: ScenarioInput;
  tool?: ToolSpec;
  toolpath?: ToolpathSpec;
  part_type?: string;           // "die", "fastener", "electrode", etc.
  industry?: string;            // "fastener", "aerospace", "medical"
  validation_source: "jm_die" | "vendor_guide" | "shop_feedback" | "handbook" | "community";
  validation_date?: string;
  performance?: {
    cycle_time_min?: number;
    tool_life_parts?: number;
    surface_ra_um?: number;
    success_rate?: number;     // 0-1
  };
  notes?: string;
  tags: string[];
}

export interface TemplateSearchResult {
  template: ScenarioTemplate;
  similarity: number;
  match_reason: string;
}

export interface TemplateLibraryStats {
  total_templates: number;
  by_industry: Record<string, number>;
  by_validation_source: Record<string, number>;
  by_part_type: Record<string, number>;
  avg_success_rate: number;
}

// ── Seed templates (JM DIE context) ───────────────────────────────────

const SEED_TEMPLATES: ScenarioTemplate[] = [
  {
    id: "tmpl_jmdie_hurco_d2_rough",
    label: "JM Die — Hurco VMX D2 roughing pocket",
    scenario: { controller_id: "hurco_max5", machine_id: "hurco-vmx30i", material_id: "D2" },
    tool: { tool_type: "endmill", diameter_mm: 10, flute_count: 4, substrate: "carbide", coating: "tialn", iso_groups: ["H"] },
    toolpath: { operation_type: "pocket", dimension: "3d", phase: "roughing", stepover_ratio: 0.1, doc_ratio: 1.5, adaptive: true, climb_milling: true },
    part_type: "die",
    industry: "fastener",
    validation_source: "jm_die",
    performance: { cycle_time_min: 42, tool_life_parts: 15, surface_ra_um: 3.2, success_rate: 0.95 },
    tags: ["d2", "tool_steel", "adaptive", "hurco", "pocket_roughing"],
  },
  {
    id: "tmpl_jmdie_okuma_tool_steel_finish",
    label: "JM Die — Okuma M460V 5-axis D2 finishing",
    scenario: { controller_id: "okuma_osp_p300", machine_id: "okuma-m460v-5ax", material_id: "D2" },
    tool: { tool_type: "ballnose", diameter_mm: 6, flute_count: 2, corner_radius_mm: 3, substrate: "carbide", coating: "alcrn", iso_groups: ["H"] },
    toolpath: { operation_type: "contour", dimension: "5axis", phase: "finishing", stepover_ratio: 0.05, surface_priority: 0.9, requires_5axis: true, hsm: true },
    part_type: "die",
    industry: "fastener",
    validation_source: "jm_die",
    performance: { cycle_time_min: 28, tool_life_parts: 8, surface_ra_um: 0.8, success_rate: 0.92 },
    tags: ["d2", "5_axis", "finishing", "okuma", "high_precision"],
  },
  {
    id: "tmpl_jmdie_haas_carbide_bore",
    label: "JM Die — Haas VF lathe carbide bore",
    scenario: { controller_id: "haas_ngc", machine_id: "haas-vf2", material_id: "tungsten_carbide" },
    tool: { tool_type: "boring_bar", diameter_mm: 12, substrate: "carbide", coating: "tialn", iso_groups: ["H"] },
    toolpath: { operation_type: "turning", phase: "finishing", doc_ratio: 0.05, surface_priority: 0.9, coolant_critical: true },
    part_type: "die_insert",
    industry: "fastener",
    validation_source: "jm_die",
    performance: { cycle_time_min: 15, tool_life_parts: 4, surface_ra_um: 0.4, success_rate: 0.88 },
    tags: ["carbide", "boring", "precision", "haas"],
  },
  {
    id: "tmpl_vendor_fanuc_steel_adaptive",
    label: "Sandvik — Fanuc 31i mild steel adaptive roughing",
    scenario: { controller_id: "fanuc_31i", machine_id: "haas-vf2", material_id: "1018" },
    tool: { tool_type: "endmill", diameter_mm: 12, flute_count: 4, substrate: "carbide", coating: "tialn", iso_groups: ["P"] },
    toolpath: { operation_type: "pocket", dimension: "3d", phase: "roughing", stepover_ratio: 0.08, doc_ratio: 2.0, adaptive: true, constant_chip_load: true, hsm: true },
    part_type: "general",
    industry: "general",
    validation_source: "vendor_guide",
    performance: { cycle_time_min: 18, tool_life_parts: 50, success_rate: 0.97 },
    tags: ["1018", "mild_steel", "adaptive", "hsm"],
  },
  {
    id: "tmpl_handbook_titanium_hpc",
    label: "Handbook — Titanium high-pressure coolant",
    scenario: { controller_id: "fanuc_31i", machine_id: "okuma-m460v-5ax", material_id: "Ti-6Al-4V" },
    tool: { tool_type: "endmill", diameter_mm: 8, flute_count: 4, substrate: "carbide", coating: "alcrn", iso_groups: ["S"], coolant_through: true },
    toolpath: { operation_type: "contour", dimension: "3d", phase: "finishing", stepover_ratio: 0.1, doc_ratio: 0.3, coolant_critical: true, hsm: true },
    part_type: "aerospace",
    industry: "aerospace",
    validation_source: "handbook",
    performance: { cycle_time_min: 35, tool_life_parts: 12, surface_ra_um: 1.6, success_rate: 0.85 },
    tags: ["titanium", "hpc", "aerospace", "superalloy"],
  },
  {
    id: "tmpl_jmdie_edm_graphite",
    label: "JM Die — Mitsubishi sinker EDM graphite electrode",
    scenario: { controller_id: "mitsubishi_m80", machine_id: "haas-vf2", material_id: "graphite" },
    part_type: "electrode",
    industry: "fastener",
    validation_source: "jm_die",
    performance: { cycle_time_min: 90, tool_life_parts: 1, surface_ra_um: 1.2, success_rate: 0.90 },
    tags: ["graphite", "edm", "electrode", "mitsubishi"],
  },
];

// ── Engine ─────────────────────────────────────────────────────────────

export class PPScenarioTemplateLibraryEngine {
  private templates: ScenarioTemplate[] = [...SEED_TEMPLATES];

  /** Add a new template to the library. */
  addTemplate(template: ScenarioTemplate): void {
    const existing = this.templates.findIndex(t => t.id === template.id);
    if (existing >= 0) this.templates[existing] = template;
    else this.templates.push(template);
  }

  /** Get a template by ID. */
  getTemplate(id: string): ScenarioTemplate | null {
    return this.templates.find(t => t.id === id) ?? null;
  }

  /** Get all templates. */
  getAllTemplates(): ScenarioTemplate[] {
    return [...this.templates];
  }

  /** Filter templates by industry. */
  getByIndustry(industry: string): ScenarioTemplate[] {
    return this.templates.filter(t => t.industry === industry);
  }

  /** Filter templates by part type. */
  getByPartType(partType: string): ScenarioTemplate[] {
    return this.templates.filter(t => t.part_type === partType);
  }

  /** Filter templates by tag. */
  getByTag(tag: string): ScenarioTemplate[] {
    const q = tag.toLowerCase();
    return this.templates.filter(t => t.tags.some(tg => tg.toLowerCase() === q));
  }

  /** Full-text search across labels, notes, tags. */
  search(query: string, limit = 10): ScenarioTemplate[] {
    const q = query.toLowerCase();
    return this.templates
      .filter(t =>
        t.label.toLowerCase().includes(q) ||
        (t.notes ?? "").toLowerCase().includes(q) ||
        t.tags.some(tg => tg.toLowerCase().includes(q)) ||
        (t.part_type ?? "").toLowerCase().includes(q) ||
        (t.industry ?? "").toLowerCase().includes(q)
      )
      .slice(0, limit);
  }

  /**
   * Find templates similar to a query scenario via fusion embedding.
   */
  findSimilar(scenario: ScenarioInput, limit = 5): TemplateSearchResult[] {
    const queryFused = ppMultiModalFusionEngine.fuse(scenario);
    if (!queryFused) return [];

    const results: TemplateSearchResult[] = [];
    for (const template of this.templates) {
      const tFused = ppMultiModalFusionEngine.fuse(template.scenario);
      if (!tFused) continue;

      const sim = ppMultiModalFusionEngine.cosineSimilarity(
        queryFused.fused_vector, tFused.fused_vector,
      );

      const reason = this.explainMatch(scenario, template.scenario, sim);

      results.push({ template, similarity: round4(sim), match_reason: reason });
    }

    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  /**
   * Find templates that match by toolpath strategy.
   */
  findByToolpath(toolpath: ToolpathSpec, limit = 5): TemplateSearchResult[] {
    const queryVec = ppToolpathStrategyEncoderEngine.embed(toolpath).vector;
    const results: TemplateSearchResult[] = [];

    for (const template of this.templates) {
      if (!template.toolpath) continue;
      const tVec = ppToolpathStrategyEncoderEngine.embed(template.toolpath).vector;
      const sim = ppToolpathStrategyEncoderEngine.cosineSimilarity(queryVec, tVec);
      results.push({
        template,
        similarity: round4(sim),
        match_reason: `Toolpath similarity: ${round4(sim)}`,
      });
    }

    return results.sort((a, b) => b.similarity - a.similarity).slice(0, limit);
  }

  /**
   * Find templates by tool specification.
   */
  findByTool(tool: ToolSpec, limit = 5): TemplateSearchResult[] {
    const queryVec = ppCuttingToolEncoderEngine.embed(tool).vector;
    const results: TemplateSearchResult[] = [];

    for (const template of this.templates) {
      if (!template.tool) continue;
      const tVec = ppCuttingToolEncoderEngine.embed(template.tool).vector;
      const sim = ppCuttingToolEncoderEngine.cosineSimilarity(queryVec, tVec);
      results.push({
        template,
        similarity: round4(sim),
        match_reason: `Tool similarity: ${round4(sim)}`,
      });
    }

    return results.sort((a, b) => b.similarity - a.similarity).slice(0, limit);
  }

  /**
   * Get top proven templates (highest success rate).
   */
  getTopProven(limit = 5): ScenarioTemplate[] {
    return [...this.templates]
      .filter(t => t.performance?.success_rate !== undefined)
      .sort((a, b) =>
        (b.performance?.success_rate ?? 0) - (a.performance?.success_rate ?? 0)
      )
      .slice(0, limit);
  }

  /** Library statistics. */
  getStats(): TemplateLibraryStats {
    const byIndustry: Record<string, number> = {};
    const byValidation: Record<string, number> = {};
    const byPartType: Record<string, number> = {};
    let totalRate = 0, rateCount = 0;

    for (const t of this.templates) {
      const ind = t.industry ?? "unknown";
      byIndustry[ind] = (byIndustry[ind] ?? 0) + 1;
      byValidation[t.validation_source] = (byValidation[t.validation_source] ?? 0) + 1;
      const pt = t.part_type ?? "unknown";
      byPartType[pt] = (byPartType[pt] ?? 0) + 1;
      if (t.performance?.success_rate !== undefined) {
        totalRate += t.performance.success_rate;
        rateCount++;
      }
    }

    return {
      total_templates: this.templates.length,
      by_industry: byIndustry,
      by_validation_source: byValidation,
      by_part_type: byPartType,
      avg_success_rate: rateCount > 0 ? round4(totalRate / rateCount) : 0,
    };
  }

  /** Reset to seed templates only. */
  reset(): void {
    this.templates = [...SEED_TEMPLATES];
  }

  // ── Private ──────────────────────────────────────────────────────────

  private explainMatch(a: ScenarioInput, b: ScenarioInput, sim: number): string {
    const matches: string[] = [];
    if (a.controller_id === b.controller_id) matches.push("same controller");
    if (a.machine_id === b.machine_id) matches.push("same machine");
    if (a.material_id === b.material_id) matches.push("same material");
    if (matches.length === 0) return `Embedding similarity: ${round4(sim)}`;
    return `${matches.join(" + ")}, similarity: ${round4(sim)}`;
  }
}

function round4(x: number): number { return Math.round(x * 10000) / 10000; }

export const ppScenarioTemplateLibraryEngine = new PPScenarioTemplateLibraryEngine();
