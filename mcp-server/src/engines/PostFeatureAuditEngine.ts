/**
 * PostFeatureAuditEngine — codifies the 23-feature audit from
 * `state/shared/specs/HURCO-VM30i-V8.9-vs-V11-COMPARE-2026-05-25.md` as
 * a callable engine. Reads a .cps post-processor file from disk, counts
 * substring occurrences of known Hurco / PRISM-Enhanced advanced-feature
 * markers, and returns a structured FeaturePresenceReport with:
 *
 *   - presence (count > 0)
 *   - bridge action recommendation (per the spec §5)
 *   - PRISM engine that owns the underlying calculation
 *
 * This is the brand-agnostic substring scan — it works on Mastercam .pst,
 * hyperMILL .cnc, ESPRIT .est, etc. as well, because the FEATURE_TABLE is
 * keyed on substring patterns shared across the Hurco / Fanuc / Heidenhain
 * idiom universe. Brand-specific overlays are a follow-up.
 *
 * Wired to prism_cam dispatcher as `cam_post_feature_audit` so the audit
 * becomes a PSN Engines-leg + system-viz node, not just a markdown spec.
 *
 * Authored 2026-05-25 (slot:echo /goal post-fleet iter11).
 */

import { existsSync, readFileSync, statSync } from "node:fs";

// ── Feature table (23 features per HURCO-VM30i compare spec §4) ──────────────
//
// Each entry is keyed on a substring pattern that appears literally in the
// .cps source when the feature is in use. Brand-agnostic where possible
// (G05.3 appears in Hurco + Fanuc HPCC; G64 appears in Fanuc + Heidenhain;
// prism* properties are PRISM-specific).
//
// `bridgeAction` is the recommended next step when the feature is MISSING:
//   - "shipped"  — feature is present and considered complete; no action
//   - "wire"     — engine exists but emission branch not wired into .cps
//   - "restore"  — feature regressed (present in earlier version, lost in current)
//   - "verify"   — semantic equivalence with a renamed property needs check
//   - "engine"   — underlying PRISM engine still needs work

export type BridgeAction = "shipped" | "wire" | "restore" | "verify" | "engine";

export interface FeatureSpec {
  /** Slug for cross-referencing — kebab-case stable id. */
  id: string;
  /** Human-friendly description. */
  title: string;
  /** Literal substring searched in the .cps source. Case-sensitive. */
  pattern: string;
  /** Which PRISM engine owns the underlying calculation (informational). */
  engine?: string;
  /** Recommended bridge action when feature is ABSENT from the post. */
  bridgeActionWhenAbsent: BridgeAction;
  /** Optional: brand restriction (omit = brand-agnostic). */
  brandRestriction?: string[];
}

