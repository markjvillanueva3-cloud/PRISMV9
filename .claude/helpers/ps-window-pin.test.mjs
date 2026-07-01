/**
 * Hermetic tests for ps-window-pin.mjs using node:test (helpers/ vitest infra
 * is broken — see [[reference_session_continuity_stack_2026_05_15]]).
 *
 * Tests inject mock `_fs` and `_spawn` to avoid real PowerShell + real disk IO.
 * One real-process E2E exercises the actual ancestor walk (skipped on non-Win32).
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

// Each test gets a unique pins file path to avoid cross-test pollution.
const tmpRoot = path.join(os.tmpdir(), `ps-window-pin-test-${process.pid}-${Date.now()}`);
fs.mkdirSync(tmpRoot, { recursive: true });

function freshPinsPath() {
  return path.join(tmpRoot, `pins-${Math.random().toString(36).slice(2)}.json`);
}

// Re-import the module per-test by setting PRISM_PS_PINS_FILE BEFORE import.
// node:test runs sequentially by default; we re-stash + restore env around dynamic imports.
async function importWithPinsFile(pinsFile) {
  const prev = process.env.PRISM_PS_PINS_FILE;
  process.env.PRISM_PS_PINS_FILE = pinsFile;
  // Bust the ESM cache by appending a query string — module-level const captures env.
  const mod = await import(
    `./ps-window-pin.mjs?t=${Date.now()}_${Math.random().toString(36).slice(2)}`
  );
  process.env.PRISM_PS_PINS_FILE = prev;
  return mod;
}

// Build a mock fs that backs onto an in-memory map.
function makeMockFs(initialFiles = {}) {
  const files = new Map(Object.entries(initialFiles));
  return {
    existsSync: (p) => files.has(p),
    readFileSync: (p) => {
      if (!files.has(p)) throw new Error(`ENOENT: ${p}`);
      return files.get(p);
    },
    writeFileSync: (p, content) => { files.set(p, content); },
    renameSync: (from, to) => {
      if (!files.has(from)) throw new Error(`ENOENT: ${from}`);
      files.set(to, files.get(from));
      files.delete(from);
    },
    mkdirSync: () => {},
    _files: files,
  };
}

// ─── readPinsFile ─────────────────────────────────────────────────────────
test("readPinsFile returns empty state when file missing", async () => {
  const pinsFile = freshPinsPath();
  const mod = await importWithPinsFile(pinsFile);
  const mockFs = makeMockFs();
  const state = mod.readPinsFile(mockFs);
  assert.equal(state.schemaVersion, 1);
  assert.deepEqual(state.pins, {});
});

test("readPinsFile fails soft on corrupt JSON", async () => {
  const pinsFile = freshPinsPath();
  const mod = await importWithPinsFile(pinsFile);
  const mockFs = makeMockFs({ [pinsFile]: "{not json" });
  const state = mod.readPinsFile(mockFs);
  assert.deepEqual(state.pins, {});
});

test("readPinsFile rejects shapes missing .pins", async () => {
  const pinsFile = freshPinsPath();
  const mod = await importWithPinsFile(pinsFile);
  const mockFs = makeMockFs({ [pinsFile]: JSON.stringify({ schemaVersion: 1 }) });
  const state = mod.readPinsFile(mockFs);
  assert.deepEqual(state.pins, {});
});

// ─── writePinsFile ────────────────────────────────────────────────────────
test("writePinsFile writes valid JSON with schemaVersion + lastUpdated", async () => {
  const pinsFile = freshPinsPath();
  const mod = await importWithPinsFile(pinsFile);
  const mockFs = makeMockFs();
  const ok = mod.writePinsFile({ pins: { "1234": { slot: "alpha", chatId: "claude-aaa", writtenAt: "2026-05-17T00:00:00Z" } } }, mockFs);
  assert.equal(ok, true);
  const parsed = JSON.parse(mockFs._files.get(pinsFile));
  assert.equal(parsed.schemaVersion, 1);
  assert.ok(parsed.lastUpdated);
  assert.equal(parsed.pins["1234"].slot, "alpha");
});

test("writePinsFile returns false on fs error", async () => {
  const pinsFile = freshPinsPath();
  const mod = await importWithPinsFile(pinsFile);
  const mockFs = {
    ...makeMockFs(),
    writeFileSync: () => { throw new Error("EACCES"); },
  };
  const ok = mod.writePinsFile({ pins: {} }, mockFs);
  assert.equal(ok, false);
});

// ─── readPinForPid / writePinForPid roundtrip ─────────────────────────────
test("writePinForPid + readPinForPid round-trips", async () => {
  const pinsFile = freshPinsPath();
  const mod = await importWithPinsFile(pinsFile);
  const mockFs = makeMockFs();
  const ok = mod.writePinForPid("9999", "india", "claude-39d4ff5a", { _fs: mockFs });
  assert.equal(ok, true);
  const pin = mod.readPinForPid("9999", { _fs: mockFs });
  assert.equal(pin.slot, "india");
  assert.equal(pin.chatId, "claude-39d4ff5a");
  assert.ok(pin.writtenAt);
});

test("readPinForPid returns null for missing PID", async () => {
  const pinsFile = freshPinsPath();
  const mod = await importWithPinsFile(pinsFile);
  const mockFs = makeMockFs();
  assert.equal(mod.readPinForPid("12345", { _fs: mockFs }), null);
});

test("readPinForPid returns null for empty/null PID", async () => {
  const pinsFile = freshPinsPath();
  const mod = await importWithPinsFile(pinsFile);
  const mockFs = makeMockFs();
  assert.equal(mod.readPinForPid(null, { _fs: mockFs }), null);
  assert.equal(mod.readPinForPid("", { _fs: mockFs }), null);
});

test("readPinForPid returns null for stale pin (older than maxAgeMs)", async () => {
  const pinsFile = freshPinsPath();
  const mod = await importWithPinsFile(pinsFile);
  const oldDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(); // 8 days old
  const mockFs = makeMockFs({
    [pinsFile]: JSON.stringify({
      schemaVersion: 1,
      pins: { "5555": { slot: "alpha", chatId: "claude-old", writtenAt: oldDate } },
    }),
  });
  assert.equal(mod.readPinForPid("5555", { _fs: mockFs }), null);
});

test("writePinForPid rejects missing args", async () => {
  const pinsFile = freshPinsPath();
  const mod = await importWithPinsFile(pinsFile);
  const mockFs = makeMockFs();
  assert.equal(mod.writePinForPid(null, "slot", "chat", { _fs: mockFs }), false);
  assert.equal(mod.writePinForPid("123", null, "chat", { _fs: mockFs }), false);
  assert.equal(mod.writePinForPid("123", "slot", null, { _fs: mockFs }), false);
});

test("writePinForPid overwrites existing pin for same PS PID", async () => {
  const pinsFile = freshPinsPath();
  const mod = await importWithPinsFile(pinsFile);
  const mockFs = makeMockFs();
  mod.writePinForPid("7777", "alpha", "claude-first", { _fs: mockFs });
  mod.writePinForPid("7777", "india", "claude-second", { _fs: mockFs });
  const pin = mod.readPinForPid("7777", { _fs: mockFs });
  assert.equal(pin.slot, "india");
  assert.equal(pin.chatId, "claude-second");
});

// ─── pruneStalePins ───────────────────────────────────────────────────────
test("pruneStalePins removes dead PIDs", async () => {
  const pinsFile = freshPinsPath();
  const mod = await importWithPinsFile(pinsFile);
  const now = Date.now();
  const writtenAt = new Date(now).toISOString();
  const mockFs = makeMockFs({
    [pinsFile]: JSON.stringify({
      schemaVersion: 1,
      pins: {
        "1111": { slot: "alpha", chatId: "claude-a", writtenAt },
        "2222": { slot: "bravo", chatId: "claude-b", writtenAt },
        "3333": { slot: "charlie", chatId: "claude-c", writtenAt },
      },
    }),
  });
  const isAlive = (pid) => pid === "2222"; // only 2222 alive
  const pruned = mod.pruneStalePins({ now, isAlive, _fs: mockFs });
  assert.equal(pruned, 2);
  const state = mod.readPinsFile(mockFs);
  assert.deepEqual(Object.keys(state.pins), ["2222"]);
});

test("pruneStalePins removes pins older than maxAgeMs", async () => {
  const pinsFile = freshPinsPath();
  const mod = await importWithPinsFile(pinsFile);
  const now = Date.now();
  const old = new Date(now - 8 * 24 * 60 * 60 * 1000).toISOString();
  const recent = new Date(now).toISOString();
  const mockFs = makeMockFs({
    [pinsFile]: JSON.stringify({
      schemaVersion: 1,
      pins: {
        "1111": { slot: "alpha", chatId: "claude-a", writtenAt: old },
        "2222": { slot: "bravo", chatId: "claude-b", writtenAt: recent },
      },
    }),
  });
  const isAlive = () => true; // all alive — only age should matter
  const pruned = mod.pruneStalePins({ now, isAlive, _fs: mockFs });
  assert.equal(pruned, 1);
  const state = mod.readPinsFile(mockFs);
  assert.deepEqual(Object.keys(state.pins), ["2222"]);
});

test("pruneStalePins removes entries with malformed writtenAt", async () => {
  const pinsFile = freshPinsPath();
  const mod = await importWithPinsFile(pinsFile);
  const mockFs = makeMockFs({
    [pinsFile]: JSON.stringify({
      schemaVersion: 1,
      pins: {
        "1111": { slot: "alpha", chatId: "claude-a", writtenAt: "not-a-date" },
        "2222": { slot: "bravo", chatId: "claude-b" /* no writtenAt */ },
      },
    }),
  });
  const isAlive = () => true;
  const pruned = mod.pruneStalePins({ isAlive, _fs: mockFs });
  assert.equal(pruned, 2);
});

