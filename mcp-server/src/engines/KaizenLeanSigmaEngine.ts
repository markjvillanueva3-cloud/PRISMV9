/**
 * KaizenLeanSigmaEngine — continuous-improvement substrate for every employee.
 *
 * Three subsystems in one cohesive ledger:
 *
 *   1. DOWNTIME 8-waste observation log (`observeWaste`, `wasteLedger`)
 *      Any employee can log a waste observation (D-O-W-N-T-I-M-E):
 *        Defects · Overproduction · Waiting · Non-utilized talent ·
 *        Transportation · Inventory · Motion · Extra processing
 *      Each entry stamps employee_id, machine_serial (optional), gemba flag,
 *      severity, and optional impact_minutes for prioritization.
 *
 *   2. DMAIC kaizen-event lifecycle (`openEvent`, `advanceEvent`, `closeEvent`)
 *      Define → Measure → Analyze → Improve → Control. Cannot skip phases
 *      (R12 fail-loud). Captures sponsor (manager) + champion (employee). On
 *      close, requires baseline + post Cp/Cpk + sustainment-plan hook.
 *
 *   3. Six Sigma capability gate (`calculateCpk`, `sixSigmaGate`)
 *      Cp = (USL - LSL) / (6σ); Cpk = min((USL-μ)/3σ, (μ-LSL)/3σ).
 *      Gate thresholds (per CLAUDE.md DISCIPLINE EXPERT injection):
 *        Cpk ≥ 1.33  → capable
 *        Cpk ≥ 1.67  → excellent (Six Sigma DPMO ≈ 3.4 at ±6σ)
 *        Cpk < 1.00  → not_capable → block release
 *      Returns DPMO estimate via the 1.5σ-shift convention.
 *
 * Suggestion intake (`submitSuggestion`, `triageSuggestion`):
 *   Any employee can submit an improvement suggestion → manager triages to
 *   accepted | rejected | needs_more_data, linking to a DMAIC event when
 *   accepted. Surfaces "Respect for people" — kaizen idea-flow from the floor.
 *
 * Hotel-soul invariants: PII-free, Object.frozen returns, R12 fail-loud,
 * immutable audit-trail on every transition.
 *
 * Literature references:
 *   - Womack & Jones, "Lean Thinking" (1996) — 8 wastes incl. non-utilized talent.
 *   - George, "Lean Six Sigma" (2002) — DMAIC + Cp/Cpk gates.
 *   - Imai, "Kaizen" (1986) — gemba + small-improvement cadence.
 *   - Montgomery, "Statistical Quality Control" 6e — Cp/Cpk formulas + 1.5σ shift.
 *
 * @module KaizenLeanSigmaEngine
 * @milestone HOTEL/U-KAIZEN-LEAN-SIGMA (2026-05-26, slot:hotel)
 */

export type LeanWaste =
  | "defect"
  | "overproduction"
  | "waiting"
  | "non_utilized_talent"
  | "transportation"
  | "inventory"
  | "motion"
  | "extra_processing";

export type DmaicPhase =
  | "define"
  | "measure"
  | "analyze"
  | "improve"
  | "control"
  | "closed";

export type EventStatus = "open" | "closed" | "cancelled";

export type SuggestionStatus =
  | "submitted"
  | "accepted"
  | "rejected"
  | "needs_more_data";

export type CapabilityVerdict =
  | "not_capable" // Cpk < 1.00
  | "marginally_capable" // 1.00 ≤ Cpk < 1.33
  | "capable" // 1.33 ≤ Cpk < 1.67
  | "excellent"; // Cpk ≥ 1.67 (Six Sigma)

const ALLOWED_WASTES = new Set<LeanWaste>([
  "defect",
  "overproduction",
  "waiting",
  "non_utilized_talent",
  "transportation",
  "inventory",
  "motion",
  "extra_processing",
]);

const ALLOWED_PHASES = new Set<DmaicPhase>([
  "define",
  "measure",
  "analyze",
  "improve",
  "control",
  "closed",
]);

const PHASE_ORDER: ReadonlyArray<DmaicPhase> = [
  "define",
  "measure",
  "analyze",
  "improve",
  "control",
  "closed",
];

