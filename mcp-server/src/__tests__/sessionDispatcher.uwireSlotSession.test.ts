/**
 * sessionDispatcher U-WIRE-SLOTSESSION round-trip tests -- SlotSessionHistoryEngine.
 *
 * Validates the 3 new read actions wire through prism_session:
 *   slot_session_fleet_state -> getAllSlotsState()              (26 per-slot cards)
 *   slot_session_latest      -> getLatestForSlot(slot)          (latest entry | null)
 *   slot_session_history     -> getHistoryForSlot(slot, limit)  (last N entries)
 *
 * SlotSessionHistoryEngine (SLOT-RECOVERY-MS0, slot:golf) records per-slot session
 * lifecycle events to JSONL under a baseDir. Only the READ surface is wired here;
 * the record/prune writers are EXCLUDED. `slot` is a NatoSlot z.enum at the
 * boundary (not a caller path -> no traversal); the engine reads its own canonical
 * baseDir. The dispatcher uses the lazy singleton; engine-direct tests inject a
 * fresh mkdtemp baseDir for deterministic, content-sensitive assertions.
 *
 * Wired slot:papa 2026-06-15 -- WIRE-UNWIRED-PAPA cross-galaxy v2
 * (galaxy:golf engine wired into prism_session).
 *
 * @milestone WIRE-UNWIRED-PAPA
 * @unit U-WIRE-SLOTSESSION
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as os from "node:os";
import * as fs from "node:fs";
import * as path from "node:path";
import { registerSessionDispatcher } from "../tools/dispatchers/sessionDispatcher.js";
import { SlotSessionHistoryEngine } from "../engines/SlotSessionHistoryEngine.js";

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
  const tool = server.tools.find((t) => t.name === "prism_session") ?? server.tools[0]!;
  const raw = (await tool.handler({ action, params })) as
    | { content: { type: string; text: string }[] }
    | { success: false; error: string; action: string; dispatcher: string };
  if (raw && typeof raw === "object" && "success" in raw && (raw as { success: boolean }).success === false) {
    return { ok: false, data: raw as unknown as Record<string, unknown> };
  }
  const envelope = raw as { content: { type: string; text: string }[] };
  const text = envelope.content[0]!.text;
  let parsed: Record<string, unknown>;
  try { parsed = JSON.parse(text); } catch { return { ok: false, data: { rawText: text } }; }
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed) &&
      ("engine_error" in parsed || ("error" in parsed && !("success" in parsed)))) {
    return { ok: false, data: parsed };
  }
  return { ok: true, data: parsed };
}

const tmpDirs: string[] = [];
function freshEngine(): SlotSessionHistoryEngine {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "prism-slotsess-"));
  tmpDirs.push(dir);
  return new SlotSessionHistoryEngine({ baseDir: dir });
}

let server: MockMCPServer;

beforeEach(() => {
  server = new MockMCPServer();
  registerSessionDispatcher(server as unknown as { tool: MockMCPServer["tool"] });
});

afterEach(() => {
  for (const d of tmpDirs.splice(0)) { try { fs.rmSync(d, { recursive: true, force: true }); } catch { /* gone */ } }
});

// -- Engine-direct contract (hermetic mkdtemp baseDir) -----------------------
describe("U-WIRE-SLOTSESSION -- read-method contract", () => {
  it("an empty baseDir yields 26 idle fleet cards and null/empty per-slot reads", () => {
    const eng = freshEngine();
    const fleet = eng.getAllSlotsState();
    expect(Object.keys(fleet).length).toBe(26);          // full NATO fleet
    expect(fleet.papa!.status).toBe("idle");
    expect(eng.getLatestForSlot("papa")).toBeNull();
    expect(eng.getHistoryForSlot("papa")).toEqual([]);
  });

  it("reads reflect a recorded session (content-sensitive, not a stub)", () => {
    const eng = freshEngine();
    const r = eng.recordSessionStart({ slot: "papa", sessionId: "sess-A", chatId: "claude-aaaa" });
    expect(r.ok).toBe(true);
    const latest = eng.getLatestForSlot("papa");
    expect(latest).not.toBeNull();
    expect(latest!.sessionId).toBe("sess-A");
    expect(eng.getHistoryForSlot("papa").length).toBe(1);
    expect(eng.getAllSlotsState().papa!.status).not.toBe("idle"); // a recorded slot is live, not idle
    expect(eng.getLatestForSlot("bravo")).toBeNull();              // a different slot stays empty
  });

  it("getHistoryForSlot clamps a non-positive limit to []", () => {
    const eng = freshEngine();
    eng.recordSessionStart({ slot: "papa", sessionId: "sess-B", chatId: "claude-bbbb" });
    expect(eng.getHistoryForSlot("papa", 0)).toEqual([]);
    expect(eng.getHistoryForSlot("papa", -3)).toEqual([]);
    expect(eng.getHistoryForSlot("papa", 5).length).toBe(1);
  });
});

// -- LIVE round-trip through prism_session (the wire proof) -------------------
describe("U-WIRE-SLOTSESSION -- dispatcher round-trip (prism_session)", () => {
  it("slot_session_fleet_state returns all 26 slot cards", async () => {
    const r = await call(server, "slot_session_fleet_state", {});
    expect(r.ok).toBe(true);
    expect(Object.keys(r.data.slots as Record<string, unknown>).length).toBe(26);
  });

  it("slot_session_latest echoes the slot and returns an entry-or-null", async () => {
    const r = await call(server, "slot_session_latest", { slot: "papa" });
    expect(r.ok).toBe(true);
    expect(r.data.slot).toBe("papa");
    // entry is a real SlotSessionEntry or null (null is stripped by slimResponse) -- the wire is the proof
  });

  it("slot_session_history returns count consistent with entries", async () => {
    const r = await call(server, "slot_session_history", { slot: "papa", limit: 3 });
    expect(r.ok).toBe(true);
    expect(r.data.slot).toBe("papa");
    const entries = (r.data.entries as unknown[] | undefined) ?? []; // [] stripped by slimResponse
    expect(r.data.count).toBe(entries.length);                       // count === entries.length (real invariant)
  });

  it("all 3 slot_session_* actions are accepted by the registered dispatcher", async () => {
    const calls: Array<[string, Record<string, unknown>]> = [
      ["slot_session_fleet_state", {}],
      ["slot_session_latest", { slot: "papa" }],
      ["slot_session_history", { slot: "golf" }],
    ];
    for (const [action, params] of calls) {
      const r = await call(server, action, params);
      expect(r.ok, `${action} should succeed`).toBe(true);
    }
  });
});

// -- Schema validation through the dispatcher (adversarial) -------------------
describe("U-WIRE-SLOTSESSION -- schema rejection (prism_session)", () => {
  it("slot_session_latest rejects a missing slot", async () => {
    const r = await call(server, "slot_session_latest", {});
    expect(r.ok).toBe(false);
  });

  it("slot_session_latest rejects an invalid (non-NATO) slot", async () => {
    const r = await call(server, "slot_session_latest", { slot: "zzz_not_a_slot" });
    expect(r.ok).toBe(false);
  });

  it("slot_session_history rejects a non-positive limit", async () => {
    const r = await call(server, "slot_session_history", { slot: "papa", limit: 0 });
    expect(r.ok).toBe(false);
  });
});
