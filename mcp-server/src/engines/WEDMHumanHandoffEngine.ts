/**
 * WEDMHumanHandoffEngine — Structured escalation from AI to operator.
 *
 * Phase 4 / P4-MS1 / U-P4-03 of the WEDM AGI Intelligence Roadmap.
 *
 * When `WEDMExceptionHandlerEngine` returns `human_escalate` (or any other
 * component decides the AI has reached the limits of its competence), this
 * engine builds a **structured handoff packet** for the operator:
 *
 *   { summary, context, suggestedAction, severity, urgency, snapshot }
 *
 * The handoff is the single place where AI ↔ human context exchange is
 * normalised — it must include enough information for a technician to pick
 * up the job without a full rebuild of the session. That means:
 *
 *   1. What happened      (exception type, occurrence, rationale)
 *   2. What was tried     (prior auto-recovery steps on this fault family)
 *   3. Current machine    (recipe, last outcome, sensor snapshot)
 *   4. Recommended step   (one concrete action the operator should take)
 *   5. Severity / urgency (how much of the shop floor should drop what
 *      they're doing to respond)
 *
 * Severity is a physics-aware classification: a wire break is `medium`
 * because it's routine; a tank-low is `high` because it risks full drain;
 * an axis overrun is `critical` because the machine is already halted by
 * hardware limits. Urgency is similarly informed — e.g. a silent servo
 * fault is `low` (can wait for next check-in), but a resistivity drift
 * that blocks cutting is `high`.
 *
 * The engine also maintains an in-memory **pending queue** so the web UI
 * (or any operator dashboard) can list every outstanding handoff. Each
 * entry is cleared by `acknowledge(id)` when the operator picks it up.
 *
 * Composes with:
 *   - `WEDMAutonomyEngine` (U-P4-01) — we trigger a `degrade()` on every
 *     escalation so the machine cannot proceed autonomously afterward.
 *   - `WEDMExceptionHandlerEngine` (U-P4-02) — source of `RecoveryPlan`.
 *   - `WEDMSafetyEnvelopeEngine` (U-P4-05) — alternate source of escalations.
 *
 * @module engines/WEDMHumanHandoffEngine
 */

import type { WEDMRecipe, WEDMCutOutcome } from "./WEDMFewShotEngine.js";
import type {
  RecoveryPlan,
  WEDMExceptionType,
} from "./WEDMExceptionHandlerEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export type Severity = "low" | "medium" | "high" | "critical";
export type Urgency = "low" | "medium" | "high" | "immediate";

export interface MachineSnapshot {
  /** Last recipe attempted. */
  recipe?: WEDMRecipe;
  /** Most-recent measured outcome. */
  lastOutcome?: WEDMCutOutcome;
  /** Absolute axis positions [mm]. */
  position?: { x?: number; y?: number; u?: number; v?: number; z?: number };
  /** Current gap voltage [V]. */
  gap_V?: number;
  /** Current wire tension [g]. */
  wire_tension_g?: number;
  /** Tank dielectric level [%]. */
  tank_pct?: number;
  /** Dielectric resistivity [MΩ·cm]. */
  resistivity_M?: number;
  /** Active program name / step id. */
  programRef?: string;
}

export interface HandoffRequest {
  /** Exception type or synthetic label (e.g. "envelope_violation"). */
  type: WEDMExceptionType | string;
  /** Recovery plan from `WEDMExceptionHandlerEngine`, if this came from there. */
  plan?: RecoveryPlan;
  /** One-line problem summary. */
  summary: string;
  /** Arbitrary context for the operator. */
  context?: Record<string, number | string | boolean>;
  /** Recommended concrete next action. */
  suggestedAction?: string;
  /** Machine snapshot captured at escalation time. */
  snapshot?: MachineSnapshot;
  /** Optional explicit severity override. */
  severity?: Severity;
  /** Optional explicit urgency override. */
  urgency?: Urgency;
  /** ISO timestamp override (tests). */
  timestamp?: string;
}

export interface HandoffPacket {
  /** Monotonic id assigned by the engine. */
  id: string;
  /** ISO timestamp of packet creation. */
  at: string;
  type: WEDMExceptionType | string;
  severity: Severity;
  urgency: Urgency;
  summary: string;
  suggestedAction: string;
  context: Record<string, number | string | boolean>;
  snapshot: MachineSnapshot;
  plan?: RecoveryPlan;
  /** True once acknowledge() has been called for this packet. */
  acknowledged: boolean;
  /** ISO timestamp of acknowledgement, if any. */
  acknowledgedAt?: string;
  /** Who acknowledged (operator id / name). */
  acknowledgedBy?: string;
}

// ============================================================================
// DEFAULT CLASSIFICATION — per exception type
// ============================================================================

const DEFAULT_SEVERITY: Partial<Record<WEDMExceptionType, Severity>> = {
  wire_break: "medium",
  short_circuit: "medium",
  open_circuit: "medium",
  tank_low: "high",
  resistivity_high: "low",
  resistivity_low: "medium",
  servo_fault: "medium",
  axis_overrun: "critical",
  wire_tension_out: "medium",
  filter_clogged: "low",
};

const DEFAULT_URGENCY: Partial<Record<WEDMExceptionType, Urgency>> = {
  wire_break: "high",
  short_circuit: "high",
  open_circuit: "medium",
  tank_low: "immediate",
  resistivity_high: "low",
  resistivity_low: "medium",
  servo_fault: "medium",
  axis_overrun: "immediate",
  wire_tension_out: "high",
  filter_clogged: "low",
};

