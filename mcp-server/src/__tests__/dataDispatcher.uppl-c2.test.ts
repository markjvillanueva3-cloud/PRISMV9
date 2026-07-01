/**
 * dataDispatcher.uppl-c2.test.ts — MS-PRINT-PROGRAM-LOOP/U-PPL-C2 dispatcher
 * round-trip tests for the 2 actions `customer_material_map_build` and
 * `customer_material_lookup`.
 *
 * Why this file: per CLAUDE.md, the engine test verifies the pure-transform
 * kernel; THIS file verifies the dispatcher wiring round-trips (action enum
 * + lazy import + case block + Zod schema), so a contract drift in any of
 * those four surfaces fails loudly here.
 *
 * I/O strategy: no fs — the engine is pure-transform. Tests inject
 * ProgramSampleEntry[] arrays directly through the dispatcher envelope.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerDataDispatcher } from "../tools/dispatchers/dataDispatcher.js";

interface CapturedTool {
  name: string;
  description: string;
  schema: unknown;
  handler: (args: {
    action: string;
    params?: Record<string, unknown>;
  }) => Promise<{ content: Array<{ type: string; text: string }> }>;
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

async function invoke(
  action: string,
  params: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const res = (await handler({ action, params })) as Record<string, unknown>;
  if (res && res.success === false) return res;
  const content = res.content as Array<{ type: string; text: string }> | undefined;
  const text = content?.[0]?.text ?? "";
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { __raw: text } as Record<string, unknown>;
  }
}

beforeAll(() => {
  const server = makeStubServer();
  registerDataDispatcher(
    server as unknown as Parameters<typeof registerDataDispatcher>[0],
  );
  const tool = server.tools.find((t) => t.name === "prism_data");
  if (!tool) throw new Error("prism_data tool was not registered");
  handler = tool.handler;
});

// ============================================================================
// Action enum registration — no schema drift
// ============================================================================

describe("dataDispatcher U-PPL-C2 actions are registered", () => {
  it("both action names appear in the Zod enum (no contract drift)", async () => {
    // A call with bogus-but-shaped params triggers schema-level validation +
    // the dispatcher case block. If the action isn't in the enum, we'd see a
    // schema-level rejection. With the action in the enum, the call reaches
    // the engine — for build, an empty programs[] is valid; for lookup, a
    // bogus customer is fine if programs[] is supplied.
    const r1 = await invoke("customer_material_map_build", { programs: [] });
    const errMsg = JSON.stringify(r1).toLowerCase();
    expect(errMsg.includes("unknown action")).toBe(false);
    expect(errMsg.includes("invalid action")).toBe(false);

    const r2 = await invoke("customer_material_lookup", {
      customer: "NEVER_HEARD",
      programs: [],
    });
    const errMsg2 = JSON.stringify(r2).toLowerCase();
    expect(errMsg2.includes("unknown action")).toBe(false);
    expect(errMsg2.includes("invalid action")).toBe(false);
  });
});

// ============================================================================
// customer_material_map_build — envelope shape
// ============================================================================

describe("customer_material_map_build — envelope shape", () => {
  it("returns success:true envelope with map.customers + map.stats for valid input", async () => {
    const r = await invoke("customer_material_map_build", {
      programs: [
        { customer: "ALCOA", filename: "6061-A.MIN" },
        { customer: "ALCOA", filename: "6061-B.MIN" },
        { customer: "TOPURA", filename: "4140-T.MIN" },
      ],
    });
    expect(r.success).toBe(true);
    const data = r.data as { map: Record<string, unknown> };
    expect(typeof data.map).toBe("object");
    const map = data.map as { customers: Record<string, unknown>; stats: Record<string, unknown> };
    const alcoa = map.customers["ALCOA"] as { primary_iso_group: string; sample_count: number };
    expect(alcoa.primary_iso_group).toBe("N");
    expect(alcoa.sample_count).toBe(2);
    const topura = map.customers["TOPURA"] as { primary_iso_group: string };
    expect(topura.primary_iso_group).toBe("P");
    expect(map.stats.customer_count).toBe(2);
    expect(map.stats.programs_total).toBe(3);
    expect(map.stats.coverage_pct).toBe(100);
  });

  it("returns valid empty map for empty programs[] (boundary)", async () => {
    const r = await invoke("customer_material_map_build", { programs: [] });
    expect(r.success).toBe(true);
    const map = (r.data as { map: { stats: { customer_count: number; programs_total: number } } }).map;
    expect(map.stats.customer_count).toBe(0);
    expect(map.stats.programs_total).toBe(0);
  });

  it("Zod schema rejects 1-char customer at the MCP boundary (fail-loud)", async () => {
    // PRISM convention: validate at MCP boundary, not in engine. When the
    // dispatcher's Zod schema sees a sub-2-char customer, it rejects the
    // WHOLE request with success:false. The engine's internal invalid_entries
    // counter is for direct engine calls (covered in CustomerMaterialMapEngine.test.ts);
    // dispatcher-level entries never reach the engine if Zod rejects.
    const r = await invoke("customer_material_map_build", {
      programs: [
        { customer: "ALCOA", filename: "6061.MIN" },
        { customer: "X", filename: "ok.MIN" },  // 1-char customer — Zod rejects
      ],
    });
    expect(r.success).toBe(false);
  });
});

// ============================================================================
// customer_material_lookup — envelope shape
// ============================================================================

describe("customer_material_lookup — envelope shape", () => {
  it("returns distribution for a known customer (round-trip)", async () => {
    const r = await invoke("customer_material_lookup", {
      customer: "ALCOA",
      programs: [
        { customer: "ALCOA", filename: "6061-A.MIN" },
        { customer: "ALCOA", filename: "6061-B.MIN" },
      ],
    });
    expect(r.success).toBe(true);
    const data = r.data as {
      customer: string;
      distribution: { primary_iso_group: string; sample_count: number } | null;
      map_stats: { customer_count: number };
    };
    expect(data.customer).toBe("ALCOA");
    expect(data.distribution).not.toBeNull();
    expect(data.distribution!.primary_iso_group).toBe("N");
    expect(data.distribution!.sample_count).toBe(2);
    expect(data.map_stats.customer_count).toBe(1);
  });

  it("returns distribution as null/absent for unknown customer (lookup miss)", async () => {
    // PRISM's `slimResponse` strips null fields from the response envelope to
    // save tokens, so `distribution: null` on the engine side becomes
    // `distribution: undefined` (field absent) on the consumer side. Both
    // shapes are correct semantically — they both encode "no match". Use
    // loose equality (`== null`) to accept either form. Consumers should
    // check `data.distribution == null` (not `=== null`) when interpreting
    // misses.
    const r = await invoke("customer_material_lookup", {
      customer: "NEVER_HEARD_OF_THIS_CUSTOMER",
      programs: [
        { customer: "ALCOA", filename: "6061.MIN" },
      ],
    });
    expect(r.success).toBe(true);
    const data = r.data as { distribution: unknown; map_stats: { customer_count: number } };
    expect(data.distribution == null).toBe(true);  // null OR undefined — both mean miss
    // Sanity: the map_stats should still confirm the build ran (ALCOA in map).
    expect(data.map_stats.customer_count).toBe(1);
  });

  it("rejects empty customer name with dispatcher-level error", async () => {
    const r = await invoke("customer_material_lookup", {
      customer: "",
      programs: [{ customer: "ALCOA", filename: "6061.MIN" }],
    });
    // Either Zod rejects min(1) OR dispatcher's own check fires — both are
    // acceptable; what matters is the call doesn't reach the engine with an
    // empty customer.
    expect(r.success).toBe(false);
  });

  it("does case-insensitive lookup through dispatcher (engine contract preserved)", async () => {
    const r = await invoke("customer_material_lookup", {
      customer: "alcoa",  // lowercase
      programs: [{ customer: "ALCOA", filename: "6061.MIN" }],
    });
    expect(r.success).toBe(true);
    const data = r.data as { distribution: { primary_iso_group: string } | null };
    expect(data.distribution).not.toBeNull();
    expect(data.distribution!.primary_iso_group).toBe("N");
  });
});

// ============================================================================
// Schema validation — Zod rejects bad input shapes
// ============================================================================

describe("schema validation — Zod rejects bad input shapes", () => {
  it("rejects programs when not an array (Zod boundary)", async () => {
    const r = await invoke("customer_material_map_build", {
      programs: "not an array" as unknown as unknown[],
    });
    expect(r.success).toBe(false);
  });

  it("rejects customer when not a string in lookup", async () => {
    const r = await invoke("customer_material_lookup", {
      customer: 42 as unknown as string,
      programs: [{ customer: "ALCOA", filename: "6061.MIN" }],
    });
    expect(r.success).toBe(false);
  });

  it("rejects program entry with out-of-enum iso_group", async () => {
    const r = await invoke("customer_material_map_build", {
      programs: [{
        customer: "ALCOA",
        filename: "6061.MIN",
        back_annotated_iso_group: "Z" as unknown as "P",
      }],
    });
    expect(r.success).toBe(false);
  });
});
