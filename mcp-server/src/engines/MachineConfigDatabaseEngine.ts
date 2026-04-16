/**
 * MachineConfigDatabaseEngine — CNC machine roughing/adaptive/finishing configs
 *
 * 15+ machine configs with controller-specific smoothing G-codes,
 * chip thinning limits, 5-axis settings, and live tool constraints.
 *
 * Source: PRISM v8.89 monolith PRISM_ROUGHING_MACHINE_CONFIGS_V2.js
 */

export interface SmoothingConfig {
  roughing: string;
  adaptive?: string;
  finishing?: string;
}

export interface MachineRoughingConfig {
  id: string;
  controller: string;
  enabled: boolean;
  defaultLevel: number;
  chipThinning: { enabled: boolean; maxMultiplier: number };
  arcCorrection: { enabled: boolean };
  directionChange: { enabled: boolean };
  adaptiveDepth: { enabled: boolean };
  stickoutCompensation: { enabled: boolean; reductionFactor?: number };
  smoothing: SmoothingConfig;
  fiveAxis?: { enabled: boolean; tcpSmoothing?: string; maxRotaryFeed?: number };
  fiveAxisFeedLimit?: { enabled: boolean; maxDegPerMin: number };
  liveToolLimits?: { maxRpm: number; maxFeed: number };
  cycleTimeOptimization?: { enabled: boolean; codes: string[] };
  highPrecision?: { aiContour?: boolean; nanoSmooth?: boolean };
}

const BASE_CONFIG = {
  enabled: true,
  defaultLevel: 5,
  chipThinning: { enabled: true, maxMultiplier: 2.5 },
  arcCorrection: { enabled: true },
  directionChange: { enabled: true },
  adaptiveDepth: { enabled: true },
  stickoutCompensation: { enabled: true },
};

const MACHINE_CONFIGS: Record<string, Omit<MachineRoughingConfig, 'id'>> = {
  // Haas
  haas_vf2: {
    ...BASE_CONFIG,
    controller: "haas_ngc",
    smoothing: { roughing: "G187 P1 E0.001", adaptive: "G187 P2 E0.0005", finishing: "G187 P3 E0.0001" },
  },
  haas_umc750: {
    ...BASE_CONFIG,
    controller: "haas_ngc",
    smoothing: { roughing: "G187 P1 E0.001", adaptive: "G187 P2 E0.0005", finishing: "G187 P3 E0.0001" },
    fiveAxisFeedLimit: { enabled: true, maxDegPerMin: 5000 },
  },

  // Okuma Mills
  okuma_genos_m460ve: {
    ...BASE_CONFIG,
    controller: "okuma_osp_p300m",
    smoothing: { roughing: "G131 P1", adaptive: "G131 P2", finishing: "G131 P3" },
    cycleTimeOptimization: { enabled: true, codes: ["M63", "M61"] },
  },
  okuma_genos_m460v_5ax: {
    ...BASE_CONFIG,
    controller: "okuma_osp_p300m",
    smoothing: { roughing: "G131 P1", adaptive: "G131 P2", finishing: "G131 P3" },
    cycleTimeOptimization: { enabled: true, codes: ["M63", "M61"] },
    fiveAxis: { enabled: true, tcpSmoothing: "G131 P2", maxRotaryFeed: 5000 },
  },
  okuma_mu4000v: {
    ...BASE_CONFIG,
    controller: "okuma_osp_p300m",
    smoothing: { roughing: "G131 P1", adaptive: "G131 P2", finishing: "G131 P3" },
    fiveAxis: { enabled: true, tcpSmoothing: "G131 P2", maxRotaryFeed: 5000 },
  },
  okuma_mu5000v: {
    ...BASE_CONFIG,
    controller: "okuma_osp_p300m",
    smoothing: { roughing: "G131 P1", adaptive: "G131 P2", finishing: "G131 P3" },
    fiveAxis: { enabled: true, tcpSmoothing: "G131 P2", maxRotaryFeed: 5000 },
  },

  // Okuma Mill-Turn
  okuma_multus_b250iiw: {
    ...BASE_CONFIG,
    controller: "okuma_osp_p300l",
    defaultLevel: 4,
    chipThinning: { enabled: true, maxMultiplier: 2.0 },
    stickoutCompensation: { enabled: true, reductionFactor: 0.20 },
    smoothing: { roughing: "G131 P2", adaptive: "G131 P3" },
    liveToolLimits: { maxRpm: 12000, maxFeed: 100 },
  },

  // Okuma Lathes
  okuma_lb3000exii: {
    ...BASE_CONFIG,
    controller: "okuma_osp_p300l",
    defaultLevel: 4,
    chipThinning: { enabled: true, maxMultiplier: 1.8 },
    adaptiveDepth: { enabled: false },
    stickoutCompensation: { enabled: true, reductionFactor: 0.25 },
    smoothing: { roughing: "G131 P1", adaptive: "G131 P2" },
    liveToolLimits: { maxRpm: 6000, maxFeed: 60 },
  },
  okuma_genos_l400ii: {
    ...BASE_CONFIG,
    controller: "okuma_osp_p300l",
    defaultLevel: 4,
    chipThinning: { enabled: true, maxMultiplier: 1.8 },
    adaptiveDepth: { enabled: false },
    stickoutCompensation: { enabled: true, reductionFactor: 0.25 },
    smoothing: { roughing: "G131 P1", adaptive: "G131 P2" },
    liveToolLimits: { maxRpm: 6000, maxFeed: 50 },
  },

  // Hurco
  hurco_vm30i: {
    ...BASE_CONFIG,
    controller: "hurco_winmax",
    smoothing: { roughing: "G05.3 P50", adaptive: "G05.3 P35", finishing: "G05.3 P15" },
  },
  hurco_vmx42i: {
    ...BASE_CONFIG,
    controller: "hurco_winmax",
    smoothing: { roughing: "G05.3 P50", adaptive: "G05.3 P35", finishing: "G05.3 P15" },
  },

  // DMG MORI
  dmgmori_dmu50: {
    ...BASE_CONFIG,
    controller: "dmgmori_celos",
    smoothing: { roughing: "M200", adaptive: "M200" },
  },

  // Mazak
  mazak_variaxis_i600: {
    ...BASE_CONFIG,
    controller: "mazak_smooth",
    smoothing: { roughing: "G05.1 Q1", adaptive: "G05.1 Q1" },
  },

  // Makino
  makino_d500: {
    ...BASE_CONFIG,
    controller: "makino_pro",
    smoothing: { roughing: "G05 P2", adaptive: "G05 P10000" },
  },

  // Brother
  brother_s500x1: {
    ...BASE_CONFIG,
    controller: "brother_cnc",
    chipThinning: { enabled: true, maxMultiplier: 2.0 },
    smoothing: { roughing: "G05 P1", adaptive: "G05 P1" },
  },

  // Roku-Roku
  roku_roku_rqm5: {
    ...BASE_CONFIG,
    controller: "fanuc_31i",
    defaultLevel: 6,
    smoothing: { roughing: "G05 P10000", adaptive: "G05.1 Q1" },
    highPrecision: { aiContour: true, nanoSmooth: true },
  },

  // Doosan
  doosan_dnm500: {
    ...BASE_CONFIG,
    controller: "fanuc_0i",
    smoothing: { roughing: "G05.1 Q1", adaptive: "G05.1 Q1" },
  },

  // Hermle
  hermle_c32u: {
    ...BASE_CONFIG,
    controller: "heidenhain_tnc640",
    smoothing: { roughing: "CYCL DEF 32.0 TOLERANCE", adaptive: "CYCL DEF 32.0 TOLERANCE" },
  },
};

