/**
 * MCAT-MS0 P1-U03: Machine Option Matrix Engine
 *
 * Defines and validates allowed combinations of controller, spindle,
 * coolant, and capability options for each machine model. Ensures only
 * legal configurations survive through the calculator and shop profile
 * selection workflows.
 *
 * Key guarantees:
 * - Invalid combinations are rejected at query time
 * - Default options are always legal
 * - Option dependencies are enforced (e.g., through-spindle coolant requires compatible spindle)
 * - User overrides are validated against the matrix
 *
 * @module engines/MachineOptionMatrixEngine
 */

import { log } from "../utils/Logger.js";
import type { ControllerCanonical, SpindleCanonical, CoolantCanonical, CapabilityCanonical } from "./MachineVocabularyNormalizerEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export interface OptionMatrixEntry {
  machineId: string;
  manufacturer: string;
  model: string;
  machineType: "lathe" | "mill" | "multitasking" | "edm" | "swiss" | "grinder";
  controllers: ControllerOption[];
  spindles: SpindleOption[];
  coolants: CoolantOption[];
  capabilities: CapabilityOption[];
  incompatibilities: IncompatibilityRule[];
  dependencies: DependencyRule[];
  defaults: DefaultOptions;
}

export interface ControllerOption {
  controllerId: string;
  name: string;
  isDefault: boolean;
  isOptional: boolean;
  priceAdder?: number;
}

export interface SpindleOption {
  spindleId: string;
  type: SpindleCanonical["type"];
  maxRpm: number;
  powerKw: number;
  torqueNm?: number;
  isDefault: boolean;
  isOptional: boolean;
  priceAdder?: number;
}

export interface CoolantOption {
  coolantId: string;
  type: CoolantCanonical["type"];
  pressure?: "low" | "medium" | "high" | "ultra_high";
  isDefault: boolean;
  isOptional: boolean;
  priceAdder?: number;
  requiresSpindle?: string[];
}

export interface CapabilityOption {
  capabilityId: string;
  name: string;
  category: CapabilityCanonical["category"];
  isStandard: boolean;
  isOptional: boolean;
  priceAdder?: number;
  requiresController?: string[];
  requiresSpindle?: string[];
}

export interface IncompatibilityRule {
  id: string;
  description: string;
  condition: {
    type: "controller_spindle" | "spindle_coolant" | "coolant_capability" | "controller_capability";
    item1: string;
    item2: string;
  };
  reason: string;
}

export interface DependencyRule {
  id: string;
  description: string;
  requires: {
    type: "spindle_for_coolant" | "controller_for_capability" | "capability_for_capability";
    dependent: string;
    required: string[];
  };
  reason: string;
}

export interface DefaultOptions {
  controllerId: string;
  spindleId: string;
  coolantId: string;
  capabilities: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestedFixes?: SuggestedFix[];
}

export interface ValidationError {
  code: string;
  message: string;
  field: string;
  invalidValue: string;
  allowedValues?: string[];
}

export interface ValidationWarning {
  code: string;
  message: string;
  field: string;
}

export interface SuggestedFix {
  field: string;
  currentValue: string;
  suggestedValue: string;
  reason: string;
}

export interface ConfigurationQuery {
  machineId: string;
  controllerId?: string;
  spindleId?: string;
  coolantId?: string;
  capabilities?: string[];
}

export interface ConfigurationOptions {
  controllers: ControllerOption[];
  spindles: SpindleOption[];
  coolants: CoolantOption[];
  capabilities: CapabilityOption[];
  filteredBySelection: boolean;
}

// ============================================================================
// MACHINE OPTION MATRICES (Sample data for common machines)
// ============================================================================

