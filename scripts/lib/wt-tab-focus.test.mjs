#!/usr/bin/env node
// Tests for wt-tab-focus.mjs (U-ZM2-01).
// Hermetic: PS spawn is injected via opts._spawn; nothing touches the real
// Windows Terminal or UIA tree.
import test from "node:test";
import assert from "node:assert/strict";
import {
  parseFocusOutput,
  validateSlot,
  focusWtTabBySlot,
  tabNameMatchesSlot,
  parseCountTabsOutput,
  countWtWindowTabs,
} from "./wt-tab-focus.mjs";

// ------------------ validateSlot ------------------
test("validateSlot -- rejects missing / non-string / empty", () => {
  assert.equal(validateSlot(null).error, "slot-missing");
  assert.equal(validateSlot(undefined).error, "slot-missing");
  assert.equal(validateSlot(123).error, "slot-not-string");
  assert.equal(validateSlot("").error, "slot-empty");
  assert.equal(validateSlot("   ").error, "slot-empty");
});

test("validateSlot -- rejects bad chars (digits, hyphens, spaces, unicode)", () => {
  assert.equal(validateSlot("bravo1").error, "slot-bad-chars");
  assert.equal(validateSlot("bra-vo").error, "slot-bad-chars");
  assert.equal(validateSlot("bra vo").error, "slot-bad-chars");
  assert.equal(validateSlot("br vo").error, "slot-bad-chars");
});

test("validateSlot -- accepts lowercase letters, normalizes case + trim", () => {
  assert.deepEqual(validateSlot("bravo"), { ok: true, slot: "bravo" });
  assert.deepEqual(validateSlot("KILO"), { ok: true, slot: "kilo" });
  assert.deepEqual(validateSlot("  Hotel  "), { ok: true, slot: "hotel" });
});

// ----- tabNameMatchesSlot (PS-match mirror) -----
test("tabNameMatchesSlot -- accepts bare slot (any case)", () => {
  assert.equal(tabNameMatchesSlot("alpha", "alpha"), true);
  assert.equal(tabNameMatchesSlot("ALPHA", "alpha"), true);
  assert.equal(tabNameMatchesSlot("Alpha", "ALPHA"), true); // slot side case-insensitive too
});

test("tabNameMatchesSlot -- accepts `PRISM <slot>` (any case)", () => {
  assert.equal(tabNameMatchesSlot("PRISM alpha", "alpha"), true);
  assert.equal(tabNameMatchesSlot("prism alpha", "alpha"), true);
  assert.equal(tabNameMatchesSlot("PRISM ALPHA", "alpha"), true);
});

test("tabNameMatchesSlot -- accepts the launcher `<slot> | <tag>` first token (THE FIX)", () => {
  // regenerate-launch-fleet.mjs tabTitleFor => `alpha | token-opt`. Without
  // this tier the live fleet's tabs are unresolvable -> self-compact never fires.
  assert.equal(tabNameMatchesSlot("alpha | token-opt", "alpha"), true);
  assert.equal(tabNameMatchesSlot("ALPHA | TOKEN-OPT", "alpha"), true);
  assert.equal(tabNameMatchesSlot("alpha  |  token-opt", "alpha"), true); // first-tok is .Trim()-ed
  assert.equal(tabNameMatchesSlot("kilo | cam", "KILO"), true);
});

test("tabNameMatchesSlot -- REJECTS substring embeds (anchored, never contains)", () => {
  // LOAD-BEARING safety: a wrong-but-unique match would SendKeys to the wrong chat.
  assert.equal(tabNameMatchesSlot("betalpha", "alpha"), false);     // suffix embed
  assert.equal(tabNameMatchesSlot("xalpha", "alpha"), false);       // prefix embed
  assert.equal(tabNameMatchesSlot("alpha-2", "alpha"), false);      // slot + suffix, no pipe
  assert.equal(tabNameMatchesSlot("alphabet | x", "alpha"), false); // first token is a longer word
  assert.equal(tabNameMatchesSlot("betalpha | token", "alpha"), false); // pipe form, wrong slot
});

test("tabNameMatchesSlot -- ADVERSARIAL: slot name in the TAG (after `|`) must NOT match", () => {
  // Only the FIRST token counts. A tab `zebra | alpha-domain` belongs to zebra,
  // never alpha -- matching it would actuate the wrong chat.
  assert.equal(tabNameMatchesSlot("zebra | alpha", "alpha"), false);
  assert.equal(tabNameMatchesSlot("bravo | alpha-helper", "alpha"), false);
  assert.equal(tabNameMatchesSlot("bravo | mill", "alpha"), false); // different slot entirely
});