export interface WasteObservation {
  id: string;
  observed_at: string;
  observer_employee_id: string;
  waste: LeanWaste;
  description: string;
  machine_serial?: string;
  gemba: boolean; // true when observed in-person at the workstation
  severity: "low" | "medium" | "high";
  impact_minutes?: number; // estimated time-cost of the waste per occurrence
}

export interface DmaicEvent {
  id: string;
  title: string;
  champion_employee_id: string; // floor employee leading the kaizen
  sponsor_employee_id: string; // manager backing the event
  current_phase: DmaicPhase;
  status: EventStatus;
  opened_at: string;
  closed_at?: string;
  baseline_cpk?: number;
  post_cpk?: number;
  baseline_dpmo?: number;
  post_dpmo?: number;
  sustainment_plan?: string;
  audit_trail: ReadonlyArray<DmaicTransition>;
}

export interface DmaicTransition {
  at: string;
  from: DmaicPhase;
  to: DmaicPhase;
  by_employee_id: string;
  note?: string;
}

export interface Suggestion {
  id: string;
  submitter_employee_id: string;
  title: string;
  description: string;
  related_waste?: LeanWaste;
  submitted_at: string;
  status: SuggestionStatus;
  triaged_at?: string;
  triaged_by_employee_id?: string;
  triage_note?: string;
  linked_event_id?: string;
}

export interface CpkResult {
  cp: number;
  cpk: number;
  cpu: number; // (USL - μ) / (3σ)
  cpl: number; // (μ - LSL) / (3σ)
  mean: number;
  stddev: number;
  sample_n: number;
  /** DPMO under the 1.5σ shift convention (defects per million opportunities). */
  dpmo: number;
  verdict: CapabilityVerdict;
}

class KaizenLeanSigmaEngine {
  private observations: Map<string, WasteObservation> = new Map();
  private events: Map<string, DmaicEvent> = new Map();
  private suggestions: Map<string, Suggestion> = new Map();
  private nextObsId = 1;
  private nextEventId = 1;
  private nextSuggId = 1;

  observeWaste(args: {
    observer_employee_id: string;
    waste: LeanWaste;
    description: string;
    machine_serial?: string;
    gemba?: boolean;
    severity?: "low" | "medium" | "high";
    impact_minutes?: number;
  }): WasteObservation {
    if (!args.observer_employee_id) {
      throw new Error(
        "KaizenLeanSigmaEngine.observeWaste: observer_employee_id required",
      );
    }
    if (!args.description || args.description.trim().length === 0) {
      throw new Error(
        "KaizenLeanSigmaEngine.observeWaste: non-empty description required",
      );
    }
    if (!ALLOWED_WASTES.has(args.waste)) {
      throw new Error(
        `KaizenLeanSigmaEngine.observeWaste: waste must be one of ${[...ALLOWED_WASTES].join("|")} (got '${args.waste}')`,
      );
    }
    if (
      args.impact_minutes !== undefined &&
      (!Number.isFinite(args.impact_minutes) || args.impact_minutes < 0)
    ) {
      throw new Error(
        "KaizenLeanSigmaEngine.observeWaste: impact_minutes must be a finite non-negative number when provided",
      );
    }
    const id = `WASTE-${String(this.nextObsId++).padStart(6, "0")}`;
    const obs: WasteObservation = Object.freeze({
      id,
      observed_at: new Date().toISOString(),
      observer_employee_id: args.observer_employee_id,
      waste: args.waste,
      description: args.description,
      gemba: args.gemba ?? true,
      severity: args.severity ?? "medium",
      ...(args.machine_serial !== undefined && {
        machine_serial: args.machine_serial,
      }),
      ...(args.impact_minutes !== undefined && {
        impact_minutes: args.impact_minutes,
      }),
    });
    this.observations.set(id, obs);
    return obs;
  }

  wasteLedger(args: {
    employee_id?: string;
    waste?: LeanWaste;
    machine_serial?: string;
  }): ReadonlyArray<WasteObservation> {
    if (args.waste !== undefined && !ALLOWED_WASTES.has(args.waste)) {
      throw new Error(
        `KaizenLeanSigmaEngine.wasteLedger: invalid waste filter '${args.waste}'`,
      );
    }
    const out: WasteObservation[] = [];
    for (const o of this.observations.values()) {
      if (
        args.employee_id &&
        o.observer_employee_id !== args.employee_id
      )
        continue;
      if (args.waste && o.waste !== args.waste) continue;
      if (args.machine_serial && o.machine_serial !== args.machine_serial)
        continue;
      out.push(Object.freeze({ ...o }));
    }
    return Object.freeze(out);
  }

