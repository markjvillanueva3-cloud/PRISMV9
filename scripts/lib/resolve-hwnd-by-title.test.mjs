// Tests for resolve-hwnd-by-title.mjs (ZEBRA-ORCHESTRATOR-MS0 / G1b).
// Hermetic: every PowerShell spawn is injected via opts._spawn / opts._platform.
import test from "node:test";
import assert from "node:assert/strict";
import {
  validateTitle,
  parseWindowList,
  matchWindowsByTitle,
  enumerateWindows,
  resolveHwndByTitle,
  tryResolveHwndByTitle,
} from "./resolve-hwnd-by-title.mjs";

// A mock spawn that returns a fixed PowerShell result envelope.
function mockSpawn({ stdout = "", stderr = "", status = 0, signal = null } = {}) {
  return () => ({ stdout, stderr, status, signal });
}

// Build a TSV stdout line the way ENUM_PS would.
function row(hwnd, pid, visible, title) {
  return `${hwnd}\t${pid}\t${visible ? "1" : "0"}\t${title}`;
}

test("validateTitle — rejects missing / non-string / empty", () => {
  assert.equal(validateTitle(null).error, "title-missing");
  assert.equal(validateTitle(undefined).error, "title-missing");
  assert.equal(validateTitle(123).error, "title-not-string");
  assert.equal(validateTitle("").error, "title-empty");
  assert.equal(validateTitle("   ").error, "title-empty");
});

test("validateTitle — accepts and trims a real title", () => {
  const v = validateTitle("  bravo-work  ");
  assert.equal(v.ok, true);
  assert.equal(v.title, "bravo-work");
});

test("parseWindowList — exit code != 0 => ps-failed with reason", () => {
  const r = parseWindowList("", "boom", 1);
  assert.equal(r.ok, false);
  assert.equal(r.error, "ps-failed");
  assert.equal(r.reason, "boom");
});

test("parseWindowList — exit != 0 with empty stderr => ps-exit-N reason", () => {
  const r = parseWindowList("", "", 3);
  assert.equal(r.error, "ps-failed");
  assert.equal(r.reason, "ps-exit-3");
});

test("parseWindowList — empty stdout => zero windows (valid)", () => {
  const r = parseWindowList("", "", 0);
  assert.equal(r.ok, true);
  assert.deepEqual(r.windows, []);
});

test("parseWindowList — parses well-formed TSV rows", () => {
  const stdout = [
    row(1001, 42, true, "bravo-cad-fusion-live-ms0"),
    row(1002, 43, false, "alpha-work"),
  ].join("\r\n");
  const r = parseWindowList(stdout, "", 0);
  assert.equal(r.ok, true);
  assert.equal(r.windows.length, 2);
  assert.deepEqual(r.windows[0], { hwnd: 1001, pid: 42, visible: true, title: "bravo-cad-fusion-live-ms0" });
  assert.equal(r.windows[1].visible, false);
});

test("parseWindowList — skips malformed rows, keeps valid ones", () => {
  const stdout = [
    "not-a-row",
    row(0, 5, true, "zero-hwnd-dropped"),
    row(-3, 5, true, "negative-hwnd-dropped"),
    "abc\t5\t1\tnonnumeric-hwnd-dropped",
    row(2002, 9, true, "kept"),
  ].join("\n");
  const r = parseWindowList(stdout, "", 0);
  assert.equal(r.ok, true);
  assert.equal(r.windows.length, 1);
  assert.equal(r.windows[0].title, "kept");
});

test("parseWindowList — non-numeric pid degrades to null, window kept", () => {
  const r = parseWindowList("3003\tNaN\t1\tcharlie-work", "", 0);
  assert.equal(r.windows.length, 1);
  assert.equal(r.windows[0].pid, null);
});

test("matchWindowsByTitle — rejects non-array window list", () => {
  assert.equal(matchWindowsByTitle(null, "x").error, "windows-not-array");
});

test("matchWindowsByTitle — propagates title validation errors", () => {
  assert.equal(matchWindowsByTitle([], "").error, "title-empty");
  assert.equal(matchWindowsByTitle([], null).error, "title-missing");
});

test("matchWindowsByTitle — exact unique match wins", () => {
  const windows = [
    { hwnd: 10, pid: 1, visible: true, title: "alpha-work" },
    { hwnd: 20, pid: 2, visible: true, title: "bravo-cad-fusion-live-ms0" },
  ];
  const r = matchWindowsByTitle(windows, "bravo-cad-fusion-live-ms0");
  assert.equal(r.ok, true);
  assert.equal(r.hwnd, 20);
  assert.equal(r.match, "exact");
});

