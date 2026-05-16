/**
 * MCAT-MS0 P3-U01: Machine Consumer Binding Engine
 *
 * Binds downstream consumers (Program Release, Print to CNC, quoting, scheduling)
 * to the same canonical machine package + user overlay model used by the calculator.
 * Provides unified machine context for all machine-aware surfaces.
 *
 * Consumers:
 * - Program Release (ProgramReleaseCatalogEngine)
 * - Print to CNC (PrintToProgramPipelineEngine)
 * - Quote to Ship (QuoteToShipOrchestratorEngine)
 * - Scheduling (CapacityPlanningEngine)
 * - What-If Analysis (FeasibilityEngine)
 *
 * @module engines/MachineConsumerBindingEngine
 * @milestone MCAT-MS0/P3-U01
 */

import { log } from "../utils/Logger.js";
import type { CanonicalMachinePackage } from "../types/MachinePackage.js";
import type {
  ControllerPackage,
  SpindlePackageOption,
  CoolantStrategyOption,
  MachineCapabilitySnapshot,
  UserMachineProfileOverlay,
} from "../contracts/userMachineProfile.js";
import { shopMachineOverlayEngine, type MergedMachineView } from "./ShopMachineOverlayEngine.js";
import { machineCapabilitySurfaceEngine } from "./MachineCapabilitySurfaceEngine.js";
import { machineOptionContractEngine } from "./MachineOptionContractEngine.js";
import { shopConfigurationEngine } from "./ShopConfigurationEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export interface BoundMachineContext {
  /** Shop machine ID (e.g., "LTH-01") */
  shop_machine_id: string;
  /** Display name for UI */
  display_name: string;
  /** Machine type (lathe, mill, edm, etc.) */
  machine_type: string;
  /** Manufacturer */
  manufacturer: string;
  /** Model */
  model: string;
  /** Active controller configuration */
  controller: {
    id: string;
    family: string;
    capabilities: string[];
  };
  /** Active spindle configuration */
  spindle: {
    id: string;
    max_rpm: number;
    max_power_kw: number;
    torque_nm: number;
  };
  /** Active coolant strategies */
  coolant: {
    enabled_strategies: string[];
    primary_type: string;
  };
  /** Work envelope in mm */
  envelope: {
    x_mm: number;
    y_mm: number;
    z_mm: number;
    table_load_kg?: number;
  };
  /** Kinematics configuration */
  kinematics: {
    axis_count: number;
    axes: string[];
    has_rotary: boolean;
    rotary_axes?: string[];
  };
  /** Machine rate for costing */
  machine_rate_per_hour: number;
  /** Source provenance */
  provenance: {
    canonical_package_id?: string;
    overlay_id?: string;
    confidence: number;
    last_validated?: string;
  };
}

export interface ProgramReleaseMachineBinding {
  /** Machine ID for program release */
  id: string;
  /** Display label */
  label: string;
  /** Machine type */
  type: string;
  /** Machine rate $/hr */
  machineRatePerHour: number;
  /** Max spindle RPM */
  maxRpm: number;
  /** Max power kW */
  maxPower: number;
  /** Collision envelope string */
  collisionEnvelope: string;
  /** Controller family */
  controllerFamily: string;
  /** Coolant capability */
  coolantCapability: string;
  /** Bound context reference */
  _boundContext: BoundMachineContext;
}

export interface PrintToCNCMachineBinding {
  /** Machine ID */
  machine_id: string;
  /** Brand/manufacturer */
  brand: string;
  /** Model */
  model: string;
  /** Max RPM */
  max_rpm: number;
  /** Max power kW */
  max_power_kw: number;
  /** Max torque Nm */
  max_torque_nm: number;
  /** Work envelope */
  envelope: {
    x: number;
    y: number;
    z: number;
  };
  /** Controller ID */
  controller_id: string;
  /** Active coolant strategies */
  coolant_strategies: string[];
  /** Axis configuration */
  axes: string[];
  /** Bound context reference */
  _boundContext: BoundMachineContext;
}

export interface QuoteMachineBinding {
  /** Machine ID */
  machine_id: string;
  /** Display name */
  display_name: string;
  /** Hourly rate */
  rate_per_hour: number;
  /** Setup time minutes */
  typical_setup_minutes: number;
  /** Machine type for capability matching */
  machine_type: string;
  /** Bound context reference */
  _boundContext: BoundMachineContext;
}

export interface ConsumerBindingResult {
  /** Whether binding succeeded */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Bound context */
  context?: BoundMachineContext;
  /** Validation warnings */
  warnings: string[];
}

export interface MultiConsumerBindings {
  /** Program Release binding */
  programRelease?: ProgramReleaseMachineBinding;
  /** Print to CNC binding */
  printToCNC?: PrintToCNCMachineBinding;
  /** Quote binding */
  quote?: QuoteMachineBinding;
  /** Shared bound context */
  context: BoundMachineContext;
  /** Contract validation result */
  contractValid: boolean;
  /** Validation warnings */
  warnings: string[];
}

// ============================================================================
// ENGINE
// ============================================================================

