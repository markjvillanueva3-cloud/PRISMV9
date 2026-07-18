/**
 * MillLoRAResourceManagerEngine
 * ================================
 *
 * Manages compute, memory, storage, and mill-domain-specific resources
 * for mill LoRA pipelines. Tracks allocation, enforces quotas, supports
 * priority-based preemption.
 *
 * Mill parity for LatheLoRAResourceManagerEngine (LATHE-LORA-MS0 U-LLR46)
 * with 3 MILL-CANONICAL resource types added on top of the 5 lathe-shared:
 *
 *   Lathe-shared resource types (5):
 *     - cpu_cores
 *     - gpu_memory_mb
 *     - ram_mb
 *     - disk_mb
 *     - gpu_count
 *
 *   MILL-CANONICAL resource types (3):
 *     - tcpm_solver_slots     — 5-axis TCPM solver concurrency licenses
 *     - vericut_slots          — Vericut / NCSimul / G-Wizard sim slots
 *     - postprocessor_slots    — Mill post-processor compile slots (Mastercam/HSMWorks/etc.)
 *
 * Features:
 *   - GPU/CPU/memory/disk + mill-canonical-resource accounting
 *   - Quota enforcement (soft 80%, hard 95% default)
 *   - Reservation tracking (soft hold)
 *   - Priority-based preemption (low → normal → high → critical, critical never preempted)
 *
 * @module engines/MillLoRAResourceManagerEngine
 * @milestone MILL-PARITY-UPGRADE-MS0 / U-MILL-LORA-RESOURCE-MANAGER (iter87)
 */

// ═══════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════

/** Default quota soft limit (fraction of total). */
export const DEFAULT_QUOTA_SOFT_LIMIT = 0.8;
/** Default quota hard limit (fraction of total). */
export const DEFAULT_QUOTA_HARD_LIMIT = 0.95;
/** Default reservation timeout (ms). */
export const DEFAULT_RESERVATION_TIMEOUT_MS = 30_000;

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

export type MillResourceType =
  // Lathe-shared
  | "cpu_cores"
  | "gpu_memory_mb"
  | "ram_mb"
  | "disk_mb"
  | "gpu_count"
  // MILL-CANONICAL
  | "tcpm_solver_slots"
  | "vericut_slots"
  | "postprocessor_slots";

/** Mill-canonical resource types not in lathe taxonomy. */
export const MILL_CANONICAL_RESOURCE_TYPES: MillResourceType[] = [
  "tcpm_solver_slots", "vericut_slots", "postprocessor_slots",
];

export type AllocationPriority = "low" | "normal" | "high" | "critical";

export interface MillResourcePool {
  type: MillResourceType;
  total: number;
  allocated: number;
  reserved: number;
}

export interface MillResourceAllocation {
  id: string;
  owner: string;
  resources: Partial<Record<MillResourceType, number>>;
  priority: AllocationPriority;
  allocated_at: number;
  expires_at?: number;
}

export interface MillResourceManagerConfig {
  enable_quotas: boolean;
  quota_soft_limit: number;
  quota_hard_limit: number;
  reservation_timeout_ms: number;
  preempt_low_priority: boolean;
}

const DEFAULT_CONFIG: MillResourceManagerConfig = {
  enable_quotas: true,
  quota_soft_limit: DEFAULT_QUOTA_SOFT_LIMIT,
  quota_hard_limit: DEFAULT_QUOTA_HARD_LIMIT,
  reservation_timeout_ms: DEFAULT_RESERVATION_TIMEOUT_MS,
  preempt_low_priority: false,
};

const PRIORITY_ORDER: Record<AllocationPriority, number> = {
  low: 0, normal: 1, high: 2, critical: 3,
};

// ═══════════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════════

class MillLoRAResourceManagerEngine {
  private config: MillResourceManagerConfig = { ...DEFAULT_CONFIG };
  private pools: Map<MillResourceType, MillResourcePool> = new Map();
  private allocations: Map<string, MillResourceAllocation> = new Map();

  setConfig(config: Partial<MillResourceManagerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): MillResourceManagerConfig {
    return { ...this.config };
  }

  setPool(type: MillResourceType, total: number): void {
    if (!(total >= 0)) throw new TypeError(`setPool: total must be >= 0 for ${type}`);
    const existing = this.pools.get(type);
    this.pools.set(type, {
      type,
      total,
      allocated: existing?.allocated ?? 0,
      reserved: existing?.reserved ?? 0,
    });
  }

  getPool(type: MillResourceType): MillResourcePool | undefined {
    return this.pools.get(type);
  }

  getPools(): MillResourcePool[] {
    return Array.from(this.pools.values());
  }

