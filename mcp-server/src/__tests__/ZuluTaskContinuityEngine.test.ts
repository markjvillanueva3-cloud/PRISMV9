/**
 * Tests for ZuluTaskContinuityEngine (ZULU/C2-TASK-CONTINUITY)
 *
 * Coverage floor (per comprehensive-build enforcement):
 *   - happy path: checkpoint -> resume round-trip; createdAt/revision/state fidelity
 *   - >=3 failure modes: invalid unit id, corrupted-JSON -> fail-closed,
 *     schemaVersion mismatch -> refuse-write, missing-unit resume
 *   - >=2 adversarial: empty unit, oversize state, NaN/negative now timestamp,
 *     non-object state, circular (non-serializable) state, array state
 *   - stale guard: a >24h record returns stale:true; a fresh one stale:false
 *   - listMidflights: compact summaries, newest-first, no state payload leak
 *
 * Hermetic: every test binds the engine to a unique temp store file via
 * ZuluTaskContinuityEngine.__forTests(path) so suites never touch the real
 * canonical store nor collide with peer chats.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as crypto from "crypto";

import {
  ZuluTaskContinuityEngine,
  zuluTaskContinuityEngine,
  ZULU_CONTINUITY_SCHEMA_VERSION,
  STALE_AFTER_MS,
  MAX_STATE_BYTES,
  type ContinuityRecord,
} from "../engines/ZuluTaskContinuityEngine.js";

const SCRATCH_DIR = path.join(os.tmpdir(), `zulu-continuity-test-${process.pid}-${Date.now()}`);

function freshStorePath(): string {
  return path.join(SCRATCH_DIR, `store-${crypto.randomBytes(8).toString("hex")}.json`);
}

function newEngine(): { engine: ZuluTaskContinuityEngine; storePath: string } {
  const storePath = freshStorePath();
  return { engine: ZuluTaskContinuityEngine.__forTests(storePath), storePath };
}

const UNIT = "ZULU-MS0::U-C2-TASK";
const ISO_NOW = "2026-06-15T12:00:00.000Z";
const CHAT_ID = "claude-test01";

beforeEach(() => {
  fs.mkdirSync(SCRATCH_DIR, { recursive: true });
});

afterEach(() => {
  try {
    fs.rmSync(SCRATCH_DIR, { recursive: true, force: true });
  } catch { /* best-effort cleanup */ }
});

// ===========================================================================
// Happy path
// ===========================================================================

