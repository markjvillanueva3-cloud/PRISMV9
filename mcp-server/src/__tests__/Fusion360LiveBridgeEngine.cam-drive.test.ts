/**
 * Fusion360LiveBridgeEngine CAM-DRIVE param passthrough (CAM-DRIVE-MS0, slot:kilo 2026-05-29)
 * ==========================================================================================
 * Proves the live CAM WRITE methods POST the right routes AND that raw_parameters
 * (the full-parameter drive path — any catalog-enumerated Fusion CAMParameter, not
 * just the 9 in CAM_PARAM_MAP) reaches the add-in VERBATIM in the request body.
 *
 * The bridge is NOT mocked — it makes a REAL HTTP round-trip to an ephemeral
 * loopback server that captures the actual request, so these assert the engine's
 * real serialization behavior against a real socket (no external network).
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { Fusion360LiveBridgeEngine } from "../engines/Fusion360LiveBridgeEngine.js";

interface Captured {
  method: string;
  url: string;
  body: any;
}
let server: Server;
let captured: Captured[];
let engine: Fusion360LiveBridgeEngine;
let base: string;

beforeEach(async () => {
  captured = [];
  server = createServer((req, res) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      captured.push({ method: req.method ?? "", url: req.url ?? "", body: data ? JSON.parse(data) : undefined });
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          success: true,
          operation_name: "Op1",
          setup_name: "S1",
          setup_index: 0,
          model_count: 1,
          stock_mode: "box",
          operation_type: "adaptive",
          job_id: "job-1",
          status: "complete",
          operations_queued: 1,
          parameters_set: 3,
          set: ["tool_spindleSpeed", "maximumStepdown", "helixAngle"],
          failed: [],
          tool_description: "6mm flat",
          source: "created_inline",
          output_file: "C:/nc/O1001.nc",
          program_name: "O1001",
          line_count: 42,
          elapsed_sec: 1,
        }),
      );
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  engine = new Fusion360LiveBridgeEngine(base);
});
afterEach(async () => {
  await new Promise<void>((r) => server.close(() => r()));
});

describe("Fusion360LiveBridgeEngine — CAM write methods hit the correct add-in routes (real round-trip)", () => {
  it("createCamSetup POSTs name+type to /cam/setup", async () => {
    const res = await engine.createCamSetup({ name: "S1", type: "milling" });
    expect(res.success).toBe(true);
    expect(captured.length).toBe(1);
    expect(captured[0].method).toBe("POST");
    expect(captured[0].url).toBe("/cam/setup");
    expect(captured[0].body.name).toBe("S1");
    expect(captured[0].body.type).toBe("milling");
  });

  it("createCamOperation POSTs raw_parameters VERBATIM to /cam/operation (full-param drive, not capped at 9)", async () => {
    const res = await engine.createCamOperation({
      setup_name: "S1",
      operation_type: "adaptive",
      name: "Adaptive1",
      parameters: { spindle_speed_rpm: 5000 }, // legacy 9-key mapped path
      raw_parameters: { tool_spindleSpeed: "5000", maximumStepdown: "0.5 cm", helixAngle: "2 deg" },
    });
    expect(res.parameters_set).toBe(3);
    expect(captured.length).toBe(1);
    expect(captured[0].method).toBe("POST");
    expect(captured[0].url).toBe("/cam/operation");
    expect(captured[0].body.operation_type).toBe("adaptive");
    // The arbitrary Fusion-native params reach the add-in unfiltered:
    expect(captured[0].body.raw_parameters.tool_spindleSpeed).toBe("5000");
    expect(captured[0].body.raw_parameters.maximumStepdown).toBe("0.5 cm");
    expect(captured[0].body.raw_parameters.helixAngle).toBe("2 deg");
    expect(Object.keys(captured[0].body.raw_parameters).length).toBe(3);
    // and the legacy mapped path coexists on the same request:
    expect(captured[0].body.parameters.spindle_speed_rpm).toBe(5000);
  });

  it("assignTool POSTs the tool_spec to /cam/assign-tool", async () => {
    const res = await engine.assignTool({ operation_name: "Adaptive1", tool_spec: { diameter_mm: 6, type: "flat" } });
    expect(res.success).toBe(true);
    expect(captured[0].url).toBe("/cam/assign-tool");
    expect(captured[0].method).toBe("POST");
    expect(captured[0].body.tool_spec.diameter_mm).toBe(6);
    expect(captured[0].body.tool_spec.type).toBe("flat");
  });

  it("generateToolpaths POSTs generate_all to /cam/toolpath", async () => {
    const res = await engine.generateToolpaths({ setup_name: "S1", generate_all: true });
    expect(res.job_id).toBe("job-1");
    expect(captured[0].url).toBe("/cam/toolpath");
    expect(captured[0].method).toBe("POST");
    expect(captured[0].body.generate_all).toBe(true);
  });

  it("getToolpathStatus GETs /cam/toolpath/status with an encoded job_id and no body", async () => {
    const res = await engine.getToolpathStatus("job 1/special");
    expect(res.status).toBe("complete");
    expect(captured[0].method).toBe("GET");
    expect(captured[0].url).toBe(`/cam/toolpath/status?job_id=${encodeURIComponent("job 1/special")}`);
    expect(captured[0].body).toBe(undefined);
  });

  it("postProcess POSTs the post fields to /cam/post", async () => {
    const res = await engine.postProcess({
      setup_name: "S1",
      post_processor_path: "haas.cps",
      program_name: "O1001",
      output_folder: "C:/nc",
      output_units: "inch",
    });
    expect(res.line_count).toBe(42);
    expect(captured[0].url).toBe("/cam/post");
    expect(captured[0].method).toBe("POST");
    expect(captured[0].body.post_processor_path).toBe("haas.cps");
    expect(captured[0].body.program_name).toBe("O1001");
    expect(captured[0].body.output_units).toBe("inch");
  });
});
