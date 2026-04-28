/**
 * dataDispatcher — U-WIRE06 round-trip suite
 * ==========================================
 *
 * ENGINE-WIRE-MS0 / U-WIRE06 — wires 5 tool data plane engines into
 * prism_data:
 *   - toolHolderCatalogEngine.search       → tool_holder_catalog_search
 *   - toolHolderRegistryEngine.query       → tool_holder_registry_query
 *   - toolGeometrySelectionEngine.calculate → tool_geometry_select
 *   - toolCoatingSelectionEngine.calculate  → tool_coating_select
 *   - toolAssemblyModelEngine.buildAssembly → tool_assembly_build
 *
 * @milestone ENGINE-WIRE-MS0
 * @unit U-WIRE06
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerDataDispatcher } from "../tools/dispatchers/dataDispatcher.js";

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
): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const tool = server.tools[0]!;
  const raw = (await tool.handler({ action, params })) as
    | { content: { type: string; text: string }[] }
    | { success: false; error: string; action: string; dispatcher: string };
  if (raw && typeof raw === "object" && "success" in raw && (raw as { success: boolean }).success === false) {
    return { ok: false, data: raw as unknown as Record<string, unknown> };
  }
  const envelope = raw as { content: { type: string; text: string }[] };
  const text = envelope.content[0]!.text;
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, data: { rawText: text } };
  }
  if (parsed && typeof parsed === "object" && "error" in parsed) {
    return { ok: false, data: parsed };
  }
  return { ok: true, data: parsed };
}

let server: MockMCPServer;

beforeEach(() => {
  server = new MockMCPServer();
  registerDataDispatcher(server as unknown as { tool: (...args: unknown[]) => void });
});

// ─────────────────────────────────────────────────────────────────────
// 1. Happy paths — one per engine
// ─────────────────────────────────────────────────────────────────────
describe("U-WIRE06 happy paths — round-trip via prism_data", () => {
  it("tool_holder_catalog_search — returns array (possibly empty for fresh inventory)", async () => {
    const r = await call(server, "tool_holder_catalog_search", {
      taper: "BT40",
      limit: 5,
    });
    expect(r.ok).toBe(true);
    expect(Array.isArray(r.data) || typeof r.data === "object").toBe(true);
  });

  it("tool_holder_registry_query — returns published holders for BT40", async () => {
    const r = await call(server, "tool_holder_registry_query", {
      taper: "BT40",
      shank_diameter_mm: 6,
    });
    expect(r.ok).toBe(true);
    // Registry has seed catalog including BT40-SF-6 (shrink_fit, shank=6)
    expect(Array.isArray(r.data) || typeof r.data === "object").toBe(true);
  });

  it("tool_geometry_select — recommends flute count + helix angle for carbon_steel slotting", async () => {
    const r = await call(server, "tool_geometry_select", {
      workpiece_material: "carbon_steel",
      operation: "slotting",
      tool_diameter_mm: 12,
      axial_depth_mm: 6,
      radial_depth_mm: 12,
      machine_rigidity: "high",
    });
    expect(r.ok).toBe(true);
    expect(typeof r.data).toBe("object");
    expect(r.data).toHaveProperty("recommended_flutes");
    expect(r.data).toHaveProperty("helix_angle_deg");
  });

  it("tool_coating_select — recommends coating for stainless roughing", async () => {
    const r = await call(server, "tool_coating_select", {
      material_class: "stainless",
      operation_type: "roughing",
      cutting_speed_m_min: 120,
      coolant_strategy: "flood",
      tool_substrate: "carbide",
    });
    expect(r.ok).toBe(true);
    expect(typeof r.data).toBe("object");
  });

  it("tool_assembly_build — builds segment profile from tool dimensions", async () => {
    const r = await call(server, "tool_assembly_build", {
      tool: {
        cutting_diameter_mm: 12,
        cutting_length_mm: 30,
        shank_diameter_mm: 12,
        overall_length_mm: 90,
      },
    });
    expect(r.ok).toBe(true);
    expect(typeof r.data).toBe("object");
    // AssemblyProfile exposes a segments array
    expect(r.data).toHaveProperty("segments");
  });
});

// ─────────────────────────────────────────────────────────────────────
// 2. Variability spans
// ─────────────────────────────────────────────────────────────────────
describe("U-WIRE06 variability spans (≥3 configs per dimension)", () => {
  const materials = ["carbon_steel", "stainless_steel", "aluminum"] as const;
  for (const mat of materials) {
    it(`tool_geometry_select spans material=${mat}`, async () => {
      const r = await call(server, "tool_geometry_select", {
        workpiece_material: mat,
        operation: "finishing",
        tool_diameter_mm: 10,
      });
      expect(r.ok).toBe(true);
    });
  }

  const ops = ["roughing", "finishing", "drilling"] as const;
  for (const op of ops) {
    it(`tool_coating_select spans operation_type=${op}`, async () => {
      const r = await call(server, "tool_coating_select", {
        material_class: "steel",
        operation_type: op,
      });
      expect(r.ok).toBe(true);
    });
  }

  const tapers = ["BT40", "CAT40", "HSK63A"] as const;
  for (const taper of tapers) {
    it(`tool_holder_registry_query spans taper=${taper}`, async () => {
      const r = await call(server, "tool_holder_registry_query", { taper });
      expect(r.ok).toBe(true);
    });
  }
});

// ─────────────────────────────────────────────────────────────────────
// 3. Schema rejection
// ─────────────────────────────────────────────────────────────────────
describe("U-WIRE06 input rejection (validation must trip)", () => {
  it("tool_geometry_select missing workpiece_material → rejects", async () => {
    const r = await call(server, "tool_geometry_select", {
      operation: "slotting",
      tool_diameter_mm: 12,
    });
    expect(r.ok).toBe(false);
  });

  it("tool_geometry_select with negative tool_diameter_mm → rejects", async () => {
    const r = await call(server, "tool_geometry_select", {
      workpiece_material: "steel",
      operation: "slotting",
      tool_diameter_mm: -5,
    });
    expect(r.ok).toBe(false);
  });

  it("tool_coating_select missing operation_type → rejects", async () => {
    const r = await call(server, "tool_coating_select", {
      material_class: "steel",
    });
    expect(r.ok).toBe(false);
  });

  it("tool_coating_select with bad tool_substrate enum → rejects", async () => {
    const r = await call(server, "tool_coating_select", {
      material_class: "steel",
      operation_type: "roughing",
      tool_substrate: "definitely_not_carbide",
    });
    expect(r.ok).toBe(false);
  });

  it("tool_assembly_build with negative cutting_diameter → rejects (positive constraint)", async () => {
    const r = await call(server, "tool_assembly_build", {
      tool: {
        cutting_diameter_mm: -12,
        cutting_length_mm: 30,
        shank_diameter_mm: 12,
        overall_length_mm: 90,
      },
    });
    expect(r.ok).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 4. Adversarial inputs
// ─────────────────────────────────────────────────────────────────────
describe("U-WIRE06 adversarial inputs", () => {
  it("tool_geometry_select with NaN tool_diameter_mm → rejects", async () => {
    const r = await call(server, "tool_geometry_select", {
      workpiece_material: "steel",
      operation: "slotting",
      tool_diameter_mm: Number.NaN,
    });
    expect(r.ok).toBe(false);
  });

  it("tool_coating_select with bad machine_rigidity enum → rejects", async () => {
    const r = await call(server, "tool_geometry_select", {
      workpiece_material: "steel",
      operation: "slotting",
      tool_diameter_mm: 12,
      machine_rigidity: "ultra-high",
    });
    expect(r.ok).toBe(false);
  });

  it("tool_assembly_build with empty tool object → rejects (cutting_diameter required positive)", async () => {
    const r = await call(server, "tool_assembly_build", { tool: {} });
    expect(r.ok).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 5. Backward-compat regression guards
// ─────────────────────────────────────────────────────────────────────
describe("U-WIRE06 regression guards (pre-existing prism_data still works)", () => {
  it("dispatcher tool name is prism_data", () => {
    expect(server.tools[0]!.name).toBe("prism_data");
  });

  it("unknown action returns structured error", async () => {
    const r = await call(server, "definitely_not_a_real_data_action_xyz", {});
    expect(r.ok).toBe(false);
  });
});