test("tabNameMatchesSlot -- accepts the single first-letter (THE LIVE FLEET convention)", () => {
  // Operators pin 1-char WT tab titles (a,b,...,z) so all 26 NATO tabs fit the
  // bar; a manual WT rename overrides the app-set `PRISM <slot>` title. This is
  // what the running fleet actually shows -- THE tier that unblocks self-compact.
  assert.equal(tabNameMatchesSlot("a", "alpha"), true);
  assert.equal(tabNameMatchesSlot("A", "alpha"), true);   // case-insensitive
  assert.equal(tabNameMatchesSlot("z", "zulu"), true);
  assert.equal(tabNameMatchesSlot("g", "GOLF"), true);    // slot side any case
  assert.equal(tabNameMatchesSlot("o", "oscar"), true);
});

test("tabNameMatchesSlot -- single-letter is ANCHORED: wrong letter / 2+ chars reject", () => {
  assert.equal(tabNameMatchesSlot("a", "bravo"), false);  // wrong first letter
  assert.equal(tabNameMatchesSlot("b", "alpha"), false);
  assert.equal(tabNameMatchesSlot("ab", "alpha"), false); // two chars != single letter
  assert.equal(tabNameMatchesSlot("al", "alpha"), false); // partial prefix is NOT a tier
});

test("tabNameMatchesSlot -- rejects empty / non-string inputs (never throws)", () => {
  assert.equal(tabNameMatchesSlot("", "alpha"), false);
  assert.equal(tabNameMatchesSlot("alpha", ""), false);
  assert.equal(tabNameMatchesSlot("   ", "alpha"), false); // whitespace-only name, no pipe -> firstTok ""
  assert.equal(tabNameMatchesSlot(null, "alpha"), false);
  assert.equal(tabNameMatchesSlot("alpha", null), false);
  assert.equal(tabNameMatchesSlot(undefined, undefined), false);
  assert.equal(tabNameMatchesSlot(123, "alpha"), false);
});

// ------------------ parseFocusOutput ------------------
test("parseFocusOutput -- exit 0 + OK <hwnd> <name> <count>", () => {
  const r = parseFocusOutput("OK 525214 KILO 1\n", "", 0);
  assert.deepEqual(r, { ok: true, hwnd: 525214, tabName: "KILO", paneCount: 1 });
});

test("parseFocusOutput -- tabName may contain spaces (PRISM kilo)", () => {
  const r = parseFocusOutput("OK 525214 PRISM kilo 1\n", "", 0);
  assert.equal(r.ok, true);
  assert.equal(r.tabName, "PRISM kilo");
  assert.equal(r.hwnd, 525214);
  assert.equal(r.paneCount, 1);
});

test("parseFocusOutput -- exit 0 but pane count != 1 -> fail-loud (safety)", () => {
  // The PS side already FAILs on multi-pane, but defense-in-depth here.
  const r = parseFocusOutput("OK 525214 KILO 3\n", "", 0);
  assert.equal(r.ok, false);
  assert.match(r.error, /^ok-bad-pane-count:3$/);
});

test("parseFocusOutput -- exit 0 but bad hwnd -> fail", () => {
  const r = parseFocusOutput("OK 0 KILO 1\n", "", 0);
  assert.equal(r.ok, false);
  assert.equal(r.error, "ok-bad-hwnd");
  const r2 = parseFocusOutput("OK NaN KILO 1\n", "", 0);
  assert.equal(r2.ok, false);
});

test("parseFocusOutput -- exit 0 but missing tabName -> fail", () => {
  // "OK 525214  1" (extra space) - tokens are ["OK","525214","1"], len 3, malformed.
  const r = parseFocusOutput("OK 525214 1\n", "", 0);
  assert.equal(r.ok, false);
  assert.equal(r.error, "ok-malformed");
});

test("parseFocusOutput -- dry-run-unfocused token -> ok with paneCount=null", () => {
  // U-ZM2-01 dry-run mode: the tab is verified resolvable but not selected
  // (the target tab is not the focused one and dry-run skips Select()).
  const r = parseFocusOutput("OK 525214 KILO dry-run-unfocused\n", "", 0);
  assert.equal(r.ok, true);
  assert.equal(r.hwnd, 525214);
  assert.equal(r.tabName, "KILO");
  assert.equal(r.paneCount, null);
  assert.equal(r.dryRunUnfocused, true);
});

