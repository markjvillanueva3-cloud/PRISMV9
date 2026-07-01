/**
 * camDispatcher — FusionMultiAxisEngine wiring suite
 * ===================================================
 *
 * WIRE-UNWIRED (foxtrot 2026-05-17) — wires the validator-confirmed
 * TRULY-UNWIRED FusionMultiAxisEngine (861-line real engine, NOT a stub: a
 * deterministic Fusion 360 5-axis toolpath generator — singularity
 * avoidance, kinematic validation, RTCP) into prism_cam with 5 actions:
 *   - generate(input)               → fusion_5x_generate
 *   - getMachine(id)                → fusion_5x_get_machine
 *   - getAllMachines()              → fusion_5x_get_all_machines
 *   - calculateAngles(axis, mach)   → fusion_5x_calculate_angles
 *   - singularityProximity(...)     → fusion_5x_singularity_proximity
 *
 * All five surfaces are SYNC + pure (no external I/O). The machine-scoped
 * actions resolve a MachineKinematics object from a `machine_id` against
 * the engine's MACHINE_KINEMATICS_CATALOG; an unknown id yields a graceful
 * { success:false, error } result (no throw). Includes the
 * z.enum-membership guard for the RGS-TOOL-AUTOINVOKE-MS1 false-green class
 * (MockMCPServer bypasses z.enum).
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerCamDispatcher, ACTIONS } from "../tools/dispatchers/camDispatcher.js";

interface CapturedTool {
  name: string;
  description: string;
  schema: unknown;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

class MockMCPServer {
  tools: CapturedTool[] = [];
  tool(name: string, description: string, schema: unknown, handler: CapturedTool["handler"]) {
    this.tools.push({ name, description, schema, handler });
  }
}

async function call(
  server: MockMCPServer,
  action: string,
  params: Record<string, unknown> = {},
): Promise<{ ok: boolean; data: unknown }> {
  const tool = server.tools.find(t => t.name === "prism_cam");
  if (!tool) throw new Error("prism_cam not registered");
  const raw = (await tool.handler({ action, params })) as
    | { content: { type: string; text: string }[] }
    | { success: false; error: string };
  if (raw && typeof raw === "object" && "success" in raw && (raw as { success: boolean }).success === false) {
    return { ok: false, data: raw };
  }
  const envelope = raw as { content: { type: string; text: string }[] };
  const text = envelope.content[0]!.text;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, data: { rawText: text } };
  }
  if (parsed && typeof parsed === "object" && "error" in (parsed as Record<string, unknown>)) {
    return { ok: false, data: parsed };
  }
  return { ok: true, data: parsed };
}

let server: MockMCPServer;

beforeEach(() => {
  server = new MockMCPServer();
  registerCamDispatcher(server as unknown as { tool: (...args: unknown[]) => void });
});

// ─────────────────────────────────────────────────────────────────────
// 1. z.enum gate membership (RGS-TOOL-AUTOINVOKE-MS1 false-green guard)
// ─────────────────────────────────────────────────────────────────────
describe("fusion multi-axis — enum registration", () => {
  const expected = [
    "fusion_5x_generate", "fusion_5x_get_machine", "fusion_5x_get_all_machines",
    "fusion_5x_calculate_angles", "fusion_5x_singularity_proximity",
  ];
  it("all 5 actions are in the prism_cam z.enum ACTIONS list", () => {
    for (const a of expected) expect(ACTIONS).toContain(a);
  });
  it("no duplicate ACTIONS keys introduced (anti-regression)", () => {
    expect(new Set(ACTIONS).size).toBe(ACTIONS.length);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 2. fusion_5x_get_all_machines — the frozen kinematics catalog
// ─────────────────────────────────────────────────────────────────────
describe("fusion_5x_get_all_machines — kinematics catalog", () => {
  it("returns all 5 catalog machines with a matching count", async () => {
    const r = await call(server, "fusion_5x_get_all_machines", {});
    expect(r.ok).toBe(true);
    const d = r.data as Record<string, unknown>;
    expect(d.success).toBe(true);
    expect(d.count).toBe(5);
    const machines = d.machines as Array<Record<string, unknown>>;
    expect(machines.length).toBe(5);
    const ids = machines.map(m => m.id).sort();
    // Engine MACHINE_KINEMATICS_CATALOG pins exactly these 5 ids.
    expect(ids).toEqual(["dmg_cmx_u", "generic_gantry", "haas_umc500", "mazak_variaxis", "okuma_mu_v"]);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 3. fusion_5x_get_machine — id lookup + graceful not-found
// ─────────────────────────────────────────────────────────────────────
describe("fusion_5x_get_machine — single machine lookup", () => {
  it("resolves 'haas_umc500' to its exact catalog kinematics", async () => {
    const r = await call(server, "fusion_5x_get_machine", { machine_id: "haas_umc500" });
    expect(r.ok).toBe(true);
    const m = (r.data as Record<string, unknown>).machine as Record<string, unknown>;
    // Bind to the EXACT engine catalog fields (no fallback).
    expect(m.id).toBe("haas_umc500");
    expect(m.type).toBe("table_table");
    expect(m.primary_axis).toBe("A");
  });

  it("an unknown machine id returns a graceful success:false error (no throw)", async () => {
    const r = await call(server, "fusion_5x_get_machine", { machine_id: "no_such_machine" });
    // The not-found result carries an `error` field, so call() classifies it
    // ok:false — expected. The real contract is the data payload shape.
    const d = r.data as Record<string, unknown>;
    expect(d.success).toBe(false);
    expect(typeof d.error).toBe("string");
    expect((d.error as string)).toMatch(/not found/i);
    expect((d.error as string)).toContain("no_such_machine");
  });
});

// ─────────────────────────────────────────────────────────────────────
// 4. fusion_5x_calculate_angles — tool-axis → rotary angle solver
// ─────────────────────────────────────────────────────────────────────
describe("fusion_5x_calculate_angles — rotary inverse kinematics", () => {
  it("a vertical tool axis on the Haas resolves to the exact (0, 180) angle pair", async () => {
    const r = await call(server, "fusion_5x_calculate_angles", {
      machine_id: "haas_umc500",
      tool_axis: { x: 0, y: 0, z: 1 },
    });
    expect(r.ok).toBe(true);
    const angles = (r.data as Record<string, unknown>).angles as Record<string, number>;
    // Independently computed against the engine at HEAD for this exact input.
    expect(angles.primary_deg).toBe(0);
    expect(angles.secondary_deg).toBe(180);
  });

  it("an unknown machine id is a graceful not-found, not a throw", async () => {
    const r = await call(server, "fusion_5x_calculate_angles", {
      machine_id: "bogus", tool_axis: { x: 0, y: 0, z: 1 },
    });
    const d = r.data as Record<string, unknown>;
    expect(d.success).toBe(false);
    expect((d.error as string)).toMatch(/not found/i);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 5. fusion_5x_singularity_proximity — singularity-distance math
// ─────────────────────────────────────────────────────────────────────
describe("fusion_5x_singularity_proximity — singularity distance", () => {
  it("a vertical tool axis on the Haas sits AT the singularity (proximity 0)", async () => {
    const r = await call(server, "fusion_5x_singularity_proximity", {
      machine_id: "haas_umc500",
      tool_axis: { x: 0, y: 0, z: 1 },
    });
    expect(r.ok).toBe(true);
    const d = r.data as Record<string, unknown>;
    expect(d.success).toBe(true);
    // A purely vertical tool axis aligns with the rotary singularity → the
    // engine computes proximity 0 (independently verified at HEAD).
    expect(d.proximity_deg).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 6. fusion_5x_generate — full 5-axis toolpath round-trip
// ─────────────────────────────────────────────────────────────────────
describe("fusion_5x_generate — 5-axis toolpath generation", () => {
  it("generates a kinematically-validated toolpath for a 2-point input on the Haas", async () => {
    const r = await call(server, "fusion_5x_generate", {
      machine_id: "haas_umc500",
      points: [
        { index: 0, position: { x: 0, y: 0, z: 0 }, tool_axis: { x: 0, y: 0, z: 1 }, feed_mmmin: 1000, rpm: 8000 },
        { index: 1, position: { x: 10, y: 0, z: 0 }, tool_axis: { x: 0.1, y: 0, z: 0.995 }, feed_mmmin: 1000, rpm: 8000 },
      ],
    });
    expect(r.ok).toBe(true);
    const d = r.data as Record<string, unknown>;
    expect(d.success).toBe(true);
    // 2 input points → 2 processed points.
    expect((d.points as unknown[]).length).toBe(2);
    // Deterministic metrics independently verified against the engine at HEAD.
    expect(d.cycle_time_sec).toBe(0.9);
    expect(d.total_rotary_travel_deg).toBe(95.7);
    // RTCP is enabled on the Haas catalog entry.
    const rtcp = d.rtcp_summary as Record<string, unknown>;
    expect(rtcp.enabled).toBe(true);
    // Kinematic validation + singularity analysis.
    const kin = d.kinematics as Record<string, unknown>;
    expect(kin.reachable).toBe(true);
    const sing = d.singularity as Record<string, unknown>;
    // Point 0's vertical tool axis sits AT the rotary singularity (proximity
    // 0 < SINGULARITY_CRITICAL_DEG) → is_safe is deterministically false here.
    expect(sing.is_safe).toBe(false);
    // is_safe false → generate() pushes a singularity warning, so warnings is
    // non-empty and survives the MCP-transport empty-array slimmer.
    expect(Array.isArray(d.warnings)).toBe(true);
    expect((d.warnings as unknown[]).length).toBeGreaterThan(0);
  });

  it("an unknown machine id returns a graceful not-found (no throw)", async () => {
    const r = await call(server, "fusion_5x_generate", {
      machine_id: "ghost_machine",
      points: [{ index: 0, position: { x: 0, y: 0, z: 0 }, tool_axis: { x: 0, y: 0, z: 1 }, feed_mmmin: 1000, rpm: 8000 }],
    });
    const d = r.data as Record<string, unknown>;
    expect(d.success).toBe(false);
    expect((d.error as string)).toMatch(/not found/i);
    expect((d.error as string)).toContain("ghost_machine");
  });
});
