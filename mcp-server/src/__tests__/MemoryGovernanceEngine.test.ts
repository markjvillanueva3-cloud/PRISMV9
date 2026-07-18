/**
 * MemoryGovernanceEngine tests — HMEMV03.  Asserts deterministic hash,
 * exact TTL expiration math, scrub semantics, and ceiling-rejection.
 * Every assertion targets an exact expected value — no presence-only checks.
 */
import { describe, it, expect } from "vitest";
import {
  MemoryGovernanceEngine,
  type GovernedEntry,
  type ScrubRequest,
} from "../engines/MemoryGovernanceEngine.js";

const ISO = "2026-05-24T13:00:00.000Z";
const LATER = "2026-05-24T13:01:00.000Z";

const ent = (
  id: string, key: string, value: unknown, ttl_ms?: number, tags: string[] = [],
): GovernedEntry => ({ entry_id: id, key, value, created_at: ISO, ttl_ms, tags });

describe("MemoryGovernanceEngine.hashEntry — deterministic hashing", () => {
  it("returns the same hash for the same entry (deterministic)", () => {
    const a = ent("e1", "k1", { x: 1 }, 1000, ["t"]);
    expect(MemoryGovernanceEngine.hashEntry(a)).toBe(MemoryGovernanceEngine.hashEntry(a));
  });

  it("returns 16-character hex hash (FNV-1a 64-bit)", () => {
    const a = ent("e1", "k1", { x: 1 });
    const h = MemoryGovernanceEngine.hashEntry(a);
    expect(h.length).toBe(16);
    expect(/^[0-9a-f]{16}$/.test(h)).toBe(true);
  });

  it("returns the same hash regardless of tag order (sorted)", () => {
    const a = ent("e1", "k1", 1, undefined, ["b", "a", "c"]);
    const b = ent("e2", "k1", 1, undefined, ["a", "b", "c"]);
    expect(MemoryGovernanceEngine.hashEntry(a)).toBe(MemoryGovernanceEngine.hashEntry(b));
  });

  it("returns different hashes for different values", () => {
    const a = ent("e1", "k1", 1);
    const b = ent("e1", "k1", 2);
    expect(MemoryGovernanceEngine.hashEntry(a)).not.toBe(MemoryGovernanceEngine.hashEntry(b));
  });
});

describe("MemoryGovernanceEngine.findExpired — TTL math", () => {
  it("expires entries where created_at + ttl <= now (exact boundary 60s)", () => {
    const entries: GovernedEntry[] = [
      ent("e1", "k1", 1, 60_000),       // expires at +60s → expired exactly at LATER
      ent("e2", "k2", 2, 120_000),      // alive
      ent("e3", "k3", 3, undefined),    // no TTL → alive
    ];
    const r = MemoryGovernanceEngine.findExpired(entries, LATER);
    expect(r.kept.map((e) => e.entry_id).sort()).toEqual(["e2", "e3"]);
    expect(r.expired).toHaveLength(1);
    expect(r.expired[0].key).toBe("k1");
    expect(r.audit).toHaveLength(1);
    expect(r.audit[0].action).toBe("ttl-expire");
    expect(r.audit[0].entry_id).toBe("e1");
    expect(r.audit[0].reason).toBe("ttl_ms=60000 elapsed");
  });

  it("preserves all entries when none expired (kept count = input count)", () => {
    const entries: GovernedEntry[] = [ent("e1", "k1", 1, 999_999_999)];
    const r = MemoryGovernanceEngine.findExpired(entries, LATER);
    expect(r.kept).toHaveLength(1);
    expect(r.expired).toHaveLength(0);
    expect(r.audit).toHaveLength(0);
  });

  it("audit entries carry before_hash exactly matching hashEntry(entry)", () => {
    const e = ent("e1", "k1", 1, 1_000);
    const r = MemoryGovernanceEngine.findExpired([e], LATER);
    expect(r.audit[0].before_hash).toBe(MemoryGovernanceEngine.hashEntry(e));
  });
});

