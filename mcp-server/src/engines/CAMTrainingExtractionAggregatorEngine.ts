/**
 * CAMTrainingExtractionAggregatorEngine — PHASE-4 normalization layer
 *
 * Aggregates per-PDF extractions stored under `cad-engine/knowledge_store/`
 * (`doc-*.json` files emitted by an earlier offline extraction pass) into
 * milestone-canonical `data/training/<unit>-extracted.json` artifacts.
 *
 * Each `doc-*.json` source has:
 *   - `tips[]`           — structured manufacturing tips (title, body, category, tags, ...)
 *   - `formulas[]`       — named formulas with expression + variables + page_ref
 *   - `parameter_tables[]` — extracted tables
 *   - `extraction_stats` — provenance (source_pdf, page_count, chunk_count, totals)
 *
 * For each milestone unit (U-CAM59..U-CAM69), a per-unit `AggregationSpec` lists
 * the source `doc-*.json` basenames. The aggregator:
 *   1. loads every source (throws on missing or malformed JSON),
 *   2. dedups tips by `sha1(title + "::" + body)` so cross-volume overlaps don't
 *      inflate counts,
 *   3. preserves per-source provenance via a `_source_doc` field on each tip /
 *      formula / table entry,
 *   4. emits a normalized `AggregatedExtraction` with totals + source manifest.
 *
 * For U-CAM70, `assembleUnifiedCorpus()` produces a tag → unit cross-reference
 * across all per-unit aggregations.
 *
 * @engine CAMTrainingExtractionAggregatorEngine
 * @milestone CAM-EXHAUST-MS0/U-CAM59..U-CAM70
 *
 * WIRE-EXEMPT: build-time aggregator invoked by
 * mcp-server/scripts/emit-cam-training-extractions.mjs as the canonical wrapper
 * (one-shot data normalization; no runtime API surface required).
 */

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import * as path from "node:path";
import { createHash } from "node:crypto";

// Types

export interface ExtractionTip {
  title: string;
  body: string;
  category?: string;
  tags?: string[];
  confidence?: number;
  material_groups?: string[] | null;
  operation_types?: string[] | null;
  page_ref?: string;
  [key: string]: unknown;
}

export interface ExtractionFormula {
  name: string;
  expression: string;
  variables?: Record<string, string>;
  page_ref?: string;
  [key: string]: unknown;
}

export interface ExtractionParameterTable {
  name?: string;
  rows?: unknown[];
  [key: string]: unknown;
}

export interface SourceDocStats {
  source_pdf?: string;
  title?: string;
  page_count?: number;
  chunk_count?: number;
  tips_total?: number;
  tips_unique?: number;
  formulas_total?: number;
  tables_total?: number;
}

export interface KnowledgeStoreDoc {
  tips?: ExtractionTip[];
  formulas?: ExtractionFormula[];
  parameter_tables?: ExtractionParameterTable[];
  extraction_stats?: SourceDocStats;
}

export interface AggregationSourceRef {
  /** Basename without the `.json` extension. Resolved against `knowledgeStoreDir`. */
  knowledge_store_doc: string;
}

export type CamPlatform = "hypermill" | "inventorcam" | "fusion" | "mastercam";

export interface AggregationSpec {
  unit_id: string;
  title: string;
  cam_platform: CamPlatform;
  output_basename: string;
  sources: AggregationSourceRef[];
}

export interface AggregatedSourceManifest {
  knowledge_store_doc: string;
  source_pdf: string | null;
  page_count: number | null;
  tips_unique: number;
  formulas_total: number;
  tables_total: number;
}

export interface AggregatedExtraction {
  schemaVersion: "1.0.0";
  unit_id: string;
  title: string;
  cam_platform: CamPlatform;
  generated_at: string;
  source_documents: AggregatedSourceManifest[];
  totals: {
    source_documents: number;
    tips: number;
    formulas: number;
    parameter_tables: number;
  };
  tips: Array<ExtractionTip & { _source_doc: string }>;
  formulas: Array<ExtractionFormula & { _source_doc: string }>;
  parameter_tables: Array<ExtractionParameterTable & { _source_doc: string }>;
}