describe("ZuluTaskContinuityEngine -- happy path", () => {
  it("checkpoint then resume round-trips the exact state", () => {
    const { engine } = newEngine();
    const state = { phase: "building", filesTouched: ["a.ts", "b.ts"], nextAction: "wire dispatcher", count: 3 };
    const cp = engine.checkpoint(UNIT, state, { slot: "zulu", chatId: CHAT_ID, now: ISO_NOW });
    expect(cp.ok).toBe(true);
    expect(cp.created).toBe(true);
    expect(cp.record?.unitId).toBe(UNIT);
    expect(cp.record?.revision).toBe(1);

    const r = engine.resume(UNIT, ISO_NOW);
    expect(r.found).toBe(true);
    expect(r.record?.state).toEqual(state); // deep-equal: round-trip fidelity (R9 intent)
    expect(r.record?.writer.slot).toBe("zulu");
    expect(r.record?.writer.chatId).toBe(CHAT_ID);
    expect(r.stale).toBe(false);
    expect(r.ageMs).toBe(0);
  });

  it("persists durably to disk and a fresh engine instance reads it back", () => {
    const storePath = freshStorePath();
    const e1 = ZuluTaskContinuityEngine.__forTests(storePath);
    e1.checkpoint(UNIT, { phase: "testing" }, { now: ISO_NOW });
    expect(fs.existsSync(storePath)).toBe(true);

    // Independent instance bound to same path simulates a different session.
    const e2 = ZuluTaskContinuityEngine.__forTests(storePath);
    const r = e2.resume(UNIT, ISO_NOW);
    expect(r.found).toBe(true);
    expect((r.record?.state as { phase?: string }).phase).toBe("testing");

    // On-disk shape is schema-tagged JSON with the unit row present.
    const onDisk = JSON.parse(fs.readFileSync(storePath, "utf8"));
    expect(onDisk.schemaVersion).toBe(ZULU_CONTINUITY_SCHEMA_VERSION);
    expect(onDisk.records[UNIT].unitId).toBe(UNIT);
  });

  it("re-checkpoint overwrites state, increments revision, preserves createdAt", () => {
    const { engine } = newEngine();
    const first = engine.checkpoint(UNIT, { step: 1 }, { now: "2026-06-15T10:00:00.000Z" });
    expect(first.record?.revision).toBe(1);
    const createdAt = first.record?.createdAt;

    const second = engine.checkpoint(UNIT, { step: 2 }, { now: "2026-06-15T11:00:00.000Z" });
    expect(second.created).toBe(false);
    expect(second.record?.revision).toBe(2);
    expect(second.record?.createdAt).toBe(createdAt); // createdAt is sticky
    expect(second.record?.updatedAt).toBe("2026-06-15T11:00:00.000Z");
    expect((second.record?.state as { step?: number }).step).toBe(2);
  });

  it("clear removes a record; second clear returns false", () => {
    const { engine } = newEngine();
    engine.checkpoint(UNIT, { x: 1 }, { now: ISO_NOW });
    expect(engine.clear(UNIT)).toBe(true);
    expect(engine.resume(UNIT, ISO_NOW).found).toBe(false);
    expect(engine.clear(UNIT)).toBe(false);
  });

  it("the exported singleton resolves a non-empty store path", () => {
    expect(zuluTaskContinuityEngine.getStorePath().length).toBeGreaterThan(0);
  });
});

// ===========================================================================
// listMidflights
// ===========================================================================

describe("ZuluTaskContinuityEngine -- listMidflights", () => {
  it("lists all active midflights newest-first with NO state payload", () => {
    const { engine } = newEngine();
    engine.checkpoint("ZULU-MS0::U-OLD", { detail: "old-payload" }, { slot: "alpha", now: "2026-06-15T08:00:00.000Z" });
    engine.checkpoint("ZULU-MS0::U-NEW", { detail: "new-payload" }, { slot: "bravo", now: "2026-06-15T11:00:00.000Z" });

    const list = engine.listMidflights("2026-06-15T12:00:00.000Z");
    expect(list.ok).toBe(true);
    expect(list.count).toBe(2);
    // Newest (U-NEW) first.
    expect(list.midflights[0].unitId).toBe("ZULU-MS0::U-NEW");
    expect(list.midflights[1].unitId).toBe("ZULU-MS0::U-OLD");
    // Summary carries slot + age + revision, NOT the full state object.
    expect(list.midflights[0].slot).toBe("bravo");
    expect(list.midflights[0].revision).toBe(1);
    expect("state" in (list.midflights[0] as Record<string, unknown>)).toBe(false);
    // Age is computed from updatedAt: U-NEW is 1h old, U-OLD is 4h old.
    expect(list.midflights[0].ageMs).toBe(60 * 60 * 1000);
    expect(list.midflights[1].ageMs).toBe(4 * 60 * 60 * 1000);
  });

  it("returns empty list when no records exist", () => {
    const { engine } = newEngine();
    const list = engine.listMidflights(ISO_NOW);
    expect(list.ok).toBe(true);
    expect(list.count).toBe(0);
    expect(list.midflights).toEqual([]);
  });
});

// ===========================================================================
// Stale guard (>24h)
// ===========================================================================