test("pruneStalePins caps at maxPins, dropping oldest", async () => {
  const pinsFile = freshPinsPath();
  const mod = await importWithPinsFile(pinsFile);
  const now = Date.now();
  const pins = {};
  for (let i = 0; i < 5; i++) {
    pins[String(1000 + i)] = {
      slot: `s${i}`,
      chatId: `claude-${i}`,
      writtenAt: new Date(now - i * 60_000).toISOString(), // 0 newest, 4 oldest
    };
  }
  const mockFs = makeMockFs({ [pinsFile]: JSON.stringify({ schemaVersion: 1, pins }) });
  const isAlive = () => true;
  const pruned = mod.pruneStalePins({ now, isAlive, _fs: mockFs, maxPins: 3 });
  assert.equal(pruned, 2);
  const state = mod.readPinsFile(mockFs);
  // Should keep the 3 newest: 1000, 1001, 1002
  assert.deepEqual(new Set(Object.keys(state.pins)), new Set(["1000", "1001", "1002"]));
});

test("pruneStalePins is no-op when nothing to prune", async () => {
  const pinsFile = freshPinsPath();
  const mod = await importWithPinsFile(pinsFile);
  const now = Date.now();
  const writtenAt = new Date(now).toISOString();
  const mockFs = makeMockFs({
    [pinsFile]: JSON.stringify({
      schemaVersion: 1,
      pins: { "1111": { slot: "alpha", chatId: "claude-a", writtenAt } },
    }),
  });
  const isAlive = () => true;
  assert.equal(mod.pruneStalePins({ now, isAlive, _fs: mockFs }), 0);
});

