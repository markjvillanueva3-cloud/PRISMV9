/**
 * SpeedFeedPropagationBridgeEngine — auto-propagates 9-axis SFC results downstream.
 *
 * Problem solved: when the 9-axis orchestrator computes a new speed/feed
 * recommendation, every downstream consumer (post-processors, machine wizards,
 * print-to-program pipelines) must see the new values consistently and without
 * re-running the calc independently. This engine is the canonical bridge.
 *
 * Architecture:
 *   1. Versioned snapshot store — keyed by `(machine.name, material.name,
 *      tooling.tool_diameter_mm)`. Bumps version on each publish.
 *   2. Five domain bridges that translate a NineAxisResult into the parameter
 *      shape each consumer expects:
 *       - Post-processor (feed/speed override block per cycle type)
 *       - Mill wizard (form defaults: Vc, fz, ap, ae, coolant, holder)
 *       - Lathe wizard (Vc, fn, ap, insert, chip-breaker recommendation)
 *       - Wire EDM wizard (parameter-pack-only — sparks not SFC)
 *       - Print-to-program pipeline (full 9-axis snapshot for stage consumption)
 *   3. Publishes to the existing `sfcOutcomeWire` bus so the SFC-AI ladder's
 *      calibration sink + every existing subscriber sees the new emission.
 *
 * This engine intentionally has NO physics. It is a pure translation/
 * propagation layer. All physics lives in `SpeedFeedNineAxisOrchestratorEngine`
 * (which composes `UltimateSpeedFeedEngine` which sources constants from
 * `src/physics/constants.ts`).
 *
 * @module engines/SpeedFeedPropagationBridgeEngine
 * @milestone OSCAR-SFC-9AXIS-MS0/U-OSC9-03
 * @author oscar (slot:oscar, 2026-05-25)
 */

import type {
  NineAxisInput,
  NineAxisResult,
  OptimizationMode,
} from "./SpeedFeedNineAxisOrchestratorEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export type PropagationDomain =
  | "post_processor"
  | "mill_wizard"
  | "lathe_wizard"
  | "wedm_wizard"
  | "print_to_program";

/** Snapshot key — a propagation cell. */
export interface SnapshotKey {
  machine_name: string;
  material_name: string;
  tool_diameter_mm: number;
}

/** Versioned snapshot record stored in the bridge cache. */
export interface SnapshotRecord {
  key: SnapshotKey;
  /** Monotonic version — bumps on every publish for this key. */
  version: number;
  /** Wall-clock timestamp (ISO 8601). */
  published_at: string;
  /** The orchestrator output that was published. */
  result: NineAxisResult;
  /** Mode the snapshot was computed in. */
  mode: OptimizationMode;
}

// ──── Domain-specific output shapes ────────────────────────────────────────

/** Post-processor parameter pack — drives feed/speed override blocks. */
export interface PostProcessorParameterPack {
  snapshot_version: number;
  spindle_rpm: number;
  feed_rate_mmmin: number;
  feed_per_tooth_mm: number;
  feed_per_rev_mm: number;
  axial_depth_mm: number;
  radial_depth_mm: number;
  cutting_speed_mpm: number;
  coolant_code: string;            // M07/M08/M09 ISO standard
  spindle_direction: "M03" | "M04"; // forward/reverse
  /** Cycle-specific feed multipliers per operation (override block source) */
  cycle_overrides: {
    roughing: { rpm: number; feed: number };
    semi_finishing: { rpm: number; feed: number };
    finishing: { rpm: number; feed: number };
  };
  /** Safety RPM ceiling per ISO 1940 balance class derate */
  max_safe_rpm: number;
  /** Recommended SSV (spindle speed variation) for chatter suppression */
  ssv_enabled: boolean;
  ssv_amplitude_pct?: number;
  ssv_frequency_hz?: number;
}

/** Mill wizard form-default pack. */
export interface MillWizardDefaults {
  snapshot_version: number;
  cutting_speed_mpm: number;
  spindle_rpm: number;
  feed_per_tooth_mm: number;
  feed_rate_mmmin: number;
  axial_depth_mm: number;
  radial_depth_mm: number;
  radial_depth_pct: number;
  recommended_coolant_type: string;
  recommended_holder_type: string;
  recommended_balance_class: string;
  recommended_strategy: string;
  mode: OptimizationMode;
  workholding_clamp_force_required_kn: number;
  workholding_feasible: boolean;
  warnings: string[];
}

