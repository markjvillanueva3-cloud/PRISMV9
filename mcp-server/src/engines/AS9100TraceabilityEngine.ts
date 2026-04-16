/**
 * AS9100TraceabilityEngine — Aerospace Traceability Chain (P0-CRITICAL)
 * ======================================================================
 * Full traceability from raw material to final part per AS9100D requirements.
 * Implements clauses 8.5.2 (Identification and traceability), 8.6 (Release of
 * products and services), and 7.5 (Documented information).
 *
 * Methods:
 *  - createRecord        — Create a new traceability record for a part
 *  - updateMaterial      — Add/update material traceability data
 *  - addOperation        — Add a machining operation to the chain
 *  - addInspection       — Add inspection results to an operation or final
 *  - addDocument         — Link a document to the traceability record
 *  - getTraceability     — Full traceability query by part/serial
 *  - findAffectedParts   — Recall query: find all parts from a material lot
 *  - getProcessHistory   — Full process history for a part
 *  - generateCofC        — Generate Certificate of Conformance
 *  - validateChain       — Validate traceability chain completeness
 *  - auditReport         — Generate AS9100 audit report
 *
 * @version 1.0.0
 * @shortcode E2100
 * @as9100d 8.5.2, 8.6, 7.5
 */

import { persistenceBridge } from "../db/PersistenceBridge.js";
import { qualityManagementEngine, type FAIRecord } from "./QualityManagementEngine.js";
import { randomUUID } from "crypto";

// ============================================================================
// TYPES — Full Traceability Chain
// ============================================================================

/** Tool usage record for traceability */
export interface ToolUsage {
  toolId: string;
  description: string;
  insertType?: string;
  insertGrade?: string;
  toolLife_min?: number;
  toolLifeUsed_min?: number;
  changeReason?: "worn" | "broken" | "scheduled" | "new_setup";
}

/** Individual inspection measurement */
export interface InspectionMeasurement {
  characteristicId: string;
  description: string;
  nominal: number;
  tolerancePlus: number;
  toleranceMinus: number;
  actual: number;
  unit: string;
  inSpec: boolean;
  gageId?: string;
  gageCalDate?: string;
}

/** Inspection record within an operation */
export interface InspectionRecord {
  inspectionId: string;
  type: "in-process" | "setup" | "tool-change" | "periodic";
  timestamp: string;
  inspectorId: string;
  measurements: InspectionMeasurement[];
  allInSpec: boolean;
  notes?: string;
}

/** Inspection result for final/FAI inspections */
export interface InspectionResult {
  characteristicId: string;
  description: string;
  nominal: number;
  tolerancePlus: number;
  toleranceMinus: number;
  actual: number;
  unit: string;
  inSpec: boolean;
  measurementMethod: string;
  gageId?: string;
  serialNumber?: string;
  uncertainty?: number;
}

/** Full inspection block in traceability record */
export interface TraceabilityInspection {
  inspectionId: string;
  type: "FAI" | "in-process" | "final";
  inspectionDate: string;
  inspectorId: string;
  results: InspectionResult[];
  disposition: "accept" | "reject" | "MRB" | "conditional";
  ncrId?: string;
  mrbNumber?: string;
  notes?: string;
  documentRefs: string[];
}

/** Operation record in the traceability chain */
export interface TraceabilityOperation {
  sequence: number;
  operationId: string;
  operationName: string;
  machineId: string;
  machineName?: string;
  programId: string;
  programVersion: string;
  programChecksum?: string;
  aiModelVersion?: string;
  aiGenerationId?: string;
  operatorId: string;
  operatorName?: string;
  startTime: string;
  endTime: string;
  setupSheet: string;
  setupSheetRevision?: string;
  toolList: ToolUsage[];
  inspectionResults: InspectionRecord[];
  cycleTime_min?: number;
  coolant?: string;
  fixtureId?: string;
  notes?: string;
}

/** Document reference in traceability */
export interface TraceabilityDocument {
  documentId: string;
  type: "drawing" | "mill-cert" | "chem-cert" | "FAI-report" | "NCR" | "MRB" |
        "setup-sheet" | "work-instruction" | "inspection-report" | "CofC" |
        "packing-slip" | "photo" | "other";
  title: string;
  revision: string;
  path: string;
  uploadedAt: string;
  uploadedBy: string;
  checksum?: string;
}

/** Material traceability block */
export interface MaterialTraceability {
  specification: string;      // AMS 5643, ASTM A681, etc.
  materialName: string;       // 17-4 PH, D2, etc.
  heatLot: string;
  millCert: string;           // path to mill certificate
  millCertId?: string;
  chemAnalysis?: string;      // path to chem cert
  chemCertId?: string;
  supplierId: string;
  supplierName: string;
  poNumber?: string;
  receivedDate: string;
  expiryDate?: string;
  form?: string;              // bar, plate, forging, etc.
  condition?: string;         // annealed, hardened, etc.
  hardness?: string;          // e.g., "28-32 HRC"
  verified: boolean;
  verifiedBy?: string;
  verifiedDate?: string;
  pmiPerformed?: boolean;
  pmiResult?: "pass" | "fail";
}

/** Full traceability record per AS9100D */
export interface TraceabilityRecord {
  recordId: string;
  partNumber: string;
  partRevision: string;
  serialNumber: string;
  workOrderId: string;
  jobId?: string;
  customerId?: string;
  customerName?: string;
  customerPO?: string;
  quantity: number;

