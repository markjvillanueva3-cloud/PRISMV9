/**
 * Fusion360PluginAdapterEngine outbound JSON-RPC tests — U-CAM87-LIVE
 * ====================================================================
 * Verifies PRISM → Fusion 360 envelope builders produce valid JSON-RPC 2.0
 * envelopes that the add-in's adsk.cam.* call sites can consume.
 *
 * These tests are deterministic: no live Fusion 360 instance is touched.
 * Envelope shape validation is the contract between PRISM-side and the
 * Python add-in; the add-in executes the adsk.cam calls in its own process.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { Fusion360PluginAdapterEngine } from "../engines/Fusion360PluginAdapterEngine.js";

describe("Fusion360PluginAdapterEngine outbound RPC — envelope structure", () => {
  beforeEach(() => {
    Fusion360PluginAdapterEngine.__resetOutboundRpcId();
  });

  it("buildSetupCreateEnvelope returns JSON-RPC 2.0 with method setup.create", () => {
    const env = Fusion360PluginAdapterEngine.buildSetupCreateEnvelope({
      project_id: "proj1",
      setup_name: "Setup 1",
      stock: { mode: "box", x: 100, y: 80, z: 20 },
      wcs_origin: { x: 0, y: 0, z: 0 },
    });
    expect(env.jsonrpc).toBe("2.0");
    expect(env.method).toBe("setup.create");
    expect(env.params.setup_name).toBe("Setup 1");
    expect(typeof env.id).toBe("number");
  });

  it("buildOperationCreateEnvelope accepts all 8 strategy enum values", () => {
    const strategies = [
      "adaptive3d",
      "pocket_clearing",
      "contour2d",
      "contour3d",
      "facing",
      "drill",
      "bore",
      "thread",
    ] as const;
    for (const strategy of strategies) {
      const env = Fusion360PluginAdapterEngine.buildOperationCreateEnvelope({
        project_id: "p",
        setup_id: "s",
        strategy,
        tool_id: "T1",
        geometry_selection: ["face1"],
        parameters: { spindle_speed_rpm: 2000, feed_mm_min: 500 },
      });
      expect(env.method).toBe("operation.create");
      expect(env.params.strategy).toBe(strategy);
    }
  });

  it("buildOperationCreateEnvelope throws when tool_id is missing", () => {
    expect(() =>
      Fusion360PluginAdapterEngine.buildOperationCreateEnvelope({
        project_id: "p",
        setup_id: "s",
        strategy: "adaptive3d",
        tool_id: "",
        geometry_selection: ["face1"],
        parameters: {},
      })
    ).toThrow(/tool_id/);
  });

  it("buildOperationCreateEnvelope throws when geometry_selection is empty", () => {
    expect(() =>
      Fusion360PluginAdapterEngine.buildOperationCreateEnvelope({
        project_id: "p",
        setup_id: "s",
        strategy: "adaptive3d",
        tool_id: "T1",
        geometry_selection: [],
        parameters: {},
      })
    ).toThrow(/geometry_selection/);
  });

  it("buildPostProcessEnvelope requires both post_cps_path and output_path", () => {
    expect(() =>
      Fusion360PluginAdapterEngine.buildPostProcessEnvelope({
        project_id: "p",
        post_cps_path: "",
        output_path: "out.nc",
        target_machine_id: "VMC-01",
      })
    ).toThrow(/post_cps_path/);
    expect(() =>
      Fusion360PluginAdapterEngine.buildPostProcessEnvelope({
        project_id: "p",
        post_cps_path: "hurco.cps",
        output_path: "",
        target_machine_id: "VMC-01",
      })
    ).toThrow(/output_path/);
  });

  it("buildGeometryImportEnvelope supports all 6 import formats", () => {
    const formats = ["step", "iges", "f3d", "stl", "sat", "stp"] as const;
    for (const format of formats) {
      const env = Fusion360PluginAdapterEngine.buildGeometryImportEnvelope({
        project_id: "p",
        file_path: `/tmp/part.${format}`,
        format,
      });
      expect(env.method).toBe("geometry.import");
      expect(env.params.format).toBe(format);
    }
  });

  it("buildSimulateEnvelope includes mode selector", () => {
    const env = Fusion360PluginAdapterEngine.buildSimulateEnvelope({
      project_id: "p",
      operation_ids: ["op1", "op2"],
      mode: "full",
    });
    expect(env.method).toBe("simulate.run");
    expect(env.params.mode).toBe("full");
    expect(env.params.operation_ids).toHaveLength(2);
  });

  it("buildToolInstallEnvelope carries tool metadata", () => {
    const env = Fusion360PluginAdapterEngine.buildToolInstallEnvelope({
      project_id: "p",
      library_guid: "lib-abc",
      tool: { id: "T1", type: "endmill", diameter_mm: 6, flutes: 4, coating: "AlTiN" },
    });
    expect(env.method).toBe("tool.install");
    expect(env.params.tool.diameter_mm).toBe(6);
  });
});

describe("Fusion360PluginAdapterEngine outbound RPC — id sequencing", () => {
  beforeEach(() => {
    Fusion360PluginAdapterEngine.__resetOutboundRpcId();
  });

  it("ids are monotonically increasing across envelope builds", () => {
    const e1 = Fusion360PluginAdapterEngine.buildSetupCreateEnvelope({
      project_id: "p",
      setup_name: "s",
      stock: { mode: "box" },
      wcs_origin: { x: 0, y: 0, z: 0 },
    });
    const e2 = Fusion360PluginAdapterEngine.buildGeometryImportEnvelope({
      project_id: "p",
      file_path: "x.step",
      format: "step",
    });
    const e3 = Fusion360PluginAdapterEngine.buildSimulateEnvelope({
      project_id: "p",
      operation_ids: ["op1"],
      mode: "collision_only",
    });
    expect(e2.id).toBeGreaterThan(e1.id);
    expect(e3.id).toBeGreaterThan(e2.id);
  });

  it("__resetOutboundRpcId rewinds the counter (test utility)", () => {
    const first = Fusion360PluginAdapterEngine.buildSetupCreateEnvelope({
      project_id: "p",
      setup_name: "s",
      stock: { mode: "box" },
      wcs_origin: { x: 0, y: 0, z: 0 },
    });
    Fusion360PluginAdapterEngine.__resetOutboundRpcId();
    const second = Fusion360PluginAdapterEngine.buildSetupCreateEnvelope({
      project_id: "p",
      setup_name: "s",
      stock: { mode: "box" },
      wcs_origin: { x: 0, y: 0, z: 0 },
    });
    expect(second.id).toBe(first.id);
  });
});

describe("Fusion360PluginAdapterEngine outbound RPC — end-to-end program build", () => {
  beforeEach(() => {
    Fusion360PluginAdapterEngine.__resetOutboundRpcId();
  });

  it("full CAM program build emits the right method sequence", () => {
    const envelopes = [
      Fusion360PluginAdapterEngine.buildSetupCreateEnvelope({
        project_id: "proj",
        setup_name: "Setup 1",
        stock: { mode: "box", x: 100, y: 80, z: 20 },
        wcs_origin: { x: 0, y: 0, z: 0 },
        machine_id: "VMC-01",
      }),
      Fusion360PluginAdapterEngine.buildGeometryImportEnvelope({
        project_id: "proj",
        file_path: "/tmp/part.step",
        format: "step",
      }),
      Fusion360PluginAdapterEngine.buildToolInstallEnvelope({
        project_id: "proj",
        tool: { id: "T1", type: "endmill", diameter_mm: 6, flutes: 4 },
      }),
      Fusion360PluginAdapterEngine.buildOperationCreateEnvelope({
        project_id: "proj",
        setup_id: "s1",
        strategy: "adaptive3d",
        tool_id: "T1",
        geometry_selection: ["face1"],
        parameters: { spindle_speed_rpm: 10000, feed_mm_min: 2500, stepdown_mm: 2 },
      }),
      Fusion360PluginAdapterEngine.buildSimulateEnvelope({
        project_id: "proj",
        operation_ids: ["op1"],
        mode: "full",
      }),
      Fusion360PluginAdapterEngine.buildPostProcessEnvelope({
        project_id: "proj",
        post_cps_path: "/posts/hurco.cps",
        output_path: "/out/part.nc",
        target_machine_id: "VMC-01",
      }),
    ];
    const methods = envelopes.map((e) => e.method);
    expect(methods).toEqual([
      "setup.create",
      "geometry.import",
      "tool.install",
      "operation.create",
      "simulate.run",
      "postprocess.run",
    ]);
    // All envelopes are JSON.stringify-safe
    for (const e of envelopes) {
      expect(() => JSON.stringify(e)).not.toThrow();
    }
  });
});
