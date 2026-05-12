/**
 * MCAT-MS0 P2-U02: Machine Capability Surface Engine
 *
 * Surfaces controller capabilities, spindle packages, and coolant strategies
 * directly from the machine-package truth model for calculator and downstream
 * consumer use.
 *
 * Key features:
 * - Unified capability queries across all machine packages
 * - Controller feature matrix (G-codes, M-codes, macros, canned cycles)
 * - Spindle package specifications (power curves, torque, speed ranges)
 * - Coolant strategy compatibility (through-spindle, flood, mist, MQL)
 * - Capability comparison across machines
 *
 * @module engines/MachineCapabilitySurfaceEngine
 * @milestone MCAT-MS0/P2-U02
 */

import { log } from "../utils/Logger.js";
import type { CanonicalMachinePackage } from "../types/MachinePackage.js";
import { machineService } from "../services/MachineService.js";
import { machineVocabularyNormalizerEngine } from "./MachineVocabularyNormalizerEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export interface ControllerCapabilities {
  machineId: string;
  controllerFamily: string;
  controllerModel?: string;
  vendor: string;
  features: ControllerFeatureSet;
  programmingDialect: string;
  macroSupport: MacroCapabilities;
  cannedCycles: string[];
  customMCodes: string[];
  customGCodes: string[];
  limitations: string[];
}

export interface ControllerFeatureSet {
  highSpeedMachining: boolean;
  lookAhead: number;
  nanoSmoothing: boolean;
  aiContour: boolean;
  conversationalProgramming: boolean;
  toolLifeManagement: boolean;
  adaptiveControl: boolean;
  collisionAvoidance: boolean;
  thermalCompensation: boolean;
  volumetricCompensation: boolean;
}

export interface MacroCapabilities {
  supported: boolean;
  type: "fanuc" | "haas" | "siemens" | "mazak" | "okuma" | "custom" | "none";
  variableRange?: { min: number; max: number };
  localVariables: number;
  commonVariables: number;
  systemVariables: boolean;
}

export interface SpindlePackage {
  machineId: string;
  spindleId: string;
  type: "belt" | "gear" | "direct" | "motorized" | "electrospindle";
  maxRpm: number;
  minRpm: number;
  ratedPower: number;
  peakPower?: number;
  continuousTorque: number;
  peakTorque?: number;
  taper: string;
  bearingType: string;
  coolingType: string;
  powerCurve?: PowerCurvePoint[];
  speedRanges?: SpeedRange[];
  limitations: string[];
}

export interface PowerCurvePoint {
  rpm: number;
  power: number;
  torque: number;
}

export interface SpeedRange {
  name: string;
  minRpm: number;
  maxRpm: number;
  gearRatio?: number;
}

export interface CoolantStrategy {
  machineId: string;
  strategies: CoolantOption[];
  defaultStrategy: string;
  throughSpindleCapable: boolean;
  throughToolCapable: boolean;
  maxPressure: number;
  pressureUnit: "bar" | "psi";
  flowRate?: number;
  tankCapacity?: number;
  filtration: string;
}

export interface CoolantOption {
  id: string;
  type: "flood" | "mist" | "mql" | "through_spindle" | "through_tool" | "cryogenic" | "air" | "dry";
  pressure?: number;
  available: boolean;
  standard: boolean;
  priceAdder?: number;
}

export interface CapabilitySummary {
  machineId: string;
  manufacturer: string;
  model: string;
  type: string;
  controller: ControllerCapabilities;
  spindle: SpindlePackage;
  coolant: CoolantStrategy;
  overallCapabilityScore: number;
}

export interface CapabilityComparison {
  machines: string[];
  controllerComparison: Record<string, Partial<ControllerFeatureSet>>;
  spindleComparison: Record<string, { maxRpm: number; power: number; torque: number }>;
  coolantComparison: Record<string, { types: string[]; maxPressure: number }>;
  recommendations: string[];
}

// ============================================================================
// CONTROLLER FEATURE PROFILES
// ============================================================================

