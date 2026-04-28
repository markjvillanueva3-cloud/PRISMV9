/**
 * AUTONOMOUS_STATE schema + initializer + merger — synthetic-input tests for U-AF09.
 *
 * The state file is the canonical contract between U-AF01 (watchdog),
 * U-AF03 (fail-latch), U-AF04 (cost ceiling), U-AF05 (sweep), and
 * U-AF08 (reviewer). Without a frozen schema, hooks drift and
 * silently misread each other's writes. These tests pin the contract.
 *
 * @milestone AUTONOMOUS-FOOLPROOF-MS0
 * @unit U-AF09
 */

import { describe, it, expect } from "vitest";
// @ts-expect-error - importing pure logic from .mjs lib (no shebang, vitest-safe)
import {
  AUTONOMOUS_STATE_SCHEMA_VERSION,
  AUTONOMOUS_STATE_DEFAULT_CAPS,
  validateAutonomousState,
  buildInitialAutonomousState,
  mergeAutonomousState,
} from "../../../.claude/hooks/lib/autonomous-foolproof-logic.mjs";

const NOW = new Date("2026-04-29T09:00:00Z").getTime();

describe("U-AF09 schema constants", () => {
  it("freezes schema version at 1.0.0", () => {
    expect(AUTONOMOUS_STATE_SCHEMA_VERSION).toBe("1.0.0");
  });

  it("freezes default caps to {cost_usd:50, tokens:5M, wall_time_ms:5h, unit_max:25}", () => {
    expect(AUTONOMOUS_STATE_DEFAULT_CAPS.cost_usd).toBe(50);
    expect(AUTONOMOUS_STATE_DEFAULT_CAPS.tokens).toBe(5_000_000);
    expect(AUTONOMOUS_STATE_DEFAULT_CAPS.wall_time_ms).toBe(5 * 60 * 60 * 1000);
    expect(AUTONOMOUS_STATE_DEFAULT_CAPS.unit_max).toBe(25);
  });

  it("default caps object is frozen (Object.freeze)", () => {
    expect(Object.isFrozen(AUTONOMOUS_STATE_DEFAULT_CAPS)).toBe(true);
  });
});

describe("U-AF09 buildInitialAutonomousState", () => {
  it("constructs a complete state with required fields", () => {
    const s = buildInitialAutonomousState({ sessionId: "abc", nowMs: NOW });
    expect(s.schemaVersion).toBe("1.0.0");
    expect(s.session_id).toBe("abc");
    expect(s.mode).toBe("autonomous");
    expect(s.started_at).toBe("2026-04-29T09:00:00.000Z");
  });

  it("initializes counters to 0", () => {
    const s = buildInitialAutonomousState({ sessionId: "abc", nowMs: NOW });
    expect(s.fail_count).toBe(0);
    expect(s.cost_usd).toBe(0);
    expect(s.tokens_used).toBe(0);
    expect(s.wall_time_ms).toBe(0);
    expect(s.unit_count).toBe(0);
  });

  it("initializes nullable timestamps to null", () => {
    const s = buildInitialAutonomousState({ sessionId: "abc", nowMs: NOW });
    expect(s.last_commit_at).toBeNull();
    expect(s.last_user_input_at).toBeNull();
    expect(s.last_block_at).toBeNull();
    expect(s.last_block_reason).toBeNull();
  });

  it("uses default caps when none provided", () => {
    const s = buildInitialAutonomousState({ sessionId: "abc", nowMs: NOW });
    expect(s.caps.cost_usd).toBe(50);
    expect(s.caps.tokens).toBe(5_000_000);
    expect(s.caps.unit_max).toBe(25);
  });

  it("allows overriding individual cap dimensions", () => {
    const s = buildInitialAutonomousState({
      sessionId: "abc",
      nowMs: NOW,
      caps: { cost_usd: 100, unit_max: 50 },
    });
    expect(s.caps.cost_usd).toBe(100);
    expect(s.caps.unit_max).toBe(50);
    // unspecified caps fall back to default
    expect(s.caps.tokens).toBe(5_000_000);
    expect(s.caps.wall_time_ms).toBe(5 * 60 * 60 * 1000);
  });

  it("supports manual mode", () => {
    const s = buildInitialAutonomousState({ sessionId: "abc", mode: "manual", nowMs: NOW });
    expect(s.mode).toBe("manual");
  });

  it("rejects missing sessionId", () => {
    expect(() => buildInitialAutonomousState({ nowMs: NOW })).toThrow(/sessionId required/);
    expect(() => buildInitialAutonomousState({ sessionId: "", nowMs: NOW })).toThrow(/sessionId required/);
    expect(() => buildInitialAutonomousState({ sessionId: 42 as unknown as string, nowMs: NOW })).toThrow(/sessionId required/);
  });

  it("rejects invalid mode", () => {
    expect(() =>
      buildInitialAutonomousState({ sessionId: "abc", mode: "wild" as "autonomous", nowMs: NOW }),
    ).toThrow(/invalid mode/);
  });

  it("uses Date.now() when nowMs is omitted", () => {
    const before = Date.now();
    const s = buildInitialAutonomousState({ sessionId: "abc" });
    const after = Date.now();
    const t = new Date(s.started_at).getTime();
    expect(t).toBeGreaterThanOrEqual(before);
    expect(t).toBeLessThanOrEqual(after);
  });

  it("output is a fresh object (mutating doesn't affect defaults)", () => {
    const s1 = buildInitialAutonomousState({ sessionId: "abc", nowMs: NOW });
    s1.caps.cost_usd = 999;
    const s2 = buildInitialAutonomousState({ sessionId: "abc", nowMs: NOW });
    expect(s2.caps.cost_usd).toBe(50);
  });
});

