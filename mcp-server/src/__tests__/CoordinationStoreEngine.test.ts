/**
 * CoordinationStoreEngine.test.ts — HOOK-SYNERGY-MS0 / U-HOOK-COORD-SQLITE (H8)
 *
 * Strategy:
 *   - Every test constructs its own fresh in-memory SQLite via
 *     `new CoordinationStoreEngine({ dbPath: ":memory:" })`. No shared state,
 *     no temp file cleanup, no journaling overhead.
 *   - Time is injected via `now: () => fixedMs` so TTL/expiration are
 *     deterministic; we drive the engine through advancing the clock,
 *     not through `setTimeout`.
 *   - Migration tests use a real on-disk temp file (the migration path
 *     reads from JSON, which is the unit under test).
 *   - The full WORK_CLAIMS.json shape from `state/shared/WORK_CLAIMS.json`
 *     is exercised — including the `by` / `session_id` dual key, the `at`
 *     ISO timestamp, and the missing-fields-fall-back path.
 *
 * Reference values are all derived from the engine's exported
 * `COORDINATION_STORE_LIMITS` so the tests track changes to caps.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import {
  CoordinationStoreEngine,
  COORDINATION_STORE_LIMITS,
  coordinationStoreEngine,
  getCoordinationStoreEngine,
  type ClaimRow,
  type ClaimSuccess,
  type ClaimConflict,
} from "../engines/CoordinationStoreEngine.js";

// ── test fixtures ────────────────────────────────────────────────────────────

let tmpRoot: string;

beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "coord-store-test-"));
});

afterEach(() => {
  try { fs.rmSync(tmpRoot, { recursive: true, force: true }); } catch { /* ignore */ }
});

/** Build a hermetic engine with a controlled clock at `t0`. */
function makeEngine(t0 = 1_700_000_000_000): {
  engine: CoordinationStoreEngine;
  setNow: (t: number) => void;
} {
  let now = t0;
  const engine = new CoordinationStoreEngine({
    dbPath: ":memory:",
    now: () => now,
  });
  return { engine, setNow: (t: number) => { now = t; } };
}

const SAMPLE_CLAIM = {
  resourcePath: "H:/prism/mcp-server/src/engines/Foo.ts",
  sessionId: "alpha-12345678",
  pcName: "DESKTOP-N7MI1VB",
  hostname: "DESKTOP-N7MI1VB",
  pid: 42,
  intent: "editing engine",
};

// ── lifecycle + caps ────────────────────────────────────────────────────────

describe("CoordinationStoreEngine lifecycle + caps", () => {
  it("COORDINATION_STORE_LIMITS is frozen with the expected schema version", () => {
    expect(COORDINATION_STORE_LIMITS.SCHEMA_VERSION).toBe(1);
    expect(Object.isFrozen(COORDINATION_STORE_LIMITS)).toBe(true);
  });

  it("singleton accessor returns the same instance across calls", () => {
    const a = getCoordinationStoreEngine();
    const b = getCoordinationStoreEngine();
    expect(a).toBe(b);
    expect(a).toBe(coordinationStoreEngine);
  });

  it("health() reports the journal mode (memory for :memory:, would be WAL on disk)", () => {
    const { engine } = makeEngine();
    const h = engine.health();
    expect(h.open).toBe(true);
    expect(h.schemaVersion).toBe(COORDINATION_STORE_LIMITS.SCHEMA_VERSION);
    expect(typeof h.journalMode).toBe("string");
  });

  it("close() can be called multiple times safely", () => {
    const { engine } = makeEngine();
    engine.claim(SAMPLE_CLAIM); // open the db
    engine.close();
    engine.close(); // no throw on double-close
  });

  it("getDbPath() returns the constructor's dbPath verbatim", () => {
    const { engine } = makeEngine();
    expect(engine.getDbPath()).toBe(":memory:");
  });

  it("counts() returns zero on a fresh database", () => {
    const { engine } = makeEngine();
    const c = engine.counts();
    expect(c.claims).toBe(0);
    expect(c.presence).toBe(0);
    expect(c.schemaVersion).toBe(COORDINATION_STORE_LIMITS.SCHEMA_VERSION);
  });
});

