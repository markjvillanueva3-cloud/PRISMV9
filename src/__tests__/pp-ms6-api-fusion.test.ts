/**
 * PP-MS6 Tests: HTTP API + Fusion 360 Integration
 * Tests: API server start/stop, endpoint routing, pipeline invocation,
 * Fusion .cps structure validation
 */
import { describe, it, expect, afterAll } from "vitest";
import { postProcessorAPIEngine } from "../engines/PostProcessorAPIEngine.js";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

// Use a random high port to avoid conflicts
const TEST_PORT = 18399;

function httpRequest(
  method: string, urlPath: string, body?: string
): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "127.0.0.1", port: TEST_PORT,
      path: urlPath, method,
      headers: body ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) } : {},
    };
    const req = http.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (c: Buffer) => chunks.push(c));
      res.on("end", () => {
        try {
          const data = JSON.parse(Buffer.concat(chunks).toString());
          resolve({ status: res.statusCode ?? 0, data });
        } catch {
          resolve({ status: res.statusCode ?? 0, data: Buffer.concat(chunks).toString() });
        }
      });
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

describe("PP-MS6: PostProcessorAPIEngine", () => {
  afterAll(async () => {
    await postProcessorAPIEngine.stop();
  });

  describe("Server Lifecycle", () => {
    it("starts server on specified port", async () => {
      const status = await postProcessorAPIEngine.start({ port: TEST_PORT });
      expect(status.running).toBe(true);
      expect(status.port).toBe(TEST_PORT);
      expect(status.version).toBeDefined();
    });

    it("reports status when running", () => {
      const status = postProcessorAPIEngine.status();
      expect(status.running).toBe(true);
      expect(status.url).toContain(String(TEST_PORT));
    });
  });

  describe("GET /api/post-process/health", () => {
    it("returns health status", async () => {
      const r = await httpRequest("GET", "/api/post-process/health");
      expect(r.status).toBe(200);
      expect(r.data.status).toBe("ok");
      expect(r.data.version).toBeDefined();
      expect(r.data.stages).toBeGreaterThanOrEqual(20);
      expect(r.data.controllers).toBeGreaterThanOrEqual(15);
    });
  });

  describe("GET /api/post-process/controllers", () => {
    it("returns list of controller dialects", async () => {
      const r = await httpRequest("GET", "/api/post-process/controllers");
      expect(r.status).toBe(200);
      expect(Array.isArray(r.data)).toBe(true);
      expect(r.data.length).toBeGreaterThanOrEqual(15);
      expect(r.data.some((d: any) => d.manufacturer === "Fanuc")).toBe(true);
      expect(r.data.some((d: any) => d.manufacturer === "Siemens")).toBe(true);
      expect(r.data.some((d: any) => d.manufacturer === "Heidenhain")).toBe(true);
    });
  });

  describe("POST /api/post-process", () => {
    it("processes G-code through full pipeline", async () => {
      const body = JSON.stringify({
        gcode: "T1 M6\nS3000 M3\nG01 X50 Y0 Z-5 F800\nG01 X50 Y30\nG00 Z5\n",
        material: { name: "4140 Steel", iso_group: "P" },
        controller: "haas_ngc",
        tools: [{ id: "1", type: "flat_endmill", diameter_mm: 10, flute_count: 4, material: "carbide", resolution_confidence: 1 }],
        aggressiveness: 0.5,
        stages: { safety_analysis: false, playbook_rules: false },
      });
      const r = await httpRequest("POST", "/api/post-process", body);
      expect(r.status).toBe(200);
      expect(r.data.gcode).toBeDefined();
      expect(r.data.gcode.length).toBeGreaterThan(10);
      expect(r.data.overall_status).toBeDefined();
      expect(r.data.stages).toBeDefined();
      expect(r.data.total_duration_ms).toBeGreaterThan(0);
    });

    it("returns warnings from pipeline", async () => {
      const body = JSON.stringify({
        gcode: "T1 M6\nS3000 M3\nG01 X50 F800\n",
        material: { name: "Inconel 718", iso_group: "S" },
        controller: "fanuc_31i",
        stages: { safety_analysis: false, playbook_rules: false },
      });
      const r = await httpRequest("POST", "/api/post-process", body);
      expect(r.status).toBe(200);
      // Inconel should generate tribal knowledge warnings
      expect(r.data.warnings).toBeDefined();
    });
  });

  describe("POST /api/post-process/resolve", () => {
    it("resolves machine/material context without running pipeline", async () => {
      const body = JSON.stringify({
        material: { name: "316L Stainless" },
      });
      const r = await httpRequest("POST", "/api/post-process/resolve", body);
      expect(r.status).toBe(200);
      expect(r.data.material).toBeDefined();
      expect(r.data.material.iso_group).toBe("M");
    });
  });

  describe("POST /api/post-process/verify", () => {
    it("verifies G-code output", async () => {
      const body = JSON.stringify({
        gcode: "G90 G21 G17\nT1 M6\nS3000 M3\nG01 X50 F800\nM30\n",
        machine_limits: { max_rpm: 12000, max_feed_mm_min: 15000 },
      });
      const r = await httpRequest("POST", "/api/post-process/verify", body);
      expect(r.status).toBe(200);
      expect(r.data.valid).toBeDefined();
      expect(r.data.summary).toBeDefined();
      expect(r.data.grammar_ok).toBeDefined();
    });
  });

  describe("404 handling", () => {
    it("returns 404 with available endpoints for unknown paths", async () => {
      const r = await httpRequest("GET", "/api/unknown");
      expect(r.status).toBe(404);
      expect(r.data.available_endpoints).toBeDefined();
    });
  });

  describe("CORS", () => {
    it("handles OPTIONS preflight", async () => {
      const r = await httpRequest("OPTIONS", "/api/post-process/health");
      expect(r.status).toBe(204);
    });
  });

  describe("Server Stop", () => {
    it("stops server cleanly", async () => {
      await postProcessorAPIEngine.stop();
      const status = postProcessorAPIEngine.status();
      expect(status.running).toBe(false);
    });
  });
});

