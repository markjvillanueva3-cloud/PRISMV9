/**
 * golfCronLock.test.ts — CLEANUP-MS0 / U-CLEANUP-E2
 *
 * Tests the per-cron lockfile helper `.claude/helpers/golf-cron-lock.mjs`
 * that gates the 5 registered daily golf hygiene crons in
 * `state/shared/golf-cron-registry.json`.
 *
 * Coverage: pure helpers (evaluateLock / readLockSafe) with reference
 * decisions, isPidAlive sanity-check, the full acquire/release lifecycle on
 * a real temp filesystem (happy path + corrupt + dead-holder + wedged-holder
 * + race + bad-shape + concurrent-acquire), the registry shape itself
 * (so the bootstrap skill can rely on it), and the CLI status/unlock
 * subcommands via subprocess (exit codes + JSON output).
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, existsSync,
  readdirSync,
} from "node:fs";
import { join, resolve, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { execFileSync, spawnSync } from "node:child_process";

import {
  isPidAlive,
  readLockSafe,
  evaluateLock,
  acquire,
  listLocks,
  STALE_GRACE_MULT,
  SCHEMA_VERSION,
  // @ts-expect-error — .mjs helper, no type declarations
} from "../../../.claude/helpers/golf-cron-lock.mjs";

const HOUR_MS = 3_600_000;
const NOW = Date.parse("2026-05-14T18:00:00.000Z");
const HELPER = resolve(dirname(fileURLToPath(import.meta.url)), "../../../.claude/helpers/golf-cron-lock.mjs");

// A PID guaranteed not to exist on any sane host (max signed 32-bit int).
const DEAD_PID = 0x7fffffff;

// ─── isPidAlive (sanity) ──────────────────────────────────────────────────
describe("isPidAlive", () => {
  it("returns true for the test process's own pid (kill 0 succeeds)", () => {
    expect(isPidAlive(process.pid)).toBe(true);
  });

  it("returns false for a pid that doesn't exist (ESRCH)", () => {
    expect(isPidAlive(DEAD_PID)).toBe(false);
  });

  it("returns false for non-positive / non-integer pids", () => {
    expect(isPidAlive(0)).toBe(false);
    expect(isPidAlive(-1)).toBe(false);
    expect(isPidAlive(NaN)).toBe(false);
    expect(isPidAlive(1.5)).toBe(false);
    expect(isPidAlive("100" as any)).toBe(false);
    expect(isPidAlive(null as any)).toBe(false);
  });
});

// ─── readLockSafe ─────────────────────────────────────────────────────────
describe("readLockSafe", () => {
  it("returns null when the lockfile is absent (via hook seam)", () => {
    expect(readLockSafe("/no/such/lock", { existsSyncFn: () => false })).toBeNull();
  });

  it("returns the parsed body for valid JSON", () => {
    const body = readLockSafe("/v", {
      existsSyncFn: () => true,
      readFileSyncFn: () => JSON.stringify({ pid: 100, startedAt: "X", expectedDurationMs: 1000 }),
    });
    expect(body).toEqual({ pid: 100, startedAt: "X", expectedDurationMs: 1000 });
  });

  it("returns { corrupt:true, raw } for unparseable JSON (never throws)", () => {
    const body = readLockSafe("/v", {
      existsSyncFn: () => true,
      readFileSyncFn: () => "{not json",
    });
    expect(body).toEqual({ corrupt: true, raw: "{not json" });
  });

  it("returns null when read throws", () => {
    const body = readLockSafe("/v", {
      existsSyncFn: () => true,
      readFileSyncFn: () => { throw new Error("EIO"); },
    });
    expect(body).toBeNull();
  });
});

// ─── evaluateLock (pure decision) ─────────────────────────────────────────
describe("evaluateLock", () => {
  const alive = () => true;
  const dead = () => false;

  it("no-lock when body is null", () => {
    const d = evaluateLock(null, NOW, alive);
    expect(d.steal).toBe(false);
    expect(d.reason).toBe("no-lock");
  });

  it("corrupt-json steals", () => {
    const d = evaluateLock({ corrupt: true, raw: "..." }, NOW, alive);
    expect(d.steal).toBe(true);
    expect(d.reason).toBe("corrupt-json");
  });

  it("bad-shape steals (missing pid / startedAt / expectedDurationMs)", () => {
    expect(evaluateLock({ startedAt: "X", expectedDurationMs: 100 }, NOW, alive).reason).toBe("bad-shape");
    expect(evaluateLock({ pid: 100, expectedDurationMs: 100 }, NOW, alive).reason).toBe("bad-shape");
    expect(evaluateLock({ pid: 100, startedAt: "X" }, NOW, alive).reason).toBe("bad-shape");
    expect(evaluateLock({ pid: "abc", startedAt: new Date(NOW).toISOString(), expectedDurationMs: 100 }, NOW, alive).reason).toBe("bad-shape");
  });

  it("holder-dead steals when PID is not alive", () => {
    const body = { pid: DEAD_PID, startedAt: new Date(NOW - 1000).toISOString(), expectedDurationMs: 60000 };
    const d = evaluateLock(body, NOW, dead);
    expect(d.steal).toBe(true);
    expect(d.reason).toBe("holder-dead");
    expect(d.holder.pid).toBe(DEAD_PID);
  });

  it("live + within grace = keep", () => {
    const body = { pid: 100, startedAt: new Date(NOW - 1000).toISOString(), expectedDurationMs: 60000 };
    const d = evaluateLock(body, NOW, alive);
    expect(d.steal).toBe(false);
    expect(d.reason).toBe("live");
  });

  it("holder-wedged steals at exactly STALE_GRACE_MULT * expected + 1ms", () => {
    const expected = 1000;
    const cutoff = expected * STALE_GRACE_MULT;
    // exactly at the boundary → still live (the engine uses strict >)
    const atBoundary = { pid: 100, startedAt: new Date(NOW - cutoff).toISOString(), expectedDurationMs: expected };
    expect(evaluateLock(atBoundary, NOW, alive).steal).toBe(false);
    // 1ms over → wedged
    const justOver = { pid: 100, startedAt: new Date(NOW - cutoff - 1).toISOString(), expectedDurationMs: expected };
    const d = evaluateLock(justOver, NOW, alive);
    expect(d.steal).toBe(true);
    expect(d.reason).toBe("holder-wedged");
    expect(d.holder.pid).toBe(100);
  });

  it("STALE_GRACE_MULT is exported as a positive integer (registry consumers depend on it)", () => {
    expect(Number.isInteger(STALE_GRACE_MULT)).toBe(true);
    expect(STALE_GRACE_MULT).toBeGreaterThan(1);
  });
});

// ─── acquire / release lifecycle (real temp filesystem) ───────────────────
describe("acquire / release lifecycle", () => {
  let lockDir: string;
  beforeEach(() => { lockDir = mkdtempSync(join(tmpdir(), "e2-cronlock-")); });
  afterEach(() => { rmSync(lockDir, { recursive: true, force: true }); });

  it("creates a lockfile with our pid + startedAt + duration, then release removes it", () => {
    const r = acquire("golf-test", 60000, { lockDir, pid: 4242, now: NOW });
    expect(r.ok).toBe(true);
    const lp = join(lockDir, "golf-test.lock");
    expect(existsSync(lp)).toBe(true);
    const body = JSON.parse(readFileSync(lp, "utf-8"));
    expect(body.pid).toBe(4242);
    expect(body.expectedDurationMs).toBe(60000);
    expect(body.startedAt).toBe(new Date(NOW).toISOString());
    expect(body.schemaVersion).toBe(SCHEMA_VERSION);
    // release removes the file and reports true
    expect((r as any).release()).toBe(true);
    expect(existsSync(lp)).toBe(false);
  });

  it("a second acquire while the first is live returns ok:false with the live holder", () => {
    const first = acquire("golf-x", 60000, { lockDir, pid: process.pid, now: NOW });
    expect(first.ok).toBe(true);
    const second = acquire("golf-x", 60000, { lockDir, pid: 9999, now: NOW + 1000 });
    expect(second.ok).toBe(false);
    expect((second as any).heldBy.pid).toBe(process.pid);
    expect((second as any).reason).toBe("live");
    (first as any).release();
  });

  it("steals a lock whose holder PID is dead", () => {
    // pre-seed a lockfile with a guaranteed-dead PID
    writeFileSync(join(lockDir, "golf-y.lock"),
      JSON.stringify({ pid: DEAD_PID, startedAt: new Date(NOW - 1000).toISOString(), expectedDurationMs: 60000, schemaVersion: 1 }));
    const r = acquire("golf-y", 60000, { lockDir, pid: 5555, now: NOW });
    expect(r.ok).toBe(true);
    expect((r as any).stolenFromPid).toBe(DEAD_PID);
    expect((r as any).stolenReason).toBe("holder-dead");
    // body is now ours
    const body = JSON.parse(readFileSync(join(lockDir, "golf-y.lock"), "utf-8"));
    expect(body.pid).toBe(5555);
  });

  it("steals a lock whose holder is past STALE_GRACE_MULT * expectedDurationMs", () => {
    const expected = 1000;
    const startedAt = new Date(NOW - expected * STALE_GRACE_MULT - 1).toISOString();
    writeFileSync(join(lockDir, "golf-w.lock"),
      JSON.stringify({ pid: process.pid, startedAt, expectedDurationMs: expected, schemaVersion: 1 }));
    const r = acquire("golf-w", expected, { lockDir, pid: 6666, now: NOW });
    expect(r.ok).toBe(true);
    expect((r as any).stolenReason).toBe("holder-wedged");
  });

  it("quarantines a corrupt lockfile rather than silently deleting it", () => {
    writeFileSync(join(lockDir, "golf-c.lock"), "{NOT JSON at all");
    const r = acquire("golf-c", 60000, { lockDir, pid: 7777, now: NOW });
    expect(r.ok).toBe(true);
    expect((r as any).stolenReason).toBe("corrupt-json");
    expect((r as any).quarantined).toMatch(/\.corrupt-/);
    // original corrupt bytes preserved (R-N: never silently delete unparseable state)
    expect(readFileSync((r as any).quarantined, "utf-8")).toBe("{NOT JSON at all");
    // and we now own a fresh lock
    expect(existsSync(join(lockDir, "golf-c.lock"))).toBe(true);
  });

  it("release is a safe no-op after the lock was stolen by another acquirer", () => {
    const first = acquire("golf-s", 60000, { lockDir, pid: 1111, now: NOW });
    expect(first.ok).toBe(true);
    // simulate the holder being killed: overwrite with a different pid+timestamp
    writeFileSync(join(lockDir, "golf-s.lock"),
      JSON.stringify({ pid: 2222, startedAt: new Date(NOW + 5000).toISOString(), expectedDurationMs: 60000, schemaVersion: 1 }));
    // first's release notices the body has been replaced and refuses to unlink
    expect((first as any).release()).toBe(false);
    // peer's lock untouched
    const body = JSON.parse(readFileSync(join(lockDir, "golf-s.lock"), "utf-8"));
    expect(body.pid).toBe(2222);
  });

  it("rejects bad ids (empty / illegal chars) without touching the filesystem", () => {
    expect(acquire("", 1000, { lockDir }).ok).toBe(false);
    expect(acquire("with space", 1000, { lockDir }).ok).toBe(false);
    expect(acquire("../escape", 1000, { lockDir }).ok).toBe(false);
    expect(acquire(null as any, 1000, { lockDir }).ok).toBe(false);
    expect(readdirSync(lockDir)).toHaveLength(0);                  // dir was not even created
  });

  it("rejects bad duration (zero / negative / NaN)", () => {
    expect(acquire("golf-d", 0, { lockDir }).ok).toBe(false);
    expect(acquire("golf-d", -100, { lockDir }).ok).toBe(false);
    expect(acquire("golf-d", NaN, { lockDir }).ok).toBe(false);
    expect(acquire("golf-d", Infinity, { lockDir }).ok).toBe(false);
  });

  it("listLocks reports every lockfile with its evaluation verdict", () => {
    // live lock
    acquire("golf-live", 60000, { lockDir, pid: process.pid, now: NOW });
    // dead lock
    writeFileSync(join(lockDir, "golf-dead.lock"),
      JSON.stringify({ pid: DEAD_PID, startedAt: new Date(NOW - 1000).toISOString(), expectedDurationMs: 60000 }));
    // corrupt
    writeFileSync(join(lockDir, "golf-corrupt.lock"), "{bad");
    // non-.lock file must be ignored
    writeFileSync(join(lockDir, "README.txt"), "ignore me");

    const locks = listLocks({ lockDir, now: NOW });
    const byId = Object.fromEntries(locks.map((l: any) => [l.id, l]));
    expect(Object.keys(byId).sort()).toEqual(["golf-corrupt", "golf-dead", "golf-live"]);
    expect(byId["golf-live"].evaluation.steal).toBe(false);
    expect(byId["golf-dead"].evaluation.reason).toBe("holder-dead");
    expect(byId["golf-corrupt"].evaluation.reason).toBe("corrupt-json");
  });
});

// ─── registry shape (the bootstrap skill relies on this exact shape) ──────
describe("golf-cron-registry.json", () => {
  it("loads at schemaVersion 1 with exactly the 5 documented UTC slots", () => {
    const REG = resolve(dirname(fileURLToPath(import.meta.url)), "../../../state/shared/golf-cron-registry.json");
    const reg = JSON.parse(readFileSync(REG, "utf-8"));
    expect(reg.schemaVersion).toBe(1);
    expect(reg.timeBasis).toBe("UTC");
    expect(reg.lockfileDir).toBe(".cron-locks");
    const times = reg.crons.map((c: any) => c.scheduleUtc).sort();
    expect(times).toEqual(["03:17", "04:23", "05:31", "06:43", "07:53"]);
    // every entry has the load-bearing fields the skill consumes
    for (const c of reg.crons) {
      expect(typeof c.id).toBe("string");
      expect(c.id).toMatch(/^golf-[a-z0-9-]+$/);
      expect(typeof c.cronExpr).toBe("string");
      // 5-field cron, daily at HH:MM
      expect(c.cronExpr.split(/\s+/)).toHaveLength(5);
      expect(typeof c.prompt).toBe("string");
      expect(c.prompt.length).toBeGreaterThan(0);
      expect(Number.isInteger(c.expectedDurationMs)).toBe(true);
      expect(c.expectedDurationMs).toBeGreaterThan(0);
      expect(typeof c.enabled).toBe("boolean");
    }
  });

  it("every cron's scheduleUtc HH:MM matches its cronExpr minute/hour fields", () => {
    const REG = resolve(dirname(fileURLToPath(import.meta.url)), "../../../state/shared/golf-cron-registry.json");
    const reg = JSON.parse(readFileSync(REG, "utf-8"));
    for (const c of reg.crons) {
      const [hh, mm] = c.scheduleUtc.split(":");
      const [minF, hourF] = c.cronExpr.split(/\s+/);
      expect(minF).toBe(String(Number(mm)));                       // strip leading zero
      expect(hourF).toBe(String(Number(hh)));
    }
  });

  it("no two crons share the same scheduleUtc minute (fleet-friendly jitter)", () => {
    const REG = resolve(dirname(fileURLToPath(import.meta.url)), "../../../state/shared/golf-cron-registry.json");
    const reg = JSON.parse(readFileSync(REG, "utf-8"));
    const minutes = reg.crons.map((c: any) => c.scheduleUtc);
    expect(new Set(minutes).size).toBe(minutes.length);
  });

  it("no scheduled minute is :00 or :30 (per the off-mark scheduling doctrine)", () => {
    const REG = resolve(dirname(fileURLToPath(import.meta.url)), "../../../state/shared/golf-cron-registry.json");
    const reg = JSON.parse(readFileSync(REG, "utf-8"));
    for (const c of reg.crons) {
      const mm = Number(c.scheduleUtc.split(":")[1]);
      expect(mm).not.toBe(0);
      expect(mm).not.toBe(30);
    }
  });
});

// ─── CLI subprocess (status / unlock / exit codes) ────────────────────────
describe("CLI subprocess", () => {
  let lockDir: string;
  beforeEach(() => { lockDir = mkdtempSync(join(tmpdir(), "e2-cli-")); });
  afterEach(() => { rmSync(lockDir, { recursive: true, force: true }); });

  it("--help / no args exits 0 and prints usage", () => {
    const out = execFileSync(process.execPath, [HELPER], { encoding: "utf8" });
    expect(out).toContain("golf-cron-lock.mjs");
    expect(out).toContain("status");
    expect(out).toContain("unlock");
  });

  it("status --json over an empty lock dir exits 0 with locks=[]", () => {
    const out = execFileSync(process.execPath, [HELPER, "status", "--json"], {
      encoding: "utf8",
      env: { ...process.env, PRISM_REPO_ROOT: dirname(lockDir) }, // makes DEFAULT_LOCK_DIR point at <tmp>/state/shared/.cron-locks
    });
    const parsed = JSON.parse(out);
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.locks).toEqual([]);
  });

  it("unknown subcommand exits 2", () => {
    const r = spawnSync(process.execPath, [HELPER, "bogus"], { encoding: "utf8" });
    expect(r.status).toBe(2);
    expect((r.stderr || "")).toContain("unknown command");
  });

  it("unlock <id> on a non-existent lock exits 0 with a clear message", () => {
    const r = spawnSync(process.execPath, [HELPER, "unlock", "no-such-id"], {
      encoding: "utf8",
      env: { ...process.env, PRISM_REPO_ROOT: dirname(lockDir) },
    });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("no lock for");
  });

  // Regression-locks P0-1 (the `require("node:fs")` ESM bug). Earlier CLI
  // tests all ran against an EMPTY .cron-locks dir → existsSync short-circuit
  // → default readdirFn was never invoked → ReferenceError was invisible.
  // This test forces a real lockfile through `<tmp>/state/shared/.cron-locks/`
  // so the default readdirSync path actually executes; if anyone ever swaps
  // it back to a `require()`-shaped lazy import, this fails immediately.
  it("regression: status --json over a non-empty .cron-locks dir lists the real lock (forces default readdirFn)", () => {
    const repoRoot = mkdtempSync(join(tmpdir(), "e2-cli-repo-"));
    const cronLocksDir = join(repoRoot, "state", "shared", ".cron-locks");
    mkdirSync(cronLocksDir, { recursive: true });
    // pre-seed a dead-PID lock so listLocks has something to evaluate
    writeFileSync(join(cronLocksDir, "golf-real.lock"),
      JSON.stringify({ pid: DEAD_PID, startedAt: new Date(NOW - 1000).toISOString(), expectedDurationMs: 60000, schemaVersion: 1 }));
    try {
      const out = execFileSync(process.execPath, [HELPER, "status", "--json"], {
        encoding: "utf8",
        env: { ...process.env, PRISM_REPO_ROOT: repoRoot },
      });
      const parsed = JSON.parse(out);
      expect(parsed.locks).toHaveLength(1);
      expect(parsed.locks[0].id).toBe("golf-real");
      expect(parsed.locks[0].evaluation.reason).toBe("holder-dead");
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it("regression: unlock <id> against a real stale lock removes it (exit 0, file gone)", () => {
    const repoRoot = mkdtempSync(join(tmpdir(), "e2-cli-unlock-"));
    const cronLocksDir = join(repoRoot, "state", "shared", ".cron-locks");
    mkdirSync(cronLocksDir, { recursive: true });
    const lp = join(cronLocksDir, "golf-stale.lock");
    writeFileSync(lp,
      JSON.stringify({ pid: DEAD_PID, startedAt: new Date(NOW - 1000).toISOString(), expectedDurationMs: 60000, schemaVersion: 1 }));
    try {
      const r = spawnSync(process.execPath, [HELPER, "unlock", "golf-stale"], {
        encoding: "utf8",
        env: { ...process.env, PRISM_REPO_ROOT: repoRoot },
      });
      expect(r.status).toBe(0);
      expect(r.stdout).toContain("removed");
      expect(existsSync(lp)).toBe(false);
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });
});