const CONTROLLER_PROFILES: Record<string, Partial<ControllerFeatureSet>> = {
  "fanuc": {
    highSpeedMachining: true,
    lookAhead: 200,
    nanoSmoothing: true,
    aiContour: true,
    conversationalProgramming: false,
    toolLifeManagement: true,
    adaptiveControl: true,
    collisionAvoidance: true,
    thermalCompensation: true,
    volumetricCompensation: true,
  },
  "siemens": {
    highSpeedMachining: true,
    lookAhead: 150,
    nanoSmoothing: true,
    aiContour: false,
    conversationalProgramming: true,
    toolLifeManagement: true,
    adaptiveControl: true,
    collisionAvoidance: true,
    thermalCompensation: true,
    volumetricCompensation: true,
  },
  "haas": {
    highSpeedMachining: true,
    lookAhead: 80,
    nanoSmoothing: false,
    aiContour: false,
    conversationalProgramming: true,
    toolLifeManagement: true,
    adaptiveControl: false,
    collisionAvoidance: false,
    thermalCompensation: true,
    volumetricCompensation: false,
  },
  "mazak": {
    highSpeedMachining: true,
    lookAhead: 200,
    nanoSmoothing: true,
    aiContour: true,
    conversationalProgramming: true,
    toolLifeManagement: true,
    adaptiveControl: true,
    collisionAvoidance: true,
    thermalCompensation: true,
    volumetricCompensation: true,
  },
  "okuma": {
    highSpeedMachining: true,
    lookAhead: 180,
    nanoSmoothing: true,
    aiContour: false,
    conversationalProgramming: true,
    toolLifeManagement: true,
    adaptiveControl: true,
    collisionAvoidance: true,
    thermalCompensation: true,
    volumetricCompensation: true,
  },
  "dmg_mori": {
    highSpeedMachining: true,
    lookAhead: 200,
    nanoSmoothing: true,
    aiContour: true,
    conversationalProgramming: true,
    toolLifeManagement: true,
    adaptiveControl: true,
    collisionAvoidance: true,
    thermalCompensation: true,
    volumetricCompensation: true,
  },
};

const CANNED_CYCLES: Record<string, string[]> = {
  "fanuc": ["G73", "G74", "G76", "G80", "G81", "G82", "G83", "G84", "G85", "G86", "G87", "G88", "G89"],
  "siemens": ["CYCLE81", "CYCLE82", "CYCLE83", "CYCLE84", "CYCLE85", "CYCLE86", "CYCLE840", "POCKET1", "POCKET2"],
  "haas": ["G73", "G74", "G76", "G77", "G80", "G81", "G82", "G83", "G84", "G85", "G86", "G87", "G88", "G89"],
  "mazak": ["G73", "G74", "G76", "G81", "G82", "G83", "G84", "G85", "G86", "G87", "G88", "G89"],
  "okuma": ["G81", "G82", "G83", "G84", "G85", "G86", "G87", "G88", "G89", "NAVI"],
};

// ============================================================================
// ENGINE IMPLEMENTATION
// ============================================================================

class MachineCapabilitySurfaceEngine {
  private packageCache: Map<string, CanonicalMachinePackage> = new Map();

  /**
   * Get controller capabilities for a machine
   */
  getControllerCapabilities(machineId: string): ControllerCapabilities | null {
    const pkg = this.getPackage(machineId);
    if (!pkg) return null;

    const ctrl = pkg.controller ?? {};
    const family = (ctrl.family ?? "unknown").toLowerCase();
    const normalized = machineVocabularyNormalizerEngine.normalizeController(ctrl.family ?? "");

    const baseFeatures = CONTROLLER_PROFILES[family] ?? CONTROLLER_PROFILES["fanuc"] ?? {};
    const features: ControllerFeatureSet = {
      highSpeedMachining: baseFeatures.highSpeedMachining ?? false,
      lookAhead: baseFeatures.lookAhead ?? 50,
      nanoSmoothing: baseFeatures.nanoSmoothing ?? false,
      aiContour: baseFeatures.aiContour ?? false,
      conversationalProgramming: baseFeatures.conversationalProgramming ?? false,
      toolLifeManagement: baseFeatures.toolLifeManagement ?? false,
      adaptiveControl: baseFeatures.adaptiveControl ?? false,
      collisionAvoidance: baseFeatures.collisionAvoidance ?? false,
      thermalCompensation: baseFeatures.thermalCompensation ?? false,
      volumetricCompensation: baseFeatures.volumetricCompensation ?? false,
    };

    const macroType = this.inferMacroType(family);

    return {
      machineId,
      controllerFamily: normalized.normalized?.family ?? ctrl.family ?? "Unknown",
      controllerModel: ctrl.model,
      vendor: normalized.normalized?.vendor ?? ctrl.vendor ?? "Unknown",
      features,
      programmingDialect: this.inferDialect(family),
      macroSupport: {
        supported: macroType !== "none",
        type: macroType,
        variableRange: macroType === "fanuc" ? { min: 100, max: 999 } : undefined,
        localVariables: macroType === "fanuc" ? 33 : macroType === "haas" ? 26 : 0,
        commonVariables: macroType === "fanuc" ? 100 : macroType === "haas" ? 100 : 0,
        systemVariables: macroType !== "none",
      },
      cannedCycles: CANNED_CYCLES[family] ?? CANNED_CYCLES["fanuc"] ?? [],
      customMCodes: [],
      customGCodes: [],
      limitations: this.inferControllerLimitations(features),
    };
  }

