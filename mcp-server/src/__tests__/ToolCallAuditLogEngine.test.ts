/** ToolCallAuditLogEngine tests — HMPI13. */
import { describe, it, expect } from "vitest";
import {
  ToolCallAuditLogEngine,
  type ToolCallEntry,
} from "../engines/ToolCallAuditLogEngine.js";

const T0 = "2026-05-24T13:00:00.000Z";

const mk = (over: Partial<ToolCallEntry> = {}): ToolCallEntry => ({
  at: T0,
  tool: "read",
  tenant_id: "t1",
  ok: true,
  duration_ms: 50,
  ...over,
});

describe("ToolCallAuditLogEngine.append — happy + bounded", () => {
  it("appends a single entry to an empty ring", () => {
    const r = ToolCallAuditLogEngine.append([], mk());
    expect(r.length).toBe(1);
    expect(r[0].tool).toBe("read");
  });

  it("preserves order across multiple appends", () => {
    let ring: ToolCallEntry[] = [];
    for (let i = 0; i < 3; i += 1) ring = ToolCallAuditLogEngine.append(ring, mk({ duration_ms: i * 10 }));
    expect(ring.map((e) => e.duration_ms)).toEqual([0, 10, 20]);
  });

  it("FIFO-evicts oldest when ring exceeds maxEntries", () => {
    let ring: ToolCallEntry[] = [];
    for (let i = 0; i < 5; i += 1) ring = ToolCallAuditLogEngine.append(ring, mk({ duration_ms: i }), 3);
    expect(ring.length).toBe(3);
    expect(ring[0].duration_ms).toBe(2);
    expect(ring[2].duration_ms).toBe(4);
  });

  it("rejects non-array ring", () => {
    expect(() => ToolCallAuditLogEngine.append(null as never, mk())).toThrow();
  });

  it("rejects non-positive maxEntries", () => {
    expect(() => ToolCallAuditLogEngine.append([], mk(), 0)).toThrow();
  });
});

describe("ToolCallAuditLogEngine.summarize — counts + rates", () => {
  it("empty ring → zero counts", () => {
    const s = ToolCallAuditLogEngine.summarize([], "read");
    expect(s.total_calls).toBe(0);
    expect(s.failure_rate).toBe(0);
    expect(s.p95_duration_ms).toBe(0);
  });

  it("filters by tool name", () => {
    const ring = [mk({ tool: "read" }), mk({ tool: "write" }), mk({ tool: "read" })];
    const s = ToolCallAuditLogEngine.summarize(ring, "read");
    expect(s.total_calls).toBe(2);
  });

  it("failure_rate computed from ok flag", () => {
    const ring = [mk({ ok: true }), mk({ ok: false }), mk({ ok: false }), mk({ ok: true })];
    const s = ToolCallAuditLogEngine.summarize(ring, "read");
    expect(s.failure_count).toBe(2);
    expect(s.failure_rate).toBe(0.5);
  });

  it("recent_failures returns trailing N failures", () => {
    const ring = [
      mk({ ok: false, failure_reason: "f1" }),
      mk({ ok: true }),
      mk({ ok: false, failure_reason: "f2" }),
      mk({ ok: false, failure_reason: "f3" }),
    ];
    const s = ToolCallAuditLogEngine.summarize(ring, "read", 2);
    expect(s.recent_failures.length).toBe(2);
    expect(s.recent_failures[0].failure_reason).toBe("f2");
    expect(s.recent_failures[1].failure_reason).toBe("f3");
  });

  it("p95 picks the right index on sorted durations", () => {
    const ring: ToolCallEntry[] = Array.from({ length: 100 }, (_, i) => mk({ duration_ms: i + 1 }));
    const s = ToolCallAuditLogEngine.summarize(ring, "read");
    expect(s.p95_duration_ms).toBe(95);
  });
});

describe("ToolCallAuditLogEngine — schema + render", () => {
  it("rejects negative duration_ms (zod)", () => {
    expect(() => ToolCallAuditLogEngine.append([], mk({ duration_ms: -1 }))).toThrow();
  });

  it("rejects duration_ms > 600_000 (zod)", () => {
    expect(() => ToolCallAuditLogEngine.append([], mk({ duration_ms: 600_001 }))).toThrow();
  });

  it("rejects empty tool", () => {
    expect(() => ToolCallAuditLogEngine.summarize([], "")).toThrow();
  });

  it("renderSummary shows tag + calls + ok + fail + p95", () => {
    const ring = [mk({ ok: true }), mk({ ok: false, failure_reason: "x" })];
    const md = ToolCallAuditLogEngine.renderSummary(ToolCallAuditLogEngine.summarize(ring, "read"));
    expect(md.includes("[AUDIT read]")).toBe(true);
    expect(md.includes("calls=2")).toBe(true);
    expect(md.includes("fail=1")).toBe(true);
    expect(md.includes("p95=")).toBe(true);
  });
});
