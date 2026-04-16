/**
 * ERPIntegrationEngine.ts — R9-MS4 ERP / MES Integration
 * ========================================================
 *
 * Server-side engine for ERP/MES system integration.
 * Provides:
 *   - Work order import → PRISM manufacturing plan
 *   - Tool inventory sync (filter recommendations by stock)
 *   - Cost tracking feedback (estimated vs actual)
 *   - Quality data import (inspection → model feedback)
 *   - Job routing export with PRISM cycle times
 *
 * Actual ERP APIs (JobBOSS, Epicor, SAP) are deployment-time;
 * this engine handles the data mapping and logic layer.
 *
 * @version 1.0.0 — R9-MS4
 */

// ─── Shop Config Bridge (Session 5-2) ───────────────────────────────────────
type _ShopCostingParams = { machineRate: number; laborRate: number; overheadPct: number; toolingCostPerOp: number; materialCostPerPart: number };
let _shopConfigCache: _ShopCostingParams | null = null;
const _SHOP_DEFAULTS: _ShopCostingParams = { machineRate: 85, laborRate: 45, overheadPct: 15, toolingCostPerOp: 15, materialCostPerPart: 25 };

function _getShopCostingParams(): _ShopCostingParams {
  if (_shopConfigCache) return _shopConfigCache;
  try {
    const mod = require("./ShopConfigurationEngine.js");
    const resolved = mod.shopConfigurationEngine.toCostingParams();
    _shopConfigCache = resolved;
    return resolved;
  } catch {
    return _SHOP_DEFAULTS;
  }
}

// ─── Physics Bridge (Session 5-3: U-PHYSCOST1) ─────────────────────────────
import { resolveMaterial } from "../physics/constants.js";

interface _PhysicsStepResult {
  vc_mpm: number;
  rpm: number;
  feed_mmmin: number;
  fz_mm: number;
  doc_mm: number;
  woc_mm: number;
  mrr_cm3min: number;
  power_kw: number;
  tool_life_min: number;
  cycle_time_min: number;
  confidence: number;
  uncertainty_cv_pct: number;
  strategy: string;
  source: "orchestrator" | "canonical_fallback";
}

function _validatePhysicsOutput(r: _PhysicsStepResult): string[] {
  const warns: string[] = [];
  if (r.vc_mpm <= 0 || r.vc_mpm > 2000) warns.push(`Vc=${r.vc_mpm} m/min out of sane range (1-2000)`);
  if (r.rpm <= 0 || r.rpm > 60000) warns.push(`RPM=${r.rpm} out of sane range (1-60000)`);
  if (r.feed_mmmin <= 0 || r.feed_mmmin > 50000) warns.push(`Feed=${r.feed_mmmin} mm/min out of sane range`);
  if (r.power_kw < 0 || r.power_kw > 200) warns.push(`Power=${r.power_kw} kW out of sane range (0-200)`);
  if (r.cycle_time_min < 0) warns.push(`Negative cycle time: ${r.cycle_time_min} min`);
  return warns;
}

