/**
 * ToolUsageEngine — Track tool usage per job/operation, link wear to inventory,
 * consumption tracking, cost allocation per job, regrinding lifecycle.
 */

export interface ToolUsageRecord {
  id: string;
  tool_id: string;
  tool_name: string;
  job_id: string;
  operation: string;
  machine_id: string;
  employee_id?: string;
  start_time: string;
  end_time?: string;
  cutting_minutes: number;
  parts_cut: number;
  wear_pct: number; // 0-100
  status: "in_use" | "completed" | "broken" | "worn_out";
  cost: number; // allocated cost for this usage
  notes: string;
}

export interface ToolInventoryItem {
  tool_id: string;
  name: string;
  type: ToolType;
  diameter_mm: number;
  material: ToolMaterial;
  coating?: string;
  max_life_minutes: number;
  used_life_minutes: number;
  remaining_life_pct: number;
  cost_per_unit: number;
  quantity_in_stock: number;
  quantity_allocated: number;
  reorder_point: number;
  location: string;
  condition: "new" | "good" | "fair" | "worn" | "replace" | "scrapped";
  regrind_count: number;
  max_regrinds: number;
  last_used?: string;
  purchase_date?: string;
}

export type ToolType =
  | "endmill" | "drill" | "tap" | "reamer" | "boring_bar"
  | "insert" | "face_mill" | "thread_mill" | "ball_nose"
  | "chamfer" | "slitting_saw" | "probe" | "other";

export type ToolMaterial =
  | "hss" | "cobalt" | "carbide" | "ceramic"
  | "cbn" | "pcd" | "cermet";

export interface ToolJobCost {
  job_id: string;
  tools_used: {
    tool_id: string;
    tool_name: string;
    minutes_used: number;
    wear_pct: number;
    allocated_cost: number;
    status: string;
  }[];
  total_tool_cost: number;
  broken_tools: number;
  worn_out_tools: number;
}

export interface ToolLifeReport {
  tool_id: string;
  tool_name: string;
  type: ToolType;
  total_life_minutes: number;
  used_minutes: number;
  remaining_minutes: number;
  remaining_pct: number;
  jobs_served: number;
  parts_cut: number;
  cost_per_part: number;
  condition: string;
  recommendation: "continue" | "regrind" | "replace" | "urgent_replace";
}

export interface ReorderAlert {
  tool_id: string;
  tool_name: string;
  current_stock: number;
  reorder_point: number;
  deficit: number;
  estimated_cost: number;
  priority: "low" | "medium" | "high" | "critical";
}

class ToolUsageEngine {
  private usageRecords: Map<string, ToolUsageRecord> = new Map();
  private inventory: Map<string, ToolInventoryItem> = new Map();
  private nextUsageId = 1;

  // ─── Inventory Management ──────────────────────────────

  /** Add or update a tool in inventory. */
  addTool(tool: ToolInventoryItem): ToolInventoryItem {
    this.inventory.set(tool.tool_id, tool);
    return tool;
  }

  /** Get tool from inventory. */
  getTool(toolId: string): ToolInventoryItem | undefined {
    return this.inventory.get(toolId);
  }

  /** List all tools, optionally filtered. */
  listTools(filters?: {
    type?: ToolType;
    condition?: ToolInventoryItem["condition"];
    low_stock?: boolean;
  }): ToolInventoryItem[] {
    let tools = Array.from(this.inventory.values());
    if (filters?.type) tools = tools.filter((t) => t.type === filters.type);
    if (filters?.condition) tools = tools.filter((t) => t.condition === filters.condition);
    if (filters?.low_stock) tools = tools.filter((t) => t.quantity_in_stock <= t.reorder_point);
    return tools;
  }

  // ─── Usage Tracking ────────────────────────────────────

  /** Start using a tool on a job/operation. */
  startUsage(input: {
    tool_id: string;
    job_id: string;
    operation: string;
    machine_id: string;
    employee_id?: string;
    timestamp?: string;
  }): ToolUsageRecord {
    const tool = this.inventory.get(input.tool_id);
    if (!tool) throw new Error(`Tool ${input.tool_id} not found in inventory`);
    if (tool.quantity_in_stock <= 0) throw new Error(`Tool ${input.tool_id} out of stock`);

    const id = `TU-${String(this.nextUsageId++).padStart(6, "0")}`;
    const record: ToolUsageRecord = {
      id,
      tool_id: input.tool_id,
      tool_name: tool.name,
      job_id: input.job_id,
      operation: input.operation,
      machine_id: input.machine_id,
      employee_id: input.employee_id,
      start_time: input.timestamp ?? new Date().toISOString(),
      cutting_minutes: 0,
      parts_cut: 0,
      wear_pct: 0,
      status: "in_use",
      cost: 0,
      notes: "",
    };

    // Allocate from inventory
    tool.quantity_allocated++;
    tool.last_used = record.start_time;

    this.usageRecords.set(id, record);
    return record;
  }