export const FEATURE_TABLE: ReadonlyArray<FeatureSpec> = [
  // Hurco-native G/M codes (some shared with Fanuc dialect)
  { id: "g053-smoothing", title: "G05.3 surface-smoothing (Hurco / Fanuc HPCC)", pattern: "G05.3", engine: "HSMSurfaceModeEngine", bridgeActionWhenAbsent: "wire" },
  { id: "g64-contour", title: "G64 contour-mode look-ahead", pattern: "G64", engine: "ContourToleranceEngine", bridgeActionWhenAbsent: "wire" },
  { id: "g131-polar", title: "G131 polar interpolation (mill-side)", pattern: "G131", engine: "PolarInterpolationEngine", bridgeActionWhenAbsent: "wire" },
  { id: "g541-ext-wcs", title: "G54.1 P10+ extended work offsets", pattern: "G54.1", engine: "WorkOffsetEngine", bridgeActionWhenAbsent: "wire" },
  { id: "g68-tilted", title: "G68.3 tilted-workplane (3+2 fixed rotation)", pattern: "G68.3", engine: "TiltedWorkplaneEngine", bridgeActionWhenAbsent: "wire" },
  { id: "m140-retract", title: "M140 safe Z-retract for tool change", pattern: "M140", engine: "SafeRetractEngine", bridgeActionWhenAbsent: "wire" },
  { id: "m19-orient", title: "M19 spindle orient", pattern: "M19", engine: "SpindleOrientEngine", bridgeActionWhenAbsent: "wire" },
  { id: "g65-macro", title: "G65 user-macro call", pattern: "G65", engine: "MacroCallEngine", bridgeActionWhenAbsent: "wire" },

  // Hurco controller idioms (WinMAX V11 self-identification)
  { id: "winmax-marker", title: "WinMAX controller-id comment", pattern: "WinMAX", bridgeActionWhenAbsent: "restore" },
  { id: "ultimotion", title: "UltiMotion per-op smoothing mode", pattern: "UltiMotion", engine: "ContourToleranceEngine", bridgeActionWhenAbsent: "wire" },
  { id: "lookahead", title: "LookAhead block count knob", pattern: "LookAhead", engine: "ToolpathOptimizationEngine", bridgeActionWhenAbsent: "wire" },

  // CAM-bridge advanced (Mastercam Dynamic / hyperMILL OptiRough analogs)
  { id: "imachining", title: "iMachining / adaptive-feed roughing", pattern: "iMachining", engine: "iMachiningStrategyEngine", bridgeActionWhenAbsent: "wire" },
  { id: "chip-thinning", title: "Chip-thinning radial-engagement compensation", pattern: "chip-thinning", engine: "ChipThinningEngine", bridgeActionWhenAbsent: "wire" },
  { id: "tcp-rtcp", title: "TCP / RTCP 5-axis tool-center control", pattern: "TCP", engine: "FiveAxisTCPEngine", bridgeActionWhenAbsent: "wire" },
  { id: "nurbs-path", title: "NURBS spline-path output", pattern: "NURBS", engine: "NURBSPathEngine", bridgeActionWhenAbsent: "wire" },
  { id: "thermal-comp", title: "Probe-based thermal expansion compensation", pattern: "thermalComp", engine: "ThermalCompensationEngine", bridgeActionWhenAbsent: "wire" },
  { id: "collision-avoid", title: "Collision-avoid macro inserts before rapids", pattern: "collisionAvoid", engine: "CollisionAvoidanceEngine", bridgeActionWhenAbsent: "wire" },

  // PRISM advanced-feature property markers (sale-ready differentiation)
  { id: "prism-tribal", title: "Inline tribal citation per operation", pattern: "prismTribalCitation", engine: "PRISMSelfAwarenessEngine", bridgeActionWhenAbsent: "wire" },
  { id: "prism-ci95", title: "95% confidence-interval comments on Vc/feed", pattern: "prismCI95Comments", engine: "UltimateSpeedFeedEngine", bridgeActionWhenAbsent: "wire" },
  { id: "prism-lookahead", title: "Programmable look-ahead block count", pattern: "prismLookAheadBlocks", engine: "ToolpathOptimizationEngine", bridgeActionWhenAbsent: "wire" },
  { id: "prism-cross-cam", title: "Cross-CAM-system idiom translation", pattern: "prismCrossCAMFeatures", engine: "CrossCAMTranslationEngine", bridgeActionWhenAbsent: "wire" },
  { id: "prism-aggressiveness", title: "Conservative/Standard/Aggressive knob (legacy name)", pattern: "prismAggressivenessLevel", engine: "AutoSpeedFeedEngine", bridgeActionWhenAbsent: "verify" },
  { id: "prism-opt-mode", title: "Optimization-mode selector (modern name)", pattern: "prismOptimizationMode", engine: "AutoSpeedFeedEngine", bridgeActionWhenAbsent: "wire" },
  { id: "prism-machine-rigidity", title: "Machine-rigidity input", pattern: "prismMachineRigidity", engine: "AutoSpeedFeedEngine", bridgeActionWhenAbsent: "wire" },
  { id: "prism-material-group", title: "ISO P/M/K/N/S/H material-group selector", pattern: "prismMaterialGroup", engine: "PhysicsConstantsEngine", bridgeActionWhenAbsent: "wire" },

  // AGI handoff markers
  { id: "prism-agi-handoff", title: "PRISM_AGI master-post handoff marker", pattern: "PRISM_AGI", engine: "MasterPostProcessorUnifiedAGIEngine", bridgeActionWhenAbsent: "engine" },
  { id: "print-to-program", title: "print-to-program AGI-pipeline tag", pattern: "printToProgram", engine: "MasterPostProcessorUnifiedAGIEngine", bridgeActionWhenAbsent: "engine" },

  // Probing
  { id: "probing-wcs", title: "Probing WCS-set routine emission", pattern: "probing", engine: "ProbingEngine", bridgeActionWhenAbsent: "wire" },
] as const;

// ── Types ────────────────────────────────────────────────────────────────────

export interface FeatureFinding {
  id: string;
  title: string;
  pattern: string;
  hits: number;
  present: boolean;
  /** Resulting action: "shipped" if present, else the spec's bridgeActionWhenAbsent. */
  bridgeAction: BridgeAction;
  engine?: string;
}

