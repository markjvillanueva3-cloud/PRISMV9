/**
 * SlottingEngine — Slot Milling Parameter Calculator
 *
 * Calculates slot milling parameters:
 * - Full-slot (tool = slot width) vs partial engagement
 * - Axial depth scheduling for deep slots
 * - Feed reduction for full-width slotting
 * - Chip thinning compensation
 * - Ramp-in vs plunge entry strategy
 *
 * Key physics: Full-slot milling wraps the tool 180°,
 * creating maximum thermal load and chip re-cutting risk.
 * Feed should be reduced 40-50% vs side milling. For deep
 * slots, use axial stepping with good chip evacuation.
 * Trochoidal milling is preferred for hard materials.
 *
 * Reference: Sandvik Slot Milling Guide,
 *            Machinery's Handbook Ch.28 (Milling),
 *            Kennametal Full-Slot Application Notes
 *
 * Actions: slot_milling_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface SlottingInput {
  slot_width_mm: number;
  slot_depth_mm: number;
  slot_length_mm: number;
  tool_diameter_mm?: number;
  flutes?: number;
  material_type?: "steel" | "aluminum" | "titanium"
    | "stainless" | "cast_iron";
  cutting_speed_mpm?: number;
  feed_per_tooth_mm?: number;
  closed_slot?: boolean;
}

export interface SlottingResult {
  tool_diameter: AtomicValue;
  engagement_type: AtomicValue;
  engagement_angle: AtomicValue;
  axial_depth_per_pass: AtomicValue;
  number_of_passes: AtomicValue;
  spindle_rpm: AtomicValue;
  feed_rate: AtomicValue;
  adjusted_feed: AtomicValue;
  entry_strategy: AtomicValue;
  mrr: AtomicValue;
  cycle_time: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

const DEFAULT_VC: Record<string, number> = {
  steel: 100,
  aluminum: 250,
  titanium: 45,
  stainless: 70,
  cast_iron: 90,
};

const DEFAULT_FZ: Record<string, number> = {
  steel: 0.08,
  aluminum: 0.12,
  titanium: 0.05,
  stainless: 0.06,
  cast_iron: 0.10,
};

// ── Engine ─────────────────────────────────────────────────────────

export class SlottingEngine {
  calculate(input: SlottingInput): SlottingResult {
    const warnings: string[] = [];
    const Ws = input.slot_width_mm;
    const Ds = input.slot_depth_mm;
    const Ls = input.slot_length_mm;
    const mat = input.material_type ?? "steel";
    const closed = input.closed_slot ?? true;

    // Tool diameter: for full-slot, Dt = Ws; else user-specified
    const Dt = input.tool_diameter_mm ?? Ws;
    const flutes = input.flutes ?? (mat === "aluminum" ? 3 : 4);

    // Determine engagement type
    const isFullSlot = Math.abs(Dt - Ws) < 0.1;
    const engagementAngle = isFullSlot ? 180
      : (Math.acos(1 - Ws / Dt) * 180) / Math.PI * 2;

    // Cutting speed
    const Vc = input.cutting_speed_mpm ?? DEFAULT_VC[mat] ?? 100;
    const rpm = r0((Vc * 1000) / (Math.PI * Dt));

    // Base feed per tooth
    const baseFz = input.feed_per_tooth_mm ?? DEFAULT_FZ[mat] ?? 0.08;

    // Full-slot feed reduction: 40-50% depending on material
    const feedReduction = isFullSlot
      ? (mat === "titanium" || mat === "stainless" ? 0.5 : 0.6)
      : 1.0;
    const adjFz = baseFz * feedReduction;
    const baseFeed = r1(baseFz * flutes * rpm);
    const adjFeed = r1(adjFz * flutes * rpm);

    // Axial depth per pass
    const maxAp = isFullSlot
      ? Math.min(Dt * 0.5, 10)
      : Math.min(Dt * 1.0, 20);
    const ap = Math.min(maxAp, Ds);
    const nPasses = Math.ceil(Ds / ap);

    // Entry strategy
    let entry: string;
    if (closed && isFullSlot) {
      entry = "ramp";
      if (Ds > Dt * 0.8) {
        entry = "helical_ramp";
      }
    } else if (closed) {
      entry = "ramp";
    } else {
      entry = "direct";
    }

    // MRR: Ws × ap × feed (cm³/min)
    const mrrVal = (Ws * ap * adjFeed) / 1000;

    // Cycle time: passes × length / feed + entry time
    const entryTime = entry === "helical_ramp"
      ? (Ds / (adjFeed * 0.3)) // slow helical entry
      : entry === "ramp"
        ? (ap * 3) / adjFeed // ramp over 3× depth distance
        : 0;
    const cuttingTime = nPasses * (Ls / adjFeed);
    const totalTime = cuttingTime + entryTime * nPasses;

    // Warnings
    if (isFullSlot && Ds > Dt * 1.5) {
      warnings.push(
        "Deep full-slot (>1.5×D) — risk of chip packing and vibration"
      );
    }
    if (Dt > Ws * 1.1 && Dt < Ws * 2) {
      warnings.push(
        "Tool slightly wider than slot — cannot cut slot width"
      );
    }
    if (isFullSlot && mat === "titanium") {
      warnings.push(
        "Full-slot in titanium — consider trochoidal milling instead"
      );
    }
    if (closed && isFullSlot && Dt < 4) {
      warnings.push(
        "Small tool in closed full-slot — high breakage risk"
      );
    }
    if (flutes > 3 && isFullSlot) {
      warnings.push(
        "Full-slot with many flutes — reduce to 2-3 flutes " +
        "for chip space"
      );
    }

    return {
      tool_diameter: av(Dt, "mm", 0,
        isFullSlot ? "Full-slot: tool = width" : "User specified"),
      engagement_type: av(isFullSlot ? 1 : 0,
        isFullSlot ? "full_slot" : "partial", 0,
        isFullSlot ? "180° wrap" : `${r0(engagementAngle)}° wrap`),
      engagement_angle: av(r0(engagementAngle), "deg", 1,
        isFullSlot ? "Full engagement" : "Partial engagement"),
      axial_depth_per_pass: av(r2(ap), "mm", 0.1,
        isFullSlot ? "Max 0.5×D for full-slot" : "Max 1.0×D"),
      number_of_passes: av(nPasses, "passes", 0,
        `${Ds}mm / ${r2(ap)}mm per pass`),
      spindle_rpm: av(rpm, "rpm", 5,
        `Vc=${Vc} at Ø${Dt}mm`),
      feed_rate: av(baseFeed, "mm/min", 5,
        `fz=${baseFz} × ${flutes}fl × ${rpm}rpm`),
      adjusted_feed: av(adjFeed, "mm/min", 5,
        isFullSlot
          ? `${r0(feedReduction * 100)}% of base for full-slot`
          : "No reduction — partial engagement"),
      entry_strategy: av(
        entry === "helical_ramp" ? 2 : entry === "ramp" ? 1 : 0,
        entry, 0,
        closed ? "Closed slot requires ramp/helical entry" : "Open entry"),
      mrr: av(r2(mrrVal), "cm³/min", 0.5,
        `W×ap×feed / 1000`),
      cycle_time: av(r2(totalTime), "min", 0.1,
        `${nPasses} passes × ${Ls}mm + entry`),
      warnings,
    };
  }
}

// ── Helpers ───────────────────────────────────────────────────────

function av(
  value: number, unit: string,
  uncertainty: number, source: string
): AtomicValue {
  return { value, unit, uncertainty, source };
}

function r0(n: number): number { return Math.round(n); }
function r1(n: number): number { return Math.round(n * 10) / 10; }
function r2(n: number): number { return Math.round(n * 100) / 100; }

export const slottingEngine = new SlottingEngine();
