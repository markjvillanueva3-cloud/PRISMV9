import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  Fusion360LiveBridgeEngine,
  type SketchShape,
  type GeometryResult,
  type OperationResult,
  type CamSetupResult,
  type CamOperationResult,
  type AssignToolResult,
  type ToolpathJobResult,
  type ToolpathStatusResult,
  type PostProcessResult,
  type GeometryDetailResult,
  type FeatureCandidateResult,
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

  // ── CAM Endpoint Tests (F360-AP-MS0) ─────────────────────────────

  describe("CAM Operations", () => {
    beforeEach(async () => {
      const port = await startMockServer();
      engine = new Fusion360LiveBridgeEngine(`http://127.0.0.1:${port}`);
      mockResponses = {};
    });

    afterEach(async () => {
      await stopMockServer();
    });

    it("createCamSetup sends type, bodies, and stock config", async () => {
      const mockResult: CamSetupResult = {
        success: true,
        setup_name: "PRISM-Setup-1",
        setup_index: 0,
        model_count: 1,
        stock_mode: "relative",
      };
      setMockResponse("/cam/setup", mockResult);

      const result = await engine.createCamSetup({
        name: "PRISM-Setup-1",
        type: "milling",
        model_body_indices: [0],
        stock: {
          mode: "relative",
          offset_top_mm: 2,
          offset_sides_mm: 2,
          offset_bottom_mm: 0,
        },
      });

      expect(lastRequest.path).toBe("/cam/setup");
      expect(lastRequest.method).toBe("POST");
      expect(lastRequest.body.type).toBe("milling");
      expect(lastRequest.body.model_body_indices).toEqual([0]);
      expect(result.success).toBe(true);
      expect(result.setup_name).toBe("PRISM-Setup-1");
    });

    it("createCamSetup handles turning type", async () => {
      setMockResponse("/cam/setup", {
        success: true,
        setup_name: "Turn-Setup",
        setup_index: 0,
        model_count: 1,
        stock_mode: "relative",
      });

      await engine.createCamSetup({ type: "turning" });
      expect(lastRequest.body.type).toBe("turning");
    });

    it("createCamSetup with fixed stock dimensions", async () => {
      setMockResponse("/cam/setup", {
        success: true,
        setup_name: "Fixed-Stock",
        setup_index: 0,
        model_count: 1,
        stock_mode: "fixed_size",
      });

      await engine.createCamSetup({
        stock: {
          mode: "fixed_size",
          width_mm: 100,
          height_mm: 50,
          depth_mm: 25,
        },
      });
      expect(lastRequest.body.stock.mode).toBe("fixed_size");
      expect(lastRequest.body.stock.width_mm).toBe(100);
      expect(lastRequest.body.stock.height_mm).toBe(50);
      expect(lastRequest.body.stock.depth_mm).toBe(25);
    });

    it("createCamOperation sends type and parameters", async () => {
      const mockResult: CamOperationResult = {
        success: true,
        operation_name: "Face1",
        operation_type: "face_mill",
        parameters_set: 3,
      };
      setMockResponse("/cam/operation", mockResult);

      const result = await engine.createCamOperation({
        setup_index: 0,
        operation_type: "face_mill",
        parameters: {
          spindle_speed_rpm: 5000,
          feed_cutting_mm_min: 1200,
          max_stepdown_mm: 2.0,
        },
      });

      expect(lastRequest.path).toBe("/cam/operation");
      expect(lastRequest.body.operation_type).toBe("face_mill");
      expect(lastRequest.body.parameters.spindle_speed_rpm).toBe(5000);
      expect(lastRequest.body.parameters.feed_cutting_mm_min).toBe(1200);
      expect(result.success).toBe(true);
      expect(result.operation_type).toBe("face_mill");
    });

    it("createCamOperation supports adaptive clearing", async () => {
      setMockResponse("/cam/operation", {
        success: true,
        operation_name: "Adaptive1",
        operation_type: "adaptive_clear",
        parameters_set: 4,
      });

      await engine.createCamOperation({
        operation_type: "adaptive_clear",
        parameters: {
          spindle_speed_rpm: 8000,
          feed_cutting_mm_min: 2000,
          max_stepdown_mm: 5.0,
          max_stepover_mm: 3.0,
        },
      });
      expect(lastRequest.body.operation_type).toBe("adaptive_clear");
      expect(lastRequest.body.parameters.max_stepover_mm).toBe(3.0);
    });

    it("assignTool sends tool spec with geometry", async () => {
      const mockResult: AssignToolResult = {
        success: true,
        tool_description: "D10 3FL flat end mill",
        source: "created_inline",
      };
      setMockResponse("/cam/assign-tool", mockResult);

      const result = await engine.assignTool({
        operation_name: "Face1",
        tool_spec: {
          diameter_mm: 10,
          type: "flat end mill",
          flute_count: 3,
          flute_length_mm: 30,
          overall_length_mm: 75,
          corner_radius_mm: 0,
        },
      });

      expect(lastRequest.path).toBe("/cam/assign-tool");
      expect(lastRequest.body.tool_spec.diameter_mm).toBe(10);
      expect(lastRequest.body.tool_spec.flute_count).toBe(3);
      expect(result.success).toBe(true);
      expect(result.source).toBe("created_inline");
    });

    it("assignTool with ball end mill", async () => {
      setMockResponse("/cam/assign-tool", {
        success: true,
        tool_description: "D6 2FL ball end mill",
        source: "created_inline",
      });

      await engine.assignTool({
        operation_name: "Scallop1",
        tool_spec: {
          diameter_mm: 6,
          type: "ball end mill",
          flute_count: 2,
          flute_length_mm: 18,
          overall_length_mm: 50,
        },
      });
      expect(lastRequest.body.tool_spec.type).toBe("ball end mill");
      expect(lastRequest.body.tool_spec.diameter_mm).toBe(6);
    });

    it("generateToolpaths returns job_id for async polling", async () => {
      const mockResult: ToolpathJobResult = {
        success: true,
        job_id: "tp-1234567890",
        status: "generating",
        operations_queued: 3,
      };
      setMockResponse("/cam/toolpath", mockResult);

      const result = await engine.generateToolpaths({
        generate_all: true,
      });

      expect(lastRequest.path).toBe("/cam/toolpath");
      expect(result.success).toBe(true);
      expect(result.job_id).toBe("tp-1234567890");
      expect(result.status).toBe("generating");
    });

    it("generateToolpaths for specific operations", async () => {
      setMockResponse("/cam/toolpath", {
        success: true,
        job_id: "tp-9999",
        status: "generating",
        operations_queued: 1,
      });

      await engine.generateToolpaths({
        setup_name: "Setup1",
        operation_names: ["Face1"],
        generate_all: false,
      });
      expect(lastRequest.body.generate_all).toBe(false);
      expect(lastRequest.body.operation_names).toEqual(["Face1"]);
    });

    it("getToolpathStatus returns completion state", async () => {
      const mockResult: ToolpathStatusResult = {
        job_id: "tp-1234567890",
        status: "complete",
        elapsed_sec: 12.5,
      };
      setMockResponse("/cam/toolpath/status?job_id=tp-1234567890", mockResult);

      const result = await engine.getToolpathStatus("tp-1234567890");
      expect(result.job_id).toBe("tp-1234567890");
      expect(result.status).toBe("complete");
      expect(result.elapsed_sec).toBe(12.5);
    });

    it("postProcess sends CPS path and output config", async () => {
      const mockResult: PostProcessResult = {
        success: true,
        output_file: "C:/temp/O1001.nc",
        program_name: "O1001",
        line_count: 250,
      };
      setMockResponse("/cam/post", mockResult);

      const result = await engine.postProcess({
        post_processor_path: "C:/Posts/fanuc.cps",
        program_name: "O1001",
        output_folder: "C:/temp",
        output_units: "mm",
      });

      expect(lastRequest.path).toBe("/cam/post");
      expect(lastRequest.body.post_processor_path).toBe("C:/Posts/fanuc.cps");
      expect(lastRequest.body.program_name).toBe("O1001");
      expect(result.success).toBe(true);
      expect(result.line_count).toBe(250);
    });
  });

  // ── B-Rep Geometry + Feature Tests ─────────────────────────────────

  describe("Geometry and Feature Extraction", () => {
    beforeEach(async () => {
      const port = await startMockServer();
      engine = new Fusion360LiveBridgeEngine(`http://127.0.0.1:${port}`);
      mockResponses = {};
    });

    afterEach(async () => {
      await stopMockServer();
    });

    it("getGeometryDetail returns face-level B-Rep data", async () => {
      const mockResult: GeometryDetailResult = {
        body_count: 1,
        faces: [
          {
            index: 0,
            surface_type: "plane",
            area_mm2: 2500,
            normal: [0, 0, 1],
          },
          {
            index: 1,
            surface_type: "cylinder",
            area_mm2: 628.3,
            radius_mm: 5.0,
            axis: [0, 0, 1],
            is_hole: true,
          },
        ],
        grouped_by_type: { planar: 1, cylindrical: 1, other: 0 },
      };
      setMockResponse("/cam/geometry-detail", mockResult);

      const result = await engine.getGeometryDetail();
      expect(result.body_count).toBe(1);
      expect(result.faces).toHaveLength(2);
      expect(result.faces[0].surface_type).toBe("plane");
      expect(result.faces[0].normal).toEqual([0, 0, 1]);
      expect(result.faces[1].surface_type).toBe("cylinder");
      expect(result.faces[1].radius_mm).toBe(5.0);
      expect(result.faces[1].is_hole).toBe(true);
      expect(result.grouped_by_type.planar).toBe(1);
    });

    it("getFeatureCandidates returns classified features", async () => {
      const mockResult: FeatureCandidateResult = {
        features: [
          {
            type: "through_hole",
            faces: [1, 2],
            radius_mm: 5.0,
            depth_mm: 25.0,
            is_through: true,
          },
          {
            type: "planar_face",
            faces: [0],
            area_mm2: 2500,
          },
        ],
        complexity_score: 3.5,
        estimated_operations: 3,
      };
      setMockResponse("/cam/feature-candidates", mockResult);

      const result = await engine.getFeatureCandidates();
      expect(result.features).toHaveLength(2);
      expect(result.features[0].type).toBe("through_hole");
      expect(result.features[0].radius_mm).toBe(5.0);
      expect(result.features[0].is_through).toBe(true);
      expect(result.features[1].type).toBe("planar_face");
      expect(result.complexity_score).toBe(3.5);
    });
  });

  // ── Cloud Library Tests ────────────────────────────────────────────

  describe("Cloud Library Access", () => {
    beforeEach(async () => {
      const port = await startMockServer();
      engine = new Fusion360LiveBridgeEngine(`http://127.0.0.1:${port}`);
      mockResponses = {};
    });

    afterEach(async () => {
      await stopMockServer();
    });

    it("listDataProjects returns project list", async () => {
      setMockResponse("/data/projects", {
        projects: [
          { id: "proj-1", name: "Shop Parts", index: 0 },
          { id: "proj-2", name: "Customer Jobs", index: 1 },
        ],
        count: 2,
      });

      const result = await engine.listDataProjects();
      expect(result.count).toBe(2);
      expect(result.projects[0].name).toBe("Shop Parts");
      expect(result.projects[1].name).toBe("Customer Jobs");
    });

    it("searchCloudFiles sends query with extension filter", async () => {
      setMockResponse("/data/search", {
        results: [
          { name: "bracket.f3d", id: "file-1", project: "Shop Parts", path: "Parts" },
        ],
        count: 1,
        query: "bracket",
      });

      const result = await engine.searchCloudFiles("bracket", "f3d");
      expect(lastRequest.path).toBe("/data/search");
      expect(lastRequest.body.query).toBe("bracket");
      expect(lastRequest.body.extension).toBe("f3d");
      expect(result.count).toBe(1);
      expect(result.results[0].name).toBe("bracket.f3d");
    });

    it("searchCloudFiles without extension filter", async () => {
      setMockResponse("/data/search", {
        results: [],
        count: 0,
        query: "nonexistent",
      });

      const result = await engine.searchCloudFiles("nonexistent");
      expect(result.count).toBe(0);
      expect(result.results).toEqual([]);
    });

    it("getFileMetadata returns design and CAM info", async () => {
      setMockResponse("/data/file/metadata", {
        document_name: "bracket",
        design: {
          body_count: 1,
          occurrence_count: 0,
          sketch_count: 3,
          feature_count: 8,
          parameter_count: 12,
          bodies: [{
            name: "Body1",
            volume_mm3: 15000,
            area_mm2: 8500,
            face_count: 26,
            edge_count: 48,
          }],
        },
        cam: {
          has_cam: true,
          setup_count: 1,
          setups: [{
            name: "Setup1",
            type: "MillingOperation",
            operations: [{
              name: "Face1",
              type: "face",
              tool: { description: "D50 face mill", diameter_mm: 50 },
              speed_feed: { rpm: 3000, feed_mm_min: 800, stepdown_mm: 2 },
            }],
          }],
        },
      });

      const result = await engine.getFileMetadata();
      expect(result.document_name).toBe("bracket");
      expect(result.design.body_count).toBe(1);
      expect(result.cam.has_cam).toBe(true);
      expect(result.cam.setups[0].operations[0].name).toBe("Face1");
    });
  });

  // ── Health Check & Resilience Tests ────────────────────────────────

  describe("Health Check and Resilience", () => {
    it("healthCheck returns true when server responds", async () => {
      const port = await startMockServer();
      engine = new Fusion360LiveBridgeEngine(`http://127.0.0.1:${port}`);
      setMockResponse("/health", { status: "ok", port: 18360 });

      const healthy = await engine.healthCheck();
      expect(healthy).toBe(true);
      await stopMockServer();
    });

    it("healthCheck returns false when server is down", async () => {
      const dead = new Fusion360LiveBridgeEngine("http://127.0.0.1:19999");
      const healthy = await dead.healthCheck();
      expect(healthy).toBe(false);
    });

    it("isConnected caches health check result", async () => {
      const port = await startMockServer();
      engine = new Fusion360LiveBridgeEngine(`http://127.0.0.1:${port}`);
      setMockResponse("/health", { status: "ok", port: 18360 });

      const first = await engine.isConnected();
      const second = await engine.isConnected();
      expect(first).toBe(true);
      expect(second).toBe(true);
      await stopMockServer();
    });
  });
});