  wasteSummary(): Readonly<Partial<Record<LeanWaste, number>>> {
    const counts: Partial<Record<LeanWaste, number>> = {};
    for (const o of this.observations.values()) {
      counts[o.waste] = (counts[o.waste] ?? 0) + 1;
    }
    return Object.freeze(counts);
  }

  // ─── DMAIC kaizen events ───────────────────────────────────────────────

  openEvent(args: {
    title: string;
    champion_employee_id: string;
    sponsor_employee_id: string;
  }): DmaicEvent {
    if (!args.title || args.title.trim().length === 0) {
      throw new Error("KaizenLeanSigmaEngine.openEvent: non-empty title required");
    }
    if (!args.champion_employee_id || !args.sponsor_employee_id) {
      throw new Error(
        "KaizenLeanSigmaEngine.openEvent: champion + sponsor employee_id required",
      );
    }
    if (args.champion_employee_id === args.sponsor_employee_id) {
      throw new Error(
        "KaizenLeanSigmaEngine.openEvent: champion and sponsor cannot be the same employee (segregation of duties — sponsor backs, champion executes)",
      );
    }
    const id = `KAIZEN-${String(this.nextEventId++).padStart(6, "0")}`;
    const now = new Date().toISOString();
    const event: DmaicEvent = Object.freeze({
      id,
      title: args.title,
      champion_employee_id: args.champion_employee_id,
      sponsor_employee_id: args.sponsor_employee_id,
      current_phase: "define" as const,
      status: "open" as const,
      opened_at: now,
      audit_trail: Object.freeze([
        Object.freeze({
          at: now,
          from: "define" as DmaicPhase,
          to: "define" as DmaicPhase,
          by_employee_id: args.sponsor_employee_id,
          note: "event opened",
        }),
      ]),
    });
    this.events.set(id, event);
    return event;
  }

  advanceEvent(args: {
    event_id: string;
    to_phase: DmaicPhase;
    by_employee_id: string;
    note?: string;
  }): DmaicEvent {
    const e = this.requireEvent(args.event_id);
    if (e.status !== "open") {
      throw new Error(
        `KaizenLeanSigmaEngine.advanceEvent: event must be 'open' (got '${e.status}')`,
      );
    }
    if (!ALLOWED_PHASES.has(args.to_phase)) {
      throw new Error(
        `KaizenLeanSigmaEngine.advanceEvent: to_phase must be one of ${[...ALLOWED_PHASES].join("|")} (got '${args.to_phase}')`,
      );
    }
    if (args.to_phase === "closed") {
      throw new Error(
        "KaizenLeanSigmaEngine.advanceEvent: use closeEvent() to transition to 'closed' (closure requires baseline+post Cpk + sustainment_plan)",
      );
    }
    const fromIdx = PHASE_ORDER.indexOf(e.current_phase);
    const toIdx = PHASE_ORDER.indexOf(args.to_phase);
    if (toIdx !== fromIdx + 1) {
      throw new Error(
        `KaizenLeanSigmaEngine.advanceEvent: phase must advance one step (from='${e.current_phase}' to='${args.to_phase}') — DMAIC phases cannot be skipped`,
      );
    }
    if (!args.by_employee_id) {
      throw new Error(
        "KaizenLeanSigmaEngine.advanceEvent: by_employee_id required",
      );
    }
    const now = new Date().toISOString();
    const transition: DmaicTransition = Object.freeze({
      at: now,
      from: e.current_phase,
      to: args.to_phase,
      by_employee_id: args.by_employee_id,
      ...(args.note !== undefined && { note: args.note }),
    });
    const updated: DmaicEvent = Object.freeze({
      ...e,
      current_phase: args.to_phase,
      audit_trail: Object.freeze([...e.audit_trail, transition]),
    });
    this.events.set(e.id, updated);
    return updated;
  }