// ── claim happy path + same-session refresh ─────────────────────────────────

describe("CoordinationStoreEngine.claim — happy path", () => {
  it("returns {acquired:true,row} on first claim of a resource", () => {
    const { engine } = makeEngine();
    const res = engine.claim(SAMPLE_CLAIM);
    expect(res.acquired).toBe(true);
    const success = res as ClaimSuccess;
    expect(success.row.resource_path).toBe(SAMPLE_CLAIM.resourcePath);
    expect(success.row.session_id).toBe(SAMPLE_CLAIM.sessionId);
    expect(success.row.pid).toBe(SAMPLE_CLAIM.pid);
    expect(success.row.intent).toBe(SAMPLE_CLAIM.intent);
  });

  it("claim is persisted and findClaim() retrieves it", () => {
    const { engine } = makeEngine();
    engine.claim(SAMPLE_CLAIM);
    const found = engine.findClaim(SAMPLE_CLAIM.resourcePath);
    expect(found).not.toBe(null);
    expect((found as ClaimRow).session_id).toBe(SAMPLE_CLAIM.sessionId);
  });

  it("same-session re-claim refreshes the TTL + intent without conflict", () => {
    const { engine, setNow } = makeEngine(1_000_000);
    const r1 = engine.claim(SAMPLE_CLAIM) as ClaimSuccess;
    expect(r1.acquired).toBe(true);
    setNow(1_500_000);
    const r2 = engine.claim({ ...SAMPLE_CLAIM, intent: "still editing" }) as ClaimSuccess;
    expect(r2.acquired).toBe(true);
    expect(r2.row.intent).toBe("still editing");
    expect(r2.row.claimed_at).toBe(1_500_000);
    expect(r2.row.expires_at).toBe(1_500_000 + COORDINATION_STORE_LIMITS.DEFAULT_CLAIM_TTL_MS);
  });

  it("expires_at = claimed_at + DEFAULT_CLAIM_TTL_MS by default", () => {
    const { engine } = makeEngine(2_000_000);
    const r = engine.claim(SAMPLE_CLAIM) as ClaimSuccess;
    expect(r.row.claimed_at).toBe(2_000_000);
    expect(r.row.expires_at).toBe(2_000_000 + COORDINATION_STORE_LIMITS.DEFAULT_CLAIM_TTL_MS);
  });

  it("custom ttlMs is honored", () => {
    const { engine } = makeEngine(3_000_000);
    const r = engine.claim({ ...SAMPLE_CLAIM, ttlMs: 60_000 }) as ClaimSuccess;
    expect(r.row.expires_at).toBe(3_000_000 + 60_000);
  });

  it("intent is truncated to MAX_INTENT_BYTES", () => {
    const { engine } = makeEngine();
    const longIntent = "x".repeat(COORDINATION_STORE_LIMITS.MAX_INTENT_BYTES + 100);
    const r = engine.claim({ ...SAMPLE_CLAIM, intent: longIntent }) as ClaimSuccess;
    expect(r.row.intent.length).toBe(COORDINATION_STORE_LIMITS.MAX_INTENT_BYTES);
  });
});

// ── claim conflict + cross-session ──────────────────────────────────────────

