/**
 * CADReverseCorpusCatalogEngine — CAD-REVERSE-ENGINEER-MS0/U3
 *
 * The catalog builder. U1 reverse-engineers one part; U2 bridges the
 * ground-truth corpus format; this engine runs the whole corpus through
 * the pipeline and produces ONE catalog — the deliverable for "make
 * templates, categorize and name accordingly".
 *
 *   CanonicalFeatureTree[]   ← from cad_feature_tree_extract over a corpus
 *        │
 *        ▼  buildCatalog()              ← THIS ENGINE
 *   CorpusCatalog {
 *     entries[]      — one CatalogEntry per source file (name, category,
 *                      sourceFile, opCount, paramCount, confidence)
 *     byCategory     — category → [template names]
 *     templates[]    — DEDUPLICATED ReverseEngineeredTemplate set
 *                      (parts with an identical name — same category,
 *                      dimension, op count AND op-sequence hash — are
 *                      one reusable template, occurrence-counted)
 *     categoryCounts, totalParts, uniqueTemplates, skippedFiles
 *   }
 *
 * The catalog is the trained "model" the goal asks for: every CAD file
 * in the corpus mapped to a named, categorized, parameterized template,
 * de-duplicated so the corpus collapses to its distinct part families.
 *
 * Pure: no I/O. The file-system walk + per-file `cad_feature_tree_extract`
 * invocation is a thin runner concern (a scheduled background job for
 * the full 20,006-file corpus — too heavy for an interactive call). This
 * engine takes the already-parsed trees so it stays unit-testable and
 * deterministic.
 *
 * Refs: CADReverseTemplateEngine (U1); CADCanonicalTreeAdapterEngine
 * (U2 — supplies reverseEngineerTree); GroundTruthFeatureTreeExtractor
 * (CAD-GROUND-TRUTH-MS0 — supplies CanonicalFeatureTree).
 */

import type { CanonicalFeatureTree } from "./GroundTruthFeatureTreeExtractor.js";
import {
  cadCanonicalTreeAdapterEngine,
  type ReverseEngineerTreeResult,
} from "./CADCanonicalTreeAdapterEngine.js";
import type { ReverseEngineeredTemplate } from "./CADReverseTemplateEngine.js";

// ── Types ────────────────────────────────────────────────────────────────────

export interface CatalogEntry {
  /** Deterministic template name (<category>_<dim>mm_<n>op_<hash4>). */
  name: string;
  category: string;
  sourceFile: string;
  sourceFormat: string;
  /** Op count in the reverse-engineered template. */
  opCount: number;
  /** Extracted numeric param count. */
  paramCount: number;
  /** Category-match confidence [0,1]. */
  confidence: number;
}

export interface CatalogTemplate {
  /** The reverse-engineered template (the reusable artifact). */
  template: ReverseEngineeredTemplate;
  /** How many corpus files collapsed to this template. */
  occurrences: number;
  /** Source files that produced this template. */
  sourceFiles: string[];
}

export interface CorpusCatalog {
  /** One entry per successfully processed source file. */
  entries: CatalogEntry[];
  /** Deduplicated template set, keyed-collapsed by template name. */
  templates: CatalogTemplate[];
  /** category → sorted unique template names. */
  byCategory: Record<string, string[]>;
  /** category → file count. */
  categoryCounts: Record<string, number>;
  /** Total source files processed (entries.length). */
  totalParts: number;
  /** Distinct templates after dedup. */
  uniqueTemplates: number;
  /** Files dropped (malformed tree / adapter threw). */
  skippedFiles: { sourceFile: string; reason: string }[];
}

export interface CatalogStats {
  totalCatalogsBuilt: number;
  totalFilesProcessed: number;
  totalTemplatesEmitted: number;
}

// ── Engine ───────────────────────────────────────────────────────────────────

export class CADReverseCorpusCatalogEngine {
  private totalCatalogsBuilt = 0;
  private totalFilesProcessed = 0;
  private totalTemplatesEmitted = 0;