export interface UnifiedCorpus {
  schemaVersion: "1.0.0";
  title: string;
  generated_at: string;
  unit_count: number;
  units: Array<{
    unit_id: string;
    cam_platform: CamPlatform;
    tips: number;
    formulas: number;
    parameter_tables: number;
  }>;
  totals: {
    tips_unique: number;
    formulas: number;
    parameter_tables: number;
  };
  cross_references: Record<string, string[]>;
}

// Engine

export class CAMTrainingExtractionAggregatorEngine {
  /** Stable dedup key for tips: sha1 of `title::body`, both trimmed. */
  static dedupKey(tip: ExtractionTip): string {
    const title = (tip.title ?? "").trim();
    const body = (tip.body ?? "").trim();
    return createHash("sha1").update(`${title}::${body}`).digest("hex");
  }

  static loadKnowledgeStoreDoc(
    knowledgeStoreDir: string,
    basename: string,
  ): KnowledgeStoreDoc {
    const file = path.join(knowledgeStoreDir, `${basename}.json`);
    if (!existsSync(file)) {
      throw new Error(`CAMTrainingExtractionAggregator: source doc missing: ${file}`);
    }
    const raw = readFileSync(file, "utf8");
    try {
      const parsed = JSON.parse(raw) as KnowledgeStoreDoc;
      return parsed ?? {};
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(`CAMTrainingExtractionAggregator: invalid JSON in ${file}: ${msg}`);
    }
  }

  /**
   * Aggregates the sources for one unit spec. Pure: no IO beyond reading the
   * referenced `doc-*.json` files. Tips deduped across sources; formulas and
   * parameter tables preserved as-is (they rarely repeat verbatim).
   */
  static aggregate(
    spec: AggregationSpec,
    knowledgeStoreDir: string,
  ): AggregatedExtraction {
    const seenTipKeys = new Set<string>();
    const tips: Array<ExtractionTip & { _source_doc: string }> = [];
    const formulas: Array<ExtractionFormula & { _source_doc: string }> = [];
    const tables: Array<ExtractionParameterTable & { _source_doc: string }> = [];
    const sourceDocs: AggregatedSourceManifest[] = [];

    for (const ref of spec.sources) {
      const doc = this.loadKnowledgeStoreDoc(knowledgeStoreDir, ref.knowledge_store_doc);

      for (const t of doc.tips ?? []) {
        const key = this.dedupKey(t);
        if (seenTipKeys.has(key)) continue;
        seenTipKeys.add(key);
        tips.push({ ...t, _source_doc: ref.knowledge_store_doc });
      }
      for (const f of doc.formulas ?? []) {
        formulas.push({ ...f, _source_doc: ref.knowledge_store_doc });
      }
      for (const tbl of doc.parameter_tables ?? []) {
        tables.push({ ...tbl, _source_doc: ref.knowledge_store_doc });
      }

      const s = doc.extraction_stats ?? {};
      sourceDocs.push({
        knowledge_store_doc: ref.knowledge_store_doc,
        source_pdf: typeof s.source_pdf === "string" ? s.source_pdf : null,
        page_count: typeof s.page_count === "number" ? s.page_count : null,
        tips_unique: typeof s.tips_unique === "number" ? s.tips_unique : (doc.tips?.length ?? 0),
        formulas_total: typeof s.formulas_total === "number" ? s.formulas_total : (doc.formulas?.length ?? 0),
        tables_total: typeof s.tables_total === "number" ? s.tables_total : (doc.parameter_tables?.length ?? 0),
      });
    }

    return {
      schemaVersion: "1.0.0",
      unit_id: spec.unit_id,
      title: spec.title,
      cam_platform: spec.cam_platform,
      generated_at: new Date().toISOString(),
      source_documents: sourceDocs,
      totals: {
        source_documents: sourceDocs.length,
        tips: tips.length,
        formulas: formulas.length,
        parameter_tables: tables.length,
      },
      tips,
      formulas,
      parameter_tables: tables,
    };
  }

  /** Atomic write: temp file -> rename. Creates parent dir if missing. */
  static writeArtifact(extraction: AggregatedExtraction, outputPath: string): void {
    mkdirSync(path.dirname(outputPath), { recursive: true });
    const tmp = `${outputPath}.tmp`;
    writeFileSync(tmp, `${JSON.stringify(extraction, null, 2)}\n`);
    if (existsSync(outputPath)) unlinkSync(outputPath);
    renameSync(tmp, outputPath);
  }

