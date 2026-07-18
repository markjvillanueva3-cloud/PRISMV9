/**
 * MonolithRoughingMachineConfigsEngine — U-DB-MONOLITH-ROUGHING-MACHINE-CONFIGS-LOADER
 *
 * TS-typed port of `PRISM_ROUGHING_MACHINE_CONFIGS_V2.js` from the v8.89
 * monolith extraction (`extracted_modules/databases/`). Carries 18 machine
 * roughing-strategy configurations across 10 manufacturers:
 *   - Haas (2: vf2, umc750)
 *   - Okuma (7: genos m460ve, genos m460v 5ax, mu4000v, mu5000v, multus b250iiw,
 *     lb3000exii, genos l400ii)
 *   - Hurco (2: vm30i, vmx42i)
 *   - DMG MORI (1: dmu50)
 *   - Mazak (1: variaxis i600)
 *   - Makino (1: d500)
 *   - Brother (1: s500x1)
 *   - Roku-Roku (1: rqm5)
 *   - Doosan (1: dnm500)
 *   - Hermle (1: c32u)
 *
 * Each config carries:
 *   - controller name (haas_ngc, okuma_osp_p300m, hurco_winmax, etc.)
 *   - defaultLevel (1-10 aggression scale, default 5)
 *   - chipThinning enabled/maxMultiplier
 *   - arcCorrection/directionChange/adaptiveDepth/stickoutCompensation flags
 *   - smoothing G-codes (vendor-specific: Haas G187, Okuma G131, Hurco G05.3,
 *     Mazak G05.1, Makino G05, Heidenhain CYCL DEF 32.0, etc.)
 *   - optional: liveToolLimits (lathes/mill-turn), fiveAxis/fiveAxisFeedLimit,
 *     highPrecision (Roku-Roku), cycleTimeOptimization (Okuma)
 *
 * **Inheritance resolution.** 7 of 18 configs use `inherits` to extend
 * another config (e.g. `haas_umc750` inherits `haas_vf2` then adds 5-axis
 * limits). The engine resolves the chain by deep-merging — child fields
 * override parent fields for the same key. Lazy + memoized to keep
 * `getConfig()` O(1) after first call.
 *
 * Data-only engine, no physics. Stateless catalog query surface mirroring
 * MonolithWorkholdingDatabaseEngine / MonolithHyperMillFixtureDatabaseEngine.
 *
 * @milestone JULIETT-DB-BRIDGE-MS0/U-DB-MONOLITH-ROUGHING-MACHINE-CONFIGS-LOADER
 *   (slot juliett, 2026-05-26)
 * @source extracted_modules/databases/PRISM_ROUGHING_MACHINE_CONFIGS_V2.js
 */

export interface SmoothingCodes {
  roughing?: string;
  adaptive?: string;
  finishing?: string;
}

export interface ChipThinningSpec {
  enabled: boolean;
  maxMultiplier: number;
}

export interface StickoutCompensationSpec {
  enabled: boolean;
  reductionFactor?: number;
}

export interface LiveToolLimits {
  maxRpm: number;
  maxFeed: number;
}

export interface FiveAxisSpec {
  enabled: boolean;
  tcpSmoothing?: string;
  maxRotaryFeed?: number;
}

export interface HighPrecisionSpec {
  aiContour?: boolean;
  nanoSmooth?: boolean;
}

export interface CycleTimeOptimization {
  enabled: boolean;
  codes: string[];
}

export interface FiveAxisFeedLimit {
  enabled: boolean;
  maxDegPerMin: number;
}

/**
 * The raw config shape as stored in the monolith. `inherits` is the unresolved
 * pointer; consumers should use `getConfig(id)` which deep-merges parents.
 */
export interface RoughingMachineConfigRaw {
  inherits?: string;
  controller?: string;
  enabled?: boolean;
  defaultLevel?: number;
  chipThinning?: ChipThinningSpec;
  arcCorrection?: { enabled: boolean };
  directionChange?: { enabled: boolean };
  adaptiveDepth?: { enabled: boolean };
  stickoutCompensation?: StickoutCompensationSpec;
  smoothing?: SmoothingCodes;
  liveToolLimits?: LiveToolLimits;
  fiveAxis?: FiveAxisSpec;
  fiveAxisFeedLimit?: FiveAxisFeedLimit;
  highPrecision?: HighPrecisionSpec;
  cycleTimeOptimization?: CycleTimeOptimization;
}