// importStep (U-DELTA-FUSION-STEP-IMPORT-KERNELBBOX, slot:delta 2026-06-29)
// importStep forwards to POST /import so the existing /geometry returns Fusion's KERNEL bbox of a real
// imported CAD part (the authoritative envelope, units resolved natively -- resolves the ~9.5% of corpus
// STEP parts whose point-cloud bbox is degenerate). These tests pin the request contract (path + optional
// format) + the honest assembly edge (bodies_imported:0) against a local mock server (no live Fusion; the
// live /import add-in route loads only after an operator add-in reload).
describe("Fusion360LiveBridgeEngine.importStep", () => {
  let importServer: Server;
  let lastImportBody: Record<string, unknown> = {};

  function startImportServer(resp: Record<string, unknown>): Promise<number> {
    return new Promise((resolve) => {
      importServer = createServer((req: IncomingMessage, res: ServerResponse) => {
        let body = "";
        req.on("data", (c: Buffer) => { body += c.toString(); });
        req.on("end", () => {
          const path = (req.url ?? "/").split("?")[0];
          if (path === "/import" && req.method === "POST") {
            lastImportBody = body ? (JSON.parse(body) as Record<string, unknown>) : {};
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify(resp));
          } else {
            res.writeHead(404);
            res.end(JSON.stringify({ error: `unknown ${path}` }));
          }
        });
      });
      importServer.listen(0, "127.0.0.1", () => {
        const addr = importServer.address();
        if (addr && typeof addr !== "string") resolve(addr.port);
      });
    });
  }
  afterEach(() => new Promise<void>((r) => (importServer ? importServer.close(() => r()) : r())));

  const okResp = { success: true, format: "step", path: "x", bodies_imported: 1, body_count: 1 };

  it("POSTs exactly {path} to /import and returns the add-in result (bodies_imported)", async () => {
    const port = await startImportServer(okResp);
    const engine = new Fusion360LiveBridgeEngine(`http://127.0.0.1:${port}`);
    const r = await engine.importStep({ path: "H:/PRISM/JM DIE/casing.step" });
    expect(r.success).toBe(true);
    expect((r as Record<string, unknown>).bodies_imported).toBe(1);
    expect(lastImportBody).toEqual({ path: "H:/PRISM/JM DIE/casing.step" });
  });

  it("passes an explicit format override through to the add-in", async () => {
    const port = await startImportServer(okResp);
    const engine = new Fusion360LiveBridgeEngine(`http://127.0.0.1:${port}`);
    await engine.importStep({ path: "/parts/p.iges", format: "iges" });
    expect(lastImportBody).toEqual({ path: "/parts/p.iges", format: "iges" });
  });

  it("omits format when not given so the add-in infers it from the extension", async () => {
    const port = await startImportServer(okResp);
    const engine = new Fusion360LiveBridgeEngine(`http://127.0.0.1:${port}`);
    await engine.importStep({ path: "/parts/p.stp" });
    expect("format" in lastImportBody).toBe(false);
  });

  it("surfaces bodies_imported:0 for an assembly import (occurrences, not root bodies) WITHOUT failing (R12)", async () => {
    const port = await startImportServer({ success: true, format: "step", path: "x", bodies_imported: 0, body_count: 0 });
    const engine = new Fusion360LiveBridgeEngine(`http://127.0.0.1:${port}`);
    const r = await engine.importStep({ path: "/parts/assembly.step" });
    expect(r.success).toBe(true);
    expect((r as Record<string, unknown>).bodies_imported).toBe(0);
  });
});