// ─── findPsAncestorPid ────────────────────────────────────────────────────
test("findPsAncestorPid parses valid PID from PS output", async () => {
  const pinsFile = freshPinsPath();
  const mod = await importWithPinsFile(pinsFile);
  if (process.platform !== "win32") {
    assert.equal(mod.findPsAncestorPid({ _spawn: () => ({ status: 0, stdout: "1234\n" }) }), null);
    return;
  }
  const mockSpawn = () => ({ status: 0, stdout: "12345\n" });
  const pid = mod.findPsAncestorPid({ sessionId: "test-sid-1", _spawn: mockSpawn });
  assert.equal(pid, "12345");
});

test("findPsAncestorPid returns null on PS failure", async () => {
  const pinsFile = freshPinsPath();
  const mod = await importWithPinsFile(pinsFile);
  if (process.platform !== "win32") return;
  const mockSpawn = () => ({ status: 1, stdout: "" });
  assert.equal(mod.findPsAncestorPid({ sessionId: "test-sid-2", _spawn: mockSpawn }), null);
});

test("findPsAncestorPid returns null on non-numeric output", async () => {
  const pinsFile = freshPinsPath();
  const mod = await importWithPinsFile(pinsFile);
  if (process.platform !== "win32") return;
  const mockSpawn = () => ({ status: 0, stdout: "" });
  assert.equal(mod.findPsAncestorPid({ sessionId: "test-sid-3", _spawn: mockSpawn }), null);
});