  /**
   * U-CAM70: builds a unified corpus across previously aggregated unit
   * extractions. Tips are deduplicated across units via the same sha1 key, so
   * `totals.tips_unique` is the number of distinct tips in the entire CAM
   * training corpus. `cross_references[tag]` lists every unit_id whose tips
   * carry that tag, sorted ascending.
   */
  static assembleUnifiedCorpus(
    unitExtractions: AggregatedExtraction[],
    title = "CAM Unified Training Corpus",
  ): UnifiedCorpus {
    const seenTipKeys = new Set<string>();
    let formulaCount = 0;
    let tableCount = 0;
    const xref: Record<string, Set<string>> = {};
    const units: UnifiedCorpus["units"] = [];

    for (const u of unitExtractions) {
      for (const t of u.tips) {
        const key = this.dedupKey(t);
        seenTipKeys.add(key);
        for (const tag of t.tags ?? []) {
          if (typeof tag !== "string" || tag.length === 0) continue;
          (xref[tag] ??= new Set()).add(u.unit_id);
        }
      }
      formulaCount += u.formulas.length;
      tableCount += u.parameter_tables.length;
      units.push({
        unit_id: u.unit_id,
        cam_platform: u.cam_platform,
        tips: u.tips.length,
        formulas: u.formulas.length,
        parameter_tables: u.parameter_tables.length,
      });
    }

    const xrefOut: Record<string, string[]> = {};
    for (const tag of Object.keys(xref).sort()) {
      xrefOut[tag] = [...xref[tag]].sort();
    }

    return {
      schemaVersion: "1.0.0",
      title,
      generated_at: new Date().toISOString(),
      unit_count: unitExtractions.length,
      units,
      totals: {
        tips_unique: seenTipKeys.size,
        formulas: formulaCount,
        parameter_tables: tableCount,
      },
      cross_references: xrefOut,
    };
  }

  static writeCorpusArtifact(corpus: UnifiedCorpus, outputPath: string): void {
    mkdirSync(path.dirname(outputPath), { recursive: true });
    const tmp = `${outputPath}.tmp`;
    writeFileSync(tmp, `${JSON.stringify(corpus, null, 2)}\n`);
    if (existsSync(outputPath)) unlinkSync(outputPath);
    renameSync(tmp, outputPath);
  }