describe("ZuluTaskContinuityEngine -- stale guard", () => {
  it("flags a record older than 24h as stale on resume", () => {
    const { engine } = newEngine();
    const created = "2026-06-13T12:00:00.000Z"; // >24h before queryNow
    engine.checkpoint(UNIT, { phase: "abandoned" }, { now: created });
    const queryNow = "2026-06-15T12:00:00.000Z"; // 48h later
    const r = engine.resume(UNIT, queryNow);
    expect(r.found).toBe(true);
    expect(r.stale).toBe(true);
    expect(r.ageMs).toBe(48 * 60 * 60 * 1000);
  });

  it("exactly at the 24h boundary is NOT stale; one ms past IS stale", () => {
    const { engine } = newEngine();
    const base = Date.parse("2026-06-15T00:00:00.000Z");
    engine.checkpoint(UNIT, { phase: "edge" }, { now: new Date(base).toISOString() });

    const atBoundary = engine.resume(UNIT, new Date(base + STALE_AFTER_MS).toISOString());
    expect(atBoundary.stale).toBe(false); // age == STALE_AFTER_MS is not > STALE_AFTER_MS

    const pastBoundary = engine.resume(UNIT, new Date(base + STALE_AFTER_MS + 1).toISOString());
    expect(pastBoundary.stale).toBe(true);
  });

  it("listMidflights marks the >24h entry stale too", () => {
    const { engine } = newEngine();
    engine.checkpoint(UNIT, { phase: "x" }, { now: "2026-06-13T00:00:00.000Z" });
    const list = engine.listMidflights("2026-06-15T12:00:00.000Z");
    expect(list.midflights[0].stale).toBe(true);
  });
});

// ===========================================================================
// Failure mode: invalid unit id
// ===========================================================================

describe("ZuluTaskContinuityEngine -- invalid unit id", () => {
  it("rejects a unit id that is not MILESTONE::U-ID (no throw, ok:false)", () => {
    const { engine } = newEngine();
    const cp = engine.checkpoint("not-a-valid-unit", { x: 1 }, { now: ISO_NOW });
    expect(cp.ok).toBe(false);
    expect(cp.error).toMatch(/invalid unit id/);
    expect(cp.record).toBe(undefined);
  });

  it("resume on an invalid unit id returns found:false with an error", () => {
    const { engine } = newEngine();
    const r = engine.resume("lowercase::bad spaces");
    expect(r.found).toBe(false);
    expect(r.error).toMatch(/invalid unit id/);
  });

  it("resume on a well-formed but absent unit id returns found:false with no error", () => {
    const { engine } = newEngine();
    const r = engine.resume("ZULU-MS0::U-NEVER-WRITTEN", ISO_NOW);
    expect(r.found).toBe(false);
    expect(r.error).toBe(undefined);
  });
});

// ===========================================================================
// Failure mode: corrupted JSON -> fail-closed
// ===========================================================================

describe("ZuluTaskContinuityEngine -- corrupted store fails closed", () => {
  it("a corrupt store rotates the file and a checkpoint THROWS (never clobbers)", () => {
    const storePath = freshStorePath();
    fs.mkdirSync(path.dirname(storePath), { recursive: true });
    fs.writeFileSync(storePath, "{ this is not ::: valid json ,,,", "utf8");
    const engine = ZuluTaskContinuityEngine.__forTests(storePath);

    expect(() => engine.checkpoint(UNIT, { x: 1 }, { now: ISO_NOW })).toThrow(/read-only|refusing/i);

    // Corrupt file preserved as .corrupt-* evidence (NOT deleted).
    const corruptSiblings = fs
      .readdirSync(path.dirname(storePath))
      .filter((f) => f.startsWith(path.basename(storePath) + ".corrupt-"));
    expect(corruptSiblings.length).toBeGreaterThanOrEqual(1);
  });

  it("resume on a corrupt store does not throw and reports found:false", () => {
    const storePath = freshStorePath();
    fs.mkdirSync(path.dirname(storePath), { recursive: true });
    fs.writeFileSync(storePath, "}{garbage", "utf8");
    const engine = ZuluTaskContinuityEngine.__forTests(storePath);
    const r = engine.resume(UNIT, ISO_NOW);
    expect(r.found).toBe(false); // read tolerated, no clobber
  });

  it("a store whose shape lacks a records map is read-only (refuse-write)", () => {
    const storePath = freshStorePath();
    fs.mkdirSync(path.dirname(storePath), { recursive: true });
    fs.writeFileSync(storePath, JSON.stringify({ schemaVersion: 1, notRecords: {} }), "utf8");
    const engine = ZuluTaskContinuityEngine.__forTests(storePath);
    expect(() => engine.checkpoint(UNIT, { x: 1 }, { now: ISO_NOW })).toThrow(/refusing|read-only/i);
    const list = engine.listMidflights(ISO_NOW);
    expect(list.readOnly).toBe(true);
    expect(list.reason).toMatch(/missing records map/);
  });
});