export interface RoughingMachineConfig extends RoughingMachineConfigRaw {
  id: string;
  /** Inheritance chain that produced this resolved config, parent→child. */
  resolvedFrom: string[];
}

const CONFIGS: Record<string, RoughingMachineConfigRaw> = {
  // Haas Mills
  haas_vf2: {
    controller: "haas_ngc", enabled: true, defaultLevel: 5,
    chipThinning: { enabled: true, maxMultiplier: 2.5 },
    arcCorrection: { enabled: true },
    directionChange: { enabled: true },
    adaptiveDepth: { enabled: true },
    stickoutCompensation: { enabled: true },
    smoothing: { roughing: "G187 P1 E0.001", adaptive: "G187 P2 E0.0005", finishing: "G187 P3 E0.0001" },
  },
  haas_umc750: {
    inherits: "haas_vf2",
    fiveAxisFeedLimit: { enabled: true, maxDegPerMin: 5000 },
  },

  // Okuma Mills
  okuma_genos_m460ve: {
    controller: "okuma_osp_p300m", enabled: true, defaultLevel: 5,
    chipThinning: { enabled: true, maxMultiplier: 2.5 },
    arcCorrection: { enabled: true },
    directionChange: { enabled: true },
    adaptiveDepth: { enabled: true },
    stickoutCompensation: { enabled: true },
    smoothing: { roughing: "G131 P1", adaptive: "G131 P2", finishing: "G131 P3" },
    cycleTimeOptimization: { enabled: true, codes: ["M63", "M61"] },
  },
  okuma_genos_m460v_5ax: {
    inherits: "okuma_genos_m460ve",
    fiveAxis: { enabled: true, tcpSmoothing: "G131 P2", maxRotaryFeed: 5000 },
  },
  okuma_mu4000v: { inherits: "okuma_genos_m460v_5ax" },
  okuma_mu5000v: { inherits: "okuma_genos_m460v_5ax" },

  // Okuma Mill-Turn (live tooling)
  okuma_multus_b250iiw: {
    controller: "okuma_osp_p300l", enabled: true, defaultLevel: 4,
    chipThinning: { enabled: true, maxMultiplier: 2.0 },
    arcCorrection: { enabled: true },
    directionChange: { enabled: true },
    adaptiveDepth: { enabled: true },
    stickoutCompensation: { enabled: true, reductionFactor: 0.20 },
    smoothing: { roughing: "G131 P2", adaptive: "G131 P3" },
    liveToolLimits: { maxRpm: 12000, maxFeed: 100 },
  },

  // Okuma Lathes with live tooling
  okuma_lb3000exii: {
    controller: "okuma_osp_p300l", enabled: true, defaultLevel: 4,
    chipThinning: { enabled: true, maxMultiplier: 1.8 },
    arcCorrection: { enabled: true },
    directionChange: { enabled: true },
    stickoutCompensation: { enabled: true, reductionFactor: 0.25 },
    liveToolLimits: { maxRpm: 6000, maxFeed: 60 },
  },
  okuma_genos_l400ii: {
    inherits: "okuma_lb3000exii",
    liveToolLimits: { maxRpm: 6000, maxFeed: 50 },
  },

  // Hurco Mills
  hurco_vm30i: {
    controller: "hurco_winmax", enabled: true, defaultLevel: 5,
    chipThinning: { enabled: true, maxMultiplier: 2.5 },
    arcCorrection: { enabled: true },
    directionChange: { enabled: true },
    adaptiveDepth: { enabled: true },
    stickoutCompensation: { enabled: true },
    smoothing: { roughing: "G05.3 P50", adaptive: "G05.3 P35", finishing: "G05.3 P15" },
  },
  hurco_vmx42i: { inherits: "hurco_vm30i" },

  // DMG MORI
  dmgmori_dmu50: {
    controller: "dmgmori_celos", enabled: true, defaultLevel: 5,
    chipThinning: { enabled: true, maxMultiplier: 2.5 },
    arcCorrection: { enabled: true },
    directionChange: { enabled: true },
    adaptiveDepth: { enabled: true },
    stickoutCompensation: { enabled: true },
    smoothing: { roughing: "M200", adaptive: "M200" },
  },

  // Mazak
  mazak_variaxis_i600: {
    controller: "mazak_smooth", enabled: true, defaultLevel: 5,
    chipThinning: { enabled: true, maxMultiplier: 2.5 },
    arcCorrection: { enabled: true },
    directionChange: { enabled: true },
    adaptiveDepth: { enabled: true },
    stickoutCompensation: { enabled: true },
    smoothing: { roughing: "G05.1 Q1", adaptive: "G05.1 Q1" },
  },

  // Makino
  makino_d500: {
    controller: "makino_pro", enabled: true, defaultLevel: 5,
    chipThinning: { enabled: true, maxMultiplier: 2.5 },
    arcCorrection: { enabled: true },
    directionChange: { enabled: true },
    adaptiveDepth: { enabled: true },
    stickoutCompensation: { enabled: true },
    smoothing: { roughing: "G05 P2", adaptive: "G05 P10000" },
  },

  // Brother
  brother_s500x1: {
    controller: "brother_cnc", enabled: true, defaultLevel: 5,
    chipThinning: { enabled: true, maxMultiplier: 2.0 },
    arcCorrection: { enabled: true },
    directionChange: { enabled: true },
    adaptiveDepth: { enabled: true },
    stickoutCompensation: { enabled: true },
    smoothing: { roughing: "G05 P1", adaptive: "G05 P1" },
  },

  // Roku-Roku (high precision)
  roku_roku_rqm5: {
    controller: "fanuc_31i", enabled: true, defaultLevel: 6,
    chipThinning: { enabled: true, maxMultiplier: 2.5 },
    arcCorrection: { enabled: true },
    directionChange: { enabled: true },
    adaptiveDepth: { enabled: true },
    stickoutCompensation: { enabled: true },
    smoothing: { roughing: "G05 P10000", adaptive: "G05.1 Q1" },
    highPrecision: { aiContour: true, nanoSmooth: true },
  },

  // Doosan
  doosan_dnm500: {
    controller: "fanuc_0i", enabled: true, defaultLevel: 5,
    chipThinning: { enabled: true, maxMultiplier: 2.5 },
    arcCorrection: { enabled: true },
    directionChange: { enabled: true },
    adaptiveDepth: { enabled: true },
    stickoutCompensation: { enabled: true },
    smoothing: { roughing: "G05.1 Q1", adaptive: "G05.1 Q1" },
  },

  // Hermle
  hermle_c32u: {
    controller: "heidenhain_tnc640", enabled: true, defaultLevel: 5,
    chipThinning: { enabled: true, maxMultiplier: 2.5 },
    arcCorrection: { enabled: true },
    directionChange: { enabled: true },
    adaptiveDepth: { enabled: true },
    stickoutCompensation: { enabled: true },
    smoothing: { roughing: "CYCL DEF 32.0 TOLERANCE", adaptive: "CYCL DEF 32.0 TOLERANCE" },
  },
};

