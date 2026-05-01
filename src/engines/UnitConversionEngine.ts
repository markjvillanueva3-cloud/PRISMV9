/**
 * UnitConversionEngine — Metric ↔ Imperial Machining Unit Conversion
 *
 * Seamless unit system toggle for all speed, feed, and machining parameters.
 * US shops work in SFM/IPM/IPR; international shops use m/min, mm/min, mm/rev.
 *
 * @engine UnitConversionEngine
 * @dispatcher calcDispatcher
 * @actions unit_convert, unit_convert_batch, unit_system_toggle
 */

// ── Conversion constants ──
const MM_PER_INCH = 25.4;
const M_PER_FT = 0.3048;

// ── Category definitions ──
type UnitCategory =
  | "length" | "speed" | "feed_rate" | "feed_per_rev" | "feed_per_tooth"
  | "depth" | "force" | "torque" | "power" | "pressure"
  | "temperature" | "surface_finish" | "volume" | "mass"
  | "density" | "mrr" | "flow_rate" | "area";

interface ConversionDef {
  metric_unit: string;
  imperial_unit: string;
  to_metric: (v: number) => number;
  to_imperial: (v: number) => number;
  description: string;
}

const CONVERSIONS: Record<string, ConversionDef> = {
  // ── Length ──
  "mm_inch": {
    metric_unit: "mm", imperial_unit: "in",
    to_metric: (v) => v * MM_PER_INCH,
    to_imperial: (v) => v / MM_PER_INCH,
    description: "Length: millimeters ↔ inches",
  },
  "m_ft": {
    metric_unit: "m", imperial_unit: "ft",
    to_metric: (v) => v * M_PER_FT,
    to_imperial: (v) => v / M_PER_FT,
    description: "Length: meters ↔ feet",
  },
  "um_uin": {
    metric_unit: "µm", imperial_unit: "µin",
    to_metric: (v) => v * 0.0254,
    to_imperial: (v) => v / 0.0254,
    description: "Surface finish: micrometers ↔ microinches",
  },

  // ── Cutting Speed ──
  "mpm_sfm": {
    metric_unit: "m/min", imperial_unit: "SFM",
    to_metric: (v) => v * M_PER_FT,
    to_imperial: (v) => v / M_PER_FT,
    description: "Cutting speed: m/min ↔ SFM",
  },
  "mps_fps": {
    metric_unit: "m/s", imperial_unit: "ft/s",
    to_metric: (v) => v * M_PER_FT,
    to_imperial: (v) => v / M_PER_FT,
    description: "Speed: m/s ↔ ft/s",
  },

  // ── Feed Rate ──
  "mmmin_ipm": {
    metric_unit: "mm/min", imperial_unit: "IPM",
    to_metric: (v) => v * MM_PER_INCH,
    to_imperial: (v) => v / MM_PER_INCH,
    description: "Feed rate: mm/min ↔ IPM (in/min)",
  },
  "mmrev_ipr": {
    metric_unit: "mm/rev", imperial_unit: "IPR",
    to_metric: (v) => v * MM_PER_INCH,
    to_imperial: (v) => v / MM_PER_INCH,
    description: "Feed per revolution: mm/rev ↔ IPR (in/rev)",
  },
  "mm_tooth_in_tooth": {
    metric_unit: "mm/tooth", imperial_unit: "in/tooth",
    to_metric: (v) => v * MM_PER_INCH,
    to_imperial: (v) => v / MM_PER_INCH,
    description: "Feed per tooth: mm/tooth ↔ in/tooth",
  },

  // ── Depth of Cut ──
  "doc_mm_inch": {
    metric_unit: "mm", imperial_unit: "in",
    to_metric: (v) => v * MM_PER_INCH,
    to_imperial: (v) => v / MM_PER_INCH,
    description: "Depth of cut: mm ↔ inches",
  },

  // ── Force ──
  "n_lbf": {
    metric_unit: "N", imperial_unit: "lbf",
    to_metric: (v) => v * 4.44822,
    to_imperial: (v) => v / 4.44822,
    description: "Force: Newtons ↔ pounds-force",
  },
  "kn_lbf": {
    metric_unit: "kN", imperial_unit: "lbf",
    to_metric: (v) => v * 4448.22 / 1000,
    to_imperial: (v) => v * 1000 / 4448.22,
    description: "Force: kilonewtons ↔ pounds-force",
  },

  // ── Torque ──
  "nm_ftlb": {
    metric_unit: "N·m", imperial_unit: "ft·lb",
    to_metric: (v) => v * 1.35582,
    to_imperial: (v) => v / 1.35582,
    description: "Torque: Newton-meters ↔ foot-pounds",
  },
  "nm_inlb": {
    metric_unit: "N·m", imperial_unit: "in·lb",
    to_metric: (v) => v * 0.112985,
    to_imperial: (v) => v / 0.112985,
    description: "Torque: Newton-meters ↔ inch-pounds",
  },

  // ── Power ──
  "kw_hp": {
    metric_unit: "kW", imperial_unit: "HP",
    to_metric: (v) => v * 0.7457,
    to_imperial: (v) => v / 0.7457,
    description: "Power: kilowatts ↔ horsepower",
  },

  // ── Pressure / Specific Force ──
  "mpa_psi": {
    metric_unit: "MPa", imperial_unit: "psi",
    to_metric: (v) => v * 0.00689476,
    to_imperial: (v) => v / 0.00689476,
    description: "Pressure: MPa ↔ psi",
  },
  "nmm2_psi": {
    metric_unit: "N/mm²", imperial_unit: "psi",
    to_metric: (v) => v * 0.00689476,
    to_imperial: (v) => v / 0.00689476,
    description: "Specific force: N/mm² ↔ psi",
  },

  // ── Temperature ──
  "c_f": {
    metric_unit: "°C", imperial_unit: "°F",
    to_metric: (v) => (v - 32) * 5 / 9,
    to_imperial: (v) => v * 9 / 5 + 32,
    description: "Temperature: Celsius ↔ Fahrenheit",
  },

  // ── Volume / MRR ──
  "cm3min_in3min": {
    metric_unit: "cm³/min", imperial_unit: "in³/min",
    to_metric: (v) => v * 16.3871,
    to_imperial: (v) => v / 16.3871,
    description: "MRR: cm³/min ↔ in³/min",
  },

  // ── Mass / Density ──
  "kg_lb": {
    metric_unit: "kg", imperial_unit: "lb",
    to_metric: (v) => v * 0.453592,
    to_imperial: (v) => v / 0.453592,
    description: "Mass: kg ↔ pounds",
  },
  "kg_m3_lb_in3": {
    metric_unit: "kg/m³", imperial_unit: "lb/in³",
    to_metric: (v) => v * 27679.9,
    to_imperial: (v) => v / 27679.9,
    description: "Density: kg/m³ ↔ lb/in³",
  },

  // ── Flow Rate (coolant) ──
  "lpm_gpm": {
    metric_unit: "L/min", imperial_unit: "GPM",
    to_metric: (v) => v * 3.78541,
    to_imperial: (v) => v / 3.78541,
    description: "Flow rate: liters/min ↔ gallons/min",
  },

  // ── Area ──
  "mm2_in2": {
    metric_unit: "mm²", imperial_unit: "in²",
    to_metric: (v) => v * 645.16,
    to_imperial: (v) => v / 645.16,
    description: "Area: mm² ↔ in²",
  },
};