test("parseFocusOutput -- dry-run-unfocused works for multi-word tabName", () => {
  const r = parseFocusOutput("OK 525214 PRISM kilo dry-run-unfocused\n", "", 0);
  assert.equal(r.ok, true);
  assert.equal(r.tabName, "PRISM kilo");
  assert.equal(r.dryRunUnfocused, true);
});

test("focusWtTabBySlot -- dryRun=true sets PRISM_WT_DRY_RUN=1 in env", () => {
  let capturedEnv = null;
  const _spawn = (cmd, args, opts) => {
    capturedEnv = opts.env;
    return { stdout: "OK 1 X 1", status: 0 };
  };
  focusWtTabBySlot("bravo", { _platform: "win32", _spawn, dryRun: true });
  assert.equal(capturedEnv.PRISM_WT_DRY_RUN, "1");
});

test("focusWtTabBySlot -- dryRun=false (default) sets PRISM_WT_DRY_RUN=0", () => {
  let capturedEnv = null;
  const _spawn = (cmd, args, opts) => {
    capturedEnv = opts.env;
    return { stdout: "OK 1 X 1", status: 0 };
  };
  focusWtTabBySlot("bravo", { _platform: "win32", _spawn });
  assert.equal(capturedEnv.PRISM_WT_DRY_RUN, "0");
});

test("parseFocusOutput -- FAIL outputs surface the reason verbatim", () => {
  assert.deepEqual(parseFocusOutput("FAIL no-wt-process\n", "", 2),
    { ok: false, error: "no-wt-process" });
  assert.deepEqual(parseFocusOutput("FAIL ambiguous-tab 3\n", "", 4),
    { ok: false, error: "ambiguous-tab 3" });
  assert.deepEqual(parseFocusOutput("FAIL pane-count 4\n", "", 6),
    { ok: false, error: "pane-count 4" });
});

test("parseFocusOutput -- last line wins (PS preamble noise)", () => {
  const r = parseFocusOutput("WARNING: something\n\nOK 525214 LIMA 1\n", "", 0);
  assert.equal(r.ok, true);
  assert.equal(r.tabName, "LIMA");
});

test("parseFocusOutput -- non-zero exit + empty stdout falls back to stderr", () => {
  const r = parseFocusOutput("", "Add-Type failed\n", 1);
  assert.equal(r.ok, false);
  assert.equal(r.error, "Add-Type failed");
});

test("parseFocusOutput -- empty/garbage exit 0 -> unrecognized-output", () => {
  assert.deepEqual(parseFocusOutput("", "", 0), { ok: false, error: "unrecognized-output" });
  assert.deepEqual(parseFocusOutput("hello world\n", "", 0),
    { ok: false, error: "hello world" });
});

// ------------------ focusWtTabBySlot (with injected spawn) ------------------
function mockSpawn({ stdout = "", stderr = "", status = 0, signal = null, error = null } = {}) {
  return () => ({ stdout, stderr, status, signal, error });
}

test("focusWtTabBySlot -- non-windows platform short-circuits", () => {
  const r = focusWtTabBySlot("bravo", { _platform: "linux", _spawn: mockSpawn() });
  assert.deepEqual(r, { ok: false, error: "platform-not-windows" });
});

test("focusWtTabBySlot -- bad slot fails before spawn", () => {
  let spawned = false;
  const _spawn = () => { spawned = true; return { stdout: "OK 1 X 1", status: 0 }; };
  const r = focusWtTabBySlot("", { _platform: "win32", _spawn });
  assert.equal(r.ok, false);
  assert.equal(r.error, "slot-empty");
  assert.equal(spawned, false);
});

test("focusWtTabBySlot -- happy path: parsed OK -> ok:true with hwnd+tabName", () => {
  const _spawn = mockSpawn({ stdout: "OK 525214 KILO 1\n", status: 0 });
  const r = focusWtTabBySlot("KILO", { _platform: "win32", _spawn });
  assert.deepEqual(r, { ok: true, hwnd: 525214, tabName: "KILO", paneCount: 1 });
});