export interface FeaturePresenceReport {
  /** Absolute path of the audited file. */
  path: string;
  /** File size in bytes. */
  size_bytes: number;
  /** Total feature slots in the table (23 in current spec). */
  total_features: number;
  /** How many of the table's features are present (hits > 0). */
  present_count: number;
  /** Per-feature findings. */
  findings: FeatureFinding[];
  /** Quick lookup: features needing each bridge action. */
  by_action: Record<BridgeAction, FeatureFinding[]>;
  /** Coverage score = present_count / total_features (0..1). */
  coverage: number;
}

export interface CompareReport {
  baseline: FeaturePresenceReport;
  candidate: FeaturePresenceReport;
  regressions: FeatureFinding[];   // present in baseline, absent in candidate
  additions: FeatureFinding[];     // absent in baseline, present in candidate
  unchanged: FeatureFinding[];     // same presence in both
  coverage_delta: number;          // candidate.coverage - baseline.coverage
}

// ── Engine ───────────────────────────────────────────────────────────────────

export class PostFeatureAuditEngine {
  /**
   * Substring count (case-sensitive). Pure, branch-free, no regex —
   * sidesteps the regex-escape minefield for shell-quoting and is the
   * exact algorithm the §3 audit in the compare spec uses.
   */
  private countSubstring(src: string, needle: string): number {
    if (needle.length === 0) return 0;
    let count = 0;
    let i = 0;
    for (;;) {
      const next = src.indexOf(needle, i);
      if (next === -1) return count;
      count++;
      i = next + needle.length;
    }
  }

  /** Run the audit against an already-loaded source string. */
  auditSource(src: string, pathForReport = "<inline>", sizeBytesOverride?: number): FeaturePresenceReport {
    if (typeof src !== "string") {
      throw new Error("PostFeatureAuditEngine.auditSource: src must be a string");
    }
    const findings: FeatureFinding[] = FEATURE_TABLE.map((spec) => {
      const hits = this.countSubstring(src, spec.pattern);
      const present = hits > 0;
      return {
        id: spec.id,
        title: spec.title,
        pattern: spec.pattern,
        hits,
        present,
        bridgeAction: present ? "shipped" : spec.bridgeActionWhenAbsent,
        engine: spec.engine,
      };
    });
    const by_action: Record<BridgeAction, FeatureFinding[]> = {
      shipped: [], wire: [], restore: [], verify: [], engine: [],
    };
    for (const f of findings) by_action[f.bridgeAction].push(f);
    const present_count = findings.filter((f) => f.present).length;
    return {
      path: pathForReport,
      size_bytes: sizeBytesOverride ?? Buffer.byteLength(src, "utf8"),
      total_features: FEATURE_TABLE.length,
      present_count,
      findings,
      by_action,
      coverage: present_count / FEATURE_TABLE.length,
    };
  }

  /** Read .cps from disk and audit. Throws on missing file. */
  auditFile(path: string): FeaturePresenceReport {
    if (typeof path !== "string" || path.length === 0) {
      throw new Error("PostFeatureAuditEngine.auditFile: path must be a non-empty string");
    }
    if (!existsSync(path)) {
      throw new Error(`PostFeatureAuditEngine.auditFile: file not found: ${path}`);
    }
    const stat = statSync(path);
    if (!stat.isFile()) {
      throw new Error(`PostFeatureAuditEngine.auditFile: not a regular file: ${path}`);
    }
    const src = readFileSync(path, "utf8");
    return this.auditSource(src, path, stat.size);
  }

  /**
   * Compare two posts (e.g. v8.9 baseline vs v11 candidate) and surface
   * regressions, additions, and coverage delta.
   */
  compareFiles(baselinePath: string, candidatePath: string): CompareReport {
    const baseline = this.auditFile(baselinePath);
    const candidate = this.auditFile(candidatePath);
    const byId = new Map(candidate.findings.map((f) => [f.id, f]));
    const regressions: FeatureFinding[] = [];
    const additions: FeatureFinding[] = [];
    const unchanged: FeatureFinding[] = [];
    for (const b of baseline.findings) {
      const c = byId.get(b.id);
      if (!c) continue;
      if (b.present && !c.present) regressions.push(c);
      else if (!b.present && c.present) additions.push(c);
      else unchanged.push(c);
    }
    return {
      baseline,
      candidate,
      regressions,
      additions,
      unchanged,
      coverage_delta: candidate.coverage - baseline.coverage,
    };
  }
}

export const postFeatureAuditEngine = new PostFeatureAuditEngine();
