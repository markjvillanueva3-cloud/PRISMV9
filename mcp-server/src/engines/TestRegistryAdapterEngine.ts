/**
 * TestRegistryAdapterEngine — Curated bank of realistic test inputs.
 *
 * Purpose (TEST-LEGIT-MS1 U-INFRA05):
 *   Test generators need realistic physics values (material Kc, tool geometry,
 *   machine envelopes) to build inputs that exercise engine code paths.
 *   Loading the production registries for every test is slow (MaterialRegistry
 *   alone is 59KB of TypeScript + filesystem I/O), so this adapter keeps a
 *   small bank of canonical configurations sourced directly from
 *   src/physics/constants.ts.
 *
 * Why "curated" and not "proxy":
 *   Tests benefit from STABILITY — if a downstream test asserts vc=180 m/min
 *   for steel, we do not want a production registry update to break it.
 *   The adapter pins a small set of well-known configurations with named
 *   references (e.g. STEEL_1045, AL_6061, CARBIDE_12MM_4FL, OKUMA_LATHE).
 *
 * Policy:
 *   Physics constants (kc1_1, mc, Taylor) come from CANONICAL_KIENZLE /
 *   CANONICAL_TAYLOR / CANONICAL_MATERIAL_DB — never inlined, per the
 *   project-wide import-from-constants rule.
 */

import {
  CANONICAL_KIENZLE,
  CANONICAL_TAYLOR,
  CANONICAL_MATERIAL_DB,
  type ISOGroup,
  type MaterialPhysics,
} from "../physics/constants.js";

export interface TestTool {
  id: string;
  name: string;
  type: "end_mill" | "face_mill" | "drill" | "turning_insert" | "ball_mill";
  diameter_mm: number;
  flutes: number;
  material: "carbide" | "hss" | "cermet" | "cbn" | "pcd";
  coating: "TiAlN" | "TiN" | "AlTiN" | "uncoated" | "diamond";
  max_rpm: number;
  corner_radius_mm: number;
}

export interface TestMachine {
  id: string;
  name: string;
  type: "mill" | "lathe" | "mill_turn" | "edm_wire" | "edm_sinker";
  controller: string;
  spindle_power_kW: number;
  spindle_max_rpm: number;
  spindle_max_torque_Nm: number;
  max_feedrate_mm_min: number;
  axes: number;
}

export interface TestFormulaRef {
  id: string;
  domain: "force" | "thermal" | "deflection" | "chatter" | "wear" | "surface";
  canonical_source: string;
  references_constant?: keyof typeof CANONICAL_MATERIAL_DB extends string ? string : never;
}

// Deep freeze — Object.freeze is shallow and would let callers mutate nested
// values, which would silently poison subsequent tests in the same process.
function deepFreeze<T>(o: T): T {
  if (o === null || typeof o !== "object") return o;
  for (const v of Object.values(o)) {
    if (v !== null && typeof v === "object") deepFreeze(v);
  }
  return Object.freeze(o);
}

// ── Curated banks ───────────────────────────────────────────────────

