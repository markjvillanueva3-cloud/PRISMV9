/**
 * CAMPostInvokeOrchestratorEngine tests — U-CAM-R3-10
 * =====================================================
 * Verifies the 4-CAM post-invoke orchestrator resolves JM Die machines,
 * routes to the correct adapter, and produces valid per-CAM envelopes.
 */

import { describe, it, expect } from "vitest";
import {
  camPostInvokeOrchestratorEngine,
  CAMPostInvokeOrchestratorEngine,
  type Priority4CAMSlug,
} from "../engines/CAMPostInvokeOrchestratorEngine.js";
import { JM_DIE_CONTROLLER_MAP } from "../data/jm-die-profile.js";

const engine = new CAMPostInvokeOrchestratorEngine();

describe("CAMPostInvokeOrchestratorEngine — machine resolution", () => {
  it("resolves a known JM Die machine_id", () => {
    const m = engine.resolveMachine("LTH-01");
    expect(m).not.toBeNull();
    expect(m!.machine_name).toMatch(/Okuma/);
    expect(m!.post_processor).toBeTruthy();
  });

  it("returns null for unknown machine_id", () => {
    expect(engine.resolveMachine("NONEXISTENT-99")).toBeNull();
  });

  it("eligibleMachinesForCAM returns machines that have a post_processor", () => {
    const eligible = engine.eligibleMachinesForCAM("mastercam");
    expect(eligible.length).toBeGreaterThan(0);
    for (const m of eligible) expect(m.post_processor).toBeTruthy();
  });

  it("every JM Die lathe has a post_processor entry", () => {
    const lathes = JM_DIE_CONTROLLER_MAP.filter((m) => m.machine_id.startsWith("LTH-"));
    expect(lathes.length).toBeGreaterThanOrEqual(7);
    for (const m of lathes) expect(m.post_processor).toBeTruthy();
  });
});

describe("CAMPostInvokeOrchestratorEngine — per-CAM envelope routing", () => {
  const cams: Priority4CAMSlug[] = ["mastercam", "hypermill", "fusion360", "inventor-hsm"];

  it("builds envelopes for all 4 priority CAMs against LTH-01 (Okuma GENOS L300-M)", () => {
    for (const cam of cams) {
      const r = camPostInvokeOrchestratorEngine.buildPostInvokeFromInventory({
        target_cam: cam,
        project_id: "p1",
        machine_id: "LTH-01",
        output_nc_path: "C:/out/part.nc",
      });
      expect(r.ok).toBe(true);
      expect(r.envelope).toBeDefined();
      expect(r.envelope!.target_cam).toBe(cam);
      expect(r.envelope!.machine_id).toBe("LTH-01");
      expect(r.envelope!.controller_family).toBe("okuma");
      expect(r.envelope!.resolved_post_path).toMatch(/OKUMA_GENOS_L300M/);
    }
  });

  it("each CAM gets its canonical protocol label", () => {
    const expectedProtocols: Record<Priority4CAMSlug, string> = {
      mastercam: "nethook",
      hypermill: "xml-rpc-com",
      fusion360: "json-rpc-ws",
      "inventor-hsm": "com-ilogic",
    };
    for (const cam of cams) {
      const r = camPostInvokeOrchestratorEngine.buildPostInvokeFromInventory({
        target_cam: cam,
        project_id: "p1",
        machine_id: "LTH-01",
        output_nc_path: "out.nc",
      });
      expect(r.envelope!.protocol).toBe(expectedProtocols[cam]);
    }
  });

  it("Fusion envelope is a valid JSON-RPC 2.0 shape", () => {
    const r = camPostInvokeOrchestratorEngine.buildPostInvokeFromInventory({
      target_cam: "fusion360",
      project_id: "p",
      machine_id: "VMC-01",
      output_nc_path: "out.nc",
    });
    expect(r.ok).toBe(true);
    const env = r.envelope!.envelope as any;
    expect(env.jsonrpc).toBe("2.0");
    expect(env.method).toBe("postprocess.run");
  });

  it("Mastercam envelope carries nethook protocol + Post.Run command", () => {
    const r = camPostInvokeOrchestratorEngine.buildPostInvokeFromInventory({
      target_cam: "mastercam",
      project_id: "p",
      machine_id: "LTH-01",
      output_nc_path: "out.nc",
    });
    const env = r.envelope!.envelope as any;
    expect(env.protocol).toBe("nethook");
    expect(env.command).toBe("Post.Run");
  });

  it("hyperMILL envelope carries xml-rpc-com protocol + post.run method", () => {
    const r = camPostInvokeOrchestratorEngine.buildPostInvokeFromInventory({
      target_cam: "hypermill",
      project_id: "p",
      machine_id: "LTH-01",
      output_nc_path: "out.nc",
    });
    const env = r.envelope!.envelope as any;
    expect(env.protocol).toBe("xml-rpc-com");
    expect(env.method).toBe("post.run");
  });

  it("Inventor HSM envelope carries com-ilogic protocol + postprocess.run method", () => {
    const r = camPostInvokeOrchestratorEngine.buildPostInvokeFromInventory({
      target_cam: "inventor-hsm",
      project_id: "p",
      machine_id: "VMC-01",
      output_nc_path: "out.nc",
    });
    const env = r.envelope!.envelope as any;
    expect(env.protocol).toBe("com-ilogic");
    expect(env.method).toBe("postprocess.run");
  });
});

describe("CAMPostInvokeOrchestratorEngine — provenance + override", () => {
  it("provenance is jm_die_controller_map when no override given", () => {
    const r = camPostInvokeOrchestratorEngine.buildPostInvokeFromInventory({
      target_cam: "mastercam",
      project_id: "p",
      machine_id: "LTH-01",
      output_nc_path: "out.nc",
    });
    expect(r.envelope!.provenance.resolved_via).toBe("jm_die_controller_map");
  });

  it("override_post_path flags provenance as override", () => {
    const r = camPostInvokeOrchestratorEngine.buildPostInvokeFromInventory({
      target_cam: "mastercam",
      project_id: "p",
      machine_id: "LTH-01",
      output_nc_path: "out.nc",
      override_post_path: "C:/custom/MY_POST.pst",
    });
    expect(r.envelope!.provenance.resolved_via).toBe("override");
    expect(r.envelope!.resolved_post_path).toBe("C:/custom/MY_POST.pst");
  });
});

describe("CAMPostInvokeOrchestratorEngine — error handling", () => {
  it("rejects unknown machine_id with descriptive error", () => {
    const r = camPostInvokeOrchestratorEngine.buildPostInvokeFromInventory({
      target_cam: "mastercam",
      project_id: "p",
      machine_id: "NOT-A-MACHINE",
      output_nc_path: "out.nc",
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/Unknown machine_id/);
  });

  it("rejects when output_nc_path is empty", () => {
    const r = camPostInvokeOrchestratorEngine.buildPostInvokeFromInventory({
      target_cam: "mastercam",
      project_id: "p",
      machine_id: "LTH-01",
      output_nc_path: "",
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/output_nc_path/);
  });
});
