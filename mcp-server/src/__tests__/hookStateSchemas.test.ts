/**
 * hookStateSchemas — Zod boundary-validation tests (CPP-MS4-U-CPP32)
 *
 * Verifies each schema accepts a valid minimal example + rejects malformed
 * input with a structured error (not an exception). These schemas are the
 * fail-loud boundary between hook writers and compact-restore.mjs readers.
 *
 * @milestone CPP-MS4-U-CPP32
 */

import { describe, it, expect } from "vitest";
import {
  safeParseSessionArtifacts,
  safeParsePostCompactLog,
  safeParseHandoffMetadata,
  safeParseCompactionSurvivalMetadata,
  safeParseJsonWith,
  SessionArtifactsSchema,
  PostCompactLogSchema,
} from "../schemas/hookStateSchemas.js";

describe("safeParseSessionArtifacts() (CPP-MS4-U-CPP32)", () => {
  const valid = {
    schemaVersion: "1.0.0",
    event: "seed",
    timestamp: "2026-04-17T00:15:00Z",
    system_counts: { engines: 0, dispatchers: 0, tests: 0 },
    recent_additions: {
      new_engines: [], new_hooks: [], new_skills: [], new_dispatchers: [],
    },
    feature_cascade: {
      engines_available: 0, dispatchers_available: 0, note: "seeded",
    },
  };

  it("accepts a valid seed event", () => {
    const result = safeParseSessionArtifacts(valid);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.event).toBe("seed");
      expect(result.data.system_counts.engines).toBe(0);
    }
  });

  it("rejects missing schemaVersion", () => {
    const { schemaVersion: _omit, ...rest } = valid;
    const result = safeParseSessionArtifacts(rest);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/schemaVersion/);
  });

  it("rejects invalid event enum", () => {
    const result = safeParseSessionArtifacts({ ...valid, event: "invalid-event" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/event/);
  });

  it("rejects non-semver schemaVersion", () => {
    const result = safeParseSessionArtifacts({ ...valid, schemaVersion: "1" });
    expect(result.ok).toBe(false);
  });

  it("tolerates extra top-level fields (passthrough)", () => {
    const result = safeParseSessionArtifacts({ ...valid, extra_field: "ok" });
    expect(result.ok).toBe(true);
  });
});

describe("safeParsePostCompactLog() (CPP-MS4-U-CPP32)", () => {
  it("accepts empty events array", () => {
    const result = safeParsePostCompactLog({ schemaVersion: "1.0.0", events: [] });
    expect(result.ok).toBe(true);
  });

  it("accepts valid event with optional fields", () => {
    const result = safeParsePostCompactLog({
      schemaVersion: "1.0.0",
      events: [{
        timestamp: "2026-04-17T01:00:00Z",
        session_id: "sess-1",
        family: "claude",
        machine: "DESKTOP-N7MI1VB",
        instance: "pid-123",
        pressure_pct: 42,
        survival_bytes: 1024,
      }],
    });
    expect(result.ok).toBe(true);
  });

  it("rejects events that are not an array", () => {
    const result = safeParsePostCompactLog({ schemaVersion: "1.0.0", events: "not-array" });
    expect(result.ok).toBe(false);
  });

  it("rejects out-of-range pressure_pct", () => {
    const result = safeParsePostCompactLog({
      schemaVersion: "1.0.0",
      events: [{ timestamp: "2026-04-17T00:00:00Z", pressure_pct: 150 }],
    });
    expect(result.ok).toBe(false);
  });

  it("rejects invalid family enum", () => {
    const result = safeParsePostCompactLog({
      schemaVersion: "1.0.0",
      events: [{ timestamp: "2026-04-17T00:00:00Z", family: "gpt4" }],
    });
    expect(result.ok).toBe(false);
  });
});

describe("safeParseHandoffMetadata() (CPP-MS4-U-CPP32)", () => {
  it("accepts minimal handoff with only title", () => {
    const result = safeParseHandoffMetadata({ title: "HANDOFF: claude-auto-1" });
    expect(result.ok).toBe(true);
  });

  it("accepts handoff with all optional fields populated", () => {
    const result = safeParseHandoffMetadata({
      title: "HANDOFF: claude-auto-1",
      updated_at: "2026-04-17T01:07:00Z",
      family: "claude",
      machine: "DESKTOP-N7MI1VB",
      session: "auto-1",
      state: "pre-compact",
      resume: "Phase CPP-MS4",
      context: "hook ran OK",
    });
    expect(result.ok).toBe(true);
  });

  it("rejects empty title", () => {
    const result = safeParseHandoffMetadata({ title: "" });
    expect(result.ok).toBe(false);
  });

  it("rejects invalid family enum", () => {
    const result = safeParseHandoffMetadata({ title: "HANDOFF", family: "unknown" });
    expect(result.ok).toBe(false);
  });
});

describe("safeParseCompactionSurvivalMetadata() (CPP-MS4-U-CPP32)", () => {
  it("accepts minimal survival with generated timestamp", () => {
    const result = safeParseCompactionSurvivalMetadata({ generated: "2026-04-17T00:00:00Z" });
    expect(result.ok).toBe(true);
  });

  it("rejects malformed timestamp", () => {
    const result = safeParseCompactionSurvivalMetadata({ generated: "not-a-date" });
    expect(result.ok).toBe(false);
  });

  it("tolerates extra fields (passthrough)", () => {
    const result = safeParseCompactionSurvivalMetadata({
      generated: "2026-04-17T00:00:00Z",
      custom_block: "hello",
    });
    expect(result.ok).toBe(true);
  });
});

describe("safeParseJsonWith() (CPP-MS4-U-CPP32)", () => {
  it("reports malformed JSON distinctly from schema errors", () => {
    const result = safeParseJsonWith("{ not: valid", safeParseSessionArtifacts);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/malformed JSON/);
  });

  it("chains JSON parse + schema parse on valid input", () => {
    const text = JSON.stringify({
      schemaVersion: "1.0.0",
      event: "seed",
      timestamp: "2026-04-17T00:00:00Z",
      system_counts: { engines: 1, dispatchers: 1, tests: 1 },
      recent_additions: { new_engines: [], new_hooks: [], new_skills: [], new_dispatchers: [] },
    });
    const result = safeParseJsonWith(text, safeParseSessionArtifacts);
    expect(result.ok).toBe(true);
  });

  it("surfaces Zod errors when JSON parses but schema fails", () => {
    const text = JSON.stringify({ schemaVersion: "not-semver" });
    const result = safeParseJsonWith(text, safeParseSessionArtifacts);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).not.toMatch(/malformed JSON/);
  });
});

describe("raw schema exports (CPP-MS4-U-CPP32)", () => {
  it("SessionArtifactsSchema + PostCompactLogSchema are exported for consumers", () => {
    expect(SessionArtifactsSchema).toBeDefined();
    expect(PostCompactLogSchema).toBeDefined();
    expect(typeof SessionArtifactsSchema.safeParse).toBe("function");
    expect(typeof PostCompactLogSchema.safeParse).toBe("function");
  });
});