test("matchWindowsByTitle — exact match is case-insensitive", () => {
  const windows = [{ hwnd: 30, pid: 3, visible: true, title: "BRAVO-Work" }];
  const r = matchWindowsByTitle(windows, "bravo-work");
  assert.equal(r.ok, true);
  assert.equal(r.hwnd, 30);
});

test("matchWindowsByTitle — duplicate exact titles => ambiguous-exact, no actuation", () => {
  const windows = [
    { hwnd: 40, pid: 4, visible: true, title: "bravo-work" },
    { hwnd: 41, pid: 5, visible: true, title: "bravo-work" },
  ];
  const r = matchWindowsByTitle(windows, "bravo-work");
  assert.equal(r.ok, false);
  assert.equal(r.error, "ambiguous-exact");
  assert.equal(r.count, 2);
});

test("matchWindowsByTitle — contains tier handles caption decoration", () => {
  const windows = [
    { hwnd: 50, pid: 6, visible: true, title: "bravo-cad-fusion-live-ms0 - PowerShell" },
  ];
  const r = matchWindowsByTitle(windows, "bravo-cad-fusion-live-ms0");
  assert.equal(r.ok, true);
  assert.equal(r.hwnd, 50);
  assert.equal(r.match, "contains");
});

test("matchWindowsByTitle — ambiguous contains => no actuation", () => {
  const windows = [
    { hwnd: 60, pid: 7, visible: true, title: "bravo-work - PowerShell" },
    { hwnd: 61, pid: 8, visible: true, title: "bravo-work - Windows Terminal" },
  ];
  const r = matchWindowsByTitle(windows, "bravo-work");
  assert.equal(r.ok, false);
  assert.equal(r.error, "ambiguous-contains");
});

test("matchWindowsByTitle — allowContains:false disables the fallback tier", () => {
  const windows = [{ hwnd: 70, pid: 9, visible: true, title: "bravo-work - PowerShell" }];
  const r = matchWindowsByTitle(windows, "bravo-work", { allowContains: false });
  assert.equal(r.ok, false);
  assert.equal(r.error, "no-match");
});

test("matchWindowsByTitle — invisible windows excluded by default", () => {
  const windows = [{ hwnd: 80, pid: 10, visible: false, title: "bravo-work" }];
  assert.equal(matchWindowsByTitle(windows, "bravo-work").error, "no-match");
  const r = matchWindowsByTitle(windows, "bravo-work", { visibleOnly: false });
  assert.equal(r.ok, true);
  assert.equal(r.hwnd, 80);
});

test("matchWindowsByTitle — control-char-only title => title-empty-after-sanitize", () => {
  // sanitizeTitle strips C0 control chars; a control-char-only title survives
  // validateTitle's plain trim but collapses to "" after sanitize. The guard
  // must catch it BEFORE any window match (an empty `want` would `contains`
  // every window).
  const windows = [{ hwnd: 1, pid: 1, visible: true, title: "alpha-work" }];
  const r = matchWindowsByTitle(windows, "\x01\x02\x03");
  assert.equal(r.ok, false);
  assert.equal(r.error, "title-empty-after-sanitize");
});

test("matchWindowsByTitle — whitespace collapsed identically on both sides", () => {
  // set-window-title.mjs collapses whitespace runs before stamping; the
  // resolver must apply the SAME transform (the sanitizeTitle import) so a
  // doubled-space caption still matches a single-space expected title.
  const windows = [{ hwnd: 9, pid: 1, visible: true, title: "bravo  cad  ms0" }];
  const r = matchWindowsByTitle(windows, "bravo cad ms0");
  assert.equal(r.ok, true);
  assert.equal(r.hwnd, 9);
});

test("matchWindowsByTitle — a >MAX_TITLE_LEN title still resolves via the exact tier", () => {
  // A topic longer than the 80-char cap is truncated identically when stamped
  // and when matched, so the exact tier still finds it. The contains tier is
  // suppressed at cap length (mayBeTruncated) — exact must carry the match.
  const longTitle = "z".repeat(120);
  const windows = [{ hwnd: 7, pid: 1, visible: true, title: longTitle }];
  const r = matchWindowsByTitle(windows, longTitle);
  assert.equal(r.ok, true);
  assert.equal(r.hwnd, 7);
  assert.equal(r.match, "exact");
});

test("matchWindowsByTitle — no candidate => no-match with search count", () => {
  const windows = [{ hwnd: 90, pid: 11, visible: true, title: "alpha-work" }];
  const r = matchWindowsByTitle(windows, "zulu-work");
  assert.equal(r.ok, false);
  assert.equal(r.error, "no-match");
  assert.equal(r.searched, 1);
});

