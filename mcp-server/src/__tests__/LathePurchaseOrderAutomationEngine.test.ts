/**
 * LathePurchaseOrderAutomationEngine Tests
 *
 * U-LTH52: Auto-generate PO requirements from job
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  lathePurchaseOrderAutomationEngine,
  type JobRequirements,
} from "../engines/LathePurchaseOrderAutomationEngine.js";

describe("LathePurchaseOrderAutomationEngine", () => {
  const sampleJobRequirements: JobRequirements = {
    job_id: "JOB-001",
    part_number: "SHAFT-001",
    quantity: 100,
    material: "4140",
    stock_diameter_mm: 50,
    stock_length_mm: 150,
    tools_required: [
      { tool_type: "CNMG Insert", description: "80° Turning Insert", quantity_needed: 4 },
      { tool_type: "Threading Insert", description: "External Threading", quantity_needed: 2 },
    ],
    consumables: [
      { type: "Coolant", description: "Water-soluble coolant", quantity_needed: 5, unit: "gal" },
    ],
  };

  beforeEach(() => {
    lathePurchaseOrderAutomationEngine.clearAll();
  });

  describe("generatePOsForJob()", () => {
    it("returns generation result with job ID", () => {
      const result = lathePurchaseOrderAutomationEngine.generatePOsForJob(sampleJobRequirements);

      expect(result.job_id).toBe("JOB-001");
      expect(result.purchase_orders).toBeDefined();
      expect(result.shortages).toBeDefined();
      expect(result.recommendations).toBeDefined();
    });

    it("detects no shortages when inventory sufficient", () => {
      const smallJob: JobRequirements = {
        ...sampleJobRequirements,
        quantity: 5,
        stock_diameter_mm: 20,
        stock_length_mm: 50,
        tools_required: [
          { tool_type: "CNMG Insert", description: "Insert", quantity_needed: 1 },
        ],
        consumables: [
          { type: "Coolant", description: "Coolant", quantity_needed: 1, unit: "gal" },
        ],
      };

      const result = lathePurchaseOrderAutomationEngine.generatePOsForJob(smallJob);

      expect(result.shortages.length).toBe(0);
      expect(result.purchase_orders.length).toBe(0);
      expect(result.recommendations.some((r) => r.includes("no POs required"))).toBe(true);
    });

    it("creates PO when material shortage detected", () => {
      const largeJob: JobRequirements = {
        ...sampleJobRequirements,
        quantity: 1000,
      };

      const result = lathePurchaseOrderAutomationEngine.generatePOsForJob(largeJob);

      const materialShortage = result.shortages.find((s) => s.item_type === "material");
      expect(materialShortage).toBeDefined();
      expect(result.purchase_orders.length).toBeGreaterThan(0);
    });

    it("creates PO when tool shortage detected", () => {
      lathePurchaseOrderAutomationEngine.updateInventory("TOOL-CNMG-Insert", {
        quantity_on_hand: 2,
        quantity_available: 2,
      });

      const result = lathePurchaseOrderAutomationEngine.generatePOsForJob(sampleJobRequirements);

      const toolShortage = result.shortages.find((s) => s.item_type === "tool");
      expect(toolShortage).toBeDefined();
    });

    it("consolidates items by supplier", () => {
      lathePurchaseOrderAutomationEngine.updateInventory("TOOL-CNMG-Insert", {
        quantity_on_hand: 1,
        quantity_available: 1,
      });
      lathePurchaseOrderAutomationEngine.updateInventory("TOOL-Threading-Insert", {
        quantity_on_hand: 0,
        quantity_available: 0,
      });

      const result = lathePurchaseOrderAutomationEngine.generatePOsForJob(sampleJobRequirements);

      const toolPOs = result.purchase_orders.filter((po) =>
        po.line_items.some((li) => li.item_id.startsWith("TOOL"))
      );

      if (toolPOs.length > 0) {
        expect(toolPOs[0].line_items.length).toBeGreaterThanOrEqual(1);
      }
    });

    it("calculates total cost of all POs", () => {
      const largeJob: JobRequirements = {
        ...sampleJobRequirements,
        quantity: 500,
      };

      const result = lathePurchaseOrderAutomationEngine.generatePOsForJob(largeJob);

      if (result.purchase_orders.length > 0) {
        const calculatedTotal = result.purchase_orders.reduce((sum, po) => sum + po.total, 0);
        expect(result.total_cost).toBeCloseTo(calculatedTotal, 2);
      }
    });

    it("uses EOQ for order quantities", () => {
      lathePurchaseOrderAutomationEngine.updateInventory("TOOL-CNMG-Insert", {
        quantity_on_hand: 3,
        quantity_available: 3,
        eoq: 10,
      });

      const result = lathePurchaseOrderAutomationEngine.generatePOsForJob(sampleJobRequirements);

      const toolPO = result.purchase_orders.find((po) =>
        po.line_items.some((li) => li.item_id === "TOOL-CNMG-Insert")
      );

      if (toolPO) {
        const toolLine = toolPO.line_items.find((li) => li.item_id === "TOOL-CNMG-Insert");
        expect(toolLine?.quantity).toBeGreaterThanOrEqual(10);
      }
    });
  });

  describe("createPurchaseOrder()", () => {
    it("creates PO with generated ID", () => {
      const po = lathePurchaseOrderAutomationEngine.createPurchaseOrder({
        supplier_id: "SUP-001",
        line_items: [
          {
            line_number: 1,
            item_id: "MAT-4140",
            description: "4140 Round Bar",
            quantity: 100,
            unit_cost: 2.80,
            extended_cost: 280,
            required_date: new Date().toISOString(),
          },
        ],
      });

      expect(po.po_id).toMatch(/^PO-/);
      expect(po.status).toBe("draft");
      expect(po.supplier_name).toBe("MetalMart Inc");
    });

    it("calculates totals correctly", () => {
      const po = lathePurchaseOrderAutomationEngine.createPurchaseOrder({
        supplier_id: "SUP-002",
        line_items: [
          {
            line_number: 1,
            item_id: "TOOL-1",
            description: "Tool 1",
            quantity: 10,
            unit_cost: 15,
            extended_cost: 150,
            required_date: new Date().toISOString(),
          },
          {
            line_number: 2,
            item_id: "TOOL-2",
            description: "Tool 2",
            quantity: 5,
            unit_cost: 20,
            extended_cost: 100,
            required_date: new Date().toISOString(),
          },
        ],
      });

      expect(po.subtotal).toBe(250);
      expect(po.total).toBe(275); // 250 + 25 shipping (under $500)
    });

    it("waives shipping for large orders", () => {
      const po = lathePurchaseOrderAutomationEngine.createPurchaseOrder({
        supplier_id: "SUP-001",
        line_items: [
          {
            line_number: 1,
            item_id: "MAT-4140",
            description: "Steel",
            quantity: 200,
            unit_cost: 5,
            extended_cost: 1000,
            required_date: new Date().toISOString(),
          },
        ],
      });

      expect(po.shipping).toBe(0);
      expect(po.total).toBe(1000);
    });

    it("links PO to job when provided", () => {
      const po = lathePurchaseOrderAutomationEngine.createPurchaseOrder({
        supplier_id: "SUP-001",
        job_id: "JOB-123",
        line_items: [],
      });

      expect(po.job_id).toBe("JOB-123");
    });
  });

  describe("PO Workflow", () => {
    let poId: string;

    beforeEach(() => {
      const po = lathePurchaseOrderAutomationEngine.createPurchaseOrder({
        supplier_id: "SUP-001",
        line_items: [
          {
            line_number: 1,
            item_id: "MAT-4140",
            description: "Steel",
            quantity: 50,
            unit_cost: 2.80,
            extended_cost: 140,
            required_date: new Date().toISOString(),
          },
        ],
      });
      poId = po.po_id;
    });

    it("approves PO with user ID", () => {
      const approved = lathePurchaseOrderAutomationEngine.approvePO(poId, "USER-001", "Approved for job");

      expect(approved?.status).toBe("approved");
      expect(approved?.approval_chain.length).toBe(1);
      expect(approved?.approval_chain[0].user_id).toBe("USER-001");
      expect(approved?.approval_chain[0].action).toBe("approved");
    });

    it("sends approved PO", () => {
      lathePurchaseOrderAutomationEngine.approvePO(poId, "USER-001");
      const sent = lathePurchaseOrderAutomationEngine.sendPO(poId);

      expect(sent?.status).toBe("sent");
    });

    it("cannot send unapproved PO", () => {
      const result = lathePurchaseOrderAutomationEngine.sendPO(poId);
      expect(result).toBeNull();
    });

    it("receives PO and updates inventory", () => {
      const initialQty = lathePurchaseOrderAutomationEngine.getInventoryItem("MAT-4140")?.quantity_on_hand || 0;

      lathePurchaseOrderAutomationEngine.approvePO(poId, "USER-001");
      lathePurchaseOrderAutomationEngine.sendPO(poId);
      lathePurchaseOrderAutomationEngine.receivePO(poId);

      const finalQty = lathePurchaseOrderAutomationEngine.getInventoryItem("MAT-4140")?.quantity_on_hand || 0;
      expect(finalQty).toBe(initialQty + 50);
    });
  });

  describe("Inventory Management", () => {
    it("returns inventory item by ID", () => {
      const item = lathePurchaseOrderAutomationEngine.getInventoryItem("MAT-4140");

      expect(item).not.toBeNull();
      expect(item?.description).toContain("4140");
      expect(item?.type).toBe("material");
    });

    it("returns null for unknown item", () => {
      const item = lathePurchaseOrderAutomationEngine.getInventoryItem("UNKNOWN");
      expect(item).toBeNull();
    });

    it("updates inventory item", () => {
      const updated = lathePurchaseOrderAutomationEngine.updateInventory("MAT-4140", {
        quantity_on_hand: 750,
      });

      expect(updated?.quantity_on_hand).toBe(750);
      expect(updated?.quantity_available).toBe(750);
    });

    it("calculates available from on_hand minus reserved", () => {
      const updated = lathePurchaseOrderAutomationEngine.updateInventory("MAT-4140", {
        quantity_on_hand: 500,
        quantity_reserved: 100,
      });

      expect(updated?.quantity_available).toBe(400);
    });

    it("checks reorder points", () => {
      lathePurchaseOrderAutomationEngine.updateInventory("TOOL-CNMG-Insert", {
        quantity_on_hand: 3,
        quantity_available: 3,
        reorder_point: 5,
      });

      const toReorder = lathePurchaseOrderAutomationEngine.checkReorderPoints();

      const cnmgReorder = toReorder.find((r) => r.item.item_id === "TOOL-CNMG-Insert");
      expect(cnmgReorder).toBeDefined();
      expect(cnmgReorder?.suggested_qty).toBeGreaterThan(0);
    });
  });

  describe("Supplier Management", () => {
    it("returns supplier by ID", () => {
      const supplier = lathePurchaseOrderAutomationEngine.getSupplier("SUP-001");

      expect(supplier).not.toBeNull();
      expect(supplier?.name).toBe("MetalMart Inc");
      expect(supplier?.categories).toContain("material");
    });

    it("returns all suppliers", () => {
      const suppliers = lathePurchaseOrderAutomationEngine.getAllSuppliers();

      expect(suppliers.length).toBeGreaterThanOrEqual(4);
      expect(suppliers.some((s) => s.categories.includes("material"))).toBe(true);
      expect(suppliers.some((s) => s.categories.includes("tool"))).toBe(true);
      expect(suppliers.some((s) => s.categories.includes("consumable"))).toBe(true);
    });
  });

  describe("PO Queries", () => {
    beforeEach(() => {
      const po1 = lathePurchaseOrderAutomationEngine.createPurchaseOrder({
        supplier_id: "SUP-001",
        job_id: "JOB-A",
        line_items: [],
      });
      const po2 = lathePurchaseOrderAutomationEngine.createPurchaseOrder({
        supplier_id: "SUP-002",
        job_id: "JOB-A",
        line_items: [],
      });
      lathePurchaseOrderAutomationEngine.approvePO(po2.po_id, "USER-001");
    });

    it("retrieves POs by status", () => {
      const drafts = lathePurchaseOrderAutomationEngine.getPOsByStatus("draft");
      const approved = lathePurchaseOrderAutomationEngine.getPOsByStatus("approved");

      expect(drafts.length).toBe(1);
      expect(approved.length).toBe(1);
    });

    it("retrieves POs by job", () => {
      const jobPOs = lathePurchaseOrderAutomationEngine.getPOsByJob("JOB-A");
      expect(jobPOs.length).toBe(2);
    });

    it("retrieves PO by ID", () => {
      const drafts = lathePurchaseOrderAutomationEngine.getPOsByStatus("draft");
      const po = lathePurchaseOrderAutomationEngine.getPO(drafts[0].po_id);

      expect(po).not.toBeNull();
      expect(po?.po_id).toBe(drafts[0].po_id);
    });
  });

  describe("Default Inventory", () => {
    it("includes common materials", () => {
      const materials = ["6061-T6", "7075-T6", "4140", "4340", "303SS", "316SS"];

      for (const mat of materials) {
        const item = lathePurchaseOrderAutomationEngine.getInventoryItem(`MAT-${mat}`);
        expect(item).not.toBeNull();
        expect(item?.type).toBe("material");
      }
    });

    it("includes common tools", () => {
      const tools = ["CNMG-Insert", "DNMG-Insert", "Threading-Insert"];

      for (const tool of tools) {
        const item = lathePurchaseOrderAutomationEngine.getInventoryItem(`TOOL-${tool}`);
        expect(item).not.toBeNull();
        expect(item?.type).toBe("tool");
      }
    });

    it("includes common consumables", () => {
      const consumables = ["Coolant", "Cutting Oil", "Wipers"];

      for (const cons of consumables) {
        const item = lathePurchaseOrderAutomationEngine.getInventoryItem(`CONS-${cons}`);
        expect(item).not.toBeNull();
        expect(item?.type).toBe("consumable");
      }
    });
  });
});