const MAX_INHERITANCE_DEPTH = 10;

export class MonolithRoughingMachineConfigsEngine {
  private resolvedCache = new Map<string, RoughingMachineConfig>();

  /**
   * Resolve the full effective config for a machine id, walking the inherits
   * chain parent-first and child-overriding. Memoized. Returns null on
   * unknown id or cyclic/over-deep inheritance.
   */
  getConfig(id: string): RoughingMachineConfig | null {
    if (typeof id !== "string" || id.trim() === "") return null;
    const cached = this.resolvedCache.get(id);
    if (cached !== undefined) return cached;
    if (!CONFIGS[id]) return null;

    const chain: string[] = [];
    let cursor: string | undefined = id;
    const visited = new Set<string>();

    while (cursor && chain.length < MAX_INHERITANCE_DEPTH) {
      if (visited.has(cursor)) return null;  // cycle guard
      visited.add(cursor);
      chain.unshift(cursor);
      const node: RoughingMachineConfigRaw | undefined = CONFIGS[cursor];
      if (!node) return null;
      cursor = node.inherits;
    }
    if (cursor) return null;  // depth-exceeded

    // Deep-merge along the chain: parent → child (child wins).
    const resolved: Partial<RoughingMachineConfig> = {};
    for (const link of chain) {
      const node = CONFIGS[link];
      this.mergeInto(resolved, node);
    }
    delete (resolved as RoughingMachineConfigRaw).inherits;
    const out: RoughingMachineConfig = {
      ...resolved,
      id,
      resolvedFrom: chain,
    };
    this.resolvedCache.set(id, out);
    return out;
  }

