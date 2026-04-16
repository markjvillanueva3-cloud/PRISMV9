/**
 * Tests for SelfModel / UserModel / WorldModel engines (Phase 0.13 U-SAW4)
 */

import { describe, it, expect } from "vitest";
import { SelfModelEngine } from "../engines/SelfModelEngine.js";
import { UserModelEngine } from "../engines/UserModelEngine.js";
import { WorldModelEngine, worldModelEngine } from "../engines/WorldModelEngine.js";

describe("SelfModelEngine", () => {
  it("requires a non-empty sessionId", () => {
    expect(() => new SelfModelEngine("")).toThrow();
    expect(() => new SelfModelEngine("  ")).toThrow();
  });

  it("declares a capability once and is idempotent on repeat declaration", () => {
    const e = new SelfModelEngine("s1");
    const a = e.declareCapability("speed_feed", 0.6);
    const b = e.declareCapability("speed_feed", 0.2);
    expect(a).toBe(b);
    expect(e.getCapability("speed_feed")?.confidence).toBe(0.6);
  });

  it("rejects out-of-range initial confidence", () => {
    const e = new SelfModelEngine("s1");
    expect(() => e.declareCapability("x", -0.1)).toThrow();
    expect(() => e.declareCapability("x", 1.1)).toThrow();
  });

  it("recordAction bumps useCount and confidence for matching capability", () => {
    const e = new SelfModelEngine("s1");
    e.declareCapability("kienzle", 0.5);
    e.recordAction("kienzle", "success");
    e.recordAction("kienzle", "success");
    const cap = e.getCapability("kienzle")!;
    expect(cap.useCount).toBe(2);
    expect(cap.confidence).toBeGreaterThan(0.5);
  });

  it("recordAction decreases confidence on failure and blocked", () => {
    const e = new SelfModelEngine("s1");
    e.declareCapability("taylor", 0.9);
    e.recordAction("taylor", "failure");
    expect(e.getCapability("taylor")!.confidence).toBeLessThan(0.9);
    e.recordAction("taylor", "blocked");
    expect(e.getCapability("taylor")!.confidence).toBeLessThan(0.85);
  });

  it("clamps confidence to [0, 1]", () => {
    const e = new SelfModelEngine("s1");
    e.declareCapability("x", 1.0);
    for (let i = 0; i < 20; i++) e.recordAction("x", "success");
    expect(e.getCapability("x")!.confidence).toBe(1);
    e.declareCapability("y", 0);
    for (let i = 0; i < 20; i++) e.recordAction("y", "failure");
    expect(e.getCapability("y")!.confidence).toBe(0);
  });

  it("getRecentActions returns at most limit entries in insertion order", () => {
    const e = new SelfModelEngine("s1");
    for (let i = 0; i < 15; i++) e.recordAction(`a${i}`, "success");
    const recent = e.getRecentActions(5);
    expect(recent).toHaveLength(5);
    expect(recent[0].action).toBe("a10");
    expect(recent[4].action).toBe("a14");
  });

  it("caps the internal action log at 50 entries", () => {
    const e = new SelfModelEngine("s1");
    for (let i = 0; i < 75; i++) e.recordAction(`a${i}`, "success");
    expect(e.getRecentActions(100)).toHaveLength(50);
  });

  it("overallConfidence averages across declared capabilities", () => {
    const e = new SelfModelEngine("s1");
    e.declareCapability("a", 0.8);
    e.declareCapability("b", 0.2);
    expect(e.overallConfidence()).toBeCloseTo(0.5, 4);
  });

  it("overallConfidence is 0 with no capabilities", () => {
    const e = new SelfModelEngine("s1");
    expect(e.overallConfidence()).toBe(0);
  });

  it("JSON round-trip preserves capabilities and action log", () => {
    const e = new SelfModelEngine("s1");
    e.declareCapability("cap-x", 0.7);
    e.recordAction("cap-x", "success");
    const restored = SelfModelEngine.fromJSON(e.toJSON());
    expect(restored.getCapability("cap-x")?.useCount).toBe(1);
    expect(restored.getRecentActions(5)).toHaveLength(1);
  });

  it("fromJSON rejects unknown schemaVersion", () => {
    const data = { ...new SelfModelEngine("s").snapshot(), schemaVersion: 2 as 1 };
    expect(() => SelfModelEngine.fromJSON(data)).toThrow(/schemaVersion/);
  });
});

