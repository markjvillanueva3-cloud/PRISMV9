/**
 * Tests for RoadmapLoader — Modular milestone loading service
 * Tests: schema validation, index parsing, resolve helpers, cache control
 */
import { describe, it, expect } from "vitest";
import {
  MilestoneStatus,
  MilestoneEntry,
  RoadmapIndex,
  parseRoadmapIndex,
  validateRoadmapIndex,
  createEmptyUnit,
  createEmptyPhase,
  type RoadmapEnvelope,
} from "../schemas/roadmapSchema.js";

// ── Test Fixtures ────────────────────────────────────────────────────

function makeMilestoneEntry(
  id: string,
  overrides: Partial<Record<string, unknown>> = {},
): Record<string, unknown> {
  return {
    id,
    title: `Milestone ${id}`,
    track: "S1",
    dependencies: [],
    status: "not_started",
    total_units: 5,
    completed_units: 0,
    sessions: "1",
    envelope_path: `milestones/${id}.json`,
    position_path: `state/${id}/position.json`,
    ...overrides,
  };
}

function makeIndex(
  milestones: Record<string, unknown>[] = [],
  overrides: Partial<Record<string, unknown>> = {},
): Record<string, unknown> {
  return {
    version: "1.0.0",
    title: "Test Roadmap",
    updated_at: new Date().toISOString(),
    milestones,
    total_milestones: milestones.length,
    completed_milestones: 0,
    ...overrides,
  };
}

// ── MilestoneStatus Schema ──────────────────────────────────────────

describe("MilestoneStatus", () => {
  it("accepts valid statuses", () => {
    expect(MilestoneStatus.parse("not_started")).toBe("not_started");
    expect(MilestoneStatus.parse("in_progress")).toBe("in_progress");
    expect(MilestoneStatus.parse("complete")).toBe("complete");
  });

  it("rejects invalid status", () => {
    expect(() => MilestoneStatus.parse("done")).toThrow();
    expect(() => MilestoneStatus.parse("")).toThrow();
  });
});

// ── MilestoneEntry Schema ───────────────────────────────────────────

describe("MilestoneEntry", () => {
  it("parses a valid entry", () => {
    const raw = makeMilestoneEntry("S1-MS1");
    const entry = MilestoneEntry.parse(raw);
    expect(entry.id).toBe("S1-MS1");
    expect(entry.total_units).toBe(5);
    expect(entry.status).toBe("not_started");
    expect(entry.envelope_path).toBe("milestones/S1-MS1.json");
  });

  it("applies defaults for optional fields", () => {
    const raw = {
      id: "S1-MS2",
      title: "Test",
      track: "S1",
      total_units: 3,
      envelope_path: "milestones/S1-MS2.json",
      position_path: "state/S1-MS2/position.json",
    };
    const entry = MilestoneEntry.parse(raw);
    expect(entry.dependencies).toEqual([]);
    expect(entry.status).toBe("not_started");
    expect(entry.completed_units).toBe(0);
    expect(entry.sessions).toBe("1");
  });

  it("rejects entry with missing required fields", () => {
    expect(() => MilestoneEntry.parse({ id: "X" })).toThrow();
    expect(() => MilestoneEntry.parse({})).toThrow();
  });

  it("rejects entry with empty id", () => {
    const raw = makeMilestoneEntry("");
    expect(() => MilestoneEntry.parse(raw)).toThrow();
  });
});

// ── RoadmapIndex Schema ─────────────────────────────────────────────

describe("RoadmapIndex", () => {
  it("parses a valid index", () => {
    const raw = makeIndex([
      makeMilestoneEntry("S1-MS1", { status: "complete", completed_units: 5 }),
      makeMilestoneEntry("S1-MS2"),
    ]);
    const index = RoadmapIndex.parse(raw);
    expect(index.milestones).toHaveLength(2);
    expect(index.total_milestones).toBe(2);
    expect(index.version).toBe("1.0.0");
  });

  it("parses an empty index", () => {
    const raw = makeIndex([]);
    const index = RoadmapIndex.parse(raw);
    expect(index.milestones).toHaveLength(0);
    expect(index.total_milestones).toBe(0);
  });

  it("rejects invalid version format", () => {
    const raw = makeIndex([], { version: "v1" });
    expect(() => RoadmapIndex.parse(raw)).toThrow();
  });

  it("rejects missing title", () => {
    const raw = makeIndex([], { title: "" });
    expect(() => RoadmapIndex.parse(raw)).toThrow();
  });
});

