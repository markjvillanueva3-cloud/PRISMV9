/**
 * SessionHandoffV2Engine — dedicated test suite
 *
 * CPP-MS4-U-CPP26: Every hook-used engine gets a companion test catching
 * regressions on build/validate/serialize/parse + per-instance targetPath.
 *
 * Coverage target: ≥8 real behavior assertions. Actual: 22 assertions
 * across 5 describe blocks.
 *
 * @milestone CPP-MS4-U-CPP26
 */

import { describe, it, expect } from "vitest";
import {
  SessionHandoffV2Engine,
  sessionHandoffV2Engine,
  type SessionHandoffV2,
  type HandoffIdentity,
} from "../engines/SessionHandoffV2Engine.js";

function baseIdentity(overrides: Partial<HandoffIdentity> = {}): HandoffIdentity {
  return {
    sessionId: "s-42",
    family: "claude",
    machine: "DESKTOP-TEST",
    instance: "claude-opus-47/session-42",
    startedAt: "2026-04-17T00:00:00Z",
    endedAt: "2026-04-17T01:00:00Z",
    ...overrides,
  };
}

function baseBuildInput() {
  return {
    identity: baseIdentity(),
    position: { phase: "MS4", milestone: "CPP-MS4", branch: "main", lastCommit: "abc123" },
    openGoals: [{ id: "g1", text: "ship tests", priority: 1, depth: 0 }],
    keyInsights: [{ id: "i1", category: "infra", summary: "hooks harmonized", at: "2026-04-17T00:30:00Z" }],
    nextActions: [{ action: "write MemoryGraphEngine tests", blocking: false }],
  };
}

