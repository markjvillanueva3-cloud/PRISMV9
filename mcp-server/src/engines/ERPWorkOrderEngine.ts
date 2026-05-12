/**
 * ERPWorkOrderEngine — Work Order Status Sync with ERP
 * =====================================================
 *
 * Maintains bi-directional sync of work order status, progress,
 * and completion data between shop floor and ERP systems.
 *
 * L2-P4-MS1/P0-U02 — Batch 3: ERP Bridge Engines
 *
 * @version 1.0.0
 */

import { z } from "zod";

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const WorkOrderStatusSchema = z.enum([
  "planned",
  "released",
  "in_progress",
  "on_hold",
  "complete",
  "closed",
  "cancelled",
]);

export const WorkOrderSyncSchema = z.object({
  workOrderNumber: z.string(),
  erpSystem: z.string(),
  erpReference: z.string(),
  status: WorkOrderStatusSchema,
  quantityOrdered: z.number(),
  quantityComplete: z.number(),
  quantityScrap: z.number(),
  percentComplete: z.number(),
  currentOperation: z.string().optional(),
  startDate: z.string().optional(),
  completionDate: z.string().optional(),
  lastSyncedAt: z.string(),
  syncDirection: z.enum(["to_erp", "from_erp", "bidirectional"]),
  pendingChanges: z.array(z.object({
    field: z.string(),
    oldValue: z.unknown(),
    newValue: z.unknown(),
    timestamp: z.string(),
  })),
});

export const OperationStatusSchema = z.object({
  operationNumber: z.number(),
  workCenter: z.string(),
  status: z.enum(["pending", "setup", "running", "complete"]),
  setupComplete: z.boolean(),
  quantityComplete: z.number(),
  setupHoursActual: z.number(),
  runHoursActual: z.number(),
  laborHours: z.number(),
  machineHours: z.number(),
});

