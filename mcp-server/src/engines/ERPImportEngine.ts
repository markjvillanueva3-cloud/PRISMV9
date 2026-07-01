/**
 * ERPImportEngine — Work Order Import from ERP Systems
 * =====================================================
 *
 * Imports work orders, BOMs, and routing data from external
 * ERP systems (SAP, Oracle, JobBOSS, E2, etc.)
 *
 * L2-P4-MS1/P0-U02 — Batch 3: ERP Bridge Engines
 *
 * @version 1.0.0
 */

import { z } from "zod";

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const ERPSystemSchema = z.enum(["sap", "oracle", "jobboss", "e2", "epicor", "infor", "custom"]);

export const WorkOrderImportSchema = z.object({
  erpSystem: ERPSystemSchema,
  workOrderNumber: z.string(),
  partNumber: z.string(),
  revision: z.string().default("A"),
  description: z.string(),
  customer: z.string(),
  quantityOrdered: z.number(),
  quantityComplete: z.number().default(0),
  dueDate: z.string(),
  releaseDate: z.string().optional(),
  priority: z.number().default(5),
  routing: z.array(z.object({
    operationNumber: z.number(),
    workCenter: z.string(),
    description: z.string(),
    setupHours: z.number(),
    runHoursPerUnit: z.number(),
    setupComplete: z.boolean().default(false),
    quantityComplete: z.number().default(0),
  })),
  bom: z.array(z.object({
    itemNumber: z.string(),
    description: z.string(),
    quantityPer: z.number(),
    unitOfMeasure: z.string(),
    issued: z.boolean().default(false),
  })).optional(),
  notes: z.string().optional(),
});

export const ImportResultSchema = z.object({
  success: z.boolean(),
  workOrderId: z.string(),
  erpReference: z.string(),
  operationsCreated: z.number(),
  bomItemsImported: z.number(),
  warnings: z.array(z.string()),
  errors: z.array(z.string()),
  importedAt: z.string(),
});

