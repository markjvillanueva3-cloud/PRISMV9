/**
 * CAMCatalogLoaderEngine — binds captured CAM catalog JSONs to canonical schemas
 * ==============================================================================
 *
 * Solves F3 from SCRUTINY-CAM-EXHAUST-MS0-2026-04-21.md:
 * Before this engine, CAMFunctionIndexSchema + CAMUIElementSchema were defined
 * but consumed by nothing. Captured catalogs in data/cam-functions/ + data/cam-ui/
 * drifted in shape (Mastercam → total_parameters, hyperMILL → total_operations,
 * Fusion → totalElements, Inventor → nested nodes). No contract.
 *
 * This engine:
 *   1. Loads every catalog JSON under data/cam-functions/<slug>/ and data/cam-ui/<slug>/
 *   2. Validates the directory slug against CAMSystemRegistry
 *   3. Produces a normalized CAMCatalogSummary per system with observed counts
 *   4. Reports drift vs CAM-EXHAUST-MS0.json claimed param counts
 *
 * It does NOT force the captured files into CAMFunctionIndex shape today — that
 * migration is F3's Phase-0.5 "U-CAM-SCHEMA-MIGRATE" follow-up. The loader
 * tolerates the observed shape and surfaces what each file actually contains so
 * Phase-5 consumer engines (Router, Validator, Strategy, Optimizer, Translator,
 * AGIReasoning, TribalKnowledge, FeatureLearning) can depend on a contract.
 *
 * Authored 2026-04-21 — CAM-EXHAUST-MS0 F3 fix.
 */

import * as fs from "fs";
import * as path from "path";
import { CAM_SYSTEM_REGISTRY, isCAMSlug, type CAMSystemMeta } from "../registries/CAMSystemRegistry.js";

export interface CAMCatalogFileSummary {
  path: string;
  bytes: number;
  /** Top-level keys observed */
  top_keys: string[];
  /** Best-effort param count from whichever field the capture used */
  param_count: number;
  /** Field name the param_count was read from (or "unknown") */
  param_count_source: string;
  /** True if file parses as JSON */
  parse_ok: boolean;
  /** Parse error if any */
  parse_error?: string;
}

export interface CAMCatalogSummary {
  slug: string;
  meta: CAMSystemMeta;
  functions_files: CAMCatalogFileSummary[];
  ui_files: CAMCatalogFileSummary[];
  total_param_count: number;
  total_bytes: number;
  has_any_data: boolean;
}

export interface CAMCatalogDriftReport {
  slug: string;
  claimed_params: number;
  observed_params: number;
  coverage_pct: number;
  status: "ok" | "under" | "missing";
}

export interface CAMCatalogLoadResult {
  loaded_at: string;
  systems: Record<string, CAMCatalogSummary>;
  drift_report: CAMCatalogDriftReport[];
  total_systems_with_data: number;
  total_params_across_all: number;
  errors: string[];
}

/**
 * Claimed parameter counts from CAM-EXHAUST-MS0.json `agent_research_summary`.
 * Kept here to detect drift between what the summary claims and what was
 * captured. Update alongside the roadmap JSON when new research lands.
 */
const CLAIMED_PARAM_COUNTS: Record<string, number> = {
  hypermill: 1323,
  mastercam: 1689,
  fusion360: 1459,
  "inventor-hsm": 1247,
  solidcam: 0, // F2: no agent-research pass yet — must be commissioned
};

export class CAMCatalogLoaderEngine {
  private dataRoot: string;

  constructor(dataRoot = path.join(process.cwd(), "data")) {
    this.dataRoot = dataRoot;
  }

  /** Read + summarize a single JSON catalog file */
  private summarizeFile(filePath: string): CAMCatalogFileSummary {
    const summary: CAMCatalogFileSummary = {
      path: filePath,
      bytes: 0,
      top_keys: [],
      param_count: 0,
      param_count_source: "unknown",
      parse_ok: false,
    };

    try {
      const raw = fs.readFileSync(filePath, "utf-8");
      summary.bytes = raw.length;
      const json = JSON.parse(raw);
      summary.parse_ok = true;
      summary.top_keys = Object.keys(json).slice(0, 20);

      // Try the well-known field names we've observed in captured files
      const candidates: Array<[string, number | undefined]> = [
        ["total_parameters", json.total_parameters],
        ["totalParameters", json.totalParameters],
        ["total_elements", json.total_elements],
        ["totalElements", json.totalElements],
        ["total_operations", json.total_operations],
      ];
      for (const [field, val] of candidates) {
        if (typeof val === "number" && val > 0) {
          summary.param_count = val;
          summary.param_count_source = field;
          break;
        }
      }

      // Fallback: count leaf parameter-shaped objects
      if (summary.param_count === 0) {
        summary.param_count = this.countLeafParams(json);
        summary.param_count_source = "leaf_count_fallback";
      }
    } catch (err) {
      summary.parse_error = err instanceof Error ? err.message : String(err);
    }

    return summary;
  }