/** Lathe wizard form-default pack. */
export interface LatheWizardDefaults {
  snapshot_version: number;
  cutting_speed_mpm: number;
  spindle_rpm: number;
  feed_per_rev_mm: number;
  axial_depth_mm: number;
  insert_recommendation: string;          // "ISO P-grade, CNMG, GC4225"
  chip_breaker_recommendation: string;    // "MM medium-chip"
  coolant_recommendation: string;
  mode: OptimizationMode;
  /** Bar-stock vibration risk flag (if L/D > 4 on overhang) */
  bar_vibration_warning?: string;
  warnings: string[];
}

/** Wire EDM wizard — not SFC physics; parameter-pack-only pass-through. */
export interface WedmWizardDefaults {
  snapshot_version: number;
  /** Wire EDM uses spark erosion not chip removal. Surfaced as a hint only. */
  note: string;
  applicable: false;
  /** Companion field — operator should use prism_wedm dispatcher actions */
  use_dispatcher_actions: string[];
}

/** Print-to-program 18-stage pipeline parameter pack — full snapshot. */
export interface PrintToProgramParameterPack {
  snapshot_version: number;
  /** Full 9-axis result preserved for downstream stages */
  result: NineAxisResult;
  /** Stage-routed feeds + speeds for the 18-stage canonical pipeline */
  stage_overrides: {
    /** Stage 4: stock-removal planning */
    rough_strategy: { rpm: number; feed: number; ap: number; ae: number };
    /** Stage 8: semi-finish operations */
    semi_finish_strategy: { rpm: number; feed: number; ap: number; ae: number };
    /** Stage 12: finishing passes */
    finish_strategy: { rpm: number; feed: number; ap: number; ae: number };
    /** Stage 15: drilling operations (if applicable) */
    drilling_strategy?: { rpm: number; feed_per_rev: number };
  };
  /** Cost estimate per part — null if part_volume_cm3 not provided */
  cost_per_part_usd: number | null;
  /** Cycle time per part — null if part_volume_cm3 not provided */
  cycle_time_min: number | null;
  /** Tool life expectation — drives tool-magazine planning */
  tool_life_min: number;
  mrr_cm3min: number;
  warnings: string[];
}

// ──── Subscription event shape ─────────────────────────────────────────────

export interface PropagationEvent {
  domain: PropagationDomain;
  snapshot: SnapshotRecord;
}

export type PropagationSubscriber = (event: PropagationEvent) => void;

// ============================================================================
// ENGINE
// ============================================================================

const SNAPSHOT_KEY_DELIMITER = "::";
const COOLANT_TO_GCODE: Record<string, string> = {
  flood: "M08",
  mist: "M07",
  mql: "M07",
  air_blast: "M07",
  dry: "M09",
  through_tool: "M08",
  cryogenic: "M08",
};

export class SpeedFeedPropagationBridgeEngine {
  private snapshots = new Map<string, SnapshotRecord>();
  private subscribers = new Map<PropagationDomain, Set<PropagationSubscriber>>();
  private versionCounters = new Map<string, number>();

  /**
   * Publish a new 9-axis result to all subscribers. Bumps version for the
   * `(machine, material, tool_dia)` cell and broadcasts to every subscribed
   * domain.
   *
   * Called automatically from `SpeedFeedNineAxisOrchestratorEngine.run()` —
   * downstream consumers receive the new snapshot without an explicit re-fetch.
   */
  publish(input: NineAxisInput, result: NineAxisResult): SnapshotRecord {
    const key: SnapshotKey = {
      machine_name: input.machine?.name ?? "default_3axis_vmc",
      material_name: input.material.name,
      tool_diameter_mm: input.tooling.tool_diameter_mm,
    };
    const keyStr = this.keyToString(key);

    const previousVersion = this.versionCounters.get(keyStr) ?? 0;
    const newVersion = previousVersion + 1;
    this.versionCounters.set(keyStr, newVersion);

    const snapshot: SnapshotRecord = {
      key,
      version: newVersion,
      published_at: new Date().toISOString(),
      result,
      mode: result.mode,
    };
    this.snapshots.set(keyStr, snapshot);

    // Broadcast to every domain that has a subscriber
    for (const [domain, subs] of this.subscribers.entries()) {
      const event: PropagationEvent = { domain, snapshot };
      for (const sub of subs) {
        try {
          sub(event);
        } catch (_err) {
          // Subscriber errors must not propagate — propagation is best-effort
        }
      }
    }

    return snapshot;
  }

