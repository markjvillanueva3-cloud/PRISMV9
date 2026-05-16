/**
 * ProductPillarEngine — MXU-MS6
 *
 * Bundle engines into product pillars for user-facing capability packages:
 *   1. Pillar definitions — Calculator, Toolpath, Quote, Quality, PostProcessor
 *   2. Completeness scoring — how ready is each pillar for users
 *   3. Entry point mapping — which action/skill starts each pillar
 *   4. Dependency resolution — what each pillar needs from other pillars
 *   5. Feature gate — enable/disable pillars per subscription tier
 *
 * Sources:
 *   - MXU-MS6: Product-Pillar Capability Packages
 */

import * as fs from "node:fs";
import * as path from "node:path";

// ============================================================================
// TYPES
// ============================================================================

export type PillarId = "calculator" | "toolpath" | "quote" | "quality" | "postprocessor" | "edm" | "knowledge" | "automation";

export type SubscriptionTier = "free" | "pro" | "enterprise";

export interface ProductPillar {
  id: PillarId;
  name: string;
  tagline: string;
  engines: string[];
  entry_actions: string[];
  entry_skills: string[];
  dependencies: PillarId[];
  min_tier: SubscriptionTier;
}

export interface PillarCompleteness {
  pillar_id: PillarId;
  pillar_name: string;
  total_engines: number;
  wired_engines: number;
  completeness_pct: number;
  entry_points_active: number;
  missing: string[];
  status: "ready" | "partial" | "stub";
}

export interface PillarSummary {
  total_pillars: number;
  ready: number;
  partial: number;
  stub: number;
  avg_completeness_pct: number;
  pillars: PillarCompleteness[];
  /**
   * Where the wired-engine / active-skill sets came from. Additive (optional)
   * so the explicit `getSummary(Set,Set)` path is unchanged:
   *   - "explicit"    — caller injected the sets (legacy/back-compat path)
   *   - "live"        — resolved against the real dispatcher tree (or bundle)
   *   - "unavailable" — resolution failed; the 0% figures are NOT a real
   *                     measurement and MUST NOT be read as "nothing wired"
   * The whole point of PILLAR-TELEMETRY-FIX: a self-report that says 0%
   * because nobody fed it data is a lie (Karpathy R12). This field lets a
   * consumer tell "really 0%" from "couldn't measure".
   */
  telemetry_source?: "explicit" | "live" | "unavailable";
  /** Distinct pillar-relevant engines found wired (live path only). */
  resolved_wired_total?: number;
  /** Distinct pillar entry-skills found present (live path only). */
  resolved_skill_total?: number;
}

/**
 * Returns a map of source-key → file-contents to scan for engine references.
 * Injected in tests; the default reads the live dispatcher tree (dev) or the
 * compiled bundle (prod). A reader that throws or returns an empty map is
 * treated as "telemetry unavailable", never as "0% wired".
 */
export type DispatcherSourceReader = () => Map<string, string>;

/** Returns the set of skill basenames (no `.md`) that exist on disk. */
export type SkillLister = () => string[];

export interface FeatureGate {
  pillar_id: PillarId;
  tier: SubscriptionTier;
  allowed: boolean;
  reason: string;
}

// ============================================================================
// PILLAR DEFINITIONS
// ============================================================================

