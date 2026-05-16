/**
 * MCAT-MS0 P3-U02: Machine Package API Engine
 *
 * Exposes machine-package read/write APIs and resource surfaces for external
 * machine-aware products. Provides a unified API layer over the MCAT engine stack.
 *
 * API Surfaces:
 * - Package CRUD: get, list, search, create overlay, update, delete
 * - Capability queries: capabilities, compatibility, requirements
 * - Validation: validate profile, validate combination, contract tests
 * - Resource surfaces: renderable options, bindable machines, coverage stats
 *
 * @module engines/MachinePackageAPIEngine
 * @milestone MCAT-MS0/P3-U02
 */

import { log } from "../utils/Logger.js";
import type { CanonicalMachinePackage } from "../types/MachinePackage.js";
import type { UserMachineProfileOverlay } from "../contracts/userMachineProfile.js";
import { shopMachineOverlayEngine, type MergedMachineView, type CreateOverlayInput, type UpdateOverlayInput } from "./ShopMachineOverlayEngine.js";
import { machineCapabilitySurfaceEngine } from "./MachineCapabilitySurfaceEngine.js";
import { machineOptionContractEngine, type ContractValidationResult, type RenderableOptions } from "./MachineOptionContractEngine.js";
import { machineConsumerBindingEngine, type BoundMachineContext, type MultiConsumerBindings } from "./MachineConsumerBindingEngine.js";
import { shopConfigurationEngine } from "./ShopConfigurationEngine.js";

// ============================================================================
// API TYPES
// ============================================================================

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  warnings?: string[];
  metadata: {
    timestamp: string;
    api_version: string;
    request_id: string;
  };
}

export interface PackageListOptions {
  machine_type?: string;
  manufacturer?: string;
  limit?: number;
  offset?: number;
  include_overlays?: boolean;
}

export interface PackageSearchOptions {
  query?: string;
  machine_type?: string;
  manufacturer?: string;
  min_confidence?: number;
  capabilities?: string[];
  limit?: number;
}