  /**
   * Get spindle package for a machine
   */
  getSpindlePackage(machineId: string): SpindlePackage | null {
    const pkg = this.getPackage(machineId);
    if (!pkg) return null;

    const spindle = pkg.spindle ?? {};
    const maxRpm = spindle.max_rpm ?? 10000;
    const power = spindle.power ?? 15;
    const torque = spindle.torque ?? this.estimateTorque(power, maxRpm);

    return {
      machineId,
      spindleId: `${machineId}-spindle-main`,
      type: this.inferSpindleType(maxRpm, power),
      maxRpm,
      minRpm: Math.max(50, Math.floor(maxRpm * 0.01)),
      ratedPower: power,
      peakPower: power * 1.25,
      continuousTorque: torque,
      peakTorque: torque * 1.5,
      taper: this.inferTaper(pkg.type, maxRpm),
      bearingType: maxRpm > 15000 ? "ceramic_hybrid" : "steel_roller",
      coolingType: maxRpm > 12000 ? "oil_air" : "oil_jacket",
      powerCurve: this.generatePowerCurve(maxRpm, power, torque),
      speedRanges: this.inferSpeedRanges(maxRpm, pkg.type),
      limitations: this.inferSpindleLimitations(maxRpm, power, torque),
    };
  }

  /**
   * Get coolant strategy for a machine
   */
  getCoolantStrategy(machineId: string): CoolantStrategy | null {
    const pkg = this.getPackage(machineId);
    if (!pkg) return null;

    const coolant = pkg.coolant ?? {};
    const coolType = coolant.type ?? "flood";
    const pressure = coolant.pressure ?? "medium";

    const strategies: CoolantOption[] = [
      { id: "flood", type: "flood", available: true, standard: true },
      { id: "mist", type: "mist", available: true, standard: false },
      { id: "air", type: "air", available: true, standard: true },
    ];

    const throughSpindleCapable = coolType === "through_spindle" || coolType === "through_tool" ||
      pressure === "high" || pressure === "ultra_high";
    const throughToolCapable = coolType === "through_tool" || pressure === "ultra_high";

    if (throughSpindleCapable) {
      strategies.push({ id: "tsc", type: "through_spindle", pressure: 70, available: true, standard: false });
    }
    if (throughToolCapable) {
      strategies.push({ id: "ttc", type: "through_tool", pressure: 100, available: true, standard: false });
    }

    const maxPressure = pressure === "ultra_high" ? 150 :
                        pressure === "high" ? 70 :
                        pressure === "medium" ? 20 : 5;

    return {
      machineId,
      strategies,
      defaultStrategy: coolType,
      throughSpindleCapable,
      throughToolCapable,
      maxPressure,
      pressureUnit: "bar",
      flowRate: maxPressure > 50 ? 20 : 40,
      tankCapacity: 200,
      filtration: maxPressure > 50 ? "fine_10um" : "standard_25um",
    };
  }

  /**
   * Get full capability summary for a machine
   */
  getCapabilitySummary(machineId: string): CapabilitySummary | null {
    const pkg = this.getPackage(machineId);
    if (!pkg) return null;

    const controller = this.getControllerCapabilities(machineId);
    const spindle = this.getSpindlePackage(machineId);
    const coolant = this.getCoolantStrategy(machineId);

    if (!controller || !spindle || !coolant) return null;

    const score = this.calculateCapabilityScore(controller, spindle, coolant);

    return {
      machineId,
      manufacturer: pkg.manufacturer,
      model: pkg.model,
      type: pkg.type,
      controller,
      spindle,
      coolant,
      overallCapabilityScore: score,
    };
  }