  closeEvent(args: {
    event_id: string;
    by_employee_id: string;
    baseline_cpk: number;
    post_cpk: number;
    baseline_dpmo: number;
    post_dpmo: number;
    sustainment_plan: string;
  }): DmaicEvent {
    const e = this.requireEvent(args.event_id);
    if (e.status !== "open") {
      throw new Error(
        `KaizenLeanSigmaEngine.closeEvent: event must be 'open' (got '${e.status}')`,
      );
    }
    if (e.current_phase !== "control") {
      throw new Error(
        `KaizenLeanSigmaEngine.closeEvent: event must be in 'control' phase before close (got '${e.current_phase}'). Advance via advanceEvent() through D→M→A→I→C first.`,
      );
    }
    if (!Number.isFinite(args.baseline_cpk) || args.baseline_cpk < 0) {
      throw new Error(
        "KaizenLeanSigmaEngine.closeEvent: baseline_cpk must be a finite non-negative number",
      );
    }
    if (!Number.isFinite(args.post_cpk) || args.post_cpk < 0) {
      throw new Error(
        "KaizenLeanSigmaEngine.closeEvent: post_cpk must be a finite non-negative number",
      );
    }
    if (!Number.isFinite(args.baseline_dpmo) || args.baseline_dpmo < 0) {
      throw new Error(
        "KaizenLeanSigmaEngine.closeEvent: baseline_dpmo must be a finite non-negative number",
      );
    }
    if (!Number.isFinite(args.post_dpmo) || args.post_dpmo < 0) {
      throw new Error(
        "KaizenLeanSigmaEngine.closeEvent: post_dpmo must be a finite non-negative number",
      );
    }
    if (
      !args.sustainment_plan ||
      args.sustainment_plan.trim().length === 0
    ) {
      throw new Error(
        "KaizenLeanSigmaEngine.closeEvent: sustainment_plan required (Control phase artifact — how the gain holds)",
      );
    }
    if (args.post_cpk < args.baseline_cpk) {
      throw new Error(
        `KaizenLeanSigmaEngine.closeEvent: post_cpk (${args.post_cpk}) regressed below baseline_cpk (${args.baseline_cpk}) — DMAIC closure requires Cpk improvement or no-change; open a follow-up event instead`,
      );
    }
    const now = new Date().toISOString();
    const transition: DmaicTransition = Object.freeze({
      at: now,
      from: e.current_phase,
      to: "closed" as DmaicPhase,
      by_employee_id: args.by_employee_id,
      note: `closed: Cpk ${args.baseline_cpk.toFixed(3)} → ${args.post_cpk.toFixed(3)}, DPMO ${args.baseline_dpmo.toFixed(0)} → ${args.post_dpmo.toFixed(0)}`,
    });
    const updated: DmaicEvent = Object.freeze({
      ...e,
      current_phase: "closed" as const,
      status: "closed" as const,
      closed_at: now,
      baseline_cpk: args.baseline_cpk,
      post_cpk: args.post_cpk,
      baseline_dpmo: args.baseline_dpmo,
      post_dpmo: args.post_dpmo,
      sustainment_plan: args.sustainment_plan,
      audit_trail: Object.freeze([...e.audit_trail, transition]),
    });
    this.events.set(e.id, updated);
    return updated;
  }

  listEvents(args: { status?: EventStatus; champion_employee_id?: string }): ReadonlyArray<DmaicEvent> {
    const out: DmaicEvent[] = [];
    for (const e of this.events.values()) {
      if (args.status && e.status !== args.status) continue;
      if (
        args.champion_employee_id &&
        e.champion_employee_id !== args.champion_employee_id
      )
        continue;
      out.push(Object.freeze({ ...e }));
    }
    return Object.freeze(out);
  }

  // ─── Six Sigma capability gate (Cpk + DPMO) ───────────────────────────

