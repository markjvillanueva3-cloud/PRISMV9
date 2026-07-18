/**
 * sessionDispatcher × SlotSessionHistoryEngine wire
 * ([WIRING]/U-WIRE-SLOT-SESSION-HISTORY, slot:romeo).
 *
 * SlotSessionHistoryEngine (per-slot append-only session-history JSONL reader) was BUILT but
 * UNWIRED — verified GENUINE_ORPHAN via scripts/classify-engine-reachability.mjs. This wires the
 * read surface `slot_session_history_read` into prism_session.
 *
 * Round-trip THROUGH the registered dispatcher (not a direct engine import), off a REAL on-disk
 * fixture written under a confined temp dir (state/shared/<temp>) so the baseDir path-guard accepts
 * it. ANTI-STUB: readAll keeps ONLY entries with a valid eventType + slot + sessionId — a stub
 * echoing all lines would include the malformed/corrupt fixture lines and fail the exact count.
 *
 * @milestone BLACKWELL-DB-GEN-MS0
 * @unit U-WIRE-SLOT-SESSION-HISTORY
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { registerSessionDispatcher } from "../tools/dispatchers/sessionDispatcher.js";

// repo root = mcp-server/.. ; confine root (state/shared) matches the case's DEFAULT_BASE_DIR parent.
const MCP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const STATE_SHARED = path.join(MCP_ROOT, "..", "state", "shared");

interface CapturedTool {
  name: string;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}
class MockMCPServer {
  tools: CapturedTool[] = [];
  tool(name: string, _d: unknown, _s: unknown, handler: CapturedTool["handler"]) {
    this.tools.push({ name, handler });
  }
}

async function call(
  server: MockMCPServer,
  action: string,
  params: Record<string, unknown> = {},
): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const tool = server.tools[0]!;
  const raw = (await tool.handler({ action, params })) as { content?: { type: string; text: string }[] };
  if (!raw.content) return { ok: false, data: raw as unknown as Record<string, unknown> };
  let parsed: Record<string, unknown>;
  try { parsed = JSON.parse(raw.content[0]!.text); } catch { return { ok: false, data: { rawText: raw.content[0]!.text } }; }
  return { ok: parsed.success === true, data: parsed };
}

// 2 valid entries + 1 missing-sessionId (filtered) + 1 corrupt (skipped) → readAll keeps exactly 2.
const FIXTURE = [
  JSON.stringify({ eventType: "session-start", slot: "alpha", sessionId: "s1", ts: "2026-06-04T10:00:00Z" }),
  JSON.stringify({ eventType: "heartbeat", slot: "alpha", sessionId: "s1" }),
  JSON.stringify({ eventType: "session-start", slot: "alpha" }), // no sessionId → filtered
  "this is not json", // corrupt → skipped
].join("\n");

let server: MockMCPServer;
let fixtureDir: string;
beforeEach(() => {
  server = new MockMCPServer();
  registerSessionDispatcher(server as unknown as { tool: MockMCPServer["tool"] });
  fixtureDir = path.join(STATE_SHARED, `__test-slotsess-${process.pid}`);
  fs.mkdirSync(fixtureDir, { recursive: true });
  fs.writeFileSync(path.join(fixtureDir, "alpha.jsonl"), FIXTURE, "utf8");
});
afterEach(() => {
  try { fs.rmSync(fixtureDir, { recursive: true, force: true }); } catch { /* ignore */ }
});

describe("sessionDispatcher × SlotSessionHistory wire (U-WIRE-SLOT-SESSION-HISTORY)", () => {
  it("reads a slot's history off disk, keeping only valid entries (anti-stub)", async () => {
    const r = await call(server, "slot_session_history_read", { slot: "alpha", baseDir: fixtureDir });
    expect(r.ok).toBe(true);
    expect(r.data.slot).toBe("alpha");
    expect(r.data.count).toBe(2); // 2 valid; the missing-sessionId + corrupt lines are dropped
    const entries = r.data.entries as Array<Record<string, unknown>>;
    expect(entries).toHaveLength(2);
    expect(entries.every((e) => e.sessionId === "s1")).toBe(true);
    expect(entries.map((e) => e.eventType)).toEqual(["session-start", "heartbeat"]);
  });

  it("an unknown/empty slot file returns an empty history (graceful, not a crash)", async () => {
    const r = await call(server, "slot_session_history_read", { slot: "zulu", baseDir: fixtureDir });
    expect(r.ok).toBe(true);
    expect(r.data.count).toBe(0);
    expect((r.data.entries ?? []) as unknown[]).toHaveLength(0);
  });

  it("rejects a baseDir that escapes the slot-sessions root (path-traversal guard)", async () => {
    const r = await call(server, "slot_session_history_read", { slot: "alpha", baseDir: "../../../../../../etc" });
    expect(r.ok).toBe(false);
    expect(JSON.stringify(r.data).toLowerCase()).toMatch(/escapes|denied|root/);
  });

  it("slot_session_history_read action is accepted by the registered dispatcher (z.enum + case)", async () => {
    const r = await call(server, "slot_session_history_read", { slot: "alpha", baseDir: fixtureDir });
    expect(JSON.stringify(r.data).toLowerCase()).not.toMatch(/unknown action|no such action/);
  });
});
