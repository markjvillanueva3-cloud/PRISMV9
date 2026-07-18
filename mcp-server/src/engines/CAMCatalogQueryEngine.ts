/**
 * CAMCatalogQueryEngine — normalized cross-system per-operation parameter query + validation
 * ==========================================================================================
 *
 * slot:kilo (U-CAM-CAT-QUERY, 2026-05-29). The "utilize" layer over the grounded CAM feature
 * catalogs in `data/cam-functions/<system>/`. Complements (does NOT duplicate):
 *   - CAMCatalogLoaderEngine     — COUNTS params + reports coverage/drift (no per-op records).
 *   - {Fusion360,Mastercam,HyperMill}FunctionIndexEngine — per-system lookup, but each returns
 *     its OWN system-specific param type. No normalized CROSS-system query existed before this.
 *
 * This engine reads each system's `function-index.json` manifest, walks the listed module files,
 * and normalizes the three different parameter-record shapes into ONE `NormalizedCamParam`:
 *   - Fusion  : section.<op>.tabs.<tab>.params[]    param {name,type,unit,min,max,values,default,required}
 *   - Mastercam: module.toolpaths[].pages.<page>.params[]  param {id,type,values,default,unit,range:[min,max]}
 *   - hyperMILL: module.operations[].dialogs[].parameters[] (flat) AND menus[].dialogs[].parameters[]
 *                (nested value:{type,default_value,constraints:{min,max,enum_values}})
 *
 * Pure + fs-only (no child_process, no network). Lazy per-system cache. Fail-soft per file (a
 * malformed module never crashes the query — it is skipped and surfaced in `loadWarnings`).
 */

import fs from "node:fs";
import path from "node:path";

/** The canonical 3 systems this engine targets (extensible — any dir under cam-functions/ works). */
export const CAM_QUERY_SYSTEMS = ["fusion360", "hypermill", "mastercam"] as const;
export type CamQuerySystem = string;

/** One normalized parameter record, identical shape across all CAM systems. */
export interface NormalizedCamParam {
  name: string;                 // canonical machine key: raw.id ?? raw.name (Fusion uses name, Mastercam/hyperMILL use id)
  label: string | null;         // human display name when distinct from the machine key (hyperMILL carries both)
  type: string | null;          // number | enum | boolean | distance | formula | integer | string | ...
  default: unknown;             // default value if known
  unit: string | null;
  min: number | null;
  max: number | null;
  enumValues: readonly unknown[] | null;
  required: boolean;
  description: string | null;
  system: string;
  operation: string;            // operation id
  uiTab: string | null;         // nearest tab/page/dialog name (the "where in the UI" hint)
}

export interface CamOperation {
  id: string;
  name: string;
  paramCount: number;
  uiTabs: string[];
}

export interface CamValidateResult {
  system: string;
  operation: string;
  ok: boolean;
  unknown: string[];            // provided keys not in the catalog
  missingRequired: string[];    // catalog-required params absent from the input
  outOfRange: { name: string; value: number; min: number | null; max: number | null }[];
  invalidEnum: { name: string; value: unknown; allowed: readonly unknown[] }[];
  knownParamCount: number;
}

interface SystemCache {
  ops: Map<string, NormalizedCamParam[]>; // operationId -> params
  warnings: string[];
}

function num(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
}

export class CAMCatalogQueryEngine {
  private readonly dataRoot: string;
  private readonly functionsRoot: string;
  private readonly cache = new Map<string, SystemCache>();

  constructor(dataRoot: string = path.join(process.cwd(), "data")) {
    this.dataRoot = dataRoot;
    this.functionsRoot = path.join(dataRoot, "cam-functions");
  }

  /**
   * Every catalog module file for a system. We glob ALL `*.json` (except the manifest) rather
   * than trust `function-index.json`'s `modules[]` list — that manifest is INCOMPLETE for some
   * systems (e.g. hyperMILL's lists only the tool-database/utility modules, omitting
   * 5axis/drilling/turning-operations.json). Operations dedupe by id and params by name, so
   * loading overlapping files (e.g. Fusion's per-module + COMPLETE_CATALOG) merges, never doubles.
   */
  private moduleFiles(system: string): string[] {
    const dir = path.join(this.functionsRoot, system);
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
      .filter((f) => f.endsWith(".json") && f !== "function-index.json")
      .map((f) => path.join(dir, f));
  }

