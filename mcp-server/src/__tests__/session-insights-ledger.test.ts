/**
 * Tests for SessionInsightsLedgerEngine + SessionHandoffV2Engine (Phase 0.13 U-SAW7)
 */

import { describe, it, expect } from "vitest";
import { SessionInsightsLedgerEngine, type InsightEntry } from "../engines/SessionInsightsLedgerEngine.js";
import { SessionHandoffV2Engine, sessionHandoffV2Engine, type SessionHandoffV2 } from "../engines/SessionHandoffV2Engine.js";

describe("SessionInsightsLedgerEngine", () => {
  describe("validate()", () => {
    const engine = new SessionInsightsLedgerEngine();

    const valid: InsightEntry = {
      schemaVersion: 1,
      id: "ins-1",
      sessionId: "s1",
      at: "2026-04-16T00:00:00.000Z",
      category: "goal-completed",
      summary: "shipped feature",
    };

    it("accepts a valid entry", () => {
      expect(engine.validate(valid).ok).toBe(true);
    });

    it("rejects wrong schemaVersion", () => {
      const r = engine.validate({ ...valid, schemaVersion: 2 as 1 });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.errors.join(" ")).toMatch(/schemaVersion/);
    });

    it("rejects missing id / sessionId / summary", () => {
      expect(engine.validate({ ...valid, id: "" }).ok).toBe(false);
      expect(engine.validate({ ...valid, sessionId: "" }).ok).toBe(false);
      expect(engine.validate({ ...valid, summary: "  " }).ok).toBe(false);
    });

    it("rejects non-ISO at", () => {
      expect(engine.validate({ ...valid, at: "yesterday" }).ok).toBe(false);
    });

    it("rejects unknown category", () => {
      expect(engine.validate({ ...valid, category: "bogus" as "other" }).ok).toBe(false);
    });

    it("rejects out-of-range confidence", () => {
      expect(engine.validate({ ...valid, confidence: -0.1 }).ok).toBe(false);
      expect(engine.validate({ ...valid, confidence: 1.1 }).ok).toBe(false);
    });

    it("accepts optional fields when present and valid", () => {
      expect(engine.validate({ ...valid, detail: "x", confidence: 0.5, relatedGoalIds: ["g1"] }).ok).toBe(true);
    });

    it("rejects non-array relatedGoalIds", () => {
      expect(engine.validate({ ...valid, relatedGoalIds: "g1" as unknown as string[] }).ok).toBe(false);
    });
  });

  describe("buildEntry()", () => {
    const engine = new SessionInsightsLedgerEngine();

    it("assigns sequential ids when none provided", () => {
      const a = engine.buildEntry({ sessionId: "s", category: "other", summary: "x" });
      const b = engine.buildEntry({ sessionId: "s", category: "other", summary: "y" });
      expect(a.id).toBe("ins-1");
      expect(b.id).toBe("ins-2");
    });

    it("uses provided id when supplied", () => {
      const e = engine.buildEntry({ sessionId: "s", category: "other", summary: "x", id: "custom" });
      expect(e.id).toBe("custom");
    });

    it("stamps a valid ISO timestamp", () => {
      const e = engine.buildEntry({ sessionId: "s", category: "other", summary: "x" });
      expect(e.at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it("passes validation", () => {
      const e = engine.buildEntry({ sessionId: "s", category: "other", summary: "x" });
      expect(engine.validate(e).ok).toBe(true);
    });
  });

  describe("serialize / parse round-trip", () => {
    const engine = new SessionInsightsLedgerEngine();

    it("round-trips a valid entry", () => {
      const e = engine.buildEntry({ sessionId: "s", category: "goal-completed", summary: "x" });
      const line = engine.serialize(e);
      expect(engine.parse(line)).toEqual(e);
    });

    it("parse returns null on malformed JSON", () => {
      expect(engine.parse("not json")).toBeNull();
    });

    it("parse returns null when validation fails", () => {
      expect(engine.parse(JSON.stringify({ schemaVersion: 99 }))).toBeNull();
    });
  });

  describe("append() / record()", () => {
    it("append writes a newline-terminated line via the writer", async () => {
      const out: string[] = [];
      const engine = new SessionInsightsLedgerEngine((line) => void out.push(line));
      const e = engine.buildEntry({ sessionId: "s", category: "other", summary: "x" });
      const r = await engine.append(e);
      expect(r.ok).toBe(true);
      expect(out).toHaveLength(1);
      expect(out[0].endsWith("\n")).toBe(true);
      expect(JSON.parse(out[0].trimEnd())).toEqual(e);
    });

    it("append fails cleanly when no writer is configured", async () => {
      const engine = new SessionInsightsLedgerEngine();
      const e = engine.buildEntry({ sessionId: "s", category: "other", summary: "x" });
      const r = await engine.append(e);
      expect(r.ok).toBe(false);
      expect(r.errors).toEqual(["no writer configured"]);
    });

    it("append fails on invalid entry without calling the writer", async () => {
      let called = false;
      const engine = new SessionInsightsLedgerEngine(() => {
        called = true;
      });
      const bad = { schemaVersion: 1, id: "", sessionId: "s", at: "x", category: "other", summary: "" } as InsightEntry;
      const r = await engine.append(bad);
      expect(r.ok).toBe(false);
      expect(called).toBe(false);
    });

    it("record builds + appends + validates in one call", async () => {
      const out: string[] = [];
      const engine = new SessionInsightsLedgerEngine((line) => void out.push(line));
      const r = await engine.record({ sessionId: "s", category: "pattern-learned", summary: "y" });
      expect(r.ok).toBe(true);
      expect(r.entry?.category).toBe("pattern-learned");
      expect(out).toHaveLength(1);
    });

    it("supports async writers", async () => {
      const out: string[] = [];
      const engine = new SessionInsightsLedgerEngine(async (line) => {
        await new Promise((r) => setTimeout(r, 1));
        out.push(line);
      });
      await engine.record({ sessionId: "s", category: "other", summary: "z" });
      expect(out).toHaveLength(1);
    });
  });
});

describe("SessionHandoffV2Engine", () => {
  const engine = new SessionHandoffV2Engine();

  const base: SessionHandoffV2 = {
    schemaVersion: 2,
    identity: {
      sessionId: "s1",
      family: "claude",
      machine: "DESKTOP-TEST",
      instance: "claude-opus-47/session-42",
      startedAt: "2026-04-16T00:00:00.000Z",
      endedAt: "2026-04-16T01:00:00.000Z",
    },
    position: { phase: "0.13", milestone: "U-SAW7" },
    openGoals: [],
    keyInsights: [],
    nextActions: [],
    writtenAt: "2026-04-16T01:00:00.000Z",
  };

  describe("build()", () => {
    it("sets schemaVersion=2 and stamps writtenAt", () => {
      const h = engine.build({ ...base, writtenAt: undefined as unknown as string });
      expect(h.schemaVersion).toBe(2);
      expect(h.writtenAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it("copies arrays so mutating the source does not leak in", () => {
      const src = { ...base, openGoals: [{ id: "g1", text: "t", priority: 1, depth: 0 }] };
      const h = engine.build(src);
      src.openGoals.push({ id: "g2", text: "u", priority: 0, depth: 0 });
      expect(h.openGoals).toHaveLength(1);
    });
  });

  describe("validate()", () => {
    it("accepts a well-formed handoff", () => {
      expect(engine.validate(base).ok).toBe(true);
    });

    it("rejects wrong schemaVersion", () => {
      expect(engine.validate({ ...base, schemaVersion: 1 as unknown as 2 }).ok).toBe(false);
    });

    it("rejects missing identity fields", () => {
      const r = engine.validate({ ...base, identity: { ...base.identity, sessionId: "" } });
      expect(r.ok).toBe(false);
    });

    it("rejects bad family value", () => {
      const r = engine.validate({
        ...base,
        identity: { ...base.identity, family: "monkey" as "claude" },
      });
      expect(r.ok).toBe(false);
    });

    it("rejects missing identity.machine (CPP-MS3-U-CPP21)", () => {
      const r = engine.validate({
        ...base,
        identity: { ...base.identity, machine: "" },
      });
      expect(r.ok).toBe(false);
      expect(r.errors).toContain("identity.machine required");
    });

    it("rejects missing identity.instance (CPP-MS3-U-CPP21)", () => {
      const r = engine.validate({
        ...base,
        identity: { ...base.identity, instance: "" },
      });
      expect(r.ok).toBe(false);
      expect(r.errors).toContain("identity.instance required");
    });

    it("rejects non-array collections", () => {
      expect(engine.validate({ ...base, openGoals: "no" as unknown as [] }).ok).toBe(false);
      expect(engine.validate({ ...base, keyInsights: "no" as unknown as [] }).ok).toBe(false);
      expect(engine.validate({ ...base, nextActions: "no" as unknown as [] }).ok).toBe(false);
    });

    it("rejects non-ISO writtenAt", () => {
      expect(engine.validate({ ...base, writtenAt: "now" }).ok).toBe(false);
    });
  });

  describe("serialize / parse round-trip", () => {
    it("round-trips a valid handoff", () => {
      const text = engine.serialize(base);
      expect(engine.parse(text)).toEqual(base);
    });

    it("parse returns null on bad JSON", () => {
      expect(engine.parse("{{{")).toBeNull();
    });

    it("parse returns null when validation fails", () => {
      expect(engine.parse(JSON.stringify({ schemaVersion: 1 }))).toBeNull();
    });
  });

  describe("isActionable()", () => {
    it("false on empty position + empty nextActions", () => {
      const empty = engine.build({ ...base, position: {} });
      expect(engine.isActionable(empty)).toBe(false);
    });

    it("true when nextActions has entries", () => {
      const h = engine.build({
        ...base,
        position: {},
        nextActions: [{ action: "run tests" }],
      });
      expect(engine.isActionable(h)).toBe(true);
    });

    it("true when position has a phase or milestone or notes", () => {
      expect(engine.isActionable(engine.build({ ...base, position: { phase: "0.13" } }))).toBe(true);
      expect(engine.isActionable(engine.build({ ...base, position: { milestone: "X" } }))).toBe(true);
      expect(engine.isActionable(engine.build({ ...base, position: { notes: "anything" } }))).toBe(true);
    });

    it("false on an invalid handoff even if it looks actionable", () => {
      const bad = { ...base, schemaVersion: 99 as 2 };
      expect(engine.isActionable(bad)).toBe(false);
    });
  });

  describe("targetPath() (CPP-MS3-U-CPP21)", () => {
    it("computes HANDOFF-<family>-<machine>-<instance>.md", () => {
      const p = engine.targetPath({
        family: "claude",
        machine: "DESKTOP-N7MI1VB",
        instance: "opus47-session42",
      });
      expect(p).toBe("HANDOFF-claude-DESKTOP-N7MI1VB-opus47-session42.md");
    });

    it("sanitizes filesystem-unfriendly characters with underscores", () => {
      const p = engine.targetPath({
        family: "claude",
        machine: "host/with spaces",
        instance: "pid*123?foo",
      });
      expect(p).toBe("HANDOFF-claude-host_with_spaces-pid_123_foo.md");
    });

    it("preserves @ and - in identity (used by agent-instance keys)", () => {
      const p = engine.targetPath({
        family: "codex",
        machine: "host-1",
        instance: "agent@term-1",
      });
      expect(p).toBe("HANDOFF-codex-host-1-agent@term-1.md");
    });

    it("throws on missing family/machine/instance", () => {
      expect(() =>
        engine.targetPath({ family: "" as "claude", machine: "m", instance: "i" }),
      ).toThrow(/family required/);
      expect(() =>
        engine.targetPath({ family: "claude", machine: "", instance: "i" }),
      ).toThrow(/machine required/);
      expect(() =>
        engine.targetPath({ family: "claude", machine: "m", instance: "" }),
      ).toThrow(/instance required/);
    });

    it("produces distinct paths for distinct instances on same machine", () => {
      const a = engine.targetPath({ family: "claude", machine: "m1", instance: "s1" });
      const b = engine.targetPath({ family: "claude", machine: "m1", instance: "s2" });
      expect(a).not.toBe(b);
    });
  });

  it("exposes a module singleton", () => {
    expect(sessionHandoffV2Engine).toBeInstanceOf(SessionHandoffV2Engine);
  });
});