// ===========================================================================
// Failure mode: schemaVersion mismatch -> refuse
// ===========================================================================

describe("ZuluTaskContinuityEngine -- schemaVersion mismatch", () => {
  it("a NEWER schemaVersion store goes read-only and checkpoint THROWS", () => {
    const storePath = freshStorePath();
    fs.mkdirSync(path.dirname(storePath), { recursive: true });
    // Simulate a forward-compat peer writing schemaVersion 2.
    fs.writeFileSync(
      storePath,
      JSON.stringify({ schemaVersion: ZULU_CONTINUITY_SCHEMA_VERSION + 1, records: {} }),
      "utf8"
    );
    const engine = ZuluTaskContinuityEngine.__forTests(storePath);
    expect(() => engine.checkpoint(UNIT, { x: 1 }, { now: ISO_NOW })).toThrow(/schema-version mismatch|refusing|read-only/i);

    // The newer file must NOT have been overwritten (clobber prevented).
    const onDisk = JSON.parse(fs.readFileSync(storePath, "utf8"));
    expect(onDisk.schemaVersion).toBe(ZULU_CONTINUITY_SCHEMA_VERSION + 1);
  });

  it("listMidflights surfaces the schema-mismatch reason without throwing", () => {
    const storePath = freshStorePath();
    fs.mkdirSync(path.dirname(storePath), { recursive: true });
    fs.writeFileSync(storePath, JSON.stringify({ schemaVersion: 99, records: {} }), "utf8");
    const engine = ZuluTaskContinuityEngine.__forTests(storePath);
    const list = engine.listMidflights(ISO_NOW);
    expect(list.readOnly).toBe(true);
    expect(list.reason).toMatch(/schema-version mismatch/);
  });
});

// ===========================================================================
// Adversarial inputs
// ===========================================================================

