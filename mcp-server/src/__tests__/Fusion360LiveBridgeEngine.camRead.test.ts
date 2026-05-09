import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Fusion360LiveBridgeEngine } from "../engines/Fusion360LiveBridgeEngine.js";
import { createServer, type Server, type IncomingMessage, type ServerResponse } from "http";

// Tests cover the 4 read-only CAM introspection endpoints added in
// OBSIDIAN-AUTOMATE-MS3/U-FUSION-LIVE-READ:
//   GET /cam/operations
//   GET /cam/toolpath/validity
//   GET /cam/cycle-time
//   GET /cam/materials

interface RecordedRequest {
  path: string;
  query: string;
  method: string;
}

let mockServer: Server;
let recorded: RecordedRequest[] = [];

function startMockServer(routes: Record<string, Record<string, unknown>>): Promise<number> {
  return new Promise((resolve) => {
    mockServer = createServer((req: IncomingMessage, res: ServerResponse) => {
      const url = new URL(req.url ?? "/", "http://127.0.0.1");
      recorded.push({ path: url.pathname, query: url.search, method: req.method ?? "GET" });
      const route = routes[url.pathname];
      if (route) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(route));
      } else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: "not found" }));
      }
    });
    mockServer.listen(0, "127.0.0.1", () => {
      const addr = mockServer.address();
      if (addr && typeof addr !== "string") resolve(addr.port);
    });
  });
}

function stopMockServer(): Promise<void> {
  return new Promise((resolve) => mockServer ? mockServer.close(() => resolve()) : resolve());
}

