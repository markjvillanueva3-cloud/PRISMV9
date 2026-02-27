/**
 * ToolCribEngine — Manufacturing Intelligence Layer
 *
 * Manages tool inventory, check-in/out, lifecycle tracking, and
 * replenishment predictions. Composes ERPIntegrationEngine + ToolRegistry.
 *
 * Actions: toolcrib_checkout, toolcrib_checkin, toolcrib_inventory, toolcrib_reorder
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ToolCribItem {
  tool_id: string;
  description: string;
  category: string;
  location: string;                  // "Crib A-3-7" etc.
  total_quantity: number;
  available_quantity: number;
  checked_out: number;
  reorder_point: number;
  reorder_quantity: number;
  unit_cost: number;
  lead_time_days: number;
  supplier: string;
  avg_life_min: number;             // average tool life in cutting minutes
  total_usage_min: number;          // cumulative usage
  last_ordered: string;
}

export interface CheckoutRecord {
  tool_id: string;
  operator_id: string;
  machine_id: string;
  job_id: string;
  checkout_time: string;
  expected_return_time: string;
  actual_return_time?: string;
  usage_min?: number;
  condition_on_return?: "good" | "worn" | "broken" | "scrap";
}

export interface ToolCribCheckout {
  success: boolean;
  record: CheckoutRecord | null;
  message: string;
  remaining_available: number;
}

export interface ToolCribCheckin {
  success: boolean;
  record: CheckoutRecord | null;
  remaining_life_pct: number;
  recommendation: "return_to_stock" | "regrind" | "scrap";
}

export interface InventoryReport {
  total_items: number;
  total_value: number;
  below_reorder: ToolCribItem[];
  checked_out_count: number;
  utilization_pct: number;
  turnover_rate: number;            // annual
  categories: Record<string, { count: number; value: number }>;
}

export interface ReorderRecommendation {
  tool_id: string;
  description: string;
  current_stock: number;
  reorder_point: number;
  recommended_qty: number;
  estimated_cost: number;
  urgency: "immediate" | "soon" | "planned";
  reason: string;
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class ToolCribEngine {
  private inventory: ToolCribItem[] = [
    { tool_id: "EM-10-4F-TiAlN", description: "10mm 4-flute end mill TiAlN", category: "end_mill", location: "A-1-3", total_quantity: 20, available_quantity: 14, checked_out: 6, reorder_point: 5, reorder_quantity: 20, unit_cost: 35, lead_time_days: 5, supplier: "Kennametal", avg_life_min: 120, total_usage_min: 4800, last_ordered: "2026-01-15" },
    { tool_id: "EM-6-2F-AlCrN", description: "6mm 2-flute end mill AlCrN", category: "end_mill", location: "A-1-5", total_quantity: 30, available_quantity: 22, checked_out: 8, reorder_point: 8, reorder_quantity: 30, unit_cost: 22, lead_time_days: 5, supplier: "OSG", avg_life_min: 90, total_usage_min: 6300, last_ordered: "2026-02-01" },
    { tool_id: "DR-8.5-TiN", description: "8.5mm carbide drill TiN", category: "drill", location: "B-2-1", total_quantity: 15, available_quantity: 4, checked_out: 11, reorder_point: 5, reorder_quantity: 15, unit_cost: 18, lead_time_days: 3, supplier: "Sandvik", avg_life_min: 200, total_usage_min: 3000, last_ordered: "2026-01-20" },
    { tool_id: "FM-50-5I", description: "50mm face mill 5-insert", category: "face_mill", location: "C-1-1", total_quantity: 3, available_quantity: 2, checked_out: 1, reorder_point: 1, reorder_quantity: 2, unit_cost: 280, lead_time_days: 10, supplier: "Iscar", avg_life_min: 500, total_usage_min: 1500, last_ordered: "2025-12-01" },
    { tool_id: "BM-6-2F", description: "6mm ball mill 2-flute", category: "ball_mill", location: "A-2-3", total_quantity: 12, available_quantity: 9, checked_out: 3, reorder_point: 4, reorder_quantity: 12, unit_cost: 42, lead_time_days: 7, supplier: "Mitsubishi", avg_life_min: 80, total_usage_min: 1920, last_ordered: "2026-02-10" },
    { tool_id: "TAP-M8x1.25", description: "M8×1.25 spiral flute tap HSS", category: "tap", location: "D-1-2", total_quantity: 25, available_quantity: 18, checked_out: 7, reorder_point: 6, reorder_quantity: 25, unit_cost: 12, lead_time_days: 3, supplier: "YG-1", avg_life_min: 150, total_usage_min: 2250, last_ordered: "2026-01-25" },
    { tool_id: "INS-CNMG-432", description: "CNMG 432 turning insert CVD", category: "insert", location: "E-1-1", total_quantity: 40, available_quantity: 28, checked_out: 12, reorder_point: 10, reorder_quantity: 40, unit_cost: 8, lead_time_days: 5, supplier: "Sandvik", avg_life_min: 30, total_usage_min: 9600, last_ordered: "2026-02-05" },
    { tool_id: "TM-M12-3F", description: "M12 thread mill 3-flute", category: "thread_mill", location: "A-3-1", total_quantity: 6, available_quantity: 5, checked_out: 1, reorder_point: 2, reorder_quantity: 6, unit_cost: 65, lead_time_days: 7, supplier: "Emuge", avg_life_min: 180, total_usage_min: 540, last_ordered: "2026-01-10" },
  ];

  private checkoutLog: CheckoutRecord[] = [];

  checkout(toolId: string, operatorId: string, machineId: string, jobId: string): ToolCribCheckout {
    const item = this.inventory.find(i => i.tool_id === toolId);
    if (!item) return { success: false, record: null, message: `Tool ${toolId} not found`, remaining_available: 0 };
    if (item.available_quantity <= 0) return { success: false, record: null, message: `Tool ${toolId} out of stock`, remaining_available: 0 };

    item.available_quantity--;
    item.checked_out++;

    const record: CheckoutRecord = {
      tool_id: toolId, operator_id: operatorId,
      machine_id: machineId, job_id: jobId,
      checkout_time: new Date().toISOString(),
      expected_return_time: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
    };
    this.checkoutLog.push(record);

    return { success: true, record, message: `Checked out ${item.description}`, remaining_available: item.available_quantity };
  }

  checkin(toolId: string, operatorId: string, usageMin: number, condition: CheckoutRecord["condition_on_return"]): ToolCribCheckin {
    const item = this.inventory.find(i => i.tool_id === toolId);
    if (!item) return { success: false, record: null, remaining_life_pct: 0, recommendation: "scrap" };

    // Find matching checkout record
    const record = this.checkoutLog.find(r => r.tool_id === toolId && r.operator_id === operatorId && !r.actual_return_time);
    if (record) {
      record.actual_return_time = new Date().toISOString();
      record.usage_min = usageMin;
      record.condition_on_return = condition;
    }

    item.checked_out = Math.max(0, item.checked_out - 1);
    item.total_usage_min += usageMin;

    let recommendation: ToolCribCheckin["recommendation"];
    const remainingLife = Math.max(0, ((item.avg_life_min - usageMin) / item.avg_life_min) * 100);

    if (condition === "broken" || condition === "scrap") {
      recommendation = "scrap";
      item.total_quantity--;
    } else if (condition === "worn" || remainingLife < 20) {
      recommendation = "regrind";
      item.available_quantity++; // return to stock but flagged
    } else {
      recommendation = "return_to_stock";
      item.available_quantity++;
    }

    return { success: true, record: record || null, remaining_life_pct: Math.round(remainingLife), recommendation };
  }

  inventoryReport(): InventoryReport {
    const belowReorder = this.inventory.filter(i => i.available_quantity <= i.reorder_point);
    const categories: Record<string, { count: number; value: number }> = {};
    let totalValue = 0;
    let totalCheckedOut = 0;
    let totalItems = 0;

    for (const item of this.inventory) {
      totalValue += item.total_quantity * item.unit_cost;
      totalCheckedOut += item.checked_out;
      totalItems += item.total_quantity;

      if (!categories[item.category]) categories[item.category] = { count: 0, value: 0 };
      categories[item.category].count += item.total_quantity;
      categories[item.category].value += item.total_quantity * item.unit_cost;
    }

    const utilization = totalItems > 0 ? (totalCheckedOut / totalItems) * 100 : 0;

    return {
      total_items: totalItems,
      total_value: Math.round(totalValue * 100) / 100,
      below_reorder: belowReorder,
      checked_out_count: totalCheckedOut,
      utilization_pct: Math.round(utilization * 10) / 10,
      turnover_rate: 4.2, // annual estimate
      categories,
    };
  }

  reorderRecommendations(): ReorderRecommendation[] {
    const recs: ReorderRecommendation[] = [];

    for (const item of this.inventory) {
      if (item.available_quantity <= item.reorder_point) {
        const urgency: ReorderRecommendation["urgency"] =
          item.available_quantity === 0 ? "immediate"
          : item.available_quantity <= item.reorder_point / 2 ? "soon"
          : "planned";

        recs.push({
          tool_id: item.tool_id,
          description: item.description,
          current_stock: item.available_quantity,
          reorder_point: item.reorder_point,
          recommended_qty: item.reorder_quantity,
          estimated_cost: item.reorder_quantity * item.unit_cost,
          urgency,
          reason: `Stock ${item.available_quantity} ≤ reorder point ${item.reorder_point}`,
        });
      }
    }

    // Sort: immediate first
    const urgencyOrder = { immediate: 0, soon: 1, planned: 2 };
    recs.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);

    return recs;
  }

  getItem(toolId: string): ToolCribItem | undefined {
    return this.inventory.find(i => i.tool_id === toolId);
  }
}

export const toolCribEngine = new ToolCribEngine();