test("focusWtTabBySlot -- FAIL multi-pane surfaces as ok:false (safety: no actuation)", () => {
  // This is the LOAD-BEARING safety case: a multi-pane tab MUST NOT actuate.
  const _spawn = mockSpawn({ stdout: "FAIL pane-count 3\n", status: 6 });
  const r = focusWtTabBySlot("bravo", { _platform: "win32", _spawn });
  assert.equal(r.ok, false);
  assert.equal(r.error, "pane-count 3");
});

test("focusWtTabBySlot -- FAIL ambiguous-tab refuses (safety: never guess)", () => {
  const _spawn = mockSpawn({ stdout: "FAIL ambiguous-tab 2\n", status: 4 });
  const r = focusWtTabBySlot("bravo", { _platform: "win32", _spawn });
  assert.equal(r.ok, false);
  assert.equal(r.error, "ambiguous-tab 2");
});

test("focusWtTabBySlot -- FAIL no-tab surfaces (slot not in any WT)", () => {
  const _spawn = mockSpawn({ stdout: "FAIL no-tab\n", status: 3 });
  const r = focusWtTabBySlot("bravo", { _platform: "win32", _spawn });
  assert.equal(r.ok, false);
  assert.equal(r.error, "no-tab");
});

test("focusWtTabBySlot -- FAIL no-wt-process surfaces (zero WT processes)", () => {
  const _spawn = mockSpawn({ stdout: "FAIL no-wt-process\n", status: 2 });
  const r = focusWtTabBySlot("bravo", { _platform: "win32", _spawn });
  assert.equal(r.ok, false);
  assert.equal(r.error, "no-wt-process");
});

test("focusWtTabBySlot -- spawn signal surfaces as spawn-signal", () => {
  const _spawn = mockSpawn({ signal: "SIGTERM" });
  const r = focusWtTabBySlot("bravo", { _platform: "win32", _spawn });
  assert.equal(r.ok, false);
  assert.match(r.error, /^spawn-signal:/);
});

test("focusWtTabBySlot -- spawn error surfaces", () => {
  const _spawn = mockSpawn({ error: new Error("ENOENT powershell") });
  const r = focusWtTabBySlot("bravo", { _platform: "win32", _spawn });
  assert.equal(r.ok, false);
  assert.match(r.error, /^spawn-error:/);
});

test("focusWtTabBySlot -- spawn throws surfaces as spawn-threw", () => {
  const _spawn = () => { throw new Error("boom"); };
  const r = focusWtTabBySlot("bravo", { _platform: "win32", _spawn });
  assert.equal(r.ok, false);
  assert.match(r.error, /^spawn-threw:/);
});

test("focusWtTabBySlot -- passes the slot via PRISM_WT_SLOT env", () => {
  let capturedEnv = null;
  const _spawn = (cmd, args, opts) => {
    capturedEnv = opts.env;
    return { stdout: "OK 1 X 1", status: 0 };
  };
  focusWtTabBySlot("KILO", { _platform: "win32", _spawn });
  assert.equal(capturedEnv.PRISM_WT_SLOT, "kilo"); // validateSlot normalizes
});

test("focusWtTabBySlot -- disabled by PRISM_WT_FOCUS_DISABLE knob (no spawn)", () => {
  const prev = process.env.PRISM_WT_FOCUS_DISABLE;
  process.env.PRISM_WT_FOCUS_DISABLE = "1";
  let spawned = false;
  const _spawn = () => { spawned = true; return { stdout: "OK 1 X 1", status: 0 }; };
  try {
    const r = focusWtTabBySlot("bravo", { _platform: "win32", _spawn });
    assert.deepEqual(r, { ok: false, error: "disabled" });
    assert.equal(spawned, false);
  } finally {
    if (prev === undefined) delete process.env.PRISM_WT_FOCUS_DISABLE;
    else process.env.PRISM_WT_FOCUS_DISABLE = prev;
  }
});

// --- countWtWindowTabs (U-SELFCOMPACT-SINGLETAB, 2026-06-24) ---
// The single-tab proof self-compact needs before trusting an owning-window pid:
// a window hosting exactly ONE tab means its focused tab IS this chat's tab.

test("parseCountTabsOutput -- OK single tab -> {ok,hwnd,tabCount:1}", () => {
  assert.deepEqual(parseCountTabsOutput("OK 657790 1", "", 0), { ok: true, hwnd: 657790, tabCount: 1 });
});

test("parseCountTabsOutput -- OK multiple tabs -> tabCount:5 (caller refuses)", () => {
  assert.deepEqual(parseCountTabsOutput("OK 657790 5", "", 0), { ok: true, hwnd: 657790, tabCount: 5 });
});