describe("ZuluTaskContinuityEngine -- adversarial inputs", () => {
  it("empty-string unit is rejected (ok:false)", () => {
    const { engine } = newEngine();
    expect(engine.checkpoint("", { x: 1 }, { now: ISO_NOW }).ok).toBe(false);
    expect(engine.clear("")).toBe(false);
  });

  it("oversize state (> MAX_STATE_BYTES) is rejected, nothing written", () => {
    const { engine, storePath } = newEngine();
    const huge = { blob: "x".repeat(MAX_STATE_BYTES + 10) };
    const cp = engine.checkpoint(UNIT, huge, { now: ISO_NOW });
    expect(cp.ok).toBe(false);
    expect(cp.error).toMatch(/too large/);
    expect(fs.existsSync(storePath)).toBe(false); // no partial write
  });

  it("non-object state (number/string/null/array) is rejected", () => {
    const { engine } = newEngine();
    expect(engine.checkpoint(UNIT, 42 as unknown, { now: ISO_NOW }).ok).toBe(false);
    expect(engine.checkpoint(UNIT, "stringy" as unknown, { now: ISO_NOW }).ok).toBe(false);
    expect(engine.checkpoint(UNIT, null as unknown, { now: ISO_NOW }).ok).toBe(false);
    expect(engine.checkpoint(UNIT, [1, 2, 3] as unknown, { now: ISO_NOW }).ok).toBe(false);
  });

  it("circular (non-JSON-serializable) state is rejected without throwing", () => {
    const { engine } = newEngine();
    const circular: Record<string, unknown> = { a: 1 };
    circular.self = circular;
    const cp = engine.checkpoint(UNIT, circular, { now: ISO_NOW });
    expect(cp.ok).toBe(false);
    expect(cp.error).toMatch(/not JSON-serializable/);
  });

  it("NaN / negative / non-string now timestamp is rejected", () => {
    const { engine } = newEngine();
    expect(engine.checkpoint(UNIT, { x: 1 }, { now: "not-a-date" }).ok).toBe(false);
    expect(engine.checkpoint(UNIT, { x: 1 }, { now: "-5000-01-01T00:00:00.000Z" }).ok).toBe(false);
    expect(engine.checkpoint(UNIT, { x: 1 }, { now: NaN as unknown as string }).ok).toBe(false);
  });

  it("functions/undefined props in state are dropped by JSON round-trip (read == persist)", () => {
    const { engine } = newEngine();
    const state = { keep: "yes", fn: () => 1, undef: undefined } as unknown as Record<string, unknown>;
    const cp = engine.checkpoint(UNIT, state, { now: ISO_NOW });
    expect(cp.ok).toBe(true);
    const r = engine.resume(UNIT, ISO_NOW);
    expect(r.record?.state).toEqual({ keep: "yes" }); // fn + undef stripped
  });

  it("a record with a malformed updatedAt is dropped on read (not surfaced)", () => {
    const storePath = freshStorePath();
    fs.mkdirSync(path.dirname(storePath), { recursive: true });
    const bad: Partial<ContinuityRecord> = {
      unitId: UNIT,
      state: { x: 1 },
      writer: { host: "h", pid: 1 },
      createdAt: ISO_NOW,
      updatedAt: "garbage-date",
      revision: 1,
    };
    fs.writeFileSync(storePath, JSON.stringify({ schemaVersion: 1, records: { [UNIT]: bad } }), "utf8");
    const engine = ZuluTaskContinuityEngine.__forTests(storePath);
    expect(engine.resume(UNIT, ISO_NOW).found).toBe(false); // malformed row dropped
  });
});

// ===========================================================================
// Dispatcher round-trip (will fail until the live chat wires prism_session)
// ===========================================================================

describe("ZuluTaskContinuityEngine -- dispatcher round-trip (prism_session, wired)", () => {
  // Wired into sessionDispatcher 2026-06-15 (U-ZULU-CAP): continuity_checkpoint /
  // continuity_resume / continuity_list_midflights route to the zuluTaskContinuityEngine
  // singleton. HERMETIC: the dispatcher singleton binds to the live store path, so this
  // test clears the unit it writes (afterEach) -- it never accretes into the live
  // data/state/zulu-task-continuity.json (scrutiny arm-B P1, 2026-06-15).
  let createdUnit: string | null = null;
  afterEach(async () => {
    if (!createdUnit) return;
    const { zuluTaskContinuityEngine } = await import("../engines/ZuluTaskContinuityEngine.js");
    try { zuluTaskContinuityEngine.clear(createdUnit); } catch { /* read-only store -> nothing to clean */ }
    createdUnit = null;
  });
  it("prism_session routes continuity_checkpoint -> continuity_resume", async () => {
    type Handler = (args: { action: string; params?: Record<string, unknown> }) => Promise<{ content: Array<{ type: "text"; text: string }> }>;
    const { registerSessionDispatcher } = await import("../tools/dispatchers/sessionDispatcher.js");
    let captured: Handler | undefined;
    registerSessionDispatcher({ tool: (_n: string, _d: string, _s: unknown, h: Handler) => { captured = h; } } as never);
    expect(typeof captured).toBe("function");
    const invoke = async (action: string, params: Record<string, unknown>) =>
      JSON.parse((await captured!({ action, params })).content[0].text) as Record<string, never>;

    const unit = "ZULU-MS0::U-RT-" + crypto.randomBytes(4).toString("hex");
    createdUnit = unit; // tracked for afterEach hermetic cleanup (no live-store accretion)
    const cpText = await invoke("continuity_checkpoint", { unit, state: { phase: "rt" }, slot: "zulu" });
    expect(cpText.ok).toBe(true);
    expect((cpText.record as { unitId: string }).unitId).toBe(unit);

    const rsText = await invoke("continuity_resume", { unit });
    expect(rsText.found).toBe(true);
    expect((rsText.record as { state: { phase: string } }).state.phase).toBe("rt");
  });
});

