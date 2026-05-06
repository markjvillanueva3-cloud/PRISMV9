import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Fusion360LiveBridgeEngine } from "../engines/Fusion360LiveBridgeEngine.js";
import { createServer, type Server, type IncomingMessage, type ServerResponse } from "http";

// ── Mock HTTP Server (records bodies sent to /execute) ─────────────

let mockServer: Server;
let lastExecuteCode = "";

function startMockServer(executeResponse: Record<string, unknown>): Promise<number> {
  return new Promise((resolve) => {
    mockServer = createServer((req: IncomingMessage, res: ServerResponse) => {
      let body = "";
      req.on("data", (c: Buffer) => { body += c.toString(); });
      req.on("end", () => {
        const path = req.url ?? "/";
        if (path === "/execute" && req.method === "POST") {
          const parsed = body ? JSON.parse(body) as { code: string } : { code: "" };
          lastExecuteCode = parsed.code;
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(executeResponse));
        } else {
          res.writeHead(404);
          res.end();
        }
      });
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

// ──────────────────────────────────────────────────────────────────
// extrudeTapered
// ──────────────────────────────────────────────────────────────────

describe("Fusion360LiveBridgeEngine.extrudeTapered", () => {
  let engine: Fusion360LiveBridgeEngine;

  describe("Input validation", () => {
    beforeEach(() => {
      engine = new Fusion360LiveBridgeEngine("http://127.0.0.1:19999");
    });

    it("rejects empty sketch_name", async () => {
      const r = await engine.extrudeTapered({ sketch_name: "", depth_mm: 10, taper_angle_deg: 1 });
      expect(r.success).toBe(false);
      expect(r.error).toMatch(/sketch_name/);
    });

    it("rejects zero depth", async () => {
      const r = await engine.extrudeTapered({ sketch_name: "Sk", depth_mm: 0, taper_angle_deg: 1 });
      expect(r.success).toBe(false);
      expect(r.error).toMatch(/depth_mm must be > 0/);
    });

    it("rejects negative depth", async () => {
      const r = await engine.extrudeTapered({ sketch_name: "Sk", depth_mm: -5, taper_angle_deg: 1 });
      expect(r.success).toBe(false);
      expect(r.error).toMatch(/depth_mm must be > 0/);
    });

    it("rejects taper_angle ≥ 89°", async () => {
      const r = await engine.extrudeTapered({ sketch_name: "Sk", depth_mm: 10, taper_angle_deg: 90 });
      expect(r.success).toBe(false);
      expect(r.error).toMatch(/taper_angle_deg/);
    });

    it("rejects taper_angle ≤ -89°", async () => {
      const r = await engine.extrudeTapered({ sketch_name: "Sk", depth_mm: 10, taper_angle_deg: -89 });
      expect(r.success).toBe(false);
      expect(r.error).toMatch(/taper_angle_deg/);
    });

    it("rejects NaN taper_angle", async () => {
      const r = await engine.extrudeTapered({ sketch_name: "Sk", depth_mm: 10, taper_angle_deg: NaN });
      expect(r.success).toBe(false);
      expect(r.error).toMatch(/taper_angle_deg/);
    });
  });

  describe("Python emission", () => {
    beforeEach(async () => {
      const port = await startMockServer({
        success: true,
        result: { success: true, feature_name: "Extrude1", body_count: 1 },
      });
      engine = new Fusion360LiveBridgeEngine(`http://127.0.0.1:${port}`);
      lastExecuteCode = "";
    });
    afterEach(async () => { await stopMockServer(); });

    it("emits taperAngle in radians (1° → 0.017453 rad)", async () => {
      const r = await engine.extrudeTapered({
        sketch_name: "TestSk",
        depth_mm: 10,
        taper_angle_deg: 1,
      });
      expect(r.success).toBe(true);
      // 1° → π/180 ≈ 0.017453292519943295
      expect(lastExecuteCode).toContain("ext_in.taperAngle = adsk.core.ValueInput.createByReal(0.017453)");
    });

    it("emits taperAngle for 8° base chamfer (extrude punch)", async () => {
      const r = await engine.extrudeTapered({
        sketch_name: "BaseFlange",
        depth_mm: 5,
        taper_angle_deg: 8,
      });
      expect(r.success).toBe(true);
      // 8° → 0.139626 rad
      expect(lastExecuteCode).toContain("ext_in.taperAngle = adsk.core.ValueInput.createByReal(0.139626)");
    });

    it("converts depth_mm to cm (10mm → 1cm)", async () => {
      const r = await engine.extrudeTapered({
        sketch_name: "Sk",
        depth_mm: 10,
        taper_angle_deg: 1,
      });
      expect(r.success).toBe(true);
      expect(lastExecuteCode).toContain("createByReal(1.000000)");
    });

    it("reversed=true negates depth", async () => {
      const r = await engine.extrudeTapered({
        sketch_name: "Sk",
        depth_mm: 10,
        taper_angle_deg: 1,
        reversed: true,
      });
      expect(r.success).toBe(true);
      expect(lastExecuteCode).toContain("createByReal(-1.000000)");
    });

    it("operation=cut maps to CutFeatureOperation", async () => {
      const r = await engine.extrudeTapered({
        sketch_name: "Sk",
        depth_mm: 10,
        taper_angle_deg: 1,
        operation: "cut",
      });
      expect(r.success).toBe(true);
      expect(lastExecuteCode).toContain("CutFeatureOperation");
    });

    it("default operation is NewBodyFeatureOperation", async () => {
      const r = await engine.extrudeTapered({
        sketch_name: "Sk",
        depth_mm: 10,
        taper_angle_deg: 1,
      });
      expect(r.success).toBe(true);
      expect(lastExecuteCode).toContain("NewBodyFeatureOperation");
    });

    it("sanitises sketch_name (only alnum + underscore)", async () => {
      const r = await engine.extrudeTapered({
        sketch_name: "Punch-2475/037 Profile!",
        depth_mm: 10,
        taper_angle_deg: 1,
      });
      expect(r.success).toBe(true);
      expect(lastExecuteCode).toContain("'Punch_2475_037_Profile_'");
    });

    it("profile_index threads through to Python", async () => {
      const r = await engine.extrudeTapered({
        sketch_name: "Sk",
        depth_mm: 10,
        taper_angle_deg: 1,
        profile_index: 2,
      });
      expect(r.success).toBe(true);
      expect(lastExecuteCode).toContain("target_sk.profiles.item(2)");
    });
  });

  describe("End-to-end through mock server", () => {
    beforeEach(async () => {
      const port = await startMockServer({
        success: true,
        result: { success: true, feature_name: "Extrude1", body_count: 1 },
      });
      engine = new Fusion360LiveBridgeEngine(`http://127.0.0.1:${port}`);
    });
    afterEach(async () => { await stopMockServer(); });

    it("returns success with feature_name from server", async () => {
      const r = await engine.extrudeTapered({
        sketch_name: "Sk",
        depth_mm: 5,
        taper_angle_deg: 3,
      });
      expect(r.success).toBe(true);
      expect(r.feature_name).toBe("Extrude1");
      expect(r.body_count).toBe(1);
    });
  });
});

// ──────────────────────────────────────────────────────────────────
// crossDrillHoles
// ──────────────────────────────────────────────────────────────────

describe("Fusion360LiveBridgeEngine.crossDrillHoles", () => {
  let engine: Fusion360LiveBridgeEngine;

  describe("Input validation", () => {
    beforeEach(() => {
      engine = new Fusion360LiveBridgeEngine("http://127.0.0.1:19999");
    });

    it("rejects zero diameter", async () => {
      const r = await engine.crossDrillHoles({ diameter_mm: 0, axial_position_mm: 10, part_radius_mm: 5 });
      expect(r.success).toBe(false);
      expect(r.error).toMatch(/diameter_mm/);
    });

    it("rejects negative part_radius_mm", async () => {
      const r = await engine.crossDrillHoles({ diameter_mm: 1, axial_position_mm: 10, part_radius_mm: -1 });
      expect(r.success).toBe(false);
      expect(r.error).toMatch(/part_radius_mm/);
    });

    it("rejects count of 0", async () => {
      const r = await engine.crossDrillHoles({ diameter_mm: 1, axial_position_mm: 10, part_radius_mm: 5, count: 0 });
      expect(r.success).toBe(false);
      expect(r.error).toMatch(/count/);
    });

    it("rejects count > 64", async () => {
      const r = await engine.crossDrillHoles({ diameter_mm: 1, axial_position_mm: 10, part_radius_mm: 5, count: 65 });
      expect(r.success).toBe(false);
      expect(r.error).toMatch(/count/);
    });

    it("rejects non-finite axial_position_mm", async () => {
      const r = await engine.crossDrillHoles({ diameter_mm: 1, axial_position_mm: NaN, part_radius_mm: 5 });
      expect(r.success).toBe(false);
      expect(r.error).toMatch(/axial_position_mm/);
    });

    it("rejects invalid revolution_axis", async () => {
      const r = await engine.crossDrillHoles({
        diameter_mm: 1, axial_position_mm: 10, part_radius_mm: 5,
        revolution_axis: "Q" as never,
      });
      expect(r.success).toBe(false);
      expect(r.error).toMatch(/revolution_axis/);
    });
  });

  describe("Python emission", () => {
    beforeEach(async () => {
      const port = await startMockServer({
        success: true,
        result: { success: true, feature_name: "Extrude1", body_count: 1, holes_made: 1 },
      });
      engine = new Fusion360LiveBridgeEngine(`http://127.0.0.1:${port}`);
      lastExecuteCode = "";
    });
    afterEach(async () => { await stopMockServer(); });

    it("emits CutFeatureOperation (cross-drills cut, never add)", async () => {
      const r = await engine.crossDrillHoles({
        diameter_mm: 1.524,  // Ø.06"
        axial_position_mm: 50,
        part_radius_mm: 12,
      });
      expect(r.success).toBe(true);
      expect(lastExecuteCode).toContain("CutFeatureOperation");
    });

    it("revolution_axis=Y (default) sketches on xYConstructionPlane and patterns around yConstructionAxis", async () => {
      const r = await engine.crossDrillHoles({
        diameter_mm: 1.27,
        axial_position_mm: 30,
        part_radius_mm: 10,
        count: 2,
      });
      expect(r.success).toBe(true);
      expect(lastExecuteCode).toContain("root.xYConstructionPlane");
      expect(lastExecuteCode).toContain("root.yConstructionAxis");
    });

    it("revolution_axis=X sketches on xZConstructionPlane", async () => {
      const r = await engine.crossDrillHoles({
        diameter_mm: 1, axial_position_mm: 10, part_radius_mm: 5,
        revolution_axis: "X",
      });
      expect(r.success).toBe(true);
      expect(lastExecuteCode).toContain("root.xZConstructionPlane");
      expect(lastExecuteCode).toContain("root.xConstructionAxis");
    });

    it("revolution_axis=Z sketches on yZConstructionPlane", async () => {
      const r = await engine.crossDrillHoles({
        diameter_mm: 1, axial_position_mm: 10, part_radius_mm: 5,
        revolution_axis: "Z",
      });
      expect(r.success).toBe(true);
      expect(lastExecuteCode).toContain("root.yZConstructionPlane");
      expect(lastExecuteCode).toContain("root.zConstructionAxis");
    });

    it("converts mm → cm (Ø.06\" = 1.524mm → r=0.0762cm)", async () => {
      const r = await engine.crossDrillHoles({
        diameter_mm: 1.524,
        axial_position_mm: 30,
        part_radius_mm: 12,
      });
      expect(r.success).toBe(true);
      expect(lastExecuteCode).toContain("addByCenterRadius");
      expect(lastExecuteCode).toContain("0.076200");  // r=0.0762cm
    });

    it("cut depth = 2.2 × part_radius_cm (10% over-travel for through-cut)", async () => {
      const r = await engine.crossDrillHoles({
        diameter_mm: 1, axial_position_mm: 0, part_radius_mm: 10,
      });
      expect(r.success).toBe(true);
      // partR=1cm × 2.2 = 2.2cm
      expect(lastExecuteCode).toContain("createByReal(2.200000)");
    });

    it("count=1 gates pattern behind 'if 1 > 1' (no-op at runtime)", async () => {
      const r = await engine.crossDrillHoles({
        diameter_mm: 1, axial_position_mm: 10, part_radius_mm: 5,
        count: 1,
      });
      expect(r.success).toBe(true);
      // Pattern emission is template-uniform, gated by Python `if count > 1:` so
      // count=1 path never executes the pattern at runtime.
      expect(lastExecuteCode).toContain("if 1 > 1:");
    });

    it("count>1 emits circularPatternFeatures with quantity and 360 deg", async () => {
      const r = await engine.crossDrillHoles({
        diameter_mm: 1, axial_position_mm: 10, part_radius_mm: 5,
        count: 4,
      });
      expect(r.success).toBe(true);
      expect(lastExecuteCode).toContain("circularPatternFeatures.createInput");
      expect(lastExecuteCode).toContain("createByReal(4)");
      expect(lastExecuteCode).toContain("'360 deg'");
    });

    it("offsets sketch plane by -part_radius so cut originates at surface", async () => {
      const r = await engine.crossDrillHoles({
        diameter_mm: 1, axial_position_mm: 10, part_radius_mm: 8,
      });
      expect(r.success).toBe(true);
      // partR_cm = 0.8 → offset = -0.8
      expect(lastExecuteCode).toContain("setByOffset(root.xYConstructionPlane, adsk.core.ValueInput.createByReal(-0.800000))");
    });
  });

  describe("End-to-end through mock server", () => {
    beforeEach(async () => {
      const port = await startMockServer({
        success: true,
        result: { success: true, feature_name: "Extrude1", body_count: 1, holes_made: 4 },
      });
      engine = new Fusion360LiveBridgeEngine(`http://127.0.0.1:${port}`);
    });
    afterEach(async () => { await stopMockServer(); });

    it("returns success with feature_name from server (4 cross-drilled relief holes)", async () => {
      const r = await engine.crossDrillHoles({
        diameter_mm: 1.524,
        axial_position_mm: 25,
        part_radius_mm: 11.94,
        count: 4,
      });
      expect(r.success).toBe(true);
      expect(r.feature_name).toBe("Extrude1");
      expect(r.body_count).toBe(1);
    });
  });
});
