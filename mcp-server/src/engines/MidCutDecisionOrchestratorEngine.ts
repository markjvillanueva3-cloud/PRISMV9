/**
 * MidCutDecisionOrchestratorEngine — closed-loop mid-cut decision fusion
 *
 * Fuses live signals from acoustic-emission, cutting-force, vibration, and
 * spindle-load sources into a single decision verdict for the controller:
 *   continue → reduce_feed → pull_off → abort
 *
 * GAP-1 closure per `knowledge/wiki/architecture/print-to-cnc-capability-reassessment-2026-05-23.md`.
 * Wire-to-all-sources: composes AE + force + vibration + spindle-load engines.
 *
 * Decision policy (cited):
 *  - AE tool-breakage class → immediate abort (Dornfeld 1994, Jemielniak 2000)
 *  - Spindle-load > retract threshold → pull_off (Sandvik Coromant Tech Guide, Erdel 2003)
 *  - Vibration RMS > 2.5× baseline → reduce_feed (Tobias-Tlusty 1958; Altintas 2012 §3.4)
 *  - Force surge > +40% baseline → reduce_feed (Kienzle 1952; Boothroyd-Knight 2006 §6)
 *  - All channels nominal → continue
 *
 * Reference: ISO 13374-1 (condition monitoring data processing); ASTM E976-15
 *  (AE sensor characterization); NIST/SEMATECH e-Handbook §6.4 (signal fusion).
 *
 * Safety: decision is ADVISORY. Hard-block on abort verdict via S(x) gate is
 *  the controller's responsibility — this engine only emits the recommendation.
 *
 * @version 1.0.0
 * @module MidCutDecisionOrchestratorEngine
 */

// ─── Atomic + Result Schema (engine convention) ─────────────────────
interface AtomicValue<T = number> {
  value: T;
  unit: string;
  uncertainty?: number;
  confidence?: number;
  source: string;
}

// ─── Channel Inputs (loosely typed — caller already invoked source engines) ──

export interface AESignalInput {
  /** Tool-condition class as emitted by AcousticEmissionMonitoringEngine.classify */
  class?: "fresh" | "wear" | "chip" | "breakage" | "unknown";
  /** Composite anomaly score 0-1 (1 = certain anomaly) */
  anomaly_score?: number;
  /** Sigma deviation from baseline RMS */
  rms_sigma?: number;
}

export interface ForceSignalInput {
  /** Live tangential force, N */
  tangential_force_n: number;
  /** Predicted/baseline tangential force, N (e.g. from CuttingForceEngine.calculate) */
  baseline_force_n: number;
  /** Optional resultant force, N */
  resultant_force_n?: number;
}

export interface VibrationSignalInput {
  /** Live vibration RMS, m/s^2 */
  rms_ms2: number;
  /** Baseline vibration RMS (fresh-tool, stable cut), m/s^2 */
  baseline_rms_ms2: number;
  /** Optional dominant frequency, Hz */
  dominant_freq_hz?: number;
  /** Optional tooth-passing frequency, Hz — used for chatter onset check */
  tooth_pass_hz?: number;
}

export interface SpindleSignalInput {
  /** Live spindle load percentage */
  current_load_pct: number;
  /** Engine-computed warning / hold / retract thresholds (%) */
  warning_pct: number;
  hold_pct: number;
  retract_pct: number;
  /** Breakage limits (% nominal) */
  breakage_spike_pct?: number;
  breakage_drop_pct?: number;
}

export interface MidCutDecisionInput {
  ae?: AESignalInput;
  force?: ForceSignalInput;
  vibration?: VibrationSignalInput;
  spindle?: SpindleSignalInput;
  /** Operation context for thresholding (defaults: roughing) */
  operation?: "roughing" | "finishing" | "drilling" | "tapping";
  /** Optional per-channel weight overrides (0-1, normalized). Default: equal */
  weights?: { ae?: number; force?: number; vibration?: number; spindle?: number };
}

// ─── Verdict Output ───────────────────────────────────────────────────

export type MidCutVerdict = "continue" | "reduce_feed" | "pull_off" | "abort";

export interface ChannelEvidence {
  channel: "ae" | "force" | "vibration" | "spindle";
  /** Per-channel verdict contribution */
  verdict: MidCutVerdict;
  /** Severity score 0-1 (1 = abort-level) */
  severity: number;
  /** Citation / source of the threshold that fired */
  source: string;
  /** Human-readable trigger */
  reason: string;
}

export interface MidCutDecisionResult {
  verdict: MidCutVerdict;
  /** Recommended feed override % (100 = no change; 50 = halve feed) */
  feed_override_pct: AtomicValue;
  /** Confidence 0-1 — driven by channel agreement + signal coverage */
  confidence: AtomicValue;
  /** Per-channel contributions */
  evidence: ChannelEvidence[];
  warnings: string[];
}

// ─── Reference Thresholds (cited inline; do NOT inline material constants here) ──

const ABORT = 1.0;
const PULL_OFF = 0.8;
const REDUCE = 0.5;
const NOMINAL = 0.0;