describe("UserModelEngine", () => {
  it("requires a non-empty userId", () => {
    expect(() => new UserModelEngine("")).toThrow();
  });

  it("setPreference stores and retrieves values", () => {
    const e = new UserModelEngine("u1");
    e.setPreference("tone", "concise");
    expect(e.getPreference("tone")?.value).toBe("concise");
  });

  it("setPreference overwrites existing entries", () => {
    const e = new UserModelEngine("u1");
    e.setPreference("tone", "concise");
    e.setPreference("tone", "verbose");
    expect(e.getPreference("tone")?.value).toBe("verbose");
  });

  it("rejects out-of-range confidence in setPreference", () => {
    const e = new UserModelEngine("u1");
    expect(() => e.setPreference("k", "v", undefined, 1.5)).toThrow();
  });

  it("observeTopic grows confidence with repeat observations", () => {
    const e = new UserModelEngine("u1");
    e.observeTopic("kienzle");
    const t = e.observeTopic("kienzle");
    expect(t.observationCount).toBe(2);
    expect(t.confidence).toBeGreaterThan(0.25);
  });

  it("knowsTopic honors confidence threshold", () => {
    const e = new UserModelEngine("u1");
    e.observeTopic("x"); // confidence 0.25
    expect(e.knowsTopic("x", 0.5)).toBe(false);
    for (let i = 0; i < 10; i++) e.observeTopic("x");
    expect(e.knowsTopic("x", 0.5)).toBe(true);
  });

  it("listTopics is sorted by confidence descending", () => {
    const e = new UserModelEngine("u1");
    e.observeTopic("low");
    e.observeTopic("high");
    for (let i = 0; i < 5; i++) e.observeTopic("high");
    expect(e.listTopics()[0].topic).toBe("high");
  });

  it("raiseQuestion assigns sequential ids and tracks open state", () => {
    const e = new UserModelEngine("u1");
    const q1 = e.raiseQuestion("what material?");
    const q2 = e.raiseQuestion("what tolerance?");
    expect(q1.id).toBe("q1");
    expect(q2.id).toBe("q2");
    expect(e.listOpenQuestions()).toHaveLength(2);
  });

  it("resolveQuestion flips status and stamps resolvedAt", () => {
    const e = new UserModelEngine("u1");
    const q = e.raiseQuestion("what?");
    e.resolveQuestion(q.id, "answered", "2026-04-16T00:00:00.000Z");
    expect(e.listOpenQuestions()).toHaveLength(0);
    expect(e.listAllQuestions()[0].status).toBe("answered");
    expect(e.listAllQuestions()[0].resolvedAt).toBe("2026-04-16T00:00:00.000Z");
  });

  it("resolveQuestion returns null for unknown id and is idempotent on non-open", () => {
    const e = new UserModelEngine("u1");
    expect(e.resolveQuestion("qZ", "answered")).toBeNull();
    const q = e.raiseQuestion("q");
    e.resolveQuestion(q.id, "answered");
    const again = e.resolveQuestion(q.id, "dropped");
    expect(again?.status).toBe("answered");
  });

  it("JSON round-trip preserves preferences, topics, and question counter", () => {
    const e = new UserModelEngine("u1");
    e.setPreference("tone", "concise");
    e.observeTopic("x");
    e.raiseQuestion("q?");
    const restored = UserModelEngine.fromJSON(e.toJSON());
    expect(restored.getPreference("tone")?.value).toBe("concise");
    expect(restored.listTopics()[0].topic).toBe("x");
    const next = restored.raiseQuestion("another?");
    expect(next.id).toBe("q2");
  });
});

describe("WorldModelEngine", () => {
  it("setCount stores and getCount retrieves", () => {
    const e = new WorldModelEngine();
    e.setCount("engine", 1770);
    expect(e.getCount("engine")).toBe(1770);
  });

  it("setCount rejects negative or non-finite values", () => {
    const e = new WorldModelEngine();
    expect(() => e.setCount("engine", -1)).toThrow();
    expect(() => e.setCount("engine", Infinity)).toThrow();
    expect(() => e.setCount("engine", NaN)).toThrow();
  });

  it("setCount floors non-integers", () => {
    const e = new WorldModelEngine();
    e.setCount("engine", 1770.9);
    expect(e.getCount("engine")).toBe(1770);
  });

  it("getCount returns 0 for never-set categories", () => {
    expect(new WorldModelEngine().getCount("hook")).toBe(0);
  });

  it("recordQuery tracks recent queries with MRU bound", () => {
    const e = new WorldModelEngine();
    for (let i = 0; i < 30; i++) e.recordQuery("engine", `term-${i}`, 1);
    expect(e.recentQueries(100)).toHaveLength(25);
  });

  it("topQueriedTerms counts frequency across the MRU", () => {
    const e = new WorldModelEngine();
    e.recordQuery("engine", "kienzle", 3);
    e.recordQuery("engine", "kienzle", 4);
    e.recordQuery("engine", "taylor", 1);
    const top = e.topQueriedTerms(5);
    expect(top[0]).toEqual({ term: "kienzle", queryCount: 2 });
    expect(top[1]).toEqual({ term: "taylor", queryCount: 1 });
  });

  it("topQueriedTerms respects the limit", () => {
    const e = new WorldModelEngine();
    e.recordQuery("engine", "a", 1);
    e.recordQuery("engine", "b", 1);
    e.recordQuery("engine", "c", 1);
    expect(e.topQueriedTerms(2)).toHaveLength(2);
    expect(e.topQueriedTerms(0)).toEqual([]);
  });

  it("recentQueries returns [] for non-positive limit", () => {
    const e = new WorldModelEngine();
    e.recordQuery("engine", "x", 1);
    expect(e.recentQueries(0)).toEqual([]);
    expect(e.recentQueries(-5)).toEqual([]);
  });

  it("rejects unknown categories", () => {
    const e = new WorldModelEngine();
    expect(() => e.setCount("nope" as "engine", 5)).toThrow();
    expect(() => e.recordQuery("nope" as "engine", "x", 1)).toThrow();
  });

  it("JSON round-trip preserves counts and recent queries", () => {
    const e = new WorldModelEngine();
    e.setCount("engine", 10);
    e.recordQuery("engine", "x", 5);
    const restored = WorldModelEngine.fromJSON(e.toJSON());
    expect(restored.getCount("engine")).toBe(10);
    expect(restored.recentQueries(5)).toHaveLength(1);
  });

  it("exports a module singleton", () => {
    expect(worldModelEngine).toBeInstanceOf(WorldModelEngine);
  });
});
