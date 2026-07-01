/**
 * MonolithMachineSpecStandardEngine — U-DB-MONOLITH-MACHINE-SPEC-LOADER
 *
 * TS-typed port of `PRISM_MACHINE_SPEC_STANDARD.js` from the v8.89 monolith
 * extraction (`extracted/machines/PRISM_MACHINE_SPEC_STANDARD.js`).
 *
 * This monolith module is NOT a populated data catalog — it's the
 * **canonical schema contract** for machine specifications across PRISM.
 * Closes the gap that the monolith defined a 9-section template
 * (identification, axes, spindle, table, toolChanger, performance,
 * physical, kinematics) plus standardize() + validateSpec() utilities,
 * but no live engine consumed it. Without this, every consumer of machine
 * data invents its own shape — schema drift is a silent risk for any
 * cross-machine analytics.
 *
 * Public surface:
 *   - `MachineSpecStandard` interface (the typed schema)
 *   - `emptySpec()` — fresh template instance
 *   - `standardize(legacy)` — normalize legacy machine data → standard shape
 *   - `validateSpec(spec)` — check completeness of required fields
 *   - `requiredFields()` — list of fields that must be populated to validate
 *   - `stats()` — telemetry (section count + required field count)
 *
 * @milestone JULIETT-DB-BRIDGE-MS0/U-DB-MONOLITH-MACHINE-SPEC-LOADER
 *   (slot juliett, 2026-05-26)
 * @source extracted/machines/PRISM_MACHINE_SPEC_STANDARD.js (PRISM v8.89)
 */

// ── Schema (canonical machine-spec shape from the monolith) ──────────────

export interface AxisTravel {
  min: number;
  max: number;
  units: string;
}

export interface MachineSpecIdentification {
  manufacturer: string;
  model: string;
  /** VMC | HMC | Lathe | Mill-Turn | Swiss | EDM | Grinder | ... */
  type: string;
  series: string;
  controller: string;
}

export interface MachineSpecAxes {
  count: number;
  /** "3-axis" | "4-axis" | "5-axis table-table" | "5-axis head-head" | ... */
  configuration: string;
  travel: {
    x: AxisTravel;
    y: AxisTravel;
    z: AxisTravel;
    a: AxisTravel;
    b: AxisTravel;
    c: AxisTravel;
  };
}

export interface MachineSpecSpindle {
  maxRPM: number;
  spindleHP: number;
  spindleKW: number;
  /** "BT30" | "BT40" | "CAT40" | "HSK-A63" | ... */
  taper: string;
  bearingType: string;
  /** "vertical" | "horizontal" */
  orientation: string;
}

export interface MachineSpecTable {
  width: number;
  length: number;
  /** For rotary tables (diameter). */
  diameter: number;
  tSlots: number;
  loadCapacity: number;
  units: string;
}

export interface MachineSpecToolChanger {
  /** "Drum" | "Carousel" | "Chain" | "Matrix" */
  type: string;
  capacity: number;
  maxToolDiameter: number;
  maxToolLength: number;
  maxToolWeight: number;
  /** Seconds. */
  changeTime: number;
  /** Seconds. */
  chipToChip: number;
}

export interface MachineSpecPerformance {
  rapidTraverse: { x: number; y: number; z: number; units: string };
  feedRate: { max: number; units: string };
  accuracy: { positioning: number; repeatability: number; units: string };
}

export interface MachineSpecPhysical {
  weight: number;
  footprint: { width: number; depth: number; height: number };
  powerRequirement: number;
  airRequirement: number;
}

export interface MachineSpecKinematics {
  /** For 5-axis: "table-table" | "head-head" | "table-head" */
  type: string;
  pivotPoint: { x: number; y: number; z: number };
  rotarySpeed: { a: number; b: number; c: number; units: string };
}

export interface MachineSpecStandard {
  identification: MachineSpecIdentification;
  axes: MachineSpecAxes;
  spindle: MachineSpecSpindle;
  table: MachineSpecTable;
  toolChanger: MachineSpecToolChanger;
  performance: MachineSpecPerformance;
  physical: MachineSpecPhysical;
  kinematics: MachineSpecKinematics;
}

export interface ValidateResult {
  valid: boolean;
  missing: string[];
  /** Percentage 0..100. */
  completeness: number;
}

// ── Required-fields contract (from monolith.validateSpec) ─────────────────

const REQUIRED_FIELDS: readonly string[] = [
  "identification.model",
  "axes.count",
  "spindle.maxRPM",
];

// ── Template (canonical empty spec — from monolith.specTemplate) ─────────

function freshAxisTravel(units: string): AxisTravel {
  return { min: 0, max: 0, units };
}

function freshSpec(): MachineSpecStandard {
  return {
    identification: { manufacturer: "", model: "", type: "", series: "", controller: "" },
    axes: {
      count: 0,
      configuration: "",
      travel: {
        x: freshAxisTravel("mm"),
        y: freshAxisTravel("mm"),
        z: freshAxisTravel("mm"),
        a: freshAxisTravel("deg"),
        b: freshAxisTravel("deg"),
        c: freshAxisTravel("deg"),
      },
    },
    spindle: { maxRPM: 0, spindleHP: 0, spindleKW: 0, taper: "", bearingType: "", orientation: "vertical" },
    table: { width: 0, length: 0, diameter: 0, tSlots: 0, loadCapacity: 0, units: "mm/kg" },
    toolChanger: { type: "", capacity: 0, maxToolDiameter: 0, maxToolLength: 0, maxToolWeight: 0, changeTime: 0, chipToChip: 0 },
    performance: {
      rapidTraverse: { x: 0, y: 0, z: 0, units: "m/min" },
      feedRate: { max: 0, units: "mm/min" },
      accuracy: { positioning: 0, repeatability: 0, units: "mm" },
    },
    physical: { weight: 0, footprint: { width: 0, depth: 0, height: 0 }, powerRequirement: 0, airRequirement: 0 },
    kinematics: { type: "", pivotPoint: { x: 0, y: 0, z: 0 }, rotarySpeed: { a: 0, b: 0, c: 0, units: "deg/sec" } },
  };
}