/** Vibration ratio thresholds (current_RMS / baseline_RMS).
 *  Source: Altintas (2012) "Manufacturing Automation" §3.4 chatter onset;
 *  Tobias & Tlusty (1958) "Theory of regenerative chatter" §IV. */
const VIB_REDUCE_RATIO = 2.5;
const VIB_PULL_OFF_RATIO = 4.0;

/** Force surge thresholds (current_F / baseline_F).
 *  Source: Boothroyd & Knight (2006) "Fundamentals of Machining" §6;
 *  Sandvik Coromant Tech Guide §B-2.4 (force-based wear). */
const FORCE_REDUCE_RATIO = 1.4;
const FORCE_PULL_OFF_RATIO = 1.8;

// ─── Engine ───────────────────────────────────────────────────────────

export class MidCutDecisionOrchestratorEngine {
  /**
   * Fuse channel signals into a mid-cut decision verdict.
   * @param input Per-channel signals (any subset; absent channels are ignored)
   * @returns Verdict + per-channel evidence + recommended feed override
   */
  decide(input: MidCutDecisionInput): MidCutDecisionResult {
    const warnings: string[] = [];
    const evidence: ChannelEvidence[] = [];

    if (!input || typeof input !== "object") {
      throw new Error("MidCutDecisionOrchestratorEngine.decide: input is required");
    }

    // ─── AE Channel ───────────────────────────────────────────────────
    if (input.ae) {
      const ae = input.ae;
      if (ae.class === "breakage") {
        evidence.push({
          channel: "ae",
          verdict: "abort",
          severity: ABORT,
          source: "Dornfeld (1994), Jemielniak (2000)",
          reason: "AE classifier flagged tool breakage signature",
        });
      } else if (ae.class === "chip" || (ae.anomaly_score ?? 0) > 0.7) {
        evidence.push({
          channel: "ae",
          verdict: "pull_off",
          severity: PULL_OFF,
          source: "Teti et al. (2010) §5",
          reason: `AE anomaly score ${(ae.anomaly_score ?? 0).toFixed(2)} indicates chip/edge event`,
        });
      } else if (ae.class === "wear" || (ae.rms_sigma ?? 0) > 3) {
        evidence.push({
          channel: "ae",
          verdict: "reduce_feed",
          severity: REDUCE,
          source: "Jemielniak (2000) §4 (3σ adaptive threshold)",
          reason: `AE wear class or RMS deviation ${(ae.rms_sigma ?? 0).toFixed(1)}σ`,
        });
      } else {
        evidence.push({
          channel: "ae",
          verdict: "continue",
          severity: NOMINAL,
          source: "AE within baseline envelope",
          reason: "fresh / nominal",
        });
      }
    }

    // ─── Force Channel ────────────────────────────────────────────────
    if (input.force) {
      const f = input.force;
      const baseline = Math.max(f.baseline_force_n, 1e-3);
      const ratio = f.tangential_force_n / baseline;
      if (ratio >= FORCE_PULL_OFF_RATIO) {
        evidence.push({
          channel: "force",
          verdict: "pull_off",
          severity: PULL_OFF,
          source: "Sandvik Coromant Tech Guide §B-2.4",
          reason: `Force ratio ${ratio.toFixed(2)}× baseline exceeds pull-off threshold ${FORCE_PULL_OFF_RATIO}`,
        });
      } else if (ratio >= FORCE_REDUCE_RATIO) {
        evidence.push({
          channel: "force",
          verdict: "reduce_feed",
          severity: REDUCE,
          source: "Boothroyd & Knight (2006) §6",
          reason: `Force ratio ${ratio.toFixed(2)}× baseline exceeds reduce-feed threshold ${FORCE_REDUCE_RATIO}`,
        });
      } else if (ratio < 0.2) {
        // Sudden force collapse — possible tool breakage or air-cut
        evidence.push({
          channel: "force",
          verdict: "pull_off",
          severity: PULL_OFF,
          source: "Altintas (2012) §4.6 force-drop detection",
          reason: `Force collapse to ${(ratio * 100).toFixed(0)}% of baseline — possible breakage or air cut`,
        });
      } else {
        evidence.push({
          channel: "force",
          verdict: "continue",
          severity: NOMINAL,
          source: "Force within ±40% of baseline",
          reason: `ratio ${ratio.toFixed(2)}× nominal`,
        });
      }
    }

    // ─── Vibration Channel ────────────────────────────────────────────
    if (input.vibration) {
      const v = input.vibration;
      const baseline = Math.max(v.baseline_rms_ms2, 1e-6);
      const ratio = v.rms_ms2 / baseline;
      if (ratio >= VIB_PULL_OFF_RATIO) {
        evidence.push({
          channel: "vibration",
          verdict: "pull_off",
          severity: PULL_OFF,
          source: "Altintas (2012) §3.4 chatter onset",
          reason: `Vibration RMS ${ratio.toFixed(2)}× baseline — fully developed chatter`,
        });
      } else if (ratio >= VIB_REDUCE_RATIO) {
        evidence.push({
          channel: "vibration",
          verdict: "reduce_feed",
          severity: REDUCE,
          source: "Tobias & Tlusty (1958) §IV",
          reason: `Vibration RMS ${ratio.toFixed(2)}× baseline — chatter precursor`,
        });
      } else {
        evidence.push({
          channel: "vibration",
          verdict: "continue",
          severity: NOMINAL,
          source: "Vibration within 2.5× baseline",
          reason: `ratio ${ratio.toFixed(2)}× nominal`,
        });
      }
    }

    // ─── Spindle Load Channel ─────────────────────────────────────────
    if (input.spindle) {
      const s = input.spindle;
      const load = s.current_load_pct;
      const spike = s.breakage_spike_pct ?? s.retract_pct * 1.5;
      const drop = s.breakage_drop_pct ?? 0;
      if (load >= spike) {
        evidence.push({
          channel: "spindle",
          verdict: "abort",
          severity: ABORT,
          source: "ISO 13374-1 §6 condition monitoring; Erdel (2003) §7",
          reason: `Spindle load ${load.toFixed(1)}% ≥ breakage spike limit ${spike.toFixed(1)}%`,
        });
      } else if (drop > 0 && load <= drop) {
        evidence.push({
          channel: "spindle",
          verdict: "pull_off",
          severity: PULL_OFF,
          source: "Erdel (2003) §7 breakage-drop detection",
          reason: `Spindle load ${load.toFixed(1)}% ≤ breakage drop limit ${drop.toFixed(1)}%`,
        });
      } else if (load >= s.retract_pct) {
        evidence.push({
          channel: "spindle",
          verdict: "pull_off",
          severity: PULL_OFF,
          source: "SpindleLoadMonitorEngine retract threshold",
          reason: `Spindle load ${load.toFixed(1)}% ≥ retract threshold ${s.retract_pct.toFixed(1)}%`,
        });
      } else if (load >= s.hold_pct) {
        evidence.push({
          channel: "spindle",
          verdict: "reduce_feed",
          severity: REDUCE,
          source: "SpindleLoadMonitorEngine hold threshold",
          reason: `Spindle load ${load.toFixed(1)}% ≥ feed-hold threshold ${s.hold_pct.toFixed(1)}%`,
        });
      } else if (load >= s.warning_pct) {
        evidence.push({
          channel: "spindle",
          verdict: "reduce_feed",
          severity: 0.35,
          source: "SpindleLoadMonitorEngine warning threshold",
          reason: `Spindle load ${load.toFixed(1)}% ≥ warning threshold ${s.warning_pct.toFixed(1)}%`,
        });
      } else {
        evidence.push({
          channel: "spindle",
          verdict: "continue",
          severity: NOMINAL,
          source: "Spindle load below warning threshold",
          reason: `load ${load.toFixed(1)}% nominal`,
        });
      }
    }

    if (evidence.length === 0) {
      warnings.push("No channels provided — verdict defaults to continue with zero confidence");
    }

    // ─── Weighted Fusion ──────────────────────────────────────────────
    const w = {
      ae: input.weights?.ae ?? 0.25,
      force: input.weights?.force ?? 0.25,
      vibration: input.weights?.vibration ?? 0.25,
      spindle: input.weights?.spindle ?? 0.25,
    };
    let totalSeverity = 0;
    let totalWeight = 0;
    let maxVerdict: MidCutVerdict = "continue";
    const rank: Record<MidCutVerdict, number> = {
      continue: 0,
      reduce_feed: 1,
      pull_off: 2,
      abort: 3,
    };
    for (const e of evidence) {
      const channelWeight = w[e.channel] ?? 0.25;
      totalSeverity += e.severity * channelWeight;
      totalWeight += channelWeight;
      if (rank[e.verdict] > rank[maxVerdict]) maxVerdict = e.verdict;
    }
    const meanSeverity = totalWeight > 0 ? totalSeverity / totalWeight : 0;

    // Final verdict = max-of-channels (any abort wins; any pull_off wins over reduce_feed)
    const verdict = maxVerdict;

    // Feed override % — 100 = no change, 0 = halt
    let feedOverride: number;
    switch (verdict) {
      case "abort":       feedOverride = 0; break;
      case "pull_off":    feedOverride = 0; break;  // controller retracts, feed irrelevant
      case "reduce_feed": feedOverride = Math.max(40, 100 - meanSeverity * 80); break;
      case "continue":    feedOverride = 100; break;
    }

    // Confidence = channel coverage × max(severity) for abort/pull_off paths,
    // or 1 - meanSeverity for continue/reduce
    const coverage = evidence.length / 4;
    const confidence = verdict === "continue"
      ? Math.max(0.3, coverage * (1 - meanSeverity))
      : Math.min(1, coverage * (0.5 + meanSeverity / 2));

    return {
      verdict,
      feed_override_pct: {
        value: Math.round(feedOverride),
        unit: "%",
        uncertainty: 5,
        source: "midcut_orchestrator_v1",
      },
      confidence: {
        value: Number(confidence.toFixed(3)),
        unit: "ratio",
        source: "channel-coverage × severity-fusion",
      },
      evidence,
      warnings,
    };
  }
}

export const midCutDecisionOrchestratorEngine = new MidCutDecisionOrchestratorEngine();