const PILLARS: ProductPillar[] = [
  {
    id: "calculator",
    name: "Speed & Feed Calculator",
    tagline: "Physics-optimized cutting parameters for any material/tool/machine",
    engines: [
      "SpeedFeedOrchestratorEngine", "KienzleForceModelEngine", "ChatterStabilityLobeEngine",
      "CuttingTemperatureEngine", "SurfaceFinishPredictorEngine", "DeflectionAnalysisEngine",
      "ThermalWearCouplingEngine", "SpeedFeedAutopilotEngine", "UltimateSpeedFeedEngine",
    ],
    entry_actions: ["calc.speed_feed", "calc.cutting_force", "sf_autopilot_run"],
    entry_skills: ["sfc-quick-start", "auto-speed-feed", "calc"],
    dependencies: [],
    min_tier: "free",
  },
  {
    id: "toolpath",
    name: "Toolpath Intelligence",
    tagline: "CAM strategy selection, feature recognition, adaptive toolpaths",
    engines: [
      "ToolpathStrategyEngine", "FeatureRecognitionEngine", "AdaptiveToolpathRouterEngine",
      "PrintToProgramPipelineEngine", "MultiAxisPrintToProgramEngine",
    ],
    entry_actions: ["cam.strategy_select", "cam.feature_recognize"],
    entry_skills: ["cam-toolpath-guide", "print-to-program"],
    dependencies: ["calculator"],
    min_tier: "pro",
  },
  {
    id: "postprocessor",
    name: "Post Processor",
    tagline: "G-code generation for 20+ controller dialects with per-block optimization",
    engines: [
      "PostProcessorPipelineEngine", "PostProcessorAutopilotEngine",
      "ControllerProgrammingIntelligenceEngine", "PostLibraryCatalogEngine",
      "PostValidationHardeningEngine", "PostValidationReportEngine",
    ],
    entry_actions: ["pp_autopilot_run", "pp_autopilot_resolve_dialect", "pp_autopilot_print_to_program"],
    entry_skills: ["ppg-quick-start", "pp-resolve", "program-gen", "program-optimize"],
    dependencies: ["calculator"],
    min_tier: "pro",
  },
  {
    id: "quote",
    name: "Quote & Cost",
    tagline: "Physics-backed quoting with DFM feedback and quantity breaks",
    engines: [
      "QuoteToShipOrchestratorEngine", "QuoteAutopilotEngine",
      "OEECalculatorEngine", "CapacityPlanningEngine",
    ],
    entry_actions: ["quote_autopilot_run", "business.quote_generate"],
    entry_skills: ["quote-job", "estimate", "bid-to-win", "cost-estimation-guide"],
    dependencies: ["calculator"],
    min_tier: "pro",
  },
  {
    id: "quality",
    name: "Quality Management",
    tagline: "SPC, FAI, dimensional analysis, process capability",
    engines: [
      "SPCEngine", "FAIEngine", "MetrologyEngine", "MaterialCertEngine",
    ],
    entry_actions: ["quality.spc_analyze", "quality.fai_generate"],
    entry_skills: ["quality-check", "quality-spc-guide", "first-part-right", "measure"],
    dependencies: [],
    min_tier: "pro",
  },
  {
    id: "edm",
    name: "Wire EDM Studio",
    tagline: "Physics-optimized WEDM programs with Kunieda MRR and DiBitonto offsets",
    engines: [
      "WireEDMSettingsEngine", "EDMProgramAssemblerEngine",
      "WireEDMPulseParameterEngine", "WireEDMDimensionalAccuracyEngine",
    ],
    entry_actions: ["edm.wire_settings", "edm.program_assemble"],
    entry_skills: ["wire-edm-studio", "wire-edm-analyze", "wedm-program"],
    dependencies: [],
    min_tier: "pro",
  },
  {
    id: "knowledge",
    name: "Shop Knowledge",
    tagline: "Tribal knowledge, playbook rules, apprentice learning",
    engines: [
      "TribalKnowledgeEngine", "PlaybookEngine", "ApprenticeEngine", "LearningPathEngine",
    ],
    entry_actions: ["knowledge.tribal_search", "knowledge.playbook_query"],
    entry_skills: ["shop-knowledge", "tribal-knowledge-guide", "playbook"],
    dependencies: [],
    min_tier: "free",
  },
  {
    id: "automation",
    name: "Automation & Intelligence",
    tagline: "Task classification, chain orchestration, self-healing workflows",
    engines: [
      "AutomationChainEngine", "BuildGuardChainEngine", "ChainFailureRecoveryEngine",
      "ContextChainEngine", "WorkflowOrchestrationEngine", "CodingCopilotEngine",
    ],
    entry_actions: ["build_guard_chain", "copilot_suggest", "chain_recover"],
    entry_skills: ["autopilot", "forge", "smart"],
    dependencies: [],
    min_tier: "enterprise",
  },
];

// ============================================================================
// LIVE TELEMETRY RESOLVERS (module-level — keeps the engine class pure)
//
// PILLAR-TELEMETRY-FIX: `getSummary(Set,Set)` is a correct pure function, but
// the dispatcher fed it `new Set(params.wired_engines || [])` — so the
// self-report / CLI / audit path (no params) always got EMPTY sets and every
// pillar scored 0% / stub despite 3,046+ engines existing. The fix is a live
// resolver that the dispatcher uses when the caller doesn't inject the sets.
// Reader/lister are dependency-injected so the resolver core stays unit-pure
// (real-data E2E test exercises the default readers — RGS-MS1 lesson).
// ============================================================================

