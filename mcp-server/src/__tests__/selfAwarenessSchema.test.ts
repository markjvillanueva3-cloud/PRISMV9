/**
 * SelfAwarenessSchema Test Suite
 * ===============================
 *
 * AGENT-MS1 U-AGT03 — Validates the agent identity Zod schema against
 * exit criteria:
 *   - Schema covers identity, capabilities, constraints, state, memory
 *   - Schema validates against test instances
 *   - Serializes to <2KB JSON for context injection
 *
 * @milestone AGENT-MS1
 * @unit U-AGT03
 */

import { describe, it, expect } from "vitest";
import {
  selfAwarenessSchema,
  buildSelfAwareness,
  serializeCompact,
  validateSelfAwareness,
  type SelfAwareness,
} from "../schemas/selfAwarenessSchema.js";

function minimalValidModel(): SelfAwareness {
  return buildSelfAwareness({
    identity: {
      name: "Claude-Opus-4.7",
      model_id: "claude-opus-4-7",
      session_id: "session-abc-123",
    },
    capabilities: {
      dispatcher_count: 84,
      action_count: 4296,
      engine_count: 1660,
    },
  });
}

describe("SelfAwarenessSchema", () => {
  // ── Coverage ─────────────────────────────────────────────────────────

  describe("schema coverage", () => {
    it("includes identity, capabilities, constraints, state, memory, active_context", () => {
      const m = minimalValidModel();
      expect(m.identity).toBeDefined();
      expect(m.capabilities).toBeDefined();
      expect(m.constraints).toBeDefined();
      expect(m.state).toBeDefined();
      expect(m.memory).toBeDefined();
      expect(m.active_context).toBeDefined();
    });

    it("includes a schema_version", () => {
      const m = minimalValidModel();
      expect(m.schema_version).toBe("1.0.0");
    });

    it("includes a refreshed_at timestamp", () => {
      const m = minimalValidModel();
      expect(m.refreshed_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  // ── Validation ───────────────────────────────────────────────────────

  describe("validation", () => {
    it("validates a minimal valid model", () => {
      const m = minimalValidModel();
      const res = validateSelfAwareness(m);
      expect(res.valid).toBe(true);
    });

    it("rejects missing identity.name", () => {
      const bad = {
        ...minimalValidModel(),
        identity: { ...minimalValidModel().identity, name: "" },
      };
      const res = validateSelfAwareness(bad);
      expect(res.valid).toBe(false);
    });

    it("rejects invalid role", () => {
      const bad = {
        ...minimalValidModel(),
        identity: { ...minimalValidModel().identity, role: "overlord" as any },
      };
      const res = validateSelfAwareness(bad);
      expect(res.valid).toBe(false);
    });

    it("rejects negative dispatcher_count", () => {
      const bad = {
        ...minimalValidModel(),
        capabilities: { ...minimalValidModel().capabilities, dispatcher_count: -1 },
      };
      const res = validateSelfAwareness(bad);
      expect(res.valid).toBe(false);
    });

    it("rejects omega_target > 1.0", () => {
      const bad = {
        ...minimalValidModel(),
        constraints: {
          ...minimalValidModel().constraints,
          omega_target: 1.5,
        },
      };
      const res = validateSelfAwareness(bad);
      expect(res.valid).toBe(false);
    });

    it("rejects invalid state.phase", () => {
      const bad = {
        ...minimalValidModel(),
        state: { ...minimalValidModel().state, phase: "panic" as any },
      };
      const res = validateSelfAwareness(bad);
      expect(res.valid).toBe(false);
    });

    it("rejects malformed refreshed_at", () => {
      const bad = {
        ...minimalValidModel(),
        refreshed_at: "not a date",
      };
      const res = validateSelfAwareness(bad);
      expect(res.valid).toBe(false);
    });
  });

  // ── buildSelfAwareness() defaults ────────────────────────────────────

  describe("buildSelfAwareness() defaults", () => {
    it("fills in default role = executor", () => {
      const m = minimalValidModel();
      expect(m.identity.role).toBe("executor");
    });

    it("fills in default phase = idle", () => {
      const m = minimalValidModel();
      expect(m.state.phase).toBe("idle");
    });

    it("fills in default omega floor/target", () => {
      const m = minimalValidModel();
      expect(m.constraints.omega_floor).toBe(0.85);
      expect(m.constraints.omega_target).toBe(1.0);
    });

    it("fills in default hard_limits", () => {
      const m = minimalValidModel();
      expect(m.constraints.hard_limits.max_bash_timeout_ms).toBeGreaterThan(0);
      expect(m.constraints.hard_limits.max_read_lines_per_call).toBe(2000);
    });

    it("fills in empty arrays by default", () => {
      const m = minimalValidModel();
      expect(m.capabilities.owned_tracks).toEqual([]);
      expect(m.constraints.blocked_tracks).toEqual([]);
      expect(m.active_context.recent_files).toEqual([]);
    });

    it("accepts custom role override", () => {
      const m = buildSelfAwareness({
        identity: {
          name: "X",
          model_id: "m",
          session_id: "s",
          role: "coordinator",
        },
        capabilities: {},
      });
      expect(m.identity.role).toBe("coordinator");
    });

    it("accepts custom phase + milestone", () => {
      const m = buildSelfAwareness({
        identity: { name: "X", model_id: "m", session_id: "s" },
        capabilities: {},
        state: {
          phase: "implementing",
          current_milestone: "LATHE-AWARE-HARDEN-MS9",
          current_unit: "U-LAT66",
        },
      });
      expect(m.state.phase).toBe("implementing");
      expect(m.state.current_milestone).toBe("LATHE-AWARE-HARDEN-MS9");
      expect(m.state.current_unit).toBe("U-LAT66");
    });
  });

  // ── serializeCompact() ────────────────────────────────────────────────

  describe("serializeCompact()", () => {
    it("serializes to a JSON string", () => {
      const m = minimalValidModel();
      const s = serializeCompact(m);
      expect(typeof s).toBe("string");
      expect(() => JSON.parse(s)).not.toThrow();
    });

    it("produces output < 2KB for a typical model", () => {
      const m = buildSelfAwareness({
        identity: {
          name: "Claude-Opus-4.7",
          model_id: "claude-opus-4-7",
          session_id: "session-abc-123",
          machine_id: "DESKTOP-ABC",
        },
        capabilities: {
          dispatcher_count: 84,
          action_count: 4296,
          engine_count: 1660,
          owned_tracks: ["LATHE", "AGENT"],
        },
        constraints: {
          blocked_tracks: ["APP", "APPW", "FMERGE", "WEB", "UI"],
        },
        state: {
          phase: "implementing",
          current_milestone: "AGENT-MS1",
          current_unit: "U-AGT03",
          git_branch: "main",
        },
        active_context: {
          recent_commits: ["abc123", "def456", "ghi789", "jkl012", "mno345"],
        },
      });
      const s = serializeCompact(m);
      expect(s.length).toBeLessThan(2048);
    });

    it("omits empty arrays and undefined fields", () => {
      const m = minimalValidModel();
      const s = serializeCompact(m);
      const parsed = JSON.parse(s);
      expect(parsed.commits).toBeUndefined();
      expect(parsed.blocked).toBeUndefined();
      expect(parsed.ms).toBeUndefined();
    });

    it("includes identity, capabilities summary, and phase", () => {
      const m = minimalValidModel();
      const s = serializeCompact(m);
      const parsed = JSON.parse(s);
      expect(parsed.id.name).toBe("Claude-Opus-4.7");
      expect(parsed.id.model).toBe("claude-opus-4-7");
      expect(parsed.caps.d).toBe(84);
      expect(parsed.caps.a).toBe(4296);
      expect(parsed.caps.e).toBe(1660);
      expect(parsed.phase).toBe("idle");
    });
  });

  // ── Sub-schema exports ───────────────────────────────────────────────

  describe("direct schema.parse()", () => {
    it("selfAwarenessSchema.parse validates a full model", () => {
      const m = minimalValidModel();
      expect(() => selfAwarenessSchema.parse(m)).not.toThrow();
    });

    it("selfAwarenessSchema.safeParse returns success for valid input", () => {
      const m = minimalValidModel();
      const res = selfAwarenessSchema.safeParse(m);
      expect(res.success).toBe(true);
    });
  });

  // ── Integration-ready ─────────────────────────────────────────────────

  describe("populated from live engines (integration-ready)", () => {
    it("accepts categories from CapabilityIndexEngine output", () => {
      const m = buildSelfAwareness({
        identity: { name: "X", model_id: "m", session_id: "s" },
        capabilities: {
          dispatcher_count: 84,
          action_count: 4296,
          engine_count: 1660,
          categories: ["intelligence", "physics", "safety", "turning"],
        },
      });
      expect(m.capabilities.categories).toContain("turning");
    });
  });
});
