/**
 * IntegrationForesightEngine — U-FORE-08 (PSAU-FORESIGHT)
 * ========================================================
 *
 * When a developer proposes "I'm creating MyNewEngine", this engine
 * predicts every wiring step required to ship it: the dispatcher
 * action, schema entry, hook, skill, test file, ENGINE_DIGEST line,
 * cross-session-asset-registry update, etc.
 *
 * The output is a CHECKLIST — not automated execution. Consumed by the
 * /forge-triple skill so every downstream slot is surfaced up front
 * rather than discovered one failure at a time.
 */

import * as fs from "node:fs";
import * as path from "node:path";

export type IntegrationStepKind =
  | "write_engine"
  | "write_tests"
  | "add_dispatcher_action"
  | "add_action_schema"
  | "update_engine_digest"
  | "update_engine_registry"
  | "add_skill"
  | "add_hook"
  | "update_index_exports"
  | "record_in_asset_registry";

export interface IntegrationStep {
  kind: IntegrationStepKind;
  description: string;
  targetFile?: string;
  required: boolean;
  severity: 1 | 2 | 3 | 4 | 5;
  rationale: string;
}

export interface SimilarEngineMatch {
  id: string;
  similarity: number;
  overlapKeywords: string[];
}

export interface EngineSpec {
  name: string;
  domain?: string;
  purpose?: string;
  keywords?: string[];
  needsSchema?: boolean;
  needsHook?: boolean;
  needsSkill?: boolean;
  isSafetyCritical?: boolean;
  similarTo?: string[];
}

export interface IntegrationForesight {
  engine: string;
  checklist: IntegrationStep[];
  similarEngines: SimilarEngineMatch[];
  dispatcherHint: string | null;
  coverage: { required: number; total: number };
  warnings: string[];
}

const ENGINES_GLOB = "mcp-server/src/engines";

const DISPATCHER_HINTS: Array<{ match: RegExp; domain: string }> = [
  { match: /cam|mill|lathe|post|gcode/i, domain: "cam" },
  { match: /cad|geometry|mesh|feature|sketch/i, domain: "cad" },
  { match: /safety|collision|coolant|spindle/i, domain: "safety" },
  { match: /quality|spc|cpk|gd[_-]?&?t|gauge/i, domain: "quality" },
  { match: /edm|wedm|wire/i, domain: "edm" },
  { match: /calc|physics|force|thermal|chatter/i, domain: "calc" },
  { match: /turn|lathe/i, domain: "turning" },
  { match: /plan|advisor|orchestrat|plan|workflow/i, domain: "orchestrate" },
  { match: /user|preference|session|mode|profile/i, domain: "dev" },
];

export class IntegrationForesightEngine {
  readonly name = "IntegrationForesightEngine";

  constructor(
    private readonly repoRoot: string = process.cwd()
  ) {}

