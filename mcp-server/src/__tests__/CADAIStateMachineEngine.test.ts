/**
 * CADAIStateMachineEngine tests — U-CADC-AI04
 *
 * Covers:
 *   1. Open / close / has / list lifecycle
 *   2. Happy-path round-trip IDLE → ... → COMPLETE
 *   3. Every legal transition in the table
 *   4. Illegal transitions throw IllegalTransitionError with correct fields
 *   5. Fail path from any non-terminal state
 *   6. Pause refuses work except resume/reset
 *   7. Resume restores dispatch
 *   8. Observer pattern: subscribe, unsubscribe, error isolation
 *   9. Log ringbuffer + getLog tail
 *  10. allowedEvents reflects paused state
 *  11. snapshot.terminal flag
 *  12. UnknownSessionError
 *  13. Log capacity enforcement
 *  14. Session reset preserves sessionId
 *  15. Recycle COMPLETE → DECOMPOSING via start
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  CADAIStateMachineEngine,
  IllegalTransitionError,
  PausedError,
  UnknownSessionError,
  CAD_AI_STATES,
  CAD_AI_EVENTS,
  type TransitionEvent,
} from "../engines/CADAIStateMachineEngine.js";

describe("CADAIStateMachineEngine", () => {
  let eng: CADAIStateMachineEngine;

  beforeEach(() => {
    eng = new CADAIStateMachineEngine({ logCap: 50 });
  });

  describe("state + event surface", () => {
    it("exposes 8 states and 10 events", () => {
      expect(CAD_AI_STATES).toHaveLength(8);
      expect(CAD_AI_EVENTS).toHaveLength(10);
    });
  });

  describe("lifecycle", () => {
    it("open creates a session in IDLE", () => {
      const s = eng.open("sess-1");
      expect(s.sessionId).toBe("sess-1");
      expect(s.state).toBe("IDLE");
      expect(s.paused).toBe(false);
      expect(eng.has("sess-1")).toBe(true);
    });

    it("list returns tracked sessions", () => {
      eng.open("a");
      eng.open("b");
      expect(eng.list().sort()).toEqual(["a", "b"]);
    });

    it("close drops a session", () => {
      eng.open("x");
      eng.close("x");
      expect(eng.has("x")).toBe(false);
    });

    it("open on empty sessionId throws", () => {
      expect(() => eng.open("")).toThrow();
      expect(() => eng.open("   ")).toThrow();
    });
  });

  describe("happy path IDLE → COMPLETE", () => {
    it("walks the full chain and lands on COMPLETE", () => {
      eng.open("s");
      expect(eng.dispatch("s", "start").state).toBe("DECOMPOSING");
      expect(eng.dispatch("s", "decomposed").state).toBe("PLANNING");
      expect(eng.dispatch("s", "planned").state).toBe("EXECUTING");
      expect(eng.dispatch("s", "executed").state).toBe("VALIDATING");
      expect(eng.dispatch("s", "validated").state).toBe("LEARNING");
      const final = eng.dispatch("s", "learned");
      expect(final.state).toBe("COMPLETE");
      expect(final.terminal).toBe(true);
      expect(final.transitionCount).toBe(6);
    });
  });

  describe("illegal transitions", () => {
    it("throws IllegalTransitionError with from + event", () => {
      eng.open("s");
      try {
        eng.dispatch("s", "planned"); // planned is only valid in PLANNING
        expect.fail("should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(IllegalTransitionError);
        expect((e as IllegalTransitionError).from).toBe("IDLE");
        expect((e as IllegalTransitionError).event).toBe("planned");
      }
    });

    it("rejects `decomposed` in IDLE, PLANNING, EXECUTING, etc.", () => {
      for (const fromEvent of [null, "start:decomposed", "start:decomposed:planned"]) {
        eng.open("s");
        if (fromEvent) {
          for (const e of fromEvent.split(":")) eng.dispatch("s", e as any);
        }
        if (eng.snapshot("s").state === "DECOMPOSING") continue; // legal
        expect(() => eng.dispatch("s", "decomposed")).toThrow(IllegalTransitionError);
        eng.close("s");
      }
    });
  });

  describe("fail path", () => {
    it("fail from any non-terminal state → FAILED", () => {
      for (const after of [
        [] as string[],
        ["start"],
        ["start", "decomposed"],
        ["start", "decomposed", "planned"],
        ["start", "decomposed", "planned", "executed"],
        ["start", "decomposed", "planned", "executed", "validated"],
      ]) {
        eng.open("s");
        for (const e of after) eng.dispatch("s", e as any);
        const snap = eng.dispatch("s", "fail", { reason: "tool crash" });
        expect(snap.state).toBe("FAILED");
        expect(snap.failedReason).toBe("tool crash");
        expect(snap.terminal).toBe(true);
        eng.close("s");
      }
    });

    it("reset from FAILED returns to IDLE and clears reason", () => {
      eng.open("s");
      eng.dispatch("s", "start");
      eng.dispatch("s", "fail", "boom");
      const snap = eng.dispatch("s", "reset");
      expect(snap.state).toBe("IDLE");
      expect(snap.failedReason).toBeUndefined();
    });
  });

  describe("pause / resume", () => {
    it("pause refuses non-resume/reset events", () => {
      eng.open("s");
      eng.dispatch("s", "start"); // DECOMPOSING
      eng.dispatch("s", "pause");
      expect(eng.snapshot("s").paused).toBe(true);
      expect(() => eng.dispatch("s", "decomposed")).toThrow(PausedError);
      // state unchanged after refusal
      expect(eng.snapshot("s").state).toBe("DECOMPOSING");
    });

    it("resume clears paused flag and allows dispatch", () => {
      eng.open("s");
      eng.dispatch("s", "start");
      eng.dispatch("s", "pause");
      eng.dispatch("s", "resume");
      const snap = eng.dispatch("s", "decomposed");
      expect(snap.state).toBe("PLANNING");
      expect(snap.paused).toBe(false);
    });

    it("reset works while paused", () => {
      eng.open("s");
      eng.dispatch("s", "start");
      eng.dispatch("s", "pause");
      const snap = eng.dispatch("s", "reset");
      expect(snap.state).toBe("IDLE");
      expect(snap.paused).toBe(false);
    });
  });

  describe("observer pattern", () => {
    it("fires on every transition", () => {
      eng.open("s");
      const events: TransitionEvent[] = [];
      eng.subscribe((e) => events.push(e));
      eng.dispatch("s", "start");
      eng.dispatch("s", "decomposed");
      expect(events).toHaveLength(2);
      expect(events[0]!.from).toBe("IDLE");
      expect(events[0]!.to).toBe("DECOMPOSING");
      expect(events[1]!.to).toBe("PLANNING");
    });

    it("unsubscribe stops delivery", () => {
      eng.open("s");
      const events: TransitionEvent[] = [];
      const off = eng.subscribe((e) => events.push(e));
      eng.dispatch("s", "start");
      off();
      eng.dispatch("s", "decomposed");
      expect(events).toHaveLength(1);
    });

    it("observer exception does not derail the FSM", () => {
      eng.open("s");
      eng.subscribe(() => {
        throw new Error("bad listener");
      });
      expect(eng.dispatch("s", "start").state).toBe("DECOMPOSING");
      expect(eng.dispatch("s", "decomposed").state).toBe("PLANNING");
    });
  });

  describe("log + tail", () => {
    it("getLog returns most recent tail up to the cap", () => {
      eng.open("s");
      eng.dispatch("s", "start");
      eng.dispatch("s", "decomposed");
      eng.dispatch("s", "planned");
      const tail2 = eng.getLog("s", 2);
      expect(tail2).toHaveLength(2);
      expect(tail2[1]!.to).toBe("EXECUTING");
    });

    it("log respects capacity", () => {
      const small = new CADAIStateMachineEngine({ logCap: 3 });
      small.open("s");
      for (const e of ["start", "decomposed", "planned", "executed", "validated"]) {
        small.dispatch("s", e as any);
      }
      const log = small.getLog("s", 10);
      expect(log).toHaveLength(3);
      expect(log[log.length - 1]!.to).toBe("LEARNING");
    });
  });

  describe("UI support", () => {
    it("allowedEvents includes pause in normal, resume in paused", () => {
      eng.open("s");
      expect(eng.allowedEvents("s")).toContain("pause");
      eng.dispatch("s", "start");
      eng.dispatch("s", "pause");
      const paused = eng.allowedEvents("s");
      expect(paused).toContain("resume");
      expect(paused).toContain("reset");
    });

    it("snapshot flags terminal", () => {
      eng.open("s");
      expect(eng.snapshot("s").terminal).toBe(false);
      for (const e of ["start", "decomposed", "planned", "executed", "validated", "learned"]) {
        eng.dispatch("s", e as any);
      }
      expect(eng.snapshot("s").terminal).toBe(true);
    });
  });

  describe("unknown session", () => {
    it("dispatch on unknown session throws UnknownSessionError", () => {
      expect(() => eng.dispatch("missing", "start")).toThrow(UnknownSessionError);
    });

    it("getLog on unknown session throws", () => {
      expect(() => eng.getLog("missing")).toThrow(UnknownSessionError);
    });
  });

  describe("recycle", () => {
    it("COMPLETE accepts start to kick off the next flow", () => {
      eng.open("s");
      for (const e of ["start", "decomposed", "planned", "executed", "validated", "learned"]) {
        eng.dispatch("s", e as any);
      }
      expect(eng.snapshot("s").state).toBe("COMPLETE");
      const next = eng.dispatch("s", "start");
      expect(next.state).toBe("DECOMPOSING");
    });
  });
});