describe("CoordinationStoreEngine.claim — conflict + cross-session", () => {
  it("second session gets {acquired:false, reason:'already_claimed_by_other_session'}", () => {
    const { engine } = makeEngine();
    engine.claim(SAMPLE_CLAIM);
    const res = engine.claim({ ...SAMPLE_CLAIM, sessionId: "bravo-87654321" });
    expect(res.acquired).toBe(false);
    const conflict = res as ClaimConflict;
    expect(conflict.reason).toBe("already_claimed_by_other_session");
    expect(conflict.existing.session_id).toBe(SAMPLE_CLAIM.sessionId);
  });

  it("an expired claim is auto-purged so a new session can claim it", () => {
    const { engine, setNow } = makeEngine(1_000);
    engine.claim({ ...SAMPLE_CLAIM, ttlMs: 1_000 }); // expires at t=2000
    setNow(5_000); // way past expiry
    const res = engine.claim({ ...SAMPLE_CLAIM, sessionId: "bravo-87654321" });
    expect(res.acquired).toBe(true);
    expect((res as ClaimSuccess).row.session_id).toBe("bravo-87654321");
  });

  it("throws on empty resourcePath or sessionId", () => {
    const { engine } = makeEngine();
    expect(() => engine.claim({ ...SAMPLE_CLAIM, resourcePath: "" })).toThrow(/resourcePath/);
    expect(() => engine.claim({ ...SAMPLE_CLAIM, sessionId: "" })).toThrow(/sessionId/);
  });

  it("liveClaims() excludes expired rows but allClaims() includes them", () => {
    const { engine, setNow } = makeEngine(1_000);
    engine.claim({ ...SAMPLE_CLAIM, resourcePath: "/x.ts", ttlMs: 1_000 });
    engine.claim({ ...SAMPLE_CLAIM, resourcePath: "/y.ts", ttlMs: 100_000 });
    setNow(5_000); // /x.ts expired, /y.ts still live
    const live = engine.liveClaims();
    const all = engine.allClaims();
    expect(live.length).toBe(1);
    expect(live[0].resource_path).toBe("/y.ts");
    expect(all.length).toBe(2);
  });

  it("listLiveClaims preserves claimed-at ordering (oldest first)", () => {
    const { engine, setNow } = makeEngine(1_000);
    engine.claim({ ...SAMPLE_CLAIM, resourcePath: "/a.ts" });
    setNow(2_000);
    engine.claim({ ...SAMPLE_CLAIM, resourcePath: "/b.ts" });
    setNow(3_000);
    engine.claim({ ...SAMPLE_CLAIM, resourcePath: "/c.ts" });
    const live = engine.liveClaims();
    expect(live.map((r) => r.resource_path)).toEqual(["/a.ts", "/b.ts", "/c.ts"]);
  });
});

// ── release ─────────────────────────────────────────────────────────────────

describe("CoordinationStoreEngine.release", () => {
  it("returns true when the calling session owns the claim", () => {
    const { engine } = makeEngine();
    engine.claim(SAMPLE_CLAIM);
    const released = engine.release({ resourcePath: SAMPLE_CLAIM.resourcePath, sessionId: SAMPLE_CLAIM.sessionId });
    expect(released).toBe(true);
    expect(engine.findClaim(SAMPLE_CLAIM.resourcePath)).toBe(null);
  });

  it("returns false when a different session attempts to release someone else's claim", () => {
    const { engine } = makeEngine();
    engine.claim(SAMPLE_CLAIM);
    const released = engine.release({ resourcePath: SAMPLE_CLAIM.resourcePath, sessionId: "bravo-87654321" });
    expect(released).toBe(false);
    // The original claim is unchanged.
    expect(engine.findClaim(SAMPLE_CLAIM.resourcePath)?.session_id).toBe(SAMPLE_CLAIM.sessionId);
  });

  it("returns false for a non-existent claim (idempotent)", () => {
    const { engine } = makeEngine();
    expect(engine.release({ resourcePath: "/nope.ts", sessionId: "x" })).toBe(false);
  });
});

// ── presence (heartbeats) ──────────────────────────────────────────────────

