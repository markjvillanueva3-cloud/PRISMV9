/**
 * Tests for CrossProcessPostBridge
 * @see src/engines/CrossProcessPostBridge.ts
 * @see U-XPROC-POST-01 (cross-process G-code emission for mill, lathe, wedm)
 */

import { describe, it, expect } from "vitest";
import {
  CrossProcessPostBridge,
  POST_SUPPORTED_PROCESSES,
  type CrossProcessPostRequest,
  type PostProcessId,
} from "../engines/CrossProcessPostBridge.js";

// ============================================================================
// FIXTURES — minimum viable per-process operations
// ============================================================================

const MILL_FACE_OP = {
  operation_type: "face",
  tool_number: 1,
  tool_diameter_mm: 50,
  tool_flutes: 4,
  tool_description: "50mm Face Mill",
  material_iso: "P",
  spindle_rpm: 1200,
  feed_mm_min: 600,
  axial_depth_mm: 1.5,
  radial_depth_mm: 40,
  coolant: "flood",
  coordinates: [
    { x: 0, y: 0, z: 5, type: "rapid" },
    { x: 0, y: 0, z: -1.5, type: "linear" },
    { x: 100, y: 0, z: -1.5, type: "linear" },
    { x: 100, y: 100, z: -1.5, type: "linear" },
    { x: 0, y: 100, z: -1.5, type: "linear" },
    { x: 0, y: 0, z: 5, type: "rapid" },
  ],
};

const LATHE_OD_ROUGH_OP = {
  operation_type: "od_rough",
  tool_number: 1,
  tool_orientation: 3,
  insert_radius_mm: 0.4,
  tool_description: "CNMG 432 — OD roughing",
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
    { x: 50, y: 50, type: "linear" },
    { x: 0, y: 50, type: "linear" },
    { x: 0, y: 0, type: "linear" },
  ],
  material: { name: "D2 Tool Steel", hardness_hrc: 60, conductivity_class: "medium" },
  thickness_mm: 12,
  wire: { diameter_mm: 0.25, type: "brass", tension_g: 1200, speed_m_min: 11 },
};

// ============================================================================
// SECTION 1 — listProcessSupport(): capability matrix
// ============================================================================

describe("CrossProcessPostBridge.listProcessSupport()", () => {
  it("declares the 3 canonical processes", () => {
    const out = CrossProcessPostBridge.listProcessSupport();
    expect(out.processes).toEqual(["mill", "lathe", "wedm"]);
  });

  it("registers Hurco machines under mill", () => {
    const out = CrossProcessPostBridge.listProcessSupport();
    const millMachines = out.machines.filter((m) => m.process === "mill");
    const ids = millMachines.map((m) => m.machine_id);
    expect(ids).toContain("hurco_vmx24");
    expect(ids).toContain("hurco_v11");
    expect(ids).toContain("hurco");
    millMachines.forEach((m) => expect(m.source_engine).toBe("HurcoV11MillMasterPostEngine"));
  });

  it("registers Okuma machines under lathe", () => {
    const out = CrossProcessPostBridge.listProcessSupport();
    const latheMachines = out.machines.filter((m) => m.process === "lathe");
    const ids = latheMachines.map((m) => m.machine_id);
    expect(ids).toContain("okuma_lb250");
    expect(ids).toContain("okuma_b250");
    expect(ids).toContain("okuma");
    latheMachines.forEach((m) => expect(m.source_engine).toBe("OkumaB250LatheMasterPostEngine"));
  });

  it("registers Mitsubishi machines under wedm", () => {
    const out = CrossProcessPostBridge.listProcessSupport();
    const wedmMachines = out.machines.filter((m) => m.process === "wedm");
    const ids = wedmMachines.map((m) => m.machine_id);
    expect(ids).toContain("mitsubishi_mv1200r");
    expect(ids).toContain("mitsubishi");
    wedmMachines.forEach((m) =>
      expect(m.source_engine).toBe("MitsubishiMV1200RWireEDMMasterPostEngine"),
    );
  });
});

// ============================================================================
// SECTION 2 — emit(): mill path (Hurco VMX24 / V11)
// ============================================================================

