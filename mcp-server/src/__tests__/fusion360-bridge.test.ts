import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  Fusion360LiveBridgeEngine,
  type SketchShape,
  type GeometryResult,
  type OperationResult,
} from "../engines/Fusion360LiveBridgeEngine.js";
import type { ExtractedAction } from "../engines/VideoActionExtractorEngine.js";
import { createServer, type Server, type IncomingMessage, type ServerResponse } from "http";

// ── Mock HTTP Server ──────────────────────────────────────────────

let mockServer: Server;
let mockPort: number;
let lastRequest: { method: string; path: string; body: Record<string, unknown> };
let mockResponses: Record<string, unknown> = {};

function setMockResponse(path: string, data: unknown): void {
  mockResponses[path] = data;
}

function startMockServer(): Promise<number> {
  return new Promise((resolve) => {
    mockServer = createServer(
      (req: IncomingMessage, res: ServerResponse) => {
        let body = "";
        req.on("data", (chunk: Buffer) => { body += chunk.toString(); });
        req.on("end", () => {
          const path = req.url ?? "/";
          lastRequest = {
            method: req.method ?? "GET",
            path,
            body: body ? JSON.parse(body) : {},
          };

          const responseData = mockResponses[path] ?? { error: "Not mocked" };
          const status = (responseData as Record<string, unknown>).error ? 500 : 200;

          res.writeHead(status, { "Content-Type": "application/json" });
          res.end(JSON.stringify(responseData));
        });
      },
    );
    mockServer.listen(0, "127.0.0.1", () => {
      const addr = mockServer.address();
      if (addr && typeof addr !== "string") {
        mockPort = addr.port;
        resolve(mockPort);
      }
    });
  });
}

function stopMockServer(): Promise<void> {
  return new Promise((resolve) => {
    if (mockServer) {
      mockServer.close(() => resolve());
    } else {
      resolve();
    }
  });
}

// ── Helpers ───────────────────────────────────────────────────────

