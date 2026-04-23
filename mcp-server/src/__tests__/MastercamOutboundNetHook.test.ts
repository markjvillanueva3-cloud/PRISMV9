/**
 * MastercamPluginAdapterEngine outbound NET-Hook tests — U-CAM89-EXTEND
 * ======================================================================
 * Verifies PRISM → Mastercam envelope builders produce valid NET-Hook
 * command payloads that the C# DLL side consumes via Mastercam.IO.* calls.
 *
 * These tests are deterministic: no live Mastercam instance is touched.
 * Envelope shape + required-param validation is the contract; the DLL
 * executes the actual Mastercam.IO.Operation tree mutations in its own
 * process.
 *
 * Largest single-unit confidence boost in the Round-3 plan:
 * Mastercam adapter goes from read-only → full CREATE-capable (envelope-wise).
 */

import { describe, it, expect, beforeEach } from "vitest";
import { MastercamPluginAdapterEngine } from "../engines/MastercamPluginAdapterEngine.js";

describe("MastercamPluginAdapterEngine outbound NET-Hook — envelope structure", () => {
  beforeEach(() => {
    MastercamPluginAdapterEngine.__resetOutboundCommandId();
  });

  it("buildMachineGroupCreateEnvelope returns protocol=nethook + MachineGroup.Create", () => {
    const env = MastercamPluginAdapterEngine.buildMachineGroupCreateEnvelope({
      project_id: "proj1",
      machine_group_name: "MCAM MILL 1",
      post_processor_path: "C:/MCAM/posts/HURCO.PST",
      stock_setup: {
        mode: "box",
        dimensions: { x: 100, y: 80, z: 20 },
        material_id: "1018",
      },
      wcs_origin: { x: 0, y: 0, z: 0 },
    });
    expect(env.command).toBe("MachineGroup.Create");
    expect(env.protocol).toBe("nethook");
    expect(env.project_id).toBe("proj1");
    expect(typeof env.id).toBe("number");
  });

  it("buildMachineGroupCreateEnvelope throws when post_processor_path is empty", () => {
    expect(() =>
      MastercamPluginAdapterEngine.buildMachineGroupCreateEnvelope({
        project_id: "proj1",
        machine_group_name: "MCAM MILL 1",
        post_processor_path: "",
        stock_setup: { mode: "box" },
        wcs_origin: { x: 0, y: 0, z: 0 },
      })
    ).toThrow(/post_processor_path/);
  });

  it("buildOperationCreateEnvelope accepts all 11 strategy enum values", () => {
    const strategies = [
      "dynamic_mill",
      "pocket",
      "contour2d",
      "surface_rough",
      "surface_finish",
      "drill",
      "bore",
      "thread_mill",
      "lathe_rough",
      "lathe_finish",
      "lathe_thread",
    ] as const;
    for (const strategy of strategies) {
      const env = MastercamPluginAdapterEngine.buildOperationCreateEnvelope({
        project_id: "p",
        machine_group_id: "mg1",
        strategy,
        tool_id: "T1",
        chain_ids: ["chain1"],
        parameters: { spindle_speed: 2000, cutting_feedrate: 500 },
      });
      expect(env.command).toBe("Operation.Create");
      expect(env.params.strategy).toBe(strategy);
    }
  });

  it("buildOperationCreateEnvelope validates required params strictly", () => {
    const valid = {
      project_id: "p",
      machine_group_id: "mg1",
      strategy: "dynamic_mill" as const,
      tool_id: "T1",
      chain_ids: ["chain1"],
      parameters: { spindle_speed: 2000, cutting_feedrate: 500 },
    };
    // Empty tool_id
    expect(() =>
      MastercamPluginAdapterEngine.buildOperationCreateEnvelope({ ...valid, tool_id: "" })
    ).toThrow(/tool_id/);
    // Empty chain_ids
    expect(() =>
      MastercamPluginAdapterEngine.buildOperationCreateEnvelope({ ...valid, chain_ids: [] })
    ).toThrow(/chain_id/);
    // Zero spindle_speed
    expect(() =>
      MastercamPluginAdapterEngine.buildOperationCreateEnvelope({
        ...valid,
        parameters: { spindle_speed: 0, cutting_feedrate: 500 },
      })
    ).toThrow(/spindle_speed/);
    // Zero cutting_feedrate
    expect(() =>
      MastercamPluginAdapterEngine.buildOperationCreateEnvelope({
        ...valid,
        parameters: { spindle_speed: 2000, cutting_feedrate: 0 },
      })
    ).toThrow(/cutting_feedrate/);
  });

  it("buildToolInstallEnvelope carries tool_id + diameter + validates both", () => {
    const env = MastercamPluginAdapterEngine.buildToolInstallEnvelope({
      project_id: "p",
      machine_group_id: "mg1",
      tool: { tool_id: "T5", tool_type: "endmill", diameter_mm: 6, flute_count: 4, magazine_slot: 5 },
    });
    expect(env.command).toBe("Tool.Install");
    expect(env.params.tool.tool_id).toBe("T5");
    expect(env.params.tool.diameter_mm).toBe(6);

    expect(() =>
      MastercamPluginAdapterEngine.buildToolInstallEnvelope({
        project_id: "p",
        machine_group_id: "mg1",
        tool: { tool_id: "", tool_type: "endmill", diameter_mm: 6 },
      })
    ).toThrow(/tool_id/);

    expect(() =>
      MastercamPluginAdapterEngine.buildToolInstallEnvelope({
        project_id: "p",
        machine_group_id: "mg1",
        tool: { tool_id: "T5", tool_type: "endmill", diameter_mm: 0 },
      })
    ).toThrow(/diameter_mm/);
  });

  it("buildChainSelectEnvelope rejects empty geometry_refs", () => {
    expect(() =>
      MastercamPluginAdapterEngine.buildChainSelectEnvelope({
        project_id: "p",
        chain_id: "chain1",
        geometry_refs: [],
        chain_type: "2d_contour",
      })
    ).toThrow(/geometry_ref/);
  });

  it("buildChainSelectEnvelope supports all 5 chain types", () => {
    const types = [
      "2d_contour",
      "2d_pocket_boundary",
      "3d_surface",
      "drill_points",
      "lathe_profile",
    ] as const;
    for (const chain_type of types) {
      const env = MastercamPluginAdapterEngine.buildChainSelectEnvelope({
        project_id: "p",
        chain_id: "c1",
        geometry_refs: ["geo1"],
        chain_type,
      });
      expect(env.params.chain_type).toBe(chain_type);
    }
  });

  it("buildRegenEnvelope accepts operation_ids OR regen_all flag", () => {
    const env = MastercamPluginAdapterEngine.buildRegenEnvelope({
      project_id: "p",
      operation_ids: ["op1", "op2"],
    });
    expect(env.command).toBe("Regen.Operations");
    expect(env.params.operation_ids).toHaveLength(2);

    const envAll = MastercamPluginAdapterEngine.buildRegenEnvelope({
      project_id: "p",
      operation_ids: [],
      regen_all: true,
    });
    expect(envAll.params.regen_all).toBe(true);
  });

  it("buildPostProcessEnvelope requires post_mp_path + output_nc_path", () => {
    expect(() =>
      MastercamPluginAdapterEngine.buildPostProcessEnvelope({
        project_id: "p",
        machine_group_id: "mg1",
        post_mp_path: "",
        output_nc_path: "out.nc",
        target_controller: "Hurco",
      })
    ).toThrow(/post_mp_path/);
    expect(() =>
      MastercamPluginAdapterEngine.buildPostProcessEnvelope({
        project_id: "p",
        machine_group_id: "mg1",
        post_mp_path: "hurco.pst",
        output_nc_path: "",
        target_controller: "Hurco",
      })
    ).toThrow(/output_nc_path/);
  });
});