// ── RPM Helpers (not a unit conversion per se, but critical for S&F) ──
// RPM = (Vc × 1000) / (π × D)  [metric: Vc in m/min, D in mm]
// RPM = (SFM × 12) / (π × D)   [imperial: SFM, D in inches]

export interface ConvertResult {
  from_value: number;
  from_unit: string;
  to_value: number;
  to_unit: string;
  conversion: string;
  direction: "to_metric" | "to_imperial";
}

export interface MachiningParamSet {
  cutting_speed?: number;    // m/min or SFM
  feed_rate?: number;        // mm/min or IPM
  feed_per_rev?: number;     // mm/rev or IPR
  feed_per_tooth?: number;   // mm/tooth or in/tooth
  depth_of_cut?: number;     // mm or in
  stepover?: number;         // mm or in
  tool_diameter?: number;    // mm or in
  rpm?: number;              // RPM (unit-independent)
  force?: number;            // N or lbf
  torque?: number;           // N·m or ft·lb
  power?: number;            // kW or HP
  surface_finish?: number;   // µm or µin
  mrr?: number;              // cm³/min or in³/min
  temperature?: number;      // °C or °F
}

export class UnitConversionEngine {
  /** Convert a single value between unit systems. */
  convert(input: {
    value: number;
    conversion: string;         // key from CONVERSIONS table (e.g., "mpm_sfm")
    direction: "to_metric" | "to_imperial";
  }): ConvertResult {
    const conv = CONVERSIONS[input.conversion];
    if (!conv) throw new Error(`Unknown conversion: ${input.conversion}. Options: ${Object.keys(CONVERSIONS).join(", ")}`);

    const result = input.direction === "to_metric"
      ? conv.to_metric(input.value)
      : conv.to_imperial(input.value);

    return {
      from_value: input.value,
      from_unit: input.direction === "to_metric" ? conv.imperial_unit : conv.metric_unit,
      to_value: Math.round(result * 10000) / 10000,
      to_unit: input.direction === "to_metric" ? conv.metric_unit : conv.imperial_unit,
      conversion: input.conversion,
      direction: input.direction,
    };
  }

  /** Convert a batch of values at once. */
  convertBatch(inputs: Array<{ value: number; conversion: string; direction: "to_metric" | "to_imperial" }>): ConvertResult[] {
    return inputs.map(i => this.convert(i));
  }