  /** Normalize a single raw param record (handles flat + nested-`value` shapes). */
  private normalize(raw: Record<string, unknown>, system: string, operation: string, uiTab: string | null): NormalizedCamParam | null {
    const name = (raw.id ?? raw.name) as string | undefined;
    if (!name || typeof name !== "string") return null;
    const label = typeof raw.name === "string" && raw.name !== name ? raw.name : null;
    const valObj = raw.value && typeof raw.value === "object" ? (raw.value as Record<string, unknown>) : null;
    const range = Array.isArray(raw.range) ? (raw.range as unknown[]) : null;
    if (valObj) {
      const c = (valObj.constraints && typeof valObj.constraints === "object" ? valObj.constraints : {}) as Record<string, unknown>;
      return {
        name, label,
        type: (valObj.type as string) ?? null,
        default: valObj.default_value ?? valObj.default ?? null,
        unit: (valObj.unit as string) ?? null,
        min: num(c.min),
        max: num(c.max),
        enumValues: (Array.isArray(c.enum_values) ? c.enum_values : Array.isArray(valObj.values) ? (valObj.values as unknown[]) : null),
        required: raw.required === true,
        description: (raw.description as string) ?? null,
        system, operation, uiTab,
      };
    }
    return {
      name, label,
      type: (raw.type as string) ?? null,
      default: raw.default ?? null,
      unit: (raw.unit as string) ?? null,
      min: num(raw.min) ?? (range ? num(range[0]) : null),
      max: num(raw.max) ?? (range ? num(range[1]) : null),
      enumValues: (Array.isArray(raw.values) ? (raw.values as unknown[]) : Array.isArray(raw.enum_values) ? (raw.enum_values as unknown[]) : null),
      required: raw.required === true,
      description: (raw.description as string) ?? null,
      system, operation, uiTab,
    };
  }

  /** Heuristic: does this object look like a parameter record (not a container)? */
  private isParamRecord(p: unknown): p is Record<string, unknown> {
    if (!p || typeof p !== "object" || Array.isArray(p)) return false;
    const r = p as Record<string, unknown>;
    if (typeof r.id !== "string" && typeof r.name !== "string") return false;
    return "type" in r || "value" in r || "default" in r || "unit" in r || "range" in r || "values" in r;
  }

  /**
   * Recursive operation+parameter extractor — robust to all observed CAM-catalog layouts:
   *   - `toolpaths[]` / `operations[]` / `strategies[]` (arrays of op objects)
   *   - Fusion object-maps `section.<op>.tabs.<tab>.params[]`
   *   - Mastercam strategy-maps `section.{roughTurning,finishTurning,…}` + `modules.{2d_high_speed:…}` + keyed audit sections
   *   - hyperMILL `operations[].dialogs[].parameters[]` and db `menus[].dialogs[].parameters[]`
   * `opName` is the nearest operation id seen on the way down; `tab` the nearest tab/page/dialog.
   * Depth-capped (R12: never loops on a cyclic/huge doc). add() dedups per (op,param).
   */
  private extractInto(
    node: unknown,
    opName: string | null,
    tab: string | null,
    system: string,
    add: (op: string, p: NormalizedCamParam) => void,
    depth = 0,
  ): void {
    if (depth > 12 || !node || typeof node !== "object") return;
    if (Array.isArray(node)) { for (const it of node) this.extractInto(it, opName, tab, system, add, depth + 1); return; }
    const obj = node as Record<string, unknown>;
    const HANDLED = new Set(["params", "parameters", "tabs", "pages", "dialogs", "toolpaths", "operations", "strategies"]);
    // direct param arrays
    for (const key of ["params", "parameters"]) {
      if (Array.isArray(obj[key])) for (const raw of obj[key] as unknown[]) {
        if (!this.isParamRecord(raw)) continue;
        const n = this.normalize(raw as Record<string, unknown>, system, opName ?? "(root)", tab);
        if (n) add(opName ?? "(root)", n);
      }
    }
    // tab/page maps → tab = sub-key
    for (const key of ["tabs", "pages"]) {
      const m = obj[key];
      if (m && typeof m === "object" && !Array.isArray(m)) for (const [k, v] of Object.entries(m as Record<string, unknown>)) this.extractInto(v, opName, k, system, add, depth + 1);
    }
    // dialogs → tab = dialog name
    if (Array.isArray(obj.dialogs)) for (const d of obj.dialogs as Record<string, unknown>[]) this.extractInto(d, opName, (d?.name as string) ?? (d?.id as string) ?? tab, system, add, depth + 1);
    // operation arrays → opName = item id/name
    for (const key of ["toolpaths", "operations", "strategies"]) {
      if (Array.isArray(obj[key])) for (const op of obj[key] as Record<string, unknown>[]) this.extractInto(op, String(op?.id ?? op?.name ?? opName ?? "(root)"), null, system, add, depth + 1);
    }
    // generic descent — Mastercam strategy-maps / modules-plural / keyed audit sections / Fusion maps
    for (const [k, v] of Object.entries(obj)) {
      if (HANDLED.has(k) || !v || typeof v !== "object") continue;
      if (Array.isArray(v)) {
        for (const it of v) if (it && typeof it === "object" && !this.isParamRecord(it)) this.extractInto(it, String((it as Record<string, unknown>).id ?? (it as Record<string, unknown>).name ?? opName ?? "(root)"), tab, system, add, depth + 1);
      } else {
        const vo = v as Record<string, unknown>;
        const childIsOp = !!(vo.fusion_name || vo.tabs || vo.pages || vo.dialogs || vo.params || vo.parameters);
        this.extractInto(vo, childIsOp ? String(vo.id ?? vo.name ?? k) : opName, tab, system, add, depth + 1);
      }
    }
  }