// ===========================================================================
// Cross-process store lock (U-C2-CHECKPOINT-LOCK) -- the lost-update guard that
// wave_loop_step (the engine's first producer) makes reachable across slots.
// ===========================================================================

describe("ZuluTaskContinuityEngine -- cross-process store lock", () => {
  // Fast lock budget so a held-lock test times out in ~ms, not ~1s.
  const fastEngine = (storePath: string) =>
    ZuluTaskContinuityEngine.__forTests(storePath, { retries: 3, retryMs: 1, staleMs: 500 });
  const lockPathOf = (storePath: string) => `${storePath}.lock`;
  const writeLock = (storePath: string, payload: Record<string, unknown>) =>
    fs.writeFileSync(lockPathOf(storePath), JSON.stringify(payload));

  it("normal checkpoint leaves NO leftover lock file (acquire -> write -> release)", () => {
    const { engine, storePath } = newEngine();
    expect(engine.checkpoint(UNIT, { phase: "x" }, { now: ISO_NOW }).ok).toBe(true);
    expect(fs.existsSync(lockPathOf(storePath))).toBe(false);
  });

  it("reaps a STALE-BY-AGE lock (ts older than threshold) and proceeds", () => {
    const { engine, storePath } = newEngine(); // default 30s stale threshold
    fs.mkdirSync(path.dirname(storePath), { recursive: true });
    writeLock(storePath, { pid: process.pid, host: os.hostname(), ts: Date.now() - 10 * 60 * 1000 });
    const cp = engine.checkpoint(UNIT, { phase: "after-reap" }, { now: ISO_NOW });
    expect(cp.ok).toBe(true);
    expect(fs.existsSync(lockPathOf(storePath))).toBe(false); // reaped + released
    expect(engine.resume(UNIT).record?.state).toEqual({ phase: "after-reap" });
  });

  it("reaps a DEAD-PID lock (same host, non-existent pid, FRESH ts) and proceeds", () => {
    const { engine, storePath } = newEngine();
    fs.mkdirSync(path.dirname(storePath), { recursive: true });
    // Fresh ts (NOT stale by age) but an impossible pid on this host -> dead-PID reap path.
    writeLock(storePath, { pid: 2147483647, host: os.hostname(), ts: Date.now() });
    const cp = engine.checkpoint(UNIT, { phase: "dead-pid-reaped" }, { now: ISO_NOW });
    expect(cp.ok).toBe(true);
    expect(fs.existsSync(lockPathOf(storePath))).toBe(false);
  });

  it("a HELD fresh live lock -> checkpoint returns ok:false AND the prior record is UNCHANGED (no lost-update)", () => {
    const { storePath } = newEngine();
    const engine = fastEngine(storePath);
    expect(engine.checkpoint(UNIT, { phase: "v1" }, { now: ISO_NOW }).ok).toBe(true); // rev 1, lock released
    // A live competing holder (this pid is alive, ts fresh -> NOT stale -> not reaped).
    writeLock(storePath, { pid: process.pid, host: os.hostname(), ts: Date.now() });
    const blocked = engine.checkpoint(UNIT, { phase: "v2-should-not-land" }, { now: ISO_NOW });
    expect(blocked.ok).toBe(false);
    expect(blocked.error).toMatch(/could not acquire store lock/);
    // The held record is intact -- the blocked write never clobbered it (resume is lock-free).
    const r = engine.resume(UNIT);
    expect(r.record?.revision).toBe(1);
    expect(r.record?.state).toEqual({ phase: "v1" });
  });

  it("clear() under a HELD fresh live lock THROWS (fail-loud -- boolean has no error channel)", () => {
    const { storePath } = newEngine();
    const engine = fastEngine(storePath);
    expect(engine.checkpoint(UNIT, { phase: "v1" }, { now: ISO_NOW }).ok).toBe(true);
    writeLock(storePath, { pid: process.pid, host: os.hostname(), ts: Date.now() });
    expect(() => engine.clear(UNIT)).toThrow(/could not acquire store lock/);
    expect(engine.resume(UNIT).found).toBe(true); // record still present (clear never ran)
  });

  it("RESPECTS a foreign-host lock with a fresh ts (never kills a live remote holder)", () => {
    const { storePath } = newEngine();
    const engine = fastEngine(storePath);
    fs.mkdirSync(path.dirname(storePath), { recursive: true });
    // Foreign host -> pid liveness is unverifiable; only ts-age can reap it, and ts is fresh.
    writeLock(storePath, { pid: 1, host: "some-other-host-xyz", ts: Date.now() });
    const cp = engine.checkpoint(UNIT, { phase: "should-not-land" }, { now: ISO_NOW });
    expect(cp.ok).toBe(false);
    expect(cp.error).toMatch(/could not acquire store lock/);
    expect(fs.existsSync(lockPathOf(storePath))).toBe(true); // foreign lock left intact
  });

  it("the locked RMW preserves OTHER units' records (read-merge correctness across writers)", () => {
    const { storePath } = newEngine();
    const a = ZuluTaskContinuityEngine.__forTests(storePath);
    const b = ZuluTaskContinuityEngine.__forTests(storePath);
    const U1 = "ZULU-MS0::U-ONE";
    const U2 = "ZULU-MS0::U-TWO";
    expect(a.checkpoint(U1, { who: "a" }, { now: ISO_NOW }).ok).toBe(true);
    expect(b.checkpoint(U2, { who: "b" }, { now: ISO_NOW }).ok).toBe(true);
    // b's write read a's record first and preserved it -- both survive.
    expect(a.resume(U1).record?.state).toEqual({ who: "a" });
    expect(a.resume(U2).record?.state).toEqual({ who: "b" });
  });

  it("reaps a CORRUPT (non-JSON) lock file and proceeds", () => {
    const { engine, storePath } = newEngine();
    fs.mkdirSync(path.dirname(storePath), { recursive: true });
    fs.writeFileSync(lockPathOf(storePath), "}{ not json at all");
    const cp = engine.checkpoint(UNIT, { phase: "after-corrupt-reap" }, { now: ISO_NOW });
    expect(cp.ok).toBe(true);
    expect(engine.resume(UNIT).record?.state).toEqual({ phase: "after-corrupt-reap" });
    expect(fs.existsSync(lockPathOf(storePath))).toBe(false);
  });

  it("reaps a fieldless ({}) lock file and proceeds", () => {
    const { engine, storePath } = newEngine();
    fs.mkdirSync(path.dirname(storePath), { recursive: true });
    fs.writeFileSync(lockPathOf(storePath), "{}");
    const cp = engine.checkpoint(UNIT, { phase: "after-empty-reap" }, { now: ISO_NOW });
    expect(cp.ok).toBe(true);
    expect(fs.existsSync(lockPathOf(storePath))).toBe(false);
  });

  it("back-to-back checkpoints each acquire a fresh nonce + release their OWN lock (no leftover, rev advances)", () => {
    // verify-own-write / verify-on-release exercised across sequential acquisitions:
    // each checkpoint creates a uniquely-nonced lock and cleans up after itself.
    const { engine, storePath } = newEngine();
    expect(engine.checkpoint(UNIT, { v: 1 }, { now: ISO_NOW }).ok).toBe(true);
    expect(engine.checkpoint(UNIT, { v: 2 }, { now: ISO_NOW }).ok).toBe(true);
    expect(engine.resume(UNIT).record?.revision).toBe(2);
    expect(fs.existsSync(lockPathOf(storePath))).toBe(false);
  });
});
