/**
 * AutoSchemaGeneratorEngine — AUTO-2: Automatic Zod Schema Generation
 *
 * NOTE: This is a SOFTWARE DEVELOPMENT automation engine. It does NOT perform
 * manufacturing calculations. It scans dispatchers for actions missing Zod schemas,
 * infers parameter types from dispatcher case blocks and engine method signatures,
 * and generates schema code.
 *
 * Workflow:
 *   1. scan() — identify all actions across all dispatchers, check for schema coverage
 *   2. generate() — produce Zod schema code for actions that lack schemas
 *   3. apply() — write generated schemas to the appropriate schema files
 *
 * All output is DRY RUN by default — shows what would be generated without writing.
 *
 * Mathematical Foundation (from MCP-AUTOMATION-HARDENING-ROADMAP.md):
 *   Schema_Coverage = actions_with_schema / total_actions
 *   Target: Schema_Coverage >= 0.95
 *
 * @module AutoSchemaGeneratorEngine
 */

import * as fs from "fs";
import * as path from "path";
import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export interface ActionSchemaStatus {
  dispatcher: string;
  action: string;
  has_schema: boolean;
  schema_file?: string;
  schema_quality: "strong" | "weak" | "missing";
}

export interface SchemaGapReport {
  timestamp: string;
  total_dispatchers: number;
  total_actions: number;
  actions_with_schema: number;
  actions_without_schema: number;
  weak_schemas: number;
  schema_coverage: number;
  target_coverage: number;
  gap: number;
  by_dispatcher: DispatcherSchemaReport[];
  missing_actions: ActionSchemaStatus[];
}

export interface DispatcherSchemaReport {
  dispatcher: string;
  total_actions: number;
  with_schema: number;
  without_schema: number;
  weak: number;
  coverage: number;
}

export interface GeneratedSchema {
  dispatcher: string;
  action: string;
  schema_code: string;
  target_file: string;
  inferred_from: "engine_method" | "dispatcher_params" | "passthrough_default";
  confidence: number;
}

export interface SchemaGenerationResult {
  timestamp: string;
  total_generated: number;
  schemas: GeneratedSchema[];
  dry_run: boolean;
  files_written: string[];
}

// ============================================================================
// PATHS
// ============================================================================

const _dir = import.meta.dirname.replace(/\\/g, "/");
const MCP_ROOT = _dir.includes("/src/engines")
  ? path.resolve(import.meta.dirname, "../..")
  : path.resolve(import.meta.dirname, "..");
const SRC_DIR = path.join(MCP_ROOT, "src");
const DISPATCHERS_DIR = path.join(SRC_DIR, "tools", "dispatchers");
const SCHEMAS_DIR = path.join(SRC_DIR, "schemas");
const ENGINES_DIR = path.join(SRC_DIR, "engines");
const PROJECT_ROOT = path.resolve(MCP_ROOT, "..");
const OUTPUT_PATH = path.join(PROJECT_ROOT, "state", "shared", "SCHEMA_GAP_REPORT.json");

const TARGET_COVERAGE = 0.95;

// ============================================================================
// HELPERS
// ============================================================================

