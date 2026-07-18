/**
 * Reactive-chains action-name collision guard (slot:bravo, 2026-06-18, task #28 blocker 1).
 *
 * reactiveChainBootstrap.ts (Chain 11 "capacity_to_scheduling") and cycleSchedulingBridge.ts
 * (INTEG-MS3) BOTH used to register an action literally named "reoptimize_schedule" on the SAME
 * global EventBus singleton. EventBus.registerAction is `this.actionRegistry.set(name, handler)`
 * (EventBus.ts:1230) -- silent last-writer-wins, no dup-check -- so whichever module loaded second
 * clobbered the other's handler, and the loser chain's step then resolved to the WRONG handler
 * (executeChain looks the handler up by name, EventBus.ts:1167). Gated default-OFF
 * (PRISM_REACTIVE_CHAINS_ENABLE), so it never bit live -- but it is a real pre-activation defect.
 * Fix: the bootstrap's action is renamed "reoptimize_schedule_capacity"; the bridge keeps
 * "reoptimize_schedule" (its INTEG-MS3 test still asserts that name, unchanged).
 *
 * These are REAL behavioral tests: each publishes a TypedEvent that triggers a reactive chain and
 * asserts WHICH handler actually ran (by its recorded side-effect / computed result payload). They
 * fail when the collision regresses (a clobbered handler is unreachable, or the live chain emits
 * the wrong handler's result) -- not merely when a name string is absent.
 */
import { describe, it, expect } from "vitest";
import { eventBus, EventBus, EventTypes } from "../engines/EventBus.js";

// Side-effect imports register both real modules' actions + chains on the singleton (the
// established cycle-scheduling-bridge.test.ts pattern). Importing BOTH is the point -- the
// collision only manifests when both bootstraps load onto one bus. Bridge imported LAST so, under
// the OLD bare-name collision, ITS handler would have won the clobber on the shared name.
import "../engines/reactiveChainBootstrap.js";
import "../engines/cycleSchedulingBridge.js";

describe("reactive-chains reoptimize_schedule collision (task #28 blocker 1)", () => {
  it("a same-named second handler makes the FIRST unreachable; the chain runs only the survivor", async () => {
    // Reproduces the bug mechanism on an isolated bus: two real handlers, ONE shared action name.
    const bus = new EventBus();
    const ran: string[] = [];
    bus.registerAction("shared_act", async () => { ran.push("first"); return {}; });
    bus.registerAction("shared_act", async () => { ran.push("second"); return {}; }); // clobbers the first
    bus.registerReactiveChain({
      name: "probe_chain", trigger_event: "probe.trigger", trigger_filter: { source: "*" },
      steps: [{ action: "shared_act" }], enabled: true,
    });
    await bus.publishTyped({ event: "probe.trigger", source: "test", payload: {} });
    // The chain executed exactly one handler -- the survivor -- proving the first is unreachable.
    expect(ran).toEqual(["second"]);
  });

  it("distinct action names make BOTH handlers reachable (the fix principle)", async () => {
    const bus = new EventBus();
    const ran: string[] = [];
    bus.registerAction("act_capacity", async () => { ran.push("capacity"); return {}; });
    bus.registerAction("act_cycle", async () => { ran.push("cycle"); return {}; });
    bus.registerReactiveChain({
      name: "cap_chain", trigger_event: "cap.trigger", trigger_filter: { source: "*" },
      steps: [{ action: "act_capacity" }], enabled: true,
    });
    bus.registerReactiveChain({
      name: "cyc_chain", trigger_event: "cyc.trigger", trigger_filter: { source: "*" },
      steps: [{ action: "act_cycle" }], enabled: true,
    });
    await bus.publishTyped({ event: "cap.trigger", source: "test", payload: {} });
    await bus.publishTyped({ event: "cyc.trigger", source: "test", payload: {} });
    expect(ran.sort()).toEqual(["capacity", "cycle"]); // both handlers independently invoked
  });

  it("LIVE: CAPACITY_UPDATED drives the real capacity_to_scheduling chain through the RENAMED handler", async () => {
    // Probe the real singleton: capture what the bootstrap's reoptimize step emits. Under the OLD
    // collision (bridge imported last won the shared "reoptimize_schedule" name), the bootstrap
    // chain step would resolve to the BRIDGE handler, whose result lacks {requested,optimization_type}
    // -> capturedRequested stays undefined and these assertions FAIL. With the rename, the chain step
    // "reoptimize_schedule_capacity" resolves to the bootstrap's OWN handler (util>85 branch).
    let capturedRequested: unknown;
    let capturedType: unknown;
    let capturedMachine: unknown;
    eventBus.registerAction("__collision_probe_capture", async (params) => {
      if (params.step === "reoptimize_schedule_capacity") {
        capturedRequested = params.requested;
        capturedType = params.optimization_type;
        capturedMachine = params.machine_id;
      }
      return {};
    });
    eventBus.registerReactiveChain({
      name: "__collision_probe_chain", trigger_event: EventTypes.SCHEDULE_OPTIMIZED,
      trigger_filter: { source: "*" }, steps: [{ action: "__collision_probe_capture" }], enabled: true,
    });

    await eventBus.publishTyped({
      event: EventTypes.CAPACITY_UPDATED, source: "collision-test",
      payload: { machine_id: "VMC-01", utilization_pct: 92 }, // >85 -> the handler requests a rebalance
    });

    // The handler's REAL computed result (util 92 > 85 -> rebalance request for VMC-01). Proves the
    // RENAMED handler -- not the clobbered bridge handler -- is wired into the live capacity chain.
    expect(capturedRequested).toBe(true);
    expect(capturedType).toBe("rebalance");
    expect(capturedMachine).toBe("VMC-01");
  });
});