const TEST_TOOLS: Readonly<Record<string, TestTool>> = deepFreeze({
  CARBIDE_END_MILL_12MM_4FL: {
    id: "CARBIDE_END_MILL_12MM_4FL",
    name: "12 mm 4-flute carbide end mill",
    type: "end_mill",
    diameter_mm: 12.0,
    flutes: 4,
    material: "carbide",
    coating: "AlTiN",
    max_rpm: 12000,
    corner_radius_mm: 0.4,
  },
  CARBIDE_END_MILL_6MM_3FL: {
    id: "CARBIDE_END_MILL_6MM_3FL",
    name: "6 mm 3-flute carbide end mill for aluminum",
    type: "end_mill",
    diameter_mm: 6.0,
    flutes: 3,
    material: "carbide",
    coating: "uncoated",
    max_rpm: 24000,
    corner_radius_mm: 0.2,
  },
  TURNING_CNMG_120408: {
    id: "TURNING_CNMG_120408",
    name: "CNMG 120408 carbide turning insert",
    type: "turning_insert",
    diameter_mm: 0, // N/A for inserts — geometry dominated by nose radius
    flutes: 1,
    material: "carbide",
    coating: "TiAlN",
    max_rpm: 0,
    corner_radius_mm: 0.8,
  },
  HSS_DRILL_10MM: {
    id: "HSS_DRILL_10MM",
    name: "10 mm HSS twist drill",
    type: "drill",
    diameter_mm: 10.0,
    flutes: 2,
    material: "hss",
    coating: "TiN",
    max_rpm: 2500,
    corner_radius_mm: 0,
  },
  BALL_END_8MM: {
    id: "BALL_END_8MM",
    name: "8 mm 2-flute ball-end finishing mill",
    type: "ball_mill",
    diameter_mm: 8.0,
    flutes: 2,
    material: "carbide",
    coating: "AlTiN",
    max_rpm: 15000,
    corner_radius_mm: 4.0, // full ball
  },
  CBN_FINISHING_INSERT: {
    id: "CBN_FINISHING_INSERT",
    name: "CBN finishing insert for hardened steel (HRC 55+)",
    type: "turning_insert",
    diameter_mm: 0,
    flutes: 1,
    material: "cbn",
    coating: "uncoated",
    max_rpm: 0,
    corner_radius_mm: 0.4,
  },
});

const TEST_MACHINES: Readonly<Record<string, TestMachine>> = deepFreeze({
  OKUMA_GENOS_L250: {
    id: "OKUMA_GENOS_L250",
    name: "Okuma Genos L250 lathe",
    type: "lathe",
    controller: "OSP-P300L",
    spindle_power_kW: 15,
    spindle_max_rpm: 4200,
    spindle_max_torque_Nm: 278,
    max_feedrate_mm_min: 30000,
    axes: 2,
  },
  HAAS_VF2: {
    id: "HAAS_VF2",
    name: "Haas VF-2 vertical mill",
    type: "mill",
    controller: "Haas NGC",
    spindle_power_kW: 22.4,
    spindle_max_rpm: 8100,
    spindle_max_torque_Nm: 122,
    max_feedrate_mm_min: 25400,
    axes: 3,
  },
  HURCO_VMX60Ti: {
    id: "HURCO_VMX60Ti",
    name: "Hurco VMX60Ti 5-axis mill",
    type: "mill",
    controller: "Hurco WinMAX",
    spindle_power_kW: 30,
    spindle_max_rpm: 12000,
    spindle_max_torque_Nm: 143,
    max_feedrate_mm_min: 30000,
    axes: 5,
  },
  MITSUBISHI_MV2400R: {
    id: "MITSUBISHI_MV2400R",
    name: "Mitsubishi MV2400R wire EDM",
    type: "edm_wire",
    controller: "Mitsubishi M700",
    spindle_power_kW: 0, // N/A for EDM
    spindle_max_rpm: 0,
    spindle_max_torque_Nm: 0,
    max_feedrate_mm_min: 900,
    axes: 5,
  },
});

const TEST_FORMULAS: Readonly<Record<string, TestFormulaRef>> = deepFreeze({
  KIENZLE_FC: {
    id: "KIENZLE_FC",
    domain: "force",
    canonical_source: "Sandvik Coromant General Turning (2024); ISO 3685:1993",
  },
  TAYLOR_TOOL_LIFE: {
    id: "TAYLOR_TOOL_LIFE",
    domain: "wear",
    canonical_source: "Taylor (1907); ISO 3685:1993",
  },
  JOHNSON_COOK_FLOW_STRESS: {
    id: "JOHNSON_COOK_FLOW_STRESS",
    domain: "force",
    canonical_source: "Johnson & Cook (1983), 'A constitutive model and data for metals'",
  },
  CANTILEVER_DEFLECTION: {
    id: "CANTILEVER_DEFLECTION",
    domain: "deflection",
    canonical_source: "Timoshenko, Strength of Materials Part I (1940)",
  },
  SLD_REGEN_CHATTER: {
    id: "SLD_REGEN_CHATTER",
    domain: "chatter",
    canonical_source: "Altintas, Manufacturing Automation (2012) Ch. 3",
  },
  USUI_WEAR_RATE: {
    id: "USUI_WEAR_RATE",
    domain: "wear",
    canonical_source: "Usui, Shirakashi & Kitagawa (1984), 'Analytical prediction of cutting tool wear'",
  },
  ABBE_ERROR: {
    id: "ABBE_ERROR",
    domain: "surface",
    canonical_source: "Abbe (1890); ISO 230-2",
  },
});