describe("U-AF09 validateAutonomousState", () => {
  function freshState() {
    return buildInitialAutonomousState({ sessionId: "abc", nowMs: NOW });
  }

  it("validates a freshly built state as ok", () => {
    const r = validateAutonomousState(freshState());
    expect(r.ok).toBe(true);
    expect(r.errors).toEqual([]);
  });

  it("validates a state with last_commit_at populated", () => {
    const s = freshState();
    s.last_commit_at = "2026-04-29T09:30:00.000Z";
    s.last_user_input_at = "2026-04-29T09:25:00.000Z";
    expect(validateAutonomousState(s).ok).toBe(true);
  });

  it("rejects null payload", () => {
    const r = validateAutonomousState(null);
    expect(r.ok).toBe(false);
    expect(r.errors).toContain("payload-not-object");
  });

  it("rejects array payload", () => {
    const r = validateAutonomousState([1, 2, 3] as unknown as object);
    expect(r.ok).toBe(false);
    expect(r.errors).toContain("payload-not-object");
  });

  it("rejects state missing required keys", () => {
    const partial = { schemaVersion: "1.0.0", session_id: "abc" };
    const r = validateAutonomousState(partial);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e: string) => e.startsWith("missing-key:"))).toBe(true);
  });

  it("rejects bad schemaVersion", () => {
    const s = freshState();
    s.schemaVersion = "9.9.9";
    const r = validateAutonomousState(s);
    expect(r.ok).toBe(false);
    expect(r.errors).toContain("bad-schemaVersion:9.9.9");
  });

  it("rejects unknown mode", () => {
    const s = freshState();
    s.mode = "wild" as "autonomous";
    const r = validateAutonomousState(s);
    expect(r.ok).toBe(false);
    expect(r.errors).toContain("bad-mode:wild");
  });

  it("rejects negative fail_count", () => {
    const s = freshState();
    s.fail_count = -1;
    const r = validateAutonomousState(s);
    expect(r.ok).toBe(false);
    expect(r.errors).toContain("bad-fail_count");
  });

  it("rejects non-integer fail_count (1.5)", () => {
    const s = freshState();
    s.fail_count = 1.5;
    const r = validateAutonomousState(s);
    expect(r.ok).toBe(false);
    expect(r.errors).toContain("bad-fail_count");
  });

  it("rejects NaN cost_usd", () => {
    const s = freshState();
    s.cost_usd = Number.NaN;
    const r = validateAutonomousState(s);
    expect(r.ok).toBe(false);
    expect(r.errors).toContain("bad-cost_usd");
  });

  it("rejects bad ISO timestamp", () => {
    const s = freshState();
    s.started_at = "yesterday";
    const r = validateAutonomousState(s);
    expect(r.ok).toBe(false);
    expect(r.errors).toContain("bad-started_at");
  });

  it("rejects empty session_id", () => {
    const s = freshState();
    s.session_id = "";
    const r = validateAutonomousState(s);
    expect(r.ok).toBe(false);
    expect(r.errors).toContain("bad-session_id");
  });

  it("rejects missing caps subfield", () => {
    const s = freshState();
    s.caps = { cost_usd: 50, tokens: 5_000_000, wall_time_ms: 1000 } as never;
    const r = validateAutonomousState(s);
    expect(r.ok).toBe(false);
    expect(r.errors).toContain("bad-caps.unit_max");
  });

  it("rejects negative cap value", () => {
    const s = freshState();
    s.caps = { ...s.caps, cost_usd: -10 };
    const r = validateAutonomousState(s);
    expect(r.ok).toBe(false);
    expect(r.errors).toContain("bad-caps.cost_usd");
  });

  it("rejects null caps object entirely", () => {
    const s = freshState();
    s.caps = null as never;
    const r = validateAutonomousState(s);
    expect(r.ok).toBe(false);
    expect(r.errors).toContain("bad-caps");
  });
});