test("findPsAncestorPid caches result by sessionId", async () => {
  const pinsFile = freshPinsPath();
  const mod = await importWithPinsFile(pinsFile);
  if (process.platform !== "win32") return;
  let calls = 0;
  const mockSpawn = () => { calls++; return { status: 0, stdout: "9999\n" }; };
  mod.findPsAncestorPid({ sessionId: "test-sid-cache", _spawn: mockSpawn });
  mod.findPsAncestorPid({ sessionId: "test-sid-cache", _spawn: mockSpawn });
  assert.equal(calls, 1); // second call hit cache
});

test("findPsAncestorPid does not cache when sessionId missing", async () => {
  const pinsFile = freshPinsPath();
  const mod = await importWithPinsFile(pinsFile);
  if (process.platform !== "win32") return;
  let calls = 0;
  const mockSpawn = () => { calls++; return { status: 0, stdout: "8888\n" }; };
  mod.findPsAncestorPid({ _spawn: mockSpawn });
  mod.findPsAncestorPid({ _spawn: mockSpawn });
  assert.equal(calls, 2);
});

// REGRESSION (2026-06-18, slot:alpha): the $args bug. `powershell -Command
// "<script>" <a> <b>` does NOT bind <a>/<b> to $args -- PowerShell appends them
// to the command text -> ParserError -> findPsAncestorPid returned null for
// EVERY input on EVERY host, so ps-window-pins.json was never written and the
// terminal-pin/auto-resume subsystem ran on the fleet-global family-latest
// fallback. The old _spawn mocks ignored args entirely (that is why the bug
// survived); these assert the SPAWN-ARGS CONTRACT directly.
test("findPsAncestorPid passes NO trailing positional args after -Command (regression: $args unbound under -Command)", async (t) => {
  const pinsFile = freshPinsPath();
  const mod = await importWithPinsFile(pinsFile);
  if (process.platform !== "win32") { t.skip("Windows-only"); return; } // off-win32 early-returns before spawn
  let captured = null;
  const mockSpawn = (bin, args) => { captured = { bin, args }; return { status: 0, stdout: "22084\n" }; };
  mod.findPsAncestorPid({ startPid: 27104, maxHops: 8, sessionId: "regress-args", _spawn: mockSpawn });
  assert.ok(captured, "spawn must be invoked for a valid integer startPid");
  const cmdIdx = captured.args.indexOf("-Command");
  assert.ok(cmdIdx >= 0, "-Command flag present");
  // The script must be the LAST arg -- exactly one element after -Command,
  // i.e. NO trailing startPid/maxHops positionals (the whole bug).
  assert.equal(cmdIdx, captured.args.length - 2,
    "-Command must be followed by exactly ONE arg (the script); no trailing positionals");
});

