/**
 * CapabilityPathEngine — MXU-MS4
 *
 * Learning paths that map to PRISM capability unlocks:
 *   1. Path definitions — structured sequences per domain
 *   2. Progress tracking — which modules completed
 *   3. Next step suggestion — best next capability to learn
 *   4. Prerequisite validation — dependency checking
 *   5. Capability mapping — modules → PRISM skills/actions
 *
 * Unlike LearningPathEngine (operator training), this focuses on
 * unlocking PRISM platform capabilities as users progress.
 *
 * Sources:
 *   - MXU-MS4: Course-to-Capability Transformation
 */

// ============================================================================
// TYPES
// ============================================================================

export type PathLevel = "beginner" | "intermediate" | "advanced" | "expert";

export interface CapabilityModule {
  id: string;
  title: string;
  path_id: string;
  level: PathLevel;
  order: number;
  prerequisites: string[];
  capabilities_unlocked: string[];
  estimated_minutes: number;
}

export interface CapabilityPath {
  id: string;
  name: string;
  domain: string;
  modules: CapabilityModule[];
}

export interface PathProgress {
  path_id: string;
  path_name: string;
  total: number;
  completed: number;
  pct: number;
  level: PathLevel;
  next?: CapabilityModule;
}

export interface NextSuggestion {
  module: CapabilityModule;
  reason: string;
  prereqs_met: boolean;
  missing: string[];
}

// ============================================================================
// PATH DATA
// ============================================================================

const CAPABILITY_PATHS: CapabilityPath[] = [
  {
    id: "sf",
    name: "Speed & Feed",
    domain: "physics",
    modules: [
      { id: "sf-01", title: "RPM & Surface Speed", path_id: "sf", level: "beginner", order: 1, prerequisites: [], capabilities_unlocked: ["calc.speed_feed"], estimated_minutes: 15 },
      { id: "sf-02", title: "Feed Rate & Chip Load", path_id: "sf", level: "beginner", order: 2, prerequisites: ["sf-01"], capabilities_unlocked: ["calc.chip_thinning"], estimated_minutes: 20 },
      { id: "sf-03", title: "MRR & Depth of Cut", path_id: "sf", level: "beginner", order: 3, prerequisites: ["sf-02"], capabilities_unlocked: ["calc.mrr"], estimated_minutes: 15 },
      { id: "sf-04", title: "Kienzle Force Model", path_id: "sf", level: "intermediate", order: 4, prerequisites: ["sf-03"], capabilities_unlocked: ["calc.cutting_force"], estimated_minutes: 30 },
      { id: "sf-05", title: "Taylor Tool Life", path_id: "sf", level: "intermediate", order: 5, prerequisites: ["sf-04"], capabilities_unlocked: ["calc.tool_life"], estimated_minutes: 25 },
      { id: "sf-06", title: "Power & Torque Limits", path_id: "sf", level: "intermediate", order: 6, prerequisites: ["sf-04"], capabilities_unlocked: ["machine-check"], estimated_minutes: 20 },
      { id: "sf-07", title: "Chatter & Stability", path_id: "sf", level: "advanced", order: 7, prerequisites: ["sf-05", "sf-06"], capabilities_unlocked: ["calc.chatter_stability"], estimated_minutes: 40 },
      { id: "sf-08", title: "Monte Carlo UQ", path_id: "sf", level: "expert", order: 8, prerequisites: ["sf-07"], capabilities_unlocked: ["auto-speed-feed"], estimated_minutes: 35 },
    ],
  },
  {
    id: "pp",
    name: "Post Processor",
    domain: "post_processor",
    modules: [
      { id: "pp-01", title: "G-code Basics", path_id: "pp", level: "beginner", order: 1, prerequisites: [], capabilities_unlocked: ["gcode"], estimated_minutes: 20 },
      { id: "pp-02", title: "Controller Dialects", path_id: "pp", level: "beginner", order: 2, prerequisites: ["pp-01"], capabilities_unlocked: ["pp-resolve"], estimated_minutes: 25 },
      { id: "pp-03", title: "Canned Cycles", path_id: "pp", level: "intermediate", order: 3, prerequisites: ["pp-02"], capabilities_unlocked: ["program-gen"], estimated_minutes: 30 },
      { id: "pp-04", title: "Per-Block Optimization", path_id: "pp", level: "advanced", order: 4, prerequisites: ["pp-03"], capabilities_unlocked: ["program-optimize"], estimated_minutes: 40 },
      { id: "pp-05", title: "Multi-Dialect Output", path_id: "pp", level: "expert", order: 5, prerequisites: ["pp-04"], capabilities_unlocked: ["print-to-program"], estimated_minutes: 30 },
    ],
  },
  {
    id: "qt",
    name: "Manufacturing Quoting",
    domain: "business",
    modules: [
      { id: "qt-01", title: "Cost Estimation", path_id: "qt", level: "beginner", order: 1, prerequisites: [], capabilities_unlocked: ["estimate"], estimated_minutes: 15 },
      { id: "qt-02", title: "Cycle Time Estimation", path_id: "qt", level: "intermediate", order: 2, prerequisites: ["qt-01"], capabilities_unlocked: ["quote-job"], estimated_minutes: 25 },
      { id: "qt-03", title: "DFM Analysis", path_id: "qt", level: "intermediate", order: 3, prerequisites: ["qt-02"], capabilities_unlocked: ["dfm-check"], estimated_minutes: 20 },
      { id: "qt-04", title: "Competitive Bidding", path_id: "qt", level: "advanced", order: 4, prerequisites: ["qt-03"], capabilities_unlocked: ["bid-to-win"], estimated_minutes: 30 },
    ],
  },
  {
    id: "qa",
    name: "Quality Operations",
    domain: "quality",
    modules: [
      { id: "qa-01", title: "Measurement Basics", path_id: "qa", level: "beginner", order: 1, prerequisites: [], capabilities_unlocked: ["measure"], estimated_minutes: 20 },
      { id: "qa-02", title: "SPC & Control Charts", path_id: "qa", level: "intermediate", order: 2, prerequisites: ["qa-01"], capabilities_unlocked: ["quality-check"], estimated_minutes: 30 },
      { id: "qa-03", title: "First Article Inspection", path_id: "qa", level: "advanced", order: 3, prerequisites: ["qa-02"], capabilities_unlocked: ["first-part-right"], estimated_minutes: 35 },
    ],
  },
];