/** Every distinct engine name referenced by any pillar (resolution target). */
function allPillarEngineNames(): string[] {
  const seen = new Set<string>();
  for (const p of PILLARS) for (const e of p.engines) seen.add(e);
  return [...seen];
}

/**
 * Ordered repo-root candidates, deterministic and environment-portable.
 * `PRISM_REPO_ROOT` → cwd → cwd/.. → the documented canonical `H:/prism`
 * (CLAUDE-BRIEF source-of-truth) as the LAST resort only. Shared by the
 * dispatcher-source probe AND the skill lister so neither path carries a
 * per-user hardcode (a machine-specific path would be the exact class of
 * environment-dependent telemetry rot this unit exists to fix).
 */
function repoRootCandidates(): string[] {
  return [
    process.env.PRISM_REPO_ROOT,
    process.cwd(),
    path.resolve(process.cwd(), ".."),
    "H:/prism",
  ].filter((c): c is string => typeof c === "string" && c.length > 0);
}

/**
 * Locate the PRISM repo root deterministically. The MCP server runs from
 * `dist/`, so cwd-relative source paths are unreliable — probe the ordered
 * candidate list and accept the first that actually contains the dispatcher
 * source tree OR the compiled bundle. Returns null (→ "unavailable") rather
 * than guessing, so a missing tree fails loud instead of faking 0%.
 */
function findDispatcherSources(): { key: string; root: string } | null {
  for (const root of repoRootCandidates()) {
    // Per-candidate guard: a transient existsSync/statSync race (TOCTOU,
    // permission flip) on one candidate must skip to the next, never abort
    // the whole probe — the H:/prism last-resort must still get a chance.
    try {
      const srcDir = path.join(root, "mcp-server", "src", "tools", "dispatchers");
      if (fs.existsSync(srcDir) && fs.statSync(srcDir).isDirectory()) {
        return { key: "src", root: srcDir };
      }
      const bundle = path.join(root, "mcp-server", "dist", "index.js");
      if (fs.existsSync(bundle) && fs.statSync(bundle).isFile()) {
        return { key: "bundle", root: bundle };
      }
    } catch {
      /* probe error on this candidate — try the next, fail-open at the end */
    }
  }
  return null;
}

/**
 * Default reader: dispatcher `.ts` files (dev) or the single `dist/index.js`
 * bundle (prod). Each entry is scanned for engine-name references. Throws are
 * the caller's signal to mark telemetry "unavailable".
 */
export const defaultDispatcherSourceReader: DispatcherSourceReader = () => {
  const loc = findDispatcherSources();
  if (!loc) return new Map();
  const out = new Map<string, string>();
  if (loc.key === "bundle") {
    out.set("dist/index.js", fs.readFileSync(loc.root, "utf-8"));
    return out;
  }
  for (const f of fs.readdirSync(loc.root)) {
    if (!f.endsWith(".ts")) continue;
    try {
      out.set(f, fs.readFileSync(path.join(loc.root, f), "utf-8"));
    } catch {
      /* skip an unreadable single file — partial scan still beats faking 0% */
    }
  }
  return out;
};

/**
 * Default skill lister: `.md` basenames from every `<root>/.claude/commands`
 * derived from the SAME deterministic root probe as the dispatcher reader —
 * no per-user absolute path (a `C:/Users/<name>/...` literal would make skill
 * telemetry lie depending on whose machine runs it, the very rot class this
 * unit fixes). De-duplicated across roots; a single bad dir never zeroes the
 * set (fail-soft — an empty skill set only downgrades ready→partial, never
 * fabricates a wiring zero).
 */
export const defaultSkillLister: SkillLister = () => {
  const names = new Set<string>();
  for (const root of repoRootCandidates()) {
    const d = path.join(root, ".claude", "commands");
    try {
      if (!fs.existsSync(d)) continue;
      for (const f of fs.readdirSync(d)) {
        if (f.endsWith(".md")) names.add(f.slice(0, -3));
      }
    } catch {
      /* one bad dir must not zero out the whole skill set */
    }
  }
  return [...names];
};