test("parseCountTabsOutput -- FAIL no-window -> {ok:false,error}", () => {
  assert.deepEqual(parseCountTabsOutput("FAIL no-window", "", 3), { ok: false, error: "no-window" });
});

test("parseCountTabsOutput -- non-zero exit + empty stdout falls back to stderr", () => {
  const r = parseCountTabsOutput("", "boom", 2);
  assert.equal(r.ok, false);
  assert.equal(r.error, "boom");
});

test("parseCountTabsOutput -- bad hwnd / bad tabcount / malformed rejected", () => {
  assert.equal(parseCountTabsOutput("OK 0 1", "", 0).ok, false);    // hwnd 0
  assert.equal(parseCountTabsOutput("OK 999 -1", "", 0).ok, false); // negative count
  assert.equal(parseCountTabsOutput("OK 999 x", "", 0).ok, false);  // non-numeric count
  assert.equal(parseCountTabsOutput("OK 999", "", 0).ok, false);    // missing count
  assert.equal(parseCountTabsOutput("garbage", "", 0).ok, false);   // not OK-prefixed
});

test("parseCountTabsOutput -- zero tabs is a valid (refusing) result, not an error", () => {
  // tabCount 0 means no TabItems realized -> caller must NOT treat as single-tab;
  // parse succeeds, the tabCount!==1 gate refuses it.
  assert.deepEqual(parseCountTabsOutput("OK 999 0", "", 0), { ok: true, hwnd: 999, tabCount: 0 });
});

test("countWtWindowTabs -- non-windows -> {ok:false,platform-not-windows}", () => {
  assert.deepEqual(countWtWindowTabs(1234, { _platform: "linux", _spawn: () => { throw new Error("must not spawn"); } }),
    { ok: false, error: "platform-not-windows" });
});

test("countWtWindowTabs -- invalid pid rejected before spawn", () => {
  let spawned = false;
  const _spawn = () => { spawned = true; return {}; };
  assert.equal(countWtWindowTabs(0, { _platform: "win32", _spawn }).ok, false);
  assert.equal(countWtWindowTabs(-5, { _platform: "win32", _spawn }).ok, false);
  assert.equal(countWtWindowTabs(3.5, { _platform: "win32", _spawn }).ok, false);
  assert.equal(countWtWindowTabs("x", { _platform: "win32", _spawn }).ok, false);
  assert.equal(spawned, false, "must not spawn for an invalid pid");
});

test("countWtWindowTabs -- happy path: injected single-tab spawn -> {ok,hwnd,tabCount:1}", () => {
  const _spawn = (bin, args, opts) => {
    assert.equal(opts.env.PRISM_WT_PID, "4242");  // pid forwarded to PS
    return { stdout: "OK 657790 1\n", status: 0 };
  };
  assert.deepEqual(countWtWindowTabs(4242, { _platform: "win32", _spawn }),
    { ok: true, hwnd: 657790, tabCount: 1 });
});

test("countWtWindowTabs -- spawn signal / error / null / throw are fail-soft", () => {
  assert.equal(countWtWindowTabs(42, { _platform: "win32", _spawn: () => ({ signal: "SIGTERM" }) }).ok, false);
  assert.equal(countWtWindowTabs(42, { _platform: "win32", _spawn: () => ({ error: new Error("x") }) }).ok, false);
  assert.equal(countWtWindowTabs(42, { _platform: "win32", _spawn: () => null }).ok, false);
  assert.equal(countWtWindowTabs(42, { _platform: "win32", _spawn: () => { throw new Error("boom"); } }).ok, false);
});

test("countWtWindowTabs -- disabled by PRISM_WT_FOCUS_DISABLE knob (no spawn)", () => {
  const prev = process.env.PRISM_WT_FOCUS_DISABLE;
  process.env.PRISM_WT_FOCUS_DISABLE = "1";
  let spawned = false;
  try {
    const r = countWtWindowTabs(42, { _platform: "win32", _spawn: () => { spawned = true; return {}; } });
    assert.deepEqual(r, { ok: false, error: "disabled" });
    assert.equal(spawned, false);
  } finally {
    if (prev === undefined) delete process.env.PRISM_WT_FOCUS_DISABLE;
    else process.env.PRISM_WT_FOCUS_DISABLE = prev;
  }
});
