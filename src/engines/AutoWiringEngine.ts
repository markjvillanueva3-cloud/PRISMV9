/**
 * AutoWiringEngine — AUTO-1: Automatic Engine Wiring Pipeline
 *
 * NOTE: This is a SOFTWARE DEVELOPMENT automation engine. It does NOT perform
 * manufacturing calculations. It analyzes TypeScript engine files and generates
 * the wiring artifacts needed to connect them to the PRISM system:
 *   - index.ts export line
 *   - dispatcher case block (lazy import + method call)
 *   - Zod schema template
 *   - test file scaffold
 *
 * All output is DRY RUN by default — shows what would be generated without writing.
 *
 * @module AutoWiringEngine
 */

import * as fs from "fs";
import * as path from "path";
import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export interface EngineAnalysis {
  file_name: string;
  class_name: string;
  singleton_name: string;
  public_methods: MethodInfo[];
  imports_physics: boolean;
  has_jsdoc: boolean;
  line_count: number;
}

export interface MethodInfo {
  name: string;
  params: ParamInfo[];
  return_type: string;
  is_async: boolean;
  has_jsdoc: boolean;
}

export interface ParamInfo {
  name: string;
  type: string;
  optional: boolean;
}

export interface WiringGap {
  dimension: string;
  description: string;
  fix_available: boolean;
}

export interface WiringArtifact {
  target_file: string;
  artifact_type: "index_export" | "dispatcher_case" | "schema" | "test_scaffold";
  content: string;
  insert_point?: string;
}

export interface WiringPlan {
  engine: EngineAnalysis;
  gaps: WiringGap[];
  artifacts: WiringArtifact[];
  current_wiring: {
    exported_in_index: boolean;
    has_dispatcher_case: boolean;
    has_schema: boolean;
    has_test: boolean;
  };
  dry_run: boolean;
}

// ============================================================================
// PATHS (source/dist agnostic, same pattern as QualityScoreEngine)
// ============================================================================

const _dir = import.meta.dirname.replace(/\\/g, "/");
const MCP_ROOT = _dir.includes("/src/engines")
  ? path.resolve(import.meta.dirname, "../..")
  : path.resolve(import.meta.dirname, "..");
const SRC_DIR = path.join(MCP_ROOT, "src");
const ENGINES_DIR = path.join(SRC_DIR, "engines");
const DISPATCHERS_DIR = path.join(SRC_DIR, "tools", "dispatchers");
const SCHEMAS_DIR = path.join(SRC_DIR, "schemas");
const TESTS_DIR = path.join(SRC_DIR, "__tests__");
const INDEX_PATH = path.join(ENGINES_DIR, "index.ts");