  /**
   * Predict every integration step needed for a new engine.
   *
   * @param spec Engine spec — name, purpose, hints.
   */
  predictIntegration(spec: EngineSpec): IntegrationForesight {
    this.assertSpec(spec);
    const warnings: string[] = [];
    const checklist: IntegrationStep[] = [];

    // Always required
    checklist.push({
      kind: "write_engine",
      description: `Create src/engines/${spec.name}.ts`,
      targetFile: `src/engines/${spec.name}.ts`,
      required: true,
      severity: 5,
      rationale: "Core engine file",
    });
    checklist.push({
      kind: "write_tests",
      description: `Create src/__tests__/${spec.name}.test.ts with ≥10 real assertions`,
      targetFile: `src/__tests__/${spec.name}.test.ts`,
      required: true,
      severity: 5,
      rationale: "PRISM test coverage policy blocks engines without tests",
    });
    checklist.push({
      kind: "add_dispatcher_action",
      description: "Add at least one action to the matching dispatcher's ACTIONS enum + switch case",
      targetFile: this.inferDispatcherPath(spec),
      required: true,
      severity: 5,
      rationale: "Engines without dispatcher exposure are unreachable from MCP",
    });
    checklist.push({
      kind: "update_engine_digest",
      description: "Add a one-line summary to data/docs/ENGINE_DIGEST.md",
      targetFile: "mcp-server/data/docs/ENGINE_DIGEST.md",
      required: true,
      severity: 3,
      rationale: "DuplicationGuardEngine consults the digest before new creations",
    });

    if (spec.needsSchema ?? true) {
      checklist.push({
        kind: "add_action_schema",
        description: "Add Zod action schema(s) matching dispatcher case(s)",
        targetFile: this.inferSchemaPath(spec),
        required: true,
        severity: 4,
        rationale: "Dispatcher validates inputs via Zod before calling the engine",
      });
    }

    // Conditionally required
    if (spec.needsHook) {
      checklist.push({
        kind: "add_hook",
        description: `Register a .claude/hook.mjs that enforces the engine's invariants`,
        required: true,
        severity: 3,
        rationale: "Requested in spec — hook surfaces findings pre-commit",
      });
    }
    if (spec.needsSkill) {
      checklist.push({
        kind: "add_skill",
        description: "Add a user-facing skill file under ~/.claude/commands/",
        required: true,
        severity: 2,
        rationale: "Exposes the engine as an invocable slash command",
      });
    }
    if (spec.isSafetyCritical) {
      checklist.push({
        kind: "add_hook",
        description: "SAFETY-CRITICAL: register a pre-commit hook that gates on S(x)≥0.70",
        required: true,
        severity: 5,
        rationale: "Safety-critical engines must not ship without sx-gate enforcement",
      });
    }

    // Recommended but not strictly required
    checklist.push({
      kind: "update_engine_registry",
      description: "Add to data/state/cross-session-asset-registry.json (prevents duplicate creation in future sessions)",
      targetFile: "mcp-server/data/state/cross-session-asset-registry.json",
      required: false,
      severity: 2,
      rationale: "Cross-session awareness guard",
    });
    checklist.push({
      kind: "update_index_exports",
      description: "Re-export from src/engines/index.ts if the engine is part of the public surface",
      targetFile: "mcp-server/src/engines/index.ts",
      required: false,
      severity: 1,
      rationale: "Not all engines are exported from index.ts",
    });
    checklist.push({
      kind: "record_in_asset_registry",
      description: "Log creation event via duplicationGuardEngine.recordAssetCreation()",
      required: false,
      severity: 2,
      rationale: "Keeps the duplication guard informed going forward",
    });

    // Similar-engine discovery
    const similar = this.findSimilarEngines(spec);
    if (similar.length > 0) {
      warnings.push(
        `Found ${similar.length} similar engine(s) — review them before committing to a new one.`
      );
    }

    const required = checklist.filter((s) => s.required).length;
    return {
      engine: spec.name,
      checklist,
      similarEngines: similar,
      dispatcherHint: this.inferDispatcherDomain(spec),
      coverage: { required, total: checklist.length },
      warnings,
    };
  }

  /**
   * Validate a proposed checklist execution: given what the developer
   * actually did, which required items were missed?
   *
   * @param foresight The earlier prediction.
   * @param completed Step kinds the developer reports completed.
   */
  validateCoverage(
    foresight: IntegrationForesight,
    completed: IntegrationStepKind[]
  ): { missingRequired: IntegrationStep[]; coveragePct: number } {
    const done = new Set(completed);
    const missing = foresight.checklist.filter(
      (s) => s.required && !done.has(s.kind)
    );
    const requiredTotal = foresight.checklist.filter((s) => s.required).length;
    const requiredDone = requiredTotal - missing.length;
    const pct = requiredTotal === 0 ? 1 : requiredDone / requiredTotal;
    return { missingRequired: missing, coveragePct: pct };
  }

