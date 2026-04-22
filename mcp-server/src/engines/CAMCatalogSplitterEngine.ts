/**
 * CAMCatalogSplitterEngine — PHASE-1 catalog fan-out
 * =====================================================
 *
 * Splits consolidated CAM catalog files (captured as single JSONs per CAM
 * during Phase-0 capture) into per-module deliverables expected by the
 * Phase-1 roadmap (U-CAM02..U-CAM12 for hyperMILL, U-CAM14..U-CAM19 for
 * Mastercam, etc.).
 *
 * Input shape (consolidated catalog):
 *   { schema_version, system_id, catalog_id, catalog_name,
 *     modules: {
 *       "<module_id>": {
 *         module_id, module_name, description,
 *         total_operations, total_parameters,
 *         operations: [{ id, name, cfg_file, description, dialogs: [...] }]
 *       }
 *     },
 *     common_parameters, tilt_strategies, macro_types, tribal_knowledge
 *   }
 *
 * Output shape (per-module deliverable) matches the consolidated module
 * body plus provenance breadcrumbs so downstream linkers can trace back
 * to the single source of truth.
 *
 * Why split at all: the roadmap (CAM-EXHAUST-MS0 PHASE-1) treats each
 * CAM module as its own unit (hyperMILL 5-axis, MAXX, Mill-Turn...), so
 * the CI-facing deliverable file must be per-module. The capture was
 * batch-emitted for Phase-0 efficiency; Phase-1 needs it fanned out.
 *
 * This is a pure data reshape — no new domain knowledge is authored.
 * Splitting is idempotent (re-running overwrites deterministically).
 *
 * Authored 2026-04-21 — CAM-EXHAUST-MS0 PHASE-1 fan-out helper.
 */

import * as fs from "node:fs";
import * as path from "node:path";

// ─── Types ──────────────────────────────────────────────────────────

export interface ConsolidatedCatalog {
  schema_version?: string;
  system_id?: string;
  catalog_id?: string;
  catalog_name?: string;
  description?: string;
  generated_at?: string;
  source?: string;
  total_parameters?: number;
  modules: Record<string, ModuleEntry>;
  common_parameters?: unknown;
  tilt_strategies?: unknown;
  macro_types?: unknown;
  tribal_knowledge?: unknown;
}

export interface ModuleEntry {
  module_id: string;
  module_name?: string;
  description?: string;
  total_operations?: number;
  total_parameters?: number;
  operations?: Array<Record<string, unknown>>;
  [extra: string]: unknown;
}

export interface SplitRule {
  module_id: string;
  out_basename: string;
}

export interface SplitResult {
  consolidated_path: string;
  out_dir: string;
  files_written: string[];
  modules_found: string[];
  modules_missing: string[];
  total_operations: number;
  total_parameters: number;
}

// ─── Engine ─────────────────────────────────────────────────────────

export class CAMCatalogSplitterEngine {
  readonly name = "CAMCatalogSplitterEngine";

  /** Split a consolidated catalog into per-module files. */
  split(args: {
    consolidated_path: string;
    out_dir: string;
    rules: SplitRule[];
    system_id?: string;
  }): SplitResult {
    const raw = fs.readFileSync(args.consolidated_path, "utf-8");
    const cat = JSON.parse(raw) as ConsolidatedCatalog;
    if (!cat.modules || typeof cat.modules !== "object") {
      throw new Error(`Consolidated catalog at ${args.consolidated_path} has no modules dict`);
    }

    fs.mkdirSync(args.out_dir, { recursive: true });

    const written: string[] = [];
    const found: string[] = [];
    const missing: string[] = [];
    let totalOps = 0;
    let totalParams = 0;

    for (const rule of args.rules) {
      const mod = cat.modules[rule.module_id];
      if (!mod) {
        missing.push(rule.module_id);
        continue;
      }
      found.push(rule.module_id);
      totalOps += mod.total_operations ?? (mod.operations?.length ?? 0);
      totalParams += mod.total_parameters ?? 0;

      const out = {
        schemaVersion: 1,
        system_id: args.system_id ?? cat.system_id ?? "unknown",
        module: mod,
        provenance: {
          consolidated_source: path.basename(args.consolidated_path),
          split_at: new Date().toISOString(),
          split_rule: rule,
        },
      };

      const outPath = path.join(args.out_dir, rule.out_basename);
      fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
      written.push(outPath);
    }

    return {
      consolidated_path: args.consolidated_path,
      out_dir: args.out_dir,
      files_written: written,
      modules_found: found,
      modules_missing: missing,
      total_operations: totalOps,
      total_parameters: totalParams,
    };
  }

  /**
   * Alternate split mode — pluck top-level keys from a consolidated JSON
   * into per-unit files. Used for CAMs whose Phase-0 capture did NOT
   * conform to the `modules: { <id>: {...} }` shape (Mastercam, Fusion,
   * Inventor-HSM all emit their own layouts).
   */
  splitByKeys(args: {
    consolidated_path: string;
    out_dir: string;
    rules: Array<{ key: string; out_basename: string }>;
    system_id?: string;
  }): SplitResult {
    const raw = fs.readFileSync(args.consolidated_path, "utf-8");
    const doc = JSON.parse(raw) as Record<string, unknown>;

    fs.mkdirSync(args.out_dir, { recursive: true });

    const written: string[] = [];
    const found: string[] = [];
    const missing: string[] = [];
    let totalOps = 0;
    let totalParams = 0;

    for (const rule of args.rules) {
      const section = doc[rule.key];
      if (section === undefined || section === null) {
        missing.push(rule.key);
        continue;
      }
      found.push(rule.key);

      // Best-effort count — depends on section shape
      if (Array.isArray(section)) totalOps += section.length;
      else if (typeof section === "object") totalOps += Object.keys(section as object).length;

      const out = {
        schemaVersion: 1,
        system_id: args.system_id ?? (doc.system_id as string | undefined) ?? "unknown",
        section_key: rule.key,
        section,
        provenance: {
          consolidated_source: path.basename(args.consolidated_path),
          split_at: new Date().toISOString(),
          split_rule: rule,
        },
      };

      const outPath = path.join(args.out_dir, rule.out_basename);
      fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
      written.push(outPath);
    }

    return {
      consolidated_path: args.consolidated_path,
      out_dir: args.out_dir,
      files_written: written,
      modules_found: found,
      modules_missing: missing,
      total_operations: totalOps,
      total_parameters: totalParams,
    };
  }

  /** Audit which module IDs exist in a consolidated catalog without writing. */
  listModules(consolidatedPath: string): Array<{ module_id: string; module_name?: string; ops: number; params: number }> {
    const cat = JSON.parse(fs.readFileSync(consolidatedPath, "utf-8")) as ConsolidatedCatalog;
    const out: Array<{ module_id: string; module_name?: string; ops: number; params: number }> = [];
    for (const [id, mod] of Object.entries(cat.modules ?? {})) {
      out.push({
        module_id: id,
        module_name: mod.module_name,
        ops: mod.total_operations ?? (mod.operations?.length ?? 0),
        params: mod.total_parameters ?? 0,
      });
    }
    return out;
  }
}

export const camCatalogSplitterEngine = new CAMCatalogSplitterEngine();