const MACHINE_MATRICES: OptionMatrixEntry[] = [
  // Okuma LB3000 EX II
  {
    machineId: "okuma_lb3000_ex_ii",
    manufacturer: "Okuma",
    model: "LB3000 EX II",
    machineType: "lathe",
    controllers: [
      { controllerId: "okuma_osp", name: "OSP-P300A", isDefault: true, isOptional: false },
      { controllerId: "okuma_osp_p500", name: "OSP-P500", isDefault: false, isOptional: true, priceAdder: 15000 },
    ],
    spindles: [
      { spindleId: "lb3000_std", type: "belt", maxRpm: 4200, powerKw: 22, torqueNm: 750, isDefault: true, isOptional: false },
      { spindleId: "lb3000_hs", type: "direct", maxRpm: 6000, powerKw: 22, torqueNm: 520, isDefault: false, isOptional: true, priceAdder: 8000 },
    ],
    coolants: [
      { coolantId: "flood", type: "flood", isDefault: true, isOptional: false },
      { coolantId: "through_spindle", type: "through_spindle", pressure: "high", isDefault: false, isOptional: true, priceAdder: 12000, requiresSpindle: ["lb3000_hs"] },
    ],
    capabilities: [
      { capabilityId: "y_axis", name: "Y-Axis", category: "axis", isStandard: true, isOptional: false },
      { capabilityId: "sub_spindle", name: "Sub-Spindle", category: "workholding", isStandard: false, isOptional: true, priceAdder: 45000 },
      { capabilityId: "live_tooling", name: "Live Tooling", category: "axis", isStandard: true, isOptional: false },
      { capabilityId: "parts_catcher", name: "Parts Catcher", category: "automation", isStandard: false, isOptional: true, priceAdder: 8500 },
      { capabilityId: "bar_feeder", name: "Bar Feeder Interface", category: "automation", isStandard: true, isOptional: false },
    ],
    incompatibilities: [
      {
        id: "tsc_belt_incomp",
        description: "Through-spindle coolant incompatible with belt-driven spindle",
        condition: { type: "spindle_coolant", item1: "lb3000_std", item2: "through_spindle" },
        reason: "Belt-driven spindle does not support through-spindle coolant passage",
      },
    ],
    dependencies: [
      {
        id: "tsc_needs_hs",
        description: "Through-spindle coolant requires high-speed spindle",
        requires: { type: "spindle_for_coolant", dependent: "through_spindle", required: ["lb3000_hs"] },
        reason: "Only direct-drive spindle has coolant passage",
      },
    ],
    defaults: {
      controllerId: "okuma_osp",
      spindleId: "lb3000_std",
      coolantId: "flood",
      capabilities: ["y_axis", "live_tooling", "bar_feeder"],
    },
  },

  // Haas VF-2SS
  {
    machineId: "haas_vf2ss",
    manufacturer: "Haas",
    model: "VF-2SS",
    machineType: "mill",
    controllers: [
      { controllerId: "haas_ngc", name: "Haas NGC", isDefault: true, isOptional: false },
    ],
    spindles: [
      { spindleId: "vf2ss_12k", type: "direct", maxRpm: 12000, powerKw: 22.4, isDefault: true, isOptional: false },
    ],
    coolants: [
      { coolantId: "flood", type: "flood", isDefault: true, isOptional: false },
      { coolantId: "through_spindle", type: "through_spindle", pressure: "high", isDefault: false, isOptional: true, priceAdder: 4995 },
      { coolantId: "mist", type: "mist", isDefault: false, isOptional: true, priceAdder: 1295 },
    ],
    capabilities: [
      { capabilityId: "3_axis", name: "3-Axis", category: "axis", isStandard: true, isOptional: false },
      { capabilityId: "4th_axis", name: "4th Axis Ready", category: "axis", isStandard: false, isOptional: true, priceAdder: 9995 },
      { capabilityId: "probing", name: "Wireless Probing", category: "precision", isStandard: false, isOptional: true, priceAdder: 7995 },
      { capabilityId: "high_speed", name: "High-Speed Machining", category: "speed", isStandard: true, isOptional: false },
      { capabilityId: "chip_auger", name: "Chip Auger", category: "automation", isStandard: false, isOptional: true, priceAdder: 2495 },
    ],
    incompatibilities: [],
    dependencies: [],
    defaults: {
      controllerId: "haas_ngc",
      spindleId: "vf2ss_12k",
      coolantId: "flood",
      capabilities: ["3_axis", "high_speed"],
    },
  },

  // Mazak Quick Turn Nexus 250-II
  {
    machineId: "mazak_qtn250_ii",
    manufacturer: "Mazak",
    model: "QTN-250-II",
    machineType: "lathe",
    controllers: [
      { controllerId: "mazak_mazatrol", name: "Mazatrol SmoothG", isDefault: true, isOptional: false },
    ],
    spindles: [
      { spindleId: "qtn250_std", type: "gear", maxRpm: 4000, powerKw: 22, torqueNm: 716, isDefault: true, isOptional: false },
      { spindleId: "qtn250_hs", type: "direct", maxRpm: 5000, powerKw: 22, torqueNm: 573, isDefault: false, isOptional: true, priceAdder: 6500 },
    ],
    coolants: [
      { coolantId: "flood", type: "flood", isDefault: true, isOptional: false },
      { coolantId: "mist", type: "mist", isDefault: false, isOptional: true, priceAdder: 2200 },
    ],
    capabilities: [
      { capabilityId: "2_axis", name: "2-Axis", category: "axis", isStandard: true, isOptional: false },
      { capabilityId: "tailstock", name: "Tailstock", category: "workholding", isStandard: true, isOptional: false },
      { capabilityId: "steady_rest", name: "Steady Rest", category: "workholding", isStandard: false, isOptional: true, priceAdder: 5500 },
    ],
    incompatibilities: [],
    dependencies: [],
    defaults: {
      controllerId: "mazak_mazatrol",
      spindleId: "qtn250_std",
      coolantId: "flood",
      capabilities: ["2_axis", "tailstock"],
    },
  },

  // Mitsubishi MV1200R Wire EDM
  {
    machineId: "mitsubishi_mv1200r",
    manufacturer: "Mitsubishi",
    model: "MV1200R",
    machineType: "edm",
    controllers: [
      { controllerId: "mitsubishi_m80", name: "M800W", isDefault: true, isOptional: false },
    ],
    spindles: [], // EDM has no spindle
    coolants: [
      { coolantId: "deionized", type: "flood", isDefault: true, isOptional: false },
    ],
    capabilities: [
      { capabilityId: "wire_edm", name: "Wire EDM", category: "special", isStandard: true, isOptional: false },
      { capabilityId: "auto_thread", name: "Auto Threading", category: "automation", isStandard: true, isOptional: false },
      { capabilityId: "submerged", name: "Submerged Cutting", category: "special", isStandard: true, isOptional: false },
      { capabilityId: "taper", name: "Taper Cutting", category: "axis", isStandard: true, isOptional: false },
    ],
    incompatibilities: [],
    dependencies: [],
    defaults: {
      controllerId: "mitsubishi_m80",
      spindleId: "",
      coolantId: "deionized",
      capabilities: ["wire_edm", "auto_thread", "submerged", "taper"],
    },
  },

  // DMG MORI NLX 2500
  {
    machineId: "dmg_nlx2500",
    manufacturer: "DMG MORI",
    model: "NLX 2500",
    machineType: "lathe",
    controllers: [
      { controllerId: "fanuc_31i", name: "FANUC 31i-B", isDefault: true, isOptional: false },
      { controllerId: "siemens_840d", name: "Siemens 840D sl", isDefault: false, isOptional: true, priceAdder: 18000 },
    ],
    spindles: [
      { spindleId: "nlx2500_std", type: "belt", maxRpm: 4000, powerKw: 18.5, torqueNm: 597, isDefault: true, isOptional: false },
      { spindleId: "nlx2500_hs", type: "motorized", maxRpm: 6000, powerKw: 22, torqueNm: 460, isDefault: false, isOptional: true, priceAdder: 12000 },
    ],
    coolants: [
      { coolantId: "flood", type: "flood", isDefault: true, isOptional: false },
      { coolantId: "through_spindle", type: "through_spindle", pressure: "high", isDefault: false, isOptional: true, priceAdder: 9500, requiresSpindle: ["nlx2500_hs"] },
      { coolantId: "mql", type: "mql", isDefault: false, isOptional: true, priceAdder: 4500 },
    ],
    capabilities: [
      { capabilityId: "y_axis", name: "Y-Axis", category: "axis", isStandard: false, isOptional: true, priceAdder: 28000 },
      { capabilityId: "sub_spindle", name: "Sub-Spindle", category: "workholding", isStandard: false, isOptional: true, priceAdder: 52000 },
      { capabilityId: "live_tooling", name: "Live Tooling", category: "axis", isStandard: false, isOptional: true, priceAdder: 18000 },
      { capabilityId: "thermal_comp", name: "Thermal Compensation", category: "precision", isStandard: true, isOptional: false },
    ],
    incompatibilities: [
      {
        id: "tsc_belt_incomp",
        description: "Through-spindle coolant incompatible with belt-driven spindle",
        condition: { type: "spindle_coolant", item1: "nlx2500_std", item2: "through_spindle" },
        reason: "Belt-driven spindle does not have coolant passage",
      },
    ],
    dependencies: [
      {
        id: "live_needs_y",
        description: "Live tooling benefits from Y-axis",
        requires: { type: "capability_for_capability", dependent: "live_tooling", required: ["y_axis"] },
        reason: "Y-axis enables off-center milling operations with live tools",
      },
    ],
    defaults: {
      controllerId: "fanuc_31i",
      spindleId: "nlx2500_std",
      coolantId: "flood",
      capabilities: ["thermal_comp"],
    },
  },
];