  /**
   * Best-guess dispatcher file for the engine's domain.
   */
  inferDispatcherPath(spec: EngineSpec): string {
    const domain = this.inferDispatcherDomain(spec) ?? "dev";
    return `mcp-server/src/tools/dispatchers/${domain}Dispatcher.ts`;
  }

  /**
   * Best-guess schema file.
   */
  inferSchemaPath(spec: EngineSpec): string {
    const domain = this.inferDispatcherDomain(spec) ?? "dev";
    return `mcp-server/src/schemas/${domain}ActionSchemas.ts`;
  }

  /**
   * Scan the engines directory for similar-named/purposed engines.
   */
  findSimilarEngines(spec: EngineSpec): SimilarEngineMatch[] {
    const enginesDir = path.join(this.repoRoot, ENGINES_GLOB);
    if (!fs.existsSync(enginesDir)) return [];
    let entries: string[];
    try {
      entries = fs.readdirSync(enginesDir);
    } catch {
      return [];
    }
    const keywords = this.tokenize(spec.name + " " + (spec.purpose ?? "") + " " + (spec.keywords ?? []).join(" "));
    if (keywords.length === 0) return [];

    const matches: SimilarEngineMatch[] = [];
    for (const f of entries) {
      if (!/Engine\.ts$/.test(f)) continue;
      const id = f.replace(/\.ts$/, "");
      if (id === spec.name) continue;
      const candidate = this.tokenize(id);
      const overlap = keywords.filter((k) => candidate.includes(k));
      if (overlap.length === 0) continue;
      const similarity = overlap.length / Math.max(keywords.length, candidate.length);
      matches.push({ id, similarity, overlapKeywords: overlap });
    }
    matches.sort((a, b) => b.similarity - a.similarity);
    return matches.slice(0, 5);
  }

  /**
   * Render a checklist summary for display.
   */
  summarize(foresight: IntegrationForesight): string {
    const lines: string[] = [];
    lines.push(
      `Integration checklist for ${foresight.engine} — ${foresight.coverage.required} required of ${foresight.coverage.total} total steps`
    );
    if (foresight.dispatcherHint) {
      lines.push(`  Dispatcher hint: ${foresight.dispatcherHint}`);
    }
    for (const s of foresight.checklist) {
      const icon = s.required ? "☐" : "·";
      lines.push(`  ${icon} [${s.kind}] ${s.description}`);
    }
    if (foresight.similarEngines.length > 0) {
      lines.push(`  Similar engines to review:`);
      for (const m of foresight.similarEngines) {
        lines.push(`    - ${m.id} (overlap: ${m.overlapKeywords.join(", ")})`);
      }
    }
    return lines.join("\n");
  }

  private inferDispatcherDomain(spec: EngineSpec): string | null {
    if (spec.domain) return spec.domain.toLowerCase();
    const haystack = `${spec.name} ${spec.purpose ?? ""}`;
    for (const { match, domain } of DISPATCHER_HINTS) {
      if (match.test(haystack)) return domain;
    }
    return null;
  }

  private tokenize(s: string): string[] {
    const raw = s
      .replace(/Engine$/, "")
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/[^A-Za-z0-9]+/g, " ")
      .toLowerCase()
      .trim();
    return raw
      .split(/\s+/)
      .filter((w) => w.length > 2)
      .filter((w) => !["the", "and", "for", "with", "from", "into"].includes(w));
  }

  private assertSpec(spec: unknown): asserts spec is EngineSpec {
    if (!spec || typeof spec !== "object") {
      throw new Error("IntegrationForesightEngine.predictIntegration: spec must be an object");
    }
    const rec = spec as Partial<EngineSpec>;
    if (typeof rec.name !== "string" || rec.name.trim() === "") {
      throw new Error("IntegrationForesightEngine.predictIntegration: spec.name required");
    }
    if (!/Engine$/.test(rec.name)) {
      throw new Error("IntegrationForesightEngine.predictIntegration: spec.name must end with 'Engine'");
    }
  }
}

export const integrationForesightEngine = new IntegrationForesightEngine();
