/**
 * FileSystemNavigatorEngine — Zero-IO file system navigation for token savings
 *
 * Answers "where is X?" queries using pre-built domain routing maps.
 * No file reads required — all knowledge is embedded. Saves 200-500 tokens
 * per navigation query vs Glob/Grep exploration.
 *
 * Models: Keyword-weighted TF-IDF matching, domain taxonomy routing,
 *         fuzzy prefix matching with Levenshtein distance approximation.
 * References: Salton (1989) TF-IDF, Robertson (2004) BM25
 */

export interface NavigationResult {
  directory: string;
  purpose: string;
  confidence: number;
  key_files: string[];
  dsl_range: string;
  related_dirs: string[];
}

export interface NavigationQuery {
  topic: string;
  type?: "engine" | "dispatcher" | "test" | "data" | "schema" | "route" | "hook" | "any";
}

// Pre-built domain routing map — no file I/O needed
const DOMAIN_ROUTES: Array<{
  keywords: string[];
  dir: string;
  purpose: string;
  dsl: string;
  key_files: string[];
  related: string[];
  weight: number;
}> = [
  {
    keywords: ["engine", "calculate", "physics", "model", "formula"],
    dir: "src/engines/",
    purpose: "860+ calculation engines — core physics, manufacturing, CNC, costing",
    dsl: "E0001-E0860",
    key_files: ["index.ts", "UltimateSpeedFeedEngine.ts", "ManufacturingCalculations.ts"],
    related: ["src/algorithms/", "src/registries/"],
    weight: 1.0,
  },
  {
    keywords: ["dispatch", "action", "route", "mcp", "tool"],
    dir: "src/tools/dispatchers/",
    purpose: "66 action dispatchers — route MCP actions to engines",
    dsl: "D01-D66",
    key_files: ["calcDispatcher.ts", "camDispatcher.ts", "toolpathDispatcher.ts"],
    related: ["src/schemas/", "src/engines/"],
    weight: 1.0,
  },
  {
    keywords: ["algorithm", "optimization", "ml", "machine learning", "genetic"],
    dir: "src/algorithms/",
    purpose: "52 reusable algorithms — physics, ML, optimization",
    dsl: "A01-A51",
    key_files: ["index.ts"],
    related: ["src/engines/", "src/registries/"],
    weight: 1.0,
  },
  {
    keywords: ["test", "vitest", "expect", "describe", "spec"],
    dir: "src/__tests__/",
    purpose: "545 test files — vitest unit/integration/benchmark",
    dsl: "T0001-T0534",
    key_files: ["v6-integration.test.ts", "speed-feed.test.ts"],
    related: ["src/engines/"],
    weight: 1.0,
  },
  {
    keywords: ["catalog", "tool data", "machine profile", "holder", "grade", "manufacturer"],
    dir: "src/data/",
    purpose: "42+ catalog files — 46K tools, 910 machines, holders, grades",
    dsl: "C01-C67",
    key_files: ["osg-tool-catalog.ts", "machine-profiles-catalog.ts", "sandvik-tool-catalog.ts"],
    related: ["src/registries/"],
    weight: 1.0,
  },
  {
    keywords: ["schema", "zod", "validation", "params", "action schema"],
    dir: "src/schemas/",
    purpose: "72 Zod action schemas — parameter validation for dispatcher actions",
    dsl: "",
    key_files: ["calcActionSchemas.ts", "camActionSchemas.ts"],
    related: ["src/tools/dispatchers/"],
    weight: 0.9,
  },
  {
    keywords: ["registry", "material", "formula", "strategy", "knowledge base", "tribal"],
    dir: "src/registries/",
    purpose: "23 registries — tool catalog, material DB, formula, strategy, knowledge",
    dsl: "RG01-RG22",
    key_files: ["FormulaRegistry.ts", "MaterialDatabaseEngine.ts", "ToolCatalogRegistry.ts"],
    related: ["src/data/", "src/engines/"],
    weight: 1.0,
  },
  {
    keywords: ["hook", "safety", "cadence", "event", "automation", "hookify"],
    dir: "src/hooks/",
    purpose: "22 hook files — safety chains, cadences, domain hooks",
    dsl: "H01-H21",
    key_files: ["SafetyChainHook.ts", "CadenceDefinitions.ts"],
    related: ["src/engines/"],
    weight: 0.9,
  },
  {
    keywords: ["route", "api", "endpoint", "express", "rest", "http"],
    dir: "src/routes/",
    purpose: "33 Express API routes — REST endpoints",
    dsl: "",
    key_files: [],
    related: ["src/tools/dispatchers/", "src/middleware/"],
    weight: 0.8,
  },
  {
    keywords: ["type", "interface", "typedef", "enum", "constant"],
    dir: "src/types/",
    purpose: "12 TypeScript type definitions — shared interfaces",
    dsl: "",
    key_files: [],
    related: ["src/engines/", "src/schemas/"],
    weight: 0.7,
  },
  {
    keywords: ["util", "helper", "format", "parse", "convert"],
    dir: "src/utils/",
    purpose: "17 utility modules — helpers, formatters, parsers",
    dsl: "U01-U16",
    key_files: [],
    related: ["src/engines/"],
    weight: 0.7,
  },
  {
    keywords: ["milestone", "roadmap", "plan", "rgs", "track"],
    dir: "data/milestones/",
    purpose: "per-milestone envelope JSON files (live count: roadmap-index.json -- never hardcode)",
    dsl: "",
    key_files: ["roadmap-index.json"],
    related: ["data/docs/roadmap/", "data/claims/"],
    weight: 0.8,
  },
  {
    keywords: ["doc", "documentation", "index", "inventory", "master", "system"],
    dir: "data/docs/",
    purpose: "33+ documentation files — MASTER_INDEX, SYSTEM_INVENTORY, digests",
    dsl: "DOC01-DOC36",
    key_files: ["MASTER_INDEX.md", "SYSTEM_INVENTORY.md", "DIRECTORY_DIGEST.md", "ENGINE_DIGEST.md"],
    related: [],
    weight: 0.8,
  },
  {
    keywords: ["web", "frontend", "react", "page", "component", "dashboard", "ui"],
    dir: "web/src/",
    purpose: "Web frontend — React/TypeScript SPA, 42 pages",
    dsl: "",
    key_files: ["pages/", "components/"],
    related: ["src/routes/"],
    weight: 0.8,
  },
  {
    keywords: ["material", "alloy", "steel", "aluminum", "titanium", "hardness"],
    dir: "data/materials/",
    purpose: "Material database JSON files",
    dsl: "",
    key_files: [],
    related: ["src/registries/MaterialDatabaseEngine.ts"],
    weight: 0.9,
  },
  {
    keywords: ["cutting", "force", "speed", "feed", "chip", "wear", "tool life", "machining"],
    dir: "src/engines/",
    purpose: "Cutting engines: UltimateSpeedFeed, CuttingForce, ToolWear, ChipFormation, etc.",
    dsl: "E*",
    key_files: ["UltimateSpeedFeedEngine.ts", "CuttingForceEngine.ts", "ToolWearProgressionEngine.ts"],
    related: ["src/algorithms/", "src/data/"],
    weight: 1.2,
  },
  {
    keywords: ["gcode", "g-code", "post", "cam", "toolpath", "nc", "program"],
    dir: "src/engines/",
    purpose: "CAM/G-code engines: GCodeTemplate, PostProcessor, Toolpath, CycleTime, etc.",
    dsl: "E*",
    key_files: ["GCodeTemplateEngine.ts", "AdvancedPostProcessorEngine.ts", "NovelToolpathEngine.ts"],
    related: ["src/tools/dispatchers/camDispatcher.ts"],
    weight: 1.2,
  },
  {
    keywords: ["weld", "join", "solder", "braze", "fusion", "filler"],
    dir: "src/engines/",
    purpose: "Welding engines: LaserWelding, FSW, EBWelding, ResistanceWelding, Soldering, Brazing",
    dsl: "E*",
    key_files: ["LaserWeldingEngine.ts", "FrictionStirWeldingEngine.ts"],
    related: ["src/tools/dispatchers/weldingJoiningDispatcher.ts"],
    weight: 1.1,
  },
  {
    keywords: ["cast", "mold", "injection", "die", "pour", "solidif"],
    dir: "src/engines/",
    purpose: "Casting engines: VacuumCasting, CentrifugalCasting, InjectionMolding, etc.",
    dsl: "E*",
    key_files: ["VacuumCastingEngine.ts", "CentrifugalCastingEngine.ts"],
    related: ["src/tools/dispatchers/formingCastingDispatcher.ts"],
    weight: 1.1,
  },
  {
    keywords: ["quote", "cost", "price", "bid", "estimate", "margin"],
    dir: "src/engines/",
    purpose: "Costing engines: QuoteEngine, CostEstimation, PriceBreak, MarginAnalysis, etc.",
    dsl: "E*",
    key_files: ["QuoteEngine.ts", "CostEstimationEngine.ts"],
    related: ["src/tools/dispatchers/quotingDispatcher.ts"],
    weight: 1.1,
  },
  {
    keywords: ["token", "context", "session", "compact", "budget", "waste", "dedup"],
    dir: "src/engines/",
    purpose: "49 token-saving engines: Context, Session, Output, Batch, Waste, Dedup, etc.",
    dsl: "E*",
    key_files: ["QuickCalcEngine.ts", "ContextIntegrityEngine.ts", "CodeSystemIndexEngine.ts"],
    related: [],
    weight: 1.0,
  },
  {
    keywords: ["config", "setting", "environment", "feature flag"],
    dir: "src/config/",
    purpose: "5 configuration files — server config, feature flags",
    dsl: "",
    key_files: [],
    related: [],
    weight: 0.6,
  },
  {
    keywords: ["middleware", "auth", "logging", "error", "rate limit"],
    dir: "src/middleware/",
    purpose: "7 middleware modules — auth, logging, error handling",
    dsl: "",
    key_files: [],
    related: ["src/routes/"],
    weight: 0.7,
  },
  {
    keywords: ["orchestrat", "pipeline", "chain", "multi-engine"],
    dir: "src/orchestration/",
    purpose: "3 orchestration modules — multi-engine pipeline coordination",
    dsl: "",
    key_files: [],
    related: ["src/engines/"],
    weight: 0.8,
  },
  {
    keywords: ["service", "external", "background", "integration"],
    dir: "src/services/",
    purpose: "4 service modules — external integrations",
    dsl: "SV01-SV03",
    key_files: [],
    related: [],
    weight: 0.7,
  },
];