// ── Engine ────────────────────────────────────────────────────────────────

export class MonolithMachineSpecStandardEngine {
  /** Fresh template instance. Pure — caller can safely mutate. */
  emptySpec(): MachineSpecStandard {
    return freshSpec();
  }

  /**
   * Normalize legacy machine data into the canonical standard shape.
   * Mirrors the monolith's `standardize()` semantics:
   *   - copy identification.{manufacturer,model,type,controller} when present
   *   - copy travel.{x,y,z} numeric → axes.travel.{x,y,z}.max
   *   - copy spindle.{maxRPM,spindleHP,spindleKW,taper}
   *   - copy toolChanger.{capacity,changeTime,chipToChip}
   *   - copy rapidTraverse + accuracy verbatim into performance
   */
  standardize(legacy: unknown): MachineSpecStandard {
    const out = freshSpec();
    if (!legacy || typeof legacy !== "object") return out;
    const data = legacy as Record<string, unknown>;

    // Identification
    for (const k of ["manufacturer", "model", "type", "controller"] as const) {
      if (typeof data[k] === "string") {
        out.identification[k] = data[k] as string;
      }
    }
    if (typeof data["series"] === "string") {
      out.identification.series = data["series"] as string;
    }

    // Travel — copy numeric x/y/z into axes.travel.{...}.max
    const travel = data.travel;
    if (travel && typeof travel === "object") {
      const t = travel as Record<string, unknown>;
      if (typeof t.x === "number") out.axes.travel.x.max = t.x;
      if (typeof t.y === "number") out.axes.travel.y.max = t.y;
      if (typeof t.z === "number") out.axes.travel.z.max = t.z;
    }

    // Spindle — nested OR top-level fallback
    const spindle = data.spindle;
    if (spindle && typeof spindle === "object") {
      const s = spindle as Record<string, unknown>;
      out.spindle.maxRPM    = pickNumber(s.maxRPM,    data.maxRPM)    ?? out.spindle.maxRPM;
      out.spindle.spindleHP = pickNumber(s.spindleHP, data.spindleHP) ?? out.spindle.spindleHP;
      out.spindle.spindleKW = pickNumber(s.spindleKW, data.spindleKW) ?? out.spindle.spindleKW;
      const taper = pickString(s.taper, data.taper);
      if (taper !== null) out.spindle.taper = taper;
    }

    // Tool changer — nested OR top-level fallback
    const tc = data.toolChanger;
    if (tc && typeof tc === "object") {
      const t = tc as Record<string, unknown>;
      out.toolChanger.capacity    = pickNumber(t.capacity,    data.toolCapacity) ?? out.toolChanger.capacity;
      out.toolChanger.changeTime  = pickNumber(t.changeTime)  ?? out.toolChanger.changeTime;
      out.toolChanger.chipToChip  = pickNumber(t.chipToChip)  ?? out.toolChanger.chipToChip;
    }

    // Performance — rapid + accuracy verbatim copy
    if (data.rapidTraverse && typeof data.rapidTraverse === "object") {
      out.performance.rapidTraverse = data.rapidTraverse as MachineSpecPerformance["rapidTraverse"];
    }
    if (data.accuracy && typeof data.accuracy === "object") {
      out.performance.accuracy = data.accuracy as MachineSpecPerformance["accuracy"];
    }

    return out;
  }

  /**
   * Check completeness: returns valid:true only when all REQUIRED_FIELDS
   * are truthy. Mirrors the monolith's `validateSpec()` semantics exactly.
   */
  validateSpec(spec: unknown): ValidateResult {
    const missing: string[] = [];
    if (!spec || typeof spec !== "object") {
      return { valid: false, missing: [...REQUIRED_FIELDS], completeness: 0 };
    }
    for (const field of REQUIRED_FIELDS) {
      const parts = field.split(".");
      let value: unknown = spec;
      for (const part of parts) {
        if (value && typeof value === "object" && part in value) {
          value = (value as Record<string, unknown>)[part];
        } else {
          value = undefined;
          break;
        }
      }
      if (!value) missing.push(field);
    }
    return {
      valid: missing.length === 0,
      missing,
      completeness: ((REQUIRED_FIELDS.length - missing.length) / REQUIRED_FIELDS.length) * 100,
    };
  }

  /** The list of fields validateSpec() requires. */
  requiredFields(): readonly string[] {
    return REQUIRED_FIELDS;
  }

  /** Counts — telemetry. */
  stats(): { sections: number; required_fields: number; axis_count: number } {
    return {
      sections: 8, // identification + axes + spindle + table + toolChanger + performance + physical + kinematics
      required_fields: REQUIRED_FIELDS.length,
      axis_count: 6, // x y z a b c
    };
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────

function pickNumber(...candidates: unknown[]): number | null {
  for (const c of candidates) {
    if (typeof c === "number" && Number.isFinite(c)) return c;
  }
  return null;
}

function pickString(...candidates: unknown[]): string | null {
  for (const c of candidates) {
    if (typeof c === "string" && c !== "") return c;
  }
  return null;
}

export const monolithMachineSpecStandardEngine = new MonolithMachineSpecStandardEngine();