describe("CoordinationStoreEngine presence", () => {
  it("heartbeat upserts and findPresence retrieves the row", () => {
    const { engine } = makeEngine();
    const row = engine.heartbeat({ sessionId: "alpha-1", pcName: "PC1", hostname: "host", meta: { branch: "main" } });
    expect(row.session_id).toBe("alpha-1");
    expect(row.pc_name).toBe("PC1");
    const found = engine.findPresence("alpha-1");
    expect(found?.session_id).toBe("alpha-1");
    expect(found?.meta_json).toBe(JSON.stringify({ branch: "main" }));
  });

  it("subsequent heartbeats update last_seen_at + meta in place (no duplicate row)", () => {
    const { engine, setNow } = makeEngine(1_000);
    engine.heartbeat({ sessionId: "alpha-1", meta: { v: 1 } });
    setNow(2_000);
    engine.heartbeat({ sessionId: "alpha-1", meta: { v: 2 } });
    const found = engine.findPresence("alpha-1");
    expect(found?.last_seen_at).toBe(2_000);
    expect(found?.meta_json).toBe(JSON.stringify({ v: 2 }));
    expect(engine.counts().presence).toBe(1);
  });

  it("activeSessions returns rows within the window, in last-seen-desc order", () => {
    const { engine, setNow } = makeEngine(1_000);
    engine.heartbeat({ sessionId: "alpha-1" });
    setNow(2_000);
    engine.heartbeat({ sessionId: "bravo-2" });
    setNow(3_000);
    engine.heartbeat({ sessionId: "charlie-3" });
    const active = engine.activeSessions(60_000);
    expect(active.length).toBe(3);
    expect(active[0].session_id).toBe("charlie-3"); // newest first
    expect(active[2].session_id).toBe("alpha-1");
  });

  it("stale presence rows fall out of the active-sessions window", () => {
    const { engine, setNow } = makeEngine(1_000);
    engine.heartbeat({ sessionId: "alpha-1" }); // last_seen_at = 1_000
    setNow(1_000 + COORDINATION_STORE_LIMITS.DEFAULT_PRESENCE_TTL_MS + 1);
    expect(engine.activeSessions().length).toBe(0); // window expired
  });

  it("oversize meta is replaced with {} (size guard)", () => {
    const { engine } = makeEngine();
    const oversize = { huge: "x".repeat(COORDINATION_STORE_LIMITS.MAX_INTENT_BYTES + 100) };
    const row = engine.heartbeat({ sessionId: "alpha-1", meta: oversize });
    expect(row.meta_json).toBe("{}");
  });

  it("throws on empty sessionId", () => {
    const { engine } = makeEngine();
    expect(() => engine.heartbeat({ sessionId: "" })).toThrow(/sessionId/);
  });
});

// ── prune (janitor) ─────────────────────────────────────────────────────────

describe("CoordinationStoreEngine.prune", () => {
  it("removes expired claims + stale presence; returns counts", () => {
    const { engine, setNow } = makeEngine(1_000);
    engine.claim({ ...SAMPLE_CLAIM, resourcePath: "/expires-soon.ts", ttlMs: 1_000 });
    // ttl must outlive the time-advance below — set well past PRESENCE_TTL_MS so the second
    // claim is still live when we prune, otherwise the test asserts the wrong purge count.
    engine.claim({ ...SAMPLE_CLAIM, resourcePath: "/lives-on.ts", ttlMs: 10 * COORDINATION_STORE_LIMITS.DEFAULT_PRESENCE_TTL_MS });
    engine.heartbeat({ sessionId: "alpha-old" }); // 1_000
    setNow(1_000 + COORDINATION_STORE_LIMITS.DEFAULT_PRESENCE_TTL_MS + 10);
    engine.heartbeat({ sessionId: "bravo-new" });

    const pruneRes = engine.prune();
    expect(pruneRes.claimsPurged).toBe(1);
    expect(pruneRes.presencePurged).toBe(1);
    expect(engine.liveClaims().length).toBe(1);
    expect(engine.activeSessions().length).toBe(1);
  });

  it("prune accepts an explicit now override", () => {
    const { engine } = makeEngine(1_000);
    engine.claim({ ...SAMPLE_CLAIM, resourcePath: "/r.ts", ttlMs: 500 });
    const pruneRes = engine.prune(10_000); // far past expiry
    expect(pruneRes.claimsPurged).toBe(1);
  });
});

// ── migrateFromJson ─────────────────────────────────────────────────────────