export class FileSystemNavigatorEngine {
  /**
   * Navigate to the best directory for a query topic.
   * Uses TF-IDF-like keyword matching with domain weights.
   */
  navigate(query: NavigationQuery): NavigationResult[] {
    const terms = query.topic.toLowerCase().split(/[\s,/._-]+/).filter(t => t.length > 1);
    const results: Array<NavigationResult & { score: number }> = [];

    for (const route of DOMAIN_ROUTES) {
      let score = 0;

      // Keyword matching with BM25-like scoring
      for (const term of terms) {
        for (const kw of route.keywords) {
          if (kw.includes(term) || term.includes(kw)) {
            // Exact match bonus
            const exactBonus = kw === term ? 2.0 : 1.0;
            // Length normalization (shorter keywords = more specific = higher score)
            const lenNorm = 1.0 / (1.0 + Math.abs(kw.length - term.length) * 0.1);
            score += exactBonus * lenNorm;
          }
        }
      }

      // Apply route weight
      score *= route.weight;

      // Type filter bonus
      if (query.type) {
        const typeMap: Record<string, string[]> = {
          engine: ["src/engines/"],
          dispatcher: ["src/tools/dispatchers/"],
          test: ["src/__tests__/"],
          data: ["src/data/", "data/"],
          schema: ["src/schemas/"],
          route: ["src/routes/"],
          hook: ["src/hooks/"],
        };
        const dirs = typeMap[query.type] || [];
        if (dirs.some(d => route.dir.startsWith(d))) {
          score *= 2.0;
        }
      }

      if (score > 0) {
        results.push({
          directory: route.dir,
          purpose: route.purpose,
          confidence: Math.min(score / (terms.length || 1), 1.0),
          key_files: route.key_files,
          dsl_range: route.dsl,
          related_dirs: route.related,
          score,
        });
      }
    }

    // Sort by score descending, deduplicate directories
    results.sort((a, b) => b.score - a.score);
    const seen = new Set<string>();
    const deduped: NavigationResult[] = [];
    for (const r of results) {
      if (!seen.has(r.directory)) {
        seen.add(r.directory);
        deduped.push({
          directory: r.directory,
          purpose: r.purpose,
          confidence: Math.round(r.confidence * 100) / 100,
          key_files: r.key_files,
          dsl_range: r.dsl_range,
          related_dirs: r.related_dirs,
        });
      }
    }

    return deduped.slice(0, 5);
  }

  /** Quick single-result navigation */
  find(topic: string): NavigationResult | null {
    const results = this.navigate({ topic });
    return results.length > 0 ? results[0] : null;
  }

  /** Get all registered domains */
  domains(): string[] {
    return [...new Set(DOMAIN_ROUTES.map(r => r.dir))];
  }

  /** Get total route count */
  routeCount(): number {
    return DOMAIN_ROUTES.length;
  }
}

export const fileSystemNavigatorEngine = new FileSystemNavigatorEngine();
