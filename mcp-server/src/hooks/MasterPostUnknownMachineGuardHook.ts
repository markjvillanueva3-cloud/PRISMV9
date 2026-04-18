/**
 * MasterPostUnknownMachineGuardHook — Guard hook for unknown machine routing
 *
 * U-LTH32: Part of Forge-Triple for Master Post.
 * Triggers when master post encounters an unknown machine, redirecting to
 * the P2 Post Generator path for dynamic post generation.
 *
 * Hook behavior:
 *   1. Intercepts route requests with unknown machine IDs
 *   2. Checks if machine is in ShopConfigurationEngine registry
 *   3. If unknown, redirects to LathePostGeneratorEngine
 *   4. Logs unknown machine encounters for learning
 *
 * @module hooks/MasterPostUnknownMachineGuardHook
 */

import { shopConfigurationEngine } from "../engines/ShopConfigurationEngine.js";
import type { MasterPostRouteRequest } from "../engines/LatheMasterPostRouterEngine.js";

// ============================================================================
// TYPES
// ============================================================================

/** Hook trigger context */
export interface MasterPostHookContext {
  request: MasterPostRouteRequest;
  timestamp: string;
  session_id?: string;
}

/** Hook result */
export interface MasterPostHookResult {
  action: "allow" | "redirect" | "block";
  reason: string;
  redirect_to?: string;
  metadata?: Record<string, unknown>;
}

/** Unknown machine log entry */
export interface UnknownMachineLogEntry {
  machine_id: string;
  operation: string;
  controller_hint?: string;
  timestamp: string;
  redirect_path: string;
  resolved: boolean;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

class MasterPostUnknownMachineGuardHook {
  private static readonly HOOK_ID = "masterpost-unknown-machine-guard";
  private readonly unknownMachineLog: UnknownMachineLogEntry[] = [];

  /**
   * Execute hook - check if machine is known
   */
  execute(context: MasterPostHookContext): MasterPostHookResult {
    const { request } = context;

    // Check if machine is in registry
    const machines = shopConfigurationEngine.getMachines();
    const machineEntry = machines.find(m => m.id === request.machine_id);

    if (machineEntry) {
      // Get controller info from registry
      const registry = shopConfigurationEngine.getMachineControllerRegistry();
      const controllerEntry = registry.find(r => r.machineId === request.machine_id);

      // Machine is known - allow routing
      return {
        action: "allow",
        reason: `Machine ${request.machine_id} found in registry`,
        metadata: {
          machine_name: machineEntry.name,
          controller_family: controllerEntry?.controllerFamily || "unknown",
          type: machineEntry.type
        }
      };
    }

    // Machine is unknown - redirect to generator
    this.logUnknownMachine(request);

    return {
      action: "redirect",
      reason: `Machine ${request.machine_id} not in registry, redirecting to post generator`,
      redirect_to: "LathePostGeneratorEngine",
      metadata: {
        machine_id: request.machine_id,
        controller_hint: request.controller,
        operation: request.operation,
        fallback_post: "generic_turning"
      }
    };
  }

  /**
   * Check if hook should trigger for a request
   */
  shouldTrigger(request: MasterPostRouteRequest): boolean {
    // Always trigger for route requests to validate machine
    return !!request.machine_id;
  }

  /**
   * Get hook metadata
   */
  getMetadata(): {
    id: string;
    name: string;
    description: string;
    trigger_point: string;
    priority: number;
  } {
    return {
      id: MasterPostUnknownMachineGuardHook.HOOK_ID,
      name: "Master Post Unknown Machine Guard",
      description: "Guards master post routing against unknown machines, redirecting to generator",
      trigger_point: "pre_route",
      priority: 100
    };
  }

  /**
   * Get unknown machine log
   */
  getUnknownMachineLog(): UnknownMachineLogEntry[] {
    return [...this.unknownMachineLog];
  }

  /**
   * Clear unknown machine log
   */
  clearLog(): void {
    this.unknownMachineLog.length = 0;
  }

  /**
   * Mark unknown machine as resolved (e.g., added to registry)
   */
  markResolved(machineId: string): number {
    let count = 0;
    for (const entry of this.unknownMachineLog) {
      if (entry.machine_id === machineId && !entry.resolved) {
        entry.resolved = true;
        count++;
      }
    }
    return count;
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    total_unknown_encounters: number;
    unique_unknown_machines: number;
    unresolved_count: number;
    most_common_unknown: string | null;
  } {
    const machineFreq = new Map<string, number>();
    let unresolved = 0;

    for (const entry of this.unknownMachineLog) {
      machineFreq.set(entry.machine_id, (machineFreq.get(entry.machine_id) || 0) + 1);
      if (!entry.resolved) unresolved++;
    }

    let mostCommon: string | null = null;
    let maxCount = 0;
    machineFreq.forEach((count, machine) => {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = machine;
      }
    });

    return {
      total_unknown_encounters: this.unknownMachineLog.length,
      unique_unknown_machines: machineFreq.size,
      unresolved_count: unresolved,
      most_common_unknown: mostCommon
    };
  }

  // ── Private Methods ──────────────────────────────────────────────────────

  private logUnknownMachine(request: MasterPostRouteRequest): void {
    this.unknownMachineLog.push({
      machine_id: request.machine_id,
      operation: request.operation,
      controller_hint: request.controller,
      timestamp: new Date().toISOString(),
      redirect_path: "LathePostGeneratorEngine",
      resolved: false
    });
  }
}

// ── Singleton Export ───────────────────────────────────────────────────────

export const masterPostUnknownMachineGuardHook = new MasterPostUnknownMachineGuardHook();
