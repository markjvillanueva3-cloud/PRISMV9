/**
 * UtilizationContractEngine — MXU-MS0A + MXU-MS0
 *
 * Maps every PRISM capability through its full discovery chain:
 *   Engine → Dispatcher → Action → Skill → UI Surface
 *
 * Identifies unreachable capabilities — engines that exist but have
 * no user-facing path to invoke them.
 *
 * The "utilization contract" states: every engine MUST have at least
 * one dispatcher action that exposes it. Engines without actions are
 * "dark" — built but invisible to users.
 *
 * Sources:
 *   - MXU-MS0A: Utilization Contract Hardening
 *   - MXU-MS0: Capability Census + Activation Matrix
 *   - ENGINE_DIGEST.md, DISPATCHER_DIGEST.md for static analysis
 */

// ============================================================================
// TYPES
// ============================================================================

export type WiringLevel = "full" | "partial" | "dark" | "internal";

export interface EngineCapability {
  engine_name: string;
  file_path: string;
  domain: string;
  dispatcher_actions: string[];
  skills: string[];
  wiring_level: WiringLevel;
  has_tests: boolean;
}

export interface DispatcherMapping {
  dispatcher_name: string;
  tool_name: string;
  action_count: number;
  actions: string[];
  engines_referenced: string[];
}

export interface ActivationGap {
  engine_name: string;
  gap_type: "no_dispatcher" | "no_skill" | "no_ui" | "no_tests";
  severity: "critical" | "high" | "medium" | "low";
  recommendation: string;
}

export interface UtilizationReport {
  timestamp: string;
  total_engines: number;
  total_dispatchers: number;
  total_actions: number;
  total_skills: number;
  wiring_summary: {
    full: number;       // engine→dispatcher→action→skill
    partial: number;    // engine→dispatcher→action (no skill)
    dark: number;       // engine exists, no dispatcher path
    internal: number;   // engine is utility/helper, not user-facing
  };
  utilization_pct: number; // (full + partial) / (total - internal) * 100
  gaps: ActivationGap[];
  top_dark_engines: string[];
  domain_breakdown: DomainUtilization[];
}

export interface DomainUtilization {
  domain: string;
  total_engines: number;
  wired_engines: number;
  utilization_pct: number;
}

export interface CapabilityCensus {
  engines: EngineCapability[];
  dispatchers: DispatcherMapping[];
  report: UtilizationReport;
}

// ============================================================================
// DOMAIN CLASSIFICATION
// ============================================================================

const DOMAIN_PATTERNS: [RegExp, string][] = [
  [/SpeedFeed|Kienzle|Taylor|Force|Temperature|Chatter|Deflection|Thermal|Wear|SurfaceFinish|Physics|Vibration/i, "physics"],
  [/PostProcessor|PPP|Dialect|Controller|GCode/i, "post_processor"],
  [/EDM|Wire.*EDM|WEDM|Spark|Dielectric/i, "edm"],
  [/Turning|Lathe|Chuck|Tailstock|BarFeed/i, "turning"],
  [/MultiAxis|5Axis|FiveAxis|RTCP/i, "multi_axis"],
  [/MillTurn|Swiss|SubSpindle/i, "mill_turn"],
  [/Grinding|Wheel|Dress/i, "grinding"],
  [/Laser|Waterjet|Plasma/i, "nontraditional"],
  [/Quote|Cost|Price|OEE|Capacity|Schedule|Business|ERP|Order|Invoice/i, "business"],
  [/Quality|SPC|FAI|Inspect|Metrology|Tolerance/i, "quality"],
  [/HyperMill/i, "hypermill"],
  [/CAD|CAM|Toolpath|Feature|Strategy|Fixture|Setup/i, "cad_cam"],
  [/Material|Alloy|Hardness/i, "materials"],
  [/Tool(?!path)|Cutter|Insert|Drill|Endmill|Magazine/i, "tooling"],
  [/Machine|Spindle|Axis|Envelope|Kinematic/i, "machine"],
  [/Knowledge|Learning|Tribal|Playbook|Apprentice/i, "knowledge"],
  [/Memory|Context|Session|Telemetry|Log/i, "infrastructure"],
  [/AutoWir|AutoForge|AutoTest|AutoSchema|AutoFix|SelfImprove|Build.*Guard|Chain.*Failure|Census|Blueprint/i, "dev_tools"],
  [/Automation|Classify|Router|Autopilot/i, "automation"],
  [/Safety|Omega|Guard|Validate/i, "safety"],
];