/** Word-boundary test so `SPCEngine` ≠ `SPCEngineWrapperFoo` substring noise. */
function referencesEngine(haystack: string, engineName: string): boolean {
  // Engine names are identifier-safe; escape only the regex metacharacters
  // that could appear defensively (none in practice, but never trust input).
  const esc = engineName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![A-Za-z0-9_])${esc}(?![A-Za-z0-9_])`).test(haystack);
}

export interface WiredEngineResolution {
  wired: Set<string>;
  source: "live" | "unavailable";
}

/**
 * Resolve which pillar-relevant engines are actually wired by scanning
 * dispatcher source/bundle for whole-token references. An engine is "wired"
 * iff at least one dispatcher file references it by name.
 *
 * HEURISTIC — read as an OPTIMISTIC UPPER BOUND, not an import-graph proof:
 * any whole-token textual occurrence counts, including a name that appears
 * only inside a comment, a doc block, a `z.enum([...])` string, or dead
 * code. A deferred-work note that merely names an engine would still score
 * it "wired". This is an intentional, cheap self-report heuristic (a real
 * import-graph is out of scope for a telemetry path); `completeness_pct` is
 * therefore a ceiling on true wiring. The fix this lives in only needs to
 * distinguish "lots wired" from the prior fabricated 0% — it does that
 * honestly; consumers must not read the % as an exact wiring proof
 * (Karpathy R12: don't let a heuristic be mistaken for an exact measure).
 */
export function resolveWiredEngines(
  reader: DispatcherSourceReader = defaultDispatcherSourceReader,
): WiredEngineResolution {
  let files: Map<string, string>;
  try {
    files = reader();
  } catch {
    return { wired: new Set(), source: "unavailable" };
  }
  if (!files || files.size === 0) {
    return { wired: new Set(), source: "unavailable" };
  }
  const targets = allPillarEngineNames();
  const wired = new Set<string>();
  for (const contents of files.values()) {
    if (typeof contents !== "string" || contents.length === 0) continue;
    for (const name of targets) {
      if (!wired.has(name) && referencesEngine(contents, name)) wired.add(name);
    }
  }
  return { wired, source: "live" };
}

/**
 * Compute the standard inputs `getSummary` needs, from the live tree, without
 * the caller having to know how. Falls back to a clearly-marked
 * "unavailable" rather than a fake 0%.
 */
export function resolveLivePillarInputs(
  reader: DispatcherSourceReader = defaultDispatcherSourceReader,
  lister: SkillLister = defaultSkillLister,
): {
  wired: Set<string>;
  skills: Set<string>;
  source: "live" | "unavailable";
} {
  const w = resolveWiredEngines(reader);
  let skills: Set<string>;
  try {
    skills = new Set(lister());
  } catch {
    skills = new Set();
  }
  return { wired: w.wired, skills, source: w.source };
}

// ============================================================================
// ENGINE
// ============================================================================

export class ProductPillarEngine {

  // ── Pillar Catalog ─────────────────────────────────────────

  listPillars(): Array<{ id: PillarId; name: string; tagline: string; engines: number; tier: SubscriptionTier }> {
    return PILLARS.map(p => ({
      id: p.id,
      name: p.name,
      tagline: p.tagline,
      engines: p.engines.length,
      tier: p.min_tier,
    }));
  }

  getPillar(id: PillarId): ProductPillar | undefined {
    return PILLARS.find(p => p.id === id);
  }

  // ── Completeness Scoring ───────────────────────────────────

  /**
   * Score pillar completeness based on which engines are actually wired.
   *
   * @param pillarId Pillar to score
   * @param wiredEngines Set of engine names that have dispatcher actions
   * @param activeSkills Set of skill names that exist
   * @returns Completeness assessment
   */
  scorePillar(
    pillarId: PillarId,
    wiredEngines: Set<string>,
    activeSkills: Set<string>,
  ): PillarCompleteness {
    const pillar = PILLARS.find(p => p.id === pillarId);
    if (!pillar) {
      return { pillar_id: pillarId, pillar_name: "Unknown", total_engines: 0, wired_engines: 0, completeness_pct: 0, entry_points_active: 0, missing: [], status: "stub" };
    }

    const wired = pillar.engines.filter(e => wiredEngines.has(e)).length;
    const missing = pillar.engines.filter(e => !wiredEngines.has(e));
    const entryActive = pillar.entry_skills.filter(s => activeSkills.has(s)).length;
    const pct = parseFloat(((wired / pillar.engines.length) * 100).toFixed(1));

    let status: PillarCompleteness["status"];
    if (pct >= 80 && entryActive > 0) status = "ready";
    else if (pct >= 30) status = "partial";
    else status = "stub";

    return {
      pillar_id: pillarId,
      pillar_name: pillar.name,
      total_engines: pillar.engines.length,
      wired_engines: wired,
      completeness_pct: pct,
      entry_points_active: entryActive,
      missing,
      status,
    };
  }

  // ── Full Summary ───────────────────────────────────────────

  /**
   * Score all pillars and produce a summary.
   */
  getSummary(wiredEngines: Set<string>, activeSkills: Set<string>): PillarSummary {
    const pillars = PILLARS.map(p => this.scorePillar(p.id, wiredEngines, activeSkills));
    const ready = pillars.filter(p => p.status === "ready").length;
    const partial = pillars.filter(p => p.status === "partial").length;
    const stub = pillars.filter(p => p.status === "stub").length;
    const avgPct = pillars.length > 0
      ? parseFloat((pillars.reduce((s, p) => s + p.completeness_pct, 0) / pillars.length).toFixed(1))
      : 0;

    return { total_pillars: pillars.length, ready, partial, stub, avg_completeness_pct: avgPct, pillars };
  }

  /**
   * Self-reporting summary — resolves the live wired-engine + active-skill
   * sets from the real dispatcher tree (or prod bundle) so a caller that
   * passes no params gets the TRUTH, not 0%. This is the PILLAR-TELEMETRY-FIX
   * entry point the dispatcher uses when `params.wired_engines` is absent.
   *
   * When resolution fails the result is stamped `telemetry_source:"unavailable"`
   * and the 0% figures must NOT be interpreted as "nothing wired" — that
   * distinction is the entire point of the fix (Karpathy R12: fail loud, never
   * let a measurement gap masquerade as a measured zero).
   *
   * @param opts.wiredReader injectable dispatcher-source reader (tests)
   * @param opts.skillLister injectable skill lister (tests)
   */
  getSummaryLive(opts?: {
    wiredReader?: DispatcherSourceReader;
    skillLister?: SkillLister;
  }): PillarSummary {
    const { wired, skills, source } = resolveLivePillarInputs(
      opts?.wiredReader ?? defaultDispatcherSourceReader,
      opts?.skillLister ?? defaultSkillLister,
    );
    const summary = this.getSummary(wired, skills);
    summary.telemetry_source = source;
    summary.resolved_wired_total = wired.size;
    summary.resolved_skill_total = skills.size;
    return summary;
  }

  // ── Feature Gates ──────────────────────────────────────────

  /**
   * Check if a pillar is accessible at a given subscription tier.
   */
  checkGate(pillarId: PillarId, userTier: SubscriptionTier): FeatureGate {
    const pillar = PILLARS.find(p => p.id === pillarId);
    if (!pillar) {
      return { pillar_id: pillarId, tier: userTier, allowed: false, reason: "Unknown pillar" };
    }

    const tierRank: Record<SubscriptionTier, number> = { free: 0, pro: 1, enterprise: 2 };
    const allowed = tierRank[userTier] >= tierRank[pillar.min_tier];

    return {
      pillar_id: pillarId,
      tier: userTier,
      allowed,
      reason: allowed
        ? `${pillar.name} is included in ${userTier} tier`
        : `${pillar.name} requires ${pillar.min_tier} tier (current: ${userTier})`,
    };
  }

  /**
   * Get all pillars accessible at a given tier.
   */
  getAccessiblePillars(tier: SubscriptionTier): PillarId[] {
    const tierRank: Record<SubscriptionTier, number> = { free: 0, pro: 1, enterprise: 2 };
    return PILLARS.filter(p => tierRank[tier] >= tierRank[p.min_tier]).map(p => p.id);
  }

  /**
   * Get total pillar count.
   */
  getPillarCount(): number {
    return PILLARS.length;
  }
}

export const productPillarEngine = new ProductPillarEngine();
