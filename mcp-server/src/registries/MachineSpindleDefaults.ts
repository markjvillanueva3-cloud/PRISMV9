/**
 * PRISM MCP Server — Machine Spindle Default Lookup Tables
 * S1-MS1 P2-U02: Enrichment data for spindle power, torque, RPM
 *
 * Sources: Modern Machine Shop specs, manufacturer catalogs (Haas, DMG MORI,
 * Mazak, Okuma, Doosan, Makino), CNC Cookbook reference tables.
 *
 * These are conservative mid-range defaults per machine type.
 * Actual values vary by make/model — these serve as reasonable fallbacks
 * for SFC power/torque calculations when catalog data is unavailable.
 *
 * SAFETY NOTE: For power-limited SFC calculations, using conservative (lower)
 * defaults is safer — it will reduce recommended parameters rather than
 * recommend cuts that exceed machine capability.
 */

// ============================================================================
// SPINDLE DEFAULTS BY MACHINE TYPE
// ============================================================================

export interface MachineSpindleDefault {
  /** Max spindle speed in RPM */
  max_rpm: number;
  /** Min spindle speed in RPM */
  min_rpm: number;
  /** Continuous spindle power in kW */
  power_continuous: number;
  /** 30-minute rated power in kW (typically 120-130% of continuous) */
  power_30min: number;
  /** Max torque in Nm (at low speed) */
  torque_max: number;
  /** Continuous torque in Nm */
  torque_continuous: number;
  /** Typical spindle taper */
  spindle_nose: string;
  /** Coolant through spindle */
  coolant_through: boolean;
  /** Typical coolant pressure in bar (if through-spindle) */
  coolant_pressure: number;
  /** Confidence level */
  confidence: "catalog" | "handbook" | "estimated";
  /** Notes */
  notes: string;
}

/**
 * Spindle defaults keyed by normalized machine type.
 */