/** Engines that are internal utilities, not user-facing */
const INTERNAL_PATTERNS = [
  /^index$/,
  /Helper$/,
  /Util$/,
  /Internal$/,
  /Bridge$/,
  /Adapter$/,
  /Wrapper$/,
  /^types$/,
  /Middleware$/,
];

// ============================================================================
// ENGINE
// ============================================================================

export class UtilizationContractEngine {

  // ── Domain Classification ──────────────────────────────────

  /**
   * Classify an engine into a domain based on its name.
   */
  classifyDomain(engineName: string): string {
    for (const [pattern, domain] of DOMAIN_PATTERNS) {
      if (pattern.test(engineName)) {
        return domain;
      }
    }
    return "general";
  }

  /**
   * Check if an engine is an internal utility (not user-facing).
   */
  isInternal(engineName: string): boolean {
    return INTERNAL_PATTERNS.some(p => p.test(engineName));
  }

  // ── Capability Mapping ─────────────────────────────────────

  /**
   * Map engines to their capabilities given known dispatcher mappings.
   *
   * @param engineNames List of engine names (from file system scan)
   * @param dispatcherActions Map of dispatcher→actions→engine references
   * @param skillNames List of known skill names
   * @param testFiles List of test file names
   * @returns Full capability mapping for each engine
   */
  mapCapabilities(
    engineNames: string[],
    dispatcherActions: Map<string, string[]>,
    skillNames: string[],
    testFiles: string[],
  ): EngineCapability[] {
    const capabilities: EngineCapability[] = [];

    // Build reverse index: engine name → which dispatcher actions reference it
    const engineToActions = new Map<string, string[]>();
    for (const [action, engines] of dispatcherActions) {
      for (const eng of engines) {
        const existing = engineToActions.get(eng) || [];
        existing.push(action);
        engineToActions.set(eng, existing);
      }
    }

    // Build skill index (loose match)
    const skillIndex = new Set(skillNames.map(s => s.toLowerCase()));

    for (const name of engineNames) {
      const baseName = name.replace(/Engine$/, "").replace(/\.ts$/, "");
      const actions = engineToActions.get(name) || engineToActions.get(baseName) || [];

      // Check for matching skills (loose name match)
      const nameWords = baseName.replace(/([A-Z])/g, " $1").trim().toLowerCase().split(/\s+/);
      const matchingSkills = skillNames.filter(skill => {
        const skillLower = skill.toLowerCase().replace(/-/g, " ");
        return nameWords.some(w => w.length > 3 && skillLower.includes(w));
      });

      // Check for tests
      const hasTests = testFiles.some(t => {
        const tLower = t.toLowerCase();
        return tLower.includes(baseName.toLowerCase()) ||
          nameWords.some(w => w.length > 4 && tLower.includes(w));
      });

      const isInternal = this.isInternal(baseName);

      let wiringLevel: WiringLevel;
      if (isInternal) {
        wiringLevel = "internal";
      } else if (actions.length > 0 && matchingSkills.length > 0) {
        wiringLevel = "full";
      } else if (actions.length > 0) {
        wiringLevel = "partial";
      } else {
        wiringLevel = "dark";
      }

      capabilities.push({
        engine_name: name,
        file_path: `src/engines/${name}.ts`,
        domain: this.classifyDomain(name),
        dispatcher_actions: actions,
        skills: matchingSkills,
        wiring_level: wiringLevel,
        has_tests: hasTests,
      });
    }

    return capabilities;
  }

  // ── Gap Analysis ───────────────────────────────────────────

  /**
   * Identify activation gaps from capability mappings.
   */
  findGaps(capabilities: EngineCapability[]): ActivationGap[] {
    const gaps: ActivationGap[] = [];

    for (const cap of capabilities) {
      if (cap.wiring_level === "internal") continue;

      if (cap.wiring_level === "dark") {
        gaps.push({
          engine_name: cap.engine_name,
          gap_type: "no_dispatcher",
          severity: cap.domain === "physics" || cap.domain === "safety" ? "critical" : "high",
          recommendation: `Wire ${cap.engine_name} to a dispatcher action`,
        });
      }

      if (cap.wiring_level === "partial") {
        gaps.push({
          engine_name: cap.engine_name,
          gap_type: "no_skill",
          severity: "medium",
          recommendation: `Create a skill or CLI command exposing ${cap.engine_name}`,
        });
      }

      if (!cap.has_tests && cap.wiring_level !== "dark") {
        gaps.push({
          engine_name: cap.engine_name,
          gap_type: "no_tests",
          severity: "medium",
          recommendation: `Write tests for ${cap.engine_name}`,
        });
      }
    }

    return gaps.sort((a, b) => {
      const sevOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return sevOrder[a.severity] - sevOrder[b.severity];
    });
  }