describe("CrossProcessPostBridge.emit() — mill path (Hurco)", () => {
  it("emits Hurco G-code for a face operation", async () => {
    const out = await CrossProcessPostBridge.emit({
      process: "mill",
      machine: "hurco_vmx24",
      operations: [MILL_FACE_OP],
    });
    expect(out.process).toBe("mill");
    expect(out.machine).toBe("hurco_vmx24");
    expect(out.source_engine).toBe("HurcoV11MillMasterPostEngine");
    expect(out.gcode.length).toBeGreaterThan(5);
    expect(out.gcode.some((line) => line.includes("HURCO VMX24"))).toBe(true);
    expect(out.extras.tools_used).toEqual([1]);
    expect(out.extras.total_lines).toBe(out.gcode.length);
  });

  it("respects machine alias 'hurco' (short form)", async () => {
    const out = await CrossProcessPostBridge.emit({
      process: "mill",
      machine: "hurco",
      operations: [MILL_FACE_OP],
    });
    expect(out.process).toBe("mill");
    expect(out.source_engine).toBe("HurcoV11MillMasterPostEngine");
  });

  it("passes config override through to the engine (program_number)", async () => {
    const out = await CrossProcessPostBridge.emit({
      process: "mill",
      machine: "hurco_vmx24",
      operations: [MILL_FACE_OP],
      config: { program_number: 7042 },
    });
    expect(out.extras.program_number).toBe(7042);
    expect(out.gcode[0]).toContain("O7042");
  });

  it("returns warnings + physics_checks arrays even when empty", async () => {
    const out = await CrossProcessPostBridge.emit({
      process: "mill",
      machine: "hurco_vmx24",
      operations: [MILL_FACE_OP],
    });
    expect(Array.isArray(out.warnings)).toBe(true);
    expect(Array.isArray(out.physics_checks)).toBe(true);
    expect(Array.isArray(out.tribal_tips_applied)).toBe(true);
  });
});

// ============================================================================
// SECTION 3 — emit(): lathe path (Okuma LB250)
// ============================================================================

describe("CrossProcessPostBridge.emit() — lathe path (Okuma)", () => {
  it("emits Okuma G-code for an OD roughing operation", async () => {
    const out = await CrossProcessPostBridge.emit({
      process: "lathe",
      machine: "okuma_lb250",
      operations: [LATHE_OD_ROUGH_OP],
    });
    expect(out.process).toBe("lathe");
    expect(out.machine).toBe("okuma_lb250");
    expect(out.source_engine).toBe("OkumaB250LatheMasterPostEngine");
    expect(out.gcode.length).toBeGreaterThan(5);
    expect(out.gcode.some((line) => line.includes("OKUMA"))).toBe(true);
  });

  it("respects machine alias 'okuma' (short form)", async () => {
    const out = await CrossProcessPostBridge.emit({
      process: "lathe",
      machine: "okuma",
      operations: [LATHE_OD_ROUGH_OP],
    });
    expect(out.source_engine).toBe("OkumaB250LatheMasterPostEngine");
  });
});

// ============================================================================
// SECTION 4 — emit(): wedm path (Mitsubishi MV1200R)
// ============================================================================

describe("CrossProcessPostBridge.emit() — wedm path (Mitsubishi)", () => {
  it("emits Mitsubishi WireEDM G-code for a profile rough pass", async () => {
    const out = await CrossProcessPostBridge.emit({
      process: "wedm",
      machine: "mitsubishi_mv1200r",
      operations: [WEDM_PROFILE_OP],
    });
    expect(out.process).toBe("wedm");
    expect(out.machine).toBe("mitsubishi_mv1200r");
    expect(out.source_engine).toBe("MitsubishiMV1200RWireEDMMasterPostEngine");
    expect(out.gcode.length).toBeGreaterThan(5);
    expect(out.gcode.some((line) => line.includes("MITSUBISHI"))).toBe(true);
  });

  it("respects machine alias 'mitsubishi' (short form)", async () => {
    const out = await CrossProcessPostBridge.emit({
      process: "wedm",
      machine: "mitsubishi",
      operations: [WEDM_PROFILE_OP],
    });
    expect(out.source_engine).toBe("MitsubishiMV1200RWireEDMMasterPostEngine");
  });
});

// ============================================================================
// SECTION 5 — emit(): failure modes
// ============================================================================

