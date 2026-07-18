/**
 * AutoForgeEngine — SQ1-1-TMPL: Template Auto-Generation System
 *
 * Takes an engine name + description and generates all 7 artifacts needed
 * for a fully wired PRISM engine:
 *   1. engine.ts — class + singleton + types + JSDoc
 *   2. dispatcher case — lazy import + switch case for devDispatcher
 *   3. Zod schema — input validation schema
 *   4. test scaffold — vitest describe/it blocks
 *   5. index.ts export — barrel file re-export line
 *   6. API client function — frontend fetch wrapper
 *   7. route handler — Express POST endpoint
 *
 * Dry-run by default. When applied, writes files and appends to existing ones.
 * Reuses AutoWiringEngine's analysis for existing engine wiring checks.
 *
 * @module AutoForgeEngine
 */

import * as fs from "fs";
import * as path from "path";
import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Specification for a method to include in the generated engine. */
export interface MethodSpec {
  /** Method name in camelCase */
  name: string;
  /** Brief description for JSDoc */
  description?: string;
  /** Parameter definitions */
  params?: Array<{ name: string; type: string; optional?: boolean; description?: string }>;
  /** Return type (defaults to "Promise<Record<string, unknown>>") */
  return_type?: string;
  /** Whether the method is async (defaults to true) */
  is_async?: boolean;
}

/** Input for the forge operation. */
export interface ForgeInput {
  /** PascalCase engine name, e.g. "FixtureOptimizationEngine" */
  name: string;
  /** One-line description of what the engine does */
  description: string;
  /** Domain hint for dispatcher routing (auto-detected from name if omitted) */
  domain?: string;
  /** Methods to generate. Defaults to a single "analyze" method if omitted. */
  methods?: MethodSpec[];
  /** If true (default), only return generated content without writing files */
  dry_run?: boolean;
}

/** A single generated artifact. */
export interface ForgeArtifact {
  /** What this artifact is */
  artifact_type:
    | "engine"
    | "dispatcher_case"
    | "schema"
    | "test"
    | "index_export"
    | "api_client"
    | "route_handler";
  /** Absolute path to the target file (for engine/test) or description */
  target_file: string;
  /** Generated code content */
  content: string;
  /** Whether the artifact was actually written to disk */
  applied: boolean;
}

/** Result of a forge operation. */
export interface ForgeResult {
  /** Engine name that was forged */
  engine_name: string;
  /** Whether this was a dry run */
  dry_run: boolean;
  /** All generated artifacts */
  artifacts: ForgeArtifact[];
  /** Detected domain */
  domain: string;
  /** Warnings encountered during generation */
  warnings: string[];
  /** Summary counts */
  summary: {
    total_artifacts: number;
    applied: number;
    skipped: number;
    lines_generated: number;
  };
}

// ============================================================================
// PATHS (source/dist agnostic)
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
const ROUTES_DIR = path.join(SRC_DIR, "routes");
const WEB_API_DIR = path.join(MCP_ROOT, "web", "src", "api");

// ============================================================================
// DOMAIN DETECTION
// ============================================================================

const DOMAIN_KEYWORDS: Record<string, string> = {
  force: "physics",
  kienzle: "physics",
  speed: "physics",
  feed: "physics",
  thermal: "physics",
  chatter: "physics",
  deflection: "physics",
  wear: "physics",
  surface: "physics",
  stability: "physics",
  temperature: "physics",
  stress: "physics",
  vibration: "physics",
  tool: "tooling",
  cutter: "tooling",
  holder: "tooling",
  insert: "tooling",
  turning: "turning",
  lathe: "turning",
  milling: "milling",
  grinding: "grinding",
  edm: "edm",
  laser: "laser",
  waterjet: "waterjet",
  safety: "safety",
  collision: "safety",
  limit: "safety",
  quality: "quality",
  spc: "quality",
  inspection: "quality",
  metrology: "quality",
  gap: "quality",
  detection: "quality",
  validation: "quality",
  quote: "business",
  cost: "business",
  invoice: "business",
  job: "business",
  schedule: "business",
  capacity: "business",
  oee: "business",
  approval: "business",
  workflow: "business",
  customer: "business",
  portal: "business",
  learning: "knowledge",
  tribal: "knowledge",
  playbook: "knowledge",
  cam: "cam",
  toolpath: "cam",
  strategy: "cam",
  cad: "cad",
  geometry: "cad",
  fixture: "manufacturing",
  workholding: "manufacturing",
  post: "manufacturing",
  program: "manufacturing",
  realtime: "infrastructure",
  bridge: "infrastructure",
  websocket: "infrastructure",
  telemetry: "infrastructure",
  memory: "infrastructure",
  session: "infrastructure",
};