// ============================================================================
// ENGINE
// ============================================================================

export class CapabilityPathEngine {

  listPaths(): Array<{ id: string; name: string; domain: string; modules: number }> {
    return CAPABILITY_PATHS.map(p => ({ id: p.id, name: p.name, domain: p.domain, modules: p.modules.length }));
  }

  getPath(id: string): CapabilityPath | undefined {
    return CAPABILITY_PATHS.find(p => p.id === id);
  }

  getModule(id: string): CapabilityModule | undefined {
    for (const p of CAPABILITY_PATHS) {
      const m = p.modules.find(m => m.id === id);
      if (m) return m;
    }
    return undefined;
  }

  getProgress(pathId: string, completed: string[]): PathProgress {
    const path = CAPABILITY_PATHS.find(p => p.id === pathId);
    if (!path) return { path_id: pathId, path_name: "Unknown", total: 0, completed: 0, pct: 0, level: "beginner" };

    const done = path.modules.filter(m => completed.includes(m.id)).length;
    let level: PathLevel = "beginner";
    for (const m of path.modules) {
      if (completed.includes(m.id)) level = m.level;
    }

    const next = path.modules.find(m =>
      !completed.includes(m.id) && m.prerequisites.every(p => completed.includes(p))
    );

    return { path_id: pathId, path_name: path.name, total: path.modules.length, completed: done, pct: parseFloat(((done / path.modules.length) * 100).toFixed(1)), level, next };
  }

  getAllProgress(completed: string[]): PathProgress[] {
    return CAPABILITY_PATHS.map(p => this.getProgress(p.id, completed));
  }

  suggestNext(completed: string[], preferredDomain?: string): NextSuggestion | null {
    const candidates: Array<{ mod: CapabilityModule; score: number; missing: string[] }> = [];

    for (const path of CAPABILITY_PATHS) {
      for (const mod of path.modules) {
        if (completed.includes(mod.id)) continue;
        const missing = mod.prerequisites.filter(p => !completed.includes(p));
        let score = missing.length === 0 ? 1.0 : 0.3;
        if (preferredDomain && path.domain === preferredDomain) score += 0.3;
        score += (1 - mod.order / 10) * 0.2;
        if (completed.length < 3 && mod.level === "beginner") score += 0.2;
        candidates.push({ mod, score, missing });
      }
    }

    if (!candidates.length) return null;
    candidates.sort((a, b) => b.score - a.score);
    const best = candidates[0];

    return {
      module: best.mod,
      reason: best.missing.length === 0
        ? `Next in ${best.mod.path_id} — unlocks: ${best.mod.capabilities_unlocked.join(", ")}`
        : `Requires: ${best.missing.join(", ")}`,
      prereqs_met: best.missing.length === 0,
      missing: best.missing,
    };
  }

  getUnlockedCapabilities(completed: string[]): string[] {
    const caps = new Set<string>();
    for (const p of CAPABILITY_PATHS) {
      for (const m of p.modules) {
        if (completed.includes(m.id)) m.capabilities_unlocked.forEach(c => caps.add(c));
      }
    }
    return [...caps];
  }

  findModulesForCapability(cap: string): CapabilityModule[] {
    const results: CapabilityModule[] = [];
    for (const p of CAPABILITY_PATHS) {
      for (const m of p.modules) {
        if (m.capabilities_unlocked.includes(cap)) results.push(m);
      }
    }
    return results;
  }

  getTotalModules(): number {
    return CAPABILITY_PATHS.reduce((s, p) => s + p.modules.length, 0);
  }
}

export const capabilityPathEngine = new CapabilityPathEngine();