describe("CoordinationStoreEngine.migrateFromJson", () => {
  it("seeds the DB from a valid WORK_CLAIMS.json fixture (full schema)", () => {
    const fixturePath = path.join(tmpRoot, "work-claims.json");
    const fixture = {
      schemaVersion: 2,
      updatedAt: "2026-05-13T03:48:43.809Z",
      claims: {
        "H:/prism/mcp-server/data/milestones/HOOK-SYNERGY-MS0.json": {
          kind: "file",
          resource: "H:/prism/mcp-server/data/milestones/HOOK-SYNERGY-MS0.json",
          file_path: "H:/prism/mcp-server/data/milestones/HOOK-SYNERGY-MS0.json",
          basename: "HOOK-SYNERGY-MS0.json",
          by: "DESKTOP--21572",
          session_id: "DESKTOP--21572",
          hostname: "DESKTOP-N7MI1VB",
          pid: 21572,
          at: "2026-05-13T03:48:43.809Z",
        },
      },
    };
    fs.writeFileSync(fixturePath, JSON.stringify(fixture), "utf8");

    const { engine } = makeEngine();
    const res = engine.migrateFromJson(fixturePath);
    expect(res.rowsRead).toBe(1);
    expect(res.rowsUpserted).toBe(1);
    expect(res.rowsSkipped).toBe(0);
    expect(engine.allClaims().length).toBe(1);

    const claim = engine.allClaims()[0];
    expect(claim.resource_path).toBe("H:/prism/mcp-server/data/milestones/HOOK-SYNERGY-MS0.json");
    expect(claim.session_id).toBe("DESKTOP--21572");
    expect(claim.hostname).toBe("DESKTOP-N7MI1VB");
    expect(claim.pid).toBe(21572);
    expect(claim.claimed_at).toBe(Date.parse("2026-05-13T03:48:43.809Z"));
  });

  it("is idempotent — re-running the migration produces the same final state", () => {
    const fixturePath = path.join(tmpRoot, "work-claims.json");
    fs.writeFileSync(fixturePath, JSON.stringify({
      claims: { "/x.ts": { session_id: "alpha", at: "2026-05-13T00:00:00.000Z" } },
    }), "utf8");
    const { engine } = makeEngine();
    engine.migrateFromJson(fixturePath);
    engine.migrateFromJson(fixturePath);
    expect(engine.allClaims().length).toBe(1);
  });

  it("falls back to `by` field when session_id is missing", () => {
    const fixturePath = path.join(tmpRoot, "work-claims.json");
    fs.writeFileSync(fixturePath, JSON.stringify({
      claims: { "/x.ts": { by: "alpha-fallback", at: "2026-05-13T00:00:00.000Z" } },
    }), "utf8");
    const { engine } = makeEngine();
    const res = engine.migrateFromJson(fixturePath);
    expect(res.rowsUpserted).toBe(1);
    expect(engine.allClaims()[0].session_id).toBe("alpha-fallback");
  });

  it("skips entries with no session_id or `by` field", () => {
    const fixturePath = path.join(tmpRoot, "work-claims.json");
    fs.writeFileSync(fixturePath, JSON.stringify({
      claims: { "/x.ts": { hostname: "h", pid: 1 } },
    }), "utf8");
    const { engine } = makeEngine();
    const res = engine.migrateFromJson(fixturePath);
    expect(res.rowsRead).toBe(1);
    expect(res.rowsSkipped).toBe(1);
    expect(res.rowsUpserted).toBe(0);
    expect(res.warnings.length).toBeGreaterThan(0);
    expect(engine.allClaims().length).toBe(0);
  });

  it("returns a warning + empty result for a missing source file", () => {
    const { engine } = makeEngine();
    const res = engine.migrateFromJson(path.join(tmpRoot, "does-not-exist.json"));
    expect(res.rowsRead).toBe(0);
    expect(res.warnings.length).toBe(1);
    expect(res.warnings[0]).toContain("read_failed");
  });

  it("returns a warning for malformed JSON", () => {
    const fixturePath = path.join(tmpRoot, "work-claims.json");
    fs.writeFileSync(fixturePath, "{not valid json", "utf8");
    const { engine } = makeEngine();
    const res = engine.migrateFromJson(fixturePath);
    expect(res.warnings[0]).toContain("parse_failed");
  });

  it("returns a warning when the `claims` key is missing", () => {
    const fixturePath = path.join(tmpRoot, "work-claims.json");
    fs.writeFileSync(fixturePath, JSON.stringify({ schemaVersion: 2 }), "utf8");
    const { engine } = makeEngine();
    const res = engine.migrateFromJson(fixturePath);
    expect(res.warnings[0]).toBe("missing_claims_key");
  });
});

// ── spanning configurations (the variability floor) ─────────────────────────

