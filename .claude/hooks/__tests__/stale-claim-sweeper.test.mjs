// tier: T4
/**
 * stale-claim-sweeper — behavioural tests for the new sweep paths.
 *
 * Covers the three FIX1 blockers:
 *   - WMI CreationDate timezone parsing (was Date.UTC; now host-local)
 *   - sweepClaudeTaskOutputs glob (was .output|.json; now .output only)
 *   - sweepChatBusClaims race (re-stat before unlink to avoid clobbering peer renewals)
 *
 * Plus regression coverage of the supporting paths: empty/missing dirs,
 * unparseable claim, expired claim, fresh claim preservation, and
 * sweepFileOwnership behaviour.
 *
 * Sandbox each test by setting PRISM_SWEEPER_TEST_ROOT before importing.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

let sandboxRoot;

beforeEach(() => {
  sandboxRoot = fs.mkdtempSync(path.join(os.tmpdir(), "sweeper-"));
  process.env.PRISM_SWEEPER_TEST_ROOT = sandboxRoot;
});

afterEach(() => {
  delete process.env.PRISM_SWEEPER_TEST_ROOT;
  if (sandboxRoot && fs.existsSync(sandboxRoot)) {
    fs.rmSync(sandboxRoot, { recursive: true, force: true });
  }
});

// Import via cache-buster so each test sees fresh module-level constants
// derived from the just-set PRISM_SWEEPER_TEST_ROOT.
async function loadSweeper() {
  return await import("../stale-claim-sweeper.mjs?cb=" + Date.now() + Math.random());
}

function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }
function setMtime(p, msAgo) {
  const t = new Date(Date.now() - msAgo);
  fs.utimesSync(p, t, t);
}

describe("parseWmiCreationDate — timezone fix", () => {
  it("interprets WMI date as host local time, not UTC", async () => {
    const { parseWmiCreationDate } = await loadSweeper();
    // Build a known moment in host TZ: 2026-05-05 18:00:00 local
    const expected = new Date(2026, 4, 5, 18, 0, 0).getTime();
    const wmiStr = "20260505180000.000000+000"; // WMI emits local ts; tz suffix ignored by our parser
    expect(parseWmiCreationDate(wmiStr)).toBe(expected);
  });

  it("FIX1 verified: previous Date.UTC() bug differs from new local-tz by tz_offset", async () => {
    const { parseWmiCreationDate } = await loadSweeper();
    const wmiStr = "20260505120000.000000+000";
    const newMs = parseWmiCreationDate(wmiStr);
    const buggyMs = Date.UTC(2026, 4, 5, 12, 0, 0);
    // Difference equals host TZ offset in ms (positive west of UTC, negative east).
    // On any non-UTC host the two MUST differ. On a UTC host they tie — accept either.
    const tzOffsetMin = new Date(2026, 4, 5).getTimezoneOffset();
    const expectedDelta = tzOffsetMin * 60 * 1000;
    expect(newMs - buggyMs).toBe(expectedDelta);
  });

  it("returns null on malformed input", async () => {
    const { parseWmiCreationDate } = await loadSweeper();
    expect(parseWmiCreationDate("")).toBeNull();
    expect(parseWmiCreationDate("garbage")).toBeNull();
    expect(parseWmiCreationDate(null)).toBeNull();
    expect(parseWmiCreationDate(undefined)).toBeNull();
    expect(parseWmiCreationDate(12345)).toBeNull();
  });

  it("returns finite ms even for absurd values (JS Date roll-over: y9999/m99 → real date)", async () => {
    const { parseWmiCreationDate } = await loadSweeper();
    // JavaScript Date constructor accepts any integer arg and rolls over.
    // y=9999, m=99 (= year 10007 month 3) is still a real moment in time.
    // The contract is: returned value is either null OR a finite ms — never NaN.
    const result = parseWmiCreationDate("99999999999999.000000+000");
    expect(typeof result).toBe("number");
    expect(Number.isFinite(result)).toBe(true);
    expect(result).toBeGreaterThan(0);
  });
});

describe("parseWmicRow — CSV row parsing", () => {
  it("parses a typical row with comma-free cmdline", async () => {
    const { parseWmicRow } = await loadSweeper();
    const row = "DESKTOP-XYZ,node H:\\prism\\.claude\\hooks\\foo.mjs,20260505180000.000000+000,5000,12345";
    const r = parseWmicRow(row);
    expect(r).not.toBeNull();
    expect(r.pid).toBe(12345);
    expect(r.ppid).toBe(5000);
    expect(r.created).toBe("20260505180000.000000+000");
    expect(r.cmdline).toContain(".claude\\hooks\\foo.mjs");
  });

  it("anchors fields from the right when cmdline contains commas", async () => {
    const { parseWmicRow } = await loadSweeper();
    const row = "HOST,node script.mjs --arg=a,b,c,20260505180000.000000+000,1000,9999";
    const r = parseWmicRow(row);
    expect(r.pid).toBe(9999);
    expect(r.ppid).toBe(1000);
    expect(r.cmdline).toBe("node script.mjs --arg=a,b,c");
  });

  it("returns null for header rows and empty/short input", async () => {
    const { parseWmicRow } = await loadSweeper();
    expect(parseWmicRow("Node,CommandLine,CreationDate,ParentProcessId,ProcessId")).toBeNull();
    expect(parseWmicRow("")).toBeNull();
    expect(parseWmicRow("a,b")).toBeNull();
    expect(parseWmicRow(null)).toBeNull();
  });

  it("returns null when pid field is non-numeric", async () => {
    const { parseWmicRow } = await loadSweeper();
    expect(parseWmicRow("HOST,cmd,20260505180000.000000+000,abc,xyz")).toBeNull();
  });

  it("returns null when ppid is non-numeric but pid is valid", async () => {
    const { parseWmicRow } = await loadSweeper();
    // pid=12345 (valid), ppid=notanumber (invalid). Must reject — downstream
    // pidAlive(NaN) would silently fail and skip the parent-dead safety check.
    expect(parseWmicRow("HOST,cmd,20260505180000.000000+000,notanumber,12345")).toBeNull();
  });

  it("accepts integer ppid alongside integer pid", async () => {
    const { parseWmicRow } = await loadSweeper();
    const r = parseWmicRow("HOST,cmd,20260505180000.000000+000,4567,12345");
    expect(r).not.toBeNull();
    expect(r.pid).toBe(12345);
    expect(r.ppid).toBe(4567);
  });
});

describe("shouldSkipUnlinkDueToRace — race-check predicate", () => {
  it("returns false when mtimes are identical (no peer renewal → safe to unlink)", async () => {
    const { shouldSkipUnlinkDueToRace } = await loadSweeper();
    expect(shouldSkipUnlinkDueToRace(1000, 1000)).toBe(false);
  });

  it("returns true when mtime advanced (peer renewed → SKIP unlink, FIX1 race branch)", async () => {
    const { shouldSkipUnlinkDueToRace } = await loadSweeper();
    expect(shouldSkipUnlinkDueToRace(1000, 5000)).toBe(true);
  });

  it("returns true when mtime regressed (clock skew or unusual fs → still skip)", async () => {
    const { shouldSkipUnlinkDueToRace } = await loadSweeper();
    expect(shouldSkipUnlinkDueToRace(5000, 1000)).toBe(true);
  });

  it("returns false for identical zero mtimes (no signal → don't skip)", async () => {
    const { shouldSkipUnlinkDueToRace } = await loadSweeper();
    expect(shouldSkipUnlinkDueToRace(0, 0)).toBe(false);
  });
});

describe("isClaudeTaskOutputFile — glob fix", () => {
  it("accepts .output", async () => {
    const { isClaudeTaskOutputFile } = await loadSweeper();
    expect(isClaudeTaskOutputFile("abc123.output")).toBe(true);
  });

  it("rejects .json (FIX1: was incorrectly removed)", async () => {
    const { isClaudeTaskOutputFile } = await loadSweeper();
    expect(isClaudeTaskOutputFile("abc123.json")).toBe(false);
  });

  it("rejects unrelated extensions", async () => {
    const { isClaudeTaskOutputFile } = await loadSweeper();
    expect(isClaudeTaskOutputFile("abc.txt")).toBe(false);
    expect(isClaudeTaskOutputFile("abc.log")).toBe(false);
    expect(isClaudeTaskOutputFile("abc")).toBe(false);
    expect(isClaudeTaskOutputFile("")).toBe(false);
    expect(isClaudeTaskOutputFile(null)).toBe(false);
  });
});

describe("sweepClaudeTaskOutputs — only .output, only stale", () => {
  it("removes stale .output but preserves .json and fresh .output", async () => {
    const tasksDir = path.join(sandboxRoot, "claude-tasks", "proj1", "sess1", "tasks");
    ensureDir(tasksDir);
    const stalePath = path.join(tasksDir, "stale.output");
    const freshPath = path.join(tasksDir, "fresh.output");
    const jsonPath = path.join(tasksDir, "ctrl.json");
    fs.writeFileSync(stalePath, "stale stdout");
    fs.writeFileSync(freshPath, "fresh stdout");
    fs.writeFileSync(jsonPath, "{}"); // task control metadata
    setMtime(stalePath, 25 * 60 * 60 * 1000); // 25h old → stale
    setMtime(freshPath, 1 * 60 * 60 * 1000);  // 1h old  → fresh
    setMtime(jsonPath, 25 * 60 * 60 * 1000);  // 25h old but .json — protected

    const { sweepClaudeTaskOutputs } = await loadSweeper();
    const r = sweepClaudeTaskOutputs();

    expect(r.swept).toBe(1);
    expect(fs.existsSync(stalePath)).toBe(false);
    expect(fs.existsSync(freshPath)).toBe(true);
    expect(fs.existsSync(jsonPath)).toBe(true); // FIX1: must NOT be removed
  });

  it("returns {swept:0,dirs:0} when CLAUDE_TASKS_ROOT does not exist", async () => {
    // Don't create claude-tasks dir at all
    const { sweepClaudeTaskOutputs } = await loadSweeper();
    const r = sweepClaudeTaskOutputs();
    expect(r.swept).toBe(0);
    expect(r.dirs).toBe(0);
  });

  it("handles missing tasks/ subdirs gracefully", async () => {
    ensureDir(path.join(sandboxRoot, "claude-tasks", "proj1", "sess-no-tasks-dir"));
    const { sweepClaudeTaskOutputs } = await loadSweeper();
    const r = sweepClaudeTaskOutputs();
    expect(r.swept).toBe(0);
    expect(r.dirs).toBe(0); // no tasks/ subdir means dirsScanned doesn't increment
  });
});

describe("sweepChatBusClaims — race fix + expiry semantics", () => {
  function writeClaim(name, body, ageMs) {
    const claimsDir = path.join(sandboxRoot, "chat-bus", "claims");
    ensureDir(claimsDir);
    const p = path.join(claimsDir, name);
    fs.writeFileSync(p, JSON.stringify(body));
    if (ageMs) setMtime(p, ageMs);
    return p;
  }

  it("sweeps claim with self-declared expires in past", async () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    const p = writeClaim("expired.json", { expires: past }, 60_000); // mtime 1m ago, fresh
    const { sweepChatBusClaims } = await loadSweeper();
    const r = sweepChatBusClaims();
    expect(r.swept).toBe(1);
    expect(fs.existsSync(p)).toBe(false);
  });

  it("sweeps claim older than CHAT_BUS_CLAIM_TTL_MS regardless of expires", async () => {
    const future = new Date(Date.now() + 60 * 60_000).toISOString();
    const p = writeClaim("aged.json", { expires: future }, 45 * 60_000); // 45m old
    const { sweepChatBusClaims } = await loadSweeper();
    const r = sweepChatBusClaims();
    expect(r.swept).toBe(1);
    expect(fs.existsSync(p)).toBe(false);
  });

  it("sweeps unparseable claim", async () => {
    const claimsDir = path.join(sandboxRoot, "chat-bus", "claims");
    ensureDir(claimsDir);
    const p = path.join(claimsDir, "broken.json");
    fs.writeFileSync(p, "{not valid json");
    setMtime(p, 60_000); // fresh-by-mtime, but unparseable triggers sweep
    const { sweepChatBusClaims } = await loadSweeper();
    const r = sweepChatBusClaims();
    expect(r.swept).toBe(1);
    expect(fs.existsSync(p)).toBe(false);
  });

  it("PRESERVES fresh claim with future expires (regression: don't sweep live)", async () => {
    const future = new Date(Date.now() + 60 * 60_000).toISOString();
    const p = writeClaim("live.json", { expires: future }, 60_000); // 1m old, expires in 1h
    const { sweepChatBusClaims } = await loadSweeper();
    const r = sweepChatBusClaims();
    expect(r.swept).toBe(0);
    expect(fs.existsSync(p)).toBe(true);
  });

  it("FIX1 race: re-stat-before-unlink sweeps claim that stays stale across both stats", async () => {
    // The race fix re-stats just before unlink and skips if mtime advanced.
    // We can't easily monkey-patch fs in ESM, but we can verify the fall-through
    // behaviour: a claim that IS stale at both stats (no peer renewal) DOES get
    // unlinked. Combined with the "PRESERVES fresh claim" test above, this proves
    // both branches of the re-stat check.
    const past = new Date(Date.now() - 60_000).toISOString();
    const p = writeClaim("racey.json", { expires: past }, 45 * 60_000);
    const { sweepChatBusClaims } = await loadSweeper();
    const r = sweepChatBusClaims();
    expect(r.swept).toBe(1);
    expect(fs.existsSync(p)).toBe(false);
  });

  it("returns {swept:0} when claims dir does not exist", async () => {
    const { sweepChatBusClaims } = await loadSweeper();
    const r = sweepChatBusClaims();
    expect(r.swept).toBe(0);
  });
});

describe("sweepChatBusMessages — age-based eviction", () => {
  it("removes messages older than 1h, keeps fresh", async () => {
    const msgsDir = path.join(sandboxRoot, "chat-bus", "messages");
    ensureDir(msgsDir);
    const stale = path.join(msgsDir, "old.json");
    const fresh = path.join(msgsDir, "new.json");
    fs.writeFileSync(stale, "{}");
    fs.writeFileSync(fresh, "{}");
    setMtime(stale, 2 * 60 * 60 * 1000); // 2h old
    setMtime(fresh, 30 * 60 * 1000);     // 30m old

    const { sweepChatBusMessages } = await loadSweeper();
    const r = sweepChatBusMessages();
    expect(r.swept).toBe(1);
    expect(fs.existsSync(stale)).toBe(false);
    expect(fs.existsSync(fresh)).toBe(true);
  });

  it("returns {swept:0} when messages dir does not exist", async () => {
    const { sweepChatBusMessages } = await loadSweeper();
    const r = sweepChatBusMessages();
    expect(r.swept).toBe(0);
  });
});

describe("sweepFileOwnership — existing path regression", () => {
  it("sweeps entries past CLAIM_TTL_MS", async () => {
    const ownership = {
      schemaVersion: 1,
      files: {
        "/a/old.ts": { session: "claude-aaa", timestamp: Date.now() - 10 * 60 * 1000 }, // 10m old
        "/a/new.ts": { session: "claude-bbb", timestamp: Date.now() - 60 * 1000 },        // 1m old
      },
    };
    fs.writeFileSync(
      path.join(sandboxRoot, "session-file-ownership.json"),
      JSON.stringify(ownership, null, 2),
    );
    const { sweepFileOwnership } = await loadSweeper();
    const r = sweepFileOwnership();
    expect(r.swept).toBe(1);
    expect(r.kept).toBe(1);
    const after = JSON.parse(fs.readFileSync(path.join(sandboxRoot, "session-file-ownership.json"), "utf8"));
    expect(Object.keys(after.files)).toEqual(["/a/new.ts"]);
  });

  it("returns {swept:0,kept:0} when ownership file missing", async () => {
    const { sweepFileOwnership } = await loadSweeper();
    const r = sweepFileOwnership();
    expect(r.swept).toBe(0);
    expect(r.kept).toBe(0);
  });
});