  /** Subscribe to propagation events for a specific domain. Returns an unsubscribe function. */
  subscribe(domain: PropagationDomain, callback: PropagationSubscriber): () => void {
    let set = this.subscribers.get(domain);
    if (!set) {
      set = new Set();
      this.subscribers.set(domain, set);
    }
    set.add(callback);
    return () => {
      set!.delete(callback);
    };
  }

  /** Get the current snapshot for a key, or undefined if never published. */
  getCurrent(key: SnapshotKey): SnapshotRecord | undefined {
    return this.snapshots.get(this.keyToString(key));
  }

  /** List all known snapshot keys with their current version. */
  listSnapshots(): Array<{ key: SnapshotKey; version: number; published_at: string }> {
    return Array.from(this.snapshots.values()).map(s => ({
      key: s.key,
      version: s.version,
      published_at: s.published_at,
    }));
  }

  /** Count of active subscribers per domain. */
  subscriberCount(domain: PropagationDomain): number {
    return this.subscribers.get(domain)?.size ?? 0;
  }

  // ──── Domain bridges ───────────────────────────────────────────────────

  /**
   * Translate a snapshot into a post-processor parameter pack.
   * Surfaces cycle overrides + coolant G-code + SSV recommendation.
   */
  bridgeToPostProcessor(snapshot: SnapshotRecord): PostProcessorParameterPack {
    const r = snapshot.result;
    const rec = r.recommendation;

    const coolantCode = COOLANT_TO_GCODE[r.resolved_axes.coolant.type!] ?? "M08";

    // SSV from the canonical SFC engine result
    const ssv = r.sfc.ssv_recommendation;

    // Cycle overrides — derived by scaling the base recommendation by the
    // SFC engine's alternative bands. Roughing uses the aggressive band,
    // finishing uses the conservative band. This mirrors how shop operators
    // typically program feeds/speeds for multi-pass strategies.
    const conservative = r.sfc.alternatives.conservative;
    const balanced = r.sfc.alternatives.balanced;
    const aggressive = r.sfc.alternatives.aggressive;
    const baseRpm = rec.spindle_rpm;
    const rpmScale = (vc: number) => (vc / Math.max(rec.cutting_speed_mpm, 1)) * baseRpm;
    const feedScale = (vc: number) => (vc / Math.max(rec.cutting_speed_mpm, 1)) * rec.feed_rate_mmmin;

    return {
      snapshot_version: snapshot.version,
      spindle_rpm: rec.spindle_rpm,
      feed_rate_mmmin: rec.feed_rate_mmmin,
      feed_per_tooth_mm: rec.feed_per_tooth_mm,
      feed_per_rev_mm: r.sfc.feed_per_rev.value,
      axial_depth_mm: rec.axial_depth_mm,
      radial_depth_mm: rec.radial_depth_mm,
      cutting_speed_mpm: rec.cutting_speed_mpm,
      coolant_code: coolantCode,
      spindle_direction: "M03",
      cycle_overrides: {
        roughing: { rpm: Math.round(rpmScale(aggressive.vc)), feed: Math.round(feedScale(aggressive.vc)) },
        semi_finishing: { rpm: Math.round(rpmScale(balanced.vc)), feed: Math.round(feedScale(balanced.vc)) },
        finishing: { rpm: Math.round(rpmScale(conservative.vc)), feed: Math.round(feedScale(conservative.vc)) },
      },
      max_safe_rpm: r.spindle_tuning.derated_safe_rpm,
      ssv_enabled: ssv?.enabled ?? false,
      ssv_amplitude_pct: ssv?.amplitude_pct,
      ssv_frequency_hz: ssv?.variation_hz,
    };
  }

  /** Translate a snapshot into mill-wizard form defaults. */
  bridgeToMillWizard(snapshot: SnapshotRecord): MillWizardDefaults {
    const r = snapshot.result;
    const rec = r.recommendation;
    return {
      snapshot_version: snapshot.version,
      cutting_speed_mpm: rec.cutting_speed_mpm,
      spindle_rpm: rec.spindle_rpm,
      feed_per_tooth_mm: rec.feed_per_tooth_mm,
      feed_rate_mmmin: rec.feed_rate_mmmin,
      axial_depth_mm: rec.axial_depth_mm,
      radial_depth_mm: rec.radial_depth_mm,
      radial_depth_pct: r.resolved_axes.toolpath.radial_depth_pct!,
      recommended_coolant_type: r.resolved_axes.coolant.type!,
      recommended_holder_type: r.resolved_axes.tool_holder.type!,
      recommended_balance_class: r.spindle_tuning.required_balance_class,
      recommended_strategy: r.resolved_axes.toolpath.strategy!,
      mode: snapshot.mode,
      workholding_clamp_force_required_kn: r.workholding_check.required_clamp_force_kn,
      workholding_feasible: r.workholding_check.feasible,
      warnings: r.warnings,
    };
  }