  /**
   * Compare capabilities across multiple machines
   */
  compareCapabilities(machineIds: string[]): CapabilityComparison {
    const controllerComparison: Record<string, Partial<ControllerFeatureSet>> = {};
    const spindleComparison: Record<string, { maxRpm: number; power: number; torque: number }> = {};
    const coolantComparison: Record<string, { types: string[]; maxPressure: number }> = {};
    const recommendations: string[] = [];

    for (const id of machineIds) {
      const ctrl = this.getControllerCapabilities(id);
      const spindle = this.getSpindlePackage(id);
      const coolant = this.getCoolantStrategy(id);

      if (ctrl) {
        controllerComparison[id] = ctrl.features;
      }
      if (spindle) {
        spindleComparison[id] = {
          maxRpm: spindle.maxRpm,
          power: spindle.ratedPower,
          torque: spindle.continuousTorque,
        };
      }
      if (coolant) {
        coolantComparison[id] = {
          types: coolant.strategies.filter(s => s.available).map(s => s.type),
          maxPressure: coolant.maxPressure,
        };
      }
    }

    // Generate recommendations
    const maxRpms = Object.values(spindleComparison).map(s => s.maxRpm);
    const maxPowers = Object.values(spindleComparison).map(s => s.power);

    if (maxRpms.length > 1) {
      const highest = Math.max(...maxRpms);
      const lowest = Math.min(...maxRpms);
      if (highest > lowest * 2) {
        recommendations.push(`Significant spindle speed variance (${lowest}-${highest} RPM) — consider application requirements`);
      }
    }

    const tscCapable = Object.entries(coolantComparison)
      .filter(([_, c]) => c.types.includes("through_spindle"))
      .map(([id]) => id);
    if (tscCapable.length > 0 && tscCapable.length < machineIds.length) {
      recommendations.push(`Only ${tscCapable.join(", ")} support through-spindle coolant`);
    }

    return {
      machines: machineIds,
      controllerComparison,
      spindleComparison,
      coolantComparison,
      recommendations,
    };
  }