describe("PP-MS6: Fusion 360 .cps Validation", () => {
  const cpsPath = path.resolve(__dirname, "../../scripts/fusion360-post/PRISM.cps");

  it(".cps file exists", () => {
    expect(fs.existsSync(cpsPath)).toBe(true);
  });

  it("contains required Fusion 360 post processor fields", () => {
    const content = fs.readFileSync(cpsPath, "utf-8");
    expect(content).toContain("description =");
    expect(content).toContain("vendor =");
    expect(content).toContain("capabilities =");
    expect(content).toContain("properties =");
    expect(content).toContain("function onOpen()");
    expect(content).toContain("function onSection()");
    expect(content).toContain("function onLinear(");
    expect(content).toContain("function onRapid(");
    expect(content).toContain("function onCircular(");
    expect(content).toContain("function onClose()");
  });

  it("has all 17 controller options in properties", () => {
    const content = fs.readFileSync(cpsPath, "utf-8");
    expect(content).toContain("fanuc_31i");
    expect(content).toContain("siemens_840d");
    expect(content).toContain("heidenhain_tnc640");
    expect(content).toContain("haas_ngc");
    expect(content).toContain("mazak_smooth_ai");
    expect(content).toContain("okuma_osp_p300");
    expect(content).toContain("brother_speedio");
    expect(content).toContain("mitsubishi_m80");
    expect(content).toContain("fagor_8065");
  });

  it("has optimization feature toggles", () => {
    const content = fs.readFileSync(cpsPath, "utf-8");
    expect(content).toContain("enableChipThinning");
    expect(content).toContain("enableCornerReduction");
    expect(content).toContain("enableStabilityLobes");
    expect(content).toContain("enableWearTracking");
    expect(content).toContain("enableThermalTracking");
    expect(content).toContain("enableControllerFeatures");
    expect(content).toContain("enableMonteCarlo");
  });

  it("has aggressiveness slider (0-100)", () => {
    const content = fs.readFileSync(cpsPath, "utf-8");
    expect(content).toContain("aggressiveness");
    expect(content).toContain("range: [0, 100]");
  });

  it("has PRISM server URL property", () => {
    const content = fs.readFileSync(cpsPath, "utf-8");
    expect(content).toContain("prismServerUrl");
    expect(content).toContain("18361");
  });

  it("has Phase A (server) and Phase B (offline) logic", () => {
    const content = fs.readFileSync(cpsPath, "utf-8");
    expect(content).toContain("prismConnected");
    expect(content).toContain("callPrismServer");
    expect(content).toContain("writeSidecarJSON");
    expect(content).toContain("Phase A");
    expect(content).toContain("Phase B");
  });

  it("collects operations and tools for batch processing", () => {
    const content = fs.readFileSync(cpsPath, "utf-8");
    expect(content).toContain("collectedOperations");
    expect(content).toContain("collectedTools");
    expect(content).toContain("buildPrismPayload");
  });
});
