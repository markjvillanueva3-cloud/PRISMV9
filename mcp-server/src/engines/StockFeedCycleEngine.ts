/**
 * StockFeedCycleEngine
 * ======================
 *
 * Runtime cycle-manager for lathe bar/stock feeders. Complements the
 * existing BarFeederEngine (which models feeder mechanics) by tracking
 * per-cycle state:
 *   - Remaining stock length after each part
 *   - Depletion events (exhausted, low-warning, changed)
 *   - Feed length validation (part + cutoff + safety margin)
 *   - Sync events for machine coordination
 *   - Yield per bar + scrap waste
 *
 * Named distinct from BarFeederEngine per duplication-guard policy.
 *
 * @module engines/StockFeedCycleEngine
 * @milestone LATHE-PRO
 */

export interface StockSpec {
  /** Raw stock length (mm) — typical bar = 3000mm */
  bar_length_mm: number;
  /** Bar outer diameter (mm) */
  bar_diameter_mm: number;
  /** Material name */
  material: string;
  /** Minimum gripping length required at collet (mm) — minimum remnant */
  min_gripping_length_mm: number;
}

export interface PartFeedSpec {
  /** Finished part length (mm) */
  part_length_mm: number;
  /** Cutoff (parting) tool width (mm) */
  cutoff_width_mm: number;
  /** Safety margin for clamp + facing (mm) — default 2mm */
  safety_margin_mm?: number;
}

export interface FeedCycleState {
  bar: StockSpec;
  part: PartFeedSpec;
  parts_produced: number;
  remaining_bar_mm: number;
  total_scrap_mm: number;
  cycle_count: number;
  last_event?: StockEvent;
}

export type StockEventKind =
  | "feed_ok"
  | "bar_low"
  | "bar_depleted"
  | "bar_change_requested"
  | "bar_change_complete"
  | "feed_length_invalid";

export interface StockEvent {
  kind: StockEventKind;
  message: string;
  timestamp: string;
  cycle_number: number;
  remaining_mm: number;
}

export interface FeedValidation {
  valid: boolean;
  required_feed_mm: number;
  remaining_after_feed_mm: number;
  will_exhaust_bar: boolean;
  warnings: string[];
}

// ── Engine Implementation ──────────────────────────────────────────────────

class StockFeedCycleEngineImpl {
  createState(bar: StockSpec, part: PartFeedSpec): FeedCycleState {
    return {
      bar,
      part,
      parts_produced: 0,
      remaining_bar_mm: bar.bar_length_mm,
      total_scrap_mm: 0,
      cycle_count: 0,
    };
  }

  requiredFeedLength(part: PartFeedSpec): number {
    const safety = part.safety_margin_mm ?? 2;
    return part.part_length_mm + part.cutoff_width_mm + safety;
  }

  validateFeed(state: FeedCycleState): FeedValidation {
    const warnings: string[] = [];
    const required = this.requiredFeedLength(state.part);
    const afterFeed = state.remaining_bar_mm - required;
    const willExhaust = afterFeed < state.bar.min_gripping_length_mm;

    let valid = true;

    if (state.remaining_bar_mm < required) {
      warnings.push(
        `Required feed ${required} mm exceeds remaining stock ${state.remaining_bar_mm} mm — stop before cycle`
      );
      valid = false;
    }

    if (willExhaust && state.remaining_bar_mm >= required) {
      warnings.push(
        `After this cycle, remnant ${afterFeed.toFixed(1)} mm < minimum grip ${state.bar.min_gripping_length_mm} mm — stock change required next cycle`
      );
    }

    if (required <= 0) {
      warnings.push("Required feed is zero or negative — check part + cutoff widths");
      valid = false;
    }

    return {
      valid,
      required_feed_mm: required,
      remaining_after_feed_mm: afterFeed,
      will_exhaust_bar: willExhaust,
      warnings,
    };
  }

  advanceCycle(state: FeedCycleState): StockEvent {
    const validation = this.validateFeed(state);
    const timestamp = new Date().toISOString();
    state.cycle_count++;

    if (!validation.valid) {
      const event: StockEvent = {
        kind: "feed_length_invalid",
        message: validation.warnings.join("; "),
        timestamp,
        cycle_number: state.cycle_count,
        remaining_mm: state.remaining_bar_mm,
      };
      state.last_event = event;
      return event;
    }

    state.remaining_bar_mm -= validation.required_feed_mm;
    state.parts_produced++;

    if (validation.will_exhaust_bar) {
      const event: StockEvent = {
        kind: "bar_depleted",
        message: `Stock depleted after part ${state.parts_produced}. Remnant ${state.remaining_bar_mm.toFixed(1)} mm will be scrap.`,
        timestamp,
        cycle_number: state.cycle_count,
        remaining_mm: state.remaining_bar_mm,
      };
      state.last_event = event;
      return event;
    }

    if (state.remaining_bar_mm < state.bar.bar_length_mm * 0.15) {
      const event: StockEvent = {
        kind: "bar_low",
        message: `Stock low: ${state.remaining_bar_mm.toFixed(1)} mm remaining (< 15% of initial)`,
        timestamp,
        cycle_number: state.cycle_count,
        remaining_mm: state.remaining_bar_mm,
      };
      state.last_event = event;
      return event;
    }

    const event: StockEvent = {
      kind: "feed_ok",
      message: `Feed OK. Part ${state.parts_produced} produced. Remaining ${state.remaining_bar_mm.toFixed(1)} mm.`,
      timestamp,
      cycle_number: state.cycle_count,
      remaining_mm: state.remaining_bar_mm,
    };
    state.last_event = event;
    return event;
  }

  requestBarChange(state: FeedCycleState): StockEvent {
    const timestamp = new Date().toISOString();
    state.total_scrap_mm += state.remaining_bar_mm;
    state.remaining_bar_mm = state.bar.bar_length_mm;
    state.cycle_count++;
    const event: StockEvent = {
      kind: "bar_change_complete",
      message: `New stock loaded. Total scrap so far: ${state.total_scrap_mm.toFixed(1)} mm`,
      timestamp,
      cycle_number: state.cycle_count,
      remaining_mm: state.remaining_bar_mm,
    };
    state.last_event = event;
    return event;
  }

  partsPerBar(bar: StockSpec, part: PartFeedSpec): number {
    const required = this.requiredFeedLength(part);
    const usable = bar.bar_length_mm - bar.min_gripping_length_mm;
    if (required <= 0) return 0;
    return Math.floor(usable / required);
  }

  getYield(bar: StockSpec, part: PartFeedSpec): {
    parts_per_bar: number;
    usable_mm: number;
    scrap_mm: number;
    yield_percent: number;
  } {
    const required = this.requiredFeedLength(part);
    const parts = this.partsPerBar(bar, part);
    const usable = parts * required;
    const scrap = bar.bar_length_mm - usable;
    const yieldPct = (usable / bar.bar_length_mm) * 100;
    return {
      parts_per_bar: parts,
      usable_mm: round2(usable),
      scrap_mm: round2(scrap),
      yield_percent: round2(yieldPct),
    };
  }

  getStats(): {
    event_kinds: StockEventKind[];
    bar_low_threshold: number;
  } {
    return {
      event_kinds: [
        "feed_ok",
        "bar_low",
        "bar_depleted",
        "bar_change_requested",
        "bar_change_complete",
        "feed_length_invalid",
      ],
      bar_low_threshold: 0.15,
    };
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export const stockFeedCycleEngine = new StockFeedCycleEngineImpl();
export type { StockFeedCycleEngineImpl };