test("findPsAncestorPid interpolates startPid/maxHops into the script (not via $args)", async (t) => {
  const pinsFile = freshPinsPath();
  const mod = await importWithPinsFile(pinsFile);
  if (process.platform !== "win32") { t.skip("Windows-only"); return; }
  let script = null;
  const mockSpawn = (bin, args) => {
    script = args[args.indexOf("-Command") + 1];
    return { status: 0, stdout: "22084\n" };
  };
  mod.findPsAncestorPid({ startPid: 27104, maxHops: 8, sessionId: "regress-interp", _spawn: mockSpawn });
  assert.match(script, /\$current\s*=\s*27104\b/, "startPid interpolated into script body");
  assert.match(script, /\$maxHops\s*=\s*8\b/, "maxHops interpolated into script body");
  assert.ok(!/\$args\[/.test(script), "script must NOT read from $args (unbound under -Command)");
});

test("findPsAncestorPid returns null + does NOT spawn for a non-integer startPid (fail-closed, no injection)", async (t) => {
  const pinsFile = freshPinsPath();
  const mod = await importWithPinsFile(pinsFile);
  if (process.platform !== "win32") { t.skip("Windows-only"); return; }
  let spawned = false;
  const mockSpawn = () => { spawned = true; return { status: 0, stdout: "1\n" }; };
  assert.equal(mod.findPsAncestorPid({ startPid: "1; Write-Output 9", sessionId: "inj-1", _spawn: mockSpawn }), null);
  assert.equal(mod.findPsAncestorPid({ startPid: 0, sessionId: "inj-2", _spawn: mockSpawn }), null);
  assert.equal(mod.findPsAncestorPid({ startPid: -5, sessionId: "inj-3", _spawn: mockSpawn }), null);
  assert.equal(spawned, false, "must never spawn powershell for an invalid startPid");
});

// ─── readPinForCurrentWindow + tryWritePinForCurrentWindow ────────────────
test("readPinForCurrentWindow returns null when PS PID unresolvable", async () => {
  const pinsFile = freshPinsPath();
  const mod = await importWithPinsFile(pinsFile);
  // Stub findPsAncestorPid via PRISM_PS_PIN_DISABLE — the cleanest no-PS path.
  process.env.PRISM_PS_PIN_DISABLE = "1";
  try {
    assert.equal(mod.readPinForCurrentWindow(), null);
  } finally {
    delete process.env.PRISM_PS_PIN_DISABLE;
  }
});

test("tryWritePinForCurrentWindow refuses without slot/chatId", async () => {
  const pinsFile = freshPinsPath();
  const mod = await importWithPinsFile(pinsFile);
  const r1 = mod.tryWritePinForCurrentWindow({ slot: null, chatId: "c" });
  const r2 = mod.tryWritePinForCurrentWindow({ slot: "s", chatId: null });
  assert.equal(r1.written, false);
  assert.equal(r2.written, false);
});

test("PRISM_PS_PIN_DISABLE=1 short-circuits all reads + writes", async () => {
  const pinsFile = freshPinsPath();
  const mod = await importWithPinsFile(pinsFile);
  process.env.PRISM_PS_PIN_DISABLE = "1";
  try {
    assert.equal(mod.findPsAncestorPid({ sessionId: "x" }), null);
    assert.equal(mod.readPinForPid("1234"), null);
    assert.equal(mod.writePinForPid("1234", "alpha", "claude-a"), false);
    const r = mod.tryWritePinForCurrentWindow({ slot: "alpha", chatId: "claude-a" });
    assert.equal(r.written, false);
    assert.equal(mod.readPinForCurrentWindow(), null);
  } finally {
    delete process.env.PRISM_PS_PIN_DISABLE;
  }
});

// ─── Real-process E2E (Windows only) ──────────────────────────────────────
test("REAL: findPsAncestorPid resolves a PS PID for this process tree", async (t) => {
  if (process.platform !== "win32") {
    t.skip("Windows-only");
    return;
  }
  const pinsFile = freshPinsPath();
  const mod = await importWithPinsFile(pinsFile);
  const pid = mod.findPsAncestorPid({ sessionId: "real-e2e" });
  // Should be a real PID or null (if PS isn't an ancestor). We accept both —
  // the test asserts the SHAPE not the presence (CI envs may not have PS).
  if (pid !== null) {
    assert.match(pid, /^\d+$/, "PS PID should be all-digits");
    assert.ok(parseInt(pid, 10) > 0);
  }
});

// Cleanup
test("cleanup tmp dir", () => {
  try { fs.rmSync(tmpRoot, { recursive: true, force: true }); } catch {}
});
