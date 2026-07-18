/**
 * HyperMillSchemaUnifier — Merge all HM-KC-MS0 extraction outputs into a
 * canonical parameter catalog with unique HM-P-XXXX identifiers.
 *
 * U-HKC06: Orchestrates all 5 HyperMill extractors, normalises their outputs
 * into a flat UnifiedParameter list, deduplicates within each domain, assigns
 * sequential canonical IDs, and writes the master JSON catalog to disk.
 *
 * Domains produced:
 *   CAM-Cycle    — 8,995 cycle parameters from Metric.cfg files
 *   Cycle-Mapping — 150 cycle type mappings from omCycles.txt
 *   Tool-Geometry — field definitions from demo.db geometry classes
 *   Cutting-Tech  — technology params from demo.db + IM_Tool_DB formulas/materials
 *   Macro         — macro types, macro defs, and job entries from IM_Macro_DB
 *   Feature-Job   — feature-to-job mappings from omFeature2JobCatalog*.xml
 *   Post-Config   — NC code check entries from omPPFC.cfg
 *
 * @engine HyperMillSchemaUnifier
 * @shortcode E1196
 * @dispatcher camDispatcher
 * @actions hypermill_schema_unify
 * @milestone HM-KC-MS0/U-HKC06
 */

import * as fsPromises from "node:fs/promises";
import * as path from "node:path";
import {
  hyperMillMetricCfgExtractor,
  type ExtractionResult,
} from "./HyperMillMetricCfgExtractor.js";
import {
  hyperMillOmCyclesExtractor,
  type CycleCatalog,
} from "./HyperMillOmCyclesExtractor.js";
import {
  hyperMillDemoDbExtractor,
  type DemoDbExtractionResult,
} from "./HyperMillDemoDbExtractor.js";
import {
  imToolDbExtractor,
  imMacroDbExtractor,
  type IMToolDbResult,
  type IMMacroDbResult,
} from "./HyperMillIMDbExtractor.js";
import {
  hyperMillXmlExtractor,
  type XmlExtractionResult,
} from "./HyperMillXmlExtractor.js";

// ── Public Interfaces ─────────────────────────────────────────────────────────

export interface UnifiedParameter {
  /** Canonical identifier, e.g. "HM-P-0001" */
  id: string;
  /** Parameter or entity name */
  name: string;
  /** Domain grouping */
  domain:
    | "CAM-Cycle"
    | "Cycle-Mapping"
    | "Tool-Geometry"
    | "Cutting-Tech"
    | "Macro"
    | "Feature-Job"
    | "Post-Config";
  /** Value type: numeric | formula | text | integer | real */
  type: string;
  /** Default value when known */
  defaultValue?: string | number;
  /** Human-readable description */
  description: string;
  /** Which extractor produced this entry */
  source:
    | "metric-cfg"
    | "omcycles"
    | "demo-db"
    | "im-tool-db"
    | "im-macro-db"
    | "feature2job"
    | "post-config";
  /** Original file or table name, when applicable */
  sourceFile?: string;
  /** For CAM-Cycle entries: the cycle type (e.g. "HMCAST") */
  cycleType?: string;
}

export interface ParameterCatalog {
  /** Catalog format version */
  version: string;
  /** ISO 8601 generation timestamp */
  generatedAt: string;
  /** Total unique parameters after deduplication */
  totalParameters: number;
  /** Per-domain parameter counts */
  domains: Record<string, number>;
  /** All parameters, sorted by domain then name */
  parameters: UnifiedParameter[];
  /** Source-level extraction statistics */
  sources: {
    metricCfg: { files: number; params: number };
    omCycles: { mappings: number };
    demoDb: { tools: number; geometryClasses: number; cuttingTechs: number };
    imToolDb: { tables: number; matTechItems: number };
    imMacroDb: { macros: number; jobs: number };
    feature2Job: { catalogs: number; mappings: number; items: number };
    postConfig: { entries: number };
  };
}

// ── Domain sort order (deterministic output) ──────────────────────────────────

