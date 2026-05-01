/**
 * PeckDrillingEngine — Deep Hole Peck Drilling Calculator
 *
 * Calculates peck drilling parameters:
 * - Peck depth scheduling (decreasing peck for deep holes)
 * - Retract strategy (full retract G83 vs chip-break G73)
 * - Dwell time for chip clearing
 * - Feed reduction at breakthrough
 * - Cycle time estimation
 *
 * Key physics: As L/D increases, chip evacuation becomes
 * critical. Flute packing ratio determines when a full
 * retract is needed. Pecking clears chips and allows coolant
 * to reach the cutting edge. Peck depth should decrease with
 * hole depth due to increasing friction and heat.
 *
 * Reference: Machinery's Handbook Ch.27 (Drilling),
 *            Sandvik Deep Hole Drilling Guide,
 *            Kennametal Peck Drilling Recommendations
 *
 * Actions: peck_drilling_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface PeckDrillingInput {
  drill_diameter_mm: number;
  hole_depth_mm: number;
  material_type?: "steel" | "aluminum" | "titanium"
    | "stainless" | "cast_iron" | "brass";
  drill_type?: "twist" | "carbide" | "indexable" | "gun";
  coolant?: "flood" | "through_tool" | "mql" | "none";
  cutting_speed_mpm?: number;
  feed_per_rev_mm?: number;
  pilot_hole?: boolean;
}

export interface PeckScheduleEntry {
  peck_number: number;
  depth_from_surface: number;
  peck_depth: number;
  retract_type: "full" | "chip_break";
  dwell_seconds: number;
}

export interface PeckDrillingResult {
  ld_ratio: AtomicValue;
  cycle_type: AtomicValue;
  spindle_rpm: AtomicValue;
  feed_rate: AtomicValue;
  initial_peck_depth: AtomicValue;
  min_peck_depth: AtomicValue;
  total_pecks: AtomicValue;
  peck_schedule: PeckScheduleEntry[];
  breakthrough_feed: AtomicValue;
  cycle_time: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

const DEFAULT_VC: Record<string, number> = {
  steel: 30,
  aluminum: 80,
  titanium: 15,
  stainless: 20,
  cast_iron: 35,
  brass: 60,
};

const DEFAULT_FR: Record<string, number> = {
  steel: 0.20,
  aluminum: 0.30,
  titanium: 0.10,
  stainless: 0.15,
  cast_iron: 0.25,
  brass: 0.25,
};

/** Max L/D before special tooling needed */
const LD_LIMITS: Record<string, number> = {
  twist: 5,
  carbide: 8,
  indexable: 7,
  gun: 40,
};

// ── Engine ─────────────────────────────────────────────────────────

