/**
 * MultiERPConnectorEngine tests — SQ4-0-ERP
 *
 * Tests: IERPConnector interface compliance, adapter routing,
 * CSV parsing, material resolution, registration, status, unified operations.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  multiERPConnectorEngine,
  MultiERPConnectorEngine,
  type ERPConnectionConfig,
  type UnifiedWorkOrder,
  type UnifiedExportPlan,
  type CSVColumnMapping,
} from "../engines/MultiERPConnectorEngine.js";

// ============================================================================
// CSV TEST DATA
// ============================================================================

const CSV_DATA = [
  "WO#,Part#,Description,Qty,Material,DueDate,Status,Customer,Step,Operation,WorkCenter,SetupHrs,RunHrsPerPart",
  "WO-001,P-100,Bracket,50,6061,2026-04-15,Open,ACME Corp,10,Rough Mill,MC-1,0.5,0.1",
  "WO-001,P-100,Bracket,50,6061,2026-04-15,Open,ACME Corp,20,Finish Mill,MC-1,0.25,0.05",
  "WO-001,P-100,Bracket,50,6061,2026-04-15,Open,ACME Corp,30,Deburr,BENCH,0.0,0.02",
  "WO-002,P-200,Housing,10,304,2026-04-20,In Process,Beta Inc,10,Face Mill,MC-2,0.75,0.2",
  "WO-002,P-200,Housing,10,304,2026-04-20,In Process,Beta Inc,20,Bore,MC-2,0.5,0.15",
  "WO-003,P-300,Shaft,25,4140,2026-04-10,Complete,Gamma LLC,10,Turn,LATHE-1,0.3,0.08",
].join("\n");

const CSV_CONFIG: ERPConnectionConfig = {
  system: "generic_csv",
  csv_source: CSV_DATA,
  company_id: "test-shop",
};

// ============================================================================
// TESTS
// ============================================================================

describe("MultiERPConnectorEngine", () => {

  describe("listSystems", () => {
    it("should list all 4 supported ERP systems", () => {
      const systems = multiERPConnectorEngine.listSystems();
      expect(systems).toHaveLength(4);
      expect(systems.map(s => s.system)).toEqual(["e2", "epicor_kinetic", "proshop", "generic_csv"]);
    });

    it("should include capabilities for each system", () => {
      const systems = multiERPConnectorEngine.listSystems();
      for (const sys of systems) {
        expect(sys.capabilities.length).toBeGreaterThan(0);
        expect(sys.display_name).toBeTruthy();
        expect(sys.auth_method).toBeTruthy();
        expect(sys.api_style).toBeTruthy();
      }
    });

    it("should show E2 as having bidirectional_sync capability", () => {
      const systems = multiERPConnectorEngine.listSystems();
      const e2 = systems.find(s => s.system === "e2")!;
      expect(e2.capabilities).toContain("bidirectional_sync");
      expect(e2.capabilities).toContain("time_tracking");
    });

    it("should show CSV as import-only", () => {
      const systems = multiERPConnectorEngine.listSystems();
      const csv = systems.find(s => s.system === "generic_csv")!;
      expect(csv.capabilities).toEqual(["import_wo", "import_batch"]);
      expect(csv.capabilities).not.toContain("export_plan");
    });
  });

  describe("register / unregister", () => {
    let engine: MultiERPConnectorEngine;

    beforeEach(() => {
      // Fresh instance for registration tests
      engine = new (MultiERPConnectorEngine as any)();
    });

    it("should register an ERP system with alias", () => {
      const result = engine.register("prod_csv", CSV_CONFIG);
      expect(result.registered).toBe(true);
      expect(result.alias).toBe("prod_csv");
      expect(result.system).toBe("generic_csv");
      expect(result.capabilities.length).toBeGreaterThan(0);
      expect(result.error).toBeNull();
    });

    it("should reject unsupported system type", () => {
      const result = engine.register("bad", { system: "sap_hana" as any });
      expect(result.registered).toBe(false);
      expect(result.error).toContain("Unsupported");
      expect(result.error).toContain("sap_hana");
    });

    it("should allow multiple registrations of same type", () => {
      const r1 = engine.register("shop_a", { ...CSV_CONFIG, company_id: "A" });
      const r2 = engine.register("shop_b", { ...CSV_CONFIG, company_id: "B" });
      expect(r1.registered).toBe(true);
      expect(r2.registered).toBe(true);
    });

    it("should unregister a system", () => {
      engine.register("temp", CSV_CONFIG);
      expect(engine.unregister("temp")).toBe(true);
      expect(engine.unregister("nonexistent")).toBe(false);
    });

    it("should show registered systems in status", () => {
      engine.register("csv_test", CSV_CONFIG);
      engine.register("csv_backup", CSV_CONFIG);
      const status = engine.status();
      expect(status.registered_count).toBe(2);
      expect(status.systems.map(s => s.alias)).toContain("csv_test");
      expect(status.systems.every(s => s.status === "untested")).toBe(true);
    });
  });

  describe("CSV adapter — connect", () => {
    it("should connect successfully with valid CSV data", async () => {
      const result = await multiERPConnectorEngine.connect({ config: CSV_CONFIG });
      expect(result.connected).toBe(true);
      expect(result.system).toBe("generic_csv");
      expect(result.version).toBe("CSV/RFC4180");
    });

    it("should fail connect with missing csv_source", async () => {
      const result = await multiERPConnectorEngine.connect({
        config: { system: "generic_csv" },
      });
      expect(result.connected).toBe(false);
      expect(result.error).toContain("csv_source");
    });
  });

  describe("CSV adapter — importWorkOrder", () => {
    it("should import a single work order from CSV", async () => {
      const result = await multiERPConnectorEngine.importWorkOrder({
        config: CSV_CONFIG,
        wo_id: "WO-001",
      });
      expect(result.error).toBeNull();
      expect(result.work_orders).toHaveLength(1);
      const wo = result.work_orders[0];
      expect(wo.part_number).toBe("P-100");
      expect(wo.quantity).toBe(50);
      expect(wo.source).toBe("generic_csv");
      expect(wo.source_id).toBe("WO-001");
      expect(wo.routing).toHaveLength(3);
      expect(wo.routing[0].operation).toBe("Rough Mill");
      expect(wo.routing[0].setup_time_min).toBe(30); // 0.5h × 60
    });

    it("should resolve material ISO group from CSV material code", async () => {
      const result = await multiERPConnectorEngine.importWorkOrder({
        config: CSV_CONFIG,
        wo_id: "WO-001",
      });
      const wo = result.work_orders[0];
      // "6061" → aluminum_6061 → ISO group N
      expect(wo.material).toBe("aluminum_6061");
      expect(wo.material_iso_group).toBe("N");
    });

    it("should resolve stainless material from CSV", async () => {
      const result = await multiERPConnectorEngine.importWorkOrder({
        config: CSV_CONFIG,
        wo_id: "WO-002",
      });
      const wo = result.work_orders[0];
      // "304" → stainless_304 → ISO group M
      expect(wo.material).toBe("stainless_304");
      expect(wo.material_iso_group).toBe("M");
    });

    it("should return error for non-existent WO", async () => {
      const result = await multiERPConnectorEngine.importWorkOrder({
        config: CSV_CONFIG,
        wo_id: "WO-999",
      });
      expect(result.work_orders).toHaveLength(0);
      expect(result.error).toContain("WO-999");
    });

    it("should map status correctly", async () => {
      const r1 = await multiERPConnectorEngine.importWorkOrder({ config: CSV_CONFIG, wo_id: "WO-001" });
      expect(r1.work_orders[0].status).toBe("open");

      const r2 = await multiERPConnectorEngine.importWorkOrder({ config: CSV_CONFIG, wo_id: "WO-002" });
      expect(r2.work_orders[0].status).toBe("in_process");

      const r3 = await multiERPConnectorEngine.importWorkOrder({ config: CSV_CONFIG, wo_id: "WO-003" });
      expect(r3.work_orders[0].status).toBe("complete");
    });
  });

  describe("CSV adapter — importBatch", () => {
    it("should import all work orders from CSV", async () => {
      const result = await multiERPConnectorEngine.importWorkOrder({
        config: CSV_CONFIG,
        filter: {},
      });
      expect(result.work_orders.length).toBe(3);
      expect(result.total_available).toBe(3);
    });

    it("should filter by status", async () => {
      const result = await multiERPConnectorEngine.importWorkOrder({
        config: CSV_CONFIG,
        filter: { status: "open" },
      });
      expect(result.work_orders.every(wo => wo.status === "open")).toBe(true);
    });

    it("should respect limit", async () => {
      const result = await multiERPConnectorEngine.importWorkOrder({
        config: CSV_CONFIG,
        filter: { limit: 1 },
      });
      expect(result.work_orders.length).toBeLessThanOrEqual(1);
    });
  });

  describe("CSV adapter — quoted fields", () => {
    it("should handle quoted CSV fields with commas", async () => {
      const csvWithQuotes = [
        'WO#,Part#,Description,Qty,Material,DueDate,Status,Customer',
        'WO-Q1,P-Q1,"Bracket, large",100,7075,2026-05-01,Open,"Smith & Sons, Inc."',
      ].join("\n");

      const result = await multiERPConnectorEngine.importWorkOrder({
        config: { system: "generic_csv", csv_source: csvWithQuotes },
        wo_id: "WO-Q1",
      });
      expect(result.work_orders).toHaveLength(1);
      expect(result.work_orders[0].part_description).toBe("Bracket, large");
      expect(result.work_orders[0].customer_name).toBe("Smith & Sons, Inc.");
    });
  });

  describe("CSV adapter — export not supported", () => {
    it("should return error for export on CSV adapter", async () => {
      const plan: UnifiedExportPlan = {
        work_order_id: "WO-001",
        steps: [{ step: 10, setup_time_min: 30, run_time_per_part_min: 6, tools: "1/2 EM", notes: "test" }],
      };
      const result = await multiERPConnectorEngine.exportPlan({
        config: CSV_CONFIG,
        plan,
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain("does not support");
    });
  });

  describe("error handling", () => {
    it("should error when no alias or config provided for connect", async () => {
      const result = await multiERPConnectorEngine.connect({});
      expect(result.connected).toBe(false);
      expect(result.error).toContain("required");
    });

    it("should error when alias not found for import", async () => {
      const result = await multiERPConnectorEngine.importWorkOrder({
        alias: "nonexistent_system",
        wo_id: "WO-001",
      });
      expect(result.error).toContain("nonexistent_system");
    });

    it("should error for unsupported system in ad-hoc config", async () => {
      const result = await multiERPConnectorEngine.connect({
        config: { system: "oracle_cloud" as any },
      });
      expect(result.connected).toBe(false);
      expect(result.error).toContain("Unsupported");
    });
  });

  describe("registered system routing", () => {
    it("should route operations through registered alias", async () => {
      const engine = new (MultiERPConnectorEngine as any)();
      engine.register("test_csv", CSV_CONFIG);

      const result = await engine.importWorkOrder({
        alias: "test_csv",
        wo_id: "WO-001",
      });
      expect(result.work_orders).toHaveLength(1);
      expect(result.work_orders[0].source).toBe("generic_csv");
    });
  });

  describe("material resolution", () => {
    it("should resolve steel 4140 → ISO P group", async () => {
      const result = await multiERPConnectorEngine.importWorkOrder({
        config: CSV_CONFIG,
        wo_id: "WO-003",
      });
      const wo = result.work_orders[0];
      // 4140 maps to "alloy_steel" in CANONICAL_MATERIAL_DB (not steel_4140)
      expect(wo.material).toBe("alloy_steel");
      expect(wo.material_iso_group).toBe("P");
    });

    it("should handle unknown material gracefully", async () => {
      const csvUnknown = [
        "WO#,Part#,Description,Qty,Material,DueDate,Status,Customer",
        "WO-X,P-X,Widget,1,unobtainium,2026-06-01,Open,Test",
      ].join("\n");
      const result = await multiERPConnectorEngine.importWorkOrder({
        config: { system: "generic_csv", csv_source: csvUnknown },
        wo_id: "WO-X",
      });
      expect(result.work_orders).toHaveLength(1);
      expect(result.work_orders[0].material_iso_group).toBeNull();
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe("syncInventory", () => {
    it("should error for CSV adapter (unsupported)", async () => {
      const result = await multiERPConnectorEngine.syncInventory({ config: CSV_CONFIG });
      expect(result.total).toBe(0);
      expect(result.error).toContain("does not support");
    });

    it("should error when no config or alias provided", async () => {
      const result = await multiERPConnectorEngine.syncInventory({});
      expect(result.error).toContain("required");
    });
  });

  describe("capability gating", () => {
    it("should list CSV as lacking export_plan capability", () => {
      const systems = multiERPConnectorEngine.listSystems();
      const csv = systems.find(s => s.system === "generic_csv")!;
      expect(csv.capabilities).not.toContain("export_plan");
      expect(csv.capabilities).not.toContain("sync_inventory");
    });

    it("should list E2 as having all major capabilities", () => {
      const systems = multiERPConnectorEngine.listSystems();
      const e2 = systems.find(s => s.system === "e2")!;
      expect(e2.capabilities).toContain("import_wo");
      expect(e2.capabilities).toContain("export_plan");
      expect(e2.capabilities).toContain("sync_inventory");
      expect(e2.capabilities).toContain("bidirectional_sync");
    });
  });

  describe("status reporting", () => {
    it("should report empty status when nothing registered", () => {
      const engine = new (MultiERPConnectorEngine as any)();
      const status = engine.status();
      expect(status.registered_count).toBe(0);
      expect(status.systems).toHaveLength(0);
    });
  });
});
