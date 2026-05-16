/**
 * MemoryConflictResolverEngine.test.ts — OBSIDIAN-INTELLIGENCE-MS3/D3.
 *
 * Hermetic: PRISM_MEMORY_CONFLICT_DIR + PRISM_MEMORY_CONFLICT_FROZEN_TIME
 * are pointed at a unique temp dir / fixed clock per test and the prior
 * env values are SAVED + RESTORED (not unconditionally deleted — the D4
 * env-clobber per-file-scrutiny lesson). The simulated 2-chat race matrix
 * is the D3 exit-condition: it must produce a conflict file with the
 * correct policy-selected winner.
 *
 * Determinism is load-bearing (audit replay): the exact-ts tiebreak
 * cases below test BOTH orientations (greater-id is incoming vs greater-id
 * is existing) so a reversed or role-only tiebreak rule FAILS the suite.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { randomBytes } from "crypto";
import {
  sanitizeKey,
  hashContent,
  detectConflict,
  resolveConflict,
  memoryConflictResolverEngine,
  MEMORY_CONFLICT_SCHEMA_VERSION,
  MEMORY_CONFLICT_ENGINE_VERSION,
  MemoryWriteSchema,
  ConflictPolicySchema,
  type MemoryWrite,
} from "../engines/MemoryConflictResolverEngine.js";

let tmpDir: string;
let prevDir: string | undefined;
let prevFrozen: string | undefined;
let prevLockTimeout: string | undefined;

beforeEach(() => {
  prevDir = process.env.PRISM_MEMORY_CONFLICT_DIR;
  prevFrozen = process.env.PRISM_MEMORY_CONFLICT_FROZEN_TIME;
  prevLockTimeout = process.env.PRISM_MEMORY_CONFLICT_LOCK_TIMEOUT_MS;
  delete process.env.PRISM_MEMORY_CONFLICT_LOCK_TIMEOUT_MS;
  tmpDir = path.join(
    os.tmpdir(),
    `prism-mcr-${Date.now()}-${randomBytes(8).toString("hex")}`,
  );
  process.env.PRISM_MEMORY_CONFLICT_DIR = tmpDir;
  process.env.PRISM_MEMORY_CONFLICT_FROZEN_TIME = "2026-05-16T09:00:00.000Z";
});

afterEach(() => {
  if (prevDir === undefined) delete process.env.PRISM_MEMORY_CONFLICT_DIR;
  else process.env.PRISM_MEMORY_CONFLICT_DIR = prevDir;
  if (prevFrozen === undefined) delete process.env.PRISM_MEMORY_CONFLICT_FROZEN_TIME;
  else process.env.PRISM_MEMORY_CONFLICT_FROZEN_TIME = prevFrozen;
  if (prevLockTimeout === undefined) delete process.env.PRISM_MEMORY_CONFLICT_LOCK_TIMEOUT_MS;
  else process.env.PRISM_MEMORY_CONFLICT_LOCK_TIMEOUT_MS = prevLockTimeout;
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {
    /* best-effort */
  }
});

const w = (over: Partial<MemoryWrite> = {}): MemoryWrite => ({
  agent: "claude-aaaaaaaa",
  sessionId: "aaaaaaaa",
  content: "version A\nline 2",
  ts: "2026-05-16T04:00:00.000Z",
  ...over,
});