export class PeckDrillingEngine {
  calculate(input: PeckDrillingInput): PeckDrillingResult {
    const warnings: string[] = [];
    const D = input.drill_diameter_mm;
    const L = input.hole_depth_mm;
    const mat = input.material_type ?? "steel";
    const drillType = input.drill_type ?? "twist";
    const coolant = input.coolant ?? "flood";
    const pilot = input.pilot_hole ?? false;

    const LD = L / D;

    // Check L/D limits
    const ldLimit = LD_LIMITS[drillType] ?? 5;
    if (LD > ldLimit) {
      warnings.push(
        `L/D=${r1(LD)} exceeds ${drillType} drill limit of ${ldLimit} — ` +
        "consider gun drill or pre-drill"
      );
    }

    // Cutting parameters
    const Vc = input.cutting_speed_mpm ?? DEFAULT_VC[mat] ?? 30;
    const rpm = r0((Vc * 1000) / (Math.PI * D));
    const fr = input.feed_per_rev_mm ?? DEFAULT_FR[mat] ?? 0.20;

    // Scale feed for drill type
    const feedMult = drillType === "carbide" ? 1.2
      : drillType === "gun" ? 0.8 : 1.0;
    const adjFr = fr * feedMult;
    const feedRate = r1(adjFr * rpm);

    // Cycle type: G73 chip-break for shallow, G83 full retract for deep
    const useFullRetract = LD > 3 || coolant === "none" || coolant === "mql";
    const cycleCode = useFullRetract ? "G83" : "G73";

    // Initial peck depth: start at 1×D for shallow, reduce for deeper
    const coolantFactor = coolant === "through_tool" ? 1.5
      : coolant === "flood" ? 1.0
      : coolant === "mql" ? 0.7 : 0.5;

    const matFactor = mat === "aluminum" ? 1.3
      : mat === "brass" ? 1.2
      : mat === "titanium" ? 0.5
      : mat === "stainless" ? 0.7 : 1.0;

    const initialPeck = Math.min(
      D * coolantFactor * matFactor,
      L * 0.5
    );

    // Minimum peck depth: never less than 0.5mm or 0.1×D
    const minPeck = Math.max(0.5, D * 0.1);

    // Build peck schedule with decreasing depths
    const schedule: PeckScheduleEntry[] = [];
    let currentDepth = 0;
    let peckNum = 0;
    const decayRate = LD > 5 ? 0.85 : 0.90;

    while (currentDepth < L) {
      peckNum++;
      // Peck depth decreases with depth
      const depthFactor = Math.pow(decayRate, peckNum - 1);
      let peckDepth = Math.max(
        minPeck,
        initialPeck * depthFactor
      );

      // Don't overshoot
      if (currentDepth + peckDepth > L) {
        peckDepth = L - currentDepth;
      }

      const isDeep = (currentDepth + peckDepth) / D > 3;
      const retractType = useFullRetract || isDeep
        ? "full" as const : "chip_break" as const;

      // Dwell for chip clearing: longer for deeper holes
      const dwell = retractType === "full"
        ? r2(0.2 + (currentDepth / L) * 0.5)
        : r2(0.1);

      schedule.push({
        peck_number: peckNum,
        depth_from_surface: r2(currentDepth + peckDepth),
        peck_depth: r2(peckDepth),
        retract_type: retractType,
        dwell_seconds: dwell,
      });

      currentDepth += peckDepth;
      if (peckDepth < 0.01) break; // safety
    }

    // Breakthrough feed reduction (70% at exit to prevent grabbing)
    const breakthroughFeed = r1(feedRate * 0.7);

    // Cycle time: cutting + retract + dwell
    const cuttingTime = feedRate > 0 ? L / feedRate : 0;
    const retractTime = schedule.reduce((sum, p) => {
      const retractDist = p.retract_type === "full"
        ? p.depth_from_surface + 3 // retract to R plane + clearance
        : 1; // chip break retract ~1mm
      return sum + (retractDist / (feedRate * 3)) + p.dwell_seconds / 60;
    }, 0);
    const totalTime = cuttingTime + retractTime;

    // Warnings
    if (LD > 3 && coolant === "none") {
      warnings.push(
        "Deep hole with no coolant — high risk of chip packing"
      );
    }
    if (mat === "titanium" && LD > 4 && coolant !== "through_tool") {
      warnings.push(
        "Titanium deep drilling requires through-tool coolant"
      );
    }
    if (D < 3 && LD > 5) {
      warnings.push(
        `Small drill (${D}mm) at L/D=${r1(LD)} — high breakage risk`
      );
    }
    if (!pilot && D > 15) {
      warnings.push(
        "Large drill without pilot hole — consider spot or pilot drill first"
      );
    }

    return {
      ld_ratio: av(r1(LD), "ratio", 0.1,
        `${L}mm depth / ${D}mm dia`),
      cycle_type: av(useFullRetract ? 83 : 73, cycleCode, 0,
        useFullRetract
          ? "Full retract — deep hole"
          : "Chip break — shallow hole"),
      spindle_rpm: av(rpm, "rpm", 5,
        `Vc=${Vc} m/min, D=${D}mm`),
      feed_rate: av(feedRate, "mm/min", 5,
        `fr=${r3(adjFr)} mm/rev × ${rpm} rpm`),
      initial_peck_depth: av(r2(initialPeck), "mm", 0.1,
        `${r1(coolantFactor)}× coolant × ${r1(matFactor)}× material`),
      min_peck_depth: av(r2(minPeck), "mm", 0.05,
        "max(0.5mm, 0.1×D)"),
      total_pecks: av(peckNum, "pecks", 0,
        `Decreasing at ${r0(decayRate * 100)}% rate`),
      peck_schedule: schedule,
      breakthrough_feed: av(breakthroughFeed, "mm/min", 5,
        "70% of normal feed at exit"),
      cycle_time: av(r2(totalTime), "min", 0.1,
        `Cutting + ${schedule.length} retracts + dwell`),
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
function r3(n: number): number { return Math.round(n * 1000) / 1000; }

export const peckDrillingEngine = new PeckDrillingEngine();
