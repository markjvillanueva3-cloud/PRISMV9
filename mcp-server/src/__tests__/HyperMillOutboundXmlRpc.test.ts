/**
 * HyperMillPluginAdapterEngine outbound XML-RPC tests — U-CAM87-HM
 * =================================================================
 * Verifies PRISM → hyperMILL envelope builders produce valid XML-RPC COM
 * payloads that HyperMillPRISMPlugin.dll consumes via om.cam.* API calls.
 *
 * These tests are deterministic: no live hyperMILL instance is touched.
 * Envelope shape + required-param validation is the contract; the DLL
 * executes the actual om.cam.Operation.Create etc. in its own process.
 *
 * Round-4 B1-NEW fix — closes the hyperMILL outbound-builder symmetry gap
 * vs. Fusion (U-CAM87-LIVE) and Mastercam (U-CAM89-EXTEND).
 */

import { describe, it, expect, beforeEach } from "vitest";
import { HyperMillPluginAdapterEngine } from "../engines/HyperMillPluginAdapterEngine.js";

describe("HyperMillPluginAdapterEngine outbound XML-RPC — envelope structure", () => {
  beforeEach(() => {
    HyperMillPluginAdapterEngine.__resetOutboundXmlRpcId();
  });

  it("buildOperationCreateEnvelope returns protocol=xml-rpc-com + om.cam.Operation.Create", () => {
    const env = HyperMillPluginAdapterEngine.buildOperationCreateEnvelope({
      project_id: "proj1",
      joblist_id: "jl1",
      strategy: "3d_rough",
      tool_id: "T1",
      geometry_refs: ["surf1"],
      parameters: { spindle_rpm: 10000, feed_rate_mmpm: 2500, doc_mm: 2, stepover_pct: 15 },
    });
    expect(env.protocol).toBe("xml-rpc-com");
    expect(env.method).toBe("om.cam.Operation.Create");
    expect(env.project_id).toBe("proj1");
    expect(typeof env.id).toBe("number");
  });

  it("buildOperationCreateEnvelope accepts all 12 strategy enum values", () => {
    const strategies = [
      "2d_pocket",
      "2d_contour",
      "3d_rough",
      "3d_finish",
      "3d_rest",
      "5axis_swarf",
      "5axis_morphing",
      "drill",
      "deep_drill",
      "tap",
      "thread_mill",
      "bore",
    ] as const;
    for (const strategy of strategies) {
      const env = HyperMillPluginAdapterEngine.buildOperationCreateEnvelope({
        project_id: "p",
        joblist_id: "jl",
        strategy,
        tool_id: "T1",
        geometry_refs: ["surf1"],
        parameters: { spindle_rpm: 5000, feed_rate_mmpm: 1000 },
      });
      expect(env.method).toBe("om.cam.Operation.Create");
      expect(env.params.strategy).toBe(strategy);
    }
  });

  it("buildOperationCreateEnvelope enforces required params", () => {
    const valid = {
      project_id: "p",
      joblist_id: "jl",
      strategy: "3d_rough" as const,
      tool_id: "T1",
      geometry_refs: ["surf1"],
      parameters: { spindle_rpm: 5000, feed_rate_mmpm: 1000 },
    };
    expect(() =>
      HyperMillPluginAdapterEngine.buildOperationCreateEnvelope({ ...valid, tool_id: "" })
    ).toThrow(/tool_id/);
    expect(() =>
      HyperMillPluginAdapterEngine.buildOperationCreateEnvelope({ ...valid, geometry_refs: [] })
    ).toThrow(/geometry_ref/);
    expect(() =>
      HyperMillPluginAdapterEngine.buildOperationCreateEnvelope({
        ...valid,
        parameters: { spindle_rpm: 0, feed_rate_mmpm: 1000 },
      })
    ).toThrow(/spindle_rpm/);
    expect(() =>
      HyperMillPluginAdapterEngine.buildOperationCreateEnvelope({
        ...valid,
        parameters: { spindle_rpm: 5000, feed_rate_mmpm: 0 },
      })
    ).toThrow(/feed_rate_mmpm/);
  });

  it("buildStockEnvelope carries ISO group + material + shape", () => {
    const env = HyperMillPluginAdapterEngine.buildStockEnvelope({
      project_id: "p",
      joblist_id: "jl",
      stock: {
        material: "4140",
        iso_group: "P",
        shape: "box",
        dimensions: { x: 100, y: 80, z: 20 },
      },
    });
    expect(env.method).toBe("om.cam.Stock.Set");
    expect(env.params.stock.iso_group).toBe("P");
    expect(env.params.stock.material).toBe("4140");
  });

  it("buildToolInstallEnvelope validates tool_id + diameter_mm", () => {
    const env = HyperMillPluginAdapterEngine.buildToolInstallEnvelope({
      project_id: "p",
      joblist_id: "jl",
      tool: { tool_id: "T1", tool_type: "end_mill", diameter_mm: 6, flutes: 4, material: "carbide" },
    });
    expect(env.method).toBe("om.cam.Tool.Install");
    expect(env.params.tool.diameter_mm).toBe(6);

    expect(() =>
      HyperMillPluginAdapterEngine.buildToolInstallEnvelope({
        project_id: "p",
        joblist_id: "jl",
        tool: { tool_id: "", tool_type: "end_mill", diameter_mm: 6, material: "carbide" },
      })
    ).toThrow(/tool_id/);
    expect(() =>
      HyperMillPluginAdapterEngine.buildToolInstallEnvelope({
        project_id: "p",
        joblist_id: "jl",
        tool: { tool_id: "T1", tool_type: "end_mill", diameter_mm: 0, material: "carbide" },
      })
    ).toThrow(/diameter_mm/);
  });

  it("buildJobListEnvelope requires machine_id", () => {
    expect(() =>
      HyperMillPluginAdapterEngine.buildJobListEnvelope({
        project_id: "p",
        joblist_name: "JobList 1",
        machine_id: "",
      })
    ).toThrow(/machine_id/);

    const env = HyperMillPluginAdapterEngine.buildJobListEnvelope({
      project_id: "p",
      joblist_name: "JobList 1",
      machine_id: "LTH-01",
      post_processor_path: "OKUMA_GENOS.om-post",
    });
    expect(env.method).toBe("om.cam.JobList.Create");
  });

  it("buildPostProcessEnvelope requires both paths", () => {
    expect(() =>
      HyperMillPluginAdapterEngine.buildPostProcessEnvelope({
        project_id: "p",
        joblist_id: "jl",
        post_om_path: "",
        output_nc_path: "out.nc",
        controller_family: "okuma",
        controller_model: "OSP-P300",
      })
    ).toThrow(/post_om_path/);
    expect(() =>
      HyperMillPluginAdapterEngine.buildPostProcessEnvelope({
        project_id: "p",
        joblist_id: "jl",
        post_om_path: "okuma.om-post",
        output_nc_path: "",
        controller_family: "okuma",
        controller_model: "OSP-P300",
      })
    ).toThrow(/output_nc_path/);
  });
});

