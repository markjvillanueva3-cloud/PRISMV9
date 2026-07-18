/**
 * CAMWCSOriginSelectionEngine — CAM-AI-TRAINING-MS0/U-CAMT-WCS
 *
 * Selects the Work-Coordinate-System (WCS) for a (Stock, FixtureFamily,
 * MachineClass, op-list) tuple:
 *   - WCS index (G54..G59 or G54.1 P1..P48 for extended).
 *   - Origin location (one of 12 canonical part-zero positions).
 *   - Probing routine family (touch off top + 2 edges, ring-gauge, etc).
 *
 * Pure logic. Caller passes in op-list to drive multi-WCS for tombstone
 * or sub-plate runs (every fixture station gets its own WCS).
 */
import { BaseEngine } from "./BaseEngine.js";
import type { EngineInfo, EngineCapability } from "./IEngine.js";
import type { MachineClass } from "./CAMMachineSelectionEngine.js";
import type { FixtureFamily, StockShape } from "./CAMFixtureSelectionEngine.js";

export type WCSIndex =
  | "G54" | "G55" | "G56" | "G57" | "G58" | "G59"
  | `G54.1_P${number}`;

export type OriginLocation =
  | "top_left_corner"
  | "top_right_corner"
  | "top_center"
  | "top_back_corner"
  | "spindle_face"        // turning — chuck face
  | "part_face_center"    // turning — facing end of bar
  | "fixture_pin_a"       // sub-plate / tombstone reference pin
  | "fixture_pin_b"
  | "rotary_centerline"   // 5-axis trunnion / 4th-axis pivot
  | "bore_center"         // probing into existing bore (re-fixture)
  | "ring_gauge_center"   // round stock concentric probe
  | "trunnion_pivot";     // 5-axis A/C pivot midpoint

export type ProbingRoutine =
  | "top_plus_two_edges"  // mill prismatic — corner-of-block probe
  | "bore_center_probe"   // existing bore (re-fixture run)
  | "ring_gauge_probe"    // round bar concentric
  | "face_only"           // turning — Z face touch-off only
  | "spindle_face_set"    // turning — chuck reference
  | "trunnion_pivot_set"  // 5-axis — pivot calibration
  | "tombstone_grid"      // hmc — sub-plate grid taps
  | "operator_visual";    // wedm / setup-by-eye

export interface WCSSelection {
  wcs: WCSIndex;
  origin: OriginLocation;
  probing: ProbingRoutine;
  /** Multi-WCS for tombstone / sub-plate — extra G54.1 stations. */
  additionalStations: ReadonlyArray<{ wcs: WCSIndex; origin: OriginLocation; rationale: string }>;
  rationale: string;
}

export class CAMWCSOriginSelectionEngine extends BaseEngine {
  constructor() {
    const info: EngineInfo = {
      name: "CAMWCSOriginSelectionEngine",
      version: "1.0.0",
      domain: "cam_ai_training",
      description: "Selects WCS index + origin location + probing routine for a (stock, fixture, machine) setup.",
    };
    super(info);
  }

  getCapabilities(): EngineCapability[] {
    return [
      { name: "select",     description: "Select WCS for one setup",       actions: ["cam_wcs_select"] },
      { name: "wcs_codes",  description: "List WCS index enum",            actions: ["cam_wcs_codes"] },
    ];
  }

  validate(input: unknown): string | null {
    if (input == null || typeof input !== "object") return "input must be an object";
    return null;
  }

  protected async executeImpl(_input: unknown): Promise<unknown> {
    return { engine: "CAMWCSOriginSelectionEngine", note: "use typed methods" };
  }