const DOMAIN_ORDER: UnifiedParameter["domain"][] = [
  "CAM-Cycle",
  "Cycle-Mapping",
  "Tool-Geometry",
  "Cutting-Tech",
  "Macro",
  "Feature-Job",
  "Post-Config",
];

// ── HyperMillSchemaUnifier ────────────────────────────────────────────────────

export class HyperMillSchemaUnifier {
  /** Default output path for the master catalog JSON */
  private readonly outputPath: string;

  constructor(
    outputPath = "H:/prism/mcp-server/data/hypermill/HyperMillParameterCatalog.json",
  ) {
    this.outputPath = outputPath;
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Run all 5 extractors in parallel, normalise their outputs, deduplicate
   * within each domain, assign HM-P-XXXX IDs, and return the master catalog.
   *
   * Individual extractor failures are captured and excluded from the catalog
   * without aborting the entire pipeline.
   *
   * @returns Fully populated ParameterCatalog
   */
  async unify(): Promise<ParameterCatalog> {
    const generatedAt = new Date().toISOString();

    // ── Run all extractors in parallel ──────────────────────────────────────
    const [
      metricCfgResult,
      omCyclesResult,
      demoDbResult,
      imToolDbResult,
      imMacroDbResult,
      xmlResult,
    ] = await Promise.allSettled([
      hyperMillMetricCfgExtractor.extractAll(),
      hyperMillOmCyclesExtractor.extract().catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e);
        throw new Error(msg);
      }),
      hyperMillDemoDbExtractor.extract(),
      imToolDbExtractor.extract(),
      imMacroDbExtractor.extract(),
      hyperMillXmlExtractor.extract(),
    ]);

    // ── Safely unwrap settled results ───────────────────────────────────────
    const metricCfg = metricCfgResult.status === "fulfilled"
      ? metricCfgResult.value
      : null;
    const omCycles = omCyclesResult.status === "fulfilled"
      ? omCyclesResult.value
      : null;
    const demoDb = demoDbResult.status === "fulfilled"
      ? demoDbResult.value
      : null;
    const imToolDb = imToolDbResult.status === "fulfilled"
      ? imToolDbResult.value
      : null;
    const imMacroDb = imMacroDbResult.status === "fulfilled"
      ? imMacroDbResult.value
      : null;
    const xmlExtracted = xmlResult.status === "fulfilled"
      ? xmlResult.value
      : null;

    // ── Normalise each source into UnifiedParameter lists ──────────────────
    const rawParams: UnifiedParameter[] = [
      ...(metricCfg ? this.normalizeMetricCfg(metricCfg) : []),
      ...(omCycles ? this.normalizeOmCycles(omCycles) : []),
      ...(demoDb ? this.normalizeDemoDb(demoDb) : []),
      ...(imToolDb ? this.normalizeIMToolDb(imToolDb) : []),
      ...(imMacroDb ? this.normalizeIMMacroDb(imMacroDb) : []),
      ...(xmlExtracted ? this.normalizeFeature2Job(xmlExtracted) : []),
    ];

    // ── Deduplicate, sort, and assign IDs ───────────────────────────────────
    const deduped = this.deduplicateParameters(rawParams);
    this.sortParameters(deduped);
    this.assignIds(deduped);

    // ── Build domain counts ─────────────────────────────────────────────────
    const domains: Record<string, number> = {};
    for (const p of deduped) {
      domains[p.domain] = (domains[p.domain] ?? 0) + 1;
    }

    // ── Build sources summary ───────────────────────────────────────────────
    const sources: ParameterCatalog["sources"] = {
      metricCfg: {
        files: metricCfg ? metricCfg.totalCycleTypes : 0,
        params: metricCfg ? metricCfg.totalParameters : 0,
      },
      omCycles: {
        mappings: omCycles ? omCycles.totalMappings : 0,
      },
      demoDb: {
        tools: demoDb ? demoDb.totalTools : 0,
        geometryClasses: demoDb ? demoDb.totalGeometryClasses : 0,
        cuttingTechs: demoDb ? demoDb.totalCuttingTechs : 0,
      },
      imToolDb: {
        tables: imToolDb ? imToolDb.tables.length : 0,
        matTechItems: imToolDb ? imToolDb.matTechItemCount : 0,
      },
      imMacroDb: {
        macros: imMacroDb ? imMacroDb.macroCount : 0,
        jobs: imMacroDb ? imMacroDb.jobs.length : 0,
      },
      feature2Job: {
        catalogs: xmlExtracted ? xmlExtracted.totalCatalogs : 0,
        mappings: xmlExtracted ? xmlExtracted.totalMappings : 0,
        items: xmlExtracted ? xmlExtracted.totalItems : 0,
      },
      postConfig: {
        entries: xmlExtracted ? xmlExtracted.postConfig.length : 0,
      },
    };

    return {
      version: "1.0.0",
      generatedAt,
      totalParameters: deduped.length,
      domains,
      parameters: deduped,
      sources,
    };
  }

  /**
   * Serialise the catalog to disk at the configured output path.
   * Creates the target directory if it does not exist.
   *
   * @param catalog - The catalog to persist
   * @returns Absolute path of the written file
   */
  async writeCatalog(catalog: ParameterCatalog): Promise<string> {
    const dir = path.dirname(this.outputPath);
    await fsPromises.mkdir(dir, { recursive: true });
    const json = JSON.stringify(catalog, null, 2);
    await fsPromises.writeFile(this.outputPath, json, "utf8");
    return this.outputPath;
  }

  // ── Normalisation Helpers ───────────────────────────────────────────────────

  /**
   * Convert Metric.cfg ExtractionResult into UnifiedParameters (CAM-Cycle domain).
   * Each CfgParameter within each CycleParameterSchema becomes one entry.
   *
   * @param result - Output from HyperMillMetricCfgExtractor.extractAll()
   */
  normalizeMetricCfg(result: ExtractionResult): UnifiedParameter[] {
    const params: UnifiedParameter[] = [];
    for (const schema of result.schemas) {
      for (const p of schema.parameters) {
        params.push({
          id: "",
          name: p.name,
          domain: "CAM-Cycle",
          type: p.valueType,
          defaultValue: p.defaultValue !== "" ? p.defaultValue : undefined,
          description:
            p.description !== ""
              ? p.description
              : `Cycle parameter ${p.name} in ${schema.cycleType}`,
          source: "metric-cfg",
          sourceFile: schema.sourceFile,
          cycleType: schema.cycleType,
        });
      }
    }
    return params;
  }

  /**
   * Convert CycleCatalog into UnifiedParameters (Cycle-Mapping domain).
   * Each CycleMapping becomes one entry using its displayName.
   *
   * @param catalog - Output from HyperMillOmCyclesExtractor.extract()
   */
  normalizeOmCycles(catalog: CycleCatalog): UnifiedParameter[] {
    return catalog.mappings.map((m) => ({
      id: "",
      name: m.displayName,
      domain: "Cycle-Mapping" as const,
      type: "text",
      defaultValue: m.canonicalId,
      description: `Cycle mapping: ${m.displayName} → ${m.canonicalId} (${m.category})`,
      source: "omcycles" as const,
      sourceFile: "omCycles.txt",
    }));
  }

  /**
   * Convert DemoDbExtractionResult into UnifiedParameters.
   * Geometry class field definitions → Tool-Geometry domain.
   * Cutting technology field definitions → Cutting-Tech domain.
   *
   * Each unique field name per domain becomes one entry (dedup-ready).
   *
   * @param result - Output from HyperMillDemoDbExtractor.extract()
   */
  normalizeDemoDb(result: DemoDbExtractionResult): UnifiedParameter[] {
    if (result.status !== "success") return [];

    const params: UnifiedParameter[] = [];

    // Tool-Geometry: one entry per unique field name across all geometry classes
    const geometryFieldsSeen = new Set<string>();
    for (const gc of result.geometryClasses) {
      for (const field of gc.fields) {
        if (!geometryFieldsSeen.has(field.name)) {
          geometryFieldsSeen.add(field.name);
          params.push({
            id: "",
            name: field.name,
            domain: "Tool-Geometry",
            type: field.type === "REAL" ? "real" : field.type === "INTEGER" ? "integer" : "text",
            description: field.description,
            source: "demo-db",
            sourceFile: "demo.db",
          });
        }
      }
    }

    // Cutting-Tech: one entry per unique field name in the Technologies table
    const techFieldsSeen = new Set<string>();
    for (const field of result.cuttingTech.fields) {
      if (!techFieldsSeen.has(field.name)) {
        techFieldsSeen.add(field.name);
        params.push({
          id: "",
          name: field.name,
          domain: "Cutting-Tech",
          type: field.type === "REAL" ? "real" : field.type === "INTEGER" ? "integer" : "text",
          description: field.description,
          source: "demo-db",
          sourceFile: "demo.db",
        });
      }
    }

    return params;
  }

  /**
   * Convert IMToolDbResult into UnifiedParameters (Cutting-Tech domain).
   * Materials, cutting materials, and speed/feed formulas become entries.
   *
   * @param result - Output from IMToolDbExtractor.extract()
   */
  normalizeIMToolDb(result: IMToolDbResult): UnifiedParameter[] {
    if (result.status !== "success") return [];

    const params: UnifiedParameter[] = [];

    // Workpiece materials
    for (const m of result.materials) {
      params.push({
        id: "",
        name: `Material_${m.name}`,
        domain: "Cutting-Tech",
        type: "text",
        description: `Workpiece material: ${m.name} (id=${m.id})`,
        source: "im-tool-db",
        sourceFile: "IM_Tool_DB_V2023.1.db",
      });
    }

    // Cutting materials
    for (const cm of result.cuttingMaterials) {
      params.push({
        id: "",
        name: `CuttingMaterial_${cm.name}`,
        domain: "Cutting-Tech",
        type: "text",
        description: `Cutting material: ${cm.name} (id=${cm.id})`,
        source: "im-tool-db",
        sourceFile: "IM_Tool_DB_V2023.1.db",
      });
    }

    // Speed/feed formulas
    for (const f of result.formulas) {
      params.push({
        id: "",
        name: `Formula_${f.name}`,
        domain: "Cutting-Tech",
        type: "formula",
        defaultValue: f.formula,
        description: `Speed/feed formula: ${f.name} = ${f.formula}`,
        source: "im-tool-db",
        sourceFile: "IM_Tool_DB_V2023.1.db",
      });
    }

    return params;
  }

  /**
   * Convert IMMacroDbResult into UnifiedParameters (Macro domain).
   * Macro types, macro definitions, and job entries become entries.
   *
   * @param result - Output from IMMacroDbExtractor.extract()
   */
  normalizeIMMacroDb(result: IMMacroDbResult): UnifiedParameter[] {
    if (result.status !== "success") return [];

    const params: UnifiedParameter[] = [];

    // Macro types
    for (const mt of result.macroTypes) {
      params.push({
        id: "",
        name: `MacroType_${mt.name}`,
        domain: "Macro",
        type: "text",
        description: `Intelligent Macro type: ${mt.name} (id=${mt.id})`,
        source: "im-macro-db",
        sourceFile: "IM_Macro_DB.db",
      });
    }

    // Macro definitions
    for (const m of result.macros) {
      params.push({
        id: "",
        name: `Macro_${m.name}`,
        domain: "Macro",
        type: "text",
        description: `Intelligent Macro: ${m.name}, type=${m.type}, usage=${m.usage}`,
        source: "im-macro-db",
        sourceFile: "IM_Macro_DB.db",
      });
    }

    // Job definitions
    for (const j of result.jobs) {
      params.push({
        id: "",
        name: `Job_${j.systemJobType}`,
        domain: "Macro",
        type: "text",
        defaultValue: j.toolDiameter,
        description: `Macro job: ${j.systemJobType}, jobType=${j.jobType}, toolType=${j.toolType}, diameter=${j.toolDiameter}mm`,
        source: "im-macro-db",
        sourceFile: "IM_Macro_DB.db",
      });
    }

    return params;
  }

  /**
   * Convert XmlExtractionResult into UnifiedParameters.
   * Feature-Job mappings → Feature-Job domain.
   * PostConfig entries → Post-Config domain.
   *
   * Names are constructed to be unique per mapping by incorporating the catalog
   * source file stem when featureType alone would not be unique.
   *
   * @param result - Output from HyperMillXmlExtractor.extract()
   */
  normalizeFeature2Job(result: XmlExtractionResult): UnifiedParameter[] {
    const params: UnifiedParameter[] = [];

    // Feature-to-Job mappings.
    // Each mapping defines one feature type → job type alternative.
    // Name = featureType::jobType to capture each unique combination.
    // When featureType is empty, fall back to jobGroup::jobType.
    for (const catalog of result.catalogs) {
      for (const mapping of catalog.mappings) {
        const featurePart = mapping.featureType !== ""
          ? mapping.featureType
          : mapping.jobGroup;
        const jobPart = mapping.jobType !== "" ? mapping.jobType : "unknown";
        const name = `${featurePart}::${jobPart}`;
        params.push({
          id: "",
          name,
          domain: "Feature-Job",
          type: "text",
          defaultValue: mapping.jobType !== "" ? mapping.jobType : undefined,
          description: mapping.jobName !== ""
            ? `Feature ${mapping.featureType || mapping.jobGroup} → Job ${mapping.jobName} (${mapping.jobType})`
            : `Feature-to-job mapping: ${name}`,
          source: "feature2job",
          sourceFile: catalog.sourceFile,
        });
      }
    }

    // Post-Processor config entries
    for (const entry of result.postConfig) {
      params.push({
        id: "",
        name: entry.code,
        domain: "Post-Config",
        type: "integer",
        defaultValue: entry.ncCode,
        description: `NC code ${entry.ncCode}: ${entry.description}`,
        source: "post-config",
        sourceFile: "omPPFC.cfg",
      });
    }

    return params;
  }

  // ── Deduplication ───────────────────────────────────────────────────────────

  /**
   * Remove duplicate entries within each domain.
   *
   * Deduplication key:
   *   - CAM-Cycle: (domain, cycleType, name) — same param name is valid across
   *     different cycle types; only remove exact same cycle+name combos.
   *   - All other domains: (domain, name) — removes true duplicates.
   *
   * When duplicates exist, the first occurrence is kept.
   *
   * @param params - Raw parameter list (may contain duplicates)
   * @returns Deduplicated list
   */
  deduplicateParameters(params: UnifiedParameter[]): UnifiedParameter[] {
    const seen = new Set<string>();
    const result: UnifiedParameter[] = [];
    for (const p of params) {
      const key = p.domain === "CAM-Cycle"
        ? `${p.domain}\x00${p.cycleType ?? ""}\x00${p.name}`
        : `${p.domain}\x00${p.name}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(p);
      }
    }
    return result;
  }

  // ── Sorting ─────────────────────────────────────────────────────────────────

  /**
   * Sort parameters in-place: primary key = domain order, secondary = name
   * alphabetically (case-insensitive).
   *
   * @param params - Parameter list to sort in-place
   */
  private sortParameters(params: UnifiedParameter[]): void {
    params.sort((a, b) => {
      const ai = DOMAIN_ORDER.indexOf(a.domain);
      const bi = DOMAIN_ORDER.indexOf(b.domain);
      if (ai !== bi) return ai - bi;
      return a.name.localeCompare(b.name, "en", { sensitivity: "base" });
    });
  }

  // ── ID Assignment ───────────────────────────────────────────────────────────

  /**
   * Assign HM-P-XXXXX sequential IDs in-place.
   * IDs start at HM-P-00001 and increment across all domains in sorted order.
   * Uses 5-digit zero-padding to accommodate catalogs with up to 99,999 entries.
   *
   * @param params - Sorted parameter list; modified in-place
   */
  assignIds(params: UnifiedParameter[]): void {
    for (let i = 0; i < params.length; i++) {
      params[i].id = `HM-P-${String(i + 1).padStart(5, "0")}`;
    }
  }
}

// ── Singleton Export ──────────────────────────────────────────────────────────

export const hyperMillSchemaUnifier = new HyperMillSchemaUnifier();