describe("MastercamPluginAdapterEngine outbound NET-Hook — id sequencing", () => {
  beforeEach(() => {
    MastercamPluginAdapterEngine.__resetOutboundCommandId();
  });

  it("ids are monotonically increasing across envelope builds", () => {
    const a = MastercamPluginAdapterEngine.buildMachineGroupCreateEnvelope({
      project_id: "p",
      machine_group_name: "mg",
      post_processor_path: "p.pst",
      stock_setup: { mode: "box" },
      wcs_origin: { x: 0, y: 0, z: 0 },
    });
    const b = MastercamPluginAdapterEngine.buildToolInstallEnvelope({
      project_id: "p",
      machine_group_id: "mg1",
      tool: { tool_id: "T1", tool_type: "endmill", diameter_mm: 6 },
    });
    const c = MastercamPluginAdapterEngine.buildRegenEnvelope({
      project_id: "p",
      operation_ids: ["op1"],
    });
    expect(b.id).toBeGreaterThan(a.id);
    expect(c.id).toBeGreaterThan(b.id);
  });

  it("__resetOutboundCommandId rewinds counter (test utility)", () => {
    const first = MastercamPluginAdapterEngine.buildRegenEnvelope({
      project_id: "p",
      operation_ids: ["o1"],
    });
    MastercamPluginAdapterEngine.__resetOutboundCommandId();
    const second = MastercamPluginAdapterEngine.buildRegenEnvelope({
      project_id: "p",
      operation_ids: ["o1"],
    });
    expect(second.id).toBe(first.id);
  });
});

