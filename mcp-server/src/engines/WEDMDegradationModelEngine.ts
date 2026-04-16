/**
 * WEDMDegradationModelEngine — WEDM AGI Phase 4 / P4-MS3 / U-P4-08.
 *
 * Physics-based, time-integrated degradation model for the five WEDM
 * components that drive service intervals and wire-break risk:
 *
 *   1. `guide_wear`      — abrasive wear of diamond wire guides
 *                           (Archard: V = k·F·s / H)
 *   2. `wire_erosion`    — cumulative wire mass loss from discharges
 *                           (E = α·I·t_on·N_pulses)
 *   3. `filter_capacity` — ion-exchange / resin bed saturation
 *                           (S ∝ ∫ σ·Q dt)
 *   4. `filter_clogging` — particulate capture pressure drop
 *                           (ΔP ∝ m_debris / A_filter)
 *   5. `wire_fatigue`    — cumulative thermo-mechanical damage (Miner's
 *                           rule analogue over discharge energy)
 *
 * Each component tracks its own monotone `state` (cumulative damage or
 * material consumed) and a `capacity` (failure threshold). The
 * `DegradationIndex` for a component is `state / capacity`, clipped to
 * [0, 1]. `1 - index` is the component's health.
 *
 * The engine is the *model*, not the *decision layer*. Higher-level
 * code (WEDMPredictiveMaintenanceEngine) reads these indices to produce
 * RUL estimates and maintenance schedules.
 *
 * Physics constants below are defensible starting values with cited
 * sources. Shops characterising their own tooling should override via
 * `WEDMDegradationModelEngine.setCapacities()` rather than editing
 * constants inline — defaults represent a generic brass-wire-on-tool-
 * steel baseline.
 *
 * Composes with:
 *   - WEDMPredictiveMaintenanceEngine — consumer of this engine's output
 *   - WEDMSafetyEnvelopeEngine        — `wire_breaks_in_window` count
 *     is *correlated* with fatigue index but tracked separately (the
 *     envelope counts actual breaks; this engine predicts the *next* one)
 *
 * References:
 *   - Archard J.F., "Contact and rubbing of flat surfaces" (1953)
 *   - Miner M.A., "Cumulative damage in fatigue" (1945)
 *   - Dauw D. / Snoeys R. on EDM wire erosion rates (CIRP, 1980s)
 *   - Kunieda M. et al., "Advancing EDM through Fundamental
 *     Insight into the Process" CIRP Annals (2005)
 *
 * @module engines/WEDMDegradationModelEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export type DegradationComponent =
  | "guide_wear"
  | "wire_erosion"
  | "filter_capacity"
  | "filter_clogging"
  | "wire_fatigue";

/** Incremental usage over a time tick (all deltas, not cumulative totals). */
export interface UsageDelta {
  /** Tick length in hours. Required. */
  dt_hours: number;
  /** Mean wire tension during the tick (gf). */
  wire_tension_gf: number;
  /** Wire feed rate during the tick (mm/s). */
  wire_feed_mm_s: number;
  /** Mean discharge current during the tick (A). */
  discharge_current_A: number;
  /** Mean pulse-on time during the tick (µs). */
  pulse_on_us: number;
  /** Discharge pulses accumulated during the tick. */
  pulses: number;
  /** Dielectric conductivity during the tick (µS/cm). */
  conductivity_uS_cm: number;
  /** Dielectric flow during the tick (L/min). */
  flow_L_min: number;
  /** Particulate debris rate during the tick (mg/hr). */
  debris_rate_mg_hr: number;
  /** Pulse energy (mJ per pulse). */
  pulse_energy_mJ: number;
}

export interface ComponentState {
  /** Monotone cumulative quantity (wear volume, mass loss, damage, etc.). */
  state: number;
  /** Service / replacement threshold in the same units. */
  capacity: number;
  /** Units of `state`/`capacity` for reporting. */
  unit: string;
}

export interface DegradationSnapshot {
  components: Record<DegradationComponent, ComponentState & { index: number; health: number }>;
  /** Worst (largest) component index — "weakest link" health. */
  worstIndex: number;
  /** Component name driving worstIndex. */
  worstComponent: DegradationComponent;
  /** Overall health = 1 - worstIndex. */
  overallHealth: number;
}

// ============================================================================
// PHYSICS CONSTANTS — default values for brass wire / tool-steel parts
// ============================================================================

/** Archard wear coefficient k (mm³ / N·mm) for WC on carbide wire guides. */
const ARCHARD_K = 1e-8;
/** Vickers hardness H of wire guide (MPa). 18 GPa for WC-Co. */
const GUIDE_HARDNESS_MPA = 18000;
/** Service threshold for guide wear volume (mm³). */
const GUIDE_WEAR_CAPACITY_MM3 = 0.5;

/** Wire erosion rate α (mg / (A·µs·pulse)) for 0.25 mm brass on tool steel. */
const WIRE_EROSION_ALPHA = 5e-6;
/** Spool mass threshold (mg) — 90 % of a 5 kg spool. */
const WIRE_EROSION_CAPACITY_MG = 4.5e6;

/** Resin ion-exchange capacity (µS·cm·L / min·hour). */
const FILTER_CAPACITY_UNITS = 12000;

/** Clogging: allowable particulate mass accumulated before ΔP trip (mg). */
const CLOG_CAPACITY_MG = 5000;

/** Wire fatigue energy-to-break (mJ). */
const WIRE_FATIGUE_CAPACITY_MJ = 1_000_000;

// ============================================================================
// DEFAULT COMPONENT STATES
// ============================================================================

