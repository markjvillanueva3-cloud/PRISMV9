/**
 * CAMPluginRegistryEngine tests — U-CAM98
 * ========================================
 *
 * Exhaustive coverage of the plugin registry: schema validation, register /
 * unregister / heartbeat lifecycle, failure → degraded → offline transitions,
 * reconnect backoff schedule + exhaustion, SemVer compatibility checks,
 * filtering + dashboard aggregation, event log. Target ≥30 cases.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  CAMPluginRegistryEngine as Reg,
  PluginRegistrationInputSchema,
  RegisteredPluginSchema,
  parseSemVer,
  FAIL_BEFORE_OFFLINE,
  MAX_RECONNECT_ATTEMPTS,
  STALE_AFTER_MS,
  type PluginRegistrationInput,
} from "../engines/CAMPluginRegistryEngine.js";

function baseReg(overrides: Partial<PluginRegistrationInput> = {}): PluginRegistrationInput {
  return {
    plugin_id: "hm-viewer",
    target: "hypermill",
    transport: "websocket",
    endpoint: "ws://localhost:9001/hm",
    version: "1.2.3",
    os: "windows",
    arch: "x64",
    capability: {
      frame_types: ["force", "chatter", "safety_score"],
      formats: ["step_ap242", "brep_json"],
      actions: ["render_overlay", "receive_geometry"],
      max_throughput_fps: 120,
      max_payload_mb: 256,
    },
    compat_range: {
      min_prism_version: "1.0.0",
      max_prism_version: "2.0.0",
    },
    ...overrides,
  };
}

describe("CAMPluginRegistryEngine — Schemas + SemVer", () => {
  it("accepts a well-formed registration", () => {
    expect(() => PluginRegistrationInputSchema.parse(baseReg())).not.toThrow();
  });

  it("rejects bad SemVer in version", () => {
    expect(() =>
      PluginRegistrationInputSchema.parse(baseReg({ version: "1.x.y" })),
    ).toThrow();
  });

  it("rejects empty plugin_id", () => {
    expect(() =>
      PluginRegistrationInputSchema.parse(baseReg({ plugin_id: "" })),
    ).toThrow();
  });

  it("requires at least one frame_type in capability", () => {
    expect(() =>
      PluginRegistrationInputSchema.parse(
        baseReg({
          capability: {
            frame_types: [],
            formats: [],
            actions: [],
            max_throughput_fps: 60,
            max_payload_mb: 100,
          },
        }),
      ),
    ).toThrow();
  });

  it("parseSemVer parses 1.2.3 correctly", () => {
    expect(parseSemVer("1.2.3")).toEqual({ major: 1, minor: 2, patch: 3 });
  });

  it("parseSemVer throws on bad input", () => {
    expect(() => parseSemVer("v1.0")).toThrow();
  });

  it("RegisteredPluginSchema accepts a full record", () => {
    const reg = Reg.register(baseReg(), 1000);
    expect(() => RegisteredPluginSchema.parse(reg)).not.toThrow();
  });
});

describe("CAMPluginRegistryEngine — Registration lifecycle", () => {
  beforeEach(() => Reg.resetRegistry());

  it("register() creates a new record in online state", () => {
    const p = Reg.register(baseReg(), 1000);
    expect(p.health).toBe("online");
    expect(p.registered_at_ms).toBe(1000);
    expect(p.last_seen_at_ms).toBe(1000);
    expect(p.consecutive_failures).toBe(0);
  });

  it("re-registering the same id retains registered_at_ms", () => {
    Reg.register(baseReg(), 1000);
    const p = Reg.register(baseReg({ version: "1.2.4" }), 2000);
    expect(p.registered_at_ms).toBe(1000);
    expect(p.last_seen_at_ms).toBe(2000);
    expect(p.version).toBe("1.2.4");
  });

  it("unregister() removes the plugin and returns true", () => {
    Reg.register(baseReg(), 1000);
    expect(Reg.unregister("hm-viewer", 2000)).toBe(true);
    expect(Reg.getPlugin("hm-viewer")).toBeNull();
  });

  it("unregister() returns false for unknown plugin", () => {
    expect(Reg.unregister("nope")).toBe(false);
  });

  it("heartbeat() updates last_seen_at_ms and increments counter", () => {
    Reg.register(baseReg(), 1000);
    expect(Reg.heartbeat("hm-viewer", 1500)).toBe(true);
    const p = Reg.getPlugin("hm-viewer")!;
    expect(p.last_seen_at_ms).toBe(1500);
    expect(p.total_heartbeats).toBe(1);
  });

  it("heartbeat() returns false for unknown plugin", () => {
    expect(Reg.heartbeat("nope")).toBe(false);
  });

  it("getPlugin() returns a snapshot, not a live reference", () => {
    Reg.register(baseReg(), 1000);
    const snap = Reg.getPlugin("hm-viewer")!;
    snap.health = "offline";
    snap.total_heartbeats = 99;
    const fresh = Reg.getPlugin("hm-viewer")!;
    expect(fresh.health).toBe("online");
    expect(fresh.total_heartbeats).toBe(0);
  });
});

describe("CAMPluginRegistryEngine — Health state machine", () => {
  beforeEach(() => Reg.resetRegistry());

  it("first failure moves plugin to degraded", () => {
    Reg.register(baseReg(), 1000);
    const p = Reg.reportFailure("hm-viewer", "timeout", 2000)!;
    expect(p.health).toBe("degraded");
    expect(p.consecutive_failures).toBe(1);
  });

  it(`${FAIL_BEFORE_OFFLINE}th consecutive failure moves plugin to offline`, () => {
    Reg.register(baseReg(), 1000);
    for (let i = 0; i < FAIL_BEFORE_OFFLINE - 1; i++) {
      Reg.reportFailure("hm-viewer", "timeout", 2000 + i * 100);
    }
    const p = Reg.reportFailure("hm-viewer", "timeout", 5000)!;
    expect(p.health).toBe("offline");
    expect(p.consecutive_failures).toBe(FAIL_BEFORE_OFFLINE);
    expect(p.next_reconnect_at_ms).toBe(5000 + 1000); // 1s backoff on first scheduled retry
  });

  it("heartbeat after failures restores online and clears counters", () => {
    Reg.register(baseReg(), 1000);
    Reg.reportFailure("hm-viewer", "timeout", 2000);
    Reg.reportFailure("hm-viewer", "timeout", 3000);
    const p = Reg.getPlugin("hm-viewer")!;
    expect(p.health).toBe("degraded");
    Reg.heartbeat("hm-viewer", 4000);
    const p2 = Reg.getPlugin("hm-viewer")!;
    expect(p2.health).toBe("online");
    expect(p2.consecutive_failures).toBe(0);
    expect(p2.next_reconnect_at_ms).toBeNull();
  });

  it("reportFailure() returns null for unknown plugin", () => {
    expect(Reg.reportFailure("nope", "timeout")).toBeNull();
  });
});

describe("CAMPluginRegistryEngine — Reconnect backoff", () => {
  beforeEach(() => Reg.resetRegistry());

  function pushOffline(now: number): void {
    Reg.register(baseReg(), now);
    for (let i = 0; i < FAIL_BEFORE_OFFLINE; i++) {
      Reg.reportFailure("hm-viewer", "err", now + (i + 1) * 100);
    }
  }

  it("first reconnect attempt schedules 2s backoff (second slot)", () => {
    pushOffline(1000);
    // After offline, first attempt → backoff index 1 → 2000 ms
    const r = Reg.attemptReconnect("hm-viewer", 2000, false);
    expect(r.succeeded).toBe(false);
    expect(r.attempt).toBe(1);
    expect(r.next_reconnect_at_ms).toBe(2000 + 2_000);
  });

  it("backoff progresses 1s, 2s, 4s, 8s, 16s, 32s, 60s (then caps)", () => {
    pushOffline(0);
    const expected = [2_000, 4_000, 8_000, 16_000, 32_000, 60_000, 60_000];
    let now = 100;
    for (let i = 0; i < expected.length; i++) {
      const r = Reg.attemptReconnect("hm-viewer", now, false);
      expect(r.next_reconnect_at_ms).toBe(now + expected[i]);
      now += 1;
    }
  });

  it("reconnect succeeds → plugin returns online and attempts reset", () => {
    pushOffline(0);
    const r = Reg.attemptReconnect("hm-viewer", 5000, true);
    expect(r.succeeded).toBe(true);
    const p = Reg.getPlugin("hm-viewer")!;
    expect(p.health).toBe("online");
    expect(p.reconnect_attempts).toBe(0);
    expect(p.next_reconnect_at_ms).toBeNull();
  });

  it(`exhausts after MAX_RECONNECT_ATTEMPTS (${MAX_RECONNECT_ATTEMPTS})`, () => {
    pushOffline(0);
    let result;
    for (let i = 0; i < MAX_RECONNECT_ATTEMPTS; i++) {
      result = Reg.attemptReconnect("hm-viewer", 1000 + i, false);
    }
    expect(result!.exhausted).toBe(true);
    expect(result!.next_reconnect_at_ms).toBeNull();
    const p = Reg.getPlugin("hm-viewer")!;
    expect(p.health).toBe("offline");
  });

  it("reconnect for unknown plugin returns error shape", () => {
    const r = Reg.attemptReconnect("nope", 1000, false);
    expect(r.succeeded).toBe(false);
    expect(r.reason).toBe("unknown plugin");
  });

  it("reconnect on already-online plugin short-circuits", () => {
    Reg.register(baseReg(), 1000);
    const r = Reg.attemptReconnect("hm-viewer", 2000, false);
    expect(r.succeeded).toBe(true);
    expect(r.reason).toBe("already online");
  });

  it("dueForReconnect() surfaces plugins whose backoff window has expired", () => {
    pushOffline(0);
    Reg.attemptReconnect("hm-viewer", 1_000, false); // schedules at 1000+2000 = 3000
    expect(Reg.dueForReconnect(2_500)).toHaveLength(0);
    expect(Reg.dueForReconnect(3_001)).toHaveLength(1);
  });
});

describe("CAMPluginRegistryEngine — Compatibility", () => {
  beforeEach(() => Reg.resetRegistry());

  it("PRISM version inside range is compatible", () => {
    Reg.register(baseReg(), 1000);
    const c = Reg.checkCompatibility("hm-viewer", "1.5.2");
    expect(c.compatible).toBe(true);
  });

  it("PRISM version below min is incompatible", () => {
    Reg.register(baseReg(), 1000);
    const c = Reg.checkCompatibility("hm-viewer", "0.9.9");
    expect(c.compatible).toBe(false);
    expect(c.reason).toMatch(/min/);
  });

  it("PRISM version above max is incompatible", () => {
    Reg.register(baseReg(), 1000);
    const c = Reg.checkCompatibility("hm-viewer", "2.0.1");
    expect(c.compatible).toBe(false);
    expect(c.reason).toMatch(/max/);
  });

  it("open-ended range (no max) accepts any higher version", () => {
    Reg.register(
      baseReg({
        compat_range: { min_prism_version: "1.0.0" },
      }),
      1000,
    );
    const c = Reg.checkCompatibility("hm-viewer", "99.0.0");
    expect(c.compatible).toBe(true);
  });

  it("compat on unknown plugin returns explicit incompatible", () => {
    const c = Reg.checkCompatibility("nope", "1.0.0");
    expect(c.compatible).toBe(false);
    expect(c.reason).toBe("plugin not registered");
  });

  it("bad prism version yields incompatible with parse error reason", () => {
    Reg.register(baseReg(), 1000);
    const c = Reg.checkCompatibility("hm-viewer", "not-a-version");
    expect(c.compatible).toBe(false);
    expect(c.reason).toMatch(/Invalid SemVer/);
  });
});

describe("CAMPluginRegistryEngine — Listing + dashboard + events", () => {
  beforeEach(() => Reg.resetRegistry());

  it("listPlugins() returns all registered plugins", () => {
    Reg.register(baseReg({ plugin_id: "hm-1" }), 1000);
    Reg.register(
      baseReg({ plugin_id: "fusion-1", target: "fusion360", endpoint: "ws://f" }),
      1000,
    );
    expect(Reg.listPlugins()).toHaveLength(2);
  });

  it("listPlugins({target}) filters by target", () => {
    Reg.register(baseReg({ plugin_id: "hm-1" }), 1000);
    Reg.register(
      baseReg({
        plugin_id: "inv-1",
        target: "inventor_hsm",
        transport: "grpc",
        endpoint: "grpc://i",
      }),
      1000,
    );
    const filtered = Reg.listPlugins({ target: "inventor_hsm" });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].plugin_id).toBe("inv-1");
  });

  it("listPlugins({health}) filters by health state", () => {
    Reg.register(baseReg({ plugin_id: "hm-1" }), 1000);
    Reg.register(baseReg({ plugin_id: "hm-2" }), 1000);
    Reg.reportFailure("hm-2", "fail", 2000);
    expect(Reg.listPlugins({ health: "online" })).toHaveLength(1);
    expect(Reg.listPlugins({ health: "degraded" })).toHaveLength(1);
  });

  it("computeHealthDashboard() totals match registered count", () => {
    Reg.register(baseReg({ plugin_id: "hm-1" }), 1000);
    Reg.register(
      baseReg({ plugin_id: "mc-1", target: "mastercam", transport: "grpc", endpoint: "grpc://m" }),
      1000,
    );
    const d = Reg.computeHealthDashboard(1500);
    expect(d.total_registered).toBe(2);
    expect(d.online_count).toBe(2);
    expect(d.per_target_count.hypermill).toBe(1);
    expect(d.per_target_count.mastercam).toBe(1);
  });

  it("computeHealthDashboard() counts stale plugins beyond STALE_AFTER_MS", () => {
    Reg.register(baseReg({ plugin_id: "hm-1" }), 1000);
    const now = 1000 + STALE_AFTER_MS + 1;
    const d = Reg.computeHealthDashboard(now);
    expect(d.stale_count).toBe(1);
  });

  it("computeHealthDashboard() counts reconnect_queue_count for scheduled retries", () => {
    Reg.register(baseReg({ plugin_id: "hm-1" }), 1000);
    for (let i = 0; i < FAIL_BEFORE_OFFLINE; i++) {
      Reg.reportFailure("hm-1", "err", 2000 + i * 100);
    }
    const d = Reg.computeHealthDashboard(3000);
    expect(d.offline_count).toBe(1);
    expect(d.reconnect_queue_count).toBe(1);
  });

  it("recentEvents() captures register + health transitions", () => {
    Reg.register(baseReg(), 1000);
    Reg.reportFailure("hm-viewer", "err", 2000);
    const events = Reg.recentEvents();
    expect(events.length).toBeGreaterThanOrEqual(2);
    const last = events[events.length - 1];
    expect(last.to_state).toBe("degraded");
  });

  it("resetRegistry() clears plugins and events", () => {
    Reg.register(baseReg(), 1000);
    Reg.reportFailure("hm-viewer", "err", 2000);
    Reg.resetRegistry();
    expect(Reg.listPlugins()).toHaveLength(0);
    expect(Reg.recentEvents()).toHaveLength(0);
  });
});
