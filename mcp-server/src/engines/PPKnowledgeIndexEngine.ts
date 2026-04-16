/**
 * PPKnowledgeIndexEngine — Unified PP-AGI knowledge search
 *
 * Creates a searchable index across ALL PP-AGI knowledge sources:
 *   - Controller dialects (27 families)
 *   - Machine profiles (representative kinematics)
 *   - Materials (93 from MaterialDatabaseEngine)
 *   - Tool reference library (12 tools)
 *   - Toolpath strategies (15 strategies)
 *   - Scenario templates (6 proven jobs)
 *   - Learned patterns (from online tracker)
 *
 * Enables:
 *   - Natural-language search across all domains
 *   - Cross-domain discovery (e.g., "what tools work with D2 on Hurco?")
 *   - Completeness queries ("what Fanuc dialects do we have?")
 *   - Knowledge gap analysis
 *
 * @module PPKnowledgeIndexEngine
 */

import { ppControllerEmbeddingEngine } from "./PPControllerEmbeddingEngine.js";
import { ppMachineVectorEncoderEngine } from "./PPMachineVectorEncoderEngine.js";
import { ppMaterialPropertyVectorEngine } from "./PPMaterialPropertyVectorEngine.js";
import { ppCuttingToolEncoderEngine } from "./PPCuttingToolEncoderEngine.js";
import { ppToolpathStrategyEncoderEngine } from "./PPToolpathStrategyEncoderEngine.js";
import { ppScenarioTemplateLibraryEngine } from "./PPScenarioTemplateLibraryEngine.js";

// ── Types ─────────────────────────────────────────────────────────────

export type KnowledgeDomain =
  | "controller" | "machine" | "material" | "tool" | "toolpath" | "template";

export interface KnowledgeEntry {
  domain: KnowledgeDomain;
  id: string;
  label: string;
  description: string;
  tags: string[];
  score?: number;  // populated during search
}

export interface SearchResult {
  query: string;
  total_matches: number;
  entries: KnowledgeEntry[];
}

export interface CoverageReport {
  domain: KnowledgeDomain;
  total: number;
  by_category: Record<string, number>;
  notable_gaps: string[];
}

export interface CrossDomainResult {
  controllers: KnowledgeEntry[];
  machines: KnowledgeEntry[];
  materials: KnowledgeEntry[];
  tools: KnowledgeEntry[];
  toolpaths: KnowledgeEntry[];
  templates: KnowledgeEntry[];
}

// ── Engine ─────────────────────────────────────────────────────────────

export class PPKnowledgeIndexEngine {
  private cache: KnowledgeEntry[] | null = null;

  /**
   * Build or retrieve the full knowledge index.
   */
  getAllEntries(): KnowledgeEntry[] {
    if (this.cache) return this.cache;

    const entries: KnowledgeEntry[] = [];

    // Controllers
    for (const c of ppControllerEmbeddingEngine.embedAll()) {
      entries.push({
        domain: "controller",
        id: c.controller_id,
        label: c.display_name,
        description: `${c.manufacturer} ${c.base_family} controller`,
        tags: [c.manufacturer.toLowerCase(), c.base_family, c.controller_id],
      });
    }

    // Machines
    for (const m of ppMachineVectorEncoderEngine.embedAll()) {
      entries.push({
        domain: "machine",
        id: m.machine_id,
        label: m.machine_name,
        description: `${m.brand} ${m.machine_name}`,
        tags: [m.brand.toLowerCase(), m.machine_id],
      });
    }

    // Materials
    for (const mat of ppMaterialPropertyVectorEngine.embedAll()) {
      entries.push({
        domain: "material",
        id: mat.material_id,
        label: mat.material_name,
        description: `${mat.category} — ${mat.material_name}`,
        tags: [mat.category, mat.material_id.toLowerCase()],
      });
    }

    // Tools (reference library)
    for (const t of ppCuttingToolEncoderEngine.embedReferenceLibrary()) {
      entries.push({
        domain: "tool",
        id: `tool_${t.tool_type}_${entries.length}`,
        label: t.label,
        description: t.label,
        tags: [t.tool_type, "tool"],
      });
    }

    // Toolpath strategies
    for (const s of ppToolpathStrategyEncoderEngine.embedReferenceLibrary()) {
      entries.push({
        domain: "toolpath",
        id: `tp_${s.operation_type}_${entries.length}`,
        label: s.label,
        description: s.label,
        tags: [s.operation_type, "toolpath"],
      });
    }

    // Scenario templates
    for (const tmpl of ppScenarioTemplateLibraryEngine.getAllTemplates()) {
      entries.push({
        domain: "template",
        id: tmpl.id,
        label: tmpl.label,
        description: `${tmpl.industry ?? "general"} — ${tmpl.label}`,
        tags: [...tmpl.tags, tmpl.industry ?? "general", tmpl.validation_source],
      });
    }

    this.cache = entries;
    return entries;
  }

