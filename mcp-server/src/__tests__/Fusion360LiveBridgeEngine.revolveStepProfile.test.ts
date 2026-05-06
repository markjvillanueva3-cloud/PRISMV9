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

describe("Fusion360LiveBridgeEngine.revolveStepProfile", () => {
  let engine: Fusion360LiveBridgeEngine;

  describe("Input validation", () => {
    beforeEach(() => {
      engine = new Fusion360LiveBridgeEngine("http://127.0.0.1:19999");
    });

    it("rejects empty steps array", async () => {
      const r = await engine.revolveStepProfile({ steps: [] });
      expect(r.success).toBe(false);
      expect(r.error).toMatch(/non-empty/);
    });

    it("rejects zero diameter", async () => {
      const r = await engine.revolveStepProfile({ steps: [{ diameter_mm: 0, length_mm: 10 }] });
      expect(r.success).toBe(false);
      expect(r.error).toMatch(/diameter_mm must be > 0/);
    });

    it("rejects negative length", async () => {
      const r = await engine.revolveStepProfile({ steps: [{ diameter_mm: 10, length_mm: -1 }] });
      expect(r.success).toBe(false);
      expect(r.error).toMatch(/length_mm must be > 0/);
    });

    it("rejects negative end_diameter_mm", async () => {
      const r = await engine.revolveStepProfile({ steps: [{ diameter_mm: 10, length_mm: 5, end_diameter_mm: -1 }] });
      expect(r.success).toBe(false);
      expect(r.error).toMatch(/end_diameter_mm must be > 0/);
    });

    it("rejects invalid axis", async () => {
      const r = await engine.revolveStepProfile({
        steps: [{ diameter_mm: 10, length_mm: 5 }],
        axis: "Q" as never,
      });
      expect(r.success).toBe(false);
      expect(r.error).toMatch(/axis must be X\|Y\|Z/);
    });
  });

  describe("Profile point generation", () => {
    beforeEach(async () => {
      const port = await startMockServer({
        success: true,
        result: { success: true, feature_name: "Revolve1", body_count: 1, profile_points: 4 },
      });
      engine = new Fusion360LiveBridgeEngine(`http://127.0.0.1:${port}`);
      lastExecuteCode = "";
    });
    afterEach(async () => { await stopMockServer(); });

    it("single cylindrical step builds 4-point closed profile (mm→cm conversion)", async () => {
      // Ø10mm × 20mm long → r=0.5cm, L=2cm
      // Profile: (0,0) → (0.5, 0) → (0.5, 2) → (0, 2) → close
      const r = await engine.revolveStepProfile({
        steps: [{ diameter_mm: 10, length_mm: 20 }],
        axis: "Y",
      });
      expect(r.success).toBe(true);
      // Verify point coordinates emitted in cm with axis="Y" → Point3D(r, axial, 0)
      expect(lastExecuteCode).toContain("p0 = adsk.core.Point3D.create(0.000000, 0.000000, 0)");
      expect(lastExecuteCode).toContain("p1 = adsk.core.Point3D.create(0.500000, 0.000000, 0)");
      expect(lastExecuteCode).toContain("p2 = adsk.core.Point3D.create(0.500000, 2.000000, 0)");
      expect(lastExecuteCode).toContain("p3 = adsk.core.Point3D.create(0.000000, 2.000000, 0)");
      expect(lastExecuteCode).toContain("yConstructionAxis");
      expect(lastExecuteCode).toContain("xYConstructionPlane");
    });

    it("tapered single step: end_diameter ≠ diameter produces angled segment", async () => {
      // Cone: Ø10 → Ø2 over 8mm length → r 0.5 → 0.1 cm over 0.8 cm axial
      const r = await engine.revolveStepProfile({
        steps: [{ diameter_mm: 10, length_mm: 8, end_diameter_mm: 2 }],
        axis: "Y",
      });
      expect(r.success).toBe(true);
      expect(lastExecuteCode).toContain("p1 = adsk.core.Point3D.create(0.500000, 0.000000, 0)");
      expect(lastExecuteCode).toContain("p2 = adsk.core.Point3D.create(0.100000, 0.800000, 0)");
    });

    it("two cylindrical steps with diameter step inserts radial step face", async () => {
      // Step 1: Ø20 × 10mm  Step 2: Ø10 × 15mm
      // Expected pts: (0,0) → (1,0) → (1,1) → (0.5,1) [step face] → (0.5, 2.5) → (0, 2.5)
      const r = await engine.revolveStepProfile({
        steps: [
          { diameter_mm: 20, length_mm: 10 },
          { diameter_mm: 10, length_mm: 15 },
        ],
        axis: "Y",
      });
      expect(r.success).toBe(true);
      expect(lastExecuteCode).toContain("p3 = adsk.core.Point3D.create(0.500000, 1.000000, 0)");  // step face vertex
      expect(lastExecuteCode).toContain("p4 = adsk.core.Point3D.create(0.500000, 2.500000, 0)");  // end of step 2
    });

    it("axis=Z places radial in X, axial in Z, uses xZConstructionPlane + zConstructionAxis", async () => {
      const r = await engine.revolveStepProfile({
        steps: [{ diameter_mm: 10, length_mm: 20 }],
        axis: "Z",
      });
      expect(r.success).toBe(true);
      expect(lastExecuteCode).toContain("xZConstructionPlane");
      expect(lastExecuteCode).toContain("zConstructionAxis");
      // axis=Z: Point3D.create(r, 0, axial)
      expect(lastExecuteCode).toContain("p2 = adsk.core.Point3D.create(0.500000, 0, 2.000000)");
    });

    it("axis=X places axial in X, radial in Y, uses xConstructionAxis", async () => {
      const r = await engine.revolveStepProfile({
        steps: [{ diameter_mm: 10, length_mm: 20 }],
        axis: "X",
      });
      expect(r.success).toBe(true);
      expect(lastExecuteCode).toContain("xConstructionAxis");
      // axis=X: Point3D.create(axial, r, 0)
      expect(lastExecuteCode).toContain("p2 = adsk.core.Point3D.create(2.000000, 0.500000, 0)");
    });

    it("custom sketch_name sanitised (only alnum + underscore)", async () => {
      const r = await engine.revolveStepProfile({
        steps: [{ diameter_mm: 10, length_mm: 20 }],
        sketch_name: "Punch-2475/037 Profile!",
      });
      expect(r.success).toBe(true);
      expect(lastExecuteCode).toContain("sk.name = 'Punch_2475_037_Profile_'");
    });

    it("default sketch name when omitted", async () => {
      const r = await engine.revolveStepProfile({ steps: [{ diameter_mm: 10, length_mm: 20 }] });
      expect(r.success).toBe(true);
      expect(lastExecuteCode).toContain("sk.name = 'RevolveProfile'");
    });
  });

  describe("End-to-end through mock server", () => {
    beforeEach(async () => {
      const port = await startMockServer({
        success: true,
        result: { success: true, feature_name: "Revolve1", body_count: 1 },
      });
      engine = new Fusion360LiveBridgeEngine(`http://127.0.0.1:${port}`);
    });
    afterEach(async () => { await stopMockServer(); });

    it("returns success with feature_name and body_count from server", async () => {
      const r = await engine.revolveStepProfile({
        steps: [
          { diameter_mm: 23.876, length_mm: 8.339 },  // Ø.94 head × .328"
          { diameter_mm: 21.844, length_mm: 46.568 }, // Ø.86 shank
          { diameter_mm: 12.7, length_mm: 40.029 },   // Ø.5 mid
          { diameter_mm: 1.778, length_mm: 0.889 },   // Ø.07 groove
          { diameter_mm: 3.048, length_mm: 8.572 },   // Ø.12 back
        ],
      });
      expect(r.success).toBe(true);
      expect(r.feature_name).toBe("Revolve1");
      expect(r.body_count).toBe(1);
      // Profile points: (0,0) + (r0, 0) + (r0, z0) + 4 step faces + 4 step ends + (0, total) = 12
      expect(r.profile_points).toBe(12);
    });

    it("propagates server-side error in result.error", async () => {
      // Override response inside this test
      await stopMockServer();
      const port = await startMockServer({
        success: true,
        result: { success: false, error: "expected 1 profile, got 2 (check for self-intersection)" },
      });
      engine = new Fusion360LiveBridgeEngine(`http://127.0.0.1:${port}`);
      const r = await engine.revolveStepProfile({ steps: [{ diameter_mm: 10, length_mm: 5 }] });
      expect(r.success).toBe(false);
      expect(r.error).toMatch(/self-intersection/);
    });
  });
});