  /**
   * Compute Cp/Cpk over a sample with explicit USL+LSL.
   * Population stddev (n-1) is used per Montgomery 6e §6.2.
   * DPMO uses the 1.5σ-shift convention: DPMO ≈ 1e6 * (1 - Φ(3*Cpk - 1.5)).
   */
  calculateCpk(args: {
    samples: number[];
    usl: number;
    lsl: number;
  }): CpkResult {
    if (!Array.isArray(args.samples) || args.samples.length < 2) {
      throw new Error(
        "KaizenLeanSigmaEngine.calculateCpk: samples array of length ≥2 required",
      );
    }
    for (const s of args.samples) {
      if (!Number.isFinite(s)) {
        throw new Error(
          `KaizenLeanSigmaEngine.calculateCpk: sample '${s}' is not a finite number`,
        );
      }
    }
    if (!Number.isFinite(args.usl) || !Number.isFinite(args.lsl)) {
      throw new Error(
        "KaizenLeanSigmaEngine.calculateCpk: usl + lsl must be finite numbers",
      );
    }
    if (args.usl <= args.lsl) {
      throw new Error(
        `KaizenLeanSigmaEngine.calculateCpk: usl (${args.usl}) must be greater than lsl (${args.lsl})`,
      );
    }
    const n = args.samples.length;
    const mean = args.samples.reduce((a, b) => a + b, 0) / n;
    const variance =
      args.samples.reduce((acc, s) => acc + (s - mean) ** 2, 0) / (n - 1);
    const stddev = Math.sqrt(variance);
    if (stddev === 0) {
      throw new Error(
        "KaizenLeanSigmaEngine.calculateCpk: sample stddev is zero — Cp/Cpk are undefined for a degenerate process",
      );
    }
    const cp = (args.usl - args.lsl) / (6 * stddev);
    const cpu = (args.usl - mean) / (3 * stddev);
    const cpl = (mean - args.lsl) / (3 * stddev);
    const cpk = Math.min(cpu, cpl);
    const dpmo = this.cpkToDpmo(cpk);
    const verdict = this.classifyCpk(cpk);
    return Object.freeze({
      cp,
      cpk,
      cpu,
      cpl,
      mean,
      stddev,
      sample_n: n,
      dpmo,
      verdict,
    });
  }

  /**
   * Verdict-only gate. `release` is true iff verdict is 'capable' or 'excellent'.
   * Use as the final check before release per CLAUDE.md DISCIPLINE EXPERT
   * quality criteria (Cpk > 1.33 capable, > 1.67 excellent).
   */
  sixSigmaGate(args: {
    samples: number[];
    usl: number;
    lsl: number;
  }): Readonly<{ result: CpkResult; release: boolean; reason: string }> {
    const result = this.calculateCpk(args);
    const release =
      result.verdict === "capable" || result.verdict === "excellent";
    const reason = release
      ? `Cpk ${result.cpk.toFixed(3)} ≥ 1.33 → release approved`
      : `Cpk ${result.cpk.toFixed(3)} < 1.33 (${result.verdict}) → release blocked, DPMO ${result.dpmo.toFixed(0)}`;
    return Object.freeze({ result, release, reason });
  }

  // ─── Suggestion intake (Respect for People — kaizen idea-flow) ─────────

  submitSuggestion(args: {
    submitter_employee_id: string;
    title: string;
    description: string;
    related_waste?: LeanWaste;
  }): Suggestion {
    if (!args.submitter_employee_id) {
      throw new Error(
        "KaizenLeanSigmaEngine.submitSuggestion: submitter_employee_id required",
      );
    }
    if (!args.title || args.title.trim().length === 0) {
      throw new Error(
        "KaizenLeanSigmaEngine.submitSuggestion: non-empty title required",
      );
    }
    if (!args.description || args.description.trim().length === 0) {
      throw new Error(
        "KaizenLeanSigmaEngine.submitSuggestion: non-empty description required",
      );
    }
    if (
      args.related_waste !== undefined &&
      !ALLOWED_WASTES.has(args.related_waste)
    ) {
      throw new Error(
        `KaizenLeanSigmaEngine.submitSuggestion: invalid related_waste '${args.related_waste}'`,
      );
    }
    const id = `SUGG-${String(this.nextSuggId++).padStart(6, "0")}`;
    const s: Suggestion = Object.freeze({
      id,
      submitter_employee_id: args.submitter_employee_id,
      title: args.title,
      description: args.description,
      submitted_at: new Date().toISOString(),
      status: "submitted" as const,
      ...(args.related_waste !== undefined && {
        related_waste: args.related_waste,
      }),
    });
    this.suggestions.set(id, s);
    return s;
  }

