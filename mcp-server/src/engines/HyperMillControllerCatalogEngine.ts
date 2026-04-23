/**
 * HyperMillControllerCatalogEngine — CNC Controller Family Reference
 *
 * Encodes 16 major controller families with 60+ post-processor variants
 * extracted from hyperMILL NcGenerator v33 installation data.
 *
 * Source: H:/prism/HYPERMILL/NcGenerator/33.0/files/
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ControllerFamily {
  id: string;
  name: string;
  manufacturer: string;
  variants: ControllerVariant[];
  cycleSupport: string[]; // "drilling", "probing", "turning", etc.
  gCodeDialect: string;
}

export interface ControllerVariant {
  code: string; // omPP prefix code
  description: string;
  axisCount: number; // 3, 4, or 5
  capabilities: string[];
}

export interface ControllerMatch {
  family: ControllerFamily;
  variant: ControllerVariant;
  confidence: number;
}

// ============================================================================
// CONTROLLER DATABASE (from NcGenerator 33.0)
// ============================================================================

const CONTROLLER_FAMILIES: ControllerFamily[] = [
  {
    id: "fanuc",
    name: "Fanuc",
    manufacturer: "FANUC Corporation",
    gCodeDialect: "fanuc",
    cycleSupport: ["drilling", "tapping", "probing"],
    variants: [
      { code: "omPPFI", description: "Fanuc Interactive (5-axis)", axisCount: 5, capabilities: ["5axis", "interactive"] },
      { code: "omPPF3X", description: "Fanuc 3-axis", axisCount: 3, capabilities: ["3axis"] },
      { code: "omPPFCD", description: "Fanuc Conversational", axisCount: 3, capabilities: ["3axis", "conversational"] },
      { code: "omPPFAM", description: "Fanuc Additive Manufacturing", axisCount: 5, capabilities: ["5axis", "additive"] },
      { code: "omPPFSim", description: "Fanuc Simulator", axisCount: 5, capabilities: ["5axis", "simulation"] },
      { code: "omPPFiI", description: "Fanuc-i Interactive", axisCount: 5, capabilities: ["5axis", "interactive"] },
      { code: "omPPFiCD", description: "Fanuc-i Conversational", axisCount: 3, capabilities: ["3axis", "conversational"] },
    ],
  },
  {
    id: "siemens",
    name: "Siemens SINUMERIK",
    manufacturer: "Siemens AG",
    gCodeDialect: "siemens",
    cycleSupport: ["drilling", "tapping", "probing", "turning"],
    variants: [
      { code: "omPPSinI", description: "SINUMERIK Interactive (5-axis)", axisCount: 5, capabilities: ["5axis", "interactive"] },
      { code: "omPPSinIS", description: "SINUMERIK Industrial Series", axisCount: 5, capabilities: ["5axis", "industrial"] },
      { code: "omPPSinIS2", description: "SINUMERIK Industrial Series 2", axisCount: 5, capabilities: ["5axis", "industrial"] },
      { code: "omPPSinCD", description: "SINUMERIK Conversational", axisCount: 3, capabilities: ["3axis", "conversational"] },
      { code: "omPPSinAM", description: "SINUMERIK Additive Manufacturing", axisCount: 5, capabilities: ["5axis", "additive"] },
      { code: "omPPSinT", description: "SINUMERIK Turning", axisCount: 2, capabilities: ["turning"] },
      { code: "omPPSinTCD", description: "SINUMERIK Turning Conversational", axisCount: 2, capabilities: ["turning", "conversational"] },
      { code: "omPPSinSim", description: "SINUMERIK Simulator", axisCount: 5, capabilities: ["5axis", "simulation"] },
      { code: "omPPSinDMG", description: "DMG Mori (Siemens)", axisCount: 5, capabilities: ["5axis", "dmg"] },
    ],
  },
  {
    id: "heidenhain",
    name: "Heidenhain TNC",
    manufacturer: "DR. JOHANNES HEIDENHAIN GmbH",
    gCodeDialect: "heidenhain",
    cycleSupport: ["drilling", "tapping", "probing"],
    variants: [
      { code: "omPPHhI", description: "Heidenhain Interactive (5-axis)", axisCount: 5, capabilities: ["5axis", "interactive"] },
      { code: "omPPHhCD", description: "Heidenhain Conversational", axisCount: 3, capabilities: ["3axis", "conversational"] },
      { code: "omPPHhSim", description: "Heidenhain Simulator", axisCount: 5, capabilities: ["5axis", "simulation"] },
      { code: "omPPHhAWEA", description: "Heidenhain — AWEA machines", axisCount: 5, capabilities: ["5axis", "swivel_table"] },
      { code: "omPPHhDMG", description: "Heidenhain — DMG Mori machines", axisCount: 5, capabilities: ["5axis", "swivel_table"] },
      { code: "omPPHhFPT", description: "Heidenhain — FPT machines", axisCount: 5, capabilities: ["5axis", "swivel_table"] },
      { code: "omPPHhHERMLE", description: "Heidenhain — Hermle machines", axisCount: 5, capabilities: ["5axis", "swivel_table"] },
      { code: "omPPHhKERN", description: "Heidenhain — Kern machines", axisCount: 5, capabilities: ["5axis", "swivel_table", "micromachining"] },
      { code: "omPPHhGROB", description: "Heidenhain — Grob machines", axisCount: 5, capabilities: ["5axis", "swivel_table"] },
      { code: "omPPHhBRETON", description: "Heidenhain — Breton machines", axisCount: 5, capabilities: ["5axis", "swivel_table"] },
      { code: "omPPHhEXERON", description: "Heidenhain — Exeron machines", axisCount: 5, capabilities: ["5axis", "edm"] },
      { code: "omPPHhFEHLMANN", description: "Heidenhain — Fehlmann machines", axisCount: 5, capabilities: ["5axis", "swivel_table"] },
      { code: "omPPHhFOOKE", description: "Heidenhain — Fooke machines", axisCount: 5, capabilities: ["5axis", "gantry"] },
      { code: "omPPHhZIMMERMANN", description: "Heidenhain — Zimmermann machines", axisCount: 5, capabilities: ["5axis", "gantry"] },
      { code: "omPPHhNIKOLAS", description: "Heidenhain — Nicolas Correa", axisCount: 5, capabilities: ["5axis", "swivel_table"] },
      { code: "omPPHhPARPAS", description: "Heidenhain — Parpas machines", axisCount: 5, capabilities: ["5axis", "swivel_table"] },
      { code: "omPPHhSORALUCE", description: "Heidenhain — Soraluce machines", axisCount: 5, capabilities: ["5axis", "swivel_table"] },
    ],
  },
  {
    id: "haas",
    name: "Haas",
    manufacturer: "Haas Automation",
    gCodeDialect: "fanuc",
    cycleSupport: ["drilling", "tapping"],
    variants: [
      { code: "omPPHaas3x", description: "Haas 3-axis", axisCount: 3, capabilities: ["3axis"] },
      { code: "omPPHaasS", description: "Haas Standard", axisCount: 4, capabilities: ["4axis"] },
      { code: "omPPHaasI", description: "Haas Interactive (5-axis)", axisCount: 5, capabilities: ["5axis", "interactive"] },
      { code: "omPPHaasCD", description: "Haas Conversational", axisCount: 3, capabilities: ["3axis", "conversational"] },
    ],
  },
  {
    id: "mazak",
    name: "Mazak",
    manufacturer: "Yamazaki Mazak Corporation",
    gCodeDialect: "mazak",
    cycleSupport: ["drilling", "tapping", "probing", "turning"],
    variants: [
      { code: "omPPMzI", description: "Mazak Interactive (5-axis)", axisCount: 5, capabilities: ["5axis", "interactive"] },
      { code: "omPPMzAM", description: "Mazak Additive Manufacturing", axisCount: 5, capabilities: ["5axis", "additive"] },
      { code: "omPPMzSim", description: "Mazak Simulator", axisCount: 5, capabilities: ["5axis", "simulation"] },
      { code: "omPPMzCD", description: "Mazak Conversational", axisCount: 3, capabilities: ["3axis", "conversational"] },
    ],
  },
  {
    id: "okuma",
    name: "Okuma OSP",
    manufacturer: "Okuma Corporation",
    gCodeDialect: "okuma",
    cycleSupport: ["drilling", "tapping", "probing"],
    variants: [
      { code: "omPPOkAM", description: "Okuma Additive", axisCount: 5, capabilities: ["5axis", "additive"] },
      { code: "omPPOkCD", description: "Okuma Conversational", axisCount: 3, capabilities: ["3axis", "conversational"] },
    ],
  },
  {
    id: "hurco",
    name: "Hurco WinMax",
    manufacturer: "Hurco Companies",
    gCodeDialect: "hurco",
    cycleSupport: ["drilling", "tapping"],
    variants: [
      { code: "omPPHuWmx", description: "Hurco WinMax", axisCount: 5, capabilities: ["5axis"] },
      { code: "omPPHuWmx3x", description: "Hurco WinMax 3-axis", axisCount: 3, capabilities: ["3axis"] },
      { code: "omPPHuCD", description: "Hurco Conversational", axisCount: 3, capabilities: ["3axis", "conversational"] },
    ],
  },
  {
    id: "brother",
    name: "Brother",
    manufacturer: "Brother Industries",
    gCodeDialect: "fanuc",
    cycleSupport: ["drilling", "tapping"],
    variants: [
      { code: "omPPBrI", description: "Brother Interactive", axisCount: 5, capabilities: ["5axis", "high_speed"] },
    ],
  },
  {
    id: "fidia",
    name: "Fidia",
    manufacturer: "Fidia S.p.A.",
    gCodeDialect: "fidia",
    cycleSupport: ["drilling"],
    variants: [
      { code: "omPPFidI", description: "Fidia Interactive", axisCount: 5, capabilities: ["5axis", "high_speed"] },
    ],
  },
  {
    id: "delectron",
    name: "D.Electron Z32",
    manufacturer: "D.Electron",
    gCodeDialect: "delectron",
    cycleSupport: ["drilling"],
    variants: [
      { code: "omPPDeZ32", description: "D.Electron Z32", axisCount: 5, capabilities: ["5axis"] },
      { code: "omPPDeZ32CD", description: "D.Electron Z32 Conversational", axisCount: 3, capabilities: ["3axis", "conversational"] },
    ],
  },
  {
    id: "roeders",
    name: "Roeders RMS6",
    manufacturer: "Roeders GmbH",
    gCodeDialect: "roeders",
    cycleSupport: ["drilling"],
    variants: [
      { code: "omPPRoeRMS6", description: "Roeders RMS6", axisCount: 5, capabilities: ["5axis", "high_speed", "micromachining"] },
      { code: "omPPRoeRMS6S", description: "Roeders RMS6 Standard", axisCount: 3, capabilities: ["3axis", "high_speed"] },
    ],
  },
  {
    id: "gfm",
    name: "GFM",
    manufacturer: "GFM GmbH",
    gCodeDialect: "siemens",
    cycleSupport: ["drilling"],
    variants: [
      { code: "omPPGFMC6kS", description: "GFM C6k-S", axisCount: 5, capabilities: ["5axis"] },
      { code: "omPPGFMC6k3x", description: "GFM C6k 3-axis", axisCount: 3, capabilities: ["3axis"] },
    ],
  },
  {
    id: "fagor",
    name: "Fagor",
    manufacturer: "Fagor Automation",
    gCodeDialect: "fagor",
    cycleSupport: ["drilling"],
    variants: [
      { code: "omPPFgrI", description: "Fagor Interactive", axisCount: 5, capabilities: ["5axis"] },
      { code: "omPPFgrCHETO", description: "Fagor CHETO variant", axisCount: 5, capabilities: ["5axis"] },
    ],
  },
  {
    id: "millplus",
    name: "MillPlus",
    manufacturer: "Heidenhain (MillPlus)",
    gCodeDialect: "millplus",
    cycleSupport: ["drilling", "tapping"],
    variants: [
      { code: "omPPMpI", description: "MillPlus Interactive", axisCount: 5, capabilities: ["5axis"] },
    ],
  },
  {
    id: "apt",
    name: "APT (CL Data)",
    manufacturer: "Standard",
    gCodeDialect: "apt",
    cycleSupport: [],
    variants: [
      { code: "omPPApt", description: "APT CL Data Output", axisCount: 5, capabilities: ["5axis", "cl_data"] },
    ],
  },
  {
    id: "hhg",
    name: "HHG",
    manufacturer: "HHG",
    gCodeDialect: "hhg",
    cycleSupport: ["drilling"],
    variants: [
      { code: "omPPHHG", description: "HHG Controller", axisCount: 5, capabilities: ["5axis"] },
    ],
  },
];

// ============================================================================
// G-CODE DIALECT FEATURES
// ============================================================================

const DIALECT_FEATURES: Record<string, {
  programStart: string;
  programEnd: string;
  absoluteMode: string;
  incrementalMode: string;
  toolChange: string;
  coolantOn: string;
  coolantOff: string;
  spindleCW: string;
  spindleCCW: string;
  spindleStop: string;
  safeRetract: string;
}> = {
  fanuc: {
    programStart: "%",
    programEnd: "M30",
    absoluteMode: "G90",
    incrementalMode: "G91",
    toolChange: "T{n} M06",
    coolantOn: "M08",
    coolantOff: "M09",
    spindleCW: "M03 S{rpm}",
    spindleCCW: "M04 S{rpm}",
    spindleStop: "M05",
    safeRetract: "G28 G91 Z0",
  },
  siemens: {
    programStart: "; SINUMERIK",
    programEnd: "M30",
    absoluteMode: "G90",
    incrementalMode: "G91",
    toolChange: "T{n} D1 M06",
    coolantOn: "M08",
    coolantOff: "M09",
    spindleCW: "M03 S{rpm}",
    spindleCCW: "M04 S{rpm}",
    spindleStop: "M05",
    safeRetract: "SUPA G0 Z=IC(0)",
  },
  heidenhain: {
    programStart: "BEGIN PGM",
    programEnd: "END PGM",
    absoluteMode: "(absolute by default)",
    incrementalMode: "INCREMENTAL",
    toolChange: "TOOL CALL {n} Z S{rpm}",
    coolantOn: "M08",
    coolantOff: "M09",
    spindleCW: "(set in TOOL CALL)",
    spindleCCW: "M04",
    spindleStop: "M05",
    safeRetract: "L Z+0 R0 FMAX M91",
  },
  mazak: {
    programStart: "%",
    programEnd: "M30",
    absoluteMode: "G90",
    incrementalMode: "G91",
    toolChange: "T{n} M06",
    coolantOn: "M08",
    coolantOff: "M09",
    spindleCW: "M03 S{rpm}",
    spindleCCW: "M04 S{rpm}",
    spindleStop: "M05",
    safeRetract: "G28 G91 Z0",
  },
  okuma: {
    programStart: "O{n}",
    programEnd: "M02",
    absoluteMode: "G90",
    incrementalMode: "G91",
    toolChange: "T{n} M06",
    coolantOn: "M08",
    coolantOff: "M09",
    spindleCW: "M03 S{rpm}",
    spindleCCW: "M04 S{rpm}",
    spindleStop: "M05",
    safeRetract: "G28 Z0",
  },
};

// ============================================================================
// ENGINE
// ============================================================================

export class HyperMillControllerCatalogEngine {
  /** List all controller families. */
  listFamilies(): Array<{
    id: string; name: string; manufacturer: string;
    variantCount: number; dialect: string;
  }> {
    return CONTROLLER_FAMILIES.map((f) => ({
      id: f.id,
      name: f.name,
      manufacturer: f.manufacturer,
      variantCount: f.variants.length,
      dialect: f.gCodeDialect,
    }));
  }

  /** Get a controller family by ID. */
  getFamily(id: string): ControllerFamily | null {
    return CONTROLLER_FAMILIES.find((f) => f.id === id) ?? null;
  }

  /** Search controllers by name, manufacturer, or capability. */
  search(query: string): ControllerMatch[] {
    const q = query.toLowerCase();
    const results: ControllerMatch[] = [];
    for (const family of CONTROLLER_FAMILIES) {
      for (const variant of family.variants) {
        const score =
          (family.name.toLowerCase().includes(q) ? 0.4 : 0) +
          (family.manufacturer.toLowerCase().includes(q) ? 0.3 : 0) +
          (variant.description.toLowerCase().includes(q) ? 0.3 : 0) +
          (variant.capabilities.some((c) => c.includes(q)) ? 0.2 : 0);
        if (score > 0) {
          results.push({ family, variant, confidence: Math.min(score, 1) });
        }
      }
    }
    return results.sort((a, b) => b.confidence - a.confidence);
  }

  /** Find controllers by axis count. */
  byAxisCount(axes: number): ControllerMatch[] {
    const results: ControllerMatch[] = [];
    for (const family of CONTROLLER_FAMILIES) {
      for (const variant of family.variants) {
        if (variant.axisCount >= axes) {
          results.push({ family, variant, confidence: variant.axisCount === axes ? 1 : 0.8 });
        }
      }
    }
    return results;
  }

  /** Find controllers with a specific capability. */
  byCapability(capability: string): ControllerMatch[] {
    const results: ControllerMatch[] = [];
    for (const family of CONTROLLER_FAMILIES) {
      for (const variant of family.variants) {
        if (variant.capabilities.includes(capability)) {
          results.push({ family, variant, confidence: 0.9 });
        }
      }
    }
    return results;
  }

  /** Get G-code dialect features for a controller family. */
  getDialect(familyId: string): typeof DIALECT_FEATURES[string] | null {
    const family = this.getFamily(familyId);
    if (!family) return null;
    return DIALECT_FEATURES[family.gCodeDialect] ?? null;
  }

  /** Get stats. */
  stats(): {
    families: number; totalVariants: number;
    dialects: number; byAxis: Record<number, number>;
  } {
    let totalVariants = 0;
    const byAxis: Record<number, number> = {};
    const dialects = new Set<string>();
    for (const f of CONTROLLER_FAMILIES) {
      totalVariants += f.variants.length;
      dialects.add(f.gCodeDialect);
      for (const v of f.variants) {
        byAxis[v.axisCount] = (byAxis[v.axisCount] ?? 0) + 1;
      }
    }
    return {
      families: CONTROLLER_FAMILIES.length,
      totalVariants,
      dialects: dialects.size,
      byAxis,
    };
  }
}

export const hyperMillControllerCatalogEngine = new HyperMillControllerCatalogEngine();