export const MACHINE_SPINDLE_DEFAULTS: Record<string, MachineSpindleDefault> = {
  // === VERTICAL MACHINING CENTERS ===
  "vertical_machining_center": {
    max_rpm: 10000,
    min_rpm: 50,
    power_continuous: 11,
    power_30min: 15,
    torque_max: 120,
    torque_continuous: 70,
    spindle_nose: "BT40",
    coolant_through: true,
    coolant_pressure: 20,
    confidence: "catalog",
    notes: "Mid-range 40-taper VMC (Haas VF-2/DMG CMX 600V class)"
  },
  "3axis_vmc": {
    max_rpm: 10000,
    min_rpm: 50,
    power_continuous: 11,
    power_30min: 15,
    torque_max: 120,
    torque_continuous: 70,
    spindle_nose: "BT40",
    coolant_through: true,
    coolant_pressure: 20,
    confidence: "catalog",
    notes: "Standard 3-axis VMC — same as vertical_machining_center"
  },
  "vmc": {
    max_rpm: 10000,
    min_rpm: 50,
    power_continuous: 11,
    power_30min: 15,
    torque_max: 120,
    torque_continuous: 70,
    spindle_nose: "BT40",
    coolant_through: true,
    coolant_pressure: 20,
    confidence: "catalog",
    notes: "Generic VMC classification"
  },

  // === HORIZONTAL MACHINING CENTERS ===
  "horizontal_machining_center": {
    max_rpm: 10000,
    min_rpm: 30,
    power_continuous: 15,
    power_30min: 18.5,
    torque_max: 200,
    torque_continuous: 120,
    spindle_nose: "BT40",
    coolant_through: true,
    coolant_pressure: 70,
    confidence: "catalog",
    notes: "Mid-range HMC (Mazak HCN-5000/Makino a61nx class)"
  },
  "hmc": {
    max_rpm: 10000,
    min_rpm: 30,
    power_continuous: 15,
    power_30min: 18.5,
    torque_max: 200,
    torque_continuous: 120,
    spindle_nose: "BT40",
    coolant_through: true,
    coolant_pressure: 70,
    confidence: "catalog",
    notes: "Generic HMC classification"
  },

  // === 5-AXIS MACHINING CENTERS ===
  "5axis_machining_center": {
    max_rpm: 12000,
    min_rpm: 50,
    power_continuous: 18.5,
    power_30min: 22,
    torque_max: 150,
    torque_continuous: 90,
    spindle_nose: "HSK-A63",
    coolant_through: true,
    coolant_pressure: 40,
    confidence: "catalog",
    notes: "Mid-range 5-axis (DMG DMU 50/Mazak VARIAXIS class)"
  },
  "5axis_trunnion": {
    max_rpm: 12000,
    min_rpm: 50,
    power_continuous: 18.5,
    power_30min: 22,
    torque_max: 150,
    torque_continuous: 90,
    spindle_nose: "HSK-A63",
    coolant_through: true,
    coolant_pressure: 40,
    confidence: "catalog",
    notes: "5-axis trunnion table — same spindle as 5-axis"
  },
  "5axis": {
    max_rpm: 12000,
    min_rpm: 50,
    power_continuous: 18.5,
    power_30min: 22,
    torque_max: 150,
    torque_continuous: 90,
    spindle_nose: "HSK-A63",
    coolant_through: true,
    coolant_pressure: 40,
    confidence: "catalog",
    notes: "Generic 5-axis classification"
  },
  "5axis_mill_turn": {
    max_rpm: 12000,
    min_rpm: 10,
    power_continuous: 22,
    power_30min: 26,
    torque_max: 200,
    torque_continuous: 130,
    spindle_nose: "HSK-A63",
    coolant_through: true,
    coolant_pressure: 70,
    confidence: "catalog",
    notes: "5-axis mill-turn — higher power for turning operations"
  },

  // === TURNING CENTERS ===
  "turning_center": {
    max_rpm: 4500,
    min_rpm: 20,
    power_continuous: 15,
    power_30min: 18.5,
    torque_max: 350,
    torque_continuous: 200,
    spindle_nose: "A2-6",
    coolant_through: false,
    coolant_pressure: 0,
    confidence: "catalog",
    notes: "Mid-range CNC lathe (Haas ST-20/Doosan Puma class)"
  },
  "lathe": {
    max_rpm: 4500,
    min_rpm: 20,
    power_continuous: 15,
    power_30min: 18.5,
    torque_max: 350,
    torque_continuous: 200,
    spindle_nose: "A2-6",
    coolant_through: false,
    coolant_pressure: 0,
    confidence: "catalog",
    notes: "Generic CNC lathe classification"
  },
  "2-axis_slant_bed": {
    max_rpm: 4500,
    min_rpm: 20,
    power_continuous: 15,
    power_30min: 18.5,
    torque_max: 350,
    torque_continuous: 200,
    spindle_nose: "A2-6",
    coolant_through: false,
    coolant_pressure: 0,
    confidence: "catalog",
    notes: "2-axis slant bed lathe"
  },

  // === MILL-TURN CENTERS ===
  "mill_turn_center": {
    max_rpm: 5000,
    min_rpm: 10,
    power_continuous: 18.5,
    power_30min: 22,
    torque_max: 450,
    torque_continuous: 280,
    spindle_nose: "A2-6",
    coolant_through: true,
    coolant_pressure: 20,
    confidence: "catalog",
    notes: "Mill-turn center (Mazak INTEGREX/DMG CTX beta class)"
  },
  "multi_spindle": {
    max_rpm: 6000,
    min_rpm: 20,
    power_continuous: 11,
    power_30min: 15,
    torque_max: 200,
    torque_continuous: 120,
    spindle_nose: "A2-5",
    coolant_through: true,
    coolant_pressure: 20,
    confidence: "estimated",
    notes: "Multi-spindle automatic — per-spindle values"
  },

  // === SWISS-TYPE LATHES ===
  "swiss_lathe": {
    max_rpm: 10000,
    min_rpm: 50,
    power_continuous: 3.7,
    power_30min: 5.5,
    torque_max: 16,
    torque_continuous: 10,
    spindle_nose: "5C",
    coolant_through: true,
    coolant_pressure: 40,
    confidence: "catalog",
    notes: "Swiss-type CNC lathe (Star SR-20/Citizen L20 class)"
  },

  // === DRILL/TAP CENTERS ===
  "drill_tap": {
    max_rpm: 15000,
    min_rpm: 100,
    power_continuous: 7.5,
    power_30min: 11,
    torque_max: 40,
    torque_continuous: 22,
    spindle_nose: "BT30",
    coolant_through: true,
    coolant_pressure: 20,
    confidence: "catalog",
    notes: "High-speed drill/tap center (Haas DT-2/Brother TC class)"
  },

  // === HIGH-SPEED MACHINES ===
  "high_speed_machining_center": {
    max_rpm: 30000,
    min_rpm: 100,
    power_continuous: 15,
    power_30min: 20,
    torque_max: 40,
    torque_continuous: 25,
    spindle_nose: "HSK-E40",
    coolant_through: true,
    coolant_pressure: 40,
    confidence: "catalog",
    notes: "HSM center — high RPM, lower torque (Makino D500/Roeders class)"
  },

  // === LARGE/HEAVY MACHINES ===
  "boring_mill": {
    max_rpm: 3000,
    min_rpm: 5,
    power_continuous: 30,
    power_30min: 37,
    torque_max: 800,
    torque_continuous: 500,
    spindle_nose: "CAT50",
    coolant_through: true,
    coolant_pressure: 70,
    confidence: "catalog",
    notes: "Horizontal boring mill — high power, high torque"
  },
  "gantry_machining_center": {
    max_rpm: 6000,
    min_rpm: 10,
    power_continuous: 37,
    power_30min: 45,
    torque_max: 600,
    torque_continuous: 400,
    spindle_nose: "CAT50",
    coolant_through: true,
    coolant_pressure: 70,
    confidence: "catalog",
    notes: "Gantry/bridge-type machining center"
  },

  // === GRINDING ===
  "cylindrical_grinder": {
    max_rpm: 60000,
    min_rpm: 1000,
    power_continuous: 7.5,
    power_30min: 11,
    torque_max: 5,
    torque_continuous: 3,
    spindle_nose: "DIRECT",
    coolant_through: false,
    coolant_pressure: 0,
    confidence: "handbook",
    notes: "CNC cylindrical grinder — wheel spindle, very high RPM"
  },
  "surface_grinder": {
    max_rpm: 3600,
    min_rpm: 1000,
    power_continuous: 5.5,
    power_30min: 7.5,
    torque_max: 15,
    torque_continuous: 10,
    spindle_nose: "DIRECT",
    coolant_through: false,
    coolant_pressure: 0,
    confidence: "handbook",
    notes: "CNC surface grinder — horizontal spindle"
  },

  // === EDM ===
  "wire_edm": {
    max_rpm: 0,
    min_rpm: 0,
    power_continuous: 0,
    power_30min: 0,
    torque_max: 0,
    torque_continuous: 0,
    spindle_nose: "NONE",
    coolant_through: false,
    coolant_pressure: 0,
    confidence: "measured",
    notes: "Wire EDM — no spindle, electrical discharge machining"
  },
  "sinker_edm": {
    max_rpm: 0,
    min_rpm: 0,
    power_continuous: 0,
    power_30min: 0,
    torque_max: 0,
    torque_continuous: 0,
    spindle_nose: "NONE",
    coolant_through: false,
    coolant_pressure: 0,
    confidence: "measured",
    notes: "Sinker/die-sinking EDM — no spindle"
  },
};