describe("CoordinationStoreEngine spanning fixtures", () => {
  it("handles 3 distinct resource shapes (file, dir, generic resource name)", () => {
    const { engine } = makeEngine();
    const shapes = [
      { resourcePath: "H:/prism/mcp-server/src/engines/Foo.ts", intent: "edit file" },
      { resourcePath: "H:/prism/mcp-server/data/milestones", intent: "lock directory" },
      { resourcePath: "milestone:HOOK-SYNERGY-MS0", intent: "claim milestone" },
    ];
    for (let i = 0; i < shapes.length; i++) {
      const r = engine.claim({
        ...SAMPLE_CLAIM,
        sessionId: `s-${i}`,
        resourcePath: shapes[i].resourcePath,
        intent: shapes[i].intent,
      });
      expect(r.acquired).toBe(true);
    }
    expect(engine.liveClaims().length).toBe(3);
  });

  it("handles 3 distinct hostnames in presence (Linux/Windows/MacOS-ish patterns)", () => {
    const { engine } = makeEngine();
    engine.heartbeat({ sessionId: "alpha-1", hostname: "DESKTOP-N7MI1VB" });
    engine.heartbeat({ sessionId: "bravo-2", hostname: "ubuntu-build-01" });
    engine.heartbeat({ sessionId: "charlie-3", hostname: "macmini.local" });
    const all = engine.activeSessions();
    expect(all.length).toBe(3);
    expect(all.map((r) => r.hostname).sort()).toEqual([
      "DESKTOP-N7MI1VB",
      "macmini.local",
      "ubuntu-build-01",
    ]);
  });

  it("survives a high-contention burst of 60 simultaneous claims (no row loss)", () => {
    const { engine } = makeEngine();
    // 6 fleet chats × 10 ops each — same magnitude as the real-world contention
    // the H8 unit was designed to eliminate.
    const N_CHATS = 6;
    const N_OPS = 10;
    let acquired = 0;
    for (let chat = 0; chat < N_CHATS; chat++) {
      for (let op = 0; op < N_OPS; op++) {
        const r = engine.claim({
          ...SAMPLE_CLAIM,
          sessionId: `chat-${chat}`,
          resourcePath: `/file-${chat}-${op}.ts`,
        });
        if (r.acquired) acquired++;
      }
    }
    expect(acquired).toBe(N_CHATS * N_OPS);
    expect(engine.liveClaims().length).toBe(N_CHATS * N_OPS);
  });

  it("on-disk WAL mode actually persists rows across engine re-open", () => {
    const dbPath = path.join(tmpRoot, "coord.db");
    const e1 = new CoordinationStoreEngine({ dbPath });
    e1.claim(SAMPLE_CLAIM);
    e1.close();

    const e2 = new CoordinationStoreEngine({ dbPath });
    const found = e2.findClaim(SAMPLE_CLAIM.resourcePath);
    expect(found?.session_id).toBe(SAMPLE_CLAIM.sessionId);
    const health = e2.health();
    expect(health.journalMode.toLowerCase()).toBe("wal");
    e2.close();
  });
});

// ── claim isolation between sessions ────────────────────────────────────────

describe("CoordinationStoreEngine claim isolation", () => {
  it("two sessions can hold claims on different resources simultaneously", () => {
    const { engine } = makeEngine();
    engine.claim({ ...SAMPLE_CLAIM, resourcePath: "/a.ts", sessionId: "alpha" });
    engine.claim({ ...SAMPLE_CLAIM, resourcePath: "/b.ts", sessionId: "bravo" });
    expect(engine.liveClaims().length).toBe(2);
  });

  it("release by session A does not affect session B's claim on a different file", () => {
    const { engine } = makeEngine();
    engine.claim({ ...SAMPLE_CLAIM, resourcePath: "/a.ts", sessionId: "alpha" });
    engine.claim({ ...SAMPLE_CLAIM, resourcePath: "/b.ts", sessionId: "bravo" });
    engine.release({ resourcePath: "/a.ts", sessionId: "alpha" });
    expect(engine.findClaim("/b.ts")?.session_id).toBe("bravo");
  });
});