// ── parseRoadmapIndex ───────────────────────────────────────────────

describe("parseRoadmapIndex", () => {
  it("returns typed RoadmapIndex on valid input", () => {
    const raw = makeIndex([makeMilestoneEntry("MS1")]);
    const index = parseRoadmapIndex(raw);
    expect(index.milestones[0].id).toBe("MS1");
  });

  it("throws on invalid input", () => {
    expect(() => parseRoadmapIndex(null)).toThrow();
    expect(() => parseRoadmapIndex("string")).toThrow();
    expect(() => parseRoadmapIndex({ version: "bad" })).toThrow();
  });
});

// ── validateRoadmapIndex ────────────────────────────────────────────

describe("validateRoadmapIndex", () => {
  it("returns success on valid input", () => {
    const raw = makeIndex([makeMilestoneEntry("MS1")]);
    const result = validateRoadmapIndex(raw);
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data!.milestones).toHaveLength(1);
  });

  it("returns failure on invalid input", () => {
    const result = validateRoadmapIndex({ version: "bad" });
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("returns failure on null", () => {
    const result = validateRoadmapIndex(null);
    expect(result.success).toBe(false);
  });
});

// ── Seed Data Validation ────────────────────────────────────────────

describe("seed data validation", () => {
  it("validates the actual roadmap-index.json structure", () => {
    // Validate the same structure as the real seed data
    const seedIndex = {
      version: "1.0.0",
      title: "PRISM App — Comprehensive Layered Roadmap",
      updated_at: "2026-02-25T22:00:00Z",
      milestones: [
        {
          id: "S0-MS1",
          title: "System Health Verification",
          track: "S0",
          dependencies: [],
          status: "complete",
          total_units: 11,
          completed_units: 11,
          sessions: "1",
          envelope_path: "milestones/S0-MS1.json",
          position_path: "state/S0-MS1/position.json",
        },
        {
          id: "S1-MS1",
          title: "Registry Enrichment for SFC",
          track: "S1",
          dependencies: ["S0-MS1"],
          status: "complete",
          total_units: 18,
          completed_units: 18,
          sessions: "2-3",
          envelope_path: "milestones/S1-MS1.json",
          position_path: "state/S1-MS1/position.json",
        },
        {
          id: "S1-MS2",
          title: "Port Core Monolith Algorithms",
          track: "S1",
          dependencies: ["S1-MS1"],
          status: "not_started",
          total_units: 10,
          completed_units: 0,
          sessions: "2-3",
          envelope_path: "milestones/S1-MS2.json",
          position_path: "state/S1-MS2/position.json",
        },
      ],
      total_milestones: 5,
      completed_milestones: 2,
    };
    const result = validateRoadmapIndex(seedIndex);
    expect(result.success).toBe(true);
    expect(result.data!.milestones).toHaveLength(3);
    expect(result.data!.milestones[0].status).toBe("complete");
    expect(result.data!.milestones[2].status).toBe("not_started");
  });
});

// ── resolveEnvelope / resolvePosition (unit-testable parts) ─────────

describe("resolve helpers interface contracts", () => {
  it("resolveEnvelope requires milestone_id or roadmap", async () => {
    // We can't test the actual file I/O without mocking, but we verify
    // the import compiles and the module structure is correct
    const { resolveEnvelope, resolvePosition, clearRoadmapCache } = await import(
      "../services/RoadmapLoader.js"
    );
    expect(typeof resolveEnvelope).toBe("function");
    expect(typeof resolvePosition).toBe("function");
    expect(typeof clearRoadmapCache).toBe("function");

    // resolveEnvelope with no args should throw
    await expect(resolveEnvelope({})).rejects.toThrow(
      "Either milestone_id or roadmap (full envelope) required"
    );
  });
});