function detectDomain(engineName: string): string {
  const lower = engineName.toLowerCase();
  for (const [keyword, domain] of Object.entries(DOMAIN_KEYWORDS)) {
    if (lower.includes(keyword)) return domain;
  }
  return "general";
}

// ============================================================================
// HELPERS
// ============================================================================

function safeRead(filePath: string): string {
  try {
    return fs.existsSync(filePath)
      ? fs.readFileSync(filePath, "utf-8")
      : "";
  } catch {
    return "";
  }
}

function toPascalCase(name: string): string {
  // Already PascalCase? Return as-is
  if (/^[A-Z][a-zA-Z0-9]*Engine$/.test(name)) return name;
  // Append Engine if missing
  const base = name.endsWith("Engine") ? name : name + "Engine";
  return base.charAt(0).toUpperCase() + base.slice(1);
}

function toSingletonName(className: string): string {
  return className.charAt(0).toLowerCase() + className.slice(1);
}

function toSnakeCase(name: string): string {
  return name
    .replace(/Engine$/, "")
    .replace(/([A-Z])/g, "_$1")
    .toLowerCase()
    .replace(/^_/, "")
    .replace(/__+/g, "_");
}

function toKebabCase(name: string): string {
  return toSnakeCase(name).replace(/_/g, "-");
}

function tsTypeToZod(tsType: string): string {
  const t = tsType.trim().toLowerCase();
  if (t === "string") return "z.string()";
  if (t === "number") return "z.number()";
  if (t === "boolean") return "z.boolean()";
  if (t.endsWith("[]") || t.startsWith("array")) return "z.array(z.unknown())";
  if (t.includes("record")) return "z.record(z.string(), z.unknown())";
  return "z.unknown()";
}

// ============================================================================
// ENGINE
// ============================================================================

