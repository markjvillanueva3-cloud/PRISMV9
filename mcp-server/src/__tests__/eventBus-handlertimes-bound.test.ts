// Tests the synchronous handlerTimes bound added at the publish() push site.
// The 60s startCleanup interval also trims, but between ticks a busy bus grew
// unbounded; the push-site trim caps it. R9: pre-fix length would be 1100.
import { describe, it, expect, afterEach } from "vitest";
import { EventBus } from "../engines/EventBus.js";

describe("EventBus handlerTimes synchronous bound", () => {
  let bus: any;
  afterEach(() => {
    // Stop the 60s cleanup interval the constructor started (no dangling timer).
    if (bus && bus.cleanupInterval) clearInterval(bus.cleanupInterval);
  });

  it("caps handlerTimes at <=1000 between cleanup ticks (no subscribers needed)", async () => {
    bus = new EventBus();
    for (let i = 0; i < 1100; i++) {
      await bus.publish("test.tick", { i });
    }
    const len = bus.handlerTimes.length;
    // No 60s cleanup tick fires in this fast synchronous window. Pre-fix the
    // array would be 1100; the push-site trim holds it to the 1000/500 band.
    expect(len <= 1000).toBe(true);
    expect(len >= 500).toBe(true); // trimmed to last 500 at #1001, then grew back
  });

  it("retains only finite numeric timings after the trim (no corruption)", async () => {
    bus = new EventBus();
    for (let i = 0; i < 1100; i++) {
      await bus.publish("test.tick", { i });
    }
    const arr = bus.handlerTimes as unknown[];
    expect(arr.length <= 1000).toBe(true);
    expect(arr.every((n) => typeof n === "number" && Number.isFinite(n))).toBe(true);
  });
});