describe("MastercamPluginAdapterEngine outbound NET-Hook — full program build", () => {
  beforeEach(() => {
    MastercamPluginAdapterEngine.__resetOutboundCommandId();
  });

  it("end-to-end program emits the right command sequence (6 envelopes)", () => {
    const envelopes = [
      MastercamPluginAdapterEngine.buildMachineGroupCreateEnvelope({
        project_id: "proj",
        machine_group_name: "MILL 1",
        post_processor_path: "C:/MCAM/posts/OKUMA.PST",
        stock_setup: { mode: "box", dimensions: { x: 100, y: 80, z: 20 } },
        wcs_origin: { x: 0, y: 0, z: 0 },
      }),
      MastercamPluginAdapterEngine.buildToolInstallEnvelope({
        project_id: "proj",
        machine_group_id: "mg1",
        tool: { tool_id: "T5", tool_type: "endmill", diameter_mm: 6, flute_count: 4, magazine_slot: 5 },
      }),
      MastercamPluginAdapterEngine.buildChainSelectEnvelope({
        project_id: "proj",
        chain_id: "c1",
        geometry_refs: ["face1"],
        chain_type: "2d_pocket_boundary",
      }),
      MastercamPluginAdapterEngine.buildOperationCreateEnvelope({
        project_id: "proj",
        machine_group_id: "mg1",
        strategy: "dynamic_mill",
        tool_id: "T5",
        chain_ids: ["c1"],
        parameters: { spindle_speed: 10000, cutting_feedrate: 2500, max_stepdown: 2, stepover_pct: 15 },
      }),
      MastercamPluginAdapterEngine.buildRegenEnvelope({
        project_id: "proj",
        operation_ids: ["op1"],
      }),
      MastercamPluginAdapterEngine.buildPostProcessEnvelope({
        project_id: "proj",
        machine_group_id: "mg1",
        post_mp_path: "C:/MCAM/posts/OKUMA.PST",
        output_nc_path: "C:/out/part.nc",
        target_controller: "OkumaOSP-P",
      }),
    ];
    const commands = envelopes.map((e) => e.command);
    expect(commands).toEqual([
      "MachineGroup.Create",
      "Tool.Install",
      "Chain.Select",
      "Operation.Create",
      "Regen.Operations",
      "Post.Run",
    ]);
    // Every envelope is JSON-serializable (NET-Hook DLL receives as JSON over named pipe)
    for (const e of envelopes) {
      expect(() => JSON.stringify(e)).not.toThrow();
      expect(e.protocol).toBe("nethook");
    }
  });
});