  /** Translate a snapshot into lathe-wizard form defaults. */
  bridgeToLatheWizard(snapshot: SnapshotRecord): LatheWizardDefaults {
    const r = snapshot.result;
    const rec = r.recommendation;
    const isoGroup = r.sfc.resolved.iso_group;

    // Insert + chip-breaker recommendation per ISO group
    const insertReco = this.lookupLatheInsertRecommendation(isoGroup);
    const chipBreakerReco = this.lookupChipBreakerRecommendation(isoGroup, snapshot.mode);

    // Bar-stock vibration check — if stickout / diameter > 4, flag
    const stickout = r.resolved_axes.tooling.stickout_mm ?? r.resolved_axes.tooling.tool_diameter_mm * 3;
    const ldRatio = stickout / r.resolved_axes.tooling.tool_diameter_mm;
    const barVibration = ldRatio > 4
      ? `Stickout L/D ratio ${ldRatio.toFixed(1)} > 4 — bar vibration risk; reduce stickout or add bar puller / steady rest`
      : undefined;

    return {
      snapshot_version: snapshot.version,
      cutting_speed_mpm: rec.cutting_speed_mpm,
      spindle_rpm: rec.spindle_rpm,
      feed_per_rev_mm: r.sfc.feed_per_rev.value,
      axial_depth_mm: rec.axial_depth_mm,
      insert_recommendation: insertReco,
      chip_breaker_recommendation: chipBreakerReco,
      coolant_recommendation: r.resolved_axes.coolant.type!,
      mode: snapshot.mode,
      bar_vibration_warning: barVibration,
      warnings: r.warnings,
    };
  }

  /**
   * Wire EDM wizard bridge — wire-EDM is spark erosion, not chip removal.
   * Returns a pass-through hint pointing the operator at the right dispatcher.
   */
  bridgeToWedmWizard(snapshot: SnapshotRecord): WedmWizardDefaults {
    return {
      snapshot_version: snapshot.version,
      note: "Wire EDM uses spark-erosion physics — not chip-removal SFC. Use prism_wedm dispatcher actions for cut parameters.",
      applicable: false,
      use_dispatcher_actions: [
        "prism_wedm:wire_edm_parameter_compute",
        "prism_wedm:wire_edm_strategy_select",
        "prism_wedm:wire_edm_post_generate",
      ],
    };
  }

  /** Translate a snapshot into the print-to-program 18-stage parameter pack. */
  bridgeToPrintToProgram(snapshot: SnapshotRecord): PrintToProgramParameterPack {
    const r = snapshot.result;
    const rec = r.recommendation;

    const conservative = r.sfc.alternatives.conservative;
    const balanced = r.sfc.alternatives.balanced;
    const aggressive = r.sfc.alternatives.aggressive;
    const baseRpm = rec.spindle_rpm;
    const baseFeed = rec.feed_rate_mmmin;
    const baseVc = Math.max(rec.cutting_speed_mpm, 1);

    const rpmFor = (vc: number) => Math.round((vc / baseVc) * baseRpm);
    const feedFor = (vc: number) => Math.round((vc / baseVc) * baseFeed);

    const stageOverrides: PrintToProgramParameterPack["stage_overrides"] = {
      rough_strategy: {
        rpm: rpmFor(aggressive.vc),
        feed: feedFor(aggressive.vc),
        ap: aggressive.ap,
        ae: (aggressive.ae_pct / 100) * r.resolved_axes.tooling.tool_diameter_mm,
      },
      semi_finish_strategy: {
        rpm: rpmFor(balanced.vc),
        feed: feedFor(balanced.vc),
        ap: balanced.ap,
        ae: (balanced.ae_pct / 100) * r.resolved_axes.tooling.tool_diameter_mm,
      },
      finish_strategy: {
        rpm: rpmFor(conservative.vc),
        feed: feedFor(conservative.vc),
        ap: conservative.ap,
        ae: (conservative.ae_pct / 100) * r.resolved_axes.tooling.tool_diameter_mm,
      },
    };

    // Drilling stage only if op is drilling
    if (r.resolved_axes.toolpath.operation === "drilling") {
      stageOverrides.drilling_strategy = {
        rpm: rec.spindle_rpm,
        feed_per_rev: r.sfc.feed_per_rev.value,
      };
    }

    return {
      snapshot_version: snapshot.version,
      result: r,
      stage_overrides: stageOverrides,
      cost_per_part_usd: rec.cost_per_part_usd,
      cycle_time_min: rec.cycle_time_min,
      tool_life_min: rec.tool_life_min,
      mrr_cm3min: rec.mrr_cm3min,
      warnings: r.warnings,
    };
  }

