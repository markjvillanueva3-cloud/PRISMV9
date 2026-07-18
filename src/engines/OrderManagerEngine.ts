/**
 * PRISM MCP Server — Order Manager Engine
 *
 * Order lifecycle management: create/update orders and work orders,
 * status tracking, time logging, production logging, metrics.
 *
 * Ported from PRISM_ORDER_MANAGER.js (monolith R2.3.1).
 *
 * @module OrderManagerEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export type OrderStatus =
  | "draft"
  | "confirmed"
  | "in_progress"
  | "on_hold"
  | "completed"
  | "cancelled";

export type WorkOrderStatus =
  | "pending"
  | "queued"
  | "setup"
  | "running"
  | "complete"
  | "cancelled";

export interface OrderSpec {
  customer: string;
  partNumber: string;
  quantity: number;
  dueDate?: string;
  priority?: number;        // 1-5, 1=highest
  notes?: string;
  material?: string;
}

export interface Order {
  id: string;
  customer: string;
  partNumber: string;
  quantity: number;
  dueDate?: string;
  priority: number;
  status: OrderStatus;
  notes?: string;
  material?: string;
  createdAt: string;
  updatedAt: string;
  workOrders: string[];     // work order IDs
  completedQuantity: number;
}

export interface WorkOrderSpec {
  orderId: string;
  machine: string;
  operation: string;
  quantity: number;
  estimatedTime?: number;   // minutes
}

export interface WorkOrder {
  id: string;
  orderId: string;
  machine: string;
  operation: string;
  quantity: number;
  status: WorkOrderStatus;
  estimatedTime: number;
  actualTime: number;
  completedQuantity: number;
  createdAt: string;
  updatedAt: string;
  timeLog: Array<{ start: string; end?: string; minutes: number }>;
  productionLog: Array<{ timestamp: string; quantity: number; scrap?: number }>;
}

export interface OrderMetrics {
  totalOrders: number;
  byStatus: Record<OrderStatus, number>;
  totalQuantityOrdered: number;
  totalQuantityCompleted: number;
  completionPct: number;
  overdueCount: number;
  avgLeadTimeDays: number;
}

// ============================================================================
// ENGINE
// ============================================================================

class OrderManagerEngineImpl {
  private orders = new Map<string, Order>();
  private workOrders = new Map<string, WorkOrder>();
  private nextOrderId = 1;
  private nextWoId = 1;

  /** Create a new order. */
  createOrder(spec: OrderSpec): Order {
    const id = `ORD-${String(this.nextOrderId++).padStart(4, "0")}`;
    const now = new Date().toISOString();
    const order: Order = {
      id,
      customer: spec.customer,
      partNumber: spec.partNumber,
      quantity: spec.quantity,
      dueDate: spec.dueDate,
      priority: spec.priority ?? 3,
      status: "draft",
      notes: spec.notes,
      material: spec.material,
      createdAt: now,
      updatedAt: now,
      workOrders: [],
      completedQuantity: 0,
    };
    this.orders.set(id, order);
    return { ...order };
  }

  /** Update order status. */
  updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    opts?: { notes?: string },
  ): Order {
    const order = this.orders.get(orderId);
    if (!order) throw new Error(`Order not found: ${orderId}`);
    order.status = status;
    order.updatedAt = new Date().toISOString();
    if (opts?.notes) order.notes = (order.notes ? order.notes + "; " : "") + opts.notes;
    return { ...order };
  }

  /** Get order by ID. */
  getOrder(orderId: string): Order | undefined {
    const o = this.orders.get(orderId);
    return o ? { ...o } : undefined;
  }

  /** List all orders, optionally filtered by status. */
  listOrders(status?: OrderStatus): Order[] {
    const all = Array.from(this.orders.values());
    const filtered = status ? all.filter(o => o.status === status) : all;
    return filtered.map(o => ({ ...o }));
  }

  /** Create a work order linked to an order. */
  createWorkOrder(spec: WorkOrderSpec): WorkOrder {
    const order = this.orders.get(spec.orderId);
    if (!order) throw new Error(`Order not found: ${spec.orderId}`);

    const id = `WO-${String(this.nextWoId++).padStart(4, "0")}`;
    const now = new Date().toISOString();
    const wo: WorkOrder = {
      id,
      orderId: spec.orderId,
      machine: spec.machine,
      operation: spec.operation,
      quantity: spec.quantity,
      status: "pending",
      estimatedTime: spec.estimatedTime ?? 0,
      actualTime: 0,
      completedQuantity: 0,
      createdAt: now,
      updatedAt: now,
      timeLog: [],
      productionLog: [],
    };
    this.workOrders.set(id, wo);
    order.workOrders.push(id);
    order.updatedAt = now;
    return { ...wo };
  }

  /** Update work order status. */
  updateWorkOrderStatus(woId: string, status: WorkOrderStatus): WorkOrder {
    const wo = this.workOrders.get(woId);
    if (!wo) throw new Error(`Work order not found: ${woId}`);
    wo.status = status;
    wo.updatedAt = new Date().toISOString();
    return { ...wo };
  }

  /** Log time against a work order. */
  logTime(woId: string, minutes: number): WorkOrder {
    const wo = this.workOrders.get(woId);
    if (!wo) throw new Error(`Work order not found: ${woId}`);
    const now = new Date().toISOString();
    wo.timeLog.push({ start: now, minutes });
    wo.actualTime += minutes;
    wo.updatedAt = now;
    return { ...wo };
  }

  /** Log production against a work order (updates parent order too). */
  logProduction(
    woId: string,
    quantity: number,
    scrap = 0,
  ): WorkOrder {
    const wo = this.workOrders.get(woId);
    if (!wo) throw new Error(`Work order not found: ${woId}`);
    const now = new Date().toISOString();
    wo.productionLog.push({ timestamp: now, quantity, scrap });
    wo.completedQuantity += quantity;
    wo.updatedAt = now;

    // Update parent order completed quantity
    const order = this.orders.get(wo.orderId);
    if (order) {
      order.completedQuantity += quantity;
      order.updatedAt = now;
      // Auto-complete order if all quantity produced
      if (order.completedQuantity >= order.quantity && order.status === "in_progress") {
        order.status = "completed";
      }
    }

    return { ...wo };
  }

  /** Get work orders for an order. */
  getWorkOrders(orderId: string): WorkOrder[] {
    return Array.from(this.workOrders.values())
      .filter(wo => wo.orderId === orderId)
      .map(wo => ({ ...wo }));
  }

  /** Get machine queue — work orders assigned to a machine. */
  machineQueue(machine: string): WorkOrder[] {
    return Array.from(this.workOrders.values())
      .filter(wo => wo.machine === machine && wo.status !== "complete" && wo.status !== "cancelled")
      .sort((a, b) => {
        const orderA = this.orders.get(a.orderId);
        const orderB = this.orders.get(b.orderId);
        return (orderA?.priority ?? 3) - (orderB?.priority ?? 3);
      })
      .map(wo => ({ ...wo }));
  }

  /** Order metrics summary. */
  metrics(): OrderMetrics {
    const all = Array.from(this.orders.values());
    const byStatus: Record<OrderStatus, number> = {
      draft: 0, confirmed: 0, in_progress: 0,
      on_hold: 0, completed: 0, cancelled: 0,
    };
    let totalOrdered = 0;
    let totalCompleted = 0;
    let overdueCount = 0;
    let leadTimeDays = 0;
    let completedCount = 0;

    const now = new Date();

    for (const o of all) {
      byStatus[o.status]++;
      totalOrdered += o.quantity;
      totalCompleted += o.completedQuantity;

      if (o.dueDate && o.status !== "completed" && o.status !== "cancelled") {
        if (new Date(o.dueDate) < now) overdueCount++;
      }

      if (o.status === "completed") {
        const created = new Date(o.createdAt);
        const updated = new Date(o.updatedAt);
        leadTimeDays += (updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
        completedCount++;
      }
    }

    return {
      totalOrders: all.length,
      byStatus,
      totalQuantityOrdered: totalOrdered,
      totalQuantityCompleted: totalCompleted,
      completionPct: totalOrdered > 0
        ? round2((totalCompleted / totalOrdered) * 100) : 0,
      overdueCount,
      avgLeadTimeDays: completedCount > 0
        ? round2(leadTimeDays / completedCount) : 0,
    };
  }

  /** Reset all data (for testing). */
  reset(): void {
    this.orders.clear();
    this.workOrders.clear();
    this.nextOrderId = 1;
    this.nextWoId = 1;
  }
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

export const orderManagerEngine = new OrderManagerEngineImpl();