class AutoForgeEngine {
  /**
   * Generate all artifacts for a new engine from a name and description.
   * @param input Engine specification with name, description, optional methods
   * @returns ForgeResult with all 7 artifact types
   */
  async forge(input: ForgeInput): Promise<ForgeResult> {
    const warnings: string[] = [];

    // --- Input validation ---
    if (!input || typeof input.name !== "string" || input.name.trim().length === 0) {
      return this._errorResult("'name' is required and must be a non-empty string");
    }
    if (input.name.length > 100) {
      return this._errorResult("'name' must be <= 100 characters");
    }
    if (!input.description || typeof input.description !== "string" || input.description.trim().length === 0) {
      return this._errorResult("'description' is required and must be a non-empty string");
    }
    if (input.description.length > 500) {
      return this._errorResult("'description' must be <= 500 characters");
    }

    const className = toPascalCase(input.name);
    const singletonName = toSingletonName(className);
    const actionName = toSnakeCase(className);
    const kebabName = toKebabCase(className);
    const dryRun = input.dry_run !== false; // default true
    const domain = input.domain || detectDomain(className);

    // Check if engine already exists
    const enginePath = path.join(ENGINES_DIR, `${className}.ts`);
    if (fs.existsSync(enginePath)) {
      warnings.push(`Engine file already exists: ${className}.ts — skipping engine generation`);
    }

    // Default methods if none provided
    const methods: MethodSpec[] =
      input.methods && input.methods.length > 0
        ? input.methods
        : [
            {
              name: "analyze",
              description: `Run ${className} analysis`,
              params: [
                { name: "params", type: "Record<string, unknown>", description: "Input parameters" },
              ],
              return_type: "Promise<Record<string, unknown>>",
              is_async: true,
            },
          ];

    // --- Generate all 7 artifacts ---
    const artifacts: ForgeArtifact[] = [];

    // 1. Engine file
    if (!fs.existsSync(enginePath)) {
      artifacts.push(this._genEngine(className, singletonName, input.description, domain, methods));
    }

    // 2. Dispatcher case
    artifacts.push(this._genDispatcherCase(className, singletonName, actionName, methods));

    // 3. Zod schema
    artifacts.push(this._genSchema(actionName, methods));

    // 4. Test scaffold
    const testPath = path.join(TESTS_DIR, `${className}.test.ts`);
    if (fs.existsSync(testPath)) {
      warnings.push(`Test file already exists: ${className}.test.ts — skipping`);
    } else {
      artifacts.push(this._genTest(className, singletonName, methods));
    }

    // 5. Index export
    artifacts.push(this._genIndexExport(className, singletonName));

    // 6. API client function
    artifacts.push(this._genApiClient(actionName, kebabName, methods));

    // 7. Route handler
    artifacts.push(this._genRoute(actionName, kebabName));

    // --- Apply if not dry run ---
    let applied = 0;
    let skipped = 0;
    if (!dryRun) {
      for (const artifact of artifacts) {
        const didApply = this._applyArtifact(artifact, warnings);
        if (didApply) {
          artifact.applied = true;
          applied++;
        } else {
          skipped++;
        }
      }
    } else {
      skipped = artifacts.length;
    }

    const totalLines = artifacts.reduce(
      (sum, a) => sum + a.content.split("\n").length,
      0,
    );

    log.info(
      `[AutoForge] ${className}: ${artifacts.length} artifacts, ${totalLines} lines${dryRun ? " (dry run)" : ` (${applied} applied)`}`,
    );

    return {
      engine_name: className,
      dry_run: dryRun,
      artifacts,
      domain,
      warnings,
      summary: {
        total_artifacts: artifacts.length,
        applied,
        skipped,
        lines_generated: totalLines,
      },
    };
  }

  /**
   * Read a previously generated forge result (not persisted — use forge() directly).
   * Returns null since forge results are not persisted to disk.
   */
  read(): null {
    return null;
  }

  /**
   * Generate a compact text summary of a ForgeResult.
   */
  summary(result: ForgeResult): string {
    const lines: string[] = [
      `# AutoForge: ${result.engine_name}`,
      `Domain: ${result.domain} | Dry run: ${result.dry_run}`,
      `Artifacts: ${result.summary.total_artifacts} | Applied: ${result.summary.applied} | Lines: ${result.summary.lines_generated}`,
      "",
    ];

    for (const a of result.artifacts) {
      const status = a.applied ? "APPLIED" : "PENDING";
      lines.push(`- [${status}] ${a.artifact_type}: ${a.target_file}`);
    }

    if (result.warnings.length > 0) {
      lines.push("", "## Warnings");
      for (const w of result.warnings) {
        lines.push(`- ${w}`);
      }
    }

    return lines.join("\n");
  }

  // ==========================================================================
  // ARTIFACT GENERATORS
  // ==========================================================================