  // ── Utilization Report ─────────────────────────────────────

  /**
   * Generate the full utilization report.
   */
  generateReport(
    capabilities: EngineCapability[],
    dispatcherCount: number,
    totalActions: number,
    totalSkills: number,
  ): UtilizationReport {
    const gaps = this.findGaps(capabilities);

    const summary = { full: 0, partial: 0, dark: 0, internal: 0 };
    for (const cap of capabilities) {
      summary[cap.wiring_level]++;
    }

    const userFacing = capabilities.length - summary.internal;
    const utilization = userFacing > 0
      ? parseFloat(((summary.full + summary.partial) / userFacing * 100).toFixed(1))
      : 0;

    // Domain breakdown
    const domainMap = new Map<string, { total: number; wired: number }>();
    for (const cap of capabilities) {
      if (cap.wiring_level === "internal") continue;
      const existing = domainMap.get(cap.domain) || { total: 0, wired: 0 };
      existing.total++;
      if (cap.wiring_level === "full" || cap.wiring_level === "partial") {
        existing.wired++;
      }
      domainMap.set(cap.domain, existing);
    }

    const domainBreakdown: DomainUtilization[] = Array.from(domainMap.entries())
      .map(([domain, { total, wired }]) => ({
        domain,
        total_engines: total,
        wired_engines: wired,
        utilization_pct: parseFloat((wired / total * 100).toFixed(1)),
      }))
      .sort((a, b) => a.utilization_pct - b.utilization_pct);

    const topDark = capabilities
      .filter(c => c.wiring_level === "dark")
      .slice(0, 20)
      .map(c => c.engine_name);

    return {
      timestamp: new Date().toISOString(),
      total_engines: capabilities.length,
      total_dispatchers: dispatcherCount,
      total_actions: totalActions,
      total_skills: totalSkills,
      wiring_summary: summary,
      utilization_pct: utilization,
      gaps,
      top_dark_engines: topDark,
      domain_breakdown: domainBreakdown,
    };
  }

  // ── Full Census ────────────────────────────────────────────

  /**
   * Run the full capability census.
   * This is the main entry point — takes raw system data, returns full census.
   *
   * @param engineNames All engine names
   * @param dispatcherActions Map of action→engine references
   * @param skillNames All skill names
   * @param testFiles All test file names
   * @param dispatcherCount Number of dispatchers
   * @param totalActions Total action count
   * @returns Full capability census with report
   */
  runCensus(
    engineNames: string[],
    dispatcherActions: Map<string, string[]>,
    skillNames: string[],
    testFiles: string[],
    dispatcherCount: number,
    totalActions: number,
  ): CapabilityCensus {
    const engines = this.mapCapabilities(engineNames, dispatcherActions, skillNames, testFiles);

    const dispatchers: DispatcherMapping[] = [];
    // Aggregate dispatcher data
    const dispMap = new Map<string, { actions: string[]; engines: Set<string> }>();
    for (const [action, engineRefs] of dispatcherActions) {
      const dispName = action.split(".")[0] || "unknown";
      const existing = dispMap.get(dispName) || { actions: [], engines: new Set() };
      existing.actions.push(action);
      for (const e of engineRefs) existing.engines.add(e);
      dispMap.set(dispName, existing);
    }

    for (const [name, data] of dispMap) {
      dispatchers.push({
        dispatcher_name: name,
        tool_name: `prism_${name}`,
        action_count: data.actions.length,
        actions: data.actions,
        engines_referenced: [...data.engines],
      });
    }

    const report = this.generateReport(engines, dispatcherCount, totalActions, skillNames.length);

    return { engines, dispatchers, report };
  }

  // ── Quick Stats ────────────────────────────────────────────

  /**
   * Get quick utilization stats without full census.
   */
  quickStats(capabilities: EngineCapability[]): {
    total: number;
    full: number;
    partial: number;
    dark: number;
    internal: number;
    utilization_pct: number;
  } {
    const summary = { total: capabilities.length, full: 0, partial: 0, dark: 0, internal: 0 };
    for (const cap of capabilities) {
      summary[cap.wiring_level]++;
    }
    const userFacing = summary.total - summary.internal;
    return {
      ...summary,
      utilization_pct: userFacing > 0
        ? parseFloat(((summary.full + summary.partial) / userFacing * 100).toFixed(1))
        : 0,
    };
  }
}

export const utilizationContractEngine = new UtilizationContractEngine();