  /**
   * Find machines by capability requirements
   */
  findByCapabilities(requirements: {
    minSpindleRpm?: number;
    minPower?: number;
    throughSpindleCoolant?: boolean;
    controllerFeatures?: (keyof ControllerFeatureSet)[];
  }): string[] {
    const matches: string[] = [];
    const packages = this.loadAllPackages();

    for (const pkg of packages) {
      const spindle = this.getSpindlePackage(pkg.canonical_id);
      const coolant = this.getCoolantStrategy(pkg.canonical_id);
      const controller = this.getControllerCapabilities(pkg.canonical_id);

      if (!spindle || !coolant || !controller) continue;

      if (requirements.minSpindleRpm && spindle.maxRpm < requirements.minSpindleRpm) continue;
      if (requirements.minPower && spindle.ratedPower < requirements.minPower) continue;
      if (requirements.throughSpindleCoolant && !coolant.throughSpindleCapable) continue;

      if (requirements.controllerFeatures) {
        const hasAll = requirements.controllerFeatures.every(f => controller.features[f]);
        if (!hasAll) continue;
      }

      matches.push(pkg.canonical_id);
    }

    return matches;
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private getPackage(machineId: string): CanonicalMachinePackage | null {
    if (this.packageCache.has(machineId)) {
      return this.packageCache.get(machineId)!;
    }

    try {
      const machine = machineService.get(machineId);
      if (machine) {
        const pkg = this.convertToPackage(machine);
        if (pkg) {
          this.packageCache.set(machineId, pkg);
          return pkg;
        }
      }
    } catch { /* not found */ }

    // Try fallbacks
    const fallback = this.getFallbackPackage(machineId);
    if (fallback) {
      this.packageCache.set(machineId, fallback);
    }
    return fallback;
  }

  private loadAllPackages(): CanonicalMachinePackage[] {
    try {
      const machines = machineService.list();
      return machines.map(m => this.convertToPackage(m)).filter((p): p is CanonicalMachinePackage => p !== null);
    } catch {
      return this.getFallbackPackages();
    }
  }

  private convertToPackage(machine: any): CanonicalMachinePackage | null {
    if (!machine?.id) return null;

    return {
      canonical_id: machine.id,
      manufacturer: machine.manufacturer ?? "Unknown",
      model: machine.model ?? machine.name ?? machine.id,
      type: machine.type ?? "VMC",
      controller: machine.controller ?? {},
      spindle: machine.spindle ?? {},
      envelope: machine.envelope ?? {},
      coolant: machine.coolant ?? {},
      axes: machine.axes ?? { count: 3 },
      tool_changer: machine.tool_changer ?? {},
      provenance: {},
      ambiguities: [],
      enrichment_history: [],
      confidence_breakdown: { controller: 0.5, spindle: 0.5, coolant: 0.5, envelope: 0.5, axes: 0.5, tool_changer: 0.5, overall: 0.5 },
      source_ids: [machine.id],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  private getFallbackPackage(machineId: string): CanonicalMachinePackage | null {
    const fallbacks = this.getFallbackPackages();
    return fallbacks.find(p => p.canonical_id === machineId) ?? null;
  }

  private getFallbackPackages(): CanonicalMachinePackage[] {
    return [
      { canonical_id: "haas_vf2", manufacturer: "Haas", model: "VF-2", type: "VMC", controller: { family: "Haas", vendor: "Haas" }, spindle: { max_rpm: 8100, power: 22.4 }, coolant: { type: "flood", pressure: "medium" }, envelope: { x: 762, y: 406, z: 508 }, axes: { count: 3 }, tool_changer: { capacity: 20 }, provenance: {}, ambiguities: [], enrichment_history: [], confidence_breakdown: { controller: 0.5, spindle: 0.5, coolant: 0.5, envelope: 0.5, axes: 0.5, tool_changer: 0.5, overall: 0.5 }, source_ids: ["fallback"], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { canonical_id: "dmg_dmu50", manufacturer: "DMG MORI", model: "DMU 50", type: "5AXIS", controller: { family: "Siemens", model: "840D", vendor: "Siemens" }, spindle: { max_rpm: 14000, power: 25 }, coolant: { type: "through_spindle", pressure: "high" }, envelope: { x: 500, y: 450, z: 400 }, axes: { count: 5 }, tool_changer: { capacity: 30 }, provenance: {}, ambiguities: [], enrichment_history: [], confidence_breakdown: { controller: 0.6, spindle: 0.6, coolant: 0.6, envelope: 0.6, axes: 0.6, tool_changer: 0.6, overall: 0.6 }, source_ids: ["fallback"], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { canonical_id: "okuma_lb3000", manufacturer: "Okuma", model: "LB3000 EX II", type: "LATHE", controller: { family: "OSP", model: "OSP-P300", vendor: "Okuma" }, spindle: { max_rpm: 5000, power: 22, torque: 190 }, coolant: { type: "flood", pressure: "medium" }, envelope: { x: 260, y: 0, z: 500 }, axes: { count: 2 }, tool_changer: { capacity: 12 }, provenance: {}, ambiguities: [], enrichment_history: [], confidence_breakdown: { controller: 0.6, spindle: 0.7, coolant: 0.5, envelope: 0.6, axes: 0.6, tool_changer: 0.5, overall: 0.6 }, source_ids: ["fallback"], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    ] as CanonicalMachinePackage[];
  }

  private inferMacroType(family: string): MacroCapabilities["type"] {
    if (family.includes("fanuc") || family.includes("brother")) return "fanuc";
    if (family.includes("haas")) return "haas";
    if (family.includes("siemens")) return "siemens";
    if (family.includes("mazak") || family.includes("mazatrol")) return "mazak";
    if (family.includes("okuma") || family.includes("osp")) return "okuma";
    return "fanuc"; // Default to Fanuc-style
  }

  private inferDialect(family: string): string {
    if (family.includes("siemens")) return "ISO/Siemens";
    if (family.includes("mazatrol")) return "Mazatrol";
    if (family.includes("osp")) return "OSP";
    return "ISO/Fanuc";
  }

  private inferControllerLimitations(features: ControllerFeatureSet): string[] {
    const limitations: string[] = [];
    if (!features.nanoSmoothing) limitations.push("No nano-smoothing for complex surfaces");
    if (!features.collisionAvoidance) limitations.push("No automatic collision avoidance");
    if (!features.volumetricCompensation) limitations.push("Limited volumetric accuracy compensation");
    if (features.lookAhead < 100) limitations.push(`Limited look-ahead (${features.lookAhead} blocks)`);
    return limitations;
  }

  private inferSpindleType(maxRpm: number, power: number): SpindlePackage["type"] {
    if (maxRpm > 20000) return "electrospindle";
    if (maxRpm > 15000) return "motorized";
    if (power > 30) return "gear";
    return "belt";
  }

  private inferTaper(machineType: string, maxRpm: number): string {
    if (machineType === "LATHE") return "A2-6";
    if (maxRpm > 15000) return "HSK-A63";
    if (maxRpm > 10000) return "HSK-A63";
    return "BT40";
  }

  private estimateTorque(power: number, maxRpm: number): number {
    // Torque (Nm) = Power (kW) * 9549 / RPM at constant power region
    // Assume constant power starts at 50% of max RPM
    const constPowerRpm = maxRpm * 0.5;
    return Math.round((power * 9549) / constPowerRpm);
  }

  private generatePowerCurve(maxRpm: number, power: number, torque: number): PowerCurvePoint[] {
    const points: PowerCurvePoint[] = [];
    const constPowerRpm = maxRpm * 0.5;

    // Constant torque region
    for (let rpm = 500; rpm < constPowerRpm; rpm += Math.floor(constPowerRpm / 5)) {
      points.push({
        rpm,
        torque,
        power: (torque * rpm) / 9549,
      });
    }

    // Constant power region
    for (let rpm = constPowerRpm; rpm <= maxRpm; rpm += Math.floor((maxRpm - constPowerRpm) / 5)) {
      points.push({
        rpm,
        power,
        torque: (power * 9549) / rpm,
      });
    }

    return points;
  }

  private inferSpeedRanges(maxRpm: number, machineType: string): SpeedRange[] {
    if (machineType === "LATHE") {
      return [
        { name: "Low", minRpm: 50, maxRpm: Math.floor(maxRpm * 0.2), gearRatio: 4.0 },
        { name: "Medium", minRpm: Math.floor(maxRpm * 0.15), maxRpm: Math.floor(maxRpm * 0.6), gearRatio: 1.5 },
        { name: "High", minRpm: Math.floor(maxRpm * 0.4), maxRpm: maxRpm, gearRatio: 1.0 },
      ];
    }
    return [{ name: "Direct", minRpm: 100, maxRpm: maxRpm, gearRatio: 1.0 }];
  }

  private inferSpindleLimitations(maxRpm: number, power: number, torque: number): string[] {
    const limitations: string[] = [];
    if (maxRpm < 8000) limitations.push("Limited for aluminum high-speed machining");
    if (power < 15) limitations.push("May limit heavy roughing depths");
    if (torque < 100) limitations.push("Limited torque for large diameter tools");
    return limitations;
  }

  private calculateCapabilityScore(
    controller: ControllerCapabilities,
    spindle: SpindlePackage,
    coolant: CoolantStrategy
  ): number {
    let score = 50;

    // Controller features
    const features = controller.features;
    if (features.highSpeedMachining) score += 5;
    if (features.nanoSmoothing) score += 5;
    if (features.aiContour) score += 5;
    if (features.collisionAvoidance) score += 5;
    if (features.volumetricCompensation) score += 5;
    if (features.lookAhead > 100) score += 3;

    // Spindle
    if (spindle.maxRpm > 15000) score += 5;
    if (spindle.ratedPower > 25) score += 5;
    if (spindle.continuousTorque > 150) score += 5;

    // Coolant
    if (coolant.throughSpindleCapable) score += 5;
    if (coolant.throughToolCapable) score += 3;
    if (coolant.maxPressure > 70) score += 2;

    return Math.min(100, score);
  }

  // ============================================================================
  // SELF-AWARENESS
  // ============================================================================

  getSelfAwareness() {
    return {
      engine: "MachineCapabilitySurfaceEngine",
      purpose: "Surface controller capabilities, spindle packages, and coolant strategies from machine packages",
      milestone: "MCAT-MS0/P2-U02",
      capabilities: [
        "getControllerCapabilities",
        "getSpindlePackage",
        "getCoolantStrategy",
        "getCapabilitySummary",
        "compareCapabilities",
        "findByCapabilities",
      ],
      controllerProfiles: Object.keys(CONTROLLER_PROFILES).length,
      packagesCached: this.packageCache.size,
    };
  }
}

export const machineCapabilitySurfaceEngine = new MachineCapabilitySurfaceEngine();