  private _genEngine(
    className: string,
    singletonName: string,
    description: string,
    domain: string,
    methods: MethodSpec[],
  ): ForgeArtifact {
    const enginePath = path.join(ENGINES_DIR, `${className}.ts`);

    const methodBlocks: string[] = [];
    for (const m of methods) {
      const params = m.params || [];
      const returnType = m.return_type || "Promise<Record<string, unknown>>";
      const isAsync = m.is_async !== false;
      const paramList = params
        .map((p) => `${p.name}${p.optional ? "?" : ""}: ${p.type}`)
        .join(", ");

      const paramDocs = params
        .map((p) => `   * @param ${p.name} ${p.description || p.type}`)
        .join("\n");

      methodBlocks.push(`
  /**
   * ${m.description || m.name}
${paramDocs}
   * @returns Typed result object
   */
  ${isAsync ? "async " : ""}${m.name}(${paramList}): ${returnType} {
    const warnings: string[] = [];

    // TODO: Implement ${m.name} logic
    // Input validation
${params.map((p) => `    if (${p.optional ? `${p.name} !== undefined && ` : ""}typeof ${p.name} !== "${p.type === "number" ? "number" : p.type === "boolean" ? "boolean" : "object"}") {
      warnings.push("Invalid ${p.name} type");
    }`).join("\n")}

    return {
      status: "ok",
      engine: "${className}",
      method: "${m.name}",
      warnings,
    };
  }`);
    }

    const content = `/**
 * ${className} — ${description}
 *
 * Domain: ${domain}
 * Generated by AutoForgeEngine (SQ1-1-TMPL)
 *
 * @module ${className}
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export interface ${className}Result {
  status: "ok" | "error";
  engine: string;
  method: string;
  warnings: string[];
  [key: string]: unknown;
}

// ============================================================================
// ENGINE
// ============================================================================

class ${className} {
${methodBlocks.join("\n")}
}

// ============================================================================
// SINGLETON
// ============================================================================

export const ${singletonName} = new ${className}();
export { ${className} };
`;

    return {
      artifact_type: "engine",
      target_file: enginePath,
      content,
      applied: false,
    };
  }

  private _genDispatcherCase(
    className: string,
    singletonName: string,
    actionName: string,
    methods: MethodSpec[],
  ): ForgeArtifact {
    const baseName = className;

    // Generate a case for each method
    const cases: string[] = [];
    for (let i = 0; i < methods.length; i++) {
      const m = methods[i];
      const fullAction = i === 0 ? actionName : `${actionName}_${m.name}`;
      const isAsync = m.is_async !== false;

      cases.push(
        `          case "${fullAction}": {`,
        `            const { ${singletonName} } = await import("../../engines/${baseName}.js");`,
        `            result = ${isAsync ? "await " : ""}${singletonName}.${m.name}(params);`,
        `            break;`,
        `          }`,
      );
    }

    return {
      artifact_type: "dispatcher_case",
      target_file: path.join(DISPATCHERS_DIR, "devDispatcher.ts"),
      content: cases.join("\n"),
      applied: false,
    };
  }

  private _genSchema(
    actionName: string,
    methods: MethodSpec[],
  ): ForgeArtifact {
    const schemas: string[] = [];
    for (let i = 0; i < methods.length; i++) {
      const m = methods[i];
      const fullAction = i === 0 ? actionName : `${actionName}_${m.name}`;
      const params = m.params || [];

      const fields = params
        .map((p) => {
          const zodType = tsTypeToZod(p.type);
          const desc = p.description ? `.describe("${p.description}")` : "";
          return p.optional
            ? `  ${p.name}: ${zodType}${desc}.optional()`
            : `  ${p.name}: ${zodType}${desc}`;
        })
        .join(",\n");

      const body =
        fields.length > 0
          ? `z.object({\n${fields},\n}).passthrough()`
          : `z.object({}).passthrough()`;

      schemas.push(`const ${fullAction} = ${body};`);
    }

    return {
      artifact_type: "schema",
      target_file: path.join(SCHEMAS_DIR, "devActionSchemas.ts"),
      content: schemas.join("\n"),
      applied: false,
    };
  }

  private _genTest(
    className: string,
    singletonName: string,
    methods: MethodSpec[],
  ): ForgeArtifact {
    const testPath = path.join(TESTS_DIR, `${className}.test.ts`);

    const methodTests: string[] = [];
    for (const m of methods) {
      const isAsync = m.is_async !== false;
      const params = m.params || [];
      const argComment = params.length > 0 ? "/* provide valid params */" : "";

      methodTests.push(`
  describe("${m.name}()", () => {
    it("returns a valid result", ${isAsync ? "async " : ""}() => {
      const result = ${isAsync ? "await " : ""}${singletonName}.${m.name}(${argComment});
      expect(result).toBeDefined();
      expect(result.status).toBe("ok");
      expect(result.engine).toBe("${className}");
      expect(result.warnings).toBeInstanceOf(Array);
    });
  });`);
    }

    const content = `/**
 * ${className}.test.ts — Tests for ${className}
 * Generated by AutoForgeEngine (SQ1-1-TMPL)
 */

import { describe, it, expect } from "vitest";
import { ${singletonName} } from "../engines/${className}.js";

describe("${className}", () => {
  it("singleton is defined", () => {
    expect(${singletonName}).toBeDefined();
  });
${methodTests.join("\n")}
});
`;

    return {
      artifact_type: "test",
      target_file: testPath,
      content,
      applied: false,
    };
  }