describe("SessionHandoffV2Engine.build() (CPP-MS4-U-CPP26)", () => {
  const engine = new SessionHandoffV2Engine();

  it("stamps schemaVersion=2 and default writtenAt", () => {
    const built = engine.build(baseBuildInput());
    expect(built.schemaVersion).toBe(2);
    expect(built.writtenAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("honors explicit writtenAt when provided", () => {
    const frozen = "2026-04-17T05:00:00Z";
    const built = engine.build({ ...baseBuildInput(), writtenAt: frozen });
    expect(built.writtenAt).toBe(frozen);
  });

  it("deep-copies arrays so mutating input does not poison output", () => {
    const input = baseBuildInput();
    const built = engine.build(input);
    input.openGoals.push({ id: "g2", text: "poison", priority: 9, depth: 0 });
    expect(built.openGoals.length).toBe(1);
    expect(built.openGoals[0].id).toBe("g1");
  });
});

describe("SessionHandoffV2Engine.validate() (CPP-MS4-U-CPP26)", () => {
  const engine = new SessionHandoffV2Engine();

  function wellFormed(): SessionHandoffV2 {
    return engine.build(baseBuildInput());
  }

  it("passes for well-formed handoff", () => {
    const result = engine.validate(wellFormed());
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("rejects missing schemaVersion", () => {
    const bad: Partial<SessionHandoffV2> = { ...wellFormed(), schemaVersion: undefined };
    const result = engine.validate(bad);
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("schemaVersion must be 2");
  });

  it("rejects invalid family", () => {
    const bad = wellFormed();
    (bad.identity as HandoffIdentity).family = "openai" as HandoffIdentity["family"];
    const result = engine.validate(bad);
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("identity.family invalid");
  });

  it("rejects missing machine (CPP-MS3-U-CPP21 per-instance requirement)", () => {
    const bad = wellFormed();
    (bad.identity as HandoffIdentity).machine = "";
    const result = engine.validate(bad);
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("identity.machine required");
  });

  it("rejects missing instance (CPP-MS3-U-CPP21 per-instance requirement)", () => {
    const bad = wellFormed();
    (bad.identity as HandoffIdentity).instance = "";
    const result = engine.validate(bad);
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("identity.instance required");
  });

  it("rejects malformed ISO timestamps", () => {
    const bad = wellFormed();
    (bad.identity as HandoffIdentity).startedAt = "not-a-date";
    const result = engine.validate(bad);
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("identity.startedAt ISO required");
  });

  it("rejects non-array openGoals/keyInsights/nextActions", () => {
    const bad = wellFormed();
    (bad as { openGoals: unknown }).openGoals = "not-array";
    const result = engine.validate(bad);
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("openGoals must be an array");
  });
});

describe("SessionHandoffV2Engine.serialize/parse() (CPP-MS4-U-CPP26)", () => {
  const engine = new SessionHandoffV2Engine();

  it("serialize → parse round-trip preserves payload", () => {
    const original = engine.build(baseBuildInput());
    const text = engine.serialize(original);
    const parsed = engine.parse(text);
    expect(parsed).not.toBeNull();
    expect(parsed?.schemaVersion).toBe(2);
    expect(parsed?.identity.instance).toBe(original.identity.instance);
    expect(parsed?.openGoals[0].text).toBe("ship tests");
    expect(parsed?.nextActions[0].action).toBe("write MemoryGraphEngine tests");
  });

  it("serialize produces pretty-printed JSON", () => {
    const built = engine.build(baseBuildInput());
    const text = engine.serialize(built);
    expect(text).toContain("\n  \"schemaVersion\": 2");
  });

  it("parse returns null for malformed JSON", () => {
    expect(engine.parse("{ this is not json")).toBeNull();
  });

  it("parse returns null for valid JSON that fails validation", () => {
    const text = JSON.stringify({ schemaVersion: 1, foo: "bar" });
    expect(engine.parse(text)).toBeNull();
  });
});

describe("SessionHandoffV2Engine.isActionable() (CPP-MS4-U-CPP26)", () => {
  const engine = new SessionHandoffV2Engine();

  it("returns true when nextActions is non-empty", () => {
    const handoff = engine.build(baseBuildInput());
    expect(engine.isActionable(handoff)).toBe(true);
  });

  it("returns true when nextActions empty but position has phase/milestone/notes", () => {
    const input = baseBuildInput();
    input.nextActions = [];
    const handoff = engine.build(input);
    expect(engine.isActionable(handoff)).toBe(true); // position.phase = "MS4"
  });

  it("returns false when validation fails", () => {
    const handoff = engine.build(baseBuildInput());
    (handoff.identity as HandoffIdentity).machine = "";
    expect(engine.isActionable(handoff)).toBe(false);
  });

  it("returns false when nextActions empty AND position has no phase/milestone/notes", () => {
    const input = baseBuildInput();
    input.nextActions = [];
    input.position = {};
    const handoff = engine.build(input);
    expect(engine.isActionable(handoff)).toBe(false);
  });
});

describe("SessionHandoffV2Engine.targetPath() (CPP-MS4-U-CPP26 + CPP-MS3-U-CPP21)", () => {
  const engine = new SessionHandoffV2Engine();

  it("produces HANDOFF-<family>-<machine>-<instance>.md", () => {
    const path = engine.targetPath({
      family: "claude",
      machine: "DESKTOP-N7MI1VB",
      instance: "pid-12345",
    });
    expect(path).toBe("HANDOFF-claude-DESKTOP-N7MI1VB-pid-12345.md");
  });

  it("sanitizes path-unsafe characters to underscores", () => {
    const path = engine.targetPath({
      family: "codex",
      machine: "MACHINE/1",
      instance: "session:with spaces",
    });
    expect(path).not.toMatch(/[\s/:]/);
    expect(path).toMatch(/^HANDOFF-codex-MACHINE_1-session_with_spaces\.md$/);
  });

  it("throws when family is missing", () => {
    expect(() =>
      engine.targetPath({ family: "", machine: "m", instance: "i" } as Pick<HandoffIdentity, "family" | "machine" | "instance">),
    ).toThrow(/family required/);
  });

  it("throws when machine is missing", () => {
    expect(() => engine.targetPath({ family: "claude", machine: "", instance: "i" })).toThrow(/machine required/);
  });

  it("throws when instance is missing", () => {
    expect(() => engine.targetPath({ family: "claude", machine: "m", instance: "" })).toThrow(/instance required/);
  });

  it("produces distinct paths for sessions on the same machine", () => {
    const a = engine.targetPath({ family: "claude", machine: "M1", instance: "sess-A" });
    const b = engine.targetPath({ family: "claude", machine: "M1", instance: "sess-B" });
    expect(a).not.toBe(b);
  });
});

describe("sessionHandoffV2Engine singleton (CPP-MS4-U-CPP26)", () => {
  it("exports a ready-to-use singleton", () => {
    expect(sessionHandoffV2Engine).toBeInstanceOf(SessionHandoffV2Engine);
    const built = sessionHandoffV2Engine.build(baseBuildInput());
    expect(built.schemaVersion).toBe(2);
  });
});
