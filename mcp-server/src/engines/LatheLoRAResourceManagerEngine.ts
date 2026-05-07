/**
 * LatheLoRAResourceManagerEngine — LATHE-LORA-MS0 U-LLR46
 * ========================================================
 *
 * Manages compute, memory, and storage resources for LoRA pipelines.
 * Tracks allocation, enforces quotas, and rebalances load.
 *
 * Features:
 *   - GPU/CPU/memory/disk accounting
 *   - Quota enforcement
 *   - Reservation tracking
 *   - Fair-share scheduling
 *
 * @module engines/LatheLoRAResourceManagerEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export type ResourceType = "cpu_cores" | "gpu_memory_mb" | "ram_mb" | "disk_mb" | "gpu_count";

export interface ResourcePool {
  type: ResourceType;
  total: number;
  allocated: number;
  reserved: number;
}

export interface ResourceAllocation {
  id: string;
  owner: string;
  resources: Partial<Record<ResourceType, number>>;
  priority: "low" | "normal" | "high" | "critical";
  allocated_at: number;
  expires_at?: number;
}

export interface ResourceManagerConfig {
  enable_quotas: boolean;
  quota_soft_limit: number; // 0-1 fraction
  quota_hard_limit: number;
  reservation_timeout_ms: number;
  preempt_low_priority: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CONFIG: ResourceManagerConfig = {
  enable_quotas: true,
  quota_soft_limit: 0.8,
  quota_hard_limit: 0.95,
  reservation_timeout_ms: 30000,
  preempt_low_priority: false,
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

class LatheLoRAResourceManagerEngine {
  private config: ResourceManagerConfig = DEFAULT_CONFIG;
  private pools: Map<ResourceType, ResourcePool> = new Map();
  private allocations: Map<string, ResourceAllocation> = new Map();

  setConfig(config: Partial<ResourceManagerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): ResourceManagerConfig {
    return { ...this.config };
  }

  /**
   * Initialize or update a resource pool
   */
  setPool(type: ResourceType, total: number): void {
    const existing = this.pools.get(type);
    this.pools.set(type, {
      type,
      total,
      allocated: existing?.allocated || 0,
      reserved: existing?.reserved || 0,
    });
  }

  /**
   * Get pool
   */
  getPool(type: ResourceType): ResourcePool | undefined {
    return this.pools.get(type);
  }

  /**
   * Get pools
   */
  getPools(): ResourcePool[] {
    return Array.from(this.pools.values());
  }

  /**
   * Check if resources can be allocated
   */
  canAllocate(resources: Partial<Record<ResourceType, number>>): boolean {
    for (const [type, needed] of Object.entries(resources) as [ResourceType, number][]) {
      const pool = this.pools.get(type);
      if (!pool) return false;

      const available = pool.total - pool.allocated - pool.reserved;
      if (available < needed) return false;

      if (this.config.enable_quotas) {
        const afterAlloc = (pool.allocated + needed) / pool.total;
        if (afterAlloc > this.config.quota_hard_limit) return false;
      }
    }
    return true;
  }

  /**
   * Allocate resources
   */
  allocate(
    owner: string,
    resources: Partial<Record<ResourceType, number>>,
    priority: "low" | "normal" | "high" | "critical" = "normal",
  ): ResourceAllocation | null {
    if (!this.canAllocate(resources)) return null;

    const allocation: ResourceAllocation = {
      id: `alloc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      owner,
      resources,
      priority,
      allocated_at: Date.now(),
    };

    // Apply allocations to pools
    for (const [type, amount] of Object.entries(resources) as [ResourceType, number][]) {
      const pool = this.pools.get(type);
      if (pool) pool.allocated += amount;
    }

    this.allocations.set(allocation.id, allocation);
    return allocation;
  }

  /**
   * Release an allocation
   */
  release(allocationId: string): boolean {
    const alloc = this.allocations.get(allocationId);
    if (!alloc) return false;

    for (const [type, amount] of Object.entries(alloc.resources) as [ResourceType, number][]) {
      const pool = this.pools.get(type);
      if (pool) pool.allocated = Math.max(0, pool.allocated - amount);
    }

    this.allocations.delete(allocationId);
    return true;
  }

  /**
   * Reserve resources (soft hold)
   */
  reserve(resources: Partial<Record<ResourceType, number>>): boolean {
    if (!this.canAllocate(resources)) return false;

    for (const [type, amount] of Object.entries(resources) as [ResourceType, number][]) {
      const pool = this.pools.get(type);
      if (pool) pool.reserved += amount;
    }
    return true;
  }

  /**
   * Unreserve resources
   */
  unreserve(resources: Partial<Record<ResourceType, number>>): void {
    for (const [type, amount] of Object.entries(resources) as [ResourceType, number][]) {
      const pool = this.pools.get(type);
      if (pool) pool.reserved = Math.max(0, pool.reserved - amount);
    }
  }

  /**
   * Get utilization (0-1) for a type
   */
  getUtilization(type: ResourceType): number {
    const pool = this.pools.get(type);
    if (!pool || pool.total === 0) return 0;
    return pool.allocated / pool.total;
  }

  /**
   * Get allocation by ID
   */
  getAllocation(id: string): ResourceAllocation | undefined {
    return this.allocations.get(id);
  }

  /**
   * Get allocations for owner
   */
  getOwnerAllocations(owner: string): ResourceAllocation[] {
    return Array.from(this.allocations.values()).filter(a => a.owner === owner);
  }

  /**
   * Find low-priority allocations for preemption
   */
  findPreemptable(neededResources: Partial<Record<ResourceType, number>>): ResourceAllocation[] {
    const preemptable: ResourceAllocation[] = [];
    const priorityOrder = { low: 0, normal: 1, high: 2, critical: 3 };

    const sorted = Array.from(this.allocations.values()).sort(
      (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority],
    );

    const released: Partial<Record<ResourceType, number>> = {};
    for (const alloc of sorted) {
      if (alloc.priority === "critical") break;

      preemptable.push(alloc);
      for (const [type, amount] of Object.entries(alloc.resources) as [ResourceType, number][]) {
        released[type] = (released[type] || 0) + amount;
      }

      // Check if we have enough
      let satisfied = true;
      for (const [type, needed] of Object.entries(neededResources) as [ResourceType, number][]) {
        if ((released[type] || 0) < needed) {
          satisfied = false;
          break;
        }
      }
      if (satisfied) break;
    }

    return preemptable;
  }

  /**
   * Get stats
   */
  getStats(): {
    total_pools: number;
    total_allocations: number;
    pools_at_soft_limit: number;
    pools_at_hard_limit: number;
    avg_utilization: number;
  } {
    const pools = Array.from(this.pools.values());
    let softCount = 0;
    let hardCount = 0;
    let totalUtil = 0;

    for (const pool of pools) {
      if (pool.total === 0) continue;
      const util = pool.allocated / pool.total;
      totalUtil += util;
      if (util >= this.config.quota_soft_limit) softCount++;
      if (util >= this.config.quota_hard_limit) hardCount++;
    }

    return {
      total_pools: pools.length,
      total_allocations: this.allocations.size,
      pools_at_soft_limit: softCount,
      pools_at_hard_limit: hardCount,
      avg_utilization: pools.length > 0 ? totalUtil / pools.length : 0,
    };
  }

  /**
   * Get summary
   */
  getSummary(): string {
    const stats = this.getStats();
    return [
      "Resource Manager Summary",
      "========================",
      `Pools: ${stats.total_pools}`,
      `Allocations: ${stats.total_allocations}`,
      `At Soft Limit: ${stats.pools_at_soft_limit}`,
      `At Hard Limit: ${stats.pools_at_hard_limit}`,
      `Avg Utilization: ${(stats.avg_utilization * 100).toFixed(1)}%`,
    ].join("\n");
  }

  /**
   * Reset engine state
   */
  reset(): void {
    this.pools.clear();
    this.allocations.clear();
    this.config = DEFAULT_CONFIG;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const latheLoRAResourceManagerEngine = new LatheLoRAResourceManagerEngine();