  /**
   * Search across all domains using keyword matching.
   */
  search(query: string, limit = 20): SearchResult {
    const q = query.toLowerCase().trim();
    if (!q) {
      return { query, total_matches: 0, entries: [] };
    }

    const tokens = q.split(/\s+/).filter(t => t.length > 0);
    const all = this.getAllEntries();

    const scored: KnowledgeEntry[] = [];
    for (const e of all) {
      let score = 0;
      const haystack = `${e.label} ${e.description} ${e.tags.join(" ")}`.toLowerCase();

      for (const token of tokens) {
        if (e.id.toLowerCase() === token) score += 10;
        else if (e.tags.some(t => t === token)) score += 5;
        else if (haystack.includes(token)) score += 1;
      }

      if (score > 0) scored.push({ ...e, score });
    }

    scored.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    return {
      query,
      total_matches: scored.length,
      entries: scored.slice(0, limit),
    };
  }

  /**
   * Filter entries by domain.
   */
  getByDomain(domain: KnowledgeDomain): KnowledgeEntry[] {
    return this.getAllEntries().filter(e => e.domain === domain);
  }

  /**
   * Search with a specific domain filter.
   */
  searchInDomain(query: string, domain: KnowledgeDomain, limit = 20): SearchResult {
    const result = this.search(query, 1000);
    const filtered = result.entries.filter(e => e.domain === domain).slice(0, limit);
    return {
      query,
      total_matches: filtered.length,
      entries: filtered,
    };
  }

  /**
   * Cross-domain search: find related items across all domains for a topic.
   */
  crossDomainSearch(query: string, limit = 5): CrossDomainResult {
    const search = this.search(query, 1000);

    const byDomain: CrossDomainResult = {
      controllers: [], machines: [], materials: [],
      tools: [], toolpaths: [], templates: [],
    };

    for (const entry of search.entries) {
      switch (entry.domain) {
        case "controller":
          if (byDomain.controllers.length < limit) byDomain.controllers.push(entry);
          break;
        case "machine":
          if (byDomain.machines.length < limit) byDomain.machines.push(entry);
          break;
        case "material":
          if (byDomain.materials.length < limit) byDomain.materials.push(entry);
          break;
        case "tool":
          if (byDomain.tools.length < limit) byDomain.tools.push(entry);
          break;
        case "toolpath":
          if (byDomain.toolpaths.length < limit) byDomain.toolpaths.push(entry);
          break;
        case "template":
          if (byDomain.templates.length < limit) byDomain.templates.push(entry);
          break;
      }
    }

    return byDomain;
  }

  /**
   * Coverage report for a domain.
   */
  coverage(domain: KnowledgeDomain): CoverageReport {
    const entries = this.getByDomain(domain);
    const byCategory: Record<string, number> = {};
    const gaps: string[] = [];

    for (const e of entries) {
      // Use first tag as category bucket
      const cat = e.tags[0] ?? "unknown";
      byCategory[cat] = (byCategory[cat] ?? 0) + 1;
    }

    // Identify notable gaps
    switch (domain) {
      case "controller":
        const families = new Set(entries.flatMap(e => e.tags.filter(t =>
          ["fanuc", "siemens", "heidenhain", "okuma", "mazak"].includes(t))));
        if (!families.has("mazak")) gaps.push("No Mazak controller dialects");
        if (entries.length < 15) gaps.push(`Only ${entries.length} controllers (target: 30+)`);
        break;
      case "machine":
        if (entries.length < 10) gaps.push(`Only ${entries.length} representative machines (target: 50+)`);
        break;
      case "material":
        if (entries.length < 50) gaps.push(`Only ${entries.length} materials (target: 200+)`);
        break;
      case "tool":
        if (entries.length < 50) gaps.push(`Only ${entries.length} reference tools (target: 100+)`);
        break;
      case "toolpath":
        if (entries.length < 20) gaps.push(`Only ${entries.length} toolpath strategies (target: 40+)`);
        break;
      case "template":
        if (entries.length < 20) gaps.push(`Only ${entries.length} templates (target: 100+)`);
        break;
    }

    return { domain, total: entries.length, by_category: byCategory, notable_gaps: gaps };
  }

  /**
   * Get all coverage reports.
   */
  fullCoverage(): CoverageReport[] {
    const domains: KnowledgeDomain[] = ["controller", "machine", "material", "tool", "toolpath", "template"];
    return domains.map(d => this.coverage(d));
  }

  /**
   * Clear cache (call after data changes).
   */
  invalidate(): void {
    this.cache = null;
  }
}

export const ppKnowledgeIndexEngine = new PPKnowledgeIndexEngine();