// ── Adapter class ───────────────────────────────────────────────────

export class TestRegistryAdapterEngine {
  /** Return physics data for a material by ISO group (P/M/K/N/S/H). */
  getMaterialByISO(group: ISOGroup): { kc1_1: number; mc: number; taylor_C: number; taylor_n: number; source: string } {
    const k = CANONICAL_KIENZLE[group];
    const t = CANONICAL_TAYLOR[group];
    if (!k || !t) {
      throw new Error(`No canonical data for ISO group: ${group}`);
    }
    return {
      kc1_1: k.kc1_1,
      mc: k.mc,
      taylor_C: t.C,
      taylor_n: t.n,
      source: "src/physics/constants.ts (CANONICAL_KIENZLE + CANONICAL_TAYLOR)",
    };
  }

  /** Return full MaterialPhysics record by canonical material name. */
  getMaterial(name: string): MaterialPhysics {
    const m = CANONICAL_MATERIAL_DB[name];
    if (!m) {
      const keys = Object.keys(CANONICAL_MATERIAL_DB).slice(0, 10).join(", ");
      throw new Error(`Material not found: ${name}. Available (first 10): ${keys}`);
    }
    return m;
  }

  /** List all canonical material names available. */
  listMaterials(): string[] {
    return Object.keys(CANONICAL_MATERIAL_DB);
  }

  /** Return a curated test tool profile. */
  getTool(id: string): TestTool {
    const t = TEST_TOOLS[id];
    if (!t) {
      throw new Error(`Test tool not found: ${id}. Available: ${Object.keys(TEST_TOOLS).join(", ")}`);
    }
    return t;
  }

  listTools(): TestTool[] {
    return Object.values(TEST_TOOLS);
  }

  /** Return a curated test machine profile. */
  getMachine(id: string): TestMachine {
    const m = TEST_MACHINES[id];
    if (!m) {
      throw new Error(`Test machine not found: ${id}. Available: ${Object.keys(TEST_MACHINES).join(", ")}`);
    }
    return m;
  }

  listMachines(): TestMachine[] {
    return Object.values(TEST_MACHINES);
  }

  /** Return canonical formula reference metadata. */
  getFormulaRef(id: string): TestFormulaRef {
    const f = TEST_FORMULAS[id];
    if (!f) {
      throw new Error(`Formula reference not found: ${id}. Available: ${Object.keys(TEST_FORMULAS).join(", ")}`);
    }
    return f;
  }

  listFormulas(): TestFormulaRef[] {
    return Object.values(TEST_FORMULAS);
  }

  /** Convenience: spanning configurations for variability-floor tests. */
  spanningISOGroups(): ISOGroup[] {
    return ["P", "M", "K", "N", "S", "H"];
  }

  spanningTools(): TestTool[] {
    // At least one per category (end mill / drill / turning insert / ball)
    return [
      TEST_TOOLS.CARBIDE_END_MILL_12MM_4FL,
      TEST_TOOLS.TURNING_CNMG_120408,
      TEST_TOOLS.HSS_DRILL_10MM,
      TEST_TOOLS.BALL_END_8MM,
    ];
  }

  spanningMachines(): TestMachine[] {
    // Spans lathe, 3-axis mill, 5-axis mill, and EDM
    return [
      TEST_MACHINES.OKUMA_GENOS_L250,
      TEST_MACHINES.HAAS_VF2,
      TEST_MACHINES.HURCO_VMX60Ti,
      TEST_MACHINES.MITSUBISHI_MV2400R,
    ];
  }
}

export const testRegistryAdapterEngine = new TestRegistryAdapterEngine();