  private _genIndexExport(
    className: string,
    singletonName: string,
  ): ForgeArtifact {
    const content = `export { ${singletonName}, type ${className}Result } from "./${className}.js";`;

    return {
      artifact_type: "index_export",
      target_file: INDEX_PATH,
      content,
      applied: false,
    };
  }

  private _genApiClient(
    actionName: string,
    kebabName: string,
    methods: MethodSpec[],
  ): ForgeArtifact {
    const clientPath = path.join(WEB_API_DIR, "client.ts");
    const funcName = actionName.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

    const functions: string[] = [];
    for (let i = 0; i < methods.length; i++) {
      const m = methods[i];
      const fullFunc = i === 0 ? funcName : `${funcName}${m.name.charAt(0).toUpperCase()}${m.name.slice(1)}`;
      const endpoint = i === 0 ? kebabName : `${kebabName}/${m.name}`;

      functions.push(`export async function ${fullFunc}(params?: Record<string, unknown>): Promise<PrismResponse> {
  return apiPost(\`\${API_BASE}/dev/${endpoint}\`, params ?? {});
}`);
    }

    return {
      artifact_type: "api_client",
      target_file: clientPath,
      content: functions.join("\n\n"),
      applied: false,
    };
  }

  private _genRoute(actionName: string, kebabName: string): ForgeArtifact {
    const content = `  router.post("/${kebabName}", async (req, res) => {
    try { res.json({ ok: true, data: await callTool("prism_dev", "${actionName}", req.body) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });`;

    return {
      artifact_type: "route_handler",
      target_file: path.join(ROUTES_DIR, "dev.ts"),
      content,
      applied: false,
    };
  }

  // ==========================================================================
  // APPLY
  // ==========================================================================

  private _applyArtifact(
    artifact: ForgeArtifact,
    warnings: string[],
  ): boolean {
    try {
      switch (artifact.artifact_type) {
        case "engine":
        case "test": {
          // Write new file (only if doesn't exist)
          if (fs.existsSync(artifact.target_file)) {
            warnings.push(`File already exists, skipping: ${path.basename(artifact.target_file)}`);
            return false;
          }
          const dir = path.dirname(artifact.target_file);
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(artifact.target_file, artifact.content, "utf-8");
          log.info(`[AutoForge] Created: ${path.basename(artifact.target_file)}`);
          return true;
        }
        case "index_export": {
          // Append to index.ts
          const existing = safeRead(artifact.target_file);
          if (existing.includes(artifact.content.split("from")[0].trim())) {
            warnings.push("Export already exists in index.ts — skipping");
            return false;
          }
          fs.appendFileSync(artifact.target_file, "\n" + artifact.content + "\n");
          log.info("[AutoForge] Appended export to index.ts");
          return true;
        }
        default: {
          // dispatcher_case, schema, api_client, route_handler:
          // These require careful manual insertion into existing files
          warnings.push(
            `${artifact.artifact_type} generated but not auto-applied — paste into ${path.basename(artifact.target_file)}`,
          );
          return false;
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      warnings.push(`Failed to apply ${artifact.artifact_type}: ${msg}`);
      return false;
    }
  }

  // ==========================================================================
  // ERROR
  // ==========================================================================

  private _errorResult(message: string): ForgeResult {
    return {
      engine_name: "unknown",
      dry_run: true,
      artifacts: [],
      domain: "unknown",
      warnings: [message],
      summary: { total_artifacts: 0, applied: 0, skipped: 0, lines_generated: 0 },
    };
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

export const autoForgeEngine = new AutoForgeEngine();
export { AutoForgeEngine };