  /**
   * Pick WCS + origin + probing routine.
   *   - turning machines → spindle_face / part_face_center + face_only / spindle_face_set
   *   - 5-axis → trunnion_pivot or rotary_centerline + trunnion_pivot_set
   *   - hmc + tombstone → 4 stations on G54..G57 + tombstone_grid
   *   - sub_plate (multi-part) → as many G54.1 P# stations as the caller requests
   *   - default mill prismatic → G54 + top-corner + top_plus_two_edges
   */
  select(
    stockShape: StockShape,
    fixture: FixtureFamily,
    machineClass: MachineClass,
    opts?: { stations?: number; isRefixture?: boolean },
  ): WCSSelection {
    const stations = Math.max(1, opts?.stations ?? 1);

    if (machineClass === "lathe" || machineClass === "mill_turn") {
      if (fixture === "chuck_collet" || fixture === "chuck_3jaw" || fixture === "chuck_4jaw") {
        return {
          wcs: "G54",
          origin: "part_face_center",
          probing: opts?.isRefixture ? "ring_gauge_probe" : "face_only",
          additionalStations: [],
          rationale: "turning — Z origin at faced end, X at spindle centerline",
        };
      }
      return {
        wcs: "G54",
        origin: "spindle_face",
        probing: "spindle_face_set",
        additionalStations: [],
        rationale: "turning — spindle face reference",
      };
    }

    if (machineClass === "wire_edm") {
      return {
        wcs: "G54",
        origin: "fixture_pin_a",
        probing: "operator_visual",
        additionalStations: [],
        rationale: "wire-edm — operator-set datum from fixture pin",
      };
    }

    if (machineClass === "vmc_5axis" || fixture === "trunnion_table") {
      return {
        wcs: "G54",
        origin: "trunnion_pivot",
        probing: "trunnion_pivot_set",
        additionalStations: [],
        rationale: "5-axis trunnion — origin at A/C pivot midpoint",
      };
    }

    if (fixture === "rotary_4th") {
      return {
        wcs: "G54",
        origin: "rotary_centerline",
        probing: "ring_gauge_probe",
        additionalStations: [],
        rationale: "4th-axis rotary — origin on rotary centerline",
      };
    }

    if (fixture === "tombstone" || machineClass === "hmc") {
      const sides = Math.min(stations, 4);
      const extra: Array<{ wcs: WCSIndex; origin: OriginLocation; rationale: string }> = [];
      const codes: WCSIndex[] = ["G54", "G55", "G56", "G57"];
      for (let i = 1; i < sides; i++) {
        extra.push({
          wcs: codes[i],
          origin: "fixture_pin_a",
          rationale: `tombstone face ${i + 1}/4`,
        });
      }
      return {
        wcs: "G54",
        origin: "fixture_pin_a",
        probing: "tombstone_grid",
        additionalStations: extra,
        rationale: `tombstone — ${sides} face(s) on G54..G${53 + sides}`,
      };
    }

    if (fixture === "sub_plate" && stations > 1) {
      const extra: Array<{ wcs: WCSIndex; origin: OriginLocation; rationale: string }> = [];
      for (let i = 2; i <= stations; i++) {
        extra.push({
          wcs: `G54.1_P${i - 1}` as WCSIndex,
          origin: "fixture_pin_b",
          rationale: `sub-plate station ${i}/${stations}`,
        });
      }
      return {
        wcs: "G54",
        origin: "fixture_pin_a",
        probing: "tombstone_grid",
        additionalStations: extra,
        rationale: `sub-plate — ${stations} stations spanning G54 + G54.1 P1..P${stations - 1}`,
      };
    }

    if (fixture === "vacuum_table" || fixture === "magnetic_plate") {
      return {
        wcs: "G54",
        origin: "top_back_corner",
        probing: "top_plus_two_edges",
        additionalStations: [],
        rationale: "flat-on-table — back-left corner probe to clear vacuum / magnet",
      };
    }

    if (opts?.isRefixture && (stockShape === "casting_near_net" || stockShape === "irregular")) {
      return {
        wcs: "G55",
        origin: "bore_center",
        probing: "bore_center_probe",
        additionalStations: [],
        rationale: "re-fixture op2 — probe existing bore for repeatability",
      };
    }

    return {
      wcs: "G54",
      origin: "top_left_corner",
      probing: "top_plus_two_edges",
      additionalStations: [],
      rationale: "default mill prismatic — G54 at top-left corner with 3-touch probe",
    };
  }

  /** All 6 base WCS codes (extended P1..P48 reachable via G54.1 string). */
  wcs_codes(): ReadonlyArray<WCSIndex> {
    return ["G54", "G55", "G56", "G57", "G58", "G59"];
  }
}

export const camWCSOriginSelectionEngine = new CAMWCSOriginSelectionEngine();