  /**
   * Run a batch of canonical feature trees through the reverse-engineering
   * pipeline and assemble a deduplicated, categorized catalog.
   */
  buildCatalog(trees: ReadonlyArray<CanonicalFeatureTree>): CorpusCatalog {
    if (!Array.isArray(trees)) {
      throw new TypeError("buildCatalog: trees must be an array of CanonicalFeatureTree");
    }
    this.totalCatalogsBuilt++;

    const entries: CatalogEntry[] = [];
    const skippedFiles: { sourceFile: string; reason: string }[] = [];
    // name → accumulating CatalogTemplate
    const templateMap = new Map<string, CatalogTemplate>();
    const categoryCounts: Record<string, number> = {};

    for (const tree of trees) {
      const sourceFile = (tree && typeof tree === "object" && typeof tree.sourceFile === "string")
        ? tree.sourceFile
        : "<unknown>";
      let result: ReverseEngineerTreeResult;
      try {
        result = cadCanonicalTreeAdapterEngine.reverseEngineerTree(tree);
      } catch (err) {
        skippedFiles.push({
          sourceFile,
          reason: err instanceof Error ? err.message : "adapter error",
        });
        continue;
      }

      const tmpl = result.template;
      entries.push({
        name: tmpl.name,
        category: tmpl.category,
        sourceFile: result.sourceFile,
        sourceFormat: result.sourceFormat,
        opCount: tmpl.opTemplate.length,
        paramCount: tmpl.params.length,
        confidence: tmpl.confidence,
      });
      categoryCounts[tmpl.category] = (categoryCounts[tmpl.category] ?? 0) + 1;

      // Dedup: identical name ⇒ same part family.
      const existing = templateMap.get(tmpl.name);
      if (existing) {
        existing.occurrences++;
        existing.sourceFiles.push(result.sourceFile);
      } else {
        templateMap.set(tmpl.name, {
          template: tmpl,
          occurrences: 1,
          sourceFiles: [result.sourceFile],
        });
      }
    }

    const templates = [...templateMap.values()];
    const byCategory: Record<string, string[]> = {};
    for (const ct of templates) {
      const cat = ct.template.category;
      (byCategory[cat] ??= []).push(ct.template.name);
    }
    for (const cat of Object.keys(byCategory)) {
      byCategory[cat] = [...new Set(byCategory[cat])].sort();
    }

    this.totalFilesProcessed += entries.length;
    this.totalTemplatesEmitted += templates.length;

    return {
      entries,
      templates,
      byCategory,
      categoryCounts,
      totalParts: entries.length,
      uniqueTemplates: templates.length,
      skippedFiles,
    };
  }

  /**
   * Merge two catalogs (incremental corpus runs — process the 20,006-file
   * corpus in chunks, then fold the chunk catalogs together).
   */
  mergeCatalogs(a: CorpusCatalog, b: CorpusCatalog): CorpusCatalog {
    if (!a || !b || !Array.isArray(a.entries) || !Array.isArray(b.entries)) {
      throw new TypeError("mergeCatalogs: both arguments must be CorpusCatalog objects");
    }
    const entries = [...a.entries, ...b.entries];
    const skippedFiles = [...a.skippedFiles, ...b.skippedFiles];

    const templateMap = new Map<string, CatalogTemplate>();
    for (const ct of [...a.templates, ...b.templates]) {
      const existing = templateMap.get(ct.template.name);
      if (existing) {
        existing.occurrences += ct.occurrences;
        existing.sourceFiles.push(...ct.sourceFiles);
      } else {
        templateMap.set(ct.template.name, {
          template: ct.template,
          occurrences: ct.occurrences,
          sourceFiles: [...ct.sourceFiles],
        });
      }
    }
    const templates = [...templateMap.values()];

    const categoryCounts: Record<string, number> = {};
    for (const e of entries) {
      categoryCounts[e.category] = (categoryCounts[e.category] ?? 0) + 1;
    }
    const byCategory: Record<string, string[]> = {};
    for (const ct of templates) {
      (byCategory[ct.template.category] ??= []).push(ct.template.name);
    }
    for (const cat of Object.keys(byCategory)) {
      byCategory[cat] = [...new Set(byCategory[cat])].sort();
    }

    return {
      entries,
      templates,
      byCategory,
      categoryCounts,
      totalParts: entries.length,
      uniqueTemplates: templates.length,
      skippedFiles,
    };
  }

  getStats(): CatalogStats {
    return {
      totalCatalogsBuilt: this.totalCatalogsBuilt,
      totalFilesProcessed: this.totalFilesProcessed,
      totalTemplatesEmitted: this.totalTemplatesEmitted,
    };
  }

  _resetForTests(): void {
    this.totalCatalogsBuilt = 0;
    this.totalFilesProcessed = 0;
    this.totalTemplatesEmitted = 0;
  }
}

export const cadReverseCorpusCatalogEngine = new CADReverseCorpusCatalogEngine();