function blankComponents(): Record<DegradationComponent, ComponentState> {
  return {
    guide_wear: { state: 0, capacity: GUIDE_WEAR_CAPACITY_MM3, unit: "mm³" },
    wire_erosion: { state: 0, capacity: WIRE_EROSION_CAPACITY_MG, unit: "mg" },
    filter_capacity: { state: 0, capacity: FILTER_CAPACITY_UNITS, unit: "µS·cm·L·hr/min" },
    filter_clogging: { state: 0, capacity: CLOG_CAPACITY_MG, unit: "mg" },
    wire_fatigue: { state: 0, capacity: WIRE_FATIGUE_CAPACITY_MJ, unit: "mJ" },
  };
}

// ============================================================================
// ENGINE
// ============================================================================

export class WEDMDegradationModelEngine {
  private components: Record<DegradationComponent, ComponentState> = blankComponents();

  /** Initialise / resume from a saved state. Missing components keep defaults. */
  load(initial: Partial<Record<DegradationComponent, Partial<ComponentState>>>): void {
    for (const key of Object.keys(initial) as DegradationComponent[]) {
      const incoming = initial[key];
      if (!incoming) continue;
      const current = this.components[key];
      if (typeof incoming.state === "number" && Number.isFinite(incoming.state)) {
        current.state = Math.max(0, incoming.state);
      }
      if (typeof incoming.capacity === "number" && incoming.capacity > 0) {
        current.capacity = incoming.capacity;
      }
      if (typeof incoming.unit === "string") current.unit = incoming.unit;
    }
  }

  /** Override the capacity (service threshold) of one or more components. */
  setCapacities(caps: Partial<Record<DegradationComponent, number>>): void {
    for (const key of Object.keys(caps) as DegradationComponent[]) {
      const v = caps[key];
      if (typeof v === "number" && v > 0) this.components[key].capacity = v;
    }
  }

  /** Reset all components to zero state (capacities preserved). */
  reset(): void {
    for (const key of Object.keys(this.components) as DegradationComponent[]) {
      this.components[key].state = 0;
    }
  }

  /**
   * Integrate one tick of usage into the model. Throws on non-positive
   * dt_hours or on any non-finite input (upstream safety: refuse to
   * corrupt state on a bad signal rather than silently continue).
   */
  update(usage: UsageDelta): DegradationSnapshot {
    validateUsage(usage);

    // 1. Archard wear — convert tension gf → N, slide mm/s × 3600 → mm/hr.
    const F_normal_N = usage.wire_tension_gf * 9.80665e-3;
    const slide_mm = usage.wire_feed_mm_s * 3600 * usage.dt_hours;
    const wearDelta =
      (ARCHARD_K * F_normal_N * slide_mm) / GUIDE_HARDNESS_MPA;
    this.components.guide_wear.state += wearDelta;

    // 2. Wire erosion — α · I · t_on · N (mg).
    const erosionDelta =
      WIRE_EROSION_ALPHA *
      usage.discharge_current_A *
      usage.pulse_on_us *
      usage.pulses;
    this.components.wire_erosion.state += erosionDelta;

    // 3. Filter ion-exchange saturation — ∫ σ · Q dt.
    const filterDelta =
      usage.conductivity_uS_cm * usage.flow_L_min * usage.dt_hours;
    this.components.filter_capacity.state += filterDelta;

    // 4. Clogging — ∫ debris_rate dt (mg).
    const clogDelta = usage.debris_rate_mg_hr * usage.dt_hours;
    this.components.filter_clogging.state += clogDelta;

    // 5. Fatigue — cumulative discharge energy.
    const fatigueDelta = usage.pulse_energy_mJ * usage.pulses;
    this.components.wire_fatigue.state += fatigueDelta;

    return this.snapshot();
  }

  /** Current full snapshot with indices + worst-link summary. */
  snapshot(): DegradationSnapshot {
    const out = {} as DegradationSnapshot["components"];
    let worstIndex = 0;
    let worstComponent: DegradationComponent = "guide_wear";
    for (const key of Object.keys(this.components) as DegradationComponent[]) {
      const c = this.components[key];
      const index = Math.max(0, Math.min(1, c.state / c.capacity));
      const health = 1 - index;
      out[key] = { ...c, index, health };
      if (index > worstIndex) {
        worstIndex = index;
        worstComponent = key;
      }
    }
    return {
      components: out,
      worstIndex,
      worstComponent,
      overallHealth: 1 - worstIndex,
    };
  }

  /** Accessor for a single component's current state (defensive copy). */
  getComponent(c: DegradationComponent): ComponentState & { index: number; health: number } {
    return this.snapshot().components[c];
  }
}

// ============================================================================
// VALIDATION
// ============================================================================

function validateUsage(u: UsageDelta): void {
  const fields: Array<keyof UsageDelta> = [
    "dt_hours",
    "wire_tension_gf",
    "wire_feed_mm_s",
    "discharge_current_A",
    "pulse_on_us",
    "pulses",
    "conductivity_uS_cm",
    "flow_L_min",
    "debris_rate_mg_hr",
    "pulse_energy_mJ",
  ];
  for (const f of fields) {
    const v = u[f];
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0) {
      throw new Error(`WEDMDegradationModelEngine.update: ${f} must be a finite non-negative number (got ${String(v)})`);
    }
  }
  if (u.dt_hours <= 0) {
    throw new Error("WEDMDegradationModelEngine.update: dt_hours must be > 0");
  }
}

/** Shared singleton. */
export const wedmDegradationModelEngine = new WEDMDegradationModelEngine();