  canAllocate(resources: Partial<Record<MillResourceType, number>>): boolean {
    for (const [type, needed] of Object.entries(resources) as [MillResourceType, number][]) {
      const pool = this.pools.get(type);
      if (!pool) return false;
      const available = pool.total - pool.allocated - pool.reserved;
      if (available < needed) return false;
      if (this.config.enable_quotas) {
        const afterAlloc = (pool.allocated + needed) / Math.max(1, pool.total);
        if (afterAlloc > this.config.quota_hard_limit) return false;
      }
    }
    return true;
  }

  allocate(
    owner: string,
    resources: Partial<Record<MillResourceType, number>>,
    priority: AllocationPriority = "normal",
  ): MillResourceAllocation | null {
    if (!this.canAllocate(resources)) return null;
    const allocation: MillResourceAllocation = {
      id: `alloc-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      owner,
      resources,
      priority,
      allocated_at: Date.now(),
    };
    for (const [type, amount] of Object.entries(resources) as [MillResourceType, number][]) {
      const pool = this.pools.get(type);
      if (pool) pool.allocated += amount;
    }
    this.allocations.set(allocation.id, allocation);
    return allocation;
  }

  release(allocationId: string): boolean {
    const alloc = this.allocations.get(allocationId);
    if (!alloc) return false;
    for (const [type, amount] of Object.entries(alloc.resources) as [MillResourceType, number][]) {
      const pool = this.pools.get(type);
      if (pool) pool.allocated = Math.max(0, pool.allocated - amount);
    }
    this.allocations.delete(allocationId);
    return true;
  }

  reserve(resources: Partial<Record<MillResourceType, number>>): boolean {
    if (!this.canAllocate(resources)) return false;
    for (const [type, amount] of Object.entries(resources) as [MillResourceType, number][]) {
      const pool = this.pools.get(type);
      if (pool) pool.reserved += amount;
    }
    return true;
  }

  unreserve(resources: Partial<Record<MillResourceType, number>>): void {
    for (const [type, amount] of Object.entries(resources) as [MillResourceType, number][]) {
      const pool = this.pools.get(type);
      if (pool) pool.reserved = Math.max(0, pool.reserved - amount);
    }
  }

  getUtilization(type: MillResourceType): number {
    const pool = this.pools.get(type);
    if (!pool || pool.total === 0) return 0;
    return pool.allocated / pool.total;
  }

  getAllocation(id: string): MillResourceAllocation | undefined {
    return this.allocations.get(id);
  }

  getOwnerAllocations(owner: string): MillResourceAllocation[] {
    return Array.from(this.allocations.values()).filter(a => a.owner === owner);
  }

  /**
   * Find low-priority allocations that, if preempted, would free enough
   * resources for the requested set. Returns allocations in ascending
   * priority order (lowest preempted first). Critical-priority allocs
   * are never returned. Returns empty if no preemption can satisfy the
   * request.
   */
  findPreemptable(neededResources: Partial<Record<MillResourceType, number>>): MillResourceAllocation[] {
    const preemptable: MillResourceAllocation[] = [];
    const sorted = Array.from(this.allocations.values()).sort(
      (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority],
    );
    const released: Partial<Record<MillResourceType, number>> = {};
    for (const alloc of sorted) {
      if (alloc.priority === "critical") break;
      preemptable.push(alloc);
      for (const [type, amount] of Object.entries(alloc.resources) as [MillResourceType, number][]) {
        released[type] = (released[type] ?? 0) + amount;
      }
      let satisfied = true;
      for (const [type, needed] of Object.entries(neededResources) as [MillResourceType, number][]) {
        if ((released[type] ?? 0) < needed) { satisfied = false; break; }
      }
      if (satisfied) return preemptable;
    }
    // Could not satisfy with all non-critical allocs preempted
    return [];
  }

  getStats(): {
    total_pools: number;
    total_allocations: number;
    pools_at_soft_limit: number;
    pools_at_hard_limit: number;
    avg_utilization: number;
    resource_types: MillResourceType[];
    mill_canonical_resource_types: MillResourceType[];
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
      resource_types: [
        "cpu_cores", "gpu_memory_mb", "ram_mb", "disk_mb", "gpu_count",
        "tcpm_solver_slots", "vericut_slots", "postprocessor_slots",
      ],
      mill_canonical_resource_types: MILL_CANONICAL_RESOURCE_TYPES,
    };
  }

  getSummary(): string {
    const stats = this.getStats();
    return [
      "Mill LoRA Resource Manager Summary",
      "==================================",
      `Pools: ${stats.total_pools}`,
      `Allocations: ${stats.total_allocations}`,
      `At Soft Limit: ${stats.pools_at_soft_limit}`,
      `At Hard Limit: ${stats.pools_at_hard_limit}`,
      `Avg Utilization: ${(stats.avg_utilization * 100).toFixed(1)}%`,
    ].join("\n");
  }

  reset(): void {
    this.pools.clear();
    this.allocations.clear();
    this.config = { ...DEFAULT_CONFIG };
  }
}

export const millLoRAResourceManagerEngine = new MillLoRAResourceManagerEngine();
export { MillLoRAResourceManagerEngine };