  // Material traceability (AS9100D 8.5.2)
  material: MaterialTraceability;

  // Process traceability (AS9100D 8.5.1)
  operations: TraceabilityOperation[];

  // Quality traceability (AS9100D 8.6)
  inspections: TraceabilityInspection[];

  // Document traceability (AS9100D 7.5)
  documents: TraceabilityDocument[];

  // Status tracking
  status: "in-progress" | "pending-inspection" | "pending-release" | "released" | "shipped" | "rejected" | "on-hold";
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  releasedAt?: string;
  releasedBy?: string;
  shippedAt?: string;
  shippedTo?: string;

  // Chain validation
  chainComplete: boolean;
  chainValidatedAt?: string;
  chainGaps: string[];
}

/** Certificate of Conformance */
export interface CertificateOfConformance {
  cofcId: string;
  recordId: string;
  partNumber: string;
  partRevision: string;
  serialNumbers: string[];
  workOrderId: string;
  customerId: string;
  customerName: string;
  customerPO: string;
  quantity: number;

  // Material certification
  materialSpec: string;
  materialHeatLot: string;
  millCertRef: string;

  // Process certification
  operationCount: number;
  allOperationsComplete: boolean;

  // Inspection certification
  faiComplete: boolean;
  faiReportRef?: string;
  finalInspectionComplete: boolean;
  finalInspectionDate?: string;
  allDimensionsConforming: boolean;

  // Conformance statement
  conformanceStatement: string;
  specialProcesses: { process: string; certRef: string; nadcapNumber?: string }[];

  // Signatures
  qcInspector: { name: string; date: string; signature?: string };
  qualityManager?: { name: string; date: string; signature?: string };

  // Document references
  attachedDocuments: string[];

  generatedAt: string;
  generatedBy: string;
}

/** Chain validation result */
export interface ChainValidationResult {
  recordId: string;
  partNumber: string;
  serialNumber: string;
  valid: boolean;
  score: number;  // 0-100
  checks: {
    check: string;
    clause: string;
    status: "pass" | "fail" | "warning" | "not-applicable";
    detail: string;
  }[];
  gaps: string[];
  recommendations: string[];
  complianceStatus: "COMPLIANT" | "NON_CONFORMANT" | "INCOMPLETE";
}

/** Audit report result */
export interface AS9100AuditResult {
  auditId: string;
  auditDate: string;
  auditorId: string;
  dateRange: { start: string; end: string };

  summary: {
    totalRecords: number;
    compliantRecords: number;
    nonConformantRecords: number;
    incompleteRecords: number;
    complianceRate: number;
  };

  clauseCompliance: {
    clause: string;
    title: string;
    compliantCount: number;
    totalCount: number;
    rate: number;
    findings: string[];
  }[];

  findings: {
    severity: "critical" | "major" | "minor" | "observation";
    clause: string;
    description: string;
    affectedRecords: string[];
    correctiveAction: string;
  }[];

  materialTraceability: {
    totalMaterials: number;
    expiredCerts: string[];
    missingCerts: string[];
    unverifiedMaterials: string[];
  };

  processTraceability: {
    operationsAudited: number;
    missingSetupSheets: number;
    missingInspections: number;
    undocumentedToolChanges: number;
  };
}

// ============================================================================
// AS9100D CLAUSE MAPPING
// ============================================================================