  /** Recursively count objects that look like a parameter definition */
  private countLeafParams(obj: unknown, depth = 0): number {
    if (depth > 8 || obj == null) return 0;
    if (Array.isArray(obj)) {
      return obj.reduce<number>((a, x) => a + this.countLeafParams(x, depth + 1), 0);
    }
    if (typeof obj === "object") {
      const rec = obj as Record<string, unknown>;
      // Heuristic: looks like a param if it has name + (type | value | default)
      const hasName = typeof rec.name === "string" || typeof rec.id === "string";
      const hasTypeOrValue =
        "type" in rec || "value" in rec || "default" in rec || "unit" in rec;
      const selfCount = hasName && hasTypeOrValue ? 1 : 0;
      let childCount = 0;
      for (const v of Object.values(rec)) {
        childCount += this.countLeafParams(v, depth + 1);
      }
      return selfCount + childCount;
    }
    return 0;
  }

  /** List JSON files in a directory (safe if missing) */
  private listJsonFiles(dir: string): string[] {
    if (!fs.existsSync(dir)) return [];
    return fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => path.join(dir, f));
  }

  /** Load all catalogs for a single CAM system */
  private loadSystem(slug: string, meta: CAMSystemMeta): CAMCatalogSummary {
    const functionsDir = path.join(this.dataRoot, "cam-functions", meta.functions_dir);
    const uiDir = path.join(this.dataRoot, "cam-ui", meta.ui_dir);

    const functions_files = this.listJsonFiles(functionsDir).map((f) => this.summarizeFile(f));
    const ui_files = this.listJsonFiles(uiDir).map((f) => this.summarizeFile(f));

    // Take the max param_count across "*_COMPLETE.json" + sum of feeder files
    const functionsParams = this.reconcileParamCount(functions_files);
    const uiParams = this.reconcileParamCount(ui_files);
    const total_param_count = functionsParams + uiParams;

    const total_bytes =
      functions_files.reduce((a, f) => a + f.bytes, 0) +
      ui_files.reduce((a, f) => a + f.bytes, 0);

    return {
      slug,
      meta,
      functions_files,
      ui_files,
      total_param_count,
      total_bytes,
      has_any_data: functions_files.length + ui_files.length > 0,
    };
  }

  /**
   * When multiple feeder files exist alongside a *_COMPLETE.json file, the
   * COMPLETE file's total is authoritative — summing would double-count.
   * Falls back to sum when no COMPLETE marker is present.
   */
  private reconcileParamCount(files: CAMCatalogFileSummary[]): number {
    if (files.length === 0) return 0;
    const complete = files.find((f) => /complete/i.test(path.basename(f.path)));
    if (complete && complete.param_count > 0) return complete.param_count;
    return files.reduce((a, f) => a + f.param_count, 0);
  }

  /** Validate directory slugs against the canonical registry */
  private detectUnknownDirs(subdir: "cam-functions" | "cam-ui"): string[] {
    const root = path.join(this.dataRoot, subdir);
    if (!fs.existsSync(root)) return [];
    return fs
      .readdirSync(root, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .filter((name) => !isCAMSlug(name));
  }

  /** Main entry point — load everything and build the drift report */
  loadAll(): CAMCatalogLoadResult {
    const result: CAMCatalogLoadResult = {
      loaded_at: new Date().toISOString(),
      systems: {},
      drift_report: [],
      total_systems_with_data: 0,
      total_params_across_all: 0,
      errors: [],
    };

    // Reject off-registry directories
    for (const subdir of ["cam-functions", "cam-ui"] as const) {
      for (const unk of this.detectUnknownDirs(subdir)) {
        result.errors.push(
          `Non-canonical directory: data/${subdir}/${unk}/ — add to CAMSystemRegistry or remove`
        );
      }
    }

    // Load every registered system
    for (const [slug, meta] of Object.entries(CAM_SYSTEM_REGISTRY)) {
      try {
        const summary = this.loadSystem(slug, meta);
        result.systems[slug] = summary;
        if (summary.has_any_data) result.total_systems_with_data += 1;
        result.total_params_across_all += summary.total_param_count;

        // Drift report — compare observed vs claimed
        if (slug in CLAIMED_PARAM_COUNTS) {
          const claimed = CLAIMED_PARAM_COUNTS[slug];
          const observed = summary.total_param_count;
          const coverage = claimed > 0 ? Math.round((observed / claimed) * 100) : 0;
          const status: CAMCatalogDriftReport["status"] =
            observed === 0 ? "missing" : coverage >= 80 ? "ok" : "under";
          result.drift_report.push({
            slug,
            claimed_params: claimed,
            observed_params: observed,
            coverage_pct: coverage,
            status,
          });
        }
      } catch (err) {
        result.errors.push(
          `Failed to load ${slug}: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    return result;
  }

  /** Load a single system — used by consumer engines (Router, Validator) */
  loadOne(slug: string): CAMCatalogSummary {
    if (!isCAMSlug(slug)) {
      throw new Error(
        `Unknown CAM slug "${slug}". Use CAMSystemRegistry.CAM_SLUGS for valid values.`
      );
    }
    return this.loadSystem(slug, CAM_SYSTEM_REGISTRY[slug]);
  }

  /** Priority-5 coverage snapshot — single number for status dashboards */
  priority5Coverage(): { slug: string; coverage_pct: number; status: string }[] {
    const all = this.loadAll();
    return all.drift_report.filter((d) =>
      ["mastercam", "hypermill", "fusion360", "inventor-hsm", "solidcam"].includes(d.slug)
    );
  }
}

export const camCatalogLoaderEngine = new CAMCatalogLoaderEngine(
  path.join(process.cwd(), "data")
);
