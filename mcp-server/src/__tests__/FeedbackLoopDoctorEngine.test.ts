import { describe, it, expect } from "vitest";
import {
  FeedbackLoopDoctorEngine,
  feedbackLoopDoctorEngine,
} from "../engines/FeedbackLoopDoctorEngine.js";

describe("FeedbackLoopDoctorEngine", () => {
  it("singleton instantiated", () => {
    expect(feedbackLoopDoctorEngine).toBeInstanceOf(FeedbackLoopDoctorEngine);
    expect(feedbackLoopDoctorEngine.name).toBe("FeedbackLoopDoctorEngine");
  });

  it("empty diagnose returns not-looping", () => {
    const e = new FeedbackLoopDoctorEngine();
    const v = e.diagnose();
    expect(v.looping).toBe(false);
    expect(v.severity).toBe("none");
    expect(v.recentEvents).toBe(0);
  });

  it("3 identical events → repeat pattern + warn", () => {
    const e = new FeedbackLoopDoctorEngine();
    for (let i = 0; i < 3; i++) e.record({ kind: "read", target: "a.ts", outcome: "ok" });
    const v = e.diagnose();
    expect(v.patterns.some((p) => p.startsWith("repeat:read:a.ts"))).toBe(true);
    expect(v.severity).toBe("warn");
  });

  it("3 consecutive errors → error_streak", () => {
    const e = new FeedbackLoopDoctorEngine();
    e.record({ kind: "test", target: "x", outcome: "ok" });
    e.record({ kind: "test", target: "x", outcome: "error", error: "E1" });
    e.record({ kind: "test", target: "x", outcome: "error", error: "E1" });
    e.record({ kind: "test", target: "x", outcome: "error", error: "E1" });
    const v = e.diagnose();
    expect(v.patterns.some((p) => p.startsWith("error_streak"))).toBe(true);
    expect(v.looping).toBe(true);
  });

  it("ping-pong between two targets detected", () => {
    const e = new FeedbackLoopDoctorEngine();
    e.record({ kind: "edit", target: "a.ts", outcome: "ok" });
    e.record({ kind: "edit", target: "b.ts", outcome: "ok" });
    e.record({ kind: "edit", target: "a.ts", outcome: "ok" });
    e.record({ kind: "edit", target: "b.ts", outcome: "ok" });
    const v = e.diagnose();
    expect(v.patterns.some((p) => p.startsWith("ping_pong"))).toBe(true);
  });

  it("diverging errors flagged separately from streak", () => {
    const e = new FeedbackLoopDoctorEngine();
    e.record({ kind: "build", target: "m", outcome: "error", error: "A" });
    e.record({ kind: "build", target: "m", outcome: "error", error: "B" });
    e.record({ kind: "build", target: "m", outcome: "error", error: "C" });
    e.record({ kind: "build", target: "m", outcome: "error", error: "D" });
    const v = e.diagnose();
    expect(v.patterns.some((p) => p.startsWith("diverging_errors"))).toBe(true);
  });

  it("two patterns → severity alarm", () => {
    const e = new FeedbackLoopDoctorEngine();
    for (let i = 0; i < 4; i++) e.record({ kind: "read", target: "a.ts", outcome: "error", error: `E${i}` });
    const v = e.diagnose();
    expect(v.severity).toBe("alarm");
  });

  it("window caps stored events", () => {
    const e = new FeedbackLoopDoctorEngine(5);
    for (let i = 0; i < 20; i++) e.record({ kind: "read", target: "x", outcome: "ok" });
    expect(e.size).toBe(5);
  });

  it("reset clears everything", () => {
    const e = new FeedbackLoopDoctorEngine();
    e.record({ kind: "read", target: "x", outcome: "ok" });
    e.reset();
    expect(e.size).toBe(0);
    expect(e.diagnose().looping).toBe(false);
  });

  it("break suggestion targets error_streak when present", () => {
    const e = new FeedbackLoopDoctorEngine();
    e.record({ kind: "test", target: "x", outcome: "error", error: "E" });
    e.record({ kind: "test", target: "x", outcome: "error", error: "E" });
    e.record({ kind: "test", target: "x", outcome: "error", error: "E" });
    const v = e.diagnose();
    expect(v.breakSuggestion.toLowerCase()).toContain("error");
  });

  it("FAIL: record missing kind throws", () => {
    const e = new FeedbackLoopDoctorEngine();
    expect(() => e.record({ target: "x", outcome: "ok" } as unknown as { kind: "read"; target: string; outcome: "ok" })).toThrow(/kind and target required/);
  });

  it("FAIL: record missing target throws", () => {
    const e = new FeedbackLoopDoctorEngine();
    expect(() => e.record({ kind: "read", outcome: "ok" } as unknown as { kind: "read"; target: string; outcome: "ok" })).toThrow(/kind and target required/);
  });

  it("FAIL: constructor with window < 2 throws", () => {
    expect(() => new FeedbackLoopDoctorEngine(1)).toThrow(/window must be finite/);
    expect(() => new FeedbackLoopDoctorEngine(Number.NaN)).toThrow(/window must be finite/);
  });

  it("ADV: single event does not trigger loop (below threshold)", () => {
    const e = new FeedbackLoopDoctorEngine();
    e.record({ kind: "read", target: "x", outcome: "error", error: "E" });
    expect(e.diagnose().looping).toBe(false);
  });

  it("ADV: varied activity produces no loop", () => {
    const e = new FeedbackLoopDoctorEngine();
    const kinds = ["read", "edit", "bash", "test"] as const;
    for (let i = 0; i < 6; i++) e.record({ kind: kinds[i % 4], target: `t${i}`, outcome: "ok" });
    expect(e.diagnose().looping).toBe(false);
  });
});
