/**
 * turningDispatcher — LATHE-PRO action wiring tests
 * ====================================================
 *
 * Confirms the 8 new LATHE-PRO actions route correctly to their engines.
 * Uses a mock MCP server to capture registration and drive handlers.
 *
 * @milestone LATHE-PRO
 */

import { describe, it, expect } from "vitest";
import { registerTurningDispatcher } from "../tools/dispatchers/turningDispatcher.js";

class MockMCPServer {
  tools: Array<{
    name: string;
    description: string;
    schema: any;
    handler: (args: any) => Promise<any>;
  }> = [];
  tool(name: string, description: string, schema: any, handler: any) {
    this.tools.push({ name, description, schema, handler });
  }
}

async function call(
  server: MockMCPServer,
  action: string,
  params: Record<string, any> = {}
): Promise<any> {
  const tool = server.tools.find((t) => t.name === "prism_turning")!;
  const raw = await tool.handler({ action, params });
  const text = raw?.content?.[0]?.text;
  return typeof text === "string" ? JSON.parse(text) : raw;
}

function newServer(): MockMCPServer {
  const s = new MockMCPServer();
  registerTurningDispatcher(s);
  return s;
}

describe("turningDispatcher — LATHE-PRO gap-fill actions", () => {
  // ── Registration ─────────────────────────────────────────────────────

  it("registers prism_turning tool", () => {
    const s = newServer();
    expect(s.tools.some((t) => t.name === "prism_turning")).toBe(true);
  });

  // ── lathe_mandrel_analyze ────────────────────────────────────────────

  it("lathe_mandrel_analyze returns grip pressure result", async () => {
    const r = await call(newServer(), "lathe_mandrel_analyze", {
      mandrel: {
        nominal_od_mm: 50,
        expanded_od_mm: 50.05,
        grip_length_mm: 40,
        material: "4140",
      },
      part: {
        bore_id_mm: 50,
        material: "4140",
        outer_od_mm: 100,
      },
      actuator_force_n: 5000,
      rpm: 2000,
    });
    expect(r.grip_pressure_mpa).toBeGreaterThan(0);
    expect(r.max_transmitted_torque_nm).toBeGreaterThan(0);
  });

  // ── lathe_face_driver_torque ────────────────────────────────────────

  it("lathe_face_driver_torque returns max torque", async () => {
    const r = await call(newServer(), "lathe_face_driver_torque", {
      driver: {
        pin_count: 4,
        pin_diameter_mm: 6,
        penetration_depth_mm: 1.0,
        pin_circle_radius_mm: 25,
        pin_hardness_hrc: 58,
      },
      part_material: {
        name: "4140",
        yield_strength_mpa: 655,
        hardness_hrc: 28,
      },
    });
    expect(r.max_torque_nm).toBeGreaterThan(0);
  });

  // ── lathe_sync_verify ────────────────────────────────────────────────

  it("lathe_sync_verify passes clean Okuma sync", async () => {
    const r = await call(newServer(), "lathe_sync_verify", {
      dialect: "okuma",
      programs: [
        { channel: 1, lines: ["G0 X10", "G126 P1", "G127 P2"] },
        { channel: 2, lines: ["G0 X20", "G127 P1", "G126 P2"] },
      ],
    });
    expect(r.is_valid).toBe(true);
  });

  it("lathe_sync_verify detects orphan sync", async () => {
    const r = await call(newServer(), "lathe_sync_verify", {
      dialect: "okuma",
      programs: [
        { channel: 1, lines: ["G126 P99", "G0 X0"] },
        { channel: 2, lines: ["G0 X0"] },
      ],
    });
    expect(r.is_valid).toBe(false);
    expect(r.issues.some((i: any) => i.kind === "orphan")).toBe(true);
  });

  // ── lathe_trilobe_deformation ────────────────────────────────────────

  it("lathe_trilobe_deformation returns lobe amplitude + oversize", async () => {
    const r = await call(newServer(), "lathe_trilobe_deformation", {
      bore_radius_mm: 50,
      wall_thickness_mm: 5,
      grip_length_mm: 40,
      total_clamp_force_n: 10000,
      jaw_count: 3,
    });
    expect(r.lobe_amplitude_um).toBeGreaterThan(0);
    expect(r.recommended_oversize_mm).toBeGreaterThan(0);
  });

  it("lathe_trilobe_deformation flags 3-jaw thin-wall", async () => {
    const r = await call(newServer(), "lathe_trilobe_deformation", {
      bore_radius_mm: 50,
      wall_thickness_mm: 1.5,
      grip_length_mm: 40,
      total_clamp_force_n: 50000,
      jaw_count: 3,
    });
    expect(r.is_trilobe_critical).toBe(true);
  });

  // ── lathe_rules_generate ────────────────────────────────────────────

  it("lathe_rules_generate produces velocity/feed/DoC rules", async () => {
    const r = await call(newServer(), "lathe_rules_generate", {
      material: "4140",
      iso_group: "P",
      operation: "roughing",
      machine_class: "slant_bed",
      tool_type: "carbide_insert",
    });
    expect(r.rule_count_by_kind.velocity_envelope).toBeGreaterThan(0);
    expect(r.rule_count_by_kind.feed_envelope).toBeGreaterThan(0);
    expect(r.rule_count_by_kind.spindle_constraint).toBeGreaterThan(0);
  });

  // ── lathe_stock_feed_validate ───────────────────────────────────────

  it("lathe_stock_feed_validate passes for fresh bar", async () => {
    const r = await call(newServer(), "lathe_stock_feed_validate", {
      bar: {
        bar_length_mm: 3000,
        bar_diameter_mm: 25,
        material: "12L14",
        min_gripping_length_mm: 50,
      },
      part: {
        part_length_mm: 50,
        cutoff_width_mm: 3,
      },
    });
    expect(r.validation.valid).toBe(true);
    expect(r.state.remaining_bar_mm).toBe(3000);
  });

  it("lathe_stock_feed_validate fails when remaining < required", async () => {
    const r = await call(newServer(), "lathe_stock_feed_validate", {
      bar: {
        bar_length_mm: 3000,
        bar_diameter_mm: 25,
        material: "12L14",
        min_gripping_length_mm: 50,
      },
      part: {
        part_length_mm: 50,
        cutoff_width_mm: 3,
      },
      remaining_bar_mm: 20,
    });
    expect(r.validation.valid).toBe(false);
  });

  // ── lathe_stock_feed_advance ────────────────────────────────────────

  it("lathe_stock_feed_advance emits feed_ok on fresh bar", async () => {
    const r = await call(newServer(), "lathe_stock_feed_advance", {
      bar: {
        bar_length_mm: 3000,
        bar_diameter_mm: 25,
        material: "12L14",
        min_gripping_length_mm: 50,
      },
      part: {
        part_length_mm: 50,
        cutoff_width_mm: 3,
      },
    });
    expect(r.event.kind).toBe("feed_ok");
    expect(r.state.parts_produced).toBe(1);
  });

  // ── lathe_stock_feed_yield ──────────────────────────────────────────

  it("lathe_stock_feed_yield returns parts/bar + scrap", async () => {
    const r = await call(newServer(), "lathe_stock_feed_yield", {
      bar: {
        bar_length_mm: 3000,
        bar_diameter_mm: 25,
        material: "12L14",
        min_gripping_length_mm: 50,
      },
      part: {
        part_length_mm: 50,
        cutoff_width_mm: 3,
      },
    });
    expect(r.parts_per_bar).toBeGreaterThan(0);
    expect(r.yield_percent).toBeGreaterThan(0);
    expect(r.yield_percent).toBeLessThanOrEqual(100);
  });

  // ── Unknown action ───────────────────────────────────────────────────

  it("unknown action returns error", async () => {
    const r = await call(newServer(), "lathe_does_not_exist");
    expect(r.error || r?.success === false).toBeTruthy();
  });
});