const AS9100D_CLAUSES = {
  "8.5.2": {
    title: "Identification and traceability",
    requirements: [
      "Identify outputs by suitable means throughout production",
      "Identify status of outputs with respect to monitoring and measurement",
      "Control unique identification when traceability is required",
      "Retain documented information for traceability",
    ],
  },
  "8.5.1": {
    title: "Control of production and service provision",
    requirements: [
      "Documented information defining characteristics of products",
      "Availability and use of suitable monitoring and measuring resources",
      "Implementation of monitoring and measurement activities",
      "Use of suitable infrastructure and environment",
      "Appointment of competent persons",
      "Validation of processes where output cannot be verified",
      "Implementation of actions to prevent human error",
      "Implementation of release, delivery, and post-delivery activities",
    ],
  },
  "8.6": {
    title: "Release of products and services",
    requirements: [
      "Planned arrangements satisfied before release to customer",
      "Documented information on release includes conformity evidence",
      "Traceability to persons authorizing release",
    ],
  },
  "7.5": {
    title: "Documented information",
    requirements: [
      "Documented information required by QMS",
      "Documented information determined necessary for QMS effectiveness",
      "Appropriate identification and description",
      "Appropriate format and media",
      "Review and approval for suitability and adequacy",
    ],
  },
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

class AS9100TraceabilityEngine {
  private records = new Map<string, TraceabilityRecord>();
  private byPartSerial = new Map<string, string>(); // "partNumber:serialNumber" -> recordId
  private byMaterialLot = new Map<string, Set<string>>(); // heatLot -> Set<recordId>
  private cofcs = new Map<string, CertificateOfConformance>();

  // ─────────────────────────────────────────────────────────────────────────
  // Record Management
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Create a new traceability record for a part.
   * @param params - Initial record parameters
   * @returns Created record
   */
  createRecord(params: {
    partNumber: string;
    partRevision: string;
    serialNumber: string;
    workOrderId: string;
    jobId?: string;
    customerId?: string;
    customerName?: string;
    customerPO?: string;
    quantity?: number;
    createdBy: string;
  }): TraceabilityRecord {
    const recordId = `TR-${Date.now()}-${randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    const record: TraceabilityRecord = {
      recordId,
      partNumber: params.partNumber,
      partRevision: params.partRevision,
      serialNumber: params.serialNumber,
      workOrderId: params.workOrderId,
      jobId: params.jobId,
      customerId: params.customerId,
      customerName: params.customerName,
      customerPO: params.customerPO,
      quantity: params.quantity ?? 1,
      material: {
        specification: "",
        materialName: "",
        heatLot: "",
        millCert: "",
        supplierId: "",
        supplierName: "",
        receivedDate: "",
        verified: false,
      },
      operations: [],
      inspections: [],
      documents: [],
      status: "in-progress",
      createdAt: now,
      createdBy: params.createdBy,
      updatedAt: now,
      updatedBy: params.createdBy,
      chainComplete: false,
      chainGaps: ["Material traceability not established"],
    };

    this.records.set(recordId, record);
    this.byPartSerial.set(`${params.partNumber}:${params.serialNumber}`, recordId);

    persistenceBridge.persist("as9100_traceability", recordId, record as any);

    return record;
  }

  /**
   * Update material traceability for a record.
   * @param recordId - Record ID
   * @param material - Material traceability data
   * @param updatedBy - User making the update
   * @returns Updated record
   */
  updateMaterial(
    recordId: string,
    material: Partial<MaterialTraceability>,
    updatedBy: string
  ): TraceabilityRecord {
    const record = this.records.get(recordId);
    if (!record) {
      throw new Error(`Traceability record ${recordId} not found`);
    }

    // Remove from old heat lot index if changing
    if (record.material.heatLot && material.heatLot && record.material.heatLot !== material.heatLot) {
      const oldSet = this.byMaterialLot.get(record.material.heatLot);
      if (oldSet) {
        oldSet.delete(recordId);
      }
    }

    // Update material
    Object.assign(record.material, material);
    record.updatedAt = new Date().toISOString();
    record.updatedBy = updatedBy;

    // Add to heat lot index
    if (record.material.heatLot) {
      if (!this.byMaterialLot.has(record.material.heatLot)) {
        this.byMaterialLot.set(record.material.heatLot, new Set());
      }
      this.byMaterialLot.get(record.material.heatLot)!.add(recordId);
    }

    // Re-validate chain
    this.validateChainInternal(record);

    persistenceBridge.persist("as9100_traceability", recordId, record as any);

    return record;
  }

  /**
   * Add an operation to the traceability chain.
   * @param recordId - Record ID
   * @param operation - Operation details
   * @param updatedBy - User making the update
   * @returns Updated record
   */
  addOperation(
    recordId: string,
    operation: Omit<TraceabilityOperation, "sequence">,
    updatedBy: string
  ): TraceabilityRecord {
    const record = this.records.get(recordId);
    if (!record) {
      throw new Error(`Traceability record ${recordId} not found`);
    }

    const sequence = record.operations.length + 1;
    const fullOperation: TraceabilityOperation = {
      ...operation,
      sequence,
    };

    record.operations.push(fullOperation);
    record.updatedAt = new Date().toISOString();
    record.updatedBy = updatedBy;

    // Re-validate chain
    this.validateChainInternal(record);

    persistenceBridge.persist("as9100_traceability", recordId, record as any);

    return record;
  }

  /**
   * Add inspection results to the traceability record.
   * @param recordId - Record ID
   * @param inspection - Inspection data
   * @param updatedBy - User making the update
   * @returns Updated record
   */
  addInspection(
    recordId: string,
    inspection: Omit<TraceabilityInspection, "inspectionId">,
    updatedBy: string
  ): TraceabilityRecord {
    const record = this.records.get(recordId);
    if (!record) {
      throw new Error(`Traceability record ${recordId} not found`);
    }

    const inspectionId = `INS-${Date.now()}-${randomUUID().slice(0, 6)}`;
    const fullInspection: TraceabilityInspection = {
      ...inspection,
      inspectionId,
    };

    record.inspections.push(fullInspection);
    record.updatedAt = new Date().toISOString();
    record.updatedBy = updatedBy;

    // Update status if FAI or final
    if (inspection.type === "FAI" || inspection.type === "final") {
      if (inspection.disposition === "accept") {
        record.status = "pending-release";
      } else if (inspection.disposition === "reject") {
        record.status = "rejected";
      } else if (inspection.disposition === "MRB") {
        record.status = "on-hold";
      }
    }

    // Re-validate chain
    this.validateChainInternal(record);

    persistenceBridge.persist("as9100_traceability", recordId, record as any);

    return record;
  }

  /**
   * Add a document to the traceability record.
   * @param recordId - Record ID
   * @param document - Document details
   * @param updatedBy - User making the update
   * @returns Updated record
   */
  addDocument(
    recordId: string,
    document: Omit<TraceabilityDocument, "documentId" | "uploadedAt">,
    updatedBy: string
  ): TraceabilityRecord {
    const record = this.records.get(recordId);
    if (!record) {
      throw new Error(`Traceability record ${recordId} not found`);
    }

    const documentId = `DOC-${Date.now()}-${randomUUID().slice(0, 6)}`;
    const fullDocument: TraceabilityDocument = {
      ...document,
      documentId,
      uploadedAt: new Date().toISOString(),
      uploadedBy: updatedBy,
    };

    record.documents.push(fullDocument);
    record.updatedAt = new Date().toISOString();
    record.updatedBy = updatedBy;

    // Re-validate chain
    this.validateChainInternal(record);

    persistenceBridge.persist("as9100_traceability", recordId, record as any);

    return record;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Traceability Queries
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Get full traceability for a part by part number and serial number.
   * @param partNumber - Part number
   * @param serialNumber - Serial number
   * @returns Full traceability record or null
   */
  getTraceability(partNumber: string, serialNumber: string): TraceabilityRecord | null {
    const key = `${partNumber}:${serialNumber}`;
    const recordId = this.byPartSerial.get(key);
    if (!recordId) return null;
    return this.records.get(recordId) ?? null;
  }

  /**
   * Get traceability record by ID.
   * @param recordId - Record ID
   * @returns Traceability record or null
   */
  getRecord(recordId: string): TraceabilityRecord | null {
    return this.records.get(recordId) ?? null;
  }

  /**
   * Find all parts affected by a material lot (recall query).
   * Critical for aerospace material recall scenarios.
   * @param heatLot - Material heat lot number
   * @returns Array of affected records
   */
  findAffectedParts(heatLot: string): {
    totalAffected: number;
    records: {
      recordId: string;
      partNumber: string;
      serialNumber: string;
      workOrderId: string;
      status: string;
      customerId?: string;
      customerName?: string;
      shippedTo?: string;
      shippedAt?: string;
    }[];
    byStatus: Record<string, number>;
    shippedParts: number;
    recommendations: string[];
  } {
    const recordIds = this.byMaterialLot.get(heatLot);
    if (!recordIds || recordIds.size === 0) {
      return {
        totalAffected: 0,
        records: [],
        byStatus: {},
        shippedParts: 0,
        recommendations: ["No parts found for this material lot"],
      };
    }

    const affected: {
      recordId: string;
      partNumber: string;
      serialNumber: string;
      workOrderId: string;
      status: string;
      customerId?: string;
      customerName?: string;
      shippedTo?: string;
      shippedAt?: string;
    }[] = [];

    const byStatus: Record<string, number> = {};
    let shippedParts = 0;

    for (const recordId of recordIds) {
      const record = this.records.get(recordId);
      if (!record) continue;

      affected.push({
        recordId: record.recordId,
        partNumber: record.partNumber,
        serialNumber: record.serialNumber,
        workOrderId: record.workOrderId,
        status: record.status,
        customerId: record.customerId,
        customerName: record.customerName,
        shippedTo: record.shippedTo,
        shippedAt: record.shippedAt,
      });

      byStatus[record.status] = (byStatus[record.status] || 0) + 1;
      if (record.status === "shipped") {
        shippedParts++;
      }
    }

    const recommendations: string[] = [];
    if (shippedParts > 0) {
      recommendations.push(`CRITICAL: ${shippedParts} parts already shipped - initiate customer notification`);
      recommendations.push("Prepare containment action for shipped parts");
    }
    if (byStatus["in-progress"]) {
      recommendations.push(`STOP production on ${byStatus["in-progress"]} in-progress parts`);
    }
    if (byStatus["pending-release"]) {
      recommendations.push(`HOLD release on ${byStatus["pending-release"]} parts pending investigation`);
    }

    return {
      totalAffected: affected.length,
      records: affected,
      byStatus,
      shippedParts,
      recommendations,
    };
  }

  /**
   * Get complete process history for a part.
   * @param partId - Part number, serial number, or record ID
   * @returns Process history details
   */
  getProcessHistory(partId: string): {
    found: boolean;
    recordId?: string;
    partNumber?: string;
    serialNumber?: string;
    material?: MaterialTraceability;
    operations: {
      sequence: number;
      operationId: string;
      operationName: string;
      machine: string;
      program: string;
      operator: string;
      startTime: string;
      endTime: string;
      duration_min: number;
      toolChanges: number;
      inspectionsPassed: number;
      inspectionsFailed: number;
    }[];
    totalCycleTime_min: number;
    totalOperations: number;
    timeline: { timestamp: string; event: string; details: string }[];
  } {
    // Try to find record by various IDs
    let record: TraceabilityRecord | undefined;

    // Try direct record ID
    record = this.records.get(partId);

    // Try part:serial format
    if (!record) {
      const parts = partId.split(":");
      if (parts.length === 2) {
        const key = `${parts[0]}:${parts[1]}`;
        const recordId = this.byPartSerial.get(key);
        if (recordId) record = this.records.get(recordId);
      }
    }

    // Try searching by part number (return first match)
    if (!record) {
      for (const r of this.records.values()) {
        if (r.partNumber === partId || r.serialNumber === partId) {
          record = r;
          break;
        }
      }
    }

    if (!record) {
      return {
        found: false,
        operations: [],
        totalCycleTime_min: 0,
        totalOperations: 0,
        timeline: [],
      };
    }

    const operations = record.operations.map(op => {
      const start = new Date(op.startTime).getTime();
      const end = new Date(op.endTime).getTime();
      const duration_min = (end - start) / 60000;

      const toolChanges = op.toolList.filter(t => t.changeReason).length;
      const inspectionsPassed = op.inspectionResults.filter(i => i.allInSpec).length;
      const inspectionsFailed = op.inspectionResults.filter(i => !i.allInSpec).length;

      return {
        sequence: op.sequence,
        operationId: op.operationId,
        operationName: op.operationName,
        machine: op.machineId,
        program: `${op.programId} v${op.programVersion}`,
        operator: op.operatorId,
        startTime: op.startTime,
        endTime: op.endTime,
        duration_min: Math.round(duration_min * 10) / 10,
        toolChanges,
        inspectionsPassed,
        inspectionsFailed,
      };
    });

    const totalCycleTime_min = operations.reduce((sum, op) => sum + op.duration_min, 0);

    // Build timeline
    const timeline: { timestamp: string; event: string; details: string }[] = [];
    timeline.push({ timestamp: record.createdAt, event: "Record Created", details: `Created by ${record.createdBy}` });

    if (record.material.receivedDate) {
      timeline.push({
        timestamp: record.material.receivedDate,
        event: "Material Received",
        details: `${record.material.materialName} Heat Lot: ${record.material.heatLot}`
      });
    }

    for (const op of record.operations) {
      timeline.push({ timestamp: op.startTime, event: `Op ${op.sequence} Start`, details: `${op.operationName} on ${op.machineId}` });
      timeline.push({ timestamp: op.endTime, event: `Op ${op.sequence} Complete`, details: `Operator: ${op.operatorId}` });
    }

    for (const insp of record.inspections) {
      timeline.push({
        timestamp: insp.inspectionDate,
        event: `${insp.type} Inspection`,
        details: `Disposition: ${insp.disposition}`
      });
    }

    if (record.releasedAt) {
      timeline.push({ timestamp: record.releasedAt, event: "Released", details: `Released by ${record.releasedBy}` });
    }
    if (record.shippedAt) {
      timeline.push({ timestamp: record.shippedAt, event: "Shipped", details: `Shipped to ${record.shippedTo}` });
    }

    timeline.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    return {
      found: true,
      recordId: record.recordId,
      partNumber: record.partNumber,
      serialNumber: record.serialNumber,
      material: record.material,
      operations,
      totalCycleTime_min: Math.round(totalCycleTime_min * 10) / 10,
      totalOperations: operations.length,
      timeline,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Certificate of Conformance
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Generate Certificate of Conformance for a part.
   * @param recordId - Record ID
   * @param params - Additional CofC parameters
   * @returns Generated CofC
   */
  generateCofC(
    recordId: string,
    params: {
      qcInspector: { name: string; date: string };
      qualityManager?: { name: string; date: string };
      specialProcesses?: { process: string; certRef: string; nadcapNumber?: string }[];
      generatedBy: string;
    }
  ): CertificateOfConformance {
    const record = this.records.get(recordId);
    if (!record) {
      throw new Error(`Traceability record ${recordId} not found`);
    }

    // Validate record is ready for CofC
    const validation = this.validateChain(recordId);
    if (!validation.valid) {
      throw new Error(`Cannot generate CofC - traceability chain incomplete: ${validation.gaps.join(", ")}`);
    }

    // Check for FAI
    const faiInspection = record.inspections.find(i => i.type === "FAI");
    const finalInspection = record.inspections.find(i => i.type === "final");

    // Determine conformance
    const allOperationsComplete = record.operations.length > 0;
    const allDimensionsConforming = record.inspections
      .filter(i => i.type === "FAI" || i.type === "final")
      .every(i => i.disposition === "accept");

    const conformanceStatement = allDimensionsConforming
      ? `The parts identified above have been manufactured and inspected in accordance with ${record.partNumber} Rev ${record.partRevision} and conform to all specified requirements.`
      : `CONDITIONAL: Parts require review - see attached documentation.`;

    const cofcId = `COFC-${Date.now()}-${randomUUID().slice(0, 6)}`;

    const cofc: CertificateOfConformance = {
      cofcId,
      recordId: record.recordId,
      partNumber: record.partNumber,
      partRevision: record.partRevision,
      serialNumbers: [record.serialNumber],
      workOrderId: record.workOrderId,
      customerId: record.customerId || "",
      customerName: record.customerName || "",
      customerPO: record.customerPO || "",
      quantity: record.quantity,

      materialSpec: record.material.specification,
      materialHeatLot: record.material.heatLot,
      millCertRef: record.material.millCert,

      operationCount: record.operations.length,
      allOperationsComplete,

      faiComplete: !!faiInspection && faiInspection.disposition === "accept",
      faiReportRef: faiInspection?.documentRefs[0],
      finalInspectionComplete: !!finalInspection,
      finalInspectionDate: finalInspection?.inspectionDate,
      allDimensionsConforming,

      conformanceStatement,
      specialProcesses: params.specialProcesses || [],

      qcInspector: params.qcInspector,
      qualityManager: params.qualityManager,

      attachedDocuments: record.documents.map(d => d.path),

      generatedAt: new Date().toISOString(),
      generatedBy: params.generatedBy,
    };

    this.cofcs.set(cofcId, cofc);

    // Add CofC document reference to record
    this.addDocument(recordId, {
      type: "CofC",
      title: `Certificate of Conformance - ${record.partNumber}`,
      revision: "A",
      path: `documents/cofc/${cofcId}.pdf`,
      uploadedBy: params.generatedBy,
    }, params.generatedBy);

    // Update record status to released
    record.status = "released";
    record.releasedAt = new Date().toISOString();
    record.releasedBy = params.generatedBy;
    record.updatedAt = new Date().toISOString();
    record.updatedBy = params.generatedBy;

    persistenceBridge.persist("as9100_traceability", recordId, record as any);
    persistenceBridge.persist("as9100_cofc", cofcId, cofc as any);

    return cofc;
  }

  /**
   * Get Certificate of Conformance by ID.
   * @param cofcId - CofC ID
   * @returns CofC or null
   */
  getCofC(cofcId: string): CertificateOfConformance | null {
    return this.cofcs.get(cofcId) ?? null;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Chain Validation
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Validate traceability chain completeness per AS9100D.
   * @param recordId - Record ID
   * @returns Validation result
   */
  validateChain(recordId: string): ChainValidationResult {
    const record = this.records.get(recordId);
    if (!record) {
      return {
        recordId,
        partNumber: "",
        serialNumber: "",
        valid: false,
        score: 0,
        checks: [{ check: "Record exists", clause: "7.5", status: "fail", detail: "Record not found" }],
        gaps: ["Record not found"],
        recommendations: ["Create traceability record"],
        complianceStatus: "NON_CONFORMANT",
      };
    }

    return this.validateChainInternal(record);
  }

  private validateChainInternal(record: TraceabilityRecord): ChainValidationResult {
    const checks: ChainValidationResult["checks"] = [];
    const gaps: string[] = [];
    const recommendations: string[] = [];

    // AS9100D 8.5.2 - Material traceability
    if (!record.material.specification) {
      checks.push({ check: "Material specification", clause: "8.5.2", status: "fail", detail: "Material spec not defined" });
      gaps.push("Material specification missing");
    } else {
      checks.push({ check: "Material specification", clause: "8.5.2", status: "pass", detail: record.material.specification });
    }

    if (!record.material.heatLot) {
      checks.push({ check: "Heat lot tracking", clause: "8.5.2", status: "fail", detail: "Heat lot not recorded" });
      gaps.push("Heat lot tracking missing");
    } else {
      checks.push({ check: "Heat lot tracking", clause: "8.5.2", status: "pass", detail: `Heat lot: ${record.material.heatLot}` });
    }

    if (!record.material.millCert) {
      checks.push({ check: "Mill certificate", clause: "8.5.2", status: "fail", detail: "Mill cert not attached" });
      gaps.push("Mill certificate missing");
      recommendations.push("Attach mill certificate document");
    } else {
      checks.push({ check: "Mill certificate", clause: "8.5.2", status: "pass", detail: "Mill cert on file" });
    }

    if (!record.material.verified) {
      checks.push({ check: "Material verification", clause: "8.5.2", status: "warning", detail: "Material not verified" });
      recommendations.push("Perform positive material identification (PMI)");
    } else {
      checks.push({ check: "Material verification", clause: "8.5.2", status: "pass", detail: `Verified by ${record.material.verifiedBy}` });
    }

    // AS9100D 8.5.1 - Process traceability
    if (record.operations.length === 0) {
      checks.push({ check: "Operation records", clause: "8.5.1", status: "fail", detail: "No operations recorded" });
      gaps.push("No operation records");
    } else {
      checks.push({ check: "Operation records", clause: "8.5.1", status: "pass", detail: `${record.operations.length} operations recorded` });

      // Check each operation
      for (const op of record.operations) {
        if (!op.setupSheet) {
          checks.push({ check: `Op ${op.sequence} setup sheet`, clause: "8.5.1", status: "warning", detail: "Setup sheet missing" });
          recommendations.push(`Attach setup sheet for operation ${op.sequence}`);
        }
        if (!op.operatorId) {
          checks.push({ check: `Op ${op.sequence} operator`, clause: "8.5.1", status: "fail", detail: "Operator not recorded" });
          gaps.push(`Operator missing for operation ${op.sequence}`);
        }
        if (!op.programId || !op.programVersion) {
          checks.push({ check: `Op ${op.sequence} program`, clause: "8.5.1", status: "fail", detail: "Program not recorded" });
          gaps.push(`Program traceability missing for operation ${op.sequence}`);
        }
      }
    }

    // AS9100D 8.6 - Inspection and release
    const hasFAI = record.inspections.some(i => i.type === "FAI");
    const hasFinal = record.inspections.some(i => i.type === "final");

    if (!hasFAI) {
      checks.push({ check: "First Article Inspection", clause: "8.6", status: "fail", detail: "FAI not performed" });
      gaps.push("FAI not performed");
      recommendations.push("Complete First Article Inspection per AS9102");
    } else {
      const fai = record.inspections.find(i => i.type === "FAI")!;
      if (fai.disposition === "accept") {
        checks.push({ check: "First Article Inspection", clause: "8.6", status: "pass", detail: "FAI accepted" });
      } else {
        checks.push({ check: "First Article Inspection", clause: "8.6", status: "warning", detail: `FAI disposition: ${fai.disposition}` });
      }
    }

    if (!hasFinal && record.status !== "in-progress") {
      checks.push({ check: "Final inspection", clause: "8.6", status: "warning", detail: "Final inspection not recorded" });
      recommendations.push("Complete final inspection before release");
    } else if (hasFinal) {
      checks.push({ check: "Final inspection", clause: "8.6", status: "pass", detail: "Final inspection complete" });
    } else {
      checks.push({ check: "Final inspection", clause: "8.6", status: "not-applicable", detail: "Work in progress" });
    }

    // AS9100D 7.5 - Documentation
    const hasDrawing = record.documents.some(d => d.type === "drawing");
    if (!hasDrawing) {
      checks.push({ check: "Drawing on file", clause: "7.5", status: "warning", detail: "Drawing not attached" });
      recommendations.push("Attach drawing with revision");
    } else {
      const drawing = record.documents.find(d => d.type === "drawing")!;
      checks.push({ check: "Drawing on file", clause: "7.5", status: "pass", detail: `Drawing Rev ${drawing.revision}` });
    }

    // Calculate score
    const passCount = checks.filter(c => c.status === "pass").length;
    const warningCount = checks.filter(c => c.status === "warning").length;
    const failCount = checks.filter(c => c.status === "fail").length;
    const totalChecks = checks.filter(c => c.status !== "not-applicable").length;

    const score = totalChecks > 0
      ? Math.round(((passCount + warningCount * 0.5) / totalChecks) * 100)
      : 0;

    // Determine compliance status
    let complianceStatus: ChainValidationResult["complianceStatus"];
    if (failCount === 0 && gaps.length === 0) {
      complianceStatus = "COMPLIANT";
    } else if (failCount > 0) {
      complianceStatus = "NON_CONFORMANT";
    } else {
      complianceStatus = "INCOMPLETE";
    }

    // Update record
    record.chainComplete = gaps.length === 0;
    record.chainValidatedAt = new Date().toISOString();
    record.chainGaps = gaps;

    return {
      recordId: record.recordId,
      partNumber: record.partNumber,
      serialNumber: record.serialNumber,
      valid: gaps.length === 0,
      score,
      checks,
      gaps,
      recommendations,
      complianceStatus,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Audit Report
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Generate AS9100D audit report for a date range.
   * @param params - Audit parameters
   * @returns Audit report
   */
  auditReport(params: {
    startDate: string;
    endDate: string;
    auditorId: string;
  }): AS9100AuditResult {
    const auditId = `AUDIT-${Date.now()}-${randomUUID().slice(0, 6)}`;
    const startTime = new Date(params.startDate).getTime();
    const endTime = new Date(params.endDate).getTime();

    // Filter records in date range
    const recordsInRange: TraceabilityRecord[] = [];
    for (const record of this.records.values()) {
      const createdTime = new Date(record.createdAt).getTime();
      if (createdTime >= startTime && createdTime <= endTime) {
        recordsInRange.push(record);
      }
    }

    // Validate all records
    const validations = recordsInRange.map(r => this.validateChainInternal(r));

    const compliantRecords = validations.filter(v => v.complianceStatus === "COMPLIANT").length;
    const nonConformantRecords = validations.filter(v => v.complianceStatus === "NON_CONFORMANT").length;
    const incompleteRecords = validations.filter(v => v.complianceStatus === "INCOMPLETE").length;

    // Clause compliance analysis
    const clauseStats = new Map<string, { compliant: number; total: number; findings: string[] }>();
    for (const clause of Object.keys(AS9100D_CLAUSES)) {
      clauseStats.set(clause, { compliant: 0, total: 0, findings: [] });
    }

    for (const validation of validations) {
      for (const check of validation.checks) {
        if (check.status === "not-applicable") continue;

        const stats = clauseStats.get(check.clause);
        if (stats) {
          stats.total++;
          if (check.status === "pass") {
            stats.compliant++;
          } else {
            stats.findings.push(`${validation.partNumber}/${validation.serialNumber}: ${check.detail}`);
          }
        }
      }
    }

    const clauseCompliance = [...clauseStats.entries()].map(([clause, stats]) => ({
      clause,
      title: AS9100D_CLAUSES[clause as keyof typeof AS9100D_CLAUSES]?.title || clause,
      compliantCount: stats.compliant,
      totalCount: stats.total,
      rate: stats.total > 0 ? Math.round((stats.compliant / stats.total) * 100) : 100,
      findings: stats.findings.slice(0, 10), // Limit findings
    }));

    // Material traceability analysis
    const expiredCerts: string[] = [];
    const missingCerts: string[] = [];
    const unverifiedMaterials: string[] = [];

    for (const record of recordsInRange) {
      if (!record.material.millCert) {
        missingCerts.push(`${record.partNumber}/${record.serialNumber}`);
      }
      if (record.material.expiryDate && new Date(record.material.expiryDate) < new Date()) {
        expiredCerts.push(`${record.partNumber}/${record.serialNumber}: ${record.material.heatLot}`);
      }
      if (!record.material.verified) {
        unverifiedMaterials.push(`${record.partNumber}/${record.serialNumber}`);
      }
    }

    // Process traceability analysis
    let operationsAudited = 0;
    let missingSetupSheets = 0;
    let missingInspections = 0;
    let undocumentedToolChanges = 0;

    for (const record of recordsInRange) {
      for (const op of record.operations) {
        operationsAudited++;
        if (!op.setupSheet) missingSetupSheets++;
        if (op.inspectionResults.length === 0) missingInspections++;
        undocumentedToolChanges += op.toolList.filter(t => t.changeReason && !t.toolLife_min).length;
      }
    }

    // Generate findings
    const findings: AS9100AuditResult["findings"] = [];

    if (missingCerts.length > 0) {
      findings.push({
        severity: "critical",
        clause: "8.5.2",
        description: "Material certificates missing for parts",
        affectedRecords: missingCerts.slice(0, 20),
        correctiveAction: "Obtain and attach mill certificates for all affected parts",
      });
    }

    if (expiredCerts.length > 0) {
      findings.push({
        severity: "major",
        clause: "8.5.2",
        description: "Expired material certificates",
        affectedRecords: expiredCerts.slice(0, 20),
        correctiveAction: "Verify material is still within usable period or obtain renewed certification",
      });
    }

    if (nonConformantRecords > 0) {
      const affected = validations
        .filter(v => v.complianceStatus === "NON_CONFORMANT")
        .map(v => `${v.partNumber}/${v.serialNumber}`);
      findings.push({
        severity: "critical",
        clause: "8.5.2",
        description: "Incomplete traceability chains",
        affectedRecords: affected.slice(0, 20),
        correctiveAction: "Complete missing traceability elements for all affected parts",
      });
    }

    if (missingSetupSheets > 0) {
      findings.push({
        severity: "minor",
        clause: "8.5.1",
        description: `${missingSetupSheets} operations without setup sheets`,
        affectedRecords: [],
        correctiveAction: "Ensure setup sheets are attached to all operation records",
      });
    }

    return {
      auditId,
      auditDate: new Date().toISOString(),
      auditorId: params.auditorId,
      dateRange: { start: params.startDate, end: params.endDate },

      summary: {
        totalRecords: recordsInRange.length,
        compliantRecords,
        nonConformantRecords,
        incompleteRecords,
        complianceRate: recordsInRange.length > 0
          ? Math.round((compliantRecords / recordsInRange.length) * 100)
          : 100,
      },

      clauseCompliance,
      findings,

      materialTraceability: {
        totalMaterials: recordsInRange.length,
        expiredCerts,
        missingCerts,
        unverifiedMaterials,
      },

      processTraceability: {
        operationsAudited,
        missingSetupSheets,
        missingInspections,
        undocumentedToolChanges,
      },
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Integration with QualityManagementEngine
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Link an FAI from QualityManagementEngine to a traceability record.
   * @param recordId - Traceability record ID
   * @param faiId - FAI ID from QualityManagementEngine
   * @param updatedBy - User making the link
   * @returns Updated record
   */
  linkFAI(recordId: string, faiId: string, updatedBy: string): TraceabilityRecord {
    const record = this.records.get(recordId);
    if (!record) {
      throw new Error(`Traceability record ${recordId} not found`);
    }

    const fai = qualityManagementEngine.getFAI(faiId);
    if (!fai) {
      throw new Error(`FAI ${faiId} not found`);
    }

    // Convert FAI to TraceabilityInspection
    const results: InspectionResult[] = fai.characteristics.map(c => ({
      characteristicId: c.id,
      description: c.description,
      nominal: c.nominal,
      tolerancePlus: c.tolerance_plus,
      toleranceMinus: c.tolerance_minus,
      actual: c.actual,
      unit: c.unit,
      inSpec: c.in_spec,
      measurementMethod: c.tool_used,
      gageId: c.tool_used,
    }));

    const inspection: Omit<TraceabilityInspection, "inspectionId"> = {
      type: "FAI",
      inspectionDate: fai.inspection_date,
      inspectorId: fai.inspector,
      results,
      disposition: fai.overall_pass ? "accept" : "reject",
      documentRefs: [`FAI-${faiId}`],
      notes: fai.notes,
    };

    return this.addInspection(recordId, inspection, updatedBy);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Statistics
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Get traceability statistics.
   * @returns Statistics object
   */
  getStats(): {
    totalRecords: number;
    byStatus: Record<string, number>;
    chainCompleteCount: number;
    chainIncompleteCount: number;
    avgOperationsPerPart: number;
    totalOperations: number;
    totalInspections: number;
    totalDocuments: number;
    materialLotsTracked: number;
  } {
    const byStatus: Record<string, number> = {};
    let chainComplete = 0;
    let chainIncomplete = 0;
    let totalOps = 0;
    let totalInsp = 0;
    let totalDocs = 0;

    for (const record of this.records.values()) {
      byStatus[record.status] = (byStatus[record.status] || 0) + 1;
      if (record.chainComplete) {
        chainComplete++;
      } else {
        chainIncomplete++;
      }
      totalOps += record.operations.length;
      totalInsp += record.inspections.length;
      totalDocs += record.documents.length;
    }

    return {
      totalRecords: this.records.size,
      byStatus,
      chainCompleteCount: chainComplete,
      chainIncompleteCount: chainIncomplete,
      avgOperationsPerPart: this.records.size > 0 ? Math.round((totalOps / this.records.size) * 10) / 10 : 0,
      totalOperations: totalOps,
      totalInspections: totalInsp,
      totalDocuments: totalDocs,
      materialLotsTracked: this.byMaterialLot.size,
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const as9100TraceabilityEngine = new AS9100TraceabilityEngine();

// ─── Persistence Bridge Registration ────────────────────────────────────────
persistenceBridge.registerMap({
  entity: "as9100_traceability",
  getMap: () => (as9100TraceabilityEngine as any).records as Map<string, any>,
  keyField: "recordId",
});

persistenceBridge.registerMap({
  entity: "as9100_cofc",
  getMap: () => (as9100TraceabilityEngine as any).cofcs as Map<string, any>,
  keyField: "cofcId",
});