export const SyncResultSchema = z.object({
  workOrderNumber: z.string(),
  success: z.boolean(),
  direction: z.enum(["to_erp", "from_erp"]),
  changesApplied: z.number(),
  errors: z.array(z.string()),
  syncedAt: z.string(),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type WorkOrderStatus = z.infer<typeof WorkOrderStatusSchema>;
export type WorkOrderSync = z.infer<typeof WorkOrderSyncSchema>;
export type OperationStatus = z.infer<typeof OperationStatusSchema>;
export type SyncResult = z.infer<typeof SyncResultSchema>;

// ─── Data Store ───────────────────────────────────────────────────────────────

const workOrderSyncs: Map<string, WorkOrderSync> = new Map();
const operationStatuses: Map<string, OperationStatus[]> = new Map();

// Seed with sample data
workOrderSyncs.set("WO-001", {
  workOrderNumber: "WO-001",
  erpSystem: "jobboss",
  erpReference: "JB-2024-1234",
  status: "in_progress",
  quantityOrdered: 50,
  quantityComplete: 32,
  quantityScrap: 2,
  percentComplete: 64,
  currentOperation: "OP20",
  startDate: "2024-12-10",
  lastSyncedAt: new Date().toISOString(),
  syncDirection: "bidirectional",
  pendingChanges: [],
});

operationStatuses.set("WO-001", [
  { operationNumber: 10, workCenter: "LATHE-1", status: "complete", setupComplete: true, quantityComplete: 50, setupHoursActual: 0.5, runHoursActual: 6.2, laborHours: 6.7, machineHours: 6.2 },
  { operationNumber: 20, workCenter: "MILL-1", status: "running", setupComplete: true, quantityComplete: 32, setupHoursActual: 0.75, runHoursActual: 4.8, laborHours: 5.55, machineHours: 4.8 },
  { operationNumber: 30, workCenter: "GRIND-1", status: "pending", setupComplete: false, quantityComplete: 0, setupHoursActual: 0, runHoursActual: 0, laborHours: 0, machineHours: 0 },
]);

// ─── Engine ───────────────────────────────────────────────────────────────────

export class ERPWorkOrderEngine {
  /**
   * Get work order sync status
   * @param workOrderNumber - Work order number
   * @returns Sync status or undefined
   */
  static getWorkOrderSync(workOrderNumber: string): WorkOrderSync | undefined {
    return workOrderSyncs.get(workOrderNumber);
  }

  /**
   * Update work order status from shop floor
   * @param workOrderNumber - Work order number
   * @param updates - Status updates
   * @returns Updated sync record
   */
  static updateFromShopFloor(
    workOrderNumber: string,
    updates: {
      status?: WorkOrderStatus;
      quantityComplete?: number;
      quantityScrap?: number;
      currentOperation?: string;
    }
  ): WorkOrderSync | undefined {
    const sync = workOrderSyncs.get(workOrderNumber);
    if (!sync) return undefined;

    const now = new Date().toISOString();

    if (updates.status !== undefined && updates.status !== sync.status) {
      sync.pendingChanges.push({
        field: "status",
        oldValue: sync.status,
        newValue: updates.status,
        timestamp: now,
      });
      sync.status = updates.status;
    }

    if (updates.quantityComplete !== undefined && updates.quantityComplete !== sync.quantityComplete) {
      sync.pendingChanges.push({
        field: "quantityComplete",
        oldValue: sync.quantityComplete,
        newValue: updates.quantityComplete,
        timestamp: now,
      });
      sync.quantityComplete = updates.quantityComplete;
      sync.percentComplete = Math.round((updates.quantityComplete / sync.quantityOrdered) * 100);
    }

    if (updates.quantityScrap !== undefined) {
      sync.quantityScrap = updates.quantityScrap;
    }

    if (updates.currentOperation !== undefined) {
      sync.currentOperation = updates.currentOperation;
    }

    if (sync.status === "complete" && !sync.completionDate) {
      sync.completionDate = now.split("T")[0];
    }

    workOrderSyncs.set(workOrderNumber, sync);
    return sync;
  }

  /**
   * Update operation status
   * @param workOrderNumber - Work order number
   * @param operationNumber - Operation number
   * @param updates - Operation updates
   * @returns Updated operation
   */
  static updateOperationStatus(
    workOrderNumber: string,
    operationNumber: number,
    updates: Partial<Omit<OperationStatus, "operationNumber">>
  ): OperationStatus | undefined {
    const operations = operationStatuses.get(workOrderNumber);
    if (!operations) return undefined;

    const op = operations.find(o => o.operationNumber === operationNumber);
    if (!op) return undefined;

    Object.assign(op, updates);
    operationStatuses.set(workOrderNumber, operations);
    return op;
  }

  /**
   * Get operation statuses
   * @param workOrderNumber - Work order number
   * @returns Operation statuses
   */
  static getOperationStatuses(workOrderNumber: string): OperationStatus[] {
    return operationStatuses.get(workOrderNumber) || [];
  }

  /**
   * Sync changes to ERP
   * @param workOrderNumber - Work order number
   * @returns Sync result
   */
  static syncToERP(workOrderNumber: string): SyncResult {
    const sync = workOrderSyncs.get(workOrderNumber);
    if (!sync) {
      return {
        workOrderNumber,
        success: false,
        direction: "to_erp",
        changesApplied: 0,
        errors: ["Work order not found"],
        syncedAt: new Date().toISOString(),
      };
    }

    const changesApplied = sync.pendingChanges.length;
    sync.pendingChanges = [];
    sync.lastSyncedAt = new Date().toISOString();
    workOrderSyncs.set(workOrderNumber, sync);

    return {
      workOrderNumber,
      success: true,
      direction: "to_erp",
      changesApplied,
      errors: [],
      syncedAt: sync.lastSyncedAt,
    };
  }

  /**
   * Pull updates from ERP
   * @param workOrderNumber - Work order number
   * @param erpData - Data from ERP
   * @returns Sync result
   */
  static syncFromERP(workOrderNumber: string, erpData: Partial<WorkOrderSync>): SyncResult {
    let sync = workOrderSyncs.get(workOrderNumber);

    if (!sync) {
      sync = {
        workOrderNumber,
        erpSystem: erpData.erpSystem || "unknown",
        erpReference: erpData.erpReference || workOrderNumber,
        status: erpData.status || "planned",
        quantityOrdered: erpData.quantityOrdered || 0,
        quantityComplete: erpData.quantityComplete || 0,
        quantityScrap: erpData.quantityScrap || 0,
        percentComplete: 0,
        lastSyncedAt: new Date().toISOString(),
        syncDirection: "from_erp",
        pendingChanges: [],
      };
    } else {
      Object.assign(sync, erpData);
      sync.lastSyncedAt = new Date().toISOString();
    }

    sync.percentComplete = sync.quantityOrdered > 0
      ? Math.round((sync.quantityComplete / sync.quantityOrdered) * 100)
      : 0;

    workOrderSyncs.set(workOrderNumber, sync);

    return {
      workOrderNumber,
      success: true,
      direction: "from_erp",
      changesApplied: Object.keys(erpData).length,
      errors: [],
      syncedAt: sync.lastSyncedAt,
    };
  }

  /**
   * Get work orders with pending sync
   * @returns Work orders needing sync
   */
  static getPendingSyncs(): WorkOrderSync[] {
    return Array.from(workOrderSyncs.values()).filter(s => s.pendingChanges.length > 0);
  }

  /**
   * Get work order progress summary
   * @returns Progress summary for all work orders
   */
  static getProgressSummary(): {
    total: number;
    byStatus: Record<string, number>;
    averageCompletion: number;
    behindSchedule: number;
  } {
    const all = Array.from(workOrderSyncs.values());
    const byStatus: Record<string, number> = {};

    let totalCompletion = 0;
    let behindSchedule = 0;
    const today = new Date().toISOString().split("T")[0];

    for (const wo of all) {
      byStatus[wo.status] = (byStatus[wo.status] || 0) + 1;
      totalCompletion += wo.percentComplete;

      // Check if behind schedule (simplified)
      if (wo.status !== "complete" && wo.status !== "closed" && wo.percentComplete < 50) {
        behindSchedule++;
      }
    }

    return {
      total: all.length,
      byStatus,
      averageCompletion: all.length > 0 ? Math.round(totalCompletion / all.length) : 0,
      behindSchedule,
    };
  }

  static getSelfAwareness() {
    return {
      name: "ERPWorkOrderEngine",
      version: "1.0.0",
      milestone: "L2-P4-MS1/P0-U02",
      capabilities: ["getWorkOrderSync", "updateFromShopFloor", "updateOperationStatus", "getOperationStatuses", "syncToERP", "syncFromERP", "getPendingSyncs", "getProgressSummary"],
      statuses: ["planned", "released", "in_progress", "on_hold", "complete", "closed", "cancelled"],
      dependencies: [],
    };
  }
}

export const erpWorkOrderEngine = new ERPWorkOrderEngine();