// ============================================================================
// ENGINE IMPLEMENTATION
// ============================================================================

class MachineOptionMatrixEngine {
  private matrices: Map<string, OptionMatrixEntry> = new Map();

  constructor() {
    for (const matrix of MACHINE_MATRICES) {
      this.matrices.set(matrix.machineId, matrix);
    }
  }

  /**
   * Get the option matrix for a specific machine
   */
  getMatrix(machineId: string): OptionMatrixEntry | undefined {
    return this.matrices.get(machineId);
  }

  /**
   * Get all registered machine matrices
   */
  getAllMatrices(): OptionMatrixEntry[] {
    return Array.from(this.matrices.values());
  }

  /**
   * Get machines by type
   */
  getMachinesByType(machineType: OptionMatrixEntry["machineType"]): OptionMatrixEntry[] {
    return Array.from(this.matrices.values()).filter(m => m.machineType === machineType);
  }

  /**
   * Get machines by manufacturer
   */
  getMachinesByManufacturer(manufacturer: string): OptionMatrixEntry[] {
    const lower = manufacturer.toLowerCase();
    return Array.from(this.matrices.values()).filter(
      m => m.manufacturer.toLowerCase() === lower
    );
  }

  /**
   * Validate a configuration against the option matrix
   */
  validateConfiguration(query: ConfigurationQuery): ValidationResult {
    const matrix = this.matrices.get(query.machineId);
    if (!matrix) {
      return {
        valid: false,
        errors: [{
          code: "UNKNOWN_MACHINE",
          message: `Machine '${query.machineId}' not found in option matrix`,
          field: "machineId",
          invalidValue: query.machineId,
          allowedValues: Array.from(this.matrices.keys()),
        }],
        warnings: [],
      };
    }

    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestedFixes: SuggestedFix[] = [];

    // Validate controller
    if (query.controllerId) {
      const validController = matrix.controllers.find(c => c.controllerId === query.controllerId);
      if (!validController) {
        errors.push({
          code: "INVALID_CONTROLLER",
          message: `Controller '${query.controllerId}' is not available for ${matrix.model}`,
          field: "controllerId",
          invalidValue: query.controllerId,
          allowedValues: matrix.controllers.map(c => c.controllerId),
        });
        suggestedFixes.push({
          field: "controllerId",
          currentValue: query.controllerId,
          suggestedValue: matrix.defaults.controllerId,
          reason: "Use default controller for this machine",
        });
      }
    }

    // Validate spindle
    if (query.spindleId && matrix.spindles.length > 0) {
      const validSpindle = matrix.spindles.find(s => s.spindleId === query.spindleId);
      if (!validSpindle) {
        errors.push({
          code: "INVALID_SPINDLE",
          message: `Spindle '${query.spindleId}' is not available for ${matrix.model}`,
          field: "spindleId",
          invalidValue: query.spindleId,
          allowedValues: matrix.spindles.map(s => s.spindleId),
        });
        suggestedFixes.push({
          field: "spindleId",
          currentValue: query.spindleId,
          suggestedValue: matrix.defaults.spindleId,
          reason: "Use default spindle for this machine",
        });
      }
    }

    // Validate coolant
    if (query.coolantId) {
      const validCoolant = matrix.coolants.find(c => c.coolantId === query.coolantId);
      if (!validCoolant) {
        errors.push({
          code: "INVALID_COOLANT",
          message: `Coolant '${query.coolantId}' is not available for ${matrix.model}`,
          field: "coolantId",
          invalidValue: query.coolantId,
          allowedValues: matrix.coolants.map(c => c.coolantId),
        });
        suggestedFixes.push({
          field: "coolantId",
          currentValue: query.coolantId,
          suggestedValue: matrix.defaults.coolantId,
          reason: "Use default coolant for this machine",
        });
      } else if (validCoolant.requiresSpindle && query.spindleId) {
        // Check spindle dependency
        if (!validCoolant.requiresSpindle.includes(query.spindleId)) {
          errors.push({
            code: "COOLANT_SPINDLE_MISMATCH",
            message: `Coolant '${query.coolantId}' requires spindle: ${validCoolant.requiresSpindle.join(" or ")}`,
            field: "coolantId",
            invalidValue: query.coolantId,
            allowedValues: validCoolant.requiresSpindle,
          });
        }
      }
    }

    // Validate capabilities
    if (query.capabilities) {
      for (const capId of query.capabilities) {
        const validCap = matrix.capabilities.find(c => c.capabilityId === capId);
        if (!validCap) {
          errors.push({
            code: "INVALID_CAPABILITY",
            message: `Capability '${capId}' is not available for ${matrix.model}`,
            field: "capabilities",
            invalidValue: capId,
            allowedValues: matrix.capabilities.map(c => c.capabilityId),
          });
        } else {
          // Check controller dependency
          if (validCap.requiresController && query.controllerId) {
            if (!validCap.requiresController.includes(query.controllerId)) {
              warnings.push({
                code: "CAPABILITY_CONTROLLER_PREFERENCE",
                message: `Capability '${capId}' works best with: ${validCap.requiresController.join(" or ")}`,
                field: "capabilities",
              });
            }
          }
          // Check spindle dependency
          if (validCap.requiresSpindle && query.spindleId) {
            if (!validCap.requiresSpindle.includes(query.spindleId)) {
              warnings.push({
                code: "CAPABILITY_SPINDLE_PREFERENCE",
                message: `Capability '${capId}' works best with: ${validCap.requiresSpindle.join(" or ")}`,
                field: "capabilities",
              });
            }
          }
        }
      }
    }

    // Check incompatibilities
    for (const rule of matrix.incompatibilities) {
      const { item1, item2 } = rule.condition;
      let violates = false;

      switch (rule.condition.type) {
        case "spindle_coolant":
          violates = query.spindleId === item1 && query.coolantId === item2;
          break;
        case "controller_spindle":
          violates = query.controllerId === item1 && query.spindleId === item2;
          break;
        case "coolant_capability":
          violates = query.coolantId === item1 && query.capabilities?.includes(item2) === true;
          break;
        case "controller_capability":
          violates = query.controllerId === item1 && query.capabilities?.includes(item2) === true;
          break;
      }

      if (violates) {
        errors.push({
          code: "INCOMPATIBLE_OPTIONS",
          message: rule.description,
          field: rule.condition.type,
          invalidValue: `${item1} + ${item2}`,
        });
      }
    }

    // Check dependencies (as warnings, not errors)
    for (const rule of matrix.dependencies) {
      const { dependent, required } = rule.requires;
      let needsWarning = false;

      switch (rule.requires.type) {
        case "spindle_for_coolant":
          if (query.coolantId === dependent && query.spindleId && !required.includes(query.spindleId)) {
            needsWarning = true;
          }
          break;
        case "capability_for_capability":
          if (query.capabilities?.includes(dependent) && !query.capabilities.some(c => required.includes(c))) {
            needsWarning = true;
          }
          break;
      }

      if (needsWarning) {
        warnings.push({
          code: "DEPENDENCY_RECOMMENDATION",
          message: `${rule.description}: ${rule.reason}`,
          field: rule.requires.type,
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestedFixes: suggestedFixes.length > 0 ? suggestedFixes : undefined,
    };
  }

  /**
   * Get available options for a machine, optionally filtered by current selections
   */
  getAvailableOptions(machineId: string, currentSelection?: Partial<ConfigurationQuery>): ConfigurationOptions | undefined {
    const matrix = this.matrices.get(machineId);
    if (!matrix) return undefined;

    let controllers = [...matrix.controllers];
    let spindles = [...matrix.spindles];
    let coolants = [...matrix.coolants];
    let capabilities = [...matrix.capabilities];
    let filtered = false;

    // Filter coolants based on spindle selection
    if (currentSelection?.spindleId) {
      coolants = coolants.filter(c => {
        if (!c.requiresSpindle) return true;
        return c.requiresSpindle.includes(currentSelection.spindleId!);
      });
      filtered = true;
    }

    // Filter capabilities based on controller/spindle
    if (currentSelection?.controllerId || currentSelection?.spindleId) {
      capabilities = capabilities.filter(cap => {
        if (cap.requiresController && currentSelection.controllerId) {
          if (!cap.requiresController.includes(currentSelection.controllerId)) {
            return false;
          }
        }
        if (cap.requiresSpindle && currentSelection.spindleId) {
          if (!cap.requiresSpindle.includes(currentSelection.spindleId)) {
            return false;
          }
        }
        return true;
      });
      filtered = true;
    }

    // Apply incompatibility rules
    for (const rule of matrix.incompatibilities) {
      const { item1, item2 } = rule.condition;

      switch (rule.condition.type) {
        case "spindle_coolant":
          if (currentSelection?.spindleId === item1) {
            coolants = coolants.filter(c => c.coolantId !== item2);
            filtered = true;
          }
          if (currentSelection?.coolantId === item2) {
            spindles = spindles.filter(s => s.spindleId !== item1);
            filtered = true;
          }
          break;
        case "controller_spindle":
          if (currentSelection?.controllerId === item1) {
            spindles = spindles.filter(s => s.spindleId !== item2);
            filtered = true;
          }
          break;
      }
    }

    return {
      controllers,
      spindles,
      coolants,
      capabilities,
      filteredBySelection: filtered,
    };
  }

  /**
   * Get default configuration for a machine
   */
  getDefaultConfiguration(machineId: string): DefaultOptions | undefined {
    const matrix = this.matrices.get(machineId);
    return matrix?.defaults;
  }

  /**
   * Calculate price adder for a configuration
   */
  calculatePriceAdder(query: ConfigurationQuery): { total: number; breakdown: Record<string, number> } {
    const matrix = this.matrices.get(query.machineId);
    if (!matrix) return { total: 0, breakdown: {} };

    const breakdown: Record<string, number> = {};
    let total = 0;

    // Controller adder
    if (query.controllerId) {
      const ctrl = matrix.controllers.find(c => c.controllerId === query.controllerId);
      if (ctrl?.priceAdder) {
        breakdown[`controller:${ctrl.name}`] = ctrl.priceAdder;
        total += ctrl.priceAdder;
      }
    }

    // Spindle adder
    if (query.spindleId) {
      const spindle = matrix.spindles.find(s => s.spindleId === query.spindleId);
      if (spindle?.priceAdder) {
        breakdown[`spindle:${spindle.type}`] = spindle.priceAdder;
        total += spindle.priceAdder;
      }
    }

    // Coolant adder
    if (query.coolantId) {
      const coolant = matrix.coolants.find(c => c.coolantId === query.coolantId);
      if (coolant?.priceAdder) {
        breakdown[`coolant:${coolant.type}`] = coolant.priceAdder;
        total += coolant.priceAdder;
      }
    }

    // Capability adders
    if (query.capabilities) {
      for (const capId of query.capabilities) {
        const cap = matrix.capabilities.find(c => c.capabilityId === capId);
        if (cap?.priceAdder) {
          breakdown[`capability:${cap.name}`] = cap.priceAdder;
          total += cap.priceAdder;
        }
      }
    }

    return { total, breakdown };
  }

  /**
   * Register a new machine matrix
   */
  registerMatrix(matrix: OptionMatrixEntry): void {
    this.matrices.set(matrix.machineId, matrix);
    log.info(`[MachineOptionMatrixEngine] Registered matrix for ${matrix.machineId}`);
  }

  /**
   * Get statistics about the option matrix database
   */
  getStats(): {
    totalMachines: number;
    byType: Record<string, number>;
    byManufacturer: Record<string, number>;
    averageOptions: { controllers: number; spindles: number; coolants: number; capabilities: number };
  } {
    const machines = Array.from(this.matrices.values());
    const byType: Record<string, number> = {};
    const byManufacturer: Record<string, number> = {};
    let totalControllers = 0;
    let totalSpindles = 0;
    let totalCoolants = 0;
    let totalCapabilities = 0;

    for (const m of machines) {
      byType[m.machineType] = (byType[m.machineType] || 0) + 1;
      byManufacturer[m.manufacturer] = (byManufacturer[m.manufacturer] || 0) + 1;
      totalControllers += m.controllers.length;
      totalSpindles += m.spindles.length;
      totalCoolants += m.coolants.length;
      totalCapabilities += m.capabilities.length;
    }

    const count = machines.length || 1;
    return {
      totalMachines: machines.length,
      byType,
      byManufacturer,
      averageOptions: {
        controllers: totalControllers / count,
        spindles: totalSpindles / count,
        coolants: totalCoolants / count,
        capabilities: totalCapabilities / count,
      },
    };
  }

  /**
   * Self-awareness for AI system integration
   */
  getSelfAwareness() {
    const stats = this.getStats();
    return {
      name: "MachineOptionMatrixEngine",
      description: "Validates and filters machine configuration options based on compatibility matrices",
      capabilities: [
        "getMatrix",
        "getAllMatrices",
        "getMachinesByType",
        "getMachinesByManufacturer",
        "validateConfiguration",
        "getAvailableOptions",
        "getDefaultConfiguration",
        "calculatePriceAdder",
        "registerMatrix",
        "getStats",
      ],
      registeredMachines: stats.totalMachines,
      machineTypes: Object.keys(stats.byType),
      manufacturers: Object.keys(stats.byManufacturer),
    };
  }
}

export const machineOptionMatrixEngine = new MachineOptionMatrixEngine();