function safeRead(filePath: string): string {
  try { return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf-8") : ""; }
  catch { return ""; }
}

function safeListDir(dirPath: string): string[] {
  try { return fs.existsSync(dirPath) ? fs.readdirSync(dirPath) : []; }
  catch { return []; }
}

// ============================================================================
// ENGINE
// ============================================================================

class AutoWiringEngine {

  /**
   * Analyze an engine file and produce a wiring plan with generated artifacts.
   * @param enginePath Absolute or relative path to the engine .ts file
   * @param dryRun If true (default), only show what would be generated
   * @returns WiringPlan with gaps and ready-to-apply artifacts
   */
  async analyze(enginePath: string, dryRun = true): Promise<WiringPlan> {
    const absPath = path.isAbsolute(enginePath) ? enginePath : path.join(ENGINES_DIR, enginePath);
    const content = safeRead(absPath);
    if (!content) {
      throw new Error(`Engine file not found: ${absPath}`);
    }

    const fileName = path.basename(absPath);
    const engine = this._parseEngine(fileName, content);
    const wiring = this._checkCurrentWiring(engine);
    const gaps: WiringGap[] = [];
    const artifacts: WiringArtifact[] = [];

    if (!wiring.exported_in_index) {
      gaps.push({ dimension: "W:export", description: `${engine.class_name} not exported in index.ts`, fix_available: true });
      artifacts.push(this._genIndexExport(engine));
    }

    if (!wiring.has_dispatcher_case) {
      gaps.push({ dimension: "W:dispatcher", description: `No dispatcher case for ${engine.class_name}`, fix_available: true });
      artifacts.push(this._genDispatcherCase(engine));
    }

    if (!wiring.has_schema) {
      gaps.push({ dimension: "W:schema", description: `No Zod schema for ${engine.class_name} actions`, fix_available: true });
      artifacts.push(this._genSchema(engine));
    }

    if (!wiring.has_test) {
      gaps.push({ dimension: "T:test", description: `No test file for ${engine.class_name}`, fix_available: true });
      artifacts.push(this._genTestScaffold(engine));
    }

    if (!dryRun) {
      for (const a of artifacts) {
        this._applyArtifact(a);
      }
    }

    log.info(`[AutoWiring] ${engine.class_name}: ${gaps.length} gaps, ${artifacts.length} artifacts${dryRun ? " (dry run)" : " (applied)"}`);

    return { engine, gaps, artifacts, current_wiring: wiring, dry_run: dryRun };
  }

  /**
   * Scan all engines and report wiring gaps.
   * @returns Array of WiringPlans for engines with gaps
   */
  async scanAll(): Promise<{ total: number; with_gaps: number; plans: WiringPlan[] }> {
    const files = safeListDir(ENGINES_DIR)
      .filter(f => f.endsWith(".ts") && !f.endsWith(".test.ts") && !f.endsWith(".d.ts")
        && f !== "index.ts" && !f.endsWith(".md") && !f.endsWith(".types.ts"));

    const plans: WiringPlan[] = [];
    for (const f of files) {
      try {
        const plan = await this.analyze(f, true);
        if (plan.gaps.length > 0) plans.push(plan);
      } catch {
        // Skip unparseable files
      }
    }

    log.info(`[AutoWiring] Scanned ${files.length} engines. ${plans.length} have wiring gaps.`);
    return { total: files.length, with_gaps: plans.length, plans };
  }

  // ==========================================================================
  // PARSING
  // ==========================================================================

  private _parseEngine(fileName: string, content: string): EngineAnalysis {
    const className = this._extractClassName(content) || fileName.replace(/\.ts$/, "");
    const singletonName = this._extractSingletonName(content, className);
    const methods = this._extractPublicMethods(content);
    const lineCount = content.split("\n").length;

    return {
      file_name: fileName,
      class_name: className,
      singleton_name: singletonName,
      public_methods: methods,
      imports_physics: /physics\/constants|constants\.js/.test(content),
      has_jsdoc: content.includes("/**"),
      line_count: lineCount,
    };
  }

  private _extractClassName(content: string): string | null {
    const m = content.match(/(?:export\s+)?class\s+(\w+Engine\w*)/);
    return m ? m[1] : null;
  }

  private _extractSingletonName(content: string, className: string): string {
    // Look for: export const fooEngine = new FooEngine();
    const m = content.match(/export\s+const\s+(\w+)\s*=\s*new\s+\w+/);
    if (m) return m[1];
    // Derive from class name: FooBarEngine → fooBarEngine
    return className.charAt(0).toLowerCase() + className.slice(1);
  }

  private _extractPublicMethods(content: string): MethodInfo[] {
    const methods: MethodInfo[] = [];
    // Match: async methodName(params): ReturnType { or methodName(params): ReturnType {
    const regex = /(?:\/\*\*[\s\S]*?\*\/\s*)?(async\s+)?(\w+)\s*\(([^)]*)\)\s*(?::\s*([^{]+))?\s*\{/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      const [fullMatch, asyncStr, name, paramStr, returnType] = match;
      // Skip private/protected, constructor, and common non-method patterns
      if (name.startsWith("_") || name === "constructor" || name === "if" || name === "for"
        || name === "while" || name === "switch" || name === "catch" || name === "function") continue;

      const isAsync = !!asyncStr;
      const params = this._parseParams(paramStr);
      const hasJsdoc = fullMatch.includes("/**");

      methods.push({
        name,
        params,
        return_type: (returnType || "unknown").trim(),
        is_async: isAsync,
        has_jsdoc: hasJsdoc,
      });
    }
    return methods;
  }

  private _parseParams(paramStr: string): ParamInfo[] {
    if (!paramStr.trim()) return [];
    const params: ParamInfo[] = [];
    // Split on commas, handling nested generics
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

  private _parseSingleParam(p: string): ParamInfo {
    const optional = p.includes("?");
    const parts = p.split(/[?:]/);
    return {
      name: parts[0].trim(),
      type: (parts[1] || "unknown").trim(),
      optional,
    };
  }

  // ==========================================================================
  // WIRING CHECK
  // ==========================================================================

  private _checkCurrentWiring(engine: EngineAnalysis): WiringPlan["current_wiring"] {
    const indexContent = safeRead(INDEX_PATH).toLowerCase();
    const baseName = engine.file_name.replace(/\.ts$/, "");

    // Check index.ts exports
    const exportedInIndex = indexContent.includes(baseName.toLowerCase())
      || indexContent.includes(engine.class_name.toLowerCase());

    // Check dispatcher reference
    let hasDispatcherCase = false;
    for (const f of safeListDir(DISPATCHERS_DIR)) {
      if (!f.endsWith(".ts")) continue;
      const c = safeRead(path.join(DISPATCHERS_DIR, f)).toLowerCase();
      if (c.includes(baseName.toLowerCase()) || c.includes(engine.singleton_name.toLowerCase())) {
        hasDispatcherCase = true;
        break;
      }
    }

    // Check schema reference
    let hasSchema = false;
    for (const f of safeListDir(SCHEMAS_DIR)) {
      if (!f.endsWith(".ts")) continue;
      const c = safeRead(path.join(SCHEMAS_DIR, f)).toLowerCase();
      if (c.includes(engine.class_name.toLowerCase()) || c.includes(baseName.toLowerCase())) {
        hasSchema = true;
        break;
      }
    }

    // Check test file
    let hasTest = false;
    const testLower = engine.class_name.toLowerCase();
    for (const f of safeListDir(TESTS_DIR)) {
      if (!f.endsWith(".test.ts")) continue;
      const fLower = f.toLowerCase();
      if (fLower.includes(testLower) || fLower.includes(baseName.toLowerCase().replace("engine", ""))) {
        hasTest = true;
        break;
      }
      // Also check content for imports
      const c = safeRead(path.join(TESTS_DIR, f));
      if (c.includes(engine.class_name) || c.includes(engine.singleton_name)) {
        hasTest = true;
        break;
      }
    }

    return { exported_in_index: exportedInIndex, has_dispatcher_case: hasDispatcherCase, has_schema: hasSchema, has_test: hasTest };
  }

  // ==========================================================================
  // ARTIFACT GENERATORS
  // ==========================================================================

  private _genIndexExport(engine: EngineAnalysis): WiringArtifact {
    const baseName = engine.file_name.replace(/\.ts$/, "");
    const content = `export { ${engine.singleton_name} } from "./${baseName}.js";`;
    return {
      target_file: INDEX_PATH,
      artifact_type: "index_export",
      content,
      insert_point: "// END EXPORTS",
    };
  }

  private _genDispatcherCase(engine: EngineAnalysis): WiringArtifact {
    const baseName = engine.file_name.replace(/\.ts$/, "");
    const mainMethod = engine.public_methods[0];
    const actionName = this._toSnakeCase(engine.class_name.replace(/Engine$/, ""));

    const lines = [
      `          case "${actionName}": {`,
      `            const { ${engine.singleton_name} } = await import("../../engines/${baseName}.js");`,
    ];

    if (mainMethod) {
      if (mainMethod.is_async) {
        lines.push(`            result = await ${engine.singleton_name}.${mainMethod.name}(params);`);
      } else {
        lines.push(`            result = ${engine.singleton_name}.${mainMethod.name}(params);`);
      }
    } else {
      lines.push(`            result = { status: "ok", engine: "${engine.class_name}" };`);
    }

    lines.push(`            break;`, `          }`);

    return {
      target_file: "// Paste into appropriate dispatcher",
      artifact_type: "dispatcher_case",
      content: lines.join("\n"),
    };
  }

  private _genSchema(engine: EngineAnalysis): WiringArtifact {
    const actionName = this._toSnakeCase(engine.class_name.replace(/Engine$/, ""));
    const mainMethod = engine.public_methods[0];

    const fields: string[] = [];
    if (mainMethod) {
      for (const p of mainMethod.params) {
        const zodType = this._tsTypeToZod(p.type);
        const field = p.optional
          ? `  ${p.name}: ${zodType}.optional()`
          : `  ${p.name}: ${zodType}`;
        fields.push(field);
      }
    }

    const schemaBody = fields.length > 0
      ? `z.object({\n${fields.join(",\n")},\n}).passthrough()`
      : `z.object({}).passthrough()`;

    const content = [
      `// Schema for ${engine.class_name}`,
      `const ${actionName} = ${schemaBody};`,
    ].join("\n");

    return {
      target_file: "// Add to appropriate schemas file",
      artifact_type: "schema",
      content,
    };
  }

  private _genTestScaffold(engine: EngineAnalysis): WiringArtifact {
    const baseName = engine.file_name.replace(/\.ts$/, "");
    const testPath = path.join(TESTS_DIR, `${baseName}.test.ts`);

    const imports = engine.singleton_name
      ? `import { ${engine.singleton_name} } from "../engines/${baseName}.js";`
      : `import { ${engine.class_name} } from "../engines/${baseName}.js";`;

    const methodTests: string[] = [];
    for (const m of engine.public_methods.slice(0, 5)) {
      methodTests.push(`
  describe("${m.name}()", () => {
    it("returns a defined result", ${m.is_async ? "async " : ""}() => {
      // Provide valid input parameters for this method
      const result = ${m.is_async ? "await " : ""}${engine.singleton_name}.${m.name}(${m.params.length > 0 ? "/* params */" : ""});
      expect(result).toBeDefined();
    });

    it("handles edge cases", ${m.is_async ? "async " : ""}() => {
      // Test zero, negative, undefined, empty inputs
      expect(true).toBe(true); // placeholder
    });
  });`);
    }

    const content = `/**
 * ${baseName}.test.ts — Tests for ${engine.class_name}
 */

import { describe, it, expect } from "vitest";
${imports}

describe("${engine.class_name}", () => {${methodTests.join("\n")}
});
`;

    return {
      target_file: testPath,
      artifact_type: "test_scaffold",
      content,
    };
  }

  // ==========================================================================
  // APPLY
  // ==========================================================================

  private _applyArtifact(artifact: WiringArtifact): void {
    if (artifact.artifact_type === "test_scaffold" && artifact.target_file.endsWith(".test.ts")) {
      // Only write if file doesn't already exist
      if (!fs.existsSync(artifact.target_file)) {
        const dir = path.dirname(artifact.target_file);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(artifact.target_file, artifact.content);
        log.info(`[AutoWiring] Created test scaffold: ${path.basename(artifact.target_file)}`);
      }
    }
    // index_export, dispatcher_case, schema: log the suggestion but don't auto-modify
    // These require careful insertion into existing files
    if (artifact.artifact_type === "index_export") {
      log.info(`[AutoWiring] Suggested index.ts export:\n${artifact.content}`);
    }
    if (artifact.artifact_type === "dispatcher_case") {
      log.info(`[AutoWiring] Suggested dispatcher case:\n${artifact.content}`);
    }
    if (artifact.artifact_type === "schema") {
      log.info(`[AutoWiring] Suggested schema:\n${artifact.content}`);
    }
  }

  // ==========================================================================
  // UTILITIES
  // ==========================================================================

  private _toSnakeCase(name: string): string {
    return name
      .replace(/([A-Z])/g, "_$1")
      .toLowerCase()
      .replace(/^_/, "")
      .replace(/__+/g, "_");
  }

  private _tsTypeToZod(tsType: string): string {
    const t = tsType.trim().toLowerCase();
    if (t === "string") return "z.string()";
    if (t === "number") return "z.number()";
    if (t === "boolean") return "z.boolean()";
    if (t.startsWith("array") || t.endsWith("[]")) return "z.array(z.unknown())";
    if (t === "record" || t.includes("record<")) return "z.record(z.string(), z.unknown())";
    return "z.unknown()";
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

export const autoWiringEngine = new AutoWiringEngine();
export { AutoWiringEngine };
