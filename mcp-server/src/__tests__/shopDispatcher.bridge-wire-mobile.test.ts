/**
 * shopDispatcher — U-BRIDGE-WIRE-MOBILE round-trip suite
 * =======================================================
 *
 * Wires 3 previously-unwired Mobile Field engines into prism_shop:
 *   - MobileAlarmEngine.decodeAlarm  -> mobile_alarm_decode
 *   - MobileTimerEngine.getActiveTimers -> mobile_timer_active
 *   - MobileCacheEngine.getStats     -> mobile_cache_stats
 *
 * Pre-wire state (UNWIRED-ENGINE-AUDIT 2026-05-07): all 3 engines had ZERO
 * dispatcher references in mcp-server/src/tools/dispatchers/. The Mobile
 * Field engine class is a coherent group (alarm decode + cycle timer + offline
 * cache) targeting shop-floor mobile-device consumers, and prism_shop is the
 * canonical shop-floor surface (dashboard_alerts, cost_clock_in, etc.).
 *
 * @milestone BRIDGE-WIRING
 * @unit U-BRIDGE-WIRE-MOBILE
 * @slot mike
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerShopDispatcher } from "../tools/dispatchers/shopDispatcher.js";

interface CapturedTool {
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

class MockMCPServer {
  tools: CapturedTool[] = [];
  tool(_n: string, _d: string, _s: unknown, handler: CapturedTool["handler"]) {
    this.tools.push({ handler });
  }
}

interface DispatchResult { ok: boolean; data: Record<string, unknown> }

async function call(server: MockMCPServer, action: string, params: Record<string, unknown> = {}): Promise<DispatchResult> {
  const tool = server.tools[0]!;
  const raw = await tool.handler({ action, params });
  const envelope = raw as { content: { type: string; text: string }[] };
  const parsed = JSON.parse(envelope.content[0]!.text) as Record<string, unknown>;
  if (parsed.ok === false) return { ok: false, data: parsed };
  return { ok: true, data: parsed };
}

let server: MockMCPServer;
beforeEach(() => {
  server = new MockMCPServer();
  registerShopDispatcher(server as unknown as Parameters<typeof registerShopDispatcher>[0]);
});

// ── mobile_alarm_decode ──────────────────────────────────────────────────
describe("U-BRIDGE-WIRE-MOBILE / mobile_alarm_decode", () => {
  it("decodes Haas alarm 108 (tool-in-spindle mismatch, critical, requires reset)", async () => {
    const r = await call(server, "mobile_alarm_decode", { code: "108", controller: "haas" });
    expect(r.ok).toBe(true);
    const decoded = r.data.decoded as { code: string; controller: string; severity: string; requiresReset: boolean };
    expect(decoded.code).toBe("108");
    expect(decoded.controller).toBe("haas");
    expect(decoded.severity).toBe("critical");
    expect(decoded.requiresReset).toBe(true);
  });

  it("returns alarm_not_found for unknown code", async () => {
    const r = await call(server, "mobile_alarm_decode", { code: "999999", controller: "haas" });
    expect(r.ok).toBe(false);
    expect(String(r.data.error)).toMatch(/alarm_not_found/);
    expect(r.data.code).toBe("999999");
  });

  it("rejects missing code (schema-layer guard)", async () => {
    const r = await call(server, "mobile_alarm_decode", {} as Record<string, unknown>);
    expect(r.ok).toBe(false);
  });
});

// ── mobile_timer_active ──────────────────────────────────────────────────
describe("U-BRIDGE-WIRE-MOBILE / mobile_timer_active", () => {
  it("returns count === sessions.length invariant when called with no operator", async () => {
    const r = await call(server, "mobile_timer_active", {});
    expect(r.ok).toBe(true);
    const sessions = r.data.sessions as unknown[];
    expect(Array.isArray(sessions)).toBe(true);
    expect(r.data.count).toBe(sessions.length);
    expect(r.data.count).toBeGreaterThanOrEqual(0);
  });

  it("respects operatorId filter (subset invariant)", async () => {
    const all = await call(server, "mobile_timer_active", {});
    const filtered = await call(server, "mobile_timer_active", { operatorId: "definitely-not-a-real-operator-xyz" });
    expect(filtered.ok).toBe(true);
    expect(filtered.data.count).toBeLessThanOrEqual(all.data.count as number);
    // Filter by unknown operator → must be zero (no sessions own that id).
    expect(filtered.data.count).toBe(0);
  });
});

// ── mobile_cache_stats ───────────────────────────────────────────────────
describe("U-BRIDGE-WIRE-MOBILE / mobile_cache_stats", () => {
  it("returns ok envelope with a structured stats object", async () => {
    const r = await call(server, "mobile_cache_stats", {});
    expect(r.ok).toBe(true);
    const stats = r.data.stats as Record<string, unknown>;
    expect(stats).not.toBeNull();
    expect(typeof stats).toBe("object");
    expect(Object.keys(stats).length).toBeGreaterThan(0);
  });
});

// ── wiring invariants ────────────────────────────────────────────────────
describe("U-BRIDGE-WIRE-MOBILE / wiring invariants", () => {
  it("all 3 actions resolve through the dispatcher (never 'unknown_action')", async () => {
    const cases = [
      { action: "mobile_alarm_decode", params: { code: "108", controller: "haas" } },
      { action: "mobile_timer_active", params: {} },
      { action: "mobile_cache_stats", params: {} },
    ];
    const results = await Promise.all(cases.map(c => call(server, c.action, c.params)));
    for (const r of results) {
      // The forbidden outcome is `unknown_action` — proves the case is missing.
      expect(r.data.error).not.toBe("unknown_action");
    }
    expect(results.length).toBe(3);
  });
});