  private load(system: string): SystemCache {
    const cached = this.cache.get(system);
    if (cached) return cached;
    const ops = new Map<string, NormalizedCamParam[]>();
    const seen = new Map<string, Set<string>>();
    const warnings: string[] = [];
    const add = (op: string, p: NormalizedCamParam) => {
      let list = ops.get(op); let s = seen.get(op);
      if (!list) { list = []; ops.set(op, list); s = new Set(); seen.set(op, s); }
      if (!s!.has(p.name)) { list.push({ ...p, operation: op }); s!.add(p.name); }
    };
    for (const file of this.moduleFiles(system)) {
      let json: unknown;
      try { json = JSON.parse(fs.readFileSync(file, "utf8")); }
      catch (e) { warnings.push(`skip ${path.basename(file)}: ${(e as Error).message}`); continue; }
      const container = (json as Record<string, unknown>)?.section ?? (json as Record<string, unknown>)?.module ?? json;
      this.extractInto(container, null, null, system, add);
    }
    ops.delete("(root)"); // drop params that never resolved to a named operation (rare metadata leakage)
    const result = { ops, warnings };
    this.cache.set(system, result);
    return result;
  }

  // ── Public query surface ───────────────────────────────────────────────
  listSystems(): string[] {
    if (!fs.existsSync(this.functionsRoot)) return [];
    return fs.readdirSync(this.functionsRoot, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  }

  listOperations(system: string): CamOperation[] {
    const { ops } = this.load(system);
    return [...ops.entries()].map(([id, params]) => ({
      id,
      name: id,
      paramCount: params.length,
      uiTabs: [...new Set(params.map((p) => p.uiTab).filter((t): t is string => !!t))],
    })).sort((a, b) => a.id.localeCompare(b.id));
  }

  /** Every normalized parameter for {system, operation}. Empty array if the op is unknown. */
  getOperationParams(system: string, operation: string): NormalizedCamParam[] {
    const { ops } = this.load(system);
    return ops.get(operation) ? [...ops.get(operation)!] : [];
  }

  lookupParam(system: string, operation: string, paramName: string): NormalizedCamParam | null {
    return this.getOperationParams(system, operation).find((p) => p.name === paramName) ?? null;
  }

  /** Validate a proposed operation's params against the catalog (fail-loud, no silent pass). */
  validateOperation(system: string, operation: string, provided: Record<string, unknown> = {}): CamValidateResult {
    const params = this.getOperationParams(system, operation);
    const byName = new Map(params.map((p) => [p.name, p]));
    const providedKeys = Object.keys(provided ?? {});
    const unknown = providedKeys.filter((k) => !byName.has(k));
    const missingRequired = params.filter((p) => p.required && !(p.name in (provided ?? {}))).map((p) => p.name);
    const outOfRange: CamValidateResult["outOfRange"] = [];
    const invalidEnum: CamValidateResult["invalidEnum"] = [];
    for (const k of providedKeys) {
      const spec = byName.get(k);
      if (!spec) continue;
      const v = (provided as Record<string, unknown>)[k];
      const nv = num(v);
      if (nv !== null && ((spec.min !== null && nv < spec.min) || (spec.max !== null && nv > spec.max))) {
        outOfRange.push({ name: k, value: nv, min: spec.min, max: spec.max });
      }
      if (spec.enumValues && spec.enumValues.length && !spec.enumValues.includes(v as never)) {
        invalidEnum.push({ name: k, value: v, allowed: spec.enumValues });
      }
    }
    return {
      system, operation,
      ok: byName.size > 0 && unknown.length === 0 && missingRequired.length === 0 && outOfRange.length === 0 && invalidEnum.length === 0,
      unknown, missingRequired, outOfRange, invalidEnum,
      knownParamCount: byName.size,
    };
  }

  /** Per-system counts (operations + params + warnings) — feeds the completeness audit. */
  coverage(system: string): { system: string; operations: number; parameters: number; warnings: string[] } {
    const { ops, warnings } = this.load(system);
    let parameters = 0;
    for (const p of ops.values()) parameters += p.length;
    return { system, operations: ops.size, parameters, warnings };
  }
}

export const camCatalogQueryEngine = new CAMCatalogQueryEngine();