describe("MemoryGovernanceEngine.scrub — exact match semantics", () => {
  const req = (over: Partial<ScrubRequest> = {}): ScrubRequest => ({
    scrub_id: "s1", actor: "compliance-bot",
    match_keys: [], match_tags: [], reason: "PII redaction",
    ...over,
  });

  it("scrubs entries matching match_keys exactly; emits 1 audit per scrubbed", () => {
    const entries: GovernedEntry[] = [
      ent("e1", "user@example.com", { ssn: "..." }),
      ent("e2", "other", 1),
    ];
    const r = MemoryGovernanceEngine.scrub(entries, req({ match_keys: ["user@example.com"] }), LATER);
    expect(r.kept).toHaveLength(1);
    expect(r.kept[0].key).toBe("other");
    expect(r.result.scrubbed_count).toBe(1);
    expect(r.result.remaining_count).toBe(1);
    expect(r.result.audit_entries).toHaveLength(1);
    expect(r.result.audit_entries[0].action).toBe("scrub");
    expect(r.result.audit_entries[0].reason).toBe("PII redaction");
  });

  it("scrubs entries matching ANY tag in match_tags (set intersect)", () => {
    const entries: GovernedEntry[] = [
      ent("e1", "k1", 1, undefined, ["pii", "tenant_a"]),
      ent("e2", "k2", 2, undefined, ["tenant_b"]),
      ent("e3", "k3", 3, undefined, ["other"]),
    ];
    const r = MemoryGovernanceEngine.scrub(entries, req({ match_tags: ["pii"] }), LATER);
    expect(r.result.scrubbed_count).toBe(1);
    expect(r.kept.map((e) => e.entry_id)).toEqual(["e2", "e3"]);
  });

  it("OR-semantics across match_keys + match_tags", () => {
    const entries: GovernedEntry[] = [
      ent("e1", "key_a", 1, undefined, []),
      ent("e2", "key_b", 1, undefined, ["pii"]),
      ent("e3", "key_c", 1, undefined, []),
    ];
    const r = MemoryGovernanceEngine.scrub(entries,
      req({ match_keys: ["key_a"], match_tags: ["pii"] }), LATER);
    expect(r.result.scrubbed_count).toBe(2);
    expect(r.kept.map((e) => e.entry_id)).toEqual(["e3"]);
  });

  it("throws when neither match_keys nor match_tags supplied (safety guard)", () => {
    const entries: GovernedEntry[] = [ent("e1", "k1", 1)];
    expect(() => MemoryGovernanceEngine.scrub(entries, req(), LATER)).toThrow(/match_keys/);
  });

  it("throws when matched count exceeds safety ceiling 500 (adversarial)", () => {
    const entries: GovernedEntry[] = Array.from({ length: 501 }, (_, i) =>
      ent(`e${i}`, `k${i}`, 1, undefined, ["scrub_me"]));
    expect(() => MemoryGovernanceEngine.scrub(entries,
      req({ match_tags: ["scrub_me"] }), LATER)).toThrow(/500/);
  });

  it("zero matches → kept array unchanged; result.scrubbed_count=0", () => {
    const entries: GovernedEntry[] = [ent("e1", "k1", 1)];
    const r = MemoryGovernanceEngine.scrub(entries, req({ match_keys: ["nope"] }), LATER);
    expect(r.kept).toEqual(entries);
    expect(r.result.scrubbed_count).toBe(0);
    expect(r.result.remaining_count).toBe(1);
  });
});

describe("MemoryGovernanceEngine.recordAudit", () => {
  it("emits audit with distinct before_hash and after_hash on update", () => {
    const before = ent("e1", "k1", 1);
    const after = ent("e1", "k1", 2);
    const a = MemoryGovernanceEngine.recordAudit({
      audit_id: "a1", entry_id: "e1", action: "update",
      actor: "ops", before, after, at: LATER,
    });
    expect(a.action).toBe("update");
    expect(a.before_hash).toBe(MemoryGovernanceEngine.hashEntry(before));
    expect(a.after_hash).toBe(MemoryGovernanceEngine.hashEntry(after));
    expect(a.before_hash === a.after_hash).toBe(false);
  });

  it("emits audit with only after_hash on insert (before_hash absent → undefined)", () => {
    const after = ent("e1", "k1", 1);
    const a = MemoryGovernanceEngine.recordAudit({
      audit_id: "a1", entry_id: "e1", action: "insert",
      actor: "ops", after, at: LATER,
    });
    expect(a.action).toBe("insert");
    expect(a.before_hash === undefined).toBe(true);
    expect(a.after_hash).toBe(MemoryGovernanceEngine.hashEntry(after));
  });

  it("rejects unknown action via zod enum", () => {
    expect(() => MemoryGovernanceEngine.recordAudit({
      audit_id: "a1", entry_id: "e1", action: "yolo" as never,
      actor: "ops", at: LATER,
    })).toThrow();
  });
});

describe("MemoryGovernanceEngine.renderAudit", () => {
  it("renders header + per-entry line with action + actor + entry_id", () => {
    const a = MemoryGovernanceEngine.recordAudit({
      audit_id: "a1", entry_id: "e1", action: "scrub",
      actor: "ops", reason: "PII", at: LATER,
    });
    const md = MemoryGovernanceEngine.renderAudit([a]);
    expect(md.includes("[AUDIT] 1 entry(ies)")).toBe(true);
    expect(md.includes("scrub")).toBe(true);
    expect(md.includes("ops")).toBe(true);
    expect(md.includes("e1")).toBe(true);
    expect(md.includes("PII")).toBe(true);
  });

  it("renders empty banner exactly when audit list is empty", () => {
    expect(MemoryGovernanceEngine.renderAudit([])).toBe("[AUDIT] (empty)");
  });
});
