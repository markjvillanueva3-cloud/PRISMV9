/**
 * CAMPluginCommunicationHubEngine tests — U-CAM96
 * ================================================
 *
 * Exhaustive coverage of the plugin communication hub. Target ≥30 cases
 * covering schema, registration lifecycle, per-transport routing, queue
 * semantics, broadcast, batch, drain, stats, and session isolation.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  CAMPluginCommunicationHubEngine as Hub,
  HubPluginRegistrationSchema,
  HubFrameEnvelopeSchema,
  HubRouteResultSchema,
  HEARTBEAT_STALE_MS,
  MAX_QUEUE_DEPTH,
  type HubPluginRegistration,
  type HubFrameEnvelope,
} from "../engines/CAMPluginCommunicationHubEngine.js";

function hmReg(
  overrides: Partial<HubPluginRegistration> = {},
): HubPluginRegistration {
  return {
    plugin_id: "hm-viewer",
    target: "hypermill",
    transport: "websocket",
    endpoint: "ws://localhost:9001/hm",
    version: "1.0.0",
    capabilities: ["force", "chatter", "deflection", "thermal", "tool_life", "safety_score"],
    ...overrides,
  };
}

function fusionReg(
  overrides: Partial<HubPluginRegistration> = {},
): HubPluginRegistration {
  return {
    plugin_id: "fusion-main",
    target: "fusion360",
    transport: "websocket",
    endpoint: "ws://localhost:9002/fusion",
    version: "2.3.1",
    capabilities: ["force", "safety_score"],
    ...overrides,
  };
}

function invReg(
  overrides: Partial<HubPluginRegistration> = {},
): HubPluginRegistration {
  return {
    plugin_id: "inv-hsm",
    target: "inventor_hsm",
    transport: "grpc",
    endpoint: "grpc://localhost:50051",
    version: "1.5.0",
    capabilities: ["force", "chatter", "safety_score"],
    ...overrides,
  };
}

function mcReg(
  overrides: Partial<HubPluginRegistration> = {},
): HubPluginRegistration {
  return {
    plugin_id: "mc-x8",
    target: "mastercam",
    transport: "grpc",
    endpoint: "grpc://localhost:50052",
    version: "8.0.2",
    capabilities: ["force", "chatter", "deflection", "thermal", "tool_life", "safety_score"],
    ...overrides,
  };
}

function frame(
  overrides: Partial<HubFrameEnvelope> = {},
): HubFrameEnvelope {
  return {
    frame_type: "force",
    target: "hypermill",
    operation_id: "OP-001",
    payload: '{"type":"force","value":120.5}',
    seq: 0,
    hard_stop: false,
    ...overrides,
  };
}

describe("CAMPluginCommunicationHubEngine — Schemas", () => {
  it("validates a well-formed registration", () => {
    expect(() => HubPluginRegistrationSchema.parse(hmReg())).not.toThrow();
  });

  it("rejects an empty plugin_id", () => {
    expect(() =>
      HubPluginRegistrationSchema.parse(hmReg({ plugin_id: "" })),
    ).toThrow();
  });

  it("rejects an unknown target", () => {
    expect(() =>
      HubPluginRegistrationSchema.parse(
        hmReg({ target: "solidworks" as unknown as HubPluginRegistration["target"] }),
      ),
    ).toThrow();
  });

  it("rejects an unknown transport", () => {
    expect(() =>
      HubPluginRegistrationSchema.parse(
        hmReg({ transport: "udp" as unknown as HubPluginRegistration["transport"] }),
      ),
    ).toThrow();
  });

  it("requires at least one capability", () => {
    expect(() =>
      HubPluginRegistrationSchema.parse(hmReg({ capabilities: [] })),
    ).toThrow();
  });

  it("validates a well-formed frame envelope", () => {
    expect(() => HubFrameEnvelopeSchema.parse(frame())).not.toThrow();
  });

  it("rejects negative seq numbers", () => {
    expect(() => HubFrameEnvelopeSchema.parse(frame({ seq: -1 }))).toThrow();
  });

  it("rejects non-integer seq numbers", () => {
    expect(() => HubFrameEnvelopeSchema.parse(frame({ seq: 1.5 }))).toThrow();
  });

  it("validates a well-formed route result", () => {
    const result = {
      plugin_id: "hm-viewer",
      target: "hypermill" as const,
      transport: "websocket" as const,
      status: "delivered" as const,
      latency_ms: 5,
      seq: 0,
      queued_depth: 0,
      hard_stop: false,
    };
    expect(() => HubRouteResultSchema.parse(result)).not.toThrow();
  });
});

describe("CAMPluginCommunicationHubEngine — Registration lifecycle", () => {
  beforeEach(() => {
    Hub.resetRegistry();
    Hub.resetSession("session-reg");
  });

  it("registers a plugin and surfaces it via registered()", () => {
    Hub.register(hmReg(), 1000);
    const registered = Hub.registered();
    expect(registered).toHaveLength(1);
    expect(registered[0].plugin_id).toBe("hm-viewer");
  });

  it("registers all four canonical CAM targets", () => {
    Hub.register(hmReg(), 1000);
    Hub.register(fusionReg(), 1000);
    Hub.register(invReg(), 1000);
    Hub.register(mcReg(), 1000);
    const targets = Hub.registered().map(r => r.target).sort();
    expect(targets).toEqual(["fusion360", "hypermill", "inventor_hsm", "mastercam"]);
  });

  it("unregister() removes a plugin", () => {
    Hub.register(hmReg(), 1000);
    Hub.unregister("hm-viewer");
    expect(Hub.registered()).toHaveLength(0);
  });

  it("re-registering the same plugin_id overwrites prior record", () => {
    Hub.register(hmReg({ version: "1.0.0" }), 1000);
    Hub.register(hmReg({ version: "2.0.0" }), 2000);
    const registered = Hub.registered();
    expect(registered).toHaveLength(1);
    expect(registered[0].version).toBe("2.0.0");
  });

  it("heartbeat() returns false for unknown plugin", () => {
    expect(Hub.heartbeat("nope")).toBe(false);
  });

  it("heartbeat() returns true for registered plugin", () => {
    Hub.register(hmReg(), 1000);
    expect(Hub.heartbeat("hm-viewer", 1500)).toBe(true);
  });

  it("supportedTargets() returns all five target slots", () => {
    expect(Hub.supportedTargets()).toEqual([
      "hypermill",
      "fusion360",
      "inventor_hsm",
      "mastercam",
      "generic",
    ]);
  });

  it("supportedTransports() returns websocket and grpc", () => {
    expect(Hub.supportedTransports()).toEqual(["websocket", "grpc"]);
  });

  it("supportedFrameTypes() returns all six overlay types", () => {
    expect(Hub.supportedFrameTypes()).toEqual([
      "force",
      "chatter",
      "deflection",
      "thermal",
      "tool_life",
      "safety_score",
    ]);
  });
});

describe("CAMPluginCommunicationHubEngine — Routing basics", () => {
  beforeEach(() => {
    Hub.resetRegistry();
    Hub.resetSession("session-route");
  });

  it("returns unknown_target when no plugin registered", () => {
    const result = Hub.route("session-route", frame(), 1000);
    expect(result.status).toBe("unknown_target");
    expect(result.plugin_id).toBeNull();
    expect(result.transport).toBeNull();
  });

  it("delivers a frame to a registered plugin", () => {
    Hub.register(hmReg(), 1000);
    const result = Hub.route("session-route", frame({ seq: 0 }), 1000);
    expect(result.status).toBe("delivered");
    expect(result.plugin_id).toBe("hm-viewer");
    expect(result.transport).toBe("websocket");
  });

  it("returns capability_unsupported when plugin cannot handle frame type", () => {
    Hub.register(fusionReg({ capabilities: ["force"] }), 1000);
    const result = Hub.route(
      "session-route",
      frame({ target: "fusion360", frame_type: "deflection", seq: 0 }),
      1000,
    );
    expect(result.status).toBe("capability_unsupported");
  });

  it("returns deterministic WebSocket latency for seq=0", () => {
    Hub.register(hmReg(), 1000);
    const result = Hub.route("session-route", frame({ seq: 0 }), 1000);
    // base 4 + jitter (0*3)%12 = 0 → 4 ms
    expect(result.latency_ms).toBeCloseTo(4, 5);
  });

  it("returns deterministic WebSocket latency for seq=5", () => {
    Hub.register(hmReg(), 1000);
    const result = Hub.route("session-route", frame({ seq: 5 }), 1000);
    // base 4 + jitter (5*3)%12 = 3 → 7 ms
    expect(result.latency_ms).toBeCloseTo(7, 5);
  });

  it("returns deterministic gRPC latency for seq=0", () => {
    Hub.register(mcReg(), 1000);
    const result = Hub.route(
      "session-route",
      frame({ target: "mastercam", seq: 0 }),
      1000,
    );
    // base 2 + jitter 0 = 2 ms
    expect(result.latency_ms).toBeCloseTo(2, 5);
  });

  it("returns deterministic gRPC latency for seq=7", () => {
    Hub.register(mcReg(), 1000);
    const result = Hub.route(
      "session-route",
      frame({ target: "mastercam", seq: 7 }),
      1000,
    );
    // base 2 + jitter (7*3)%12 = (21)%12 = 9 → 11 ms
    expect(result.latency_ms).toBeCloseTo(11, 5);
  });

  it("satisfies sub-100ms exit condition for all seq values 0..999", () => {
    Hub.register(hmReg(), 1000);
    let max = 0;
    for (let seq = 0; seq < 1000; seq++) {
      const result = Hub.route("session-route", frame({ seq }), 1000);
      if (result.latency_ms > max) max = result.latency_ms;
    }
    expect(max).toBeLessThan(100);
  });

  it("routes to the correct plugin when multiple targets are registered", () => {
    Hub.register(hmReg(), 1000);
    Hub.register(fusionReg(), 1000);
    const result = Hub.route(
      "session-route",
      frame({ target: "fusion360", seq: 0 }),
      1000,
    );
    expect(result.plugin_id).toBe("fusion-main");
    expect(result.target).toBe("fusion360");
  });

  it("propagates hard_stop flag through the result", () => {
    Hub.register(hmReg(), 1000);
    const result = Hub.route(
      "session-route",
      frame({ hard_stop: true, seq: 0 }),
      1000,
    );
    expect(result.hard_stop).toBe(true);
  });
});

describe("CAMPluginCommunicationHubEngine — Queue + stale plugin semantics", () => {
  beforeEach(() => {
    Hub.resetRegistry();
    Hub.resetSession("session-queue");
  });

  it("queues frames when plugin has gone stale", () => {
    Hub.register(hmReg(), 1000);
    const stale_now = 1000 + HEARTBEAT_STALE_MS + 1;
    const result = Hub.route("session-queue", frame({ seq: 0 }), stale_now);
    expect(result.status).toBe("queued");
    expect(result.queued_depth).toBe(1);
  });

  it("continues queuing subsequent frames up to MAX_QUEUE_DEPTH", () => {
    Hub.register(hmReg(), 1000);
    const stale_now = 1000 + HEARTBEAT_STALE_MS + 1;
    for (let seq = 0; seq < MAX_QUEUE_DEPTH; seq++) {
      Hub.route("session-queue", frame({ seq }), stale_now);
    }
    expect(Hub.queuedDepth("hm-viewer")).toBe(MAX_QUEUE_DEPTH);
  });

  it("drops frames past MAX_QUEUE_DEPTH", () => {
    Hub.register(hmReg(), 1000);
    const stale_now = 1000 + HEARTBEAT_STALE_MS + 1;
    for (let seq = 0; seq < MAX_QUEUE_DEPTH; seq++) {
      Hub.route("session-queue", frame({ seq }), stale_now);
    }
    const dropResult = Hub.route(
      "session-queue",
      frame({ seq: MAX_QUEUE_DEPTH }),
      stale_now,
    );
    expect(dropResult.status).toBe("dropped");
  });

  it("restores delivery after heartbeat refreshes the plugin", () => {
    Hub.register(hmReg(), 1000);
    const stale_now = 1000 + HEARTBEAT_STALE_MS + 1;
    const queued = Hub.route("session-queue", frame({ seq: 0 }), stale_now);
    expect(queued.status).toBe("queued");

    Hub.heartbeat("hm-viewer", stale_now + 100);
    const delivered = Hub.route(
      "session-queue",
      frame({ seq: 1 }),
      stale_now + 100,
    );
    expect(delivered.status).toBe("delivered");
  });

  it("drainQueue() re-routes queued frames once plugin is fresh", () => {
    Hub.register(hmReg(), 1000);
    const stale_now = 1000 + HEARTBEAT_STALE_MS + 1;
    Hub.route("session-queue", frame({ seq: 0 }), stale_now);
    Hub.route("session-queue", frame({ seq: 1 }), stale_now);

    Hub.heartbeat("hm-viewer", stale_now + 100);
    const drained = Hub.drainQueue("session-queue", "hm-viewer", stale_now + 100);
    expect(drained).toHaveLength(2);
    expect(drained.every(r => r.status === "delivered")).toBe(true);
  });

  it("drainQueue() returns empty array when nothing queued", () => {
    Hub.register(hmReg(), 1000);
    const drained = Hub.drainQueue("session-queue", "hm-viewer", 2000);
    expect(drained).toEqual([]);
  });

  it("drainQueue() keeps frames queued if plugin still stale at drain time", () => {
    Hub.register(hmReg(), 1000);
    const stale_now = 1000 + HEARTBEAT_STALE_MS + 1;
    Hub.route("session-queue", frame({ seq: 0 }), stale_now);
    // drain without heartbeating
    const drained = Hub.drainQueue(
      "session-queue",
      "hm-viewer",
      stale_now + 500,
    );
    expect(drained[0].status).toBe("queued");
  });
});

describe("CAMPluginCommunicationHubEngine — Broadcast and batch", () => {
  beforeEach(() => {
    Hub.resetRegistry();
    Hub.resetSession("session-broadcast");
  });

  it("routeAll() dispatches to every plugin matching the target", () => {
    Hub.register(hmReg(), 1000);
    Hub.register(
      hmReg({ plugin_id: "hm-validator", endpoint: "ws://localhost:9003/hm" }),
      1000,
    );
    const results = Hub.routeAll("session-broadcast", frame({ seq: 0 }), 1000);
    expect(results).toHaveLength(2);
    expect(results.every(r => r.status === "delivered")).toBe(true);
  });

  it("routeAll() falls back to unknown_target if no plugin matches", () => {
    const results = Hub.routeAll(
      "session-broadcast",
      frame({ target: "inventor_hsm", seq: 0 }),
      1000,
    );
    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("unknown_target");
  });

  it("batchRoute() returns one result per envelope in order", () => {
    Hub.register(hmReg(), 1000);
    const envelopes: HubFrameEnvelope[] = [
      frame({ seq: 0 }),
      frame({ seq: 1 }),
      frame({ seq: 2 }),
    ];
    const results = Hub.batchRoute("session-broadcast", envelopes, 1000);
    expect(results).toHaveLength(3);
    expect(results.map(r => r.seq)).toEqual([0, 1, 2]);
    expect(results.every(r => r.status === "delivered")).toBe(true);
  });

  it("batchRoute() handles mixed target availability", () => {
    Hub.register(hmReg(), 1000);
    const envelopes: HubFrameEnvelope[] = [
      frame({ target: "hypermill", seq: 0 }),
      frame({ target: "fusion360", seq: 1 }),
    ];
    const results = Hub.batchRoute("session-broadcast", envelopes, 1000);
    expect(results[0].status).toBe("delivered");
    expect(results[1].status).toBe("unknown_target");
  });
});

describe("CAMPluginCommunicationHubEngine — Session statistics", () => {
  beforeEach(() => {
    Hub.resetRegistry();
    Hub.resetSession("session-stats");
  });

  it("getStats() returns zeroed stats for an unseen session", () => {
    const stats = Hub.getStats("never-seen");
    expect(stats.frames_in).toBe(0);
    expect(stats.frames_delivered).toBe(0);
  });

  it("tracks per-transport delivery counts", () => {
    Hub.register(hmReg(), 1000);
    Hub.register(mcReg(), 1000);
    Hub.route("session-stats", frame({ seq: 0 }), 1000);
    Hub.route("session-stats", frame({ target: "mastercam", seq: 1 }), 1000);
    const stats = Hub.getStats("session-stats");
    expect(stats.ws_delivered).toBe(1);
    expect(stats.grpc_delivered).toBe(1);
  });

  it("tracks per-target delivery counts across all four CAM hosts", () => {
    Hub.register(hmReg(), 1000);
    Hub.register(fusionReg(), 1000);
    Hub.register(invReg(), 1000);
    Hub.register(mcReg(), 1000);
    Hub.route("session-stats", frame({ target: "hypermill", seq: 0 }), 1000);
    Hub.route(
      "session-stats",
      frame({ target: "fusion360", frame_type: "force", seq: 1 }),
      1000,
    );
    Hub.route(
      "session-stats",
      frame({ target: "inventor_hsm", frame_type: "chatter", seq: 2 }),
      1000,
    );
    Hub.route("session-stats", frame({ target: "mastercam", seq: 3 }), 1000);
    const stats = Hub.getStats("session-stats");
    expect(stats.per_target_delivered.hypermill).toBe(1);
    expect(stats.per_target_delivered.fusion360).toBe(1);
    expect(stats.per_target_delivered.inventor_hsm).toBe(1);
    expect(stats.per_target_delivered.mastercam).toBe(1);
  });

  it("tracks per-frame-type delivery counts", () => {
    Hub.register(hmReg(), 1000);
    Hub.route("session-stats", frame({ frame_type: "force", seq: 0 }), 1000);
    Hub.route("session-stats", frame({ frame_type: "chatter", seq: 1 }), 1000);
    Hub.route(
      "session-stats",
      frame({ frame_type: "safety_score", seq: 2 }),
      1000,
    );
    const stats = Hub.getStats("session-stats");
    expect(stats.per_frame_type_delivered.force).toBe(1);
    expect(stats.per_frame_type_delivered.chatter).toBe(1);
    expect(stats.per_frame_type_delivered.safety_score).toBe(1);
  });

  it("tracks hard_stop frames separately", () => {
    Hub.register(hmReg(), 1000);
    Hub.route(
      "session-stats",
      frame({ hard_stop: true, seq: 0 }),
      1000,
    );
    Hub.route(
      "session-stats",
      frame({ hard_stop: false, seq: 1 }),
      1000,
    );
    const stats = Hub.getStats("session-stats");
    expect(stats.hard_stop_frames).toBe(1);
  });

  it("computes avg_latency_ms over delivered frames", () => {
    Hub.register(hmReg(), 1000);
    // seq 0 → 4ms, seq 1 → 4+3=7ms, seq 2 → 4+6=10ms → avg = 7
    Hub.route("session-stats", frame({ seq: 0 }), 1000);
    Hub.route("session-stats", frame({ seq: 1 }), 1000);
    Hub.route("session-stats", frame({ seq: 2 }), 1000);
    const stats = Hub.getStats("session-stats");
    expect(stats.avg_latency_ms).toBeCloseTo(7, 5);
    expect(stats.max_latency_ms).toBeCloseTo(10, 5);
  });

  it("counts frames_unknown_target when no plugin matches", () => {
    Hub.route("session-stats", frame({ target: "hypermill", seq: 0 }), 1000);
    const stats = Hub.getStats("session-stats");
    expect(stats.frames_unknown_target).toBe(1);
    expect(stats.frames_delivered).toBe(0);
  });
});

describe("CAMPluginCommunicationHubEngine — Session isolation", () => {
  beforeEach(() => {
    Hub.resetRegistry();
    Hub.resetSession("session-A");
    Hub.resetSession("session-B");
  });

  it("keeps stats strictly separated between sessions", () => {
    Hub.register(hmReg(), 1000);
    Hub.route("session-A", frame({ seq: 0 }), 1000);
    Hub.route("session-A", frame({ seq: 1 }), 1000);
    Hub.route("session-B", frame({ seq: 0 }), 1000);

    const statsA = Hub.getStats("session-A");
    const statsB = Hub.getStats("session-B");
    expect(statsA.frames_delivered).toBe(2);
    expect(statsB.frames_delivered).toBe(1);
  });

  it("resetSession() clears stats for a single session without affecting others", () => {
    Hub.register(hmReg(), 1000);
    Hub.route("session-A", frame({ seq: 0 }), 1000);
    Hub.route("session-B", frame({ seq: 0 }), 1000);
    Hub.resetSession("session-A");

    const statsA = Hub.getStats("session-A");
    const statsB = Hub.getStats("session-B");
    expect(statsA.frames_delivered).toBe(0);
    expect(statsB.frames_delivered).toBe(1);
  });

  it("plugin registry is global and shared across sessions", () => {
    Hub.register(hmReg(), 1000);
    Hub.route("session-A", frame({ seq: 0 }), 1000);
    const resultB = Hub.route("session-B", frame({ seq: 0 }), 1000);
    expect(resultB.status).toBe("delivered");
    expect(resultB.plugin_id).toBe("hm-viewer");
  });

  it("resetRegistry() makes all subsequent routes return unknown_target", () => {
    Hub.register(hmReg(), 1000);
    Hub.resetRegistry();
    const result = Hub.route("session-A", frame({ seq: 0 }), 1000);
    expect(result.status).toBe("unknown_target");
  });

  it("getStats snapshot does not share mutable references with internal state", () => {
    Hub.register(hmReg(), 1000);
    Hub.route("session-A", frame({ seq: 0 }), 1000);
    const snapshot = Hub.getStats("session-A");
    snapshot.frames_delivered = 999;
    snapshot.per_target_delivered.hypermill = 999;
    const fresh = Hub.getStats("session-A");
    expect(fresh.frames_delivered).toBe(1);
    expect(fresh.per_target_delivered.hypermill).toBe(1);
  });
});