describe("CrossProcessPostBridge.emit() — failure modes", () => {
  it("throws on unsupported process", async () => {
    await expect(
      CrossProcessPostBridge.emit({
        process: "ultrasonic" as PostProcessId,
        machine: "hurco",
        operations: [MILL_FACE_OP],
      }),
    ).rejects.toThrow(/unsupported process/);
  });

  it("throws when machine is empty", async () => {
    await expect(
      CrossProcessPostBridge.emit({
        process: "mill",
        machine: "",
        operations: [MILL_FACE_OP],
      }),
    ).rejects.toThrow(/machine required/);
  });

  it("throws on unknown machine id", async () => {
    await expect(
      CrossProcessPostBridge.emit({
        process: "mill",
        machine: "haas_vf2",
        operations: [MILL_FACE_OP],
      }),
    ).rejects.toThrow(/unknown machine "haas_vf2"/);
  });

  it("throws on process/machine mismatch (mill request → lathe machine)", async () => {
    await expect(
      CrossProcessPostBridge.emit({
        process: "mill",
        machine: "okuma_lb250",
        operations: [MILL_FACE_OP],
      }),
    ).rejects.toThrow(/lathe machine but process="mill"/);
  });

  it("throws when operations is not an array", async () => {
    await expect(
      CrossProcessPostBridge.emit({
        process: "mill",
        machine: "hurco",
        operations: "not-an-array" as unknown as readonly Record<string, unknown>[],
      }),
    ).rejects.toThrow(/operations must be an array/);
  });

  it("throws when operations is an empty array", async () => {
    await expect(
      CrossProcessPostBridge.emit({
        process: "mill",
        machine: "hurco",
        operations: [],
      }),
    ).rejects.toThrow(/operations array must not be empty/);
  });
});

// ============================================================================
// SECTION 6 — emit(): adversarial inputs + cross-cutting
// ============================================================================

describe("CrossProcessPostBridge.emit() — adversarial + cross-cutting", () => {
  it("normalizes machine id case-insensitively (HURCO_VMX24 = hurco_vmx24)", async () => {
    const out = await CrossProcessPostBridge.emit({
      process: "mill",
      machine: "HURCO_VMX24",
      operations: [MILL_FACE_OP],
    });
    expect(out.source_engine).toBe("HurcoV11MillMasterPostEngine");
  });

  it("trims surrounding whitespace from machine id", async () => {
    const out = await CrossProcessPostBridge.emit({
      process: "mill",
      machine: "  hurco_vmx24  ",
      operations: [MILL_FACE_OP],
    });
    expect(out.source_engine).toBe("HurcoV11MillMasterPostEngine");
  });

  it("preserves the raw machine input on the result envelope", async () => {
    const out = await CrossProcessPostBridge.emit({
      process: "mill",
      machine: "Hurco",
      operations: [MILL_FACE_OP],
    });
    expect(out.machine).toBe("Hurco");
  });

  it("emits across all 3 processes in parallel without state leakage", async () => {
    const [mill, lathe, wedm] = await Promise.all([
      CrossProcessPostBridge.emit({
        process: "mill",
        machine: "hurco_vmx24",
        operations: [MILL_FACE_OP],
      }),
      CrossProcessPostBridge.emit({
        process: "lathe",
        machine: "okuma_lb250",
        operations: [LATHE_OD_ROUGH_OP],
      }),
      CrossProcessPostBridge.emit({
        process: "wedm",
        machine: "mitsubishi_mv1200r",
        operations: [WEDM_PROFILE_OP],
      }),
    ]);
    expect(mill.process).toBe("mill");
    expect(lathe.process).toBe("lathe");
    expect(wedm.process).toBe("wedm");
    expect(mill.gcode.length).toBeGreaterThan(0);
    expect(lathe.gcode.length).toBeGreaterThan(0);
    expect(wedm.gcode.length).toBeGreaterThan(0);
  });

  it("POST_SUPPORTED_PROCESSES is exactly the 3 documented ids", () => {
    expect(POST_SUPPORTED_PROCESSES).toEqual(["mill", "lathe", "wedm"]);
  });

  it("rejects passing operations as a non-array shape gracefully", async () => {
    await expect(
      CrossProcessPostBridge.emit({
        process: "mill",
        machine: "hurco",
        operations: { 0: MILL_FACE_OP } as unknown as readonly Record<string, unknown>[],
      }),
    ).rejects.toThrow(/operations must be an array/);
  });
});