  /**
   * Canonical PHASE-4 aggregation specs for CAM-EXHAUST-MS0.
   * Source doc basenames are filenames in `cad-engine/knowledge_store/`
   * minus the `.json` extension.
   */
  static getPhase4Specs(): AggregationSpec[] {
    return [
      // hyperMILL
      {
        unit_id: "U-CAM59",
        title: "hyperMILL CAM Manual Extraction",
        cam_platform: "hypermill",
        output_basename: "hypermill-cam-manual-extracted.json",
        sources: [
          { knowledge_store_doc: "doc-hypermill-hypermill-manual-en-1" },
          { knowledge_store_doc: "doc-hypermill-hypermill-manual-en-4" },
          { knowledge_store_doc: "doc-hypermill-hypermill-2d-3d" },
          { knowledge_store_doc: "doc-hypermill-software-documentation-hypermill-2d-3d" },
        ],
      },
      {
        unit_id: "U-CAM60",
        title: "hyperMILL Tool Database Manual Extraction",
        cam_platform: "hypermill",
        output_basename: "hypermill-tool-db-extracted.json",
        sources: [{ knowledge_store_doc: "doc-hypermill-sql-tool-db" }],
      },
      {
        unit_id: "U-CAM61",
        title: "hyperMILL Virtual Machining Manual Extraction",
        cam_platform: "hypermill",
        output_basename: "hypermill-virtual-machining-extracted.json",
        sources: [{ knowledge_store_doc: "doc-hypermill-virtual-mc" }],
      },
      {
        unit_id: "U-CAM62",
        title: "hyperMILL Automation Center Manual Extraction",
        cam_platform: "hypermill",
        output_basename: "hypermill-automation-extracted.json",
        sources: [{ knowledge_store_doc: "doc-automation-center-manual-en-us" }],
      },
      {
        unit_id: "U-CAM69",
        title: "hyperMILL Remaining PDFs Batch Extraction",
        cam_platform: "hypermill",
        output_basename: "hypermill-batch-extracted.json",
        sources: [
          { knowledge_store_doc: "doc-hypermill-en-vol2" },
          { knowledge_store_doc: "doc-hypermill-en-vol3" },
        ],
      },
      // InventorCAM / Inventor HSM
      {
        unit_id: "U-CAM63",
        title: "InventorCAM 2.5D Training Extraction",
        cam_platform: "inventorcam",
        output_basename: "inventorcam-2.5d-training-extracted.json",
        sources: [
          { knowledge_store_doc: "doc-inventorcam2024-2-5d-milling-training-course" },
        ],
      },
      {
        unit_id: "U-CAM64",
        title: "InventorCAM 3D HSM/HSR Guides Extraction",
        cam_platform: "inventorcam",
        output_basename: "inventorcam-3d-hsm-hsr-extracted.json",
        sources: [
          { knowledge_store_doc: "doc-inventorcam2024-3d-hsm-user-guide" },
          { knowledge_store_doc: "doc-inventorcam2024-3d-hsr-user-guide" },
          { knowledge_store_doc: "doc-inventorcam2024-pro3d-hsm-user-guide" },
        ],
      },
      {
        unit_id: "U-CAM65",
        title: "InventorCAM 5-Axis Basic Training (Vol 1-3) Extraction",
        cam_platform: "inventorcam",
        output_basename: "inventorcam-5axis-training-extracted.json",
        sources: [
          { knowledge_store_doc: "doc-inventorcam2024-5-axis-basic-training-vol-1" },
          { knowledge_store_doc: "doc-inventorcam2024-5-axis-basic-training-vol-2" },
          { knowledge_store_doc: "doc-inventorcam2024-5-axis-basic-training-vol-3" },
        ],
      },
      {
        unit_id: "U-CAM66",
        title: "InventorCAM Multiaxis Guides Extraction",
        cam_platform: "inventorcam",
        output_basename: "inventorcam-multiaxis-extracted.json",
        sources: [
          { knowledge_store_doc: "doc-inventorcam2024-multiaxis-machining-user-guide" },
          { knowledge_store_doc: "doc-inventorcam2024-contour-5x-machining" },
          { knowledge_store_doc: "doc-inventorcam2024-geodesic-machining" },
          { knowledge_store_doc: "doc-inventorcam2024-multiaxis-drilling" },
          { knowledge_store_doc: "doc-inventorcam2024-multiaxis-roughing-pt1" },
          { knowledge_store_doc: "doc-inventorcam2024-multiaxis-roughing-pt2" },
          { knowledge_store_doc: "doc-inventorcam2024-swarf-machining" },
          { knowledge_store_doc: "doc-inventorcam2024-sim-5x-milling-user-guide" },
          { knowledge_store_doc: "doc-inventorcam2024-rotary-machining-user-guide" },
        ],
      },
      {
        unit_id: "U-CAM67",
        title: "InventorCAM Turning & Mill-Turn Training Extraction",
        cam_platform: "inventorcam",
        output_basename: "inventorcam-turning-millturn-extracted.json",
        sources: [
          { knowledge_store_doc: "doc-inventorcam2024-turning-mill-turn-training-course" },
        ],
      },
      {
        unit_id: "U-CAM68",
        title: "InventorCAM Specialty Operations Extraction",
        cam_platform: "inventorcam",
        output_basename: "inventorcam-specialty-extracted.json",
        sources: [
          { knowledge_store_doc: "doc-inventorcam2024-edge-breaking" },
          { knowledge_store_doc: "doc-inventorcam2024-rotary-finishing-4x" },
          { knowledge_store_doc: "doc-inventorcam2024-hss-user-guide" },
        ],
      },
    ];
  }