  /**
   * One-call propagation — publishes the snapshot and returns all domain
   * bridges so the caller can hand off to every consumer at once.
   * Convenience for the orchestrator's auto-emit path.
   */
  propagateAll(input: NineAxisInput, result: NineAxisResult): {
    snapshot: SnapshotRecord;
    post_processor: PostProcessorParameterPack;
    mill_wizard: MillWizardDefaults;
    lathe_wizard: LatheWizardDefaults;
    wedm_wizard: WedmWizardDefaults;
    print_to_program: PrintToProgramParameterPack;
  } {
    const snapshot = this.publish(input, result);
    return {
      snapshot,
      post_processor: this.bridgeToPostProcessor(snapshot),
      mill_wizard: this.bridgeToMillWizard(snapshot),
      lathe_wizard: this.bridgeToLatheWizard(snapshot),
      wedm_wizard: this.bridgeToWedmWizard(snapshot),
      print_to_program: this.bridgeToPrintToProgram(snapshot),
    };
  }

  /** Clear all snapshots — used in tests to isolate state between cases. */
  clear(): void {
    this.snapshots.clear();
    this.subscribers.clear();
    this.versionCounters.clear();
  }

  // ──── Helpers ─────────────────────────────────────────────────────────

  private keyToString(key: SnapshotKey): string {
    return [key.machine_name, key.material_name, key.tool_diameter_mm.toFixed(2)].join(SNAPSHOT_KEY_DELIMITER);
  }

  /**
   * Lathe insert recommendation by ISO group. Source: Sandvik Coromant
   * Turn Tool Selector Guide 2024, Kennametal Master Catalog turning grade tables.
   */
  private lookupLatheInsertRecommendation(iso: string): string {
    const RECO: Record<string, string> = {
      P: "ISO P25 carbide, CNMG-MM medium-chip, GC4225 (Sandvik) or KCP25 (Kennametal)",
      M: "ISO M25 carbide, CNMG-MM, GC2025 (Sandvik) or KCM25 (Kennametal) — stainless-optimized",
      K: "ISO K20 carbide, CNMG-KR, GC3215 (Sandvik) or KCK20 (Kennametal) — cast iron",
      N: "ISO N25 carbide polished, DCMT-AL, GC1105 (Sandvik) — aluminum non-ferrous",
      S: "ISO S25 carbide, CNMG-MS, GC1105 (Sandvik) or KCSM25 (Kennametal) — titanium / heat-resist alloy",
      H: "ISO H25 CBN or carbide, CNGA-CB7015 (Sandvik) — hardened steel HRC 45+",
    };
    return RECO[iso] ?? RECO.P!;
  }

  /**
   * Chip-breaker recommendation by ISO group + mode. Aggressive modes use
   * heavier breakers; finishing uses fine breakers.
   */
  private lookupChipBreakerRecommendation(iso: string, mode: OptimizationMode): string {
    if (mode === "aggressive_rush") {
      const HEAVY: Record<string, string> = {
        P: "MR heavy-roughing chip-breaker",
        M: "MM medium-chip — stainless work-hardens",
        K: "KR rough — cast iron tolerates heavy breakers",
        N: "AL polished, no breaker — aluminum chips evacuate freely",
        S: "MS medium-soft — titanium fragile",
        H: "CB hard-finish breaker — very fine cut",
      };
      return HEAVY[iso] ?? HEAVY.P!;
    }
    const STANDARD: Record<string, string> = {
      P: "MM medium-chip breaker",
      M: "MM medium-chip — verify chip-control on hardened lots",
      K: "KM medium — verify on graphitic / nodular variations",
      N: "AL or PL polished — minimize BUE",
      S: "MS medium-soft chip-breaker",
      H: "CB carbide hard finishing — light passes only",
    };
    return STANDARD[iso] ?? STANDARD.P!;
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

export const speedFeedPropagationBridgeEngine = new SpeedFeedPropagationBridgeEngine();