  /**
   * Toggle a full machining parameter set between metric and imperial.
   * Input all values in one system, get them all in the other.
   */
  toggleSystem(input: {
    params: MachiningParamSet;
    from_system: "metric" | "imperial";
  }): { params: MachiningParamSet; system: string; conversions_applied: string[] } {
    const p = input.params;
    const toMetric = input.from_system === "imperial";
    const dir: "to_metric" | "to_imperial" = toMetric ? "to_metric" : "to_imperial";
    const applied: string[] = [];
    const out: MachiningParamSet = { rpm: p.rpm }; // RPM is unit-independent

    if (p.cutting_speed !== undefined) {
      out.cutting_speed = this.convert({ value: p.cutting_speed, conversion: "mpm_sfm", direction: dir }).to_value;
      applied.push("mpm_sfm");
    }
    if (p.feed_rate !== undefined) {
      out.feed_rate = this.convert({ value: p.feed_rate, conversion: "mmmin_ipm", direction: dir }).to_value;
      applied.push("mmmin_ipm");
    }
    if (p.feed_per_rev !== undefined) {
      out.feed_per_rev = this.convert({ value: p.feed_per_rev, conversion: "mmrev_ipr", direction: dir }).to_value;
      applied.push("mmrev_ipr");
    }
    if (p.feed_per_tooth !== undefined) {
      out.feed_per_tooth = this.convert({ value: p.feed_per_tooth, conversion: "mm_tooth_in_tooth", direction: dir }).to_value;
      applied.push("mm_tooth_in_tooth");
    }
    if (p.depth_of_cut !== undefined) {
      out.depth_of_cut = this.convert({ value: p.depth_of_cut, conversion: "mm_inch", direction: dir }).to_value;
      applied.push("mm_inch (DOC)");
    }
    if (p.stepover !== undefined) {
      out.stepover = this.convert({ value: p.stepover, conversion: "mm_inch", direction: dir }).to_value;
      applied.push("mm_inch (stepover)");
    }
    if (p.tool_diameter !== undefined) {
      out.tool_diameter = this.convert({ value: p.tool_diameter, conversion: "mm_inch", direction: dir }).to_value;
      applied.push("mm_inch (tool dia)");
    }
    if (p.force !== undefined) {
      out.force = this.convert({ value: p.force, conversion: "n_lbf", direction: dir }).to_value;
      applied.push("n_lbf");
    }
    if (p.torque !== undefined) {
      out.torque = this.convert({ value: p.torque, conversion: "nm_ftlb", direction: dir }).to_value;
      applied.push("nm_ftlb");
    }
    if (p.power !== undefined) {
      out.power = this.convert({ value: p.power, conversion: "kw_hp", direction: dir }).to_value;
      applied.push("kw_hp");
    }
    if (p.surface_finish !== undefined) {
      out.surface_finish = this.convert({ value: p.surface_finish, conversion: "um_uin", direction: dir }).to_value;
      applied.push("um_uin");
    }
    if (p.mrr !== undefined) {
      out.mrr = this.convert({ value: p.mrr, conversion: "cm3min_in3min", direction: dir }).to_value;
      applied.push("cm3min_in3min");
    }
    if (p.temperature !== undefined) {
      out.temperature = this.convert({ value: p.temperature, conversion: "c_f", direction: dir }).to_value;
      applied.push("c_f");
    }

    return {
      params: out,
      system: toMetric ? "metric" : "imperial",
      conversions_applied: applied,
    };
  }

  /** RPM calculator: from cutting speed + diameter in either unit system. */
  rpmCalc(input: {
    cutting_speed: number;
    diameter: number;
    system: "metric" | "imperial";
  }): { rpm: number; cutting_speed: number; diameter: number; system: string; formula: string } {
    let rpm: number;
    if (input.system === "metric") {
      // RPM = (Vc × 1000) / (π × D)
      rpm = (input.cutting_speed * 1000) / (Math.PI * input.diameter);
    } else {
      // RPM = (SFM × 12) / (π × D)
      rpm = (input.cutting_speed * 12) / (Math.PI * input.diameter);
    }
    return {
      rpm: Math.round(rpm),
      cutting_speed: input.cutting_speed,
      diameter: input.diameter,
      system: input.system,
      formula: input.system === "metric"
        ? `RPM = (${input.cutting_speed} × 1000) / (π × ${input.diameter}) = ${Math.round(rpm)}`
        : `RPM = (${input.cutting_speed} × 12) / (π × ${input.diameter}) = ${Math.round(rpm)}`,
    };
  }

  /** List all available conversions. */
  listConversions(): Array<{ key: string; metric: string; imperial: string; description: string }> {
    return Object.entries(CONVERSIONS).map(([key, c]) => ({
      key, metric: c.metric_unit, imperial: c.imperial_unit, description: c.description,
    }));
  }
}

export const unitConversionEngine = new UnitConversionEngine();