export interface PackageListResult {
  packages: PackageSummary[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

export interface PackageSummary {
  id: string;
  display_name: string;
  machine_type: string;
  manufacturer: string;
  model: string;
  has_overlay: boolean;
  confidence: number;
}

export interface PackageDetail {
  id: string;
  display_name: string;
  machine_type: string;
  manufacturer: string;
  model: string;
  controller: {
    id: string;
    family: string;
    capabilities: string[];
  };
  spindle: {
    id: string;
    max_rpm: number;
    max_power_kw: number;
    torque_nm: number;
  };
  coolant: {
    enabled_strategies: string[];
  };
  envelope: {
    x_mm: number;
    y_mm: number;
    z_mm: number;
    table_load_kg?: number;
  };
  kinematics: {
    axis_count: number;
    axes: string[];
  };
  overlay?: {
    id: string;
    user_id: string;
    created_at: string;
  };
  confidence: number;
  provenance: string;
}

export interface CapabilityQueryResult {
  machine_id: string;
  controller_capabilities: string[];
  spindle_specs: {
    max_rpm: number;
    max_power_kw: number;
    torque_nm: number;
  };
  coolant_strategies: string[];
  axis_capabilities: string[];
  compatible_operations: string[];
}

export interface CompatibilityCheckInput {
  machine_id: string;
  operation_type: string;
  material_iso_group?: string;
  required_rpm?: number;
  required_power_kw?: number;
  part_weight_kg?: number;
  part_diameter_mm?: number;
}

export interface CompatibilityCheckResult {
  compatible: boolean;
  score: number;
  checks: {
    name: string;
    passed: boolean;
    detail: string;
  }[];
  recommendations?: string[];
}

export interface CoverageStats {
  total_machines: number;
  machines_with_overlays: number;
  machines_bound: number;
  coverage_percentage: number;
  by_type: Record<string, number>;
  by_manufacturer: Record<string, number>;
}

// ============================================================================
// ENGINE
// ============================================================================

class MachinePackageAPIEngine {
  private readonly API_VERSION = "1.0.0";
  private requestCounter = 0;

  private generateRequestId(): string {
    return `mcat-${Date.now()}-${++this.requestCounter}`;
  }

  private wrapResponse<T>(data: T, warnings?: string[]): APIResponse<T> {
    return {
      success: true,
      data,
      warnings,
      metadata: {
        timestamp: new Date().toISOString(),
        api_version: this.API_VERSION,
        request_id: this.generateRequestId(),
      },
    };
  }

  private errorResponse(error: string): APIResponse<never> {
    return {
      success: false,
      error,
      metadata: {
        timestamp: new Date().toISOString(),
        api_version: this.API_VERSION,
        request_id: this.generateRequestId(),
      },
    };
  }

  // ==========================================================================
  // READ APIs
  // ==========================================================================

  /**
   * Get a single machine package by ID.
   */
  getPackage(machine_id: string): APIResponse<PackageDetail> {
    try {
      const binding = machineConsumerBindingEngine.bind(machine_id);
      if (!binding.success || !binding.context) {
        return this.errorResponse(`Machine not found: ${machine_id}`);
      }

      const ctx = binding.context;
      const mergedView = shopMachineOverlayEngine.getMergedView(machine_id);

      const detail: PackageDetail = {
        id: ctx.shop_machine_id,
        display_name: ctx.display_name,
        machine_type: ctx.machine_type,
        manufacturer: ctx.manufacturer,
        model: ctx.model,
        controller: ctx.controller,
        spindle: ctx.spindle,
        coolant: {
          enabled_strategies: ctx.coolant.enabled_strategies,
        },
        envelope: ctx.envelope,
        kinematics: {
          axis_count: ctx.kinematics.axis_count,
          axes: ctx.kinematics.axes,
        },
        confidence: ctx.provenance.confidence,
        provenance: ctx.provenance.canonical_package_id || "shop-defined",
      };

      if (mergedView?.overlay) {
        detail.overlay = {
          id: mergedView.overlay.overlay_id,
          user_id: mergedView.read_model.profile.userId || "system",
          created_at: mergedView.overlay.created_at || new Date().toISOString(),
        };
      }

      return this.wrapResponse(detail, binding.warnings);
    } catch (error: any) {
      return this.errorResponse(error.message || "Unknown error");
    }
  }

  /**
   * List machine packages with optional filtering.
   */
  listPackages(options: PackageListOptions = {}): APIResponse<PackageListResult> {
    try {
      const profile = shopConfigurationEngine.getActiveProfile();
      let machines = profile.machines;

      // Apply filters
      if (options.machine_type) {
        machines = machines.filter(m =>
          m.type?.toLowerCase() === options.machine_type?.toLowerCase()
        );
      }

      if (options.manufacturer) {
        machines = machines.filter(m =>
          m.name?.toLowerCase().includes(options.manufacturer?.toLowerCase() || "")
        );
      }

      const total = machines.length;
      const limit = options.limit || 50;
      const offset = options.offset || 0;

      // Paginate
      const paged = machines.slice(offset, offset + limit);

      // Map to summaries
      const packages: PackageSummary[] = paged.map(m => {
        const binding = machineConsumerBindingEngine.bind(m.id);
        const mergedView = shopMachineOverlayEngine.getMergedView(m.id);

        return {
          id: m.id,
          display_name: m.name || m.id,
          machine_type: m.type || "unknown",
          manufacturer: m.name?.split(" ")[0] || "Unknown",
          model: m.name || m.id,
          has_overlay: !!mergedView?.overlay,
          confidence: binding.context?.provenance.confidence || 0.5,
        };
      });

      return this.wrapResponse({
        packages,
        total,
        limit,
        offset,
        has_more: offset + limit < total,
      });
    } catch (error: any) {
      return this.errorResponse(error.message || "Unknown error");
    }
  }

  /**
   * Search machine packages by query and filters.
   */
  searchPackages(options: PackageSearchOptions = {}): APIResponse<PackageSummary[]> {
    try {
      const profile = shopConfigurationEngine.getActiveProfile();
      let machines = profile.machines;

      // Text search
      if (options.query) {
        const q = options.query.toLowerCase();
        machines = machines.filter(m =>
          m.id.toLowerCase().includes(q) ||
          m.name?.toLowerCase().includes(q) ||
          m.type?.toLowerCase().includes(q) ||
          m.controller?.toLowerCase().includes(q)
        );
      }

      // Type filter
      if (options.machine_type) {
        machines = machines.filter(m =>
          m.type?.toLowerCase() === options.machine_type?.toLowerCase()
        );
      }

      // Manufacturer filter
      if (options.manufacturer) {
        machines = machines.filter(m =>
          m.name?.toLowerCase().includes(options.manufacturer?.toLowerCase() || "")
        );
      }

      // Capability filter
      if (options.capabilities && options.capabilities.length > 0) {
        machines = machines.filter(m => {
          const binding = machineConsumerBindingEngine.bind(m.id);
          if (!binding.context) return false;
          const caps = binding.context.controller.capabilities;
          return options.capabilities!.every(c => caps.includes(c));
        });
      }

      // Confidence filter
      if (options.min_confidence !== undefined) {
        machines = machines.filter(m => {
          const binding = machineConsumerBindingEngine.bind(m.id);
          return (binding.context?.provenance.confidence || 0) >= options.min_confidence!;
        });
      }

      // Limit
      const limit = options.limit || 20;
      machines = machines.slice(0, limit);

      // Map to summaries
      const results: PackageSummary[] = machines.map(m => {
        const binding = machineConsumerBindingEngine.bind(m.id);
        const mergedView = shopMachineOverlayEngine.getMergedView(m.id);

        return {
          id: m.id,
          display_name: m.name || m.id,
          machine_type: m.type || "unknown",
          manufacturer: m.name?.split(" ")[0] || "Unknown",
          model: m.name || m.id,
          has_overlay: !!mergedView?.overlay,
          confidence: binding.context?.provenance.confidence || 0.5,
        };
      });

      return this.wrapResponse(results);
    } catch (error: any) {
      return this.errorResponse(error.message || "Unknown error");
    }
  }

  // ==========================================================================
  // WRITE APIs
  // ==========================================================================

  /**
   * Create a new overlay for a machine.
   */
  createOverlay(input: CreateOverlayInput): APIResponse<{ overlay_id: string }> {
    try {
      const overlay = shopMachineOverlayEngine.createOverlay(input);
      machineConsumerBindingEngine.invalidate(input.shop_machine_id);

      return this.wrapResponse({
        overlay_id: overlay.overlay_id,
      });
    } catch (error: any) {
      return this.errorResponse(error.message || "Failed to create overlay");
    }
  }

  /**
   * Update an existing overlay.
   */
  updateOverlay(input: UpdateOverlayInput): APIResponse<{ updated: boolean }> {
    try {
      const overlay = shopMachineOverlayEngine.updateOverlay(input);
      if (overlay) {
        machineConsumerBindingEngine.invalidate(overlay.shop_machine_id);
      }

      return this.wrapResponse({
        updated: !!overlay,
      });
    } catch (error: any) {
      return this.errorResponse(error.message || "Failed to update overlay");
    }
  }

  /**
   * Delete an overlay.
   */
  deleteOverlay(overlay_id: string): APIResponse<{ deleted: boolean }> {
    try {
      const overlay = shopMachineOverlayEngine.getOverlay(overlay_id);
      if (overlay) {
        shopMachineOverlayEngine.deleteOverlay(overlay_id);
        machineConsumerBindingEngine.invalidate(overlay.shop_machine_id);
        return this.wrapResponse({ deleted: true });
      }
      return this.wrapResponse({ deleted: false });
    } catch (error: any) {
      return this.errorResponse(error.message || "Failed to delete overlay");
    }
  }

  // ==========================================================================
  // CAPABILITY APIs
  // ==========================================================================

  /**
   * Query machine capabilities.
   */
  getCapabilities(machine_id: string): APIResponse<CapabilityQueryResult> {
    try {
      const binding = machineConsumerBindingEngine.bind(machine_id);
      if (!binding.success || !binding.context) {
        return this.errorResponse(`Machine not found: ${machine_id}`);
      }

      const ctx = binding.context;

      // Determine compatible operations based on machine type and capabilities
      const compatibleOps: string[] = [];
      if (ctx.machine_type === "lathe" || ctx.machine_type === "turning") {
        compatibleOps.push("turning", "facing", "boring", "threading", "grooving");
        if (ctx.kinematics.has_rotary) {
          compatibleOps.push("milling", "drilling");
        }
      } else if (ctx.machine_type === "mill" || ctx.machine_type === "vmc" || ctx.machine_type === "hmc") {
        compatibleOps.push("milling", "drilling", "tapping", "boring", "pocketing");
        if (ctx.kinematics.axis_count >= 4) {
          compatibleOps.push("4-axis_contouring");
        }
        if (ctx.kinematics.axis_count >= 5) {
          compatibleOps.push("5-axis_simultaneous", "impeller_machining");
        }
      } else if (ctx.machine_type === "edm" || ctx.machine_type === "wire_edm") {
        compatibleOps.push("wire_edm", "die_cutting", "precision_contours");
      }

      return this.wrapResponse({
        machine_id,
        controller_capabilities: ctx.controller.capabilities,
        spindle_specs: {
          max_rpm: ctx.spindle.max_rpm,
          max_power_kw: ctx.spindle.max_power_kw,
          torque_nm: ctx.spindle.torque_nm,
        },
        coolant_strategies: ctx.coolant.enabled_strategies,
        axis_capabilities: ctx.kinematics.axes,
        compatible_operations: compatibleOps,
      });
    } catch (error: any) {
      return this.errorResponse(error.message || "Unknown error");
    }
  }

  /**
   * Check machine compatibility for an operation.
   */
  checkCompatibility(input: CompatibilityCheckInput): APIResponse<CompatibilityCheckResult> {
    try {
      const binding = machineConsumerBindingEngine.bind(input.machine_id);
      if (!binding.success || !binding.context) {
        return this.errorResponse(`Machine not found: ${input.machine_id}`);
      }

      const ctx = binding.context;
      const checks: { name: string; passed: boolean; detail: string }[] = [];
      let score = 100;

      // RPM check
      if (input.required_rpm) {
        const passed = ctx.spindle.max_rpm >= input.required_rpm;
        checks.push({
          name: "spindle_rpm",
          passed,
          detail: passed
            ? `Max ${ctx.spindle.max_rpm} RPM meets requirement of ${input.required_rpm}`
            : `Max ${ctx.spindle.max_rpm} RPM below required ${input.required_rpm}`,
        });
        if (!passed) score -= 30;
      }

      // Power check
      if (input.required_power_kw) {
        const passed = ctx.spindle.max_power_kw >= input.required_power_kw;
        checks.push({
          name: "spindle_power",
          passed,
          detail: passed
            ? `${ctx.spindle.max_power_kw} kW meets requirement of ${input.required_power_kw}`
            : `${ctx.spindle.max_power_kw} kW below required ${input.required_power_kw}`,
        });
        if (!passed) score -= 25;
      }

      // Part weight check
      if (input.part_weight_kg && ctx.envelope.table_load_kg) {
        const passed = ctx.envelope.table_load_kg >= input.part_weight_kg;
        checks.push({
          name: "table_load",
          passed,
          detail: passed
            ? `Table load ${ctx.envelope.table_load_kg} kg supports ${input.part_weight_kg} kg part`
            : `Table load ${ctx.envelope.table_load_kg} kg insufficient for ${input.part_weight_kg} kg part`,
        });
        if (!passed) score -= 40;
      }

      // Geometry check
      if (input.part_diameter_mm) {
        const geomResult = machineOptionContractEngine.validateGeometry(
          input.part_weight_kg || 0,
          input.part_diameter_mm,
          { max_part_diameter_mm: Math.min(ctx.envelope.x_mm, ctx.envelope.y_mm) }
        );
        checks.push({
          name: "geometry",
          passed: geomResult.valid,
          detail: geomResult.valid
            ? `Part diameter ${input.part_diameter_mm} mm fits envelope`
            : geomResult.violations.join("; "),
        });
        if (!geomResult.valid) score -= 35;
      }

      // Operation type check
      const capsResult = this.getCapabilities(input.machine_id);
      if (capsResult.success && capsResult.data) {
        const opMatch = capsResult.data.compatible_operations.some(
          op => op.toLowerCase().includes(input.operation_type.toLowerCase())
        );
        checks.push({
          name: "operation_type",
          passed: opMatch,
          detail: opMatch
            ? `Machine supports ${input.operation_type}`
            : `Machine may not support ${input.operation_type}`,
        });
        if (!opMatch) score -= 20;
      }

      const recommendations: string[] = [];
      if (score < 100) {
        checks.filter(c => !c.passed).forEach(c => {
          if (c.name === "spindle_rpm") {
            recommendations.push("Consider high-speed spindle upgrade or different machine");
          }
          if (c.name === "spindle_power") {
            recommendations.push("Reduce depth of cut or use coated tooling for lower force");
          }
          if (c.name === "table_load") {
            recommendations.push("Use lifting fixtures or split into multiple setups");
          }
        });
      }

      return this.wrapResponse({
        compatible: score >= 70,
        score: Math.max(0, score),
        checks,
        recommendations: recommendations.length > 0 ? recommendations : undefined,
      });
    } catch (error: any) {
      return this.errorResponse(error.message || "Unknown error");
    }
  }

  // ==========================================================================
  // VALIDATION APIs
  // ==========================================================================

  /**
   * Validate a machine profile against contracts.
   */
  validateProfile(profile: UserMachineProfileOverlay): APIResponse<ContractValidationResult> {
    try {
      const result = machineOptionContractEngine.validateProfile(profile);
      return this.wrapResponse(result);
    } catch (error: any) {
      return this.errorResponse(error.message || "Validation failed");
    }
  }

  /**
   * Get renderable options for a machine.
   */
  getRenderableOptions(machine_id: string): APIResponse<RenderableOptions> {
    try {
      const result = machineOptionContractEngine.getRenderableOptions({ machine_id });
      return this.wrapResponse(result);
    } catch (error: any) {
      return this.errorResponse(error.message || "Failed to get renderable options");
    }
  }

  /**
   * Run contract tests for a machine.
   */
  runContractTests(machine_id: string): APIResponse<{
    machine_id: string;
    total: number;
    passed: number;
    failed: number;
    results: { name: string; passed: boolean; reason?: string }[];
  }> {
    try {
      const result = machineOptionContractEngine.runContractTests(machine_id);
      return this.wrapResponse(result);
    } catch (error: any) {
      return this.errorResponse(error.message || "Contract tests failed");
    }
  }

  // ==========================================================================
  // RESOURCE SURFACE APIs
  // ==========================================================================

  /**
   * Get all consumer bindings for a machine.
   */
  getConsumerBindings(machine_id: string): APIResponse<MultiConsumerBindings> {
    try {
      const bindings = machineConsumerBindingEngine.forAllConsumers(machine_id);
      if (!bindings) {
        return this.errorResponse(`Machine not found: ${machine_id}`);
      }
      return this.wrapResponse(bindings);
    } catch (error: any) {
      return this.errorResponse(error.message || "Failed to get bindings");
    }
  }

  /**
   * Get coverage statistics.
   */
  getCoverageStats(): APIResponse<CoverageStats> {
    try {
      const profile = shopConfigurationEngine.getActiveProfile();
      const overlayStats = shopMachineOverlayEngine.getStats();
      const bindingStats = machineConsumerBindingEngine.getStats();

      // Count by type and manufacturer
      const byType: Record<string, number> = {};
      const byManufacturer: Record<string, number> = {};

      for (const m of profile.machines) {
        const type = m.type || "unknown";
        byType[type] = (byType[type] || 0) + 1;

        const mfr = m.name?.split(" ")[0] || "Unknown";
        byManufacturer[mfr] = (byManufacturer[mfr] || 0) + 1;
      }

      return this.wrapResponse({
        total_machines: profile.machines.length,
        machines_with_overlays: overlayStats.machines_covered,
        machines_bound: bindingStats.currently_bound,
        coverage_percentage: overlayStats.coverage_pct,
        by_type: byType,
        by_manufacturer: byManufacturer,
      });
    } catch (error: any) {
      return this.errorResponse(error.message || "Failed to get coverage stats");
    }
  }

  /**
   * List all bindable machines.
   */
  listBindableMachines(): APIResponse<{ shop_machine_id: string; display_name: string; bound: boolean }[]> {
    try {
      const list = machineConsumerBindingEngine.listBindable();
      return this.wrapResponse(list);
    } catch (error: any) {
      return this.errorResponse(error.message || "Failed to list bindable machines");
    }
  }

  // ==========================================================================
  // SELF-AWARENESS
  // ==========================================================================

  /**
   * Self-awareness metadata.
   */
  getSelfAwareness() {
    return {
      engine: "MachinePackageAPIEngine",
      milestone: "MCAT-MS0/P3-U02",
      api_version: this.API_VERSION,
      purpose: "Unified API surface for machine-package read/write and resource queries",
      endpoints: {
        read: ["getPackage", "listPackages", "searchPackages"],
        write: ["createOverlay", "updateOverlay", "deleteOverlay"],
        capability: ["getCapabilities", "checkCompatibility"],
        validation: ["validateProfile", "getRenderableOptions", "runContractTests"],
        resource: ["getConsumerBindings", "getCoverageStats", "listBindableMachines"],
      },
      integrations: [
        "ShopMachineOverlayEngine",
        "MachineCapabilitySurfaceEngine",
        "MachineOptionContractEngine",
        "MachineConsumerBindingEngine",
        "ShopConfigurationEngine",
      ],
    };
  }
}

// WIRE-EXEMPT: internal-layer engine — consumed by MachineAuditEngine and
// MachineProfilePropagationEngine; no MCP dispatcher surface intended.
export const machinePackageAPIEngine = new MachinePackageAPIEngine();