describe("U-AF09 mergeAutonomousState", () => {
  function fresh() {
    return buildInitialAutonomousState({ sessionId: "abc", nowMs: NOW });
  }

  it("returns prev unchanged when patch is empty", () => {
    const prev = fresh();
    const next = mergeAutonomousState(prev, {});
    expect(next).toEqual(prev);
  });

  it("does not mutate prev (immutable update)", () => {
    const prev = fresh();
    const before = JSON.stringify(prev);
    mergeAutonomousState(prev, { fail_count: 5, cost_usd: 10 });
    expect(JSON.stringify(prev)).toBe(before);
  });

  it("REPLACES scalar field by default", () => {
    const prev = fresh();
    prev.fail_count = 3;
    const next = mergeAutonomousState(prev, { fail_count: 7 });
    expect(next.fail_count).toBe(7);
  });

  it("INCREMENTS field when prefixed with `+`", () => {
    const prev = fresh();
    prev.fail_count = 3;
    prev.cost_usd = 10;
    const next = mergeAutonomousState(prev, { "+fail_count": 1, "+cost_usd": 2.5 });
    expect(next.fail_count).toBe(4);
    expect(next.cost_usd).toBe(12.5);
  });

  it("ignores `+`-prefixed patch on non-incrementable fields", () => {
    const prev = fresh();
    const next = mergeAutonomousState(prev, { "+session_id": 1 } as never);
    expect(next.session_id).toBe(prev.session_id);
  });

  it("shallow-merges caps", () => {
    const prev = fresh();
    const next = mergeAutonomousState(prev, { caps: { cost_usd: 100 } });
    expect(next.caps.cost_usd).toBe(100);
    expect(next.caps.unit_max).toBe(25); // preserved from prev
  });

  it("ignores unknown keys in patch", () => {
    const prev = fresh();
    const next = mergeAutonomousState(prev, { weird_field: "ignored" } as never);
    expect("weird_field" in next).toBe(false);
  });

  it("updates last_commit_at + last_block_at via replace", () => {
    const prev = fresh();
    const next = mergeAutonomousState(prev, {
      last_commit_at: "2026-04-29T09:30:00.000Z",
      last_block_reason: "tsc-regression",
      last_block_at: "2026-04-29T09:40:00.000Z",
    });
    expect(next.last_commit_at).toBe("2026-04-29T09:30:00.000Z");
    expect(next.last_block_reason).toBe("tsc-regression");
  });

  it("falls back to fresh state when prev is invalid", () => {
    const next = mergeAutonomousState(null, { fail_count: 5 });
    expect(next.schemaVersion).toBe("1.0.0");
    expect(next.fail_count).toBe(5);
  });

  it("merge result still validates as valid state", () => {
    const prev = fresh();
    const next = mergeAutonomousState(prev, {
      "+fail_count": 1,
      "+cost_usd": 5.25,
      last_commit_at: "2026-04-29T09:30:00.000Z",
    });
    const r = validateAutonomousState(next);
    expect(r.ok).toBe(true);
  });

  it("ignores non-finite numeric increments (NaN/Infinity)", () => {
    const prev = fresh();
    prev.fail_count = 3;
    const next1 = mergeAutonomousState(prev, { "+fail_count": Number.NaN });
    expect(next1.fail_count).toBe(3);
    const next2 = mergeAutonomousState(prev, { "+fail_count": Number.POSITIVE_INFINITY });
    expect(next2.fail_count).toBe(3);
  });
});

describe("U-AF09 contract guarantees", () => {
  it("buildInitialAutonomousState output validates as ok", () => {
    const s = buildInitialAutonomousState({ sessionId: "abc", nowMs: NOW });
    expect(validateAutonomousState(s).ok).toBe(true);
  });

  it("mergeAutonomousState always preserves schemaVersion", () => {
    const prev = buildInitialAutonomousState({ sessionId: "abc", nowMs: NOW });
    const next = mergeAutonomousState(prev, { schemaVersion: "9.9.9" } as never);
    expect(next.schemaVersion).toBe("1.0.0"); // schemaVersion is NOT replaceable
  });

  it("validation rejects 100% adversarial inputs (numbers as strings, etc)", () => {
    const adversarial = [
      { schemaVersion: "1.0.0", session_id: "x", mode: "autonomous", started_at: "2026-04-29T09:00:00.000Z",
        last_commit_at: null, last_user_input_at: null, fail_count: "0", last_block_reason: null,
        last_block_at: null, cost_usd: 0, tokens_used: 0, wall_time_ms: 0, unit_count: 0,
        caps: { cost_usd: 50, tokens: 5_000_000, wall_time_ms: 1, unit_max: 25 },
      },
    ];
    for (const a of adversarial) {
      expect(validateAutonomousState(a).ok).toBe(false);
    }
  });
});