export class MachineConfigDatabaseEngine {
  /** Get config by machine ID */
  get(id: string): MachineRoughingConfig | null {
    const normalized = id.toLowerCase().replace(/[\s-]/g, '_');
    const spec = MACHINE_CONFIGS[normalized];
    if (spec) return { id: normalized, ...spec };
    // Partial match
    for (const [key, val] of Object.entries(MACHINE_CONFIGS)) {
      if (key.includes(normalized) || normalized.includes(key)) {
        return { id: key, ...val };
      }
    }
    return null;
  }

  /** Search configs */
  search(query: string): MachineRoughingConfig[] {
    const q = query.toLowerCase();
    return Object.entries(MACHINE_CONFIGS)
      .filter(([id, spec]) => `${id} ${spec.controller}`.toLowerCase().includes(q))
      .map(([id, spec]) => ({ id, ...spec }));
  }

  /** List all configs */
  list(): MachineRoughingConfig[] {
    return Object.entries(MACHINE_CONFIGS).map(([id, spec]) => ({ id, ...spec }));
  }

  /** Get smoothing G-code for a machine and operation type */
  getSmoothingCode(machineId: string, operation: 'roughing' | 'adaptive' | 'finishing'): string | null {
    const config = this.get(machineId);
    if (!config) return null;
    return config.smoothing[operation] ?? config.smoothing.roughing;
  }

  /** Get machines by controller family */
  listByController(controller: string): MachineRoughingConfig[] {
    const c = controller.toLowerCase();
    return Object.entries(MACHINE_CONFIGS)
      .filter(([, spec]) => spec.controller.toLowerCase().includes(c))
      .map(([id, spec]) => ({ id, ...spec }));
  }

  /** Get machines with 5-axis capability */
  listFiveAxis(): MachineRoughingConfig[] {
    return Object.entries(MACHINE_CONFIGS)
      .filter(([, spec]) => spec.fiveAxis?.enabled || spec.fiveAxisFeedLimit)
      .map(([id, spec]) => ({ id, ...spec }));
  }

  /** Get machines with live tooling */
  listLiveTool(): MachineRoughingConfig[] {
    return Object.entries(MACHINE_CONFIGS)
      .filter(([, spec]) => spec.liveToolLimits != null)
      .map(([id, spec]) => ({ id, ...spec }));
  }

  /** Stats */
  stats(): { total: number; controllers: number; fiveAxis: number; liveTool: number } {
    const all = Object.values(MACHINE_CONFIGS);
    return {
      total: all.length,
      controllers: new Set(all.map(s => s.controller)).size,
      fiveAxis: all.filter(s => s.fiveAxis?.enabled || s.fiveAxisFeedLimit).length,
      liveTool: all.filter(s => s.liveToolLimits != null).length,
    };
  }
}

export const machineConfigDatabaseEngine = new MachineConfigDatabaseEngine();