  /**
   * U-HMT-CONSUMER-MEASURE: scan the knowledge_store directory and report
   * aggregate consumption stats for HM-training docs.
   *
   * Walks every `doc-*.json` in the supplied directory, tallies tips/formulas/
   * tables (deduping tips via {@link dedupKey}), partitions by HM-training
   * scope (regex matches the canonical HM doc-id slugs maintained in
   * scripts/hm-extraction-coverage.mjs and the embed-index router), and lists
   * zero-tip docs so callers can detect silent extraction failures. Pure —
   * I/O only against the supplied directory; never mutates state.
   *
   * @param knowledgeStoreDir Absolute path to `cad-engine/knowledge_store`.
   * @returns Per-doc and aggregate counts; empty stats if dir missing.
   */
  static knowledgeStats(knowledgeStoreDir: string): {
    engine: "CAMTrainingExtractionAggregatorEngine";
    knowledge_store_dir: string;
    doc_count: number;
    hm_doc_count: number;
    total_tips: number;
    total_tips_unique: number;
    total_formulas: number;
    total_parameter_tables: number;
    zero_tip_docs: string[];
    hm_tip_total: number;
    per_doc: Array<{ doc: string; tips: number; formulas: number; tables: number; hm: boolean }>;
  } {
    const empty = {
      engine: "CAMTrainingExtractionAggregatorEngine" as const,
      knowledge_store_dir: knowledgeStoreDir,
      doc_count: 0,
      hm_doc_count: 0,
      total_tips: 0,
      total_tips_unique: 0,
      total_formulas: 0,
      total_parameter_tables: 0,
      zero_tip_docs: [] as string[],
      hm_tip_total: 0,
      per_doc: [] as Array<{ doc: string; tips: number; formulas: number; tables: number; hm: boolean }>,
    };
    if (!existsSync(knowledgeStoreDir)) return empty;

    // Sync match with scripts/hm-extraction-coverage.mjs HM_FILE_RE and the
    // embed-index HM router in scripts/embed-knowledge-store-into-tribal-index.mjs.
    const HM_RE = /^doc-(hypermill|hmautocolor|cad-manual|fusion-cad|automation-center|virtual-tool|virtual-machining|virtual-mc|tool-builder|synchronization-tool|sql-tool-db|sql-macro|hypermill-sql|hypercad)/i;

    const docs: string[] = [];
    for (const name of readdirSync(knowledgeStoreDir)) {
      if (name.startsWith("doc-") && name.endsWith(".json")) docs.push(name);
    }

    const seenTipKeys = new Set<string>();
    const perDoc: Array<{ doc: string; tips: number; formulas: number; tables: number; hm: boolean }> = [];
    const zeroTipDocs: string[] = [];
    let totalTips = 0;
    let totalFormulas = 0;
    let totalTables = 0;
    let hmDocCount = 0;
    let hmTipTotal = 0;

    for (const name of docs) {
      const basename = name.replace(/\.json$/, "");
      let doc: KnowledgeStoreDoc;
      try {
        doc = this.loadKnowledgeStoreDoc(knowledgeStoreDir, basename);
      } catch {
        continue;
      }
      const tipsArr = doc.tips ?? [];
      const formulasArr = doc.formulas ?? [];
      const tablesArr = doc.parameter_tables ?? [];
      const isHm = HM_RE.test(basename);
      if (isHm) {
        hmDocCount += 1;
        hmTipTotal += tipsArr.length;
      }
      if (tipsArr.length === 0) zeroTipDocs.push(basename);
      totalTips += tipsArr.length;
      totalFormulas += formulasArr.length;
      totalTables += tablesArr.length;
      for (const t of tipsArr) seenTipKeys.add(this.dedupKey(t));
      perDoc.push({ doc: basename, tips: tipsArr.length, formulas: formulasArr.length, tables: tablesArr.length, hm: isHm });
    }

    return {
      engine: "CAMTrainingExtractionAggregatorEngine",
      knowledge_store_dir: knowledgeStoreDir,
      doc_count: docs.length,
      hm_doc_count: hmDocCount,
      total_tips: totalTips,
      total_tips_unique: seenTipKeys.size,
      total_formulas: totalFormulas,
      total_parameter_tables: totalTables,
      zero_tip_docs: zeroTipDocs,
      hm_tip_total: hmTipTotal,
      per_doc: perDoc,
    };
  }
}