  triageSuggestion(args: {
    suggestion_id: string;
    triaged_by_employee_id: string;
    decision: "accepted" | "rejected" | "needs_more_data";
    note?: string;
    linked_event_id?: string;
  }): Suggestion {
    const s = this.requireSuggestion(args.suggestion_id);
    if (s.status !== "submitted") {
      throw new Error(
        `KaizenLeanSigmaEngine.triageSuggestion: suggestion must be 'submitted' (got '${s.status}')`,
      );
    }
    if (!args.triaged_by_employee_id) {
      throw new Error(
        "KaizenLeanSigmaEngine.triageSuggestion: triaged_by_employee_id required",
      );
    }
    if (args.triaged_by_employee_id === s.submitter_employee_id) {
      throw new Error(
        "KaizenLeanSigmaEngine.triageSuggestion: submitter cannot triage their own suggestion (segregation of duties)",
      );
    }
    if (
      args.decision !== "accepted" &&
      args.decision !== "rejected" &&
      args.decision !== "needs_more_data"
    ) {
      throw new Error(
        `KaizenLeanSigmaEngine.triageSuggestion: decision must be accepted|rejected|needs_more_data (got '${args.decision}')`,
      );
    }
    if (args.linked_event_id !== undefined) {
      // Verify the event exists (R12 fail-loud — no dangling links)
      this.requireEvent(args.linked_event_id);
    }
    const updated: Suggestion = Object.freeze({
      ...s,
      status: args.decision,
      triaged_at: new Date().toISOString(),
      triaged_by_employee_id: args.triaged_by_employee_id,
      ...(args.note !== undefined && { triage_note: args.note }),
      ...(args.linked_event_id !== undefined && {
        linked_event_id: args.linked_event_id,
      }),
    });
    this.suggestions.set(s.id, updated);
    return updated;
  }

  listSuggestions(args: {
    submitter_employee_id?: string;
    status?: SuggestionStatus;
  }): ReadonlyArray<Suggestion> {
    const out: Suggestion[] = [];
    for (const s of this.suggestions.values()) {
      if (
        args.submitter_employee_id &&
        s.submitter_employee_id !== args.submitter_employee_id
      )
        continue;
      if (args.status && s.status !== args.status) continue;
      out.push(Object.freeze({ ...s }));
    }
    return Object.freeze(out);
  }

  // ─── helpers ───────────────────────────────────────────────────────────

  private requireEvent(id: string): DmaicEvent {
    const e = this.events.get(id);
    if (!e) {
      throw new Error(`KaizenLeanSigmaEngine: unknown event_id "${id}"`);
    }
    return e;
  }

  private requireSuggestion(id: string): Suggestion {
    const s = this.suggestions.get(id);
    if (!s) {
      throw new Error(
        `KaizenLeanSigmaEngine: unknown suggestion_id "${id}"`,
      );
    }
    return s;
  }

  private classifyCpk(cpk: number): CapabilityVerdict {
    if (cpk < 1.0) return "not_capable";
    if (cpk < 1.33) return "marginally_capable";
    if (cpk < 1.67) return "capable";
    return "excellent";
  }

  /**
   * DPMO via the 1.5σ-shift convention used in Six Sigma practice
   * (Montgomery 6e §15.1.5). z = 3*Cpk - 1.5 (long-term shift); DPMO ≈ 1e6 *
   * (1 - Φ(z)). Returns 0 when z is large enough that Φ(z) → 1 within fp64.
   */
  private cpkToDpmo(cpk: number): number {
    const z = 3 * cpk - 1.5;
    const phi = this.normalCdf(z);
    const dpmo = 1_000_000 * (1 - phi);
    return Math.max(0, dpmo);
  }

  /** Φ(x) via Abramowitz & Stegun 26.2.17 (max error ~7.5e-8). */
  private normalCdf(x: number): number {
    const sign = x < 0 ? -1 : 1;
    const absX = Math.abs(x) / Math.SQRT2;
    const t = 1 / (1 + 0.3275911 * absX);
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const erf =
      1 -
      ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) *
        t *
        Math.exp(-absX * absX);
    return 0.5 * (1 + sign * erf);
  }

  reset(): void {
    this.observations.clear();
    this.events.clear();
    this.suggestions.clear();
    this.nextObsId = 1;
    this.nextEventId = 1;
    this.nextSuggId = 1;
  }
}

export const kaizenLeanSigmaEngine = new KaizenLeanSigmaEngine();