class MachineConsumerBindingEngine {
  private bindingCache = new Map<string, BoundMachineContext>();

  /**
   * Bind a shop machine to the canonical package + overlay system.
   * Returns a unified context that all consumers can use.
   */
  bind(shop_machine_id: string): ConsumerBindingResult {
    const warnings: string[] = [];

    try {
      // Check cache first
      const cached = this.bindingCache.get(shop_machine_id);
      if (cached) {
        return { success: true, context: cached, warnings: [] };
      }

      // Get merged view from overlay engine
      const mergedView = shopMachineOverlayEngine.getMergedView(shop_machine_id);
      if (!mergedView) {
        return {
          success: false,
          error: `No merged view found for shop machine: ${shop_machine_id}`,
          warnings: [`Shop machine ${shop_machine_id} not found in overlay registry`],
        };
      }

      const profile = mergedView.read_model.profile;

      // Validate the profile against contracts
      const contractResult = machineOptionContractEngine.validateProfile(profile);
      if (!contractResult.valid) {
        for (const v of contractResult.violations) {
          warnings.push(`Contract violation: ${v.violation} (${v.component})`);
        }
      }

      // Get controller capabilities
      const controllerId = profile.selectedControllerId || "fanuc";
      const controllerCaps = machineCapabilitySurfaceEngine.getControllerCapabilities(controllerId);

      // Get spindle package
      const spindleId = profile.selectedSpindlePackageId || "standard";
      const spindlePkg = machineCapabilitySurfaceEngine.getSpindlePackage(spindleId);

      // Resolve identity + kinematics from the merged view. The overlay
      // (UserMachineProfileOverlay) carries option selections + the
      // capability snapshot; the shop machine carries physical config
      // (envelope, rates, axis capabilities).
      const shopMachine = mergedView.shop_machine;
      const snapshot = profile.machine;
      const axisCount = shopMachine.capabilities.includes("5axis")
        ? 5
        : shopMachine.capabilities.includes("4axis")
          ? 4
          : 3;
      const axes =
        axisCount >= 5
          ? ["X", "Y", "Z", "A", "C"]
          : axisCount === 4
            ? ["X", "Y", "Z", "A"]
            : ["X", "Y", "Z"];

      // Build the bound context
      const context: BoundMachineContext = {
        shop_machine_id,
        display_name: shopMachine.name || shop_machine_id,
        machine_type: shopMachine.type || "mill",
        manufacturer: snapshot.manufacturerLabel || "Unknown",
        model: snapshot.modelLabel || "Unknown",
        controller: {
          id: controllerId,
          family: controllerCaps?.controllerFamily || controllerId,
          capabilities: controllerCaps?.cannedCycles || [],
        },
        spindle: {
          id: spindleId,
          max_rpm: spindlePkg?.maxRpm || shopMachine.max_rpm || 10000,
          max_power_kw: spindlePkg?.ratedPower || shopMachine.max_power_kw || 15,
          torque_nm: spindlePkg?.continuousTorque || shopMachine.max_torque_nm || 50,
        },
        coolant: {
          enabled_strategies: profile.enabledCoolantStrategyIds || ["flood"],
          primary_type: profile.enabledCoolantStrategyIds?.[0] || "flood",
        },
        envelope: {
          x_mm: shopMachine.work_envelope?.x_mm || 500,
          y_mm: 400,
          z_mm: shopMachine.work_envelope?.z_mm || 400,
        },
        kinematics: {
          axis_count: axisCount,
          axes,
          has_rotary: axisCount > 3,
          rotary_axes: axisCount > 3 ? axes.slice(3) : undefined,
        },
        machine_rate_per_hour: shopMachine.hourly_rate || 85,
        provenance: {
          canonical_package_id: mergedView.canonical_package?.canonical_id,
          overlay_id: mergedView.overlay?.overlay_id,
          confidence: 0.85,
          last_validated: new Date().toISOString(),
        },
      };

      // Cache the binding
      this.bindingCache.set(shop_machine_id, context);

      log.info(`[MachineConsumerBindingEngine] Bound ${shop_machine_id} → ${context.display_name}`);
      return { success: true, context, warnings };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Unknown binding error",
        warnings: [error.message],
      };
    }
  }

  /**
   * Get a Program Release compatible machine profile from the bound context.
   */
  forProgramRelease(shop_machine_id: string): ProgramReleaseMachineBinding | null {
    const binding = this.bind(shop_machine_id);
    if (!binding.success || !binding.context) {
      return null;
    }

    const ctx = binding.context;
    return {
      id: ctx.shop_machine_id,
      label: `${ctx.manufacturer} ${ctx.model}`,
      type: ctx.machine_type,
      machineRatePerHour: ctx.machine_rate_per_hour,
      maxRpm: ctx.spindle.max_rpm,
      maxPower: ctx.spindle.max_power_kw,
      collisionEnvelope: `${ctx.envelope.x_mm}×${ctx.envelope.y_mm}×${ctx.envelope.z_mm}mm`,
      controllerFamily: ctx.controller.family,
      coolantCapability: ctx.coolant.primary_type,
      _boundContext: ctx,
    };
  }

  /**
   * Get a Print to CNC compatible machine context from the bound context.
   */
  forPrintToCNC(shop_machine_id: string): PrintToCNCMachineBinding | null {
    const binding = this.bind(shop_machine_id);
    if (!binding.success || !binding.context) {
      return null;
    }

    const ctx = binding.context;
    return {
      machine_id: ctx.shop_machine_id,
      brand: ctx.manufacturer,
      model: ctx.model,
      max_rpm: ctx.spindle.max_rpm,
      max_power_kw: ctx.spindle.max_power_kw,
      max_torque_nm: ctx.spindle.torque_nm,
      envelope: {
        x: ctx.envelope.x_mm,
        y: ctx.envelope.y_mm,
        z: ctx.envelope.z_mm,
      },
      controller_id: ctx.controller.id,
      coolant_strategies: ctx.coolant.enabled_strategies,
      axes: ctx.kinematics.axes,
      _boundContext: ctx,
    };
  }

  /**
   * Get a Quote compatible machine context from the bound context.
   */
  forQuoting(shop_machine_id: string): QuoteMachineBinding | null {
    const binding = this.bind(shop_machine_id);
    if (!binding.success || !binding.context) {
      return null;
    }

    const ctx = binding.context;
    return {
      machine_id: ctx.shop_machine_id,
      display_name: ctx.display_name,
      rate_per_hour: ctx.machine_rate_per_hour,
      typical_setup_minutes: ctx.machine_type === "lathe" ? 30 : 45,
      machine_type: ctx.machine_type,
      _boundContext: ctx,
    };
  }

  /**
   * Get bindings for all consumers at once.
   */
  forAllConsumers(shop_machine_id: string): MultiConsumerBindings | null {
    const binding = this.bind(shop_machine_id);
    if (!binding.success || !binding.context) {
      return null;
    }

    const ctx = binding.context;

    // Validate against contracts
    const mergedView = shopMachineOverlayEngine.getMergedView(shop_machine_id);
    let contractValid = true;
    if (mergedView) {
      const contractResult = machineOptionContractEngine.validateProfile(
        mergedView.read_model.profile
      );
      contractValid = contractResult.valid;
    }

    return {
      programRelease: this.forProgramRelease(shop_machine_id) || undefined,
      printToCNC: this.forPrintToCNC(shop_machine_id) || undefined,
      quote: this.forQuoting(shop_machine_id) || undefined,
      context: ctx,
      contractValid,
      warnings: binding.warnings,
    };
  }

  /**
   * List all bindable shop machines.
   */
  listBindable(): { shop_machine_id: string; display_name: string; bound: boolean }[] {
    const profile = shopConfigurationEngine.getActiveProfile();
    const result: { shop_machine_id: string; display_name: string; bound: boolean }[] = [];

    for (const machine of profile.machines) {
      const mergedView = shopMachineOverlayEngine.getMergedView(machine.id);
      result.push({
        shop_machine_id: machine.id,
        display_name: mergedView?.shop_machine.name || machine.name || machine.id,
        bound: this.bindingCache.has(machine.id),
      });
    }

    return result;
  }

  /**
   * Invalidate cached bindings for a machine (call after overlay updates).
   */
  invalidate(shop_machine_id: string): void {
    this.bindingCache.delete(shop_machine_id);
    log.info(`[MachineConsumerBindingEngine] Invalidated binding for ${shop_machine_id}`);
  }

  /**
   * Invalidate all cached bindings.
   */
  invalidateAll(): void {
    this.bindingCache.clear();
    log.info(`[MachineConsumerBindingEngine] Invalidated all bindings`);
  }

  /**
   * Get binding statistics.
   */
  getStats(): {
    total_bindable: number;
    currently_bound: number;
    binding_cache_size: number;
  } {
    const profile = shopConfigurationEngine.getActiveProfile();
    return {
      total_bindable: profile.machines.length,
      currently_bound: this.bindingCache.size,
      binding_cache_size: this.bindingCache.size,
    };
  }

  /**
   * Self-awareness metadata.
   */
  getSelfAwareness() {
    return {
      engine: "MachineConsumerBindingEngine",
      milestone: "MCAT-MS0/P3-U01",
      purpose: "Binds downstream consumers to canonical machine package + overlay model",
      capabilities: [
        "bind",
        "forProgramRelease",
        "forPrintToCNC",
        "forQuoting",
        "forAllConsumers",
        "listBindable",
        "invalidate",
        "getStats",
      ],
      consumers: [
        "ProgramReleaseCatalogEngine",
        "PrintToProgramPipelineEngine",
        "QuoteToShipOrchestratorEngine",
        "CapacityPlanningEngine",
        "FeasibilityEngine",
      ],
      integrations: [
        "ShopMachineOverlayEngine",
        "MachineCapabilitySurfaceEngine",
        "MachineOptionContractEngine",
      ],
    };
  }
}

export const machineConsumerBindingEngine = new MachineConsumerBindingEngine();
