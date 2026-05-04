/**
 * camDispatcher.crossProcessPost.test.ts — U-XPROC-POST-01 dispatcher tests
 *
 * Round-trip tests for the cross-process post bridge dispatcher actions:
 *   - cross_process_post_emit
 *   - cross_process_post_capabilities
 *
 * @see src/engines/CrossProcessPostBridge.ts
 * @see src/tools/dispatchers/camDispatcher.ts
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerCamDispatcher } from "../tools/dispatchers/camDispatcher.js";

interface CapturedTool {
  name: string;
  description: string;
  schema: unknown;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<{
    content: Array<{ type: string; text: string }>;
  }>;
}

function makeStubServer() {
  const captured: CapturedTool[] = [];
  return {
    tools: captured,
    tool(name: string, description: string, schema: unknown, handler: CapturedTool["handler"]) {
      captured.push({ name, description, schema, handler });
    },
  };
}

let handler: CapturedTool["handler"];

async function invoke(action: string, params: Record<string, unknown> = {}) {
  const res = (await handler({ action, params })) as Record<string, unknown>;
  if (!res.content) return res;
  const content = res.content as Array<{ text?: string }>;
  const text = content[0]?.text ?? "";
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { __raw: text } as Record<string, unknown>;
  }
}

const MILL_FACE_OP = {
  operation_type: "face",
  tool_number: 1,
  tool_diameter_mm: 50,
  tool_flutes: 4,
  material_iso: "P",
  spindle_rpm: 1200,
  feed_mm_min: 600,
  axial_depth_mm: 1.5,
  radial_depth_mm: 40,
  coolant: "flood",
  coordinates: [
    { x: 0, y: 0, z: 5, type: "rapid" },
    { x: 0, y: 0, z: -1.5, type: "linear" },
    { x: 100, y: 100, z: -1.5, type: "linear" },
  ],
};

const LATHE_OD_ROUGH_OP = {
  operation_type: "od_rough",
  tool_number: 1,
  tool_orientation: 3,
  insert_radius_mm: 0.4,
  material_iso: "P",
  spindle_rpm: 800,
  css_m_min: 200,
  css_max_rpm: 3500,
  feed_mm_rev: 0.3,
  depth_of_cut_mm: 2.0,
  start_x: 50,
  start_z: 0,
  end_x: 30,
  end_z: -50,
};

const WEDM_PROFILE_OP = {
  operation_type: "profile",
  pass: "rough",
  start_x: 0,
  start_y: 0,
  profile_points: [
    { x: 0, y: 0, type: "rapid" },
    { x: 50, y: 0, type: "linear" },
    { x: 0, y: 0, type: "linear" },
  ],
  material: { name: "D2", hardness_hrc: 60, conductivity_class: "medium" },
  thickness_mm: 12,
  wire: { diameter_mm: 0.25, type: "brass", tension_g: 1200, speed_m_min: 11 },
};

beforeAll(() => {
  const server = makeStubServer();
  registerCamDispatcher(server as unknown as Parameters<typeof registerCamDispatcher>[0]);
  const tool = server.tools.find((t) => t.name === "prism_cam");
  if (!tool) throw new Error("prism_cam tool not registered");
  handler = tool.handler;
});

describe("camDispatcher cross-process post bridge (U-XPROC-POST-01)", () => {
  describe("cross_process_post_capabilities", () => {
    it("returns the canonical 3-process taxonomy + machine map", async () => {
      const r = await invoke("cross_process_post_capabilities");
      expect(r.processes).toEqual(["mill", "lathe", "wedm"]);
      const machines = r.machines as Array<{ machine_id: string; process: string }>;
      expect(machines.length).toBeGreaterThanOrEqual(8);
      expect(machines.find((m) => m.machine_id === "hurco_vmx24")?.process).toBe("mill");
      expect(machines.find((m) => m.machine_id === "okuma_lb250")?.process).toBe("lathe");
      expect(machines.find((m) => m.machine_id === "mitsubishi_mv1200r")?.process).toBe("wedm");
    });
  });

  describe("cross_process_post_emit", () => {
    it("emits Hurco mill G-code via the dispatcher", async () => {
      const r = await invoke("cross_process_post_emit", {
        process: "mill",
        machine: "hurco_vmx24",
        operations: [MILL_FACE_OP],
      });
      expect(r.process).toBe("mill");
      expect(r.source_engine).toBe("HurcoV11MillMasterPostEngine");
      const gcode = r.gcode as string[];
      expect(gcode.length).toBeGreaterThan(5);
      expect(gcode.some((l) => l.includes("HURCO VMX24"))).toBe(true);
    });

    it("emits Okuma lathe G-code via the dispatcher", async () => {
      const r = await invoke("cross_process_post_emit", {
        process: "lathe",
        machine: "okuma_lb250",
        operations: [LATHE_OD_ROUGH_OP],
      });
      expect(r.process).toBe("lathe");
      expect(r.source_engine).toBe("OkumaB250LatheMasterPostEngine");
      const gcode = r.gcode as string[];
      expect(gcode.length).toBeGreaterThan(5);
    });

    it("emits Mitsubishi WireEDM G-code via the dispatcher", async () => {
      const r = await invoke("cross_process_post_emit", {
        process: "wedm",
        machine: "mitsubishi_mv1200r",
        operations: [WEDM_PROFILE_OP],
      });
      expect(r.process).toBe("wedm");
      expect(r.source_engine).toBe("MitsubishiMV1200RWireEDMMasterPostEngine");
      const gcode = r.gcode as string[];
      expect(gcode.length).toBeGreaterThan(5);
    });

    it("propagates unknown-machine error through dispatcher envelope", async () => {
      const r = await invoke("cross_process_post_emit", {
        process: "mill",
        machine: "haas_vf2",
        operations: [MILL_FACE_OP],
      });
      expect(r.success).toBe(false);
      expect(String(r.error)).toContain("unknown machine");
    });

    it("propagates process/machine mismatch error", async () => {
      const r = await invoke("cross_process_post_emit", {
        process: "mill",
        machine: "okuma_lb250",
        operations: [MILL_FACE_OP],
      });
      expect(r.success).toBe(false);
      expect(String(r.error)).toContain("lathe machine");
    });

    it("propagates empty-operations error", async () => {
      const r = await invoke("cross_process_post_emit", {
        process: "mill",
        machine: "hurco_vmx24",
        operations: [],
      });
      expect(r.success).toBe(false);
      expect(String(r.error)).toContain("operations array must not be empty");
    });
  });
});