function safeRead(filePath: string): string {
  try { return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf-8") : ""; }
  catch { return ""; }
}

function safeListDir(dirPath: string): string[] {
  try { return fs.existsSync(dirPath) ? fs.readdirSync(dirPath) : []; }
  catch { return []; }
}

function round(v: number, decimals = 3): number {
  const f = Math.pow(10, decimals);
  return Math.round(v * f) / f;
}

// ============================================================================
// ENGINE
// ============================================================================

class AutoSchemaGeneratorEngine {

  /**
   * Scan all dispatchers and report schema coverage per action.
   * @returns SchemaGapReport with per-dispatcher and per-action breakdown
   */
  async scan(): Promise<SchemaGapReport> {
    log.info("[AutoSchema] Scanning dispatcher schema coverage...");

    const schemaIndex = this._buildSchemaIndex();
    const dispatchers = this._parseDispatchers();
    const byDispatcher: DispatcherSchemaReport[] = [];
    const allActions: ActionSchemaStatus[] = [];

    for (const d of dispatchers) {
      let withSchema = 0;
      let weak = 0;

      for (const action of d.actions) {
        const status = this._checkActionSchema(d.name, action, schemaIndex);
        allActions.push(status);
        if (status.has_schema) {
          withSchema++;
          if (status.schema_quality === "weak") weak++;
        }
      }

      byDispatcher.push({
        dispatcher: d.name,
        total_actions: d.actions.length,
        with_schema: withSchema,
        without_schema: d.actions.length - withSchema,
        weak,
        coverage: d.actions.length > 0 ? round(withSchema / d.actions.length) : 1,
      });
    }

    const totalActions = allActions.length;
    const withSchema = allActions.filter(a => a.has_schema).length;
    const weakSchemas = allActions.filter(a => a.schema_quality === "weak").length;
    const missing = allActions.filter(a => !a.has_schema);
    const coverage = totalActions > 0 ? round(withSchema / totalActions) : 1;

    const report: SchemaGapReport = {
      timestamp: new Date().toISOString(),
      total_dispatchers: dispatchers.length,
      total_actions: totalActions,
      actions_with_schema: withSchema,
      actions_without_schema: missing.length,
      weak_schemas: weakSchemas,
      schema_coverage: coverage,
      target_coverage: TARGET_COVERAGE,
      gap: round(TARGET_COVERAGE - coverage),
      by_dispatcher: byDispatcher,
      missing_actions: missing,
    };

    try {
      const dir = path.dirname(OUTPUT_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(OUTPUT_PATH, JSON.stringify(report, null, 2));
    } catch (e) {
      log.warn(`[AutoSchema] Could not write report: ${e}`);
    }

    log.info(`[AutoSchema] Coverage: ${withSchema}/${totalActions} (${round(coverage * 100)}%). Missing: ${missing.length}. Weak: ${weakSchemas}. Target: ${round(TARGET_COVERAGE * 100)}%.`);
    return report;
  }

  /**
   * Generate Zod schema code for actions that lack schemas.
   * @param dispatcherFilter Optional — only generate for this dispatcher
   * @param maxSchemas Max schemas to generate (default 50)
   * @param dryRun If true (default), only return generated code without writing
   * @returns SchemaGenerationResult with generated schema code
   */
  async generate(dispatcherFilter?: string, maxSchemas = 50, dryRun = true): Promise<SchemaGenerationResult> {
    const report = await this.scan();
    const targets = dispatcherFilter
      ? report.missing_actions.filter(a => a.dispatcher === dispatcherFilter)
      : report.missing_actions;

    const schemas: GeneratedSchema[] = [];
    const filesWritten: string[] = [];

    for (const target of targets.slice(0, maxSchemas)) {
      const generated = this._generateSchemaForAction(target.dispatcher, target.action);
      if (generated) schemas.push(generated);
    }

    if (!dryRun && schemas.length > 0) {
      const byFile = new Map<string, GeneratedSchema[]>();
      for (const s of schemas) {
        const list = byFile.get(s.target_file) || [];
        list.push(s);
        byFile.set(s.target_file, list);
      }

      for (const [filePath, fileSchemas] of byFile) {
        this._writeSchemas(filePath, fileSchemas);
        filesWritten.push(filePath);
      }
    }

    log.info(`[AutoSchema] Generated ${schemas.length} schemas${dryRun ? " (dry run)" : ` → ${filesWritten.length} files written`}`);

    return {
      timestamp: new Date().toISOString(),
      total_generated: schemas.length,
      schemas,
      dry_run: dryRun,
      files_written: filesWritten,
    };
  }

  /**
   * Read the cached schema gap report.
   * @returns Cached report or null
   */
  read(): SchemaGapReport | null {
    try {
      if (!fs.existsSync(OUTPUT_PATH)) return null;
      return JSON.parse(fs.readFileSync(OUTPUT_PATH, "utf-8"));
    } catch { return null; }
  }

  /**
   * One-line summary for compact display.
   * @returns Human-readable schema coverage summary
   */
  summary(): string {
    const cached = this.read();
    if (!cached) return "No schema gap report. Run scan first.";
    return `Schema coverage: ${cached.actions_with_schema}/${cached.total_actions} (${round(cached.schema_coverage * 100)}%). Missing: ${cached.actions_without_schema}. Weak: ${cached.weak_schemas}. Gap to ${round(cached.target_coverage * 100)}%: ${round(cached.gap * 100)}pp.`;
  }

  // ==========================================================================
  // DISPATCHER PARSING
  // ==========================================================================

  private _parseDispatchers(): { name: string; file: string; actions: string[] }[] {
    const dispatchers: { name: string; file: string; actions: string[] }[] = [];

    for (const f of safeListDir(DISPATCHERS_DIR)) {
      if (!f.endsWith(".ts") || f === "index.ts" || f.endsWith(".d.ts")) continue;
      const content = safeRead(path.join(DISPATCHERS_DIR, f));
      if (!content) continue;

      const name = f.replace(/\.ts$/, "").replace(/Dispatcher$/, "");
      const actions = this._extractActionsFromDispatcher(content);
      if (actions.length > 0) {
        dispatchers.push({ name, file: f, actions });
      }
    }

    return dispatchers;
  }

  private _extractActionsFromDispatcher(content: string): string[] {
    const actions: string[] = [];

    // Pattern 1: ACTIONS array or z.enum([...])
    const actionsMatch = content.match(/(?:const\s+ACTIONS\s*=\s*\[|z\.enum\s*\(\s*\[)([\s\S]*?)\]\s*(?:as\s+const|[);])/);
    if (actionsMatch) {
      const body = actionsMatch[1];
      const items = body.match(/"([^"]+)"/g);
      if (items) {
        for (const item of items) {
          actions.push(item.replace(/"/g, ""));
        }
      }
    }

    // Pattern 2: case "action_name": blocks (fallback)
    if (actions.length === 0) {
      const caseRegex = /case\s+"([^"]+)"\s*:/g;
      let m;
      while ((m = caseRegex.exec(content)) !== null) {
        if (!actions.includes(m[1])) actions.push(m[1]);
      }
    }

    return actions;
  }

  // ==========================================================================
  // SCHEMA INDEX
  // ==========================================================================

  private _buildSchemaIndex(): Map<string, { file: string; quality: "strong" | "weak" }> {
    const index = new Map<string, { file: string; quality: "strong" | "weak" }>();

    for (const f of safeListDir(SCHEMAS_DIR)) {
      if (!f.endsWith(".ts") || f === "actionSchemaTypes.ts" || f.endsWith(".d.ts")) continue;
      const content = safeRead(path.join(SCHEMAS_DIR, f));
      if (!content) continue;

      // Find schema const definitions: const action_name = z.object({...})
      const schemaRegex = /const\s+(\w+)\s*=\s*z\./g;
      let m;
      while ((m = schemaRegex.exec(content)) !== null) {
        const schemaName = m[1];
        const afterConst = content.slice(m.index, m.index + 300);
        const isWeak = /z\.object\s*\(\s*\{\s*\}\s*\)\s*\.passthrough/.test(afterConst);
        index.set(schemaName, { file: f, quality: isWeak ? "weak" : "strong" });
      }

      // Also check ACTION_*_SCHEMAS map keys
      const mapRegex = /["'](\w+)["']\s*:/g;
      while ((m = mapRegex.exec(content)) !== null) {
        if (!index.has(m[1])) {
          index.set(m[1], { file: f, quality: "strong" });
        }
      }
    }

    return index;
  }

  private _checkActionSchema(
    dispatcher: string,
    action: string,
    schemaIndex: Map<string, { file: string; quality: "strong" | "weak" }>
  ): ActionSchemaStatus {
    const entry = schemaIndex.get(action);
    if (entry) {
      return {
        dispatcher,
        action,
        has_schema: true,
        schema_file: entry.file,
        schema_quality: entry.quality,
      };
    }
    return { dispatcher, action, has_schema: false, schema_quality: "missing" };
  }

  // ==========================================================================
  // SCHEMA GENERATION
  // ==========================================================================

  private _generateSchemaForAction(dispatcher: string, action: string): GeneratedSchema | null {
    const dispatcherContent = this._readDispatcher(dispatcher);

    // Strategy 1: Infer from engine method signature (higher confidence)
    const engineParams = this._inferParamsFromEngine(dispatcherContent, action);

    // Strategy 2: Infer from dispatcher case block params usage
    const caseParams = this._inferParamsFromCase(dispatcherContent, action);

    const params = engineParams.length > 0 ? engineParams : caseParams;
    const inferredFrom = engineParams.length > 0 ? "engine_method" as const
      : caseParams.length > 0 ? "dispatcher_params" as const
      : "passthrough_default" as const;

    const confidence = inferredFrom === "engine_method" ? 0.85
      : inferredFrom === "dispatcher_params" ? 0.65
      : 0.30;

    const fields: string[] = [];
    for (const p of params) {
      const zodType = this._tsTypeToZod(p.type);
      const desc = `.describe("${p.name}")`;
      const field = p.optional
        ? `  ${p.name}: ${zodType}.optional()${desc}`
        : `  ${p.name}: ${zodType}${desc}`;
      fields.push(field);
    }

    const schemaBody = fields.length > 0
      ? `z.object({\n${fields.join(",\n")},\n}).passthrough()`
      : `z.object({}).passthrough()`;

    const schemaCode = `/** ${action} — Auto-generated schema (confidence: ${round(confidence)}) */\nconst ${action} = ${schemaBody};`;

    const targetFile = this._resolveTargetSchemaFile(dispatcher);

    return {
      dispatcher,
      action,
      schema_code: schemaCode,
      target_file: targetFile,
      inferred_from: inferredFrom,
      confidence,
    };
  }

  private _readDispatcher(dispatcherName: string): string {
    const candidates = [
      `${dispatcherName}Dispatcher.ts`,
      `${dispatcherName}.ts`,
      `${dispatcherName}dispatcher.ts`,
    ];
    for (const c of candidates) {
      const content = safeRead(path.join(DISPATCHERS_DIR, c));
      if (content) return content;
    }
    for (const f of safeListDir(DISPATCHERS_DIR)) {
      if (!f.endsWith(".ts")) continue;
      const content = safeRead(path.join(DISPATCHERS_DIR, f));
      if (f.toLowerCase().includes(dispatcherName.toLowerCase())) {
        return content;
      }
    }
    return "";
  }

  private _inferParamsFromCase(dispatcherContent: string, action: string): { name: string; type: string; optional: boolean }[] {
    if (!dispatcherContent) return [];
    const params: { name: string; type: string; optional: boolean }[] = [];
    const seen = new Set<string>();

    const caseStart = dispatcherContent.indexOf(`case "${action}"`);
    if (caseStart < 0) return [];

    const breakIdx = dispatcherContent.indexOf("break;", caseStart + 1);
    const nextCaseIdx = dispatcherContent.indexOf('case "', caseStart + 10);
    const candidates = [breakIdx, nextCaseIdx].filter(i => i > caseStart);
    const caseEnd = candidates.length > 0 ? Math.min(...candidates) : caseStart + 500;
    if (caseEnd <= caseStart) return [];

    const caseBlock = dispatcherContent.slice(caseStart, caseEnd);

    // Look for params.X, p.X, input.X, args.X
    const paramRegex = /(?:params|p|input|args)\.(\w+)/g;
    let m;
    while ((m = paramRegex.exec(caseBlock)) !== null) {
      const name = m[1];
      if (seen.has(name)) continue;
      seen.add(name);
      const type = this._inferTypeFromUsage(caseBlock, name);
      params.push({ name, type, optional: true });
    }

    // Destructuring: const { x, y } = params;
    const destructRegex = /const\s*\{\s*([^}]+)\}\s*=\s*(?:params|p|input|args)/g;
    while ((m = destructRegex.exec(caseBlock)) !== null) {
      const fields = m[1].split(",").map(s => s.trim().split(":")[0].split("=")[0].trim());
      for (const name of fields) {
        if (!name || seen.has(name)) continue;
        seen.add(name);
        params.push({ name, type: "unknown", optional: true });
      }
    }

    return params;
  }

  private _inferParamsFromEngine(dispatcherContent: string, action: string): { name: string; type: string; optional: boolean }[] {
    if (!dispatcherContent) return [];

    const caseStart = dispatcherContent.indexOf(`case "${action}"`);
    if (caseStart < 0) return [];
    const caseEnd = dispatcherContent.indexOf("break;", caseStart + 1);
    if (caseEnd < 0) return [];
    const caseBlock = dispatcherContent.slice(caseStart, caseEnd);

    const importMatch = caseBlock.match(/import\s*\(\s*"[^"]*\/(\w+)\.js"\s*\)/);
    if (!importMatch) return [];
    const engineFileName = importMatch[1];

    const engineContent = safeRead(path.join(ENGINES_DIR, `${engineFileName}.ts`));
    if (!engineContent) return [];

    const methodMatch = caseBlock.match(/\.(\w+)\s*\(/);
    if (!methodMatch) return [];
    const methodName = methodMatch[1];

    const methodRegex = new RegExp(`(?:async\\s+)?${methodName}\\s*\\(([^)]*)\\)`, "m");
    const sigMatch = engineContent.match(methodRegex);
    if (!sigMatch) return [];

    return this._parseMethodParams(sigMatch[1]);
  }

  private _parseMethodParams(paramStr: string): { name: string; type: string; optional: boolean }[] {
    if (!paramStr.trim()) return [];
    const params: { name: string; type: string; optional: boolean }[] = [];
    let depth = 0;
    let current = "";

    for (const ch of paramStr) {
      if (ch === "<" || ch === "{" || ch === "(") depth++;
      else if (ch === ">" || ch === "}" || ch === ")") depth--;
      else if (ch === "," && depth === 0) {
        if (current.trim()) params.push(this._parseSingleParam(current.trim()));
        current = "";
        continue;
      }
      current += ch;
    }
    if (current.trim()) params.push(this._parseSingleParam(current.trim()));
    return params;
  }

  private _parseSingleParam(p: string): { name: string; type: string; optional: boolean } {
    const optional = p.includes("?");
    const parts = p.split(/[?:]/);
    return {
      name: parts[0].trim(),
      type: (parts[1] || "unknown").trim(),
      optional,
    };
  }

  private _inferTypeFromUsage(block: string, paramName: string): string {
    if (new RegExp(`${paramName}\\s*[<>=!]+\\s*\\d`).test(block)) return "number";
    if (new RegExp(`${paramName}\\.(?:toLowerCase|toUpperCase|trim|split|includes|startsWith)`).test(block)) return "string";
    if (new RegExp(`${paramName}\\.(?:map|filter|reduce|forEach|length|push|slice)`).test(block)) return "array";
    if (new RegExp(`!${paramName}\\s|${paramName}\\s*===\\s*(?:true|false)`).test(block)) return "boolean";
    if (new RegExp(`(?:parseFloat|parseInt|Number)\\(${paramName}\\)`).test(block)) return "number";
    return "unknown";
  }

  private _tsTypeToZod(tsType: string): string {
    const t = tsType.trim().toLowerCase();
    if (t === "string") return "z.string()";
    if (t === "number") return "z.number()";
    if (t === "boolean") return "z.boolean()";
    if (t === "array" || t.startsWith("array") || t.endsWith("[]")) return "z.array(z.unknown())";
    if (t === "record" || t.includes("record<")) return "z.record(z.string(), z.unknown())";
    return "z.unknown()";
  }

  private _resolveTargetSchemaFile(dispatcherName: string): string {
    const candidates = [
      `${dispatcherName}ActionSchemas.ts`,
      `${dispatcherName.replace(/Dispatcher$/, "")}ActionSchemas.ts`,
    ];
    for (const c of candidates) {
      if (fs.existsSync(path.join(SCHEMAS_DIR, c))) return path.join(SCHEMAS_DIR, c);
    }
    const cleanName = dispatcherName.replace(/Dispatcher$/, "");
    return path.join(SCHEMAS_DIR, `${cleanName}ActionSchemas.ts`);
  }

  // ==========================================================================
  // WRITE
  // ==========================================================================

  private _writeSchemas(filePath: string, schemas: GeneratedSchema[]): void {
    const existing = safeRead(filePath);

    if (existing) {
      const newCode = schemas.map(s => `\n${s.schema_code}`).join("\n");
      const exportMatch = existing.match(/export\s+const\s+ACTION_/);
      if (exportMatch && exportMatch.index !== undefined) {
        const before = existing.slice(0, exportMatch.index);
        const after = existing.slice(exportMatch.index);
        fs.writeFileSync(filePath, before + newCode + "\n\n" + after);
      } else {
        fs.writeFileSync(filePath, existing + "\n" + newCode + "\n");
      }
    } else {
      const header = `/**\n * Auto-generated Zod Action Schemas\n * Generated: ${new Date().toISOString()}\n */\n\nimport { z } from "zod";\nimport type { ActionSchemaMap } from "./actionSchemaTypes.js";\n\n`;
      const body = schemas.map(s => s.schema_code).join("\n\n");
      const mapName = `ACTION_${schemas[0].dispatcher.toUpperCase()}_SCHEMAS`;
      const mapEntries = schemas.map(s => `  ${s.action}`).join(",\n");
      const footer = `\n\nexport const ${mapName}: ActionSchemaMap = {\n${mapEntries},\n};\n`;
      fs.writeFileSync(filePath, header + body + footer);
    }

    log.info(`[AutoSchema] Wrote ${schemas.length} schemas to ${path.basename(filePath)}`);
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

export const autoSchemaGeneratorEngine = new AutoSchemaGeneratorEngine();
export { AutoSchemaGeneratorEngine };