/**
 * Get spindle defaults for a machine type, with fuzzy matching.
 */
export function getMachineSpindleDefault(machineType: string): MachineSpindleDefault | undefined {
  if (!machineType) return undefined;

  const normalized = machineType.toLowerCase().replace(/-/g, "_").replace(/\s+/g, "_").trim();

  // Direct match
  if (MACHINE_SPINDLE_DEFAULTS[normalized]) {
    return MACHINE_SPINDLE_DEFAULTS[normalized];
  }

  // Substring match
  const keys = Object.keys(MACHINE_SPINDLE_DEFAULTS);
  for (const key of keys) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return MACHINE_SPINDLE_DEFAULTS[key];
    }
  }

  // Category-level fallback
  if (normalized.includes("5axis") || normalized.includes("5_axis")) {
    return MACHINE_SPINDLE_DEFAULTS["5axis_machining_center"];
  }
  if (normalized.includes("vmc") || normalized.includes("vertical")) {
    return MACHINE_SPINDLE_DEFAULTS["vertical_machining_center"];
  }
  if (normalized.includes("hmc") || normalized.includes("horizontal_machining")) {
    return MACHINE_SPINDLE_DEFAULTS["horizontal_machining_center"];
  }
  if (normalized.includes("lathe") || normalized.includes("turning") || normalized.includes("slant")) {
    return MACHINE_SPINDLE_DEFAULTS["turning_center"];
  }
  if (normalized.includes("swiss")) {
    return MACHINE_SPINDLE_DEFAULTS["swiss_lathe"];
  }
  if (normalized.includes("mill_turn") || normalized.includes("multitask")) {
    return MACHINE_SPINDLE_DEFAULTS["mill_turn_center"];
  }
  if (normalized.includes("drill") && normalized.includes("tap")) {
    return MACHINE_SPINDLE_DEFAULTS["drill_tap"];
  }
  if (normalized.includes("grind")) {
    return MACHINE_SPINDLE_DEFAULTS["cylindrical_grinder"];
  }
  if (normalized.includes("boring")) {
    return MACHINE_SPINDLE_DEFAULTS["boring_mill"];
  }
  if (normalized.includes("gantry") || normalized.includes("bridge")) {
    return MACHINE_SPINDLE_DEFAULTS["gantry_machining_center"];
  }
  if (normalized.includes("edm") || normalized.includes("wire")) {
    return MACHINE_SPINDLE_DEFAULTS["wire_edm"];
  }

  return undefined;
}

/**
 * Estimate torque from power and RPM using: T = (P × 9549) / n
 * Returns torque in Nm.
 */
export function estimateTorqueFromPower(powerKw: number, rpm: number): number {
  if (rpm <= 0) return 0;
  return (powerKw * 9549) / rpm;
}

/**
 * Estimate power from torque and RPM using: P = (T × n) / 9549
 * Returns power in kW.
 */
export function estimatePowerFromTorque(torqueNm: number, rpm: number): number {
  return (torqueNm * rpm) / 9549;
}