describe("Fusion360LiveBridgeEngine — CAM read endpoints", () => {
  let engine: Fusion360LiveBridgeEngine;

  beforeEach(() => {
    recorded = [];
  });

  afterEach(async () => {
    await stopMockServer();
  });

  describe("listCamOperations", () => {
    it("hits /cam/operations with no query when setupName omitted", async () => {
      const port = await startMockServer({
        "/cam/operations": { operations: [], count: 0 },
      });
      engine = new Fusion360LiveBridgeEngine(`http://127.0.0.1:${port}`);
      const r = await engine.listCamOperations();
      expect(r.count).toBe(0);
      expect(recorded[0]?.path).toBe("/cam/operations");
      expect(recorded[0]?.query).toBe("");
    });

    it("URL-encodes setup_name when provided", async () => {
      const port = await startMockServer({
        "/cam/operations": { operations: [], count: 0 },
      });
      engine = new Fusion360LiveBridgeEngine(`http://127.0.0.1:${port}`);
      await engine.listCamOperations("Setup 1 / OP10");
      expect(recorded[0]?.query).toBe("?name=Setup%201%20%2F%20OP10");
    });

    it("propagates operation list shape including is_toolpath_valid + tool", async () => {
      const port = await startMockServer({
        "/cam/operations": {
          operations: [{
            setup_name: "Setup1",
            setup_index: 0,
            operation_name: "Face1",
            operation_index: 0,
            operation_type: 1,
            strategy: "face",
            is_toolpath_valid: true,
            is_suppressed: false,
            tool: { description: "10mm endmill", type: "endmill" },
            speed_feed: { tool_spindleSpeed: "3500 rpm" },
          }],
          count: 1,
        },
      });
      engine = new Fusion360LiveBridgeEngine(`http://127.0.0.1:${port}`);
      const r = await engine.listCamOperations();
      expect(r.count).toBe(1);
      expect(r.operations[0]?.is_toolpath_valid).toBe(true);
      expect(r.operations[0]?.tool?.description).toBe("10mm endmill");
      expect(r.operations[0]?.speed_feed?.tool_spindleSpeed).toBe("3500 rpm");
    });
  });

  describe("getToolpathValidity", () => {
    it("returns all_valid=true only when invalid_count === 0 AND valid_count > 0", async () => {
      const port = await startMockServer({
        "/cam/toolpath/validity": {
          operations: [
            { setup_name: "S1", operation_name: "Op1", operation_index: 0, is_toolpath_valid: true },
            { setup_name: "S1", operation_name: "Op2", operation_index: 1, is_toolpath_valid: true },
          ],
          valid_count: 2,
          invalid_count: 0,
          all_valid: true,
        },
      });
      engine = new Fusion360LiveBridgeEngine(`http://127.0.0.1:${port}`);
      const r = await engine.getToolpathValidity();
      expect(r.all_valid).toBe(true);
      expect(r.valid_count).toBe(2);
      expect(r.invalid_count).toBe(0);
      expect(r.operations).toHaveLength(2);
    });

    it("flags all_valid=false when any operation is dirty", async () => {
      const port = await startMockServer({
        "/cam/toolpath/validity": {
          operations: [
            { setup_name: "S1", operation_name: "Op1", operation_index: 0, is_toolpath_valid: true },
            { setup_name: "S1", operation_name: "Op2", operation_index: 1, is_toolpath_valid: false },
          ],
          valid_count: 1,
          invalid_count: 1,
          all_valid: false,
        },
      });
      engine = new Fusion360LiveBridgeEngine(`http://127.0.0.1:${port}`);
      const r = await engine.getToolpathValidity();
      expect(r.all_valid).toBe(false);
      expect(r.invalid_count).toBe(1);
    });

    it("scopes to a single setup via setup_name", async () => {
      const port = await startMockServer({
        "/cam/toolpath/validity": { operations: [], valid_count: 0, invalid_count: 0, all_valid: false },
      });
      engine = new Fusion360LiveBridgeEngine(`http://127.0.0.1:${port}`);
      await engine.getToolpathValidity("RoughingSetup");
      expect(recorded[0]?.query).toBe("?name=RoughingSetup");
    });
  });

  describe("getCycleTime", () => {
    it("returns hierarchical setup→operation cycle times", async () => {
      const port = await startMockServer({
        "/cam/cycle-time": {
          setups: [{
            setup_name: "S1",
            setup_index: 0,
            operations: [
              { operation_name: "Op1", operation_index: 0, cycle_time_sec: 60, cycle_time_min: 1.0 },
              { operation_name: "Op2", operation_index: 1, cycle_time_sec: 90, cycle_time_min: 1.5 },
            ],
            setup_cycle_time_sec: 150,
            setup_cycle_time_min: 2.5,
          }],
          total_cycle_time_sec: 150,
          total_cycle_time_min: 2.5,
        },
      });
      engine = new Fusion360LiveBridgeEngine(`http://127.0.0.1:${port}`);
      const r = await engine.getCycleTime();
      expect(r.total_cycle_time_sec).toBe(150);
      expect(r.total_cycle_time_min).toBeCloseTo(2.5, 5);
      expect(r.setups[0]?.operations).toHaveLength(2);
      expect(r.setups[0]?.setup_cycle_time_sec).toBe(150);
    });

    it("handles zero cycle time without crashing", async () => {
      const port = await startMockServer({
        "/cam/cycle-time": {
          setups: [{
            setup_name: "S1", setup_index: 0,
            operations: [{ operation_name: "NotGenerated", operation_index: 0, cycle_time_sec: 0, cycle_time_min: 0 }],
            setup_cycle_time_sec: 0, setup_cycle_time_min: 0,
          }],
          total_cycle_time_sec: 0,
          total_cycle_time_min: 0,
        },
      });
      engine = new Fusion360LiveBridgeEngine(`http://127.0.0.1:${port}`);
      const r = await engine.getCycleTime();
      expect(r.total_cycle_time_sec).toBe(0);
      expect(r.setups[0]?.operations[0]?.cycle_time_min).toBe(0);
    });
  });

  describe("getCamMaterials", () => {
    it("returns body materials, body assignments, and CAM setup stock materials", async () => {
      const port = await startMockServer({
        "/cam/materials": {
          body_materials: [
            { name: "Aluminum 6061", id: "PrismMaterial-001", appearance: "Aluminum - Anodized" },
            { name: "Steel 1018",  id: "PrismMaterial-002", appearance: "Steel - Satin" },
          ],
          body_assignments: [
            { body_name: "Body1", body_index: 0, material_name: "Aluminum 6061", material_id: "PrismMaterial-001" },
          ],
          cam_setup_materials: [
            { setup_name: "S1", setup_index: 0, stock_material: "Aluminum 6061" },
          ],
          count: 2,
        },
      });
      engine = new Fusion360LiveBridgeEngine(`http://127.0.0.1:${port}`);
      const r = await engine.getCamMaterials();
      expect(r.count).toBe(2);
      expect(r.body_materials).toHaveLength(2);
      expect(r.body_assignments[0]?.material_name).toBe("Aluminum 6061");
      expect(r.cam_setup_materials[0]?.stock_material).toBe("Aluminum 6061");
    });

    it("hits /cam/materials with no query string", async () => {
      const port = await startMockServer({
        "/cam/materials": { body_materials: [], body_assignments: [], cam_setup_materials: [], count: 0 },
      });
      engine = new Fusion360LiveBridgeEngine(`http://127.0.0.1:${port}`);
      await engine.getCamMaterials();
      expect(recorded[0]?.path).toBe("/cam/materials");
      expect(recorded[0]?.query).toBe("");
    });
  });

  describe("Network failure handling", () => {
    it("rejects when the bridge is unreachable", async () => {
      // Bind ephemeral port, immediately close → guaranteed-unreachable target.
      const port = await startMockServer({});
      await stopMockServer();
      engine = new Fusion360LiveBridgeEngine(`http://127.0.0.1:${port}`);
      await expect(engine.listCamOperations()).rejects.toThrow();
    });
  });
});
