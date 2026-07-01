/**
 * EventBus.registerAction fail-loud duplicate-name guard (slot:bravo, 2026-06-18, U-EVENTBUS-DUP-WARN).
 *
 * registerAction is last-writer-wins (this.actionRegistry.set, EventBus.ts:1230) -- a second
 * registration of the SAME action name silently REPLACES the first, making one handler unreachable
 * and a reactive-chain step resolve to the wrong handler (executeChain resolves step.action by name,
 * EventBus.ts:1167). That silent footgun caused the real reoptimize_schedule collision
 * (U-REOPT-COLLISION-FIX). This guard keeps the overwrite (back-compat) but WARNs loudly so a
 * collision is surfaced. R16: closes the CLASS of bug, not just the one instance.
 *
 * Real behavioral tests: spy the live logger (the same `log` singleton EventBus imports) and assert
 * the warn FIRES exactly once on a duplicate name and NOT on distinct names. They fail if the guard
 * is removed (no warn on dup) or misfires (warns on a fresh name).
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { EventBus } from "../engines/EventBus.js";
import { log } from "../utils/Logger.js";

afterEach(() => { vi.restoreAllMocks(); });

const noop = async () => ({});

describe("EventBus.registerAction duplicate-name guard (U-EVENTBUS-DUP-WARN)", () => {
  it("does NOT warn when each action name is registered once (no false alarm)", () => {
    const warn = vi.spyOn(log, "warn").mockImplementation(() => undefined as never);
    const bus = new EventBus();
    bus.registerAction("alpha_act", noop);
    bus.registerAction("beta_act", noop);
    bus.registerAction("gamma_act", noop);
    expect(warn).toHaveBeenCalledTimes(0);
  });

  it("WARNS exactly once, naming the colliding action, when a name is registered a second time", () => {
    const warn = vi.spyOn(log, "warn").mockImplementation(() => undefined as never);
    const bus = new EventBus();
    bus.registerAction("collide_act", noop);
    expect(warn).toHaveBeenCalledTimes(0); // first registration is clean
    bus.registerAction("collide_act", async () => ({ different: true })); // duplicate -> collision
    expect(warn).toHaveBeenCalledTimes(1);
    const msg = String(warn.mock.calls[0][0]);
    expect(msg).toMatch(/collide_act/);              // names the offending action
    expect(msg).toMatch(/RE-REGISTERED|collision/i); // explains the hazard
  });

  it("warns once PER duplicate (a third registration of the same name warns again)", () => {
    const warn = vi.spyOn(log, "warn").mockImplementation(() => undefined as never);
    const bus = new EventBus();
    bus.registerAction("triple_act", noop);
    bus.registerAction("triple_act", noop); // 2nd -> warn 1
    bus.registerAction("triple_act", noop); // 3rd -> warn 2
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it("the overwrite is PRESERVED (back-compat): after a re-registration the latest handler is the live one", async () => {
    vi.spyOn(log, "warn").mockImplementation(() => undefined as never);
    const bus = new EventBus();
    const ran: string[] = [];
    bus.registerAction("live_act", async () => { ran.push("first"); return {}; });
    bus.registerAction("live_act", async () => { ran.push("second"); return {}; }); // overwrites (warned)
    bus.registerReactiveChain({
      name: "live_chain", trigger_event: "live.trigger", trigger_filter: { source: "*" },
      steps: [{ action: "live_act" }], enabled: true,
    });
    await bus.publishTyped({ event: "live.trigger", source: "test", payload: {} });
    expect(ran).toEqual(["second"]); // last-writer-wins overwrite intact -- the guard only adds a warn
  });
});