function _computePhysicsStep(material: string, operation: string, volumeToRemove_cm3?: number): _PhysicsStepResult {
  const isFinish = operation.toLowerCase().includes("finish");
  const toolDia = isFinish ? 10 : 12;
  const flutes = isFinish ? 2 : 4;
  const ap = isFinish ? 1.0 : toolDia * 1.0;
  const ae = isFinish ? toolDia * 0.05 : toolDia * 0.5;

  let result: _PhysicsStepResult;

  // Attempt SpeedFeedOrchestrator for full physics (Kienzle force + Taylor life + chatter)
  try {
    const mod = require("./SpeedFeedOrchestratorEngine.js");
    const engine = mod.speedFeedOrchestratorEngine;
    const computed = engine.compute({
      material,
      tool_diameter_mm: toolDia,
      flute_count: flutes,
      axial_depth_mm: ap,
      radial_depth_mm: ae,
      operation: isFinish ? "finishing" : "roughing",
      output_detail: "minimal",
    });

    const r = computed.value;
    const mrr = r.mrr_cm3min > 0 ? r.mrr_cm3min : 1;
    const cycleTime = volumeToRemove_cm3 ? volumeToRemove_cm3 / mrr : (r.mrr_cm3min > 0 ? 5 / mrr : 5);

    result = {
      vc_mpm: r.cutting_speed_mpm,
      rpm: r.spindle_rpm,
      feed_mmmin: r.feed_rate_mmmin,
      fz_mm: r.feed_per_tooth_mm,
      doc_mm: r.axial_depth_mm,
      woc_mm: r.radial_depth_mm,
      mrr_cm3min: r.mrr_cm3min,
      power_kw: r.power_kw,
      tool_life_min: r.tool_life_min,
      cycle_time_min: Math.max(cycleTime, 0.5),
      confidence: r.overall_confidence,
      uncertainty_cv_pct: r.uncertainty?.speed_cv_pct ?? 10,
      strategy: isFinish ? "LINEAR" : "ADAPTIVE",
      source: "orchestrator",
    };
  } catch {
    // Fallback: canonical material DB (ISO-group-aware via resolveMaterial)
    const mat = resolveMaterial(material);
    const vc = isFinish ? mat.vc_base_finishing : mat.vc_base_roughing;
    const rpm = Math.round((vc * 1000) / (Math.PI * toolDia));
    const fz = toolDia * (isFinish ? 0.01 : 0.02);
    const feedMmMin = Math.round(fz * flutes * rpm);
    const mrr = (ap * ae * feedMmMin) / 1000; // cm³/min
    const cycleTime = volumeToRemove_cm3 && mrr > 0 ? volumeToRemove_cm3 / mrr : 5;

    result = {
      vc_mpm: vc,
      rpm,
      feed_mmmin: feedMmMin,
      fz_mm: fz,
      doc_mm: ap,
      woc_mm: ae,
      mrr_cm3min: mrr,
      power_kw: 0,
      tool_life_min: 0,
      cycle_time_min: Math.max(cycleTime, 0.5),
      confidence: 0.5,
      uncertainty_cv_pct: 25,
      strategy: isFinish ? "LINEAR" : "ADAPTIVE",
      source: "canonical_fallback",
    };
  }

  // Output validation: clamp insane values and reduce confidence
  const outputWarns = _validatePhysicsOutput(result);
  if (outputWarns.length > 0) {
    result.confidence = Math.min(result.confidence, 0.3);
    result.vc_mpm = Math.max(1, Math.min(result.vc_mpm, 2000));
    result.rpm = Math.max(1, Math.min(result.rpm, 60000));
    result.feed_mmmin = Math.max(1, Math.min(result.feed_mmmin, 50000));
    result.power_kw = Math.max(0, Math.min(result.power_kw, 200));
    result.cycle_time_min = Math.max(0.5, result.cycle_time_min);
  }

  return result;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type ERPSystem = "jobboss" | "epicor" | "proshop" | "global_shop" | "sap" | "oracle" | "generic";
/** Work Order Status type definition.
 */
export type WorkOrderStatus = "pending" | "planned" | "in_progress" | "complete" | "cancelled";
/** Cost Category type definition.
 */
export type CostCategory = "machine_time" | "labor" | "tooling" | "material" | "overhead";

/** Work Order configuration/data structure.
 */
export interface WorkOrder {
  wo_number: string;
  part_number: string;
  revision: string;
  material: string;
  quantity: number;
  due_date: string;
  customer?: string;
  routing: RoutingStep[];
  status: WorkOrderStatus;
  notes?: string;
}

/** Routing Step configuration/data structure.
 */
export interface RoutingStep {
  step: number;
  operation: string;
  work_center: string;
  estimated_time_min?: number;
  actual_time_min?: number;
  setup_time_min?: number;
  tool_list?: string[];
  volume_to_remove_cm3?: number;
}

/** P R I S M Plan configuration/data structure.
 */
export interface PRISMPlan {
  wo_number: string;
  part_number: string;
  material: string;
  quantity: number;
  routing: PRISMRoutingStep[];
  total_cycle_time_min: number;
  total_setup_time_min: number;
  estimated_cost: CostBreakdown;
  recommendations: string[];
}

/** P R I S M Routing Step configuration/data structure.
 */
export interface PRISMRoutingStep {
  step: number;
  operation: string;
  work_center: string;
  prism_cycle_time_min: number;
  prism_setup_time_min: number;
  parameters: {
    rpm: number;
    feed_mmmin: number;
    doc_mm: number;
    woc_mm: number;
    strategy: string;
  };
  tool_recommendation: string;
}

/** Cost Breakdown configuration/data structure.
 */
export interface CostBreakdown {
  machine_time: number;
  labor: number;
  tooling: number;
  material: number;
  overhead: number;
  total: number;
  per_part: number;
}

/** Cost Feedback configuration/data structure.
 */
export interface CostFeedback {
  wo_number: string;
  estimated: CostBreakdown;
  actual: CostBreakdown;
  variance: CostVariance;
}

/** Cost Variance configuration/data structure.
 */
export interface CostVariance {
  total_pct: number;
  by_category: Record<CostCategory, number>;
  learning_applied: boolean;
}

/** Tool Inventory Item configuration/data structure.
 */
export interface ToolInventoryItem {
  tool_id: string;
  description: string;
  quantity_on_hand: number;
  quantity_allocated: number;
  available: number;
  reorder_point: number;
  lead_time_days: number;
  location: string;
}

/** Quality Record configuration/data structure.
 */
export interface QualityRecord {
  wo_number: string;
  part_number: string;
  inspection_date: string;
  measurements: QualityMeasurement[];
  pass: boolean;
  inspector: string;
}

/** Quality Measurement configuration/data structure.
 */
export interface QualityMeasurement {
  feature: string;
  nominal: number;
  tolerance_plus: number;
  tolerance_minus: number;
  actual: number;
  unit: string;
  in_spec: boolean;
}

// ─── In-Memory Storage (write-through to PostgreSQL via PersistenceBridge) ──

const workOrders: Map<string, WorkOrder> = new Map();
const plans: Map<string, PRISMPlan> = new Map();
let costFeedback: CostFeedback[] = [];
let qualityRecords: QualityRecord[] = [];
const toolInventory: Map<string, ToolInventoryItem> = new Map();

// ─── Persistence Bridge Registration ────────────────────────────────────────
import { persistenceBridge } from "../db/PersistenceBridge.js";

persistenceBridge.registerMap({ entity: "work_orders", getMap: () => workOrders as unknown as Map<string, any>, keyField: "wo_number" });
persistenceBridge.registerMap({ entity: "prism_plans", getMap: () => plans as unknown as Map<string, any>, keyField: "wo_number" });
persistenceBridge.registerArray({
  entity: "cost_feedback", getArray: () => costFeedback as unknown as any[],
  setArray: (data) => { costFeedback = data as unknown as CostFeedback[]; }, keyField: "id",
});
persistenceBridge.registerArray({
  entity: "quality_records", getArray: () => qualityRecords as unknown as any[],
  setArray: (data) => { qualityRecords = data as unknown as QualityRecord[]; }, keyField: "id",
});
persistenceBridge.registerMap({ entity: "tool_inventory", getMap: () => toolInventory as unknown as Map<string, any>, keyField: "tool_id" });

// Pre-populate tool inventory
const DEFAULT_INVENTORY: ToolInventoryItem[] = [
  { tool_id: "TI-001", description: "1/2\" 4FL Carbide Endmill", quantity_on_hand: 12, quantity_allocated: 3, available: 9, reorder_point: 5, lead_time_days: 7, location: "Crib A-1" },
  { tool_id: "TI-002", description: "3/8\" 3FL Carbide Endmill", quantity_on_hand: 8, quantity_allocated: 2, available: 6, reorder_point: 4, lead_time_days: 7, location: "Crib A-2" },
  { tool_id: "TI-003", description: "1\" 5FL Rougher", quantity_on_hand: 4, quantity_allocated: 1, available: 3, reorder_point: 2, lead_time_days: 14, location: "Crib B-1" },
  { tool_id: "TI-004", description: "6mm Ball Nose", quantity_on_hand: 6, quantity_allocated: 0, available: 6, reorder_point: 3, lead_time_days: 10, location: "Crib B-2" },
  { tool_id: "TI-005", description: "8mm Drill", quantity_on_hand: 20, quantity_allocated: 5, available: 15, reorder_point: 10, lead_time_days: 5, location: "Crib C-1" },
  { tool_id: "TI-006", description: "CNMG 432 Insert", quantity_on_hand: 50, quantity_allocated: 10, available: 40, reorder_point: 20, lead_time_days: 3, location: "Insert Drawer 1" },
];
DEFAULT_INVENTORY.forEach(t => toolInventory.set(t.tool_id, t));

// ─── Material Vc — REPLACED by _computePhysicsStep (Session 5-3) ───────────
// Legacy getVc() removed: was 5-line if-chain returning hardcoded Vc.
// All Vc resolution now flows through _computePhysicsStep() which calls
// SpeedFeedOrchestrator (physics-backed) with CANONICAL_MATERIAL_DB fallback.

// ─── Work Order Import ──────────────────────────────────────────────────────

/** Import Work Order.
 * @param wo - wo
 * @returns p r i s m plan
 */
export function importWorkOrder(wo: WorkOrder): PRISMPlan {
  workOrders.set(wo.wo_number, wo);
  persistenceBridge.persist("work_orders", wo.wo_number, wo as any);

  // Session 5-3 (U-PHYSCOST1): physics-backed routing via SpeedFeedOrchestrator
  const warnings: string[] = [];
  const prismRouting: PRISMRoutingStep[] = wo.routing.map(step => {
    const physics = _computePhysicsStep(wo.material, step.operation, step.volume_to_remove_cm3);

    // Use physics cycle time only when ERP doesn't provide one
    const cycleTime = step.estimated_time_min ?? Math.round(physics.cycle_time_min * 100) / 100;
    const setupTime = step.setup_time_min ?? 15;

    if (physics.source === "canonical_fallback") {
      warnings.push(`Step ${step.step} (${step.operation}): SpeedFeedOrchestrator unavailable, using canonical material DB fallback`);
    }
    if (physics.confidence < 0.6) {
      warnings.push(`Step ${step.step} (${step.operation}): low confidence (${(physics.confidence * 100).toFixed(0)}%) — verify parameters`);
    }

    return {
      step: step.step,
      operation: step.operation,
      work_center: step.work_center,
      prism_cycle_time_min: cycleTime,
      prism_setup_time_min: setupTime,
      parameters: {
        rpm: physics.rpm,
        feed_mmmin: physics.feed_mmmin,
        doc_mm: Math.round(physics.doc_mm * 100) / 100,
        woc_mm: Math.round(physics.woc_mm * 100) / 100,
        strategy: physics.strategy,
      },
      tool_recommendation: step.tool_list?.[0] ?? `${physics.doc_mm > 2 ? 12 : 10}mm ${physics.strategy === "LINEAR" ? "2FL" : "4FL"} Carbide Endmill`,
    };
  });

  const totalCycle = prismRouting.reduce((sum, s) => sum + s.prism_cycle_time_min, 0);
  const totalSetup = prismRouting.reduce((sum, s) => sum + s.prism_setup_time_min, 0);
  const shopCfg = _getShopCostingParams();
  const machineRate = shopCfg.machineRate;
  const laborRate = shopCfg.laborRate;
  const machineCost = Math.round((totalCycle * wo.quantity + totalSetup) / 60 * machineRate * 100) / 100;
  const laborCost = Math.round((totalCycle * wo.quantity + totalSetup) / 60 * laborRate * 100) / 100;
  const toolingCost = Math.round(prismRouting.length * shopCfg.toolingCostPerOp * 100) / 100;
  const materialCost = Math.round(wo.quantity * shopCfg.materialCostPerPart * 100) / 100;
  const overhead = Math.round((machineCost + laborCost) * (shopCfg.overheadPct / 100) * 100) / 100;
  const total = Math.round((machineCost + laborCost + toolingCost + materialCost + overhead) * 100) / 100;

  // Compute aggregate physics confidence for the plan
  const physicsResults = wo.routing.map(step => _computePhysicsStep(wo.material, step.operation, step.volume_to_remove_cm3));
  const avgConfidence = physicsResults.length > 0
    ? physicsResults.reduce((s, p) => s + p.confidence, 0) / physicsResults.length : 0.5;
  const physicsSource = physicsResults.some(p => p.source === "orchestrator") ? "SpeedFeedOrchestrator" : "canonical_material_db";

  const recommendations: string[] = [
    `Material: ${wo.material} — Vc=${physicsResults[0]?.vc_mpm ?? 200} m/min (source: ${physicsSource})`,
    prismRouting.length > 3 ? "Consider combining operations to reduce setup changes" : "Routing looks efficient",
    wo.quantity > 50 ? "High volume — consider fixture nesting for batch efficiency" : "Standard batch size",
  ];
  if (avgConfidence < 0.7) {
    recommendations.push(`Physics confidence ${(avgConfidence * 100).toFixed(0)}% — consider verifying cutting parameters before production`);
  }

  const plan: PRISMPlan = {
    wo_number: wo.wo_number,
    part_number: wo.part_number,
    material: wo.material,
    quantity: wo.quantity,
    routing: prismRouting,
    total_cycle_time_min: totalCycle * wo.quantity,
    total_setup_time_min: totalSetup,
    estimated_cost: {
      machine_time: machineCost,
      labor: laborCost,
      tooling: toolingCost,
      material: materialCost,
      overhead,
      total,
      per_part: Math.round(total / wo.quantity * 100) / 100,
    },
    recommendations: [...recommendations, ...warnings],
  };

  plans.set(wo.wo_number, plan);
  persistenceBridge.persist("prism_plans", wo.wo_number, plan as any);
  return plan;
}

// ─── Cost Feedback ──────────────────────────────────────────────────────────

/** Record Cost Feedback.
 * @param params - params for the operation
 * @returns cost feedback
 */
export function recordCostFeedback(params: Record<string, any>): CostFeedback {
  const woNumber = params.wo_number;
  const plan = plans.get(woNumber);
  const estimated = plan?.estimated_cost ?? {
    machine_time: 0, labor: 0, tooling: 0, material: 0, overhead: 0, total: 0, per_part: 0,
  };

  // Session 5-3: removed Math.random() fallbacks — actuals must be real or marked estimated
  const hasRealActuals = params.actual_machine_cost != null || params.actual_labor_cost != null;
  const actual: CostBreakdown = {
    machine_time: params.actual_machine_cost ?? estimated.machine_time,
    labor: params.actual_labor_cost ?? estimated.labor,
    tooling: params.actual_tooling_cost ?? estimated.tooling,
    material: params.actual_material_cost ?? estimated.material,
    overhead: params.actual_overhead ?? estimated.overhead,
    total: 0,
    per_part: 0,
  };
  actual.total = Math.round((actual.machine_time + actual.labor + actual.tooling + actual.material + actual.overhead) * 100) / 100;
  actual.per_part = params.quantity ? Math.round(actual.total / params.quantity * 100) / 100 : actual.total;

  const totalVar = estimated.total > 0 ? Math.round((actual.total - estimated.total) / estimated.total * 100 * 10) / 10 : 0;
  const byCategory: Record<CostCategory, number> = {
    machine_time: estimated.machine_time > 0 ? Math.round((actual.machine_time - estimated.machine_time) / estimated.machine_time * 100 * 10) / 10 : 0,
    labor: estimated.labor > 0 ? Math.round((actual.labor - estimated.labor) / estimated.labor * 100 * 10) / 10 : 0,
    tooling: estimated.tooling > 0 ? Math.round((actual.tooling - estimated.tooling) / estimated.tooling * 100 * 10) / 10 : 0,
    material: estimated.material > 0 ? Math.round((actual.material - estimated.material) / estimated.material * 100 * 10) / 10 : 0,
    overhead: estimated.overhead > 0 ? Math.round((actual.overhead - estimated.overhead) / estimated.overhead * 100 * 10) / 10 : 0,
  };

  const feedback: CostFeedback = {
    wo_number: woNumber,
    estimated,
    actual,
    variance: {
      total_pct: totalVar,
      by_category: byCategory,
      learning_applied: hasRealActuals && Math.abs(totalVar) < 10,
    },
  };

  costFeedback.push(feedback);
  persistenceBridge.persistAppend("cost_feedback", feedback as any);
  return feedback;
}

// ─── Quality Import ─────────────────────────────────────────────────────────

/** Import Quality Data.
 * @param record - record
 * @returns quality record & { analysis: any }
 */
export function importQualityData(record: QualityRecord): QualityRecord & { analysis: any } {
  // Compute in_spec for each measurement
  for (const m of record.measurements) {
    m.in_spec = m.actual >= (m.nominal + m.tolerance_minus) && m.actual <= (m.nominal + m.tolerance_plus);
  }
  record.pass = record.measurements.every(m => m.in_spec);
  qualityRecords.push(record);
  persistenceBridge.persistAppend("quality_records", record as any);

  const outOfSpec = record.measurements.filter(m => !m.in_spec);
  const analysis = {
    total_features: record.measurements.length,
    in_spec: record.measurements.filter(m => m.in_spec).length,
    out_of_spec: outOfSpec.length,
    pass: record.pass,
    deviations: outOfSpec.map(m => ({
      feature: m.feature,
      nominal: m.nominal,
      actual: m.actual,
      deviation: Math.round((m.actual - m.nominal) * 10000) / 10000,
      unit: m.unit,
    })),
    recommendation: outOfSpec.length > 0
      ? "Review tool wear and machine calibration for out-of-spec features"
      : "All features in spec — parameters validated",
  };

  return { ...record, analysis };
}

// ─── Supported ERP Systems ──────────────────────────────────────────────────

const ERP_SYSTEMS = [
  { id: "jobboss", name: "JobBOSS / E2 Shop System", tier: "SMB", status: "supported" },
  { id: "epicor", name: "Epicor Kinetic", tier: "Mid-Market", status: "supported" },
  { id: "proshop", name: "ProShop ERP", tier: "SMB", status: "supported" },
  { id: "global_shop", name: "Global Shop Solutions", tier: "Mid-Market", status: "supported" },
  { id: "sap", name: "SAP S/4HANA", tier: "Enterprise", status: "planned" },
  { id: "oracle", name: "Oracle Cloud Manufacturing", tier: "Enterprise", status: "planned" },
  { id: "generic", name: "Generic CSV/API", tier: "Any", status: "supported" },
];

// ─── Dispatcher ──────────────────────────────────────────────────────────────

/**
 * Actions:
 *   erp_import_wo      — Import work order → PRISM plan
 *   erp_get_plan       — Get PRISM plan for work order
 *   erp_cost_feedback  — Record actual vs estimated costs
 *   erp_cost_history   — Get cost feedback history
 *   erp_quality_import — Import quality/inspection data
 *   erp_quality_history — Get quality records
 *   erp_tool_inventory — Get/search tool inventory
 *   erp_tool_update    — Update tool inventory count
 *   erp_systems        — List supported ERP systems
 *   erp_wo_list        — List imported work orders
 */
export function erpIntegration(action: string, params: Record<string, any>): any {
  switch (action) {
    case "erp_import_wo": {
      const wo: WorkOrder = {
        wo_number: params.wo_number ?? `WO-${Date.now()}`,
        part_number: params.part_number ?? "PART-001",
        revision: params.revision ?? "A",
        material: params.material ?? "Steel",
        quantity: params.quantity ?? 10,
        due_date: params.due_date ?? new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        customer: params.customer,
        status: "planned",
        routing: params.routing ?? [
          { step: 10, operation: "Rough Milling", work_center: "Mill-01" },
          { step: 20, operation: "Finish Milling", work_center: "Mill-01" },
          { step: 30, operation: "Deburr", work_center: "Bench" },
        ],
        notes: params.notes,
      };
      return importWorkOrder(wo);
    }

    case "erp_get_plan": {
      const plan = plans.get(params.wo_number ?? "");
      if (!plan) return { error: "Plan not found", wo_number: params.wo_number };
      return plan;
    }

    case "erp_cost_feedback":
      return recordCostFeedback(params);

    case "erp_cost_history":
      return {
        records: costFeedback,
        total: costFeedback.length,
        avg_variance_pct: costFeedback.length > 0
          ? Math.round(costFeedback.reduce((s, f) => s + f.variance.total_pct, 0) / costFeedback.length * 10) / 10
          : 0,
      };

    case "erp_quality_import": {
      const record: QualityRecord = {
        wo_number: params.wo_number ?? "WO-UNKNOWN",
        part_number: params.part_number ?? "PART-001",
        inspection_date: params.inspection_date ?? new Date().toISOString().slice(0, 10),
        measurements: params.measurements ?? [],
        pass: false, // computed in importQualityData
        inspector: params.inspector ?? "QC-01",
      };
      return importQualityData(record);
    }

    case "erp_quality_history": {
      const woFilter = params.wo_number;
      const records = woFilter
        ? qualityRecords.filter(r => r.wo_number === woFilter)
        : qualityRecords;
      return {
        records,
        total: records.length,
        pass_rate: records.length > 0
          ? Math.round(records.filter(r => r.pass).length / records.length * 100)
          : 0,
      };
    }

    case "erp_tool_inventory": {
      const query = params.query ?? "";
      const items = query
        ? Array.from(toolInventory.values()).filter(t =>
            t.tool_id.toLowerCase().includes(query.toLowerCase()) ||
            t.description.toLowerCase().includes(query.toLowerCase()))
        : Array.from(toolInventory.values());
      const needReorder = items.filter(t => t.available <= t.reorder_point);
      return {
        items,
        total: items.length,
        need_reorder: needReorder.length,
        reorder_items: needReorder,
      };
    }

    case "erp_tool_update": {
      const id = params.tool_id ?? params.id;
      const item = toolInventory.get(id);
      if (!item) return { error: "Tool not found", tool_id: id };
      if (params.quantity_on_hand !== undefined) item.quantity_on_hand = params.quantity_on_hand;
      if (params.quantity_allocated !== undefined) item.quantity_allocated = params.quantity_allocated;
      item.available = item.quantity_on_hand - item.quantity_allocated;
      persistenceBridge.persist("tool_inventory", item.tool_id, item as any);
      return item;
    }

    case "erp_systems":
      return { systems: ERP_SYSTEMS, total: ERP_SYSTEMS.length };

    case "erp_wo_list": {
      const orders = Array.from(workOrders.values());
      return {
        work_orders: orders.map(wo => ({
          wo_number: wo.wo_number,
          part_number: wo.part_number,
          material: wo.material,
          quantity: wo.quantity,
          status: wo.status,
          due_date: wo.due_date,
        })),
        total: orders.length,
      };
    }

    default:
      return { error: `ERPIntegrationEngine: unknown action "${action}"` };
  }
}

// ─── Source File Catalog (14 LOW-priority integration extractions) ───────────

/** I N T E G R A T I O N_ S O U R C E_ F I L E_ C A T A L O G constant.
 */
export const INTEGRATION_SOURCE_FILE_CATALOG: Record<string, {
  filename: string;
  source_dir: string;
  category: string;
  lines: number;
  safety_class: "LOW";
  description: string;
  integration_type: string;
}> = {
  "EXT-350": {
    filename: "PRISM_100_PERCENT_INTEGRATION.js",
    source_dir: "extracted/integration/",
    category: "integration",
    lines: 187,
    safety_class: "LOW",
    description: "Full-coverage integration module for PRISM system connectivity",
    integration_type: "general",
  },
  "EXT-351": {
    filename: "PRISM_AI_100_INTEGRATION.js",
    source_dir: "extracted/integration/",
    category: "integration",
    lines: 165,
    safety_class: "LOW",
    description: "AI-powered integration layer for PRISM analytics pipeline",
    integration_type: "general",
  },
  "EXT-352": {
    filename: "PRISM_AI_KNOWLEDGE_INTEGRATION.js",
    source_dir: "extracted/integration/",
    category: "integration",
    lines: 120,
    safety_class: "LOW",
    description: "AI knowledge base integration for machining intelligence",
    integration_type: "general",
  },
  "EXT-353": {
    filename: "PRISM_BRIDGE.js",
    source_dir: "extracted/integration/",
    category: "integration",
    lines: 279,
    safety_class: "LOW",
    description: "Core bridge module connecting PRISM subsystems",
    integration_type: "general",
  },
  "EXT-354": {
    filename: "PRISM_CAD_LEARNING_BRIDGE.js",
    source_dir: "extracted/integration/",
    category: "integration",
    lines: 304,
    safety_class: "LOW",
    description: "CAD-to-learning pipeline bridge for geometry-driven optimization",
    integration_type: "general",
  },
  "EXT-355": {
    filename: "PRISM_CALCULATOR_ENHANCEMENT_BRIDGE.js",
    source_dir: "extracted/integration/",
    category: "integration",
    lines: 83,
    safety_class: "LOW",
    description: "Calculator enhancement bridge for parameter computation",
    integration_type: "general",
  },
  "EXT-356": {
    filename: "PRISM_DATABASE_HUB.js",
    source_dir: "extracted/integration/",
    category: "integration",
    lines: 77,
    safety_class: "LOW",
    description: "Central database hub for cross-module data access",
    integration_type: "general",
  },
  "EXT-357": {
    filename: "PRISM_ENHANCED_INTEGRATION.js",
    source_dir: "extracted/integration/",
    category: "integration",
    lines: 476,
    safety_class: "LOW",
    description: "Enhanced integration module with extended connectivity features",
    integration_type: "general",
  },
  "EXT-358": {
    filename: "PRISM_EVENT_BRIDGE.js",
    source_dir: "extracted/integration/",
    category: "integration",
    lines: 74,
    safety_class: "LOW",
    description: "Event-driven bridge for real-time system notifications",
    integration_type: "general",
  },
  "EXT-359": {
    filename: "PRISM_FINAL_INTEGRATION.js",
    source_dir: "extracted/integration/",
    category: "integration",
    lines: 136,
    safety_class: "LOW",
    description: "Final integration assembly connecting all PRISM modules",
    integration_type: "general",
  },
  "EXT-360": {
    filename: "PRISM_HIGH_PRIORITY_INTEGRATION_BRIDGE.js",
    source_dir: "extracted/integration/",
    category: "integration",
    lines: 59,
    safety_class: "LOW",
    description: "High-priority integration bridge for critical-path data flows",
    integration_type: "general",
  },
  "EXT-361": {
    filename: "PRISM_KERNEL_INTEGRATION.js",
    source_dir: "extracted/integration/",
    category: "integration",
    lines: 101,
    safety_class: "LOW",
    description: "Kernel-level integration for core PRISM computation engine",
    integration_type: "general",
  },
  "EXT-362": {
    filename: "PRISM_PRODUCTION_INTEGRATION.js",
    source_dir: "extracted/integration/",
    category: "integration",
    lines: 205,
    safety_class: "LOW",
    description: "Production workflow integration for shop-floor data exchange",
    integration_type: "general",
  },
  "EXT-363": {
    filename: "PRISM_SIMULATION_INTEGRATION_BRIDGE.js",
    source_dir: "extracted/integration/",
    category: "integration",
    lines: 402,
    safety_class: "LOW",
    description: "Simulation integration bridge for virtual machining validation",
    integration_type: "general",
  },
};

/** Returns the source file catalog for ERP integration engine traceability. */
export function getSourceFileCatalog(): typeof INTEGRATION_SOURCE_FILE_CATALOG {
  return INTEGRATION_SOURCE_FILE_CATALOG;
}