test("matchWindowsByTitle — windows with bad hwnd are filtered from the pool", () => {
  const windows = [
    { hwnd: 0, pid: 1, visible: true, title: "bravo-work" },
    { hwnd: 100, pid: 2, visible: true, title: "bravo-work" },
  ];
  const r = matchWindowsByTitle(windows, "bravo-work");
  assert.equal(r.ok, true);
  assert.equal(r.hwnd, 100);
});

test("enumerateWindows — non-windows platform short-circuits", () => {
  const r = enumerateWindows({ _platform: "linux" });
  assert.equal(r.ok, false);
  assert.equal(r.error, "platform-not-windows");
});

test("enumerateWindows — spawn throwing is classified, never propagates", () => {
  const r = enumerateWindows({
    _platform: "win32",
    _spawn: () => { throw new Error("EACCES"); },
  });
  assert.equal(r.ok, false);
  assert.equal(r.error, "spawn-threw");
  assert.match(r.reason, /EACCES/);
});

test("enumerateWindows — null spawn result classified", () => {
  const r = enumerateWindows({ _platform: "win32", _spawn: () => null });
  assert.equal(r.error, "spawn-returned-null");
});

test("enumerateWindows — killed-by-signal classified", () => {
  const r = enumerateWindows({
    _platform: "win32",
    _spawn: mockSpawn({ signal: "SIGTERM" }),
  });
  assert.equal(r.error, "spawn-signal");
  assert.equal(r.signal, "SIGTERM");
});

test("enumerateWindows — spawnSync res.error (maxBuffer / launch fail) classified", () => {
  const r = enumerateWindows({
    _platform: "win32",
    _spawn: () => ({ stdout: "", stderr: "", status: null, signal: null, error: new Error("ENOBUFS") }),
  });
  assert.equal(r.ok, false);
  assert.equal(r.error, "spawn-error");
  assert.match(r.reason, /ENOBUFS/);
});

test("enumerateWindows — happy path parses the TSV", () => {
  const stdout = [row(111, 1, true, "alpha-work"), row(222, 2, true, "bravo-work")].join("\n");
  const r = enumerateWindows({ _platform: "win32", _spawn: mockSpawn({ stdout }) });
  assert.equal(r.ok, true);
  assert.equal(r.windows.length, 2);
});

test("resolveHwndByTitle — end-to-end exact match through mock spawn", () => {
  const stdout = [
    row(500, 1, true, "alpha-work"),
    row(600, 2, true, "bravo-cad-fusion-live-ms0"),
  ].join("\n");
  const r = resolveHwndByTitle("bravo-cad-fusion-live-ms0", {
    _platform: "win32",
    _spawn: mockSpawn({ stdout }),
  });
  assert.equal(r.ok, true);
  assert.equal(r.hwnd, 600);
});

test("resolveHwndByTitle — enumeration failure surfaces, no match attempted", () => {
  const r = resolveHwndByTitle("bravo-work", {
    _platform: "win32",
    _spawn: mockSpawn({ status: 1, stderr: "ps blew up" }),
  });
  assert.equal(r.ok, false);
  assert.equal(r.error, "ps-failed");
  assert.equal(r.reason, "ps blew up");
});

test("resolveHwndByTitle — invalid title short-circuits before any spawn", () => {
  let spawned = false;
  const r = resolveHwndByTitle("", {
    _platform: "win32",
    _spawn: () => { spawned = true; return {}; },
  });
  assert.equal(r.error, "title-empty");
  assert.equal(spawned, false);
});

test("resolveHwndByTitle — no-match returns cleanly (orchestrator skips, never guesses)", () => {
  const stdout = row(700, 1, true, "alpha-work");
  const r = resolveHwndByTitle("bravo-work", {
    _platform: "win32",
    _spawn: mockSpawn({ stdout }),
  });
  assert.equal(r.ok, false);
  assert.equal(r.error, "no-match");
});

test("tryResolveHwndByTitle — returns hwnd on success, null on failure", () => {
  const okStdout = row(800, 1, true, "bravo-work");
  assert.equal(
    tryResolveHwndByTitle("bravo-work", { _platform: "win32", _spawn: mockSpawn({ stdout: okStdout }) }),
    800,
  );
  assert.equal(
    tryResolveHwndByTitle("nope-work", { _platform: "win32", _spawn: mockSpawn({ stdout: okStdout }) }),
    null,
  );
});