const DEFAULT_SUGGESTIONS: Partial<Record<WEDMExceptionType, string>> = {
  wire_break: "Inspect wire path, re-thread manually, check for burrs on guides.",
  short_circuit: "Retract the head, inspect for welded wire, clean debris from gap.",
  open_circuit: "Verify workpiece position; confirm the start point contacts stock.",
  tank_low: "Refill dielectric reservoir before restart.",
  resistivity_high: "Wait for resistivity to drop below 5 MΩ·cm or add conductivity salt.",
  resistivity_low: "Replace DI resin cartridge; verify water flow.",
  servo_fault: "Check gap voltage calibration; adjust servo reference voltage.",
  axis_overrun: "Reset hard limits, verify program origin, check for collision debris.",
  wire_tension_out: "Inspect tensioner brake, verify wire spool feeds freely.",
  filter_clogged: "Replace particulate filter element; measure ΔP after swap.",
};

// ============================================================================
// ENGINE
// ============================================================================

export class WEDMHumanHandoffEngine {
  private pending: Map<string, HandoffPacket>;
  private history: HandoffPacket[];
  private counter: number;

  constructor() {
    this.pending = new Map();
    this.history = [];
    this.counter = 0;
  }

  /**
   * Build a handoff packet, enqueue it as pending, and return it.
   * Called by any engine that needs the operator's attention.
   */
  escalate(req: HandoffRequest): HandoffPacket {
    if (!req || typeof req.type !== "string" || req.type.length === 0) {
      throw new Error("WEDMHumanHandoffEngine.escalate: req.type is required");
    }
    if (typeof req.summary !== "string" || req.summary.length === 0) {
      throw new Error("WEDMHumanHandoffEngine.escalate: req.summary is required");
    }
    const id = this.nextId();
    const packet: HandoffPacket = {
      id,
      at: req.timestamp ?? new Date().toISOString(),
      type: req.type,
      severity: req.severity ?? this.inferSeverity(req.type, req.plan),
      urgency: req.urgency ?? this.inferUrgency(req.type, req.plan),
      summary: req.summary,
      suggestedAction: req.suggestedAction ?? this.inferSuggestion(req.type),
      context: { ...(req.context ?? {}) },
      snapshot: { ...(req.snapshot ?? {}) },
      plan: req.plan ? { ...req.plan } : undefined,
      acknowledged: false,
    };
    this.pending.set(id, packet);
    this.history.push(packet);
    return { ...packet };
  }

  /**
   * Mark a pending packet as acknowledged by an operator. Returns the
   * updated packet, or null if the id is not pending.
   */
  acknowledge(id: string, operator: string, at?: string): HandoffPacket | null {
    const packet = this.pending.get(id);
    if (!packet) return null;
    packet.acknowledged = true;
    packet.acknowledgedAt = at ?? new Date().toISOString();
    packet.acknowledgedBy = operator;
    this.pending.delete(id);
    return { ...packet };
  }

  /** List every outstanding handoff, newest first. */
  listPending(): HandoffPacket[] {
    return Array.from(this.pending.values())
      .map((p) => ({ ...p }))
      .reverse();
  }

  /** Look up a single packet from the pending queue. */
  getPending(id: string): HandoffPacket | null {
    const p = this.pending.get(id);
    return p ? { ...p } : null;
  }

  /** Full audit trail including acknowledged packets. */
  getHistory(): HandoffPacket[] {
    return this.history.map((p) => ({ ...p }));
  }

  /** Clear pending and history (tests / session reset). */
  reset(): void {
    this.pending.clear();
    this.history = [];
    this.counter = 0;
  }

  // --------------------------------------------------------------------------
  // Private
  // --------------------------------------------------------------------------

  private nextId(): string {
    this.counter += 1;
    return `HO-${Date.now().toString(36)}-${this.counter}`;
  }

  private inferSeverity(type: string, plan?: RecoveryPlan): Severity {
    const bump = plan?.directive === "emergency_stop";
    const base = (DEFAULT_SEVERITY as Record<string, Severity | undefined>)[type] ?? "medium";
    if (bump) return "critical";
    // Terminal directive with a non-critical base gets bumped one notch —
    // exhausted ladders are more serious than first-strike escalations.
    if (plan?.terminal) return bumpSeverity(base);
    return base;
  }

  private inferUrgency(type: string, plan?: RecoveryPlan): Urgency {
    if (plan?.directive === "emergency_stop") return "immediate";
    const base = (DEFAULT_URGENCY as Record<string, Urgency | undefined>)[type] ?? "medium";
    return base;
  }

  private inferSuggestion(type: string): string {
    return (
      (DEFAULT_SUGGESTIONS as Record<string, string | undefined>)[type] ??
      "Investigate machine state and acknowledge once safe to resume."
    );
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

export const wedmHumanHandoffEngine = new WEDMHumanHandoffEngine();

// ============================================================================
// HELPERS
// ============================================================================

const SEV_ORDER: Severity[] = ["low", "medium", "high", "critical"];

function bumpSeverity(s: Severity): Severity {
  const i = SEV_ORDER.indexOf(s);
  if (i < 0 || i >= SEV_ORDER.length - 1) return s;
  return SEV_ORDER[i + 1];
}