describe("sanitizeKey", () => {
  it("passes a clean key through", () => {
    expect(sanitizeKey("feedback_x")).toBe("feedback_x");
  });
  it("strips a single .md suffix (conflict file adds .diff.md itself)", () => {
    expect(sanitizeKey("feedback_x.md")).toBe("feedback_x");
  });
  it("reduces a path to its basename (no traversal out of conflicts/)", () => {
    expect(sanitizeKey("a/b/c.md")).toBe("c");
    expect(sanitizeKey("a\\b\\c")).toBe("c");
  });
  it("throws on empty / whitespace", () => {
    expect(() => sanitizeKey("")).toThrow(/non-empty/);
    expect(() => sanitizeKey("   ")).toThrow(/non-empty/);
  });
  it("throws on `.` / `..` after basename reduction", () => {
    expect(() => sanitizeKey("..")).toThrow(/unsafe value/);
    expect(() => sanitizeKey("foo/..")).toThrow(/unsafe value/);
    expect(() => sanitizeKey(".md")).toThrow(/unsafe value/);
  });
  it("throws on unsafe characters (space, colon, unicode)", () => {
    expect(() => sanitizeKey("a b")).toThrow(/unsafe characters/);
    expect(() => sanitizeKey("a:b")).toThrow(/unsafe characters/);
    expect(() => sanitizeKey("café")).toThrow(/unsafe characters/);
  });
  it("accepts a key exactly at the 200-char limit, rejects 201", () => {
    expect(sanitizeKey("x".repeat(200))).toBe("x".repeat(200));
    expect(() => sanitizeKey("x".repeat(201))).toThrow(/too long/);
  });
  it("throws on non-string input", () => {
    // @ts-expect-error intentional bad input
    expect(() => sanitizeKey(null)).toThrow(/non-empty/);
  });
});