function makeAction(
  overrides: Partial<ExtractedAction> & { action_type: ExtractedAction["action_type"] },
): ExtractedAction {
  return {
    step_number: 1,
    timestamp_s: 0,
    action_type: overrides.action_type,
    operation: overrides.operation ?? overrides.action_type,
    parameters: overrides.parameters ?? {},
    confidence: overrides.confidence ?? 0.9,
    description: overrides.description ?? "test action",
    keyframe_index: overrides.keyframe_index ?? 0,
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────

describe("Fusion360LiveBridgeEngine", () => {
  let engine: Fusion360LiveBridgeEngine;

  // ── Connection Tests ──────────────────────────────────────────

  describe("Connection", () => {
    it("isConnected returns false when no server running", async () => {
      const dead = new Fusion360LiveBridgeEngine("http://127.0.0.1:19999");
      const result = await dead.isConnected();
      expect(result).toBe(false);
    });

    it("getStatus throws when not connected", async () => {
      const dead = new Fusion360LiveBridgeEngine("http://127.0.0.1:19999");
      await expect(dead.getStatus()).rejects.toThrow();
    });

    it("getStatus parses valid response", async () => {
      const port = await startMockServer();
      engine = new Fusion360LiveBridgeEngine(`http://127.0.0.1:${port}`);
      setMockResponse("/status", {
        status: "connected",
        version: "2.0.20000",
        document: "TestDoc",
        component_count: 3,
        body_count: 2,
        timeline_count: 5,
      });
      const status = await engine.getStatus();
      expect(status.status).toBe("connected");
      expect(status.version).toBe("2.0.20000");
      expect(status.document).toBe("TestDoc");
      expect(status.component_count).toBe(3);
      expect(status.body_count).toBe(2);
      await stopMockServer();
    });
  });

  // ── Request Building Tests ────────────────────────────────────

  describe("Request Building", () => {
    beforeEach(async () => {
      const port = await startMockServer();
      engine = new Fusion360LiveBridgeEngine(`http://127.0.0.1:${port}`);
      mockResponses = {};
    });

    afterEach(async () => {
      await stopMockServer();
    });

    it("createSketch sends correct JSON for rectangle", async () => {
      setMockResponse("/sketch", {
        success: true,
        sketch_name: "Sketch1",
        profile_count: 1,
        shapes_created: 1,
      });
      await engine.createSketch({
        plane: "XY",
        shapes: [{
          type: "rectangle",
          width_mm: 50,
          height_mm: 30,
        }],
      });
      expect(lastRequest.path).toBe("/sketch");
      expect(lastRequest.method).toBe("POST");
      expect(lastRequest.body.plane).toBe("XY");
      const shapes = lastRequest.body.shapes as SketchShape[];
      expect(shapes[0].type).toBe("rectangle");
      expect(shapes[0].width_mm).toBe(50);
      expect(shapes[0].height_mm).toBe(30);
    });

    it("createSketch sends correct format for circle", async () => {
      setMockResponse("/sketch", {
        success: true,
        sketch_name: "Sketch2",
        profile_count: 1,
        shapes_created: 1,
      });
      await engine.createSketch({
        plane: "XZ",
        shapes: [{ type: "circle", radius_mm: 25 }],
      });
      expect(lastRequest.body.plane).toBe("XZ");
      const shapes = lastRequest.body.shapes as SketchShape[];
      expect(shapes[0].radius_mm).toBe(25);
    });

    it("extrude sends correct depth and operation", async () => {
      setMockResponse("/extrude", {
        success: true,
        feature_name: "Extrude1",
        body_count: 1,
      });
      await engine.extrude({
        depth_mm: 25,
        operation: "new",
        profile_index: 0,
      });
      expect(lastRequest.path).toBe("/extrude");
      expect(lastRequest.body.depth_mm).toBe(25);
      expect(lastRequest.body.operation).toBe("new");
      expect(lastRequest.body.profile_index).toBe(0);
    });

    it("fillet sends correct radius and edge selection", async () => {
      setMockResponse("/fillet", {
        success: true,
        feature_name: "Fillet1",
        edges_filleted: 4,
      });
      await engine.fillet({
        radius_mm: 3,
        edge_selection: "vertical",
      });
      expect(lastRequest.path).toBe("/fillet");
      expect(lastRequest.body.radius_mm).toBe(3);
      expect(lastRequest.body.edge_selection).toBe("vertical");
    });

    it("chamfer sends correct distance", async () => {
      setMockResponse("/chamfer", {
        success: true,
        feature_name: "Chamfer1",
      });
      await engine.chamfer({ distance_mm: 2, edge_selection: "top" });
      expect(lastRequest.path).toBe("/chamfer");
      expect(lastRequest.body.distance_mm).toBe(2);
      expect(lastRequest.body.edge_selection).toBe("top");
    });

    it("revolve sends angle in degrees", async () => {
      setMockResponse("/revolve", {
        success: true,
        feature_name: "Revolve1",
      });
      await engine.revolve({ angle_deg: 180, axis: "Y" });
      expect(lastRequest.path).toBe("/revolve");
      expect(lastRequest.body.angle_deg).toBe(180);
      expect(lastRequest.body.axis).toBe("Y");
    });

    it("pattern sends count and spacing", async () => {
      setMockResponse("/pattern", {
        success: true,
        feature_name: "Pattern1",
        instance_count: 5,
      });
      await engine.pattern({
        type: "linear",
        count: 5,
        spacing_mm: 15,
        axis: "X",
      });
      expect(lastRequest.path).toBe("/pattern");
      expect(lastRequest.body.type).toBe("linear");
      expect(lastRequest.body.count).toBe(5);
      expect(lastRequest.body.spacing_mm).toBe(15);
    });

    it("exportModel sends format and path", async () => {
      setMockResponse("/export", {
        success: true,
        format: "step",
        path: "C:/output/part.step",
      });
      await engine.exportModel({
        format: "step",
        path: "C:/output/part.step",
      });
      expect(lastRequest.path).toBe("/export");
      expect(lastRequest.body.format).toBe("step");
      expect(lastRequest.body.path).toBe("C:/output/part.step");
    });
  });

  // ── Action Mapping Tests ──────────────────────────────────────

  describe("Action Mapping", () => {
    beforeEach(async () => {
      const port = await startMockServer();
      engine = new Fusion360LiveBridgeEngine(`http://127.0.0.1:${port}`);
      // Default success response for all endpoints
      for (const ep of [
        "/sketch", "/extrude", "/fillet", "/chamfer",
        "/revolve", "/hole", "/pattern", "/combine",
        "/shell", "/geometry",
      ]) {
        setMockResponse(ep, { success: true, feature_name: "F1" });
      }
      setMockResponse("/geometry", {
        body_count: 1,
        bodies: [{
          name: "Body1",
          volume_mm3: 1000,
          area_mm2: 600,
          bounding_box_mm: [10, 10, 10],
          face_count: 6,
          edge_count: 12,
        }],
      });
    });

    afterEach(async () => {
      await stopMockServer();
    });

    it("maps sketch_rectangle to /sketch endpoint", async () => {
      const action = makeAction({
        action_type: "sketch_rectangle",
        parameters: { width_mm: 40, height_mm: 20 },
      });
      const result = await engine.executeActions([action]);
      expect(result.actions_executed).toBe(1);
      expect(result.actions_failed).toBe(0);
    });

    it("maps extrude to /extrude endpoint", async () => {
      const action = makeAction({
        action_type: "extrude",
        parameters: { depth_mm: 15, operation: "new" },
      });
      const result = await engine.executeActions([action]);
      expect(result.actions_executed).toBe(1);
    });

    it("maps fillet to /fillet endpoint", async () => {
      const action = makeAction({
        action_type: "fillet",
        parameters: { radius_mm: 2 },
      });
      const result = await engine.executeActions([action]);
      expect(result.actions_executed).toBe(1);
    });

    it("handles unknown actions gracefully", async () => {
      const action = makeAction({
        action_type: "view_change",
        parameters: {},
      });
      const result = await engine.executeActions([action]);
      expect(result.actions_failed).toBe(1);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0]).toContain("Unsupported action type");
    });

    it("returns per-step results for multi-action sequence", async () => {
      const actions = [
        makeAction({
          step_number: 1,
          action_type: "sketch_rectangle",
          parameters: { width_mm: 50, height_mm: 30 },
        }),
        makeAction({
          step_number: 2,
          action_type: "extrude",
          parameters: { depth_mm: 20 },
        }),
        makeAction({
          step_number: 3,
          action_type: "fillet",
          parameters: { radius_mm: 3 },
        }),
      ];
      const result = await engine.executeActions(actions);
      expect(result.results.length).toBe(3);
      expect(result.actions_executed).toBe(3);
      expect(result.actions_failed).toBe(0);
      expect(result.geometry).not.toBeNull();
      expect(result.geometry!.body_count).toBe(1);
    });
  });

  // ── Response Parsing Tests ────────────────────────────────────

  describe("Response Parsing", () => {
    beforeEach(async () => {
      const port = await startMockServer();
      engine = new Fusion360LiveBridgeEngine(`http://127.0.0.1:${port}`);
      mockResponses = {};
    });

    afterEach(async () => {
      await stopMockServer();
    });

    it("geometry response parsed correctly", async () => {
      setMockResponse("/geometry", {
        body_count: 2,
        bodies: [
          {
            name: "Body1",
            index: 0,
            volume_mm3: 125000,
            area_mm2: 15000,
            bounding_box_mm: [50, 50, 50],
            bounding_box_min_mm: [-25, -25, 0],
            bounding_box_max_mm: [25, 25, 50],
            face_count: 6,
            edge_count: 12,
            vertex_count: 8,
            is_valid: true,
          },
          {
            name: "Body2",
            index: 1,
            volume_mm3: 78540,
            area_mm2: 9425,
            bounding_box_mm: [50, 50, 40],
            bounding_box_min_mm: [-25, -25, 0],
            bounding_box_max_mm: [25, 25, 40],
            face_count: 3,
            edge_count: 2,
            vertex_count: 1,
            is_valid: true,
          },
        ],
      });
      const geo = await engine.getGeometry();
      expect(geo.body_count).toBe(2);
      expect(geo.bodies.length).toBe(2);
      expect(geo.bodies[0].name).toBe("Body1");
      expect(geo.bodies[0].volume_mm3).toBe(125000);
      expect(geo.bodies[0].bounding_box_mm).toEqual([50, 50, 50]);
      expect(geo.bodies[0].face_count).toBe(6);
      expect(geo.bodies[1].name).toBe("Body2");
    });

    it("error response parsed with message", async () => {
      setMockResponse("/extrude", {
        success: false,
        error: "No profiles in sketch",
      });
      // The mock returns 500 for error responses, so it will throw
      await expect(engine.extrude({ depth_mm: 10 })).rejects.toThrow();
    });

    it("undo response parsed", async () => {
      setMockResponse("/undo", { success: true });
      const result = await engine.undo();
      expect(result.success).toBe(true);
    });

    it("export response includes file path", async () => {
      setMockResponse("/export", {
        success: true,
        format: "step",
        path: "C:/output/bracket.step",
      });
      const result = await engine.exportModel({
        format: "step",
        path: "C:/output/bracket.step",
      });
      expect(result.success).toBe(true);
      expect(result.format).toBe("step");
      expect(result.path).toBe("C:/output/bracket.step");
    });
  });

  // ── Additional Coverage ───────────────────────────────────────

  describe("Additional Operations", () => {
    beforeEach(async () => {
      const port = await startMockServer();
      engine = new Fusion360LiveBridgeEngine(`http://127.0.0.1:${port}`);
      mockResponses = {};
    });

    afterEach(async () => {
      await stopMockServer();
    });

    it("newDocument creates a document", async () => {
      setMockResponse("/new", {
        success: true,
        document_name: "MyPart",
        design_type: "parametric",
      });
      const result = await engine.newDocument("MyPart");
      expect(result.success).toBe(true);
      expect(result.document_name).toBe("MyPart");
      expect(lastRequest.body.name).toBe("MyPart");
    });

    it("setParameter sends name and value", async () => {
      setMockResponse("/parameter", {
        success: true,
        action: "created",
        name: "depth",
      });
      const result = await engine.setParameter("depth", 25);
      expect(result.success).toBe(true);
      expect(lastRequest.body.action).toBe("set");
      expect(lastRequest.body.name).toBe("depth");
      expect(lastRequest.body.value_mm).toBe(25);
    });

    it("executeRaw sends code string", async () => {
      setMockResponse("/execute", {
        success: true,
        result: 42,
      });
      const result = await engine.executeRaw("result = 6 * 7");
      expect(result.success).toBe(true);
      expect(result.result).toBe(42);
      expect(lastRequest.body.code).toBe("result = 6 * 7");
    });

    it("isConnected returns true when server responds", async () => {
      setMockResponse("/health", { status: "ok", port: mockPort });
      const connected = await engine.isConnected();
      expect(connected).toBe(true);
    });

    it("shell sends thickness and face selection", async () => {
      setMockResponse("/shell", {
        success: true,
        feature_name: "Shell1",
      });
      await engine.shell({
        thickness_mm: 2,
        face_selection: "top",
      });
      expect(lastRequest.path).toBe("/shell");
      expect(lastRequest.body.thickness_mm).toBe(2);
      expect(lastRequest.body.face_selection).toBe("top");
    });

    it("combine sends operation and body indices", async () => {
      setMockResponse("/combine", {
        success: true,
        feature_name: "Combine1",
      });
      await engine.combine({
        operation: "cut",
        target_body: 0,
        tool_bodies: [1, 2],
      });
      expect(lastRequest.path).toBe("/combine");
      expect(lastRequest.body.operation).toBe("cut");
      expect(lastRequest.body.target_body).toBe(0);
      expect(lastRequest.body.tool_bodies).toEqual([1, 2]);
    });

    it("createHole sends diameter, depth, and position", async () => {
      setMockResponse("/hole", {
        success: true,
        feature_name: "Hole1",
      });
      await engine.createHole({
        diameter_mm: 8,
        depth_mm: 15,
        position: [10, 20],
        type: "counterbore",
      });
      expect(lastRequest.path).toBe("/hole");
      expect(lastRequest.body.diameter_mm).toBe(8);
      expect(lastRequest.body.depth_mm).toBe(15);
      expect(lastRequest.body.position).toEqual([10, 20]);
      expect(lastRequest.body.type).toBe("counterbore");
    });
  });
});
