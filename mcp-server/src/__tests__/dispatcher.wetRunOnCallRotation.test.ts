/**
 * dispatcher.wetRunOnCallRotation.test.ts — round-trip coverage for
 * WIRE-UNWIRED-MS0/U-WIRE-WRON (WetRunOnCallRotationEngine).
 *
 * 7 read-only actions through real `prism_dev`:
 *   wron_current_shift, wron_pending_escalations, wron_get_page,
 *   wron_list_pages, wron_list_shifts, wron_list_swaps, wron_snapshot
 *
 * Engine has in-memory state — seeded via direct configureShift+page in
 * beforeAll. Engine-pair test pre-exists at
 * WetRunOnCallRotationEngine.test.ts.
 *
 * DEFER (5 mutating methods, safety-critical surface):
 *   - configureShift, swap (state-mutation)
 *   - page (send-impersonation — would trigger real pager notifications)
 *   - acknowledge (identity-forgery — caller-supplied person_id could
 *                  impersonate another responder)
 *   - sweepEscalations (mutates Pages via advanceStage)
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";
import { wetRunOnCallRotationEngine } from "../engines/WetRunOnCallRotationEngine.js";

interface CapturedTool {
  name: string;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

function makeStubServer(): {
  tools: CapturedTool[];
  tool: (name: string, desc: string, schema: unknown, h: CapturedTool["handler"]) => void;
} {
  const tools: CapturedTool[] = [];
  return {
    tools,
    tool(name, _desc, _schema, handler) { tools.push({ name, handler }); },
  };
}

async function invokeHandler(
  handler: CapturedTool["handler"],
  action: string,
  params: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const res = (await handler({ action, params })) as Record<string, unknown>;
  if (Array.isArray((res as { content?: unknown[] }).content)) {
    const text = ((res as { content: Array<{ text?: string }> }).content[0]?.text) ?? "";
    return JSON.parse(text) as Record<string, unknown>;
  }
  return res;
}

let devHandler: CapturedTool["handler"];

const SHIFT_START = 1_700_000_000_000; // Nov 2025-ish
const SHIFT_END = SHIFT_START + 8 * 60 * 60 * 1000; // +8h
const seeded: { shiftId?: string; pageId?: string } = {};

beforeAll(() => {
  const srv = makeStubServer();
  registerDevDispatcher(srv as unknown as Parameters<typeof registerDevDispatcher>[0]);
  const t = srv.tools.find((x) => x.name === "prism_dev");
  if (!t) throw new Error("prism_dev not registered");
  devHandler = t.handler;

  // Seed 1 shift + 1 page via engine-direct (mirrors PLIB/SSL pattern).
  // Singleton state survives across tests in same vitest worker.
  const shift = wetRunOnCallRotationEngine.configureShift({
    shift_id: "SHIFT-2025-11-15-A",
    start_ts: SHIFT_START,
    end_ts: SHIFT_END,
    primary: "alice",
    secondary: "bob",
    ladder: ["carol", "dave"],
  });
  seeded.shiftId = shift.shift_id;

  const page = wetRunOnCallRotationEngine.page({
    pilot_id: "PILOT-001",
    reason: "wet-run pressure trip",
    ts: SHIFT_START + 60_000, // 1 min into shift
  });
  seeded.pageId = page.page_id;
});

describe("WIRE-UNWIRED-MS0/U-WIRE-WRON — Zod schemas", () => {
  it("wron_current_shift requires finite ts (strict)", () => {
    expect(ACTION_DEV_SCHEMAS["wron_current_shift"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["wron_current_shift"].safeParse({ ts: SHIFT_START }).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["wron_current_shift"].safeParse({ ts: Infinity }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["wron_current_shift"].safeParse({ ts: NaN }).success).toBe(false);
  });

  it("wron_pending_escalations requires finite nowTs (strict)", () => {
    expect(ACTION_DEV_SCHEMAS["wron_pending_escalations"].safeParse({ nowTs: SHIFT_START }).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["wron_pending_escalations"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["wron_pending_escalations"].safeParse({ nowTs: -Infinity }).success).toBe(false);
  });

  it("wron_get_page requires pageId (strict)", () => {
    expect(ACTION_DEV_SCHEMAS["wron_get_page"].safeParse({ pageId: "X" }).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["wron_get_page"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["wron_get_page"].safeParse({ pageId: "X".repeat(100) }).success).toBe(false);
  });

  it("wron_list_* + wron_snapshot accept empty object only (strict)", () => {
    for (const action of ["wron_list_pages", "wron_list_shifts", "wron_list_swaps", "wron_snapshot"]) {
      expect(ACTION_DEV_SCHEMAS[action].safeParse({}).success).toBe(true);
      expect(ACTION_DEV_SCHEMAS[action].safeParse({ extra: 1 }).success).toBe(false);
    }
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-WRON — prism_dev :: wron_current_shift", () => {
  it("found=true for ts inside shift window", async () => {
    const r = await invokeHandler(devHandler, "wron_current_shift", {
      ts: SHIFT_START + 60_000,
    });
    expect(r.found).toBe(true);
    const res = (r as { result: { shift_id: string; primary: string; secondary: string; ladder: string[] } }).result;
    expect(res.shift_id).toBe(seeded.shiftId);
    expect(res.primary).toBe("alice");
    expect(res.secondary).toBe("bob");
    expect(res.ladder).toEqual(["carol", "dave"]);
  });

  it("found=false for ts before shift start", async () => {
    const r = await invokeHandler(devHandler, "wron_current_shift", {
      ts: SHIFT_START - 1,
    });
    // slimResponse strips null → undefined; rely on `found` boolean
    // discriminator (preserved because false is kept while null is dropped).
    expect(r.found).toBe(false);
    expect(r.result === null || r.result === undefined).toBe(true);
  });

  it("found=false for ts at shift end (exclusive boundary, engine line 178)", async () => {
    const r = await invokeHandler(devHandler, "wron_current_shift", {
      ts: SHIFT_END,
    });
    expect(r.found).toBe(false);
  });

  it("ROUTING PROOF — wire shift_id equals engine-direct currentShift()", async () => {
    const r = await invokeHandler(devHandler, "wron_current_shift", {
      ts: SHIFT_START + 60_000,
    });
    const direct = wetRunOnCallRotationEngine.currentShift(SHIFT_START + 60_000);
    const res = (r as { result: { shift_id: string } }).result;
    expect(res.shift_id).toBe(direct?.shift_id);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-WRON — prism_dev :: wron_pending_escalations", () => {
  it("returns pages whose deadline has passed (pending_count discriminator)", async () => {
    // Page was created at SHIFT_START+60s; primary ack window starts then.
    // nowTs far in the future → deadline definitely passed.
    const r = await invokeHandler(devHandler, "wron_pending_escalations", {
      nowTs: SHIFT_END + 1_000_000,
    });
    expect((r.pending_count as number)).toBeGreaterThanOrEqual(1);
  });

  it("returns 0 pages when nowTs is still within deadline", async () => {
    const r = await invokeHandler(devHandler, "wron_pending_escalations", {
      nowTs: SHIFT_START + 60_001, // 1ms after page creation, well before deadline
    });
    expect(r.pending_count).toBe(0);
  });

  it("does NOT mutate engine state (pure read — re-call returns same shape)", async () => {
    const r1 = await invokeHandler(devHandler, "wron_pending_escalations", {
      nowTs: SHIFT_END + 1_000_000,
    });
    const r2 = await invokeHandler(devHandler, "wron_pending_escalations", {
      nowTs: SHIFT_END + 1_000_000,
    });
    expect(r1.pending_count).toBe(r2.pending_count);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-WRON — prism_dev :: wron_get_page", () => {
  it("found=true for seeded page", async () => {
    const r = await invokeHandler(devHandler, "wron_get_page", { pageId: seeded.pageId! });
    expect(r.found).toBe(true);
    const res = (r as { result: { page_id: string; pilot_id: string; reason: string } }).result;
    expect(res.page_id).toBe(seeded.pageId);
    expect(res.pilot_id).toBe("PILOT-001");
    expect(res.reason).toBe("wet-run pressure trip");
  });

  it("found=false for nonexistent page", async () => {
    const r = await invokeHandler(devHandler, "wron_get_page", { pageId: "PAGE-NEVER-EXISTED" });
    expect(r.found).toBe(false);
    // slimResponse drops null; rely on `found` discriminator.
    expect(r.result === null || r.result === undefined).toBe(true);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-WRON — prism_dev :: list endpoints", () => {
  it("wron_list_pages returns ≥ 1 page after seeding", async () => {
    const r = await invokeHandler(devHandler, "wron_list_pages", {});
    expect((r.page_count as number)).toBeGreaterThanOrEqual(1);
  });

  it("wron_list_shifts returns ≥ 1 shift after seeding", async () => {
    const r = await invokeHandler(devHandler, "wron_list_shifts", {});
    expect((r.shift_count as number)).toBeGreaterThanOrEqual(1);
    const shifts = (r as { shifts: Array<{ primary: string }> }).shifts;
    const primaries = shifts.map((s) => s.primary);
    expect(primaries).toContain("alice");
  });

  it("wron_list_swaps returns 0 swaps (no swaps seeded)", async () => {
    const r = await invokeHandler(devHandler, "wron_list_swaps", {});
    expect(r.swap_count).toBe(0);
  });

  it("ROUTING PROOF — wire page_count equals engine-direct listPages().length", async () => {
    const r = await invokeHandler(devHandler, "wron_list_pages", {});
    const direct = wetRunOnCallRotationEngine.listPages();
    expect(r.page_count).toBe(direct.length);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-WRON — prism_dev :: wron_snapshot", () => {
  it("returns full snapshot with shifts+swaps+pages + schemaVersion=1", async () => {
    const r = await invokeHandler(devHandler, "wron_snapshot", {});
    const res = (r as { result: { schemaVersion: number; shifts: unknown[]; swaps: unknown[]; pages: unknown[] } }).result;
    expect(res.schemaVersion).toBe(1);
    expect(Array.isArray(res.shifts)).toBe(true);
    expect(Array.isArray(res.pages)).toBe(true);
    expect(r.shift_count).toBe(res.shifts.length);
    expect(r.page_count).toBe(res.pages.length);
    expect(r.is_empty).toBe(false); // after seeding
  });

  it("ROUTING PROOF — wire shift_count equals engine-direct snapshot().shifts.length", async () => {
    const r = await invokeHandler(devHandler, "wron_snapshot", {});
    const direct = wetRunOnCallRotationEngine.snapshot();
    expect(r.shift_count).toBe(direct.shifts.length);
    expect(r.page_count).toBe(direct.pages.length);
  });

  it("VARIABILITY — snapshot fields mirror individual list endpoint counts", async () => {
    const snap = await invokeHandler(devHandler, "wron_snapshot", {});
    const pages = await invokeHandler(devHandler, "wron_list_pages", {});
    const shifts = await invokeHandler(devHandler, "wron_list_shifts", {});
    const swaps = await invokeHandler(devHandler, "wron_list_swaps", {});
    expect(snap.page_count).toBe(pages.page_count);
    expect(snap.shift_count).toBe(shifts.shift_count);
    expect(snap.swap_count).toBe(swaps.swap_count);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-WRON — error envelope (engine throws → try/catch)", () => {
  it("wron_current_shift without ts → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "wron_current_shift", {});
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("wron_current_shift with NaN ts → schema rejects (z.number().finite())", async () => {
    const r = await invokeHandler(devHandler, "wron_current_shift", { ts: NaN });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("wron_pending_escalations with Infinity → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "wron_pending_escalations", { nowTs: Infinity });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("wron_snapshot with extra params → strict schema rejects", async () => {
    const r = await invokeHandler(devHandler, "wron_snapshot", { extra: 1 });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("wron_get_page with empty pageId → schema rejects (min 1)", async () => {
    const r = await invokeHandler(devHandler, "wron_get_page", { pageId: "" });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });
});