export const ImportBatchResultSchema = z.object({
  totalProcessed: z.number(),
  successful: z.number(),
  failed: z.number(),
  results: z.array(ImportResultSchema),
  duration: z.number(),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type ERPSystem = z.infer<typeof ERPSystemSchema>;
export type WorkOrderImport = z.infer<typeof WorkOrderImportSchema>;
export type ImportResult = z.infer<typeof ImportResultSchema>;
export type ImportBatchResult = z.infer<typeof ImportBatchResultSchema>;

// ─── Data Store ───────────────────────────────────────────────────────────────

const importedWorkOrders: Map<string, WorkOrderImport> = new Map();
let importCounter = 1;

// ─── Engine ───────────────────────────────────────────────────────────────────

export class ERPImportEngine {
  /**
   * Import a single work order from ERP
   * @param workOrder - Work order data from ERP
   * @returns Import result
   */
  static importWorkOrder(workOrder: WorkOrderImport): ImportResult {
    const validated = WorkOrderImportSchema.parse(workOrder);
    const warnings: string[] = [];
    const errors: string[] = [];

    // Validation checks
    if (validated.quantityOrdered <= 0) {
      errors.push("Quantity ordered must be greater than 0");
    }

    if (new Date(validated.dueDate) < new Date()) {
      warnings.push("Due date is in the past");
    }

    if (validated.routing.length === 0) {
      warnings.push("No routing operations defined");
    }

    // Check for duplicate
    const existingKey = `${validated.erpSystem}-${validated.workOrderNumber}`;
    if (importedWorkOrders.has(existingKey)) {
      warnings.push("Work order already imported - updating existing record");
    }

    if (errors.length > 0) {
      return {
        success: false,
        workOrderId: "",
        erpReference: validated.workOrderNumber,
        operationsCreated: 0,
        bomItemsImported: 0,
        warnings,
        errors,
        importedAt: new Date().toISOString(),
      };
    }

    const workOrderId = `WO-${++importCounter}`;
    importedWorkOrders.set(existingKey, validated);

    return {
      success: true,
      workOrderId,
      erpReference: validated.workOrderNumber,
      operationsCreated: validated.routing.length,
      bomItemsImported: validated.bom?.length || 0,
      warnings,
      errors,
      importedAt: new Date().toISOString(),
    };
  }

  /**
   * Import multiple work orders in batch
   * @param workOrders - Array of work orders
   * @returns Batch import results
   */
  static importBatch(workOrders: WorkOrderImport[]): ImportBatchResult {
    const startTime = Date.now();
    const results: ImportResult[] = [];
    let successful = 0;
    let failed = 0;

    for (const wo of workOrders) {
      const result = this.importWorkOrder(wo);
      results.push(result);
      if (result.success) successful++;
      else failed++;
    }

    return {
      totalProcessed: workOrders.length,
      successful,
      failed,
      results,
      duration: Date.now() - startTime,
    };
  }

  /**
   * Get imported work order by ERP reference
   * @param erpSystem - ERP system type
   * @param workOrderNumber - Work order number in ERP
   * @returns Work order or undefined
   */
  static getImportedWorkOrder(erpSystem: ERPSystem, workOrderNumber: string): WorkOrderImport | undefined {
    return importedWorkOrders.get(`${erpSystem}-${workOrderNumber}`);
  }

  /**
   * List all imported work orders
   * @param erpSystem - Optional filter by ERP system
   * @returns Array of imported work orders
   */
  static listImportedWorkOrders(erpSystem?: ERPSystem): WorkOrderImport[] {
    const all = Array.from(importedWorkOrders.entries());
    if (erpSystem) {
      // key is `${erpSystem}-${workOrderNumber}`; match on the "-" boundary so a
      // future ERP name that prefixes another (e.g. "job" vs "jobboss") can't cross-leak.
      return all.filter(([key]) => key.startsWith(`${erpSystem}-`)).map(([, wo]) => wo);
    }
    return all.map(([, wo]) => wo);
  }

  /**
   * Validate work order data before import
   * @param workOrder - Work order to validate
   * @returns Validation result
   */
  static validateWorkOrder(workOrder: unknown): { valid: boolean; errors: string[] } {
    try {
      WorkOrderImportSchema.parse(workOrder);
      return { valid: true, errors: [] };
    } catch (e) {
      const errors = e instanceof z.ZodError
        ? e.issues.map(err => `${err.path.join(".")}: ${err.message}`)
        : ["Unknown validation error"];
      return { valid: false, errors };
    }
  }

  /**
   * Get ERP field mappings for a system
   * @param erpSystem - ERP system type
   * @returns Field mapping configuration
   */
  static getFieldMappings(erpSystem: ERPSystem): Record<string, string> {
    const mappings: Record<ERPSystem, Record<string, string>> = {
      sap: {
        workOrderNumber: "AUFNR",
        partNumber: "MATNR",
        customer: "KUNNR",
        dueDate: "GLTRP",
        quantityOrdered: "GAMNG",
      },
      oracle: {
        workOrderNumber: "WIP_ENTITY_NAME",
        partNumber: "PRIMARY_ITEM_ID",
        customer: "CUSTOMER_NAME",
        dueDate: "SCHEDULED_COMPLETION_DATE",
        quantityOrdered: "START_QUANTITY",
      },
      jobboss: {
        workOrderNumber: "Job",
        partNumber: "Part_Number",
        customer: "Customer",
        dueDate: "Due_Date",
        quantityOrdered: "Order_Quantity",
      },
      e2: {
        workOrderNumber: "JobNo",
        partNumber: "PartNo",
        customer: "CustCode",
        dueDate: "DueDate",
        quantityOrdered: "QtyOrdered",
      },
      epicor: {
        workOrderNumber: "JobNum",
        partNumber: "PartNum",
        customer: "CustID",
        dueDate: "ReqDueDate",
        quantityOrdered: "ProdQty",
      },
      infor: {
        workOrderNumber: "ORDER_NO",
        partNumber: "ITEM_ID",
        customer: "CUSTOMER_ID",
        dueDate: "DUE_DATE",
        quantityOrdered: "QTY_ORDERED",
      },
      custom: {},
    };
    return mappings[erpSystem];
  }

  /**
   * Transform raw ERP data using field mappings
   * @param rawData - Raw data from ERP
   * @param erpSystem - ERP system type
   * @returns Transformed work order data
   */
  static transformFromERP(rawData: Record<string, unknown>, erpSystem: ERPSystem): Partial<WorkOrderImport> {
    const mappings = this.getFieldMappings(erpSystem);
    const reverseMappings = Object.fromEntries(
      Object.entries(mappings).map(([k, v]) => [v, k])
    );

    const transformed: Record<string, unknown> = { erpSystem };
    for (const [erpField, value] of Object.entries(rawData)) {
      const prismField = reverseMappings[erpField];
      if (prismField) {
        transformed[prismField] = value;
      }
    }

    return transformed as Partial<WorkOrderImport>;
  }

  static getSelfAwareness() {
    return {
      name: "ERPImportEngine",
      version: "1.0.0",
      milestone: "L2-P4-MS1/P0-U02",
      capabilities: ["importWorkOrder", "importBatch", "getImportedWorkOrder", "listImportedWorkOrders", "validateWorkOrder", "getFieldMappings", "transformFromERP"],
      supportedSystems: ["sap", "oracle", "jobboss", "e2", "epicor", "infor", "custom"],
      dependencies: [],
    };
  }
}

export const erpImportEngine = new ERPImportEngine();