describe("hashContent", () => {
  it("is deterministic and 64 hex chars", () => {
    const h = hashContent("hello");
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(hashContent("hello")).toBe(h);
  });
  it("differs for different content", () => {
    expect(hashContent("a")).not.toBe(hashContent("b"));
  });
  it("is defined for empty string", () => {
    expect(hashContent("")).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("detectConflict — classification", () => {
  it("flags a real concurrent conflict (diff content, in window, diff agents)", () => {
    const r = detectConflict({
      key: "k1",
      existing: w({ agent: "claude-aaaaaaaa", content: "A" }),
      incoming: w({ agent: "claude-bbbbbbbb", content: "B", ts: "2026-05-16T04:00:05.000Z" }),
    });
    expect(r.conflict).toBe(true);
    expect(r.reason).toBe("concurrent");
    expect(r.deltaMs).toBe(5000);
    expect(r.existingHash).toBe(hashContent("A"));
    expect(r.incomingHash).toBe(hashContent("B"));
  });
  it("identical content is NOT a conflict (idempotent re-write / mirror echo)", () => {
    const r = detectConflict({
      key: "k1",
      existing: w({ agent: "claude-aaaaaaaa", content: "same" }),
      incoming: w({ agent: "claude-bbbbbbbb", content: "same", ts: "2026-05-16T04:00:01.000Z" }),
    });
    expect(r.conflict).toBe(false);
    expect(r.reason).toBe("identical-content");
    expect(r.winner).toBeNull();
  });
  it("BOTH-empty content from diff agents is identical-content (hash short-circuits author)", () => {
    const r = detectConflict({
      key: "k1",
      existing: w({ agent: "claude-aaaaaaaa", content: "" }),
      incoming: w({ agent: "claude-bbbbbbbb", content: "", ts: "2026-05-16T04:00:01.000Z" }),
    });
    expect(r.conflict).toBe(false);
    expect(r.reason).toBe("identical-content");
  });
  it("diff content OUTSIDE window IS persisted as a conflict (reason superseded — data-loss invariant)", () => {
    const r = detectConflict({
      key: "k1",
      existing: w({ agent: "claude-aaaaaaaa", content: "A", ts: "2026-05-16T04:00:00.000Z" }),
      incoming: w({ agent: "claude-bbbbbbbb", content: "B", ts: "2026-05-16T04:05:00.000Z" }),
      windowMs: 30000,
    });
    expect(r.conflict).toBe(true);
    expect(r.reason).toBe("superseded");
    expect(r.deltaMs).toBe(300000);
    expect(r.winnerRole).toBe("incoming"); // last-writer default, later ts
  });
  it("same agent is NOT a cross-chat conflict, even far outside the window (author precedence)", () => {
    const r = detectConflict({
      key: "k1",
      existing: w({ agent: "claude-aaaaaaaa", content: "A", ts: "2026-05-16T04:00:00.000Z" }),
      incoming: w({ agent: "claude-aaaaaaaa", content: "B", ts: "2026-05-16T04:10:00.000Z" }),
    });
    expect(r.conflict).toBe(false);
    expect(r.reason).toBe("same-author"); // NOT "superseded" — author wins precedence
  });
  it("empty existing vs non-empty incoming IS a conflict (emptied memo)", () => {
    const r = detectConflict({
      key: "k1",
      existing: w({ agent: "claude-aaaaaaaa", content: "" }),
      incoming: w({ agent: "claude-bbbbbbbb", content: "restored", ts: "2026-05-16T04:00:01.000Z" }),
    });
    expect(r.conflict).toBe(true);
    expect(r.reason).toBe("concurrent");
  });
});

describe("detectConflict — windowMs boundary (> not >=)", () => {
  it("deltaMs EXACTLY == windowMs is INSIDE → concurrent", () => {
    const r = detectConflict({
      key: "k",
      existing: w({ agent: "claude-aaaaaaaa", content: "A", ts: "2026-05-16T04:00:00.000Z" }),
      incoming: w({ agent: "claude-bbbbbbbb", content: "B", ts: "2026-05-16T04:00:30.000Z" }),
      windowMs: 30000,
    });
    expect(r.deltaMs).toBe(30000);
    expect(r.reason).toBe("concurrent");
  });
  it("deltaMs == windowMs + 1 is OUTSIDE → superseded", () => {
    const r = detectConflict({
      key: "k",
      existing: w({ agent: "claude-aaaaaaaa", content: "A", ts: "2026-05-16T04:00:00.000Z" }),
      incoming: w({ agent: "claude-bbbbbbbb", content: "B", ts: "2026-05-16T04:00:30.001Z" }),
      windowMs: 30000,
    });
    expect(r.deltaMs).toBe(30001);
    expect(r.reason).toBe("superseded");
  });
});

describe("detectConflict — winner selection + tiebreak determinism", () => {
  it("last-writer: later ts wins (incoming)", () => {
    const r = detectConflict({
      key: "k",
      existing: w({ agent: "claude-aaaaaaaa", content: "A", ts: "2026-05-16T04:00:00.000Z" }),
      incoming: w({ agent: "claude-bbbbbbbb", content: "B", ts: "2026-05-16T04:00:03.000Z" }),
      policy: "last-writer",
    });
    expect(r.winnerRole).toBe("incoming");
    expect(r.winner?.content).toBe("B");
  });
  it("first-writer: earlier ts wins (existing)", () => {
    const r = detectConflict({
      key: "k",
      existing: w({ agent: "claude-aaaaaaaa", content: "A", ts: "2026-05-16T04:00:00.000Z" }),
      incoming: w({ agent: "claude-bbbbbbbb", content: "B", ts: "2026-05-16T04:00:03.000Z" }),
      policy: "first-writer",
    });
    expect(r.winnerRole).toBe("existing");
    expect(r.winner?.content).toBe("A");
  });
  // Determinism: the tiebreak is by AGENT ID, not by role. These two
  // pairs each invert which ROLE holds the greater id, so a reversed or
  // role-only tiebreak rule cannot pass both.
  it("last-writer tie → GREATER id wins, when greater id is INCOMING", () => {
    const r = detectConflict({
      key: "k",
      existing: w({ agent: "claude-aaaaaaaa", content: "A", ts: "2026-05-16T04:00:00.000Z" }),
      incoming: w({ agent: "claude-bbbbbbbb", content: "B", ts: "2026-05-16T04:00:00.000Z" }),
      policy: "last-writer",
    });
    expect(r.deltaMs).toBe(0);
    expect(r.winnerRole).toBe("incoming"); // bbbb > aaaa
  });
  it("last-writer tie → GREATER id wins, when greater id is EXISTING", () => {
    const r = detectConflict({
      key: "k",
      existing: w({ agent: "claude-zzzzzzzz", content: "A", ts: "2026-05-16T04:00:00.000Z" }),
      incoming: w({ agent: "claude-bbbbbbbb", content: "B", ts: "2026-05-16T04:00:00.000Z" }),
      policy: "last-writer",
    });
    expect(r.winnerRole).toBe("existing"); // zzzz > bbbb → proves id-driven, not role-driven
  });
  it("first-writer tie → LESSER id wins, when lesser id is EXISTING", () => {
    const r = detectConflict({
      key: "k",
      existing: w({ agent: "claude-aaaaaaaa", content: "A", ts: "2026-05-16T04:00:00.000Z" }),
      incoming: w({ agent: "claude-bbbbbbbb", content: "B", ts: "2026-05-16T04:00:00.000Z" }),
      policy: "first-writer",
    });
    expect(r.winnerRole).toBe("existing"); // aaaa < bbbb
  });
  it("first-writer tie → LESSER id wins, when lesser id is INCOMING", () => {
    const r = detectConflict({
      key: "k",
      existing: w({ agent: "claude-zzzzzzzz", content: "A", ts: "2026-05-16T04:00:00.000Z" }),
      incoming: w({ agent: "claude-bbbbbbbb", content: "B", ts: "2026-05-16T04:00:00.000Z" }),
      policy: "first-writer",
    });
    expect(r.winnerRole).toBe("incoming"); // bbbb < zzzz → proves id-driven, not role-driven
  });
  it("human-arbitrate: conflict true but NO auto-winner", () => {
    const r = detectConflict({
      key: "k",
      existing: w({ agent: "claude-aaaaaaaa", content: "A" }),
      incoming: w({ agent: "claude-bbbbbbbb", content: "B", ts: "2026-05-16T04:00:02.000Z" }),
      policy: "human-arbitrate",
    });
    expect(r.conflict).toBe(true);
    expect(r.winner).toBeNull();
    expect(r.winnerRole).toBeNull();
  });
  it("defaults: window 30000, policy last-writer", () => {
    const r = detectConflict({
      key: "k",
      existing: w({ agent: "claude-aaaaaaaa", content: "A" }),
      incoming: w({ agent: "claude-bbbbbbbb", content: "B", ts: "2026-05-16T04:00:10.000Z" }),
    });
    expect(r.windowMs).toBe(30000);
    expect(r.policy).toBe("last-writer");
    expect(r.reason).toBe("concurrent");
  });
});

describe("detectConflict — fail-loud", () => {
  it("throws on unparseable existing ts", () => {
    expect(() =>
      detectConflict({
        key: "k",
        existing: w({ ts: "not-a-date" }),
        incoming: w({ agent: "claude-bbbbbbbb", content: "B" }),
      }),
    ).toThrow(/existing ts/);
  });
  it("throws on loose-but-numeric ts (strict ISO required)", () => {
    expect(() =>
      detectConflict({
        key: "k",
        existing: w({ ts: "2026" }),
        incoming: w({ agent: "claude-bbbbbbbb", content: "B" }),
      }),
    ).toThrow(/strict ISO-8601/);
  });
  it("throws on unparseable incoming ts", () => {
    expect(() =>
      detectConflict({
        key: "k",
        existing: w(),
        incoming: w({ agent: "claude-bbbbbbbb", content: "B", ts: "garbage" }),
      }),
    ).toThrow(/incoming ts/);
  });
  it("throws on windowMs <= 0 / NaN / Infinity", () => {
    const mk = (windowMs: number) =>
      detectConflict({
        key: "k",
        existing: w(),
        incoming: w({ agent: "claude-bbbbbbbb", content: "B" }),
        windowMs,
      });
    expect(() => mk(0)).toThrow(/positive finite/);
    expect(() => mk(-1)).toThrow(/positive finite/);
    expect(() => mk(Number.NaN)).toThrow(/positive finite/);
    expect(() => mk(Number.POSITIVE_INFINITY)).toThrow(/positive finite/);
  });
  it("strict schema rejects an extra key on a write", () => {
    expect(() =>
      detectConflict({
        key: "k",
        // @ts-expect-error intentional extra key
        existing: { ...w(), bogus: 1 },
        incoming: w({ agent: "claude-bbbbbbbb" }),
      }),
    ).toThrow();
  });
});

describe("resolveConflict — persistence", () => {
  it("no conflict → nothing written, dir not created", () => {
    const r = resolveConflict({
      key: "nk",
      existing: w({ content: "same" }),
      incoming: w({ agent: "claude-bbbbbbbb", content: "same", ts: "2026-05-16T04:00:01.000Z" }),
    });
    expect(r.written).toBe(false);
    expect(r.degraded).toBe(false);
    expect(r.file).toBeNull();
    expect(r.sectionsInFile).toBe(0);
    expect(fs.existsSync(tmpDir)).toBe(false);
  });

  it("lock timeout → record PRESERVED to a unique spill file, NOT lost (data-loss invariant)", () => {
    // Hold the per-key lock with a FRESH lockfile (age < LOCK_STALE_MS so
    // it can't be stolen) and shrink the wait budget so the resolver
    // times out fast instead of blocking for 90s.
    process.env.PRISM_MEMORY_CONFLICT_LOCK_TIMEOUT_MS = "60";
    fs.mkdirSync(tmpDir, { recursive: true });
    const lockPath = path.join(tmpDir, "spillk.diff.md.lock");
    fs.writeFileSync(lockPath, `999999 ${new Date().toISOString()}`);
    try {
      const r = resolveConflict({
        key: "spillk",
        existing: w({ agent: "claude-aaaaaaaa", content: "VICTIM-A" }),
        incoming: w({ agent: "claude-bbbbbbbb", content: "VICTIM-B", ts: "2026-05-16T04:00:02.000Z" }),
      });
      // The conflict is NEVER lost — it lands in a unique spill file.
      expect(r.written).toBe(true);
      expect(r.degraded).toBe(true);
      expect(r.file).toMatch(/^spillk\.diff\.locktimeout-\d+-\d+\.md$/);
      expect(r.file).not.toBe("spillk.diff.md");
      const spill = fs.readFileSync(path.join(tmpDir, r.file as string), "utf8");
      expect(spill).toContain("VICTIM-A");
      expect(spill).toContain("VICTIM-B");
      expect(spill).toContain("schemaVersion: 1.0.0");
      // The canonical file was NOT written (the lock owner still holds it).
      expect(fs.existsSync(path.join(tmpDir, "spillk.diff.md"))).toBe(false);
    } finally {
      fs.rmSync(lockPath, { force: true });
    }
  });

  it("simulated 2-chat race → conflict file with correct winner (D3 exit)", () => {
    const r = resolveConflict({
      key: "feedback_race",
      existing: w({ agent: "claude-aaaaaaaa", content: "chat-A wrote this", ts: "2026-05-16T04:00:00.000Z" }),
      incoming: w({ agent: "claude-bbbbbbbb", content: "chat-B wrote that", ts: "2026-05-16T04:00:04.000Z" }),
      policy: "last-writer",
    });
    expect(r.written).toBe(true);
    expect(r.degraded).toBe(false);
    expect(r.file).toBe("feedback_race.diff.md");
    expect(r.reason).toBe("concurrent");
    expect(r.winnerRole).toBe("incoming");
    const onDisk = fs.readFileSync(path.join(tmpDir, "feedback_race.diff.md"), "utf8");
    expect(onDisk).toContain("schemaVersion: 1.0.0");
    expect(onDisk).toContain("key: feedback_race");
    expect(onDisk).toContain("chat-A wrote this");
    expect(onDisk).toContain("chat-B wrote that");
    expect(onDisk).toContain("winner: `incoming` (agent `claude-bbbbbbbb`)");
    // Frozen-time determinism IS verified on disk (audit-replay contract).
    expect(onDisk).toContain("firstDetectedAt: 2026-05-16T09:00:00.000Z");
    expect(onDisk).toContain("## Conflict @ 2026-05-16T09:00:00.000Z");
    expect(r.sectionsInFile).toBe(1);
  });

  it("first-writer race → on-disk winner line names EXISTING", () => {
    const r = resolveConflict({
      key: "fw_race",
      existing: w({ agent: "claude-aaaaaaaa", content: "kept", ts: "2026-05-16T04:00:00.000Z" }),
      incoming: w({ agent: "claude-bbbbbbbb", content: "discarded", ts: "2026-05-16T04:00:05.000Z" }),
      policy: "first-writer",
    });
    expect(r.winnerRole).toBe("existing");
    const onDisk = fs.readFileSync(path.join(tmpDir, "fw_race.diff.md"), "utf8");
    expect(onDisk).toContain("winner: `existing` (agent `claude-aaaaaaaa`)");
    expect(onDisk).toContain("reason: `concurrent`");
  });

  it("superseded (outside window) is ALSO persisted (data-loss invariant)", () => {
    const r = resolveConflict({
      key: "supk",
      existing: w({ agent: "claude-aaaaaaaa", content: "older", ts: "2026-05-16T04:00:00.000Z" }),
      incoming: w({ agent: "claude-bbbbbbbb", content: "newer", ts: "2026-05-16T04:30:00.000Z" }),
    });
    expect(r.written).toBe(true);
    expect(r.reason).toBe("superseded");
    const onDisk = fs.readFileSync(path.join(tmpDir, "supk.diff.md"), "utf8");
    expect(onDisk).toContain("older");
    expect(onDisk).toContain("newer");
    expect(onDisk).toContain("reason: `superseded`");
  });

  it("file basename only — no host path leak (D4 lesson)", () => {
    const r = resolveConflict({
      key: "leaktest",
      existing: w({ content: "A" }),
      incoming: w({ agent: "claude-bbbbbbbb", content: "B", ts: "2026-05-16T04:00:01.000Z" }),
    });
    expect(r.file).toBe("leaktest.diff.md");
    expect(r.file).not.toContain("/");
    expect(r.file).not.toContain("\\");
    expect(r.file).not.toContain(tmpDir);
  });

  it("append-only: a 2nd conflict on the same key preserves the 1st's CONTENT", () => {
    const a = resolveConflict({
      key: "appendk",
      existing: w({ agent: "claude-aaaaaaaa", content: "FIRST-existing" }),
      incoming: w({ agent: "claude-bbbbbbbb", content: "FIRST-incoming", ts: "2026-05-16T04:00:02.000Z" }),
    });
    expect(a.sectionsInFile).toBe(1);
    // Advance the frozen clock before the 2nd write — proves the header
    // `firstDetectedAt` is STABLE across appends (the 1st writer's time)
    // while the new section carries the new time.
    process.env.PRISM_MEMORY_CONFLICT_FROZEN_TIME = "2026-05-16T11:00:00.000Z";
    const b = resolveConflict({
      key: "appendk",
      existing: w({ agent: "claude-cccccccc", content: "SECOND-existing", ts: "2026-05-16T05:00:00.000Z" }),
      incoming: w({ agent: "claude-dddddddd", content: "SECOND-incoming", ts: "2026-05-16T05:00:03.000Z" }),
    });
    expect(b.sectionsInFile).toBe(2);
    const onDisk = fs.readFileSync(path.join(tmpDir, "appendk.diff.md"), "utf8");
    // 1st section's content survives the 2nd append (not clobbered).
    expect(onDisk).toContain("FIRST-existing");
    expect(onDisk).toContain("FIRST-incoming");
    expect(onDisk).toContain("SECOND-existing");
    expect(onDisk).toContain("SECOND-incoming");
    // Exactly one frontmatter header (not re-emitted on append), pinned
    // to the FIRST writer's frozen time — not rewritten to 11:00.
    expect((onDisk.match(/^schemaVersion: /gm) || []).length).toBe(1);
    expect((onDisk.match(/^firstDetectedAt: /gm) || []).length).toBe(1);
    expect(onDisk).toContain("firstDetectedAt: 2026-05-16T09:00:00.000Z");
    expect(onDisk).not.toContain("firstDetectedAt: 2026-05-16T11:00:00.000Z");
    // Both section headings carry their own write-time.
    expect(onDisk).toContain("## Conflict @ 2026-05-16T09:00:00.000Z");
    expect(onDisk).toContain("## Conflict @ 2026-05-16T11:00:00.000Z");
    expect((onDisk.match(/^<!-- prism:conflict-section -->$/gm) || []).length).toBe(2);
  });

  it("token-checked release frees its OWN lock (no .lock leak after resolve)", () => {
    resolveConflict({
      key: "lockfreed",
      existing: w({ agent: "claude-aaaaaaaa", content: "A" }),
      incoming: w({ agent: "claude-bbbbbbbb", content: "B", ts: "2026-05-16T04:00:01.000Z" }),
    });
    // The conflict file persists; its sidecar lock must be gone (the
    // token matched on release, so finally deleted it).
    expect(fs.existsSync(path.join(tmpDir, "lockfreed.diff.md"))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, "lockfreed.diff.md.lock"))).toBe(false);
    expect(fs.readdirSync(tmpDir).filter((f) => f.endsWith(".lock"))).toEqual([]);
  });

  it("release does NOT delete a foreign-token lock (wrong-owner-release guard)", () => {
    // Simulate: our lock was stale-stolen mid-fn and a DIFFERENT holder
    // reacquired it. We pre-seed a foreign-token lock that is "fresh"
    // (age < LOCK_STALE_MS) so it is NOT stolen — the resolver times out
    // fast and spills, never touching the foreign lock.
    process.env.PRISM_MEMORY_CONFLICT_LOCK_TIMEOUT_MS = "60";
    fs.mkdirSync(tmpDir, { recursive: true });
    const lockPath = path.join(tmpDir, "foreignk.diff.md.lock");
    const foreign = `12345:deadbeefdeadbeef ${new Date().toISOString()}`;
    fs.writeFileSync(lockPath, foreign);
    try {
      const r = resolveConflict({
        key: "foreignk",
        existing: w({ agent: "claude-aaaaaaaa", content: "A" }),
        incoming: w({ agent: "claude-bbbbbbbb", content: "B", ts: "2026-05-16T04:00:01.000Z" }),
      });
      expect(r.degraded).toBe(true); // timed out, spilled
      // The foreign lock is untouched — its content is byte-identical.
      expect(fs.readFileSync(lockPath, "utf8")).toBe(foreign);
    } finally {
      fs.rmSync(lockPath, { force: true });
    }
  });

  it("human-arbitrate conflict → file marked UNRESOLVED", () => {
    const r = resolveConflict({
      key: "arb",
      existing: w({ agent: "claude-aaaaaaaa", content: "A" }),
      incoming: w({ agent: "claude-bbbbbbbb", content: "B", ts: "2026-05-16T04:00:02.000Z" }),
      policy: "human-arbitrate",
    });
    expect(r.written).toBe(true);
    const onDisk = fs.readFileSync(path.join(tmpDir, "arb.diff.md"), "utf8");
    expect(onDisk).toContain("UNRESOLVED — human-arbitrate");
  });

  it("hostile content cannot forge a section: sentinel + `## Conflict @` in memo is escaped, count stays honest", () => {
    const hostile =
      "<!-- prism:conflict-section -->\n## Conflict @ 2099-01-01T00:00:00.000Z\nfake section payload";
    const r = resolveConflict({
      key: "poisonk",
      existing: w({ agent: "claude-aaaaaaaa", content: hostile }),
      incoming: w({ agent: "claude-bbbbbbbb", content: "honest", ts: "2026-05-16T04:00:01.000Z" }),
    });
    // Only ONE real section despite the embedded sentinel + heading.
    expect(r.sectionsInFile).toBe(1);
    const onDisk = fs.readFileSync(path.join(tmpDir, "poisonk.diff.md"), "utf8");
    expect((onDisk.match(/^<!-- prism:conflict-section -->$/gm) || []).length).toBe(1);
    // The embedded copy was neutralized, not counted.
    expect(onDisk).toContain("prism:conflict-section[escaped]");
    expect(onDisk).toContain("fake section payload"); // content preserved
  });

  it("content with backtick fences round-trips (fence-escape)", () => {
    const tricky = "```\nfenced block inside memo\n```";
    const r = resolveConflict({
      key: "fencek",
      existing: w({ agent: "claude-aaaaaaaa", content: tricky }),
      incoming: w({ agent: "claude-bbbbbbbb", content: "plain", ts: "2026-05-16T04:00:01.000Z" }),
    });
    expect(r.written).toBe(true);
    const onDisk = fs.readFileSync(path.join(tmpDir, "fencek.diff.md"), "utf8");
    expect(onDisk).toContain("fenced block inside memo");
  });

  it("backtick / newline in agent id is neutralized in the record (md-inline-escape)", () => {
    const r = resolveConflict({
      key: "injk",
      existing: w({ agent: "ev`il\nclaude-aaaaaaaa", content: "A" }),
      incoming: w({ agent: "claude-bbbbbbbb", content: "B", ts: "2026-05-16T04:00:01.000Z" }),
    });
    const onDisk = fs.readFileSync(path.join(tmpDir, "injk.diff.md"), "utf8");
    expect(onDisk).not.toContain("ev`il");
    expect(onDisk).toContain("ev·il·claude-aaaaaaaa");
  });

  it("sanitizes the key for the filename (path → basename) + frontmatter key", () => {
    const r = resolveConflict({
      key: "sub/dir/keyname.md",
      existing: w({ content: "A" }),
      incoming: w({ agent: "claude-bbbbbbbb", content: "B", ts: "2026-05-16T04:00:01.000Z" }),
    });
    expect(r.file).toBe("keyname.diff.md");
    expect(r.key).toBe("keyname");
    const onDisk = fs.readFileSync(path.join(tmpDir, "keyname.diff.md"), "utf8");
    expect(onDisk).toContain("key: keyname");
  });
});

describe("schemas + singleton", () => {
  it("ConflictPolicySchema accepts the 3 policies, rejects others", () => {
    expect(ConflictPolicySchema.parse("last-writer")).toBe("last-writer");
    expect(ConflictPolicySchema.parse("first-writer")).toBe("first-writer");
    expect(ConflictPolicySchema.parse("human-arbitrate")).toBe("human-arbitrate");
    expect(() => ConflictPolicySchema.parse("newest")).toThrow();
  });
  it("MemoryWriteSchema is strict + requires the 4 fields", () => {
    expect(() => MemoryWriteSchema.parse({ agent: "a", sessionId: "s", content: "" })).toThrow();
    const parsed = MemoryWriteSchema.parse({
      agent: "a",
      sessionId: "s",
      content: "",
      ts: "2026-05-16T04:00:00Z",
    });
    expect(parsed).toEqual({ agent: "a", sessionId: "s", content: "", ts: "2026-05-16T04:00:00Z" });
    expect(() =>
      MemoryWriteSchema.parse({
        agent: "a",
        sessionId: "s",
        content: "",
        ts: "2026-05-16T04:00:00Z",
        extra: 1,
      }),
    ).toThrow();
  });
  it("singleton is frozen + exposes versions + the 4 ops", () => {
    expect(Object.isFrozen(memoryConflictResolverEngine)).toBe(true);
    expect(memoryConflictResolverEngine.version).toBe(MEMORY_CONFLICT_ENGINE_VERSION);
    expect(memoryConflictResolverEngine.schemaVersion).toBe(MEMORY_CONFLICT_SCHEMA_VERSION);
    expect(typeof memoryConflictResolverEngine.detectConflict).toBe("function");
    expect(typeof memoryConflictResolverEngine.resolveConflict).toBe("function");
    expect(typeof memoryConflictResolverEngine.sanitizeKey).toBe("function");
    expect(typeof memoryConflictResolverEngine.hashContent).toBe("function");
  });
  it("versions are 1.0.0", () => {
    expect(MEMORY_CONFLICT_SCHEMA_VERSION).toBe("1.0.0");
    expect(MEMORY_CONFLICT_ENGINE_VERSION).toBe("1.0.0");
  });
});