  /** End tool usage — records cutting time, parts, and wear. */
  endUsage(input: {
    usage_id: string;
    cutting_minutes: number;
    parts_cut: number;
    wear_pct: number;
    status?: "completed" | "broken" | "worn_out";
    timestamp?: string;
    notes?: string;
  }): ToolUsageRecord {
    const record = this.usageRecords.get(input.usage_id);
    if (!record) throw new Error(`Usage record ${input.usage_id} not found`);

    const tool = this.inventory.get(record.tool_id);

    record.end_time = input.timestamp ?? new Date().toISOString();
    record.cutting_minutes = input.cutting_minutes;
    record.parts_cut = input.parts_cut;
    record.wear_pct = input.wear_pct;
    record.status = input.status ?? "completed";
    if (input.notes) record.notes = input.notes;

    if (tool) {
      // Update tool life
      tool.used_life_minutes += input.cutting_minutes;
      tool.remaining_life_pct = Math.max(
        0,
        ((tool.max_life_minutes - tool.used_life_minutes) / tool.max_life_minutes) * 100,
      );

      // Allocate cost proportionally to life consumed
      const lifeFraction = input.cutting_minutes / tool.max_life_minutes;
      record.cost = round2(tool.cost_per_unit * lifeFraction);

      // Update condition
      if (record.status === "broken" || record.status === "worn_out") {
        tool.quantity_in_stock = Math.max(0, tool.quantity_in_stock - 1);
        tool.quantity_allocated = Math.max(0, tool.quantity_allocated - 1);
        tool.condition = record.status === "broken" ? "scrapped" : "replace";
      } else {
        tool.quantity_allocated = Math.max(0, tool.quantity_allocated - 1);
        // Update condition based on remaining life
        if (tool.remaining_life_pct > 70) tool.condition = "good";
        else if (tool.remaining_life_pct > 40) tool.condition = "fair";
        else if (tool.remaining_life_pct > 15) tool.condition = "worn";
        else tool.condition = "replace";
      }
    }

    return record;
  }

  /** Record a tool regrind. */
  regrindTool(toolId: string, restoredLifePct: number = 80): ToolInventoryItem {
    const tool = this.inventory.get(toolId);
    if (!tool) throw new Error(`Tool ${toolId} not found`);
    if (tool.regrind_count >= tool.max_regrinds) {
      throw new Error(`Tool ${toolId} has reached max regrinds (${tool.max_regrinds})`);
    }

    tool.regrind_count++;
    tool.used_life_minutes = tool.max_life_minutes * (1 - restoredLifePct / 100);
    tool.remaining_life_pct = restoredLifePct;
    tool.condition = restoredLifePct > 60 ? "good" : "fair";
    return tool;
  }

  // ─── Cost & Reporting ──────────────────────────────────

  /** Get tooling cost breakdown for a job. */
  jobToolCost(jobId: string): ToolJobCost {
    const records = Array.from(this.usageRecords.values()).filter(
      (r) => r.job_id === jobId,
    );

    return {
      job_id: jobId,
      tools_used: records.map((r) => ({
        tool_id: r.tool_id,
        tool_name: r.tool_name,
        minutes_used: r.cutting_minutes,
        wear_pct: r.wear_pct,
        allocated_cost: r.cost,
        status: r.status,
      })),
      total_tool_cost: round2(records.reduce((s, r) => s + r.cost, 0)),
      broken_tools: records.filter((r) => r.status === "broken").length,
      worn_out_tools: records.filter((r) => r.status === "worn_out").length,
    };
  }

  /** Get tool life report for all tools or a specific tool. */
  toolLifeReport(toolId?: string): ToolLifeReport[] {
    const tools = toolId
      ? [this.inventory.get(toolId)].filter(Boolean) as ToolInventoryItem[]
      : Array.from(this.inventory.values());

    return tools.map((tool) => {
      const usages = Array.from(this.usageRecords.values()).filter(
        (r) => r.tool_id === tool.tool_id && r.status === "completed",
      );
      const totalParts = usages.reduce((s, r) => s + r.parts_cut, 0);
      const totalCost = usages.reduce((s, r) => s + r.cost, 0);
      const jobIds = new Set(usages.map((r) => r.job_id));

      let recommendation: ToolLifeReport["recommendation"];
      if (tool.remaining_life_pct <= 5) recommendation = "urgent_replace";
      else if (tool.remaining_life_pct <= 15 && tool.regrind_count < tool.max_regrinds) recommendation = "regrind";
      else if (tool.remaining_life_pct <= 15) recommendation = "replace";
      else recommendation = "continue";

      return {
        tool_id: tool.tool_id,
        tool_name: tool.name,
        type: tool.type,
        total_life_minutes: tool.max_life_minutes,
        used_minutes: tool.used_life_minutes,
        remaining_minutes: Math.max(0, tool.max_life_minutes - tool.used_life_minutes),
        remaining_pct: round2(tool.remaining_life_pct),
        jobs_served: jobIds.size,
        parts_cut: totalParts,
        cost_per_part: totalParts > 0 ? round2(totalCost / totalParts) : 0,
        condition: tool.condition,
        recommendation,
      };
    });
  }

  /** Get tools that need reordering. */
  reorderAlerts(): ReorderAlert[] {
    const alerts: ReorderAlert[] = [];
    for (const tool of this.inventory.values()) {
      if (tool.quantity_in_stock <= tool.reorder_point) {
        const deficit = tool.reorder_point - tool.quantity_in_stock + 1; // order at least 1 above reorder point
        let priority: ReorderAlert["priority"];
        if (tool.quantity_in_stock === 0) priority = "critical";
        else if (tool.quantity_in_stock <= tool.reorder_point / 2) priority = "high";
        else if (tool.quantity_in_stock <= tool.reorder_point) priority = "medium";
        else priority = "low";

        alerts.push({
          tool_id: tool.tool_id,
          tool_name: tool.name,
          current_stock: tool.quantity_in_stock,
          reorder_point: tool.reorder_point,
          deficit,
          estimated_cost: round2(deficit * tool.cost_per_unit),
          priority,
        });
      }
    }
    return alerts.sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3 };
      return order[a.priority] - order[b.priority];
    });
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export const toolUsageEngine = new ToolUsageEngine();
export { ToolUsageEngine };
