/**
 * AS9100TraceabilityEngine — Test Suite
 * ======================================
 * Tests for aerospace traceability chain per AS9100D requirements.
 * Covers clauses 8.5.2, 8.5.1, 8.6, and 7.5.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  as9100TraceabilityEngine,
  type TraceabilityRecord,
  type MaterialTraceability,
  type TraceabilityOperation,
  type TraceabilityInspection,
  type InspectionResult,
  type TraceabilityDocument,
  type ChainValidationResult,
} from "../engines/AS9100TraceabilityEngine.js";

describe("AS9100TraceabilityEngine", () => {
  // Reset engine state before each test
  beforeEach(() => {
    // Access private maps to clear them
    const engine = as9100TraceabilityEngine as any;
    engine.records.clear();
    engine.byPartSerial.clear();
    engine.byMaterialLot.clear();
    engine.cofcs.clear();
  });

  // ────────────────────────────────────────────────────────────────────────
  // Record Creation Tests
  // ────────────────────────────────────────────────────────────────────────

  describe("createRecord()", () => {
    it("creates a new traceability record with required fields", () => {
      const record = as9100TraceabilityEngine.createRecord({
        partNumber: "PN-12345",
        partRevision: "A",
        serialNumber: "SN-001",
        workOrderId: "WO-2024-001",
        createdBy: "test-user",
      });

      expect(record.recordId).toMatch(/^TR-/);
      expect(record.partNumber).toBe("PN-12345");
      expect(record.partRevision).toBe("A");
      expect(record.serialNumber).toBe("SN-001");
      expect(record.workOrderId).toBe("WO-2024-001");
      expect(record.status).toBe("in-progress");
      expect(record.chainComplete).toBe(false);
    });

    it("creates record with optional customer information", () => {
      const record = as9100TraceabilityEngine.createRecord({
        partNumber: "PN-12345",
        partRevision: "B",
        serialNumber: "SN-002",
        workOrderId: "WO-2024-002",
        customerId: "CUST-001",
        customerName: "Boeing",
        customerPO: "PO-2024-500",
        quantity: 10,
        createdBy: "test-user",
      });

      expect(record.customerId).toBe("CUST-001");
      expect(record.customerName).toBe("Boeing");
      expect(record.customerPO).toBe("PO-2024-500");
      expect(record.quantity).toBe(10);
    });

    it("initializes with empty operations, inspections, and documents", () => {
      const record = as9100TraceabilityEngine.createRecord({
        partNumber: "PN-12345",
        partRevision: "A",
        serialNumber: "SN-003",
        workOrderId: "WO-2024-003",
        createdBy: "test-user",
      });

      expect(record.operations).toHaveLength(0);
      expect(record.inspections).toHaveLength(0);
      expect(record.documents).toHaveLength(0);
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // Material Traceability Tests (AS9100D 8.5.2)
  // ────────────────────────────────────────────────────────────────────────

  describe("updateMaterial() - AS9100D 8.5.2", () => {
    it("updates material traceability information", () => {
      const record = as9100TraceabilityEngine.createRecord({
        partNumber: "PN-AERO-001",
        partRevision: "A",
        serialNumber: "SN-100",
        workOrderId: "WO-100",
        createdBy: "test-user",
      });

      const updated = as9100TraceabilityEngine.updateMaterial(record.recordId, {
        specification: "AMS 5643",
        materialName: "17-4 PH",
        heatLot: "HT-2024-001",
        millCert: "docs/mill-certs/HT-2024-001.pdf",
        supplierId: "SUP-001",
        supplierName: "Alcoa",
        receivedDate: "2024-01-15",
        verified: true,
        verifiedBy: "qc-inspector-1",
        verifiedDate: "2024-01-16",
      }, "test-user");

      expect(updated.material.specification).toBe("AMS 5643");
      expect(updated.material.materialName).toBe("17-4 PH");
      expect(updated.material.heatLot).toBe("HT-2024-001");
      expect(updated.material.verified).toBe(true);
    });

    it("indexes records by heat lot for recall queries", () => {
      const record1 = as9100TraceabilityEngine.createRecord({
        partNumber: "PN-001",
        partRevision: "A",
        serialNumber: "SN-001",
        workOrderId: "WO-001",
        createdBy: "test-user",
      });

      const record2 = as9100TraceabilityEngine.createRecord({
        partNumber: "PN-002",
        partRevision: "A",
        serialNumber: "SN-002",
        workOrderId: "WO-002",
        createdBy: "test-user",
      });

      as9100TraceabilityEngine.updateMaterial(record1.recordId, {
        heatLot: "HT-RECALL-001",
        specification: "AMS 5643",
      }, "test-user");

      as9100TraceabilityEngine.updateMaterial(record2.recordId, {
        heatLot: "HT-RECALL-001",
        specification: "AMS 5643",
      }, "test-user");

      const affected = as9100TraceabilityEngine.findAffectedParts("HT-RECALL-001");

      expect(affected.totalAffected).toBe(2);
      expect(affected.records).toHaveLength(2);
    });

    it("throws error for non-existent record", () => {
      expect(() => {
        as9100TraceabilityEngine.updateMaterial("INVALID-ID", {
          specification: "AMS 5643",
        }, "test-user");
      }).toThrow("Traceability record INVALID-ID not found");
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // Operation Traceability Tests (AS9100D 8.5.1)
  // ────────────────────────────────────────────────────────────────────────

  describe("addOperation() - AS9100D 8.5.1", () => {
    it("adds operation with full traceability", () => {
      const record = as9100TraceabilityEngine.createRecord({
        partNumber: "PN-AERO-002",
        partRevision: "A",
        serialNumber: "SN-200",
        workOrderId: "WO-200",
        createdBy: "test-user",
      });

      const updated = as9100TraceabilityEngine.addOperation(record.recordId, {
        operationId: "OP-10",
        operationName: "Rough Turn OD",
        machineId: "LATHE-001",
        machineName: "Okuma LB3000",
        programId: "O1234",
        programVersion: "1.2.0",
        programChecksum: "abc123",
        operatorId: "OP-JOHN",
        operatorName: "John Smith",
        startTime: "2024-01-20T08:00:00Z",
        endTime: "2024-01-20T10:30:00Z",
        setupSheet: "docs/setup/PN-AERO-002-OP10.pdf",
        setupSheetRevision: "B",
        toolList: [
          { toolId: "T1", description: "CNMG 432", insertType: "CNMG", insertGrade: "KC720" },
          { toolId: "T2", description: "DNMG 332", insertType: "DNMG", insertGrade: "KC5010" },
        ],
        inspectionResults: [],
        cycleTime_min: 150,
        coolant: "TRIM SC620",
        fixtureId: "FIX-001",
      }, "test-user");

      expect(updated.operations).toHaveLength(1);
      expect(updated.operations[0].sequence).toBe(1);
      expect(updated.operations[0].operationId).toBe("OP-10");
      expect(updated.operations[0].programId).toBe("O1234");
      expect(updated.operations[0].toolList).toHaveLength(2);
    });

    it("auto-increments operation sequence", () => {
      const record = as9100TraceabilityEngine.createRecord({
        partNumber: "PN-AERO-003",
        partRevision: "A",
        serialNumber: "SN-300",
        workOrderId: "WO-300",
        createdBy: "test-user",
      });

      as9100TraceabilityEngine.addOperation(record.recordId, {
        operationId: "OP-10",
        operationName: "Op 10",
        machineId: "LATHE-001",
        programId: "O1000",
        programVersion: "1.0",
        operatorId: "OP-001",
        startTime: "2024-01-20T08:00:00Z",
        endTime: "2024-01-20T09:00:00Z",
        setupSheet: "setup1.pdf",
        toolList: [],
        inspectionResults: [],
      }, "test-user");

      as9100TraceabilityEngine.addOperation(record.recordId, {
        operationId: "OP-20",
        operationName: "Op 20",
        machineId: "MILL-001",
        programId: "O2000",
        programVersion: "1.0",
        operatorId: "OP-002",
        startTime: "2024-01-20T10:00:00Z",
        endTime: "2024-01-20T11:00:00Z",
        setupSheet: "setup2.pdf",
        toolList: [],
        inspectionResults: [],
      }, "test-user");

      const finalRecord = as9100TraceabilityEngine.getRecord(record.recordId)!;
      expect(finalRecord.operations).toHaveLength(2);
      expect(finalRecord.operations[0].sequence).toBe(1);
      expect(finalRecord.operations[1].sequence).toBe(2);
    });

    it("tracks AI-generated programs", () => {
      const record = as9100TraceabilityEngine.createRecord({
        partNumber: "PN-AI-001",
        partRevision: "A",
        serialNumber: "SN-AI-001",
        workOrderId: "WO-AI-001",
        createdBy: "test-user",
      });

      as9100TraceabilityEngine.addOperation(record.recordId, {
        operationId: "OP-10",
        operationName: "AI Generated Toolpath",
        machineId: "5AXIS-001",
        programId: "O5000",
        programVersion: "2.0.0",
        aiModelVersion: "PRISM-CAM-v3.2.1",
        aiGenerationId: "GEN-2024-001",
        operatorId: "OP-001",
        startTime: "2024-01-20T08:00:00Z",
        endTime: "2024-01-20T12:00:00Z",
        setupSheet: "setup-ai.pdf",
        toolList: [],
        inspectionResults: [],
      }, "test-user");

      const finalRecord = as9100TraceabilityEngine.getRecord(record.recordId)!;
      expect(finalRecord.operations[0].aiModelVersion).toBe("PRISM-CAM-v3.2.1");
      expect(finalRecord.operations[0].aiGenerationId).toBe("GEN-2024-001");
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // Inspection Traceability Tests (AS9100D 8.6)
  // ────────────────────────────────────────────────────────────────────────

  describe("addInspection() - AS9100D 8.6", () => {
    it("adds FAI with full inspection results", () => {
      const record = as9100TraceabilityEngine.createRecord({
        partNumber: "PN-FAI-001",
        partRevision: "A",
        serialNumber: "SN-FAI-001",
        workOrderId: "WO-FAI-001",
        createdBy: "test-user",
      });

      const results: InspectionResult[] = [
        {
          characteristicId: "DIM-001",
          description: "OD",
          nominal: 25.0,
          tolerancePlus: 0.01,
          toleranceMinus: 0.01,
          actual: 25.005,
          unit: "mm",
          inSpec: true,
          measurementMethod: "CMM",
          gageId: "CMM-001",
        },
        {
          characteristicId: "DIM-002",
          description: "Length",
          nominal: 100.0,
          tolerancePlus: 0.05,
          toleranceMinus: 0.05,
          actual: 100.02,
          unit: "mm",
          inSpec: true,
          measurementMethod: "CMM",
          gageId: "CMM-001",
        },
      ];

      const updated = as9100TraceabilityEngine.addInspection(record.recordId, {
        type: "FAI",
        inspectionDate: "2024-01-21T10:00:00Z",
        inspectorId: "QC-001",
        results,
        disposition: "accept",
        documentRefs: ["FAI-REPORT-001.pdf"],
        notes: "All dimensions within tolerance",
      }, "test-user");

      expect(updated.inspections).toHaveLength(1);
      expect(updated.inspections[0].type).toBe("FAI");
      expect(updated.inspections[0].results).toHaveLength(2);
      expect(updated.inspections[0].disposition).toBe("accept");
      expect(updated.status).toBe("pending-release");
    });

    it("updates status to rejected on failed inspection", () => {
      const record = as9100TraceabilityEngine.createRecord({
        partNumber: "PN-REJ-001",
        partRevision: "A",
        serialNumber: "SN-REJ-001",
        workOrderId: "WO-REJ-001",
        createdBy: "test-user",
      });

      as9100TraceabilityEngine.addInspection(record.recordId, {
        type: "final",
        inspectionDate: "2024-01-21T10:00:00Z",
        inspectorId: "QC-001",
        results: [
          {
            characteristicId: "DIM-001",
            description: "OD",
            nominal: 25.0,
            tolerancePlus: 0.01,
            toleranceMinus: 0.01,
            actual: 25.05, // Out of spec
            unit: "mm",
            inSpec: false,
            measurementMethod: "CMM",
          },
        ],
        disposition: "reject",
        ncrId: "NCR-2024-001",
        documentRefs: [],
      }, "test-user");

      const finalRecord = as9100TraceabilityEngine.getRecord(record.recordId)!;
      expect(finalRecord.status).toBe("rejected");
    });

    it("updates status to on-hold for MRB disposition", () => {
      const record = as9100TraceabilityEngine.createRecord({
        partNumber: "PN-MRB-001",
        partRevision: "A",
        serialNumber: "SN-MRB-001",
        workOrderId: "WO-MRB-001",
        createdBy: "test-user",
      });

      as9100TraceabilityEngine.addInspection(record.recordId, {
        type: "final",
        inspectionDate: "2024-01-21T10:00:00Z",
        inspectorId: "QC-001",
        results: [],
        disposition: "MRB",
        mrbNumber: "MRB-2024-001",
        documentRefs: [],
      }, "test-user");

      const finalRecord = as9100TraceabilityEngine.getRecord(record.recordId)!;
      expect(finalRecord.status).toBe("on-hold");
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // Document Traceability Tests (AS9100D 7.5)
  // ────────────────────────────────────────────────────────────────────────

  describe("addDocument() - AS9100D 7.5", () => {
    it("adds document with full traceability", () => {
      const record = as9100TraceabilityEngine.createRecord({
        partNumber: "PN-DOC-001",
        partRevision: "A",
        serialNumber: "SN-DOC-001",
        workOrderId: "WO-DOC-001",
        createdBy: "test-user",
      });

      as9100TraceabilityEngine.addDocument(record.recordId, {
        type: "drawing",
        title: "Part Drawing PN-DOC-001",
        revision: "C",
        path: "docs/drawings/PN-DOC-001-C.pdf",
        uploadedBy: "test-user",
        checksum: "sha256-abc123",
      }, "test-user");

      const finalRecord = as9100TraceabilityEngine.getRecord(record.recordId)!;
      expect(finalRecord.documents).toHaveLength(1);
      expect(finalRecord.documents[0].type).toBe("drawing");
      expect(finalRecord.documents[0].revision).toBe("C");
      expect(finalRecord.documents[0].documentId).toMatch(/^DOC-/);
    });

    it("supports multiple document types", () => {
      const record = as9100TraceabilityEngine.createRecord({
        partNumber: "PN-MULTI-001",
        partRevision: "A",
        serialNumber: "SN-MULTI-001",
        workOrderId: "WO-MULTI-001",
        createdBy: "test-user",
      });

      const docTypes: TraceabilityDocument["type"][] = [
        "drawing", "mill-cert", "chem-cert", "FAI-report", "setup-sheet"
      ];

      for (const type of docTypes) {
        as9100TraceabilityEngine.addDocument(record.recordId, {
          type,
          title: `${type} document`,
          revision: "A",
          path: `docs/${type}.pdf`,
          uploadedBy: "test-user",
        }, "test-user");
      }

      const finalRecord = as9100TraceabilityEngine.getRecord(record.recordId)!;
      expect(finalRecord.documents).toHaveLength(5);
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // Traceability Query Tests
  // ────────────────────────────────────────────────────────────────────────

  describe("getTraceability()", () => {
    it("retrieves record by part number and serial number", () => {
      as9100TraceabilityEngine.createRecord({
        partNumber: "PN-QUERY-001",
        partRevision: "A",
        serialNumber: "SN-QUERY-001",
        workOrderId: "WO-QUERY-001",
        createdBy: "test-user",
      });

      const result = as9100TraceabilityEngine.getTraceability("PN-QUERY-001", "SN-QUERY-001");

      expect(result).not.toBeNull();
      expect(result!.partNumber).toBe("PN-QUERY-001");
      expect(result!.serialNumber).toBe("SN-QUERY-001");
    });

    it("returns null for non-existent part", () => {
      const result = as9100TraceabilityEngine.getTraceability("NONEXISTENT", "NONEXISTENT");
      expect(result).toBeNull();
    });
  });

  describe("findAffectedParts() - Material Recall", () => {
    it("finds all parts from a material lot with status breakdown", () => {
      // Create multiple parts from same heat lot
      const record1 = as9100TraceabilityEngine.createRecord({
        partNumber: "PN-RECALL-001",
        partRevision: "A",
        serialNumber: "SN-R-001",
        workOrderId: "WO-R-001",
        createdBy: "test-user",
      });
      as9100TraceabilityEngine.updateMaterial(record1.recordId, { heatLot: "HT-DEFECT-001" }, "test-user");

      const record2 = as9100TraceabilityEngine.createRecord({
        partNumber: "PN-RECALL-002",
        partRevision: "A",
        serialNumber: "SN-R-002",
        workOrderId: "WO-R-002",
        customerId: "CUST-001",
        customerName: "Airbus",
        createdBy: "test-user",
      });
      as9100TraceabilityEngine.updateMaterial(record2.recordId, { heatLot: "HT-DEFECT-001" }, "test-user");

      // Update one to shipped
      const r2 = as9100TraceabilityEngine.getRecord(record2.recordId)!;
      r2.status = "shipped";
      r2.shippedAt = "2024-01-25T10:00:00Z";
      r2.shippedTo = "Airbus Toulouse";

      const affected = as9100TraceabilityEngine.findAffectedParts("HT-DEFECT-001");

      expect(affected.totalAffected).toBe(2);
      expect(affected.shippedParts).toBe(1);
      expect(affected.byStatus["in-progress"]).toBe(1);
      expect(affected.byStatus["shipped"]).toBe(1);
      expect(affected.recommendations.length).toBeGreaterThan(0);
      expect(affected.recommendations[0]).toContain("CRITICAL");
    });

    it("returns empty result for unknown heat lot", () => {
      const affected = as9100TraceabilityEngine.findAffectedParts("HT-UNKNOWN");
      expect(affected.totalAffected).toBe(0);
      expect(affected.records).toHaveLength(0);
    });
  });

  describe("getProcessHistory()", () => {
    it("returns complete process history with timeline", () => {
      const record = as9100TraceabilityEngine.createRecord({
        partNumber: "PN-HIST-001",
        partRevision: "A",
        serialNumber: "SN-HIST-001",
        workOrderId: "WO-HIST-001",
        createdBy: "test-user",
      });

      as9100TraceabilityEngine.updateMaterial(record.recordId, {
        materialName: "Inconel 718",
        heatLot: "HT-INC-001",
        receivedDate: "2024-01-10T08:00:00Z",
      }, "test-user");

      as9100TraceabilityEngine.addOperation(record.recordId, {
        operationId: "OP-10",
        operationName: "Rough Turn",
        machineId: "LATHE-001",
        programId: "O1000",
        programVersion: "1.0",
        operatorId: "OP-001",
        startTime: "2024-01-15T08:00:00Z",
        endTime: "2024-01-15T10:00:00Z",
        setupSheet: "setup.pdf",
        toolList: [{ toolId: "T1", description: "Tool 1" }],
        inspectionResults: [],
      }, "test-user");

      const history = as9100TraceabilityEngine.getProcessHistory(record.recordId);

      expect(history.found).toBe(true);
      expect(history.partNumber).toBe("PN-HIST-001");
      expect(history.operations).toHaveLength(1);
      expect(history.operations[0].duration_min).toBeCloseTo(120, 0);
      expect(history.timeline.length).toBeGreaterThan(0);
    });

    it("returns not found for invalid part ID", () => {
      const history = as9100TraceabilityEngine.getProcessHistory("INVALID-ID");
      expect(history.found).toBe(false);
      expect(history.operations).toHaveLength(0);
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // Chain Validation Tests
  // ────────────────────────────────────────────────────────────────────────

  describe("validateChain()", () => {
    it("validates incomplete chain with specific gaps", () => {
      const record = as9100TraceabilityEngine.createRecord({
        partNumber: "PN-VAL-001",
        partRevision: "A",
        serialNumber: "SN-VAL-001",
        workOrderId: "WO-VAL-001",
        createdBy: "test-user",
      });

      const validation = as9100TraceabilityEngine.validateChain(record.recordId);

      expect(validation.valid).toBe(false);
      expect(validation.complianceStatus).toBe("NON_CONFORMANT");
      expect(validation.gaps.length).toBeGreaterThan(0);
      expect(validation.gaps).toContain("Material specification missing");
      expect(validation.gaps).toContain("No operation records");
    });

    it("validates complete chain as COMPLIANT", () => {
      const record = as9100TraceabilityEngine.createRecord({
        partNumber: "PN-COMPLETE-001",
        partRevision: "A",
        serialNumber: "SN-COMPLETE-001",
        workOrderId: "WO-COMPLETE-001",
        createdBy: "test-user",
      });

      // Add full material traceability
      as9100TraceabilityEngine.updateMaterial(record.recordId, {
        specification: "AMS 5643",
        materialName: "17-4 PH",
        heatLot: "HT-COMP-001",
        millCert: "docs/mill-cert.pdf",
        supplierId: "SUP-001",
        supplierName: "Supplier",
        receivedDate: "2024-01-10",
        verified: true,
        verifiedBy: "QC-001",
        verifiedDate: "2024-01-11",
      }, "test-user");

      // Add operation
      as9100TraceabilityEngine.addOperation(record.recordId, {
        operationId: "OP-10",
        operationName: "Turn",
        machineId: "LATHE-001",
        programId: "O1000",
        programVersion: "1.0",
        operatorId: "OP-001",
        startTime: "2024-01-15T08:00:00Z",
        endTime: "2024-01-15T10:00:00Z",
        setupSheet: "setup.pdf",
        toolList: [],
        inspectionResults: [],
      }, "test-user");

      // Add FAI
      as9100TraceabilityEngine.addInspection(record.recordId, {
        type: "FAI",
        inspectionDate: "2024-01-16T10:00:00Z",
        inspectorId: "QC-001",
        results: [
          {
            characteristicId: "DIM-001",
            description: "OD",
            nominal: 25.0,
            tolerancePlus: 0.01,
            toleranceMinus: 0.01,
            actual: 25.005,
            unit: "mm",
            inSpec: true,
            measurementMethod: "CMM",
          },
        ],
        disposition: "accept",
        documentRefs: ["FAI-001.pdf"],
      }, "test-user");

      // Add drawing document
      as9100TraceabilityEngine.addDocument(record.recordId, {
        type: "drawing",
        title: "Part Drawing",
        revision: "A",
        path: "docs/drawing.pdf",
        uploadedBy: "test-user",
      }, "test-user");

      const validation = as9100TraceabilityEngine.validateChain(record.recordId);

      expect(validation.valid).toBe(true);
      expect(validation.complianceStatus).toBe("COMPLIANT");
      expect(validation.score).toBeGreaterThanOrEqual(80);
    });

    it("returns validation checks mapped to AS9100D clauses", () => {
      const record = as9100TraceabilityEngine.createRecord({
        partNumber: "PN-CLAUSE-001",
        partRevision: "A",
        serialNumber: "SN-CLAUSE-001",
        workOrderId: "WO-CLAUSE-001",
        createdBy: "test-user",
      });

      const validation = as9100TraceabilityEngine.validateChain(record.recordId);

      // Check that validation includes clause references
      const clauses = new Set(validation.checks.map(c => c.clause));
      expect(clauses.has("8.5.2")).toBe(true); // Material traceability
      expect(clauses.has("8.5.1")).toBe(true); // Process control
      expect(clauses.has("8.6")).toBe(true);   // Release
      expect(clauses.has("7.5")).toBe(true);   // Documentation
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // Certificate of Conformance Tests
  // ────────────────────────────────────────────────────────────────────────

  describe("generateCofC()", () => {
    it("generates CofC for complete record", () => {
      const record = as9100TraceabilityEngine.createRecord({
        partNumber: "PN-COFC-001",
        partRevision: "A",
        serialNumber: "SN-COFC-001",
        workOrderId: "WO-COFC-001",
        customerId: "CUST-001",
        customerName: "Raytheon",
        customerPO: "PO-2024-001",
        createdBy: "test-user",
      });

      // Complete the chain
      as9100TraceabilityEngine.updateMaterial(record.recordId, {
        specification: "AMS 5643",
        materialName: "17-4 PH",
        heatLot: "HT-COFC-001",
        millCert: "mill-cert.pdf",
        supplierId: "SUP-001",
        supplierName: "Supplier",
        receivedDate: "2024-01-10",
        verified: true,
        verifiedBy: "QC-001",
      }, "test-user");

      as9100TraceabilityEngine.addOperation(record.recordId, {
        operationId: "OP-10",
        operationName: "Machine",
        machineId: "LATHE-001",
        programId: "O1000",
        programVersion: "1.0",
        operatorId: "OP-001",
        startTime: "2024-01-15T08:00:00Z",
        endTime: "2024-01-15T10:00:00Z",
        setupSheet: "setup.pdf",
        toolList: [],
        inspectionResults: [],
      }, "test-user");

      as9100TraceabilityEngine.addInspection(record.recordId, {
        type: "FAI",
        inspectionDate: "2024-01-16T10:00:00Z",
        inspectorId: "QC-001",
        results: [{
          characteristicId: "DIM-001",
          description: "OD",
          nominal: 25.0,
          tolerancePlus: 0.01,
          toleranceMinus: 0.01,
          actual: 25.005,
          unit: "mm",
          inSpec: true,
          measurementMethod: "CMM",
        }],
        disposition: "accept",
        documentRefs: [],
      }, "test-user");

      as9100TraceabilityEngine.addDocument(record.recordId, {
        type: "drawing",
        title: "Drawing",
        revision: "A",
        path: "drawing.pdf",
        uploadedBy: "test-user",
      }, "test-user");

      const cofc = as9100TraceabilityEngine.generateCofC(record.recordId, {
        qcInspector: { name: "John Doe", date: "2024-01-17" },
        qualityManager: { name: "Jane Smith", date: "2024-01-17" },
        generatedBy: "test-user",
      });

      expect(cofc.cofcId).toMatch(/^COFC-/);
      expect(cofc.partNumber).toBe("PN-COFC-001");
      expect(cofc.customerName).toBe("Raytheon");
      expect(cofc.materialHeatLot).toBe("HT-COFC-001");
      expect(cofc.faiComplete).toBe(true);
      expect(cofc.conformanceStatement).toContain("conform to all specified requirements");

      // Check record was updated to released
      const finalRecord = as9100TraceabilityEngine.getRecord(record.recordId)!;
      expect(finalRecord.status).toBe("released");
    });

    it("throws error for incomplete chain", () => {
      const record = as9100TraceabilityEngine.createRecord({
        partNumber: "PN-FAIL-COFC",
        partRevision: "A",
        serialNumber: "SN-FAIL-001",
        workOrderId: "WO-FAIL-001",
        createdBy: "test-user",
      });

      expect(() => {
        as9100TraceabilityEngine.generateCofC(record.recordId, {
          qcInspector: { name: "Test", date: "2024-01-01" },
          generatedBy: "test-user",
        });
      }).toThrow("Cannot generate CofC - traceability chain incomplete");
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // Audit Report Tests
  // ────────────────────────────────────────────────────────────────────────

  describe("auditReport()", () => {
    it("generates comprehensive audit report", () => {
      // Get current date for date range
      const now = new Date();
      const startDate = new Date(now.getTime() - 86400000).toISOString().split("T")[0]; // Yesterday
      const endDate = new Date(now.getTime() + 86400000).toISOString().split("T")[0];   // Tomorrow

      // Create multiple records
      for (let i = 1; i <= 5; i++) {
        const record = as9100TraceabilityEngine.createRecord({
          partNumber: `PN-AUDIT-${i}`,
          partRevision: "A",
          serialNumber: `SN-AUDIT-${i}`,
          workOrderId: `WO-AUDIT-${i}`,
          createdBy: "test-user",
        });

        // Complete some records
        if (i <= 3) {
          as9100TraceabilityEngine.updateMaterial(record.recordId, {
            specification: "AMS 5643",
            heatLot: `HT-AUDIT-${i}`,
            millCert: `cert-${i}.pdf`,
            verified: i <= 2,
          }, "test-user");
        }
      }

      const report = as9100TraceabilityEngine.auditReport({
        startDate,
        endDate,
        auditorId: "AUDITOR-001",
      });

      expect(report.auditId).toMatch(/^AUDIT-/);
      expect(report.summary.totalRecords).toBe(5);
      expect(report.clauseCompliance.length).toBeGreaterThan(0);

      // Check material traceability analysis
      expect(report.materialTraceability.totalMaterials).toBe(5);
      expect(report.materialTraceability.missingCerts.length).toBe(2); // Records 4 and 5

      // Verify findings are generated
      expect(report.findings.length).toBeGreaterThan(0);
    });

    it("calculates compliance rate correctly", () => {
      // Get current date for date range
      const now = new Date();
      const startDate = new Date(now.getTime() - 86400000).toISOString().split("T")[0]; // Yesterday
      const endDate = new Date(now.getTime() + 86400000).toISOString().split("T")[0];   // Tomorrow

      // Create a compliant record
      const record = as9100TraceabilityEngine.createRecord({
        partNumber: "PN-RATE-001",
        partRevision: "A",
        serialNumber: "SN-RATE-001",
        workOrderId: "WO-RATE-001",
        createdBy: "test-user",
      });

      as9100TraceabilityEngine.updateMaterial(record.recordId, {
        specification: "AMS 5643",
        heatLot: "HT-RATE-001",
        millCert: "cert.pdf",
        verified: true,
        verifiedBy: "QC-001",
      }, "test-user");

      as9100TraceabilityEngine.addOperation(record.recordId, {
        operationId: "OP-10",
        operationName: "Op",
        machineId: "M-001",
        programId: "O1000",
        programVersion: "1.0",
        operatorId: "OP-001",
        startTime: "2024-01-15T08:00:00Z",
        endTime: "2024-01-15T10:00:00Z",
        setupSheet: "setup.pdf",
        toolList: [],
        inspectionResults: [],
      }, "test-user");

      as9100TraceabilityEngine.addInspection(record.recordId, {
        type: "FAI",
        inspectionDate: "2024-01-16T10:00:00Z",
        inspectorId: "QC-001",
        results: [{
          characteristicId: "DIM-001",
          description: "OD",
          nominal: 25.0,
          tolerancePlus: 0.01,
          toleranceMinus: 0.01,
          actual: 25.005,
          unit: "mm",
          inSpec: true,
          measurementMethod: "CMM",
        }],
        disposition: "accept",
        documentRefs: [],
      }, "test-user");

      as9100TraceabilityEngine.addDocument(record.recordId, {
        type: "drawing",
        title: "Drawing",
        revision: "A",
        path: "drawing.pdf",
        uploadedBy: "test-user",
      }, "test-user");

      const report = as9100TraceabilityEngine.auditReport({
        startDate,
        endDate,
        auditorId: "AUDITOR-001",
      });

      expect(report.summary.totalRecords).toBe(1);
      expect(report.summary.complianceRate).toBe(100);
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // Statistics Tests
  // ────────────────────────────────────────────────────────────────────────

  describe("getStats()", () => {
    it("returns accurate statistics", () => {
      // Create records with various states
      const record1 = as9100TraceabilityEngine.createRecord({
        partNumber: "PN-STAT-001",
        partRevision: "A",
        serialNumber: "SN-STAT-001",
        workOrderId: "WO-STAT-001",
        createdBy: "test-user",
      });

      as9100TraceabilityEngine.updateMaterial(record1.recordId, {
        heatLot: "HT-STAT-001",
      }, "test-user");

      as9100TraceabilityEngine.addOperation(record1.recordId, {
        operationId: "OP-10",
        operationName: "Op 10",
        machineId: "M-001",
        programId: "O1000",
        programVersion: "1.0",
        operatorId: "OP-001",
        startTime: "2024-01-15T08:00:00Z",
        endTime: "2024-01-15T10:00:00Z",
        setupSheet: "setup.pdf",
        toolList: [],
        inspectionResults: [],
      }, "test-user");

      as9100TraceabilityEngine.addDocument(record1.recordId, {
        type: "drawing",
        title: "Drawing",
        revision: "A",
        path: "drawing.pdf",
        uploadedBy: "test-user",
      }, "test-user");

      const stats = as9100TraceabilityEngine.getStats();

      expect(stats.totalRecords).toBe(1);
      expect(stats.totalOperations).toBe(1);
      expect(stats.totalDocuments).toBe(1);
      expect(stats.materialLotsTracked).toBe(1);
      expect(stats.avgOperationsPerPart).toBeCloseTo(1, 1);
    });
  });
});