  /** Raw config without inheritance resolution. Returns null on unknown id. */
  getRawConfig(id: string): RoughingMachineConfigRaw | null {
    if (typeof id !== "string" || id.trim() === "") return null;
    const c = CONFIGS[id];
    return c ? { ...c } : null;
  }

  listIds(): string[] {
    return Object.keys(CONFIGS);
  }

  /** All resolved configs. */
  list(): RoughingMachineConfig[] {
    return this.listIds()
      .map((id) => this.getConfig(id))
      .filter((c): c is RoughingMachineConfig => c !== null);
  }

  listByController(controller: string): RoughingMachineConfig[] {
    if (typeof controller !== "string" || controller.trim() === "") return [];
    const want = controller.toLowerCase();
    return this.list().filter((c) => c.controller?.toLowerCase() === want);
  }

  listByManufacturer(manufacturer: string): RoughingMachineConfig[] {
    if (typeof manufacturer !== "string" || manufacturer.trim() === "") return [];
    const want = manufacturer.toLowerCase();
    return this.list().filter((c) => c.id.toLowerCase().startsWith(`${want}_`));
  }

  /**
   * All configs that support live tooling (lathes + mill-turn).
   * These have `liveToolLimits` populated (either own or inherited).
   */
  listLiveToolCapable(): RoughingMachineConfig[] {
    return this.list().filter((c) => c.liveToolLimits !== undefined);
  }

  /** All configs that support 5-axis kinematics. */
  listFiveAxisCapable(): RoughingMachineConfig[] {
    return this.list().filter(
      (c) => c.fiveAxis !== undefined || c.fiveAxisFeedLimit !== undefined,
    );
  }

  /**
   * Fuzzy search over id + controller. Empty/non-string → [].
   */
  search(query: string, limit = 20): RoughingMachineConfig[] {
    if (typeof query !== "string") return [];
    const q = query.trim().toLowerCase();
    if (q === "") return [];
    if (!Number.isInteger(limit) || limit <= 0) return [];

    const hits: RoughingMachineConfig[] = [];
    for (const c of this.list()) {
      const hay = `${c.id} ${c.controller ?? ""}`.toLowerCase();
      if (hay.includes(q)) {
        hits.push(c);
        if (hits.length >= limit) return hits;
      }
    }
    return hits;
  }

  stats(): {
    total: number;
    with_inheritance: number;
    live_tool_capable: number;
    five_axis_capable: number;
    by_controller: Record<string, number>;
  } {
    const all = this.list();
    const byCtrl: Record<string, number> = {};
    for (const c of all) {
      if (c.controller) byCtrl[c.controller] = (byCtrl[c.controller] ?? 0) + 1;
    }
    return {
      total: all.length,
      with_inheritance: this.listIds().filter((id) => CONFIGS[id].inherits !== undefined).length,
      live_tool_capable: this.listLiveToolCapable().length,
      five_axis_capable: this.listFiveAxisCapable().length,
      by_controller: byCtrl,
    };
  }

  /** Shallow merge with controlled deep-merge for known nested keys. */
  private mergeInto(target: Partial<RoughingMachineConfig>, source: RoughingMachineConfigRaw): void {
    for (const key of Object.keys(source) as Array<keyof RoughingMachineConfigRaw>) {
      if (key === "inherits") continue;
      const sv = source[key];
      if (sv === undefined) continue;
      // Nested objects we deep-merge so a child can override a single field
      // (e.g. okuma_genos_l400ii overrides only liveToolLimits.maxFeed).
      if (sv !== null && typeof sv === "object" && !Array.isArray(sv)) {
        const tv = (target as Record<string, unknown>)[key];
        const base = tv !== null && typeof tv === "object" && !Array.isArray(tv) ? tv : {};
        (target as Record<string, unknown>)[key] = { ...base, ...sv };
      } else {
        (target as Record<string, unknown>)[key] = sv;
      }
    }
  }
}

export const monolithRoughingMachineConfigsEngine = new MonolithRoughingMachineConfigsEngine();