describe("HyperMillPluginAdapterEngine outbound — id sequencing", () => {
  beforeEach(() => {
    HyperMillPluginAdapterEngine.__resetOutboundXmlRpcId();
  });

  it("ids are monotonically increasing across envelope builds", () => {
    const a = HyperMillPluginAdapterEngine.buildJobListEnvelope({
      project_id: "p",
      joblist_name: "jl",
      machine_id: "LTH-01",
    });
    const b = HyperMillPluginAdapterEngine.buildToolInstallEnvelope({
      project_id: "p",
      joblist_id: "jl",
      tool: { tool_id: "T1", tool_type: "end_mill", diameter_mm: 6, material: "carbide" },
    });
    const c = HyperMillPluginAdapterEngine.buildOperationCreateEnvelope({
      project_id: "p",
      joblist_id: "jl",
      strategy: "3d_rough",
      tool_id: "T1",
      geometry_refs: ["surf1"],
      parameters: { spindle_rpm: 5000, feed_rate_mmpm: 1000 },
    });
    expect(b.id).toBeGreaterThan(a.id);
    expect(c.id).toBeGreaterThan(b.id);
  });

  it("__resetOutboundXmlRpcId rewinds counter (test utility)", () => {
    const first = HyperMillPluginAdapterEngine.buildJobListEnvelope({
      project_id: "p",
      joblist_name: "jl",
      machine_id: "LTH-01",
    });
    HyperMillPluginAdapterEngine.__resetOutboundXmlRpcId();
    const second = HyperMillPluginAdapterEngine.buildJobListEnvelope({
      project_id: "p",
      joblist_name: "jl",
      machine_id: "LTH-01",
    });
    expect(second.id).toBe(first.id);
  });
});

describe("HyperMillPluginAdapterEngine outbound — end-to-end program build", () => {
  beforeEach(() => {
    HyperMillPluginAdapterEngine.__resetOutboundXmlRpcId();
  });

  it("end-to-end program emits the right method sequence (5 envelopes)", () => {
    const envelopes = [
      HyperMillPluginAdapterEngine.buildJobListEnvelope({
        project_id: "proj",
        joblist_name: "Main",
        machine_id: "LTH-01",
        post_processor_path: "OKUMA_GENOS.om-post",
      }),
      HyperMillPluginAdapterEngine.buildStockEnvelope({
        project_id: "proj",
        joblist_id: "jl1",
        stock: {
          material: "4140",
          iso_group: "P",
          shape: "cylinder",
          cylinder: { diameter: 80, length: 200 },
        },
      }),
      HyperMillPluginAdapterEngine.buildToolInstallEnvelope({
        project_id: "proj",
        joblist_id: "jl1",
        tool: {
          tool_id: "T5",
          tool_type: "end_mill",
          diameter_mm: 6,
          flutes: 4,
          material: "carbide",
        },
      }),
      HyperMillPluginAdapterEngine.buildOperationCreateEnvelope({
        project_id: "proj",
        joblist_id: "jl1",
        strategy: "3d_rough",
        tool_id: "T5",
        geometry_refs: ["surf1"],
        parameters: {
          spindle_rpm: 10000,
          feed_rate_mmpm: 2500,
          doc_mm: 2,
          stepover_pct: 15,
        },
      }),
      HyperMillPluginAdapterEngine.buildPostProcessEnvelope({
        project_id: "proj",
        joblist_id: "jl1",
        post_om_path: "OKUMA_GENOS.om-post",
        output_nc_path: "H:/out/part.nc",
        controller_family: "okuma",
        controller_model: "OSP-P300L-R",
      }),
    ];
    const methods = envelopes.map((e) => e.method);
    expect(methods).toEqual([
      "om.cam.JobList.Create",
      "om.cam.Stock.Set",
      "om.cam.Tool.Install",
      "om.cam.Operation.Create",
      "om.cam.Post.Run",
    ]);
    for (const e of envelopes) {
      expect(() => JSON.stringify(e)).not.toThrow();
      expect(e.protocol).toBe("xml-rpc-com");
    }
  });
});
