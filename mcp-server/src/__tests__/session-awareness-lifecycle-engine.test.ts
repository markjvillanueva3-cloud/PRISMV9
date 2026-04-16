/**
 * Tests for SessionAwarenessLifecycleEngine (Phase 0.13 U-SAW2)
 */

import { describe, it, expect } from "vitest";
import {
  SessionAwarenessLifecycleEngine,
  LIFECYCLE_PHASES,
  createSessionAwarenessLifecycle,
  type LifecyclePhase,
} from "../engines/SessionAwarenessLifecycleEngine.js";

describe("SessionAwarenessLifecycleEngine", () => {
  describe("construction", () => {
    it("starts in BOOT phase", () => {
      const e = new SessionAwarenessLifecycleEngine("s1");
      expect(e.getCurrent()).toBe("BOOT");
    });

    it("records initial BOOT entry in history", () => {
      const e = new SessionAwarenessLifecycleEngine("s1", "2026-04-16T00:00:00.000Z");
      const h = e.getHistory();
      expect(h).toHaveLength(1);
      expect(h[0].phase).toBe("BOOT");
      expect(h[0].enteredAt).toBe("2026-04-16T00:00:00.000Z");
    });

    it("uses current ISO timestamp when no startedAt supplied", () => {
      const e = new SessionAwarenessLifecycleEngine("s1");
      const iso = e.getHistory()[0].enteredAt;
      expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it("throws on empty sessionId", () => {
      expect(() => new SessionAwarenessLifecycleEngine("")).toThrow(/non-empty sessionId/);
      expect(() => new SessionAwarenessLifecycleEngine("   ")).toThrow(/non-empty sessionId/);
    });

    it("exposes the sessionId", () => {
      const e = new SessionAwarenessLifecycleEngine("session-42");
      expect(e.getSessionId()).toBe("session-42");
    });
  });

  describe("static transition table", () => {
    it("exposes all 8 phases in canonical order", () => {
      expect(LIFECYCLE_PHASES).toEqual([
        "BOOT",
        "VERIFY",
        "BRIEF",
        "EXECUTE",
        "METACOG_CHECK",
        "REFLECT",
        "HANDOFF",
        "NEXT_BOOT",
      ]);
    });

    it("allows BOOT → VERIFY only", () => {
      expect(SessionAwarenessLifecycleEngine.legalTransitions("BOOT")).toEqual(["VERIFY"]);
    });

    it("allows EXECUTE to METACOG_CHECK and REFLECT", () => {
      const legal = SessionAwarenessLifecycleEngine.legalTransitions("EXECUTE");
      expect(legal).toContain("METACOG_CHECK");
      expect(legal).toContain("REFLECT");
    });

    it("allows METACOG_CHECK back to EXECUTE and forward to REFLECT", () => {
      const legal = SessionAwarenessLifecycleEngine.legalTransitions("METACOG_CHECK");
      expect(legal).toContain("EXECUTE");
      expect(legal).toContain("REFLECT");
    });

    it("treats NEXT_BOOT as terminal", () => {
      expect(SessionAwarenessLifecycleEngine.legalTransitions("NEXT_BOOT")).toEqual([]);
    });

    it("canTransition is a convenience over legalTransitions", () => {
      expect(SessionAwarenessLifecycleEngine.canTransition("BOOT", "VERIFY")).toBe(true);
      expect(SessionAwarenessLifecycleEngine.canTransition("BOOT", "EXECUTE")).toBe(false);
    });
  });

  describe("transition() — happy path", () => {
    it("walks the full forward path in order", () => {
      const e = new SessionAwarenessLifecycleEngine("s1");
      const forward: LifecyclePhase[] = ["VERIFY", "BRIEF", "EXECUTE", "REFLECT", "HANDOFF", "NEXT_BOOT"];
      for (const next of forward) {
        const r = e.transition(next);
        expect(r.ok).toBe(true);
        expect(r.to).toBe(next);
      }
      expect(e.getCurrent()).toBe("NEXT_BOOT");
      expect(e.isTerminal()).toBe(true);
    });

    it("appends each legal transition to history", () => {
      const e = new SessionAwarenessLifecycleEngine("s1");
      e.transition("VERIFY");
      e.transition("BRIEF");
      expect(e.getHistory().map((h) => h.phase)).toEqual(["BOOT", "VERIFY", "BRIEF"]);
    });

    it("records reason and note on a transition", () => {
      const e = new SessionAwarenessLifecycleEngine("s1");
      e.transition("VERIFY", { reason: "awareness-check", note: "score=0.9" });
      const last = e.getHistory()[1];
      expect(last.reason).toBe("awareness-check");
      expect(last.note).toBe("score=0.9");
    });

    it("uses supplied timestamp when provided", () => {
      const e = new SessionAwarenessLifecycleEngine("s1");
      e.transition("VERIFY", { at: "2026-04-16T12:00:00.000Z" });
      expect(e.getHistory()[1].enteredAt).toBe("2026-04-16T12:00:00.000Z");
    });
  });

  describe("transition() — illegal transitions", () => {
    it("returns ok=false without advancing current phase", () => {
      const e = new SessionAwarenessLifecycleEngine("s1");
      const r = e.transition("EXECUTE");
      expect(r.ok).toBe(false);
      expect(r.reason).toMatch(/Illegal transition/);
      expect(e.getCurrent()).toBe("BOOT");
    });

    it("does not append to history on illegal transition", () => {
      const e = new SessionAwarenessLifecycleEngine("s1");
      e.transition("EXECUTE");
      expect(e.getHistory()).toHaveLength(1);
    });

    it("rejects any transition out of NEXT_BOOT", () => {
      const e = new SessionAwarenessLifecycleEngine("s1");
      const path: LifecyclePhase[] = ["VERIFY", "BRIEF", "EXECUTE", "REFLECT", "HANDOFF", "NEXT_BOOT"];
      for (const p of path) e.transition(p);
      for (const target of LIFECYCLE_PHASES) {
        expect(e.transition(target).ok).toBe(false);
      }
    });
  });

  describe("execute ⇄ metacog loop", () => {
    it("counts EXECUTE → METACOG_CHECK invocations", () => {
      const e = new SessionAwarenessLifecycleEngine("s1");
      e.transition("VERIFY");
      e.transition("BRIEF");
      e.transition("EXECUTE");
      e.transition("METACOG_CHECK");
      e.transition("EXECUTE");
      e.transition("METACOG_CHECK");
      expect(e.getExecuteToMetacogCount()).toBe(2);
    });

    it("does not count METACOG_CHECK → EXECUTE", () => {
      const e = new SessionAwarenessLifecycleEngine("s1");
      e.transition("VERIFY");
      e.transition("BRIEF");
      e.transition("EXECUTE");
      e.transition("METACOG_CHECK");
      e.transition("EXECUTE");
      expect(e.getExecuteToMetacogCount()).toBe(1);
    });
  });

  describe("pathTo()", () => {
    it("returns a singleton array when already at target", () => {
      const e = new SessionAwarenessLifecycleEngine("s1");
      expect(e.pathTo("BOOT")).toEqual(["BOOT"]);
    });

    it("finds the shortest forward path to HANDOFF from BOOT", () => {
      const e = new SessionAwarenessLifecycleEngine("s1");
      expect(e.pathTo("HANDOFF")).toEqual(["BOOT", "VERIFY", "BRIEF", "EXECUTE", "REFLECT", "HANDOFF"]);
    });

    it("returns null when target is unreachable (after NEXT_BOOT)", () => {
      const e = new SessionAwarenessLifecycleEngine("s1");
      const path: LifecyclePhase[] = ["VERIFY", "BRIEF", "EXECUTE", "REFLECT", "HANDOFF", "NEXT_BOOT"];
      for (const p of path) e.transition(p);
      expect(e.pathTo("EXECUTE")).toBeNull();
    });
  });

  describe("snapshot()", () => {
    it("returns a snapshot whose history is decoupled from the engine", () => {
      const e = new SessionAwarenessLifecycleEngine("s1");
      e.transition("VERIFY");
      const snap = e.snapshot();
      expect(snap.history).toHaveLength(2);

      // mutating the snapshot must not leak back into the engine
      (snap.history as unknown as { phase: string }[]).push({ phase: "TAMPER" });
      expect(e.getHistory()).toHaveLength(2);
    });

    it("reports the lastTransitionAt as the most recent entry", () => {
      const e = new SessionAwarenessLifecycleEngine("s1", "2026-04-16T00:00:00.000Z");
      e.transition("VERIFY", { at: "2026-04-16T00:01:00.000Z" });
      expect(e.snapshot().lastTransitionAt).toBe("2026-04-16T00:01:00.000Z");
    });
  });

  describe("factory", () => {
    it("createSessionAwarenessLifecycle returns a fresh instance per call", () => {
      const a = createSessionAwarenessLifecycle("s-a");
      const b = createSessionAwarenessLifecycle("s-b");
      a.transition("VERIFY");
      expect(a.getCurrent()).toBe("VERIFY");
      expect(b.getCurrent()).toBe("BOOT");
    });
  });
});
