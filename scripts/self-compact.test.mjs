// Tests for the model-invokable self-compact actuator's pure logic. node --test.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  resolveSlot, twidToOwningPid, decideAction, fallbackMessage,
  isPidAlive, resolveOwnWindow, actuate, spawnAutostartWatcher,
  resolveSessionId, resolveOwningPidForChat, resolveLiveOwningPid,
  isSingleTabFallthroughError,
} from "./self-compact.mjs";

const NO_LOG = () => {}; // swallow ledger appends in tests

const SLOTS = {
  slots: {
    // tw-wt: Windows Terminal tab -- twid carries NO pid -> never sendable (the fleet norm).
    alpha: { chatId: "claude-087e5978", pid: 12345, terminalWindowId: "tw-wt-982d5bd8-921b" },
    // tw-ps: PowerShell host pid -- STABLE owning-window pid -> sendable when alive.
    bravo: { chatId: "claude-17b9f42e", pid: 6789, terminalWindowId: "tw-ps-6789" },
    november: { chatId: null, pid: null }, // unbound
  },
};

// ----- resolveSessionId (env fallback for bare/cron/--dry-run invocations) -----
test("resolveSessionId: explicit arg wins verbatim (canonical=false)", () => {
  assert.equal(resolveSessionId("claude-abc12345", "5915c20a-a517-4e95-bc12-edf7d9055431"), "claude-abc12345");
});

test("resolveSessionId: explicit arg wins verbatim even when canonical=true", () => {
  // the skill passes the already-short stable id; do not mangle it
  assert.equal(resolveSessionId("claude-abc12345", "5915c20a-a517-4e95-bc12-edf7d9055431", { canonical: true }), "claude-abc12345");
});

test("resolveSessionId: full env UUID returned verbatim when no arg (self-startup form)", () => {
  // statSlotTranscript's shared-tree fallback needs the FULL <id>.jsonl filename
  assert.equal(resolveSessionId(null, "5915c20a-a517-4e95-bc12-edf7d9055431"), "5915c20a-a517-4e95-bc12-edf7d9055431");
});

test("resolveSessionId: env UUID -> short claude-<8hex> when canonical (self-compact form)", () => {
  // slot-resolution + handoff key want the stored claude-<8hex> chatId form
  assert.equal(resolveSessionId(null, "5915c20a-a517-4e95-bc12-edf7d9055431", { canonical: true }), "claude-5915c20a");
});

test("resolveSessionId: empty-string arg falls through to env (both forms)", () => {
  assert.equal(resolveSessionId("", "5915c20a-a517-4e95-bc12-edf7d9055431", { canonical: true }), "claude-5915c20a");
  assert.equal(resolveSessionId("", "5915c20a-a517-4e95-bc12-edf7d9055431"), "5915c20a-a517-4e95-bc12-edf7d9055431");
});

test("resolveSessionId: both missing / empty env -> null (never undefined)", () => {
  assert.equal(resolveSessionId(null, null), null);
  assert.equal(resolveSessionId(null, null, { canonical: true }), null);
  assert.equal(resolveSessionId(null, ""), null);
  assert.equal(resolveSessionId(undefined, undefined, { canonical: true }), null);
});

test("resolveSessionId: already-short env passes through canonical unchanged (idempotent)", () => {
  assert.equal(resolveSessionId(null, "claude-5915c20a", { canonical: true }), "claude-5915c20a");
});

test("resolveSlot: explicit --slot wins, returns its entry", () => {
  const r = resolveSlot(SLOTS, { slot: "bravo" });
  assert.equal(r.slot, "bravo");
  assert.equal(r.entry.terminalWindowId, "tw-ps-6789");
});

test("resolveSlot: matches a full harness session_id by chatId substring", () => {
  // the harness session_id is the full uuid; chatId stores claude-<first8>
  const r = resolveSlot(SLOTS, { sessionId: "087e5978-f3ed-4657-820e-aed49ae8aa0d" });
  assert.equal(r.slot, "alpha");
});

test("resolveSlot: exact chatId match", () => {
  assert.equal(resolveSlot(SLOTS, { sessionId: "claude-17b9f42e" }).slot, "bravo");
});

test("resolveSlot: unknown session / empty doc / null doc -> null", () => {
  assert.equal(resolveSlot(SLOTS, { sessionId: "claude-ffffffff" }), null);
  assert.equal(resolveSlot({}, { sessionId: "x" }), null);
  assert.equal(resolveSlot(null, { slot: "alpha" }), null);
});

test("resolveSlot SAFETY: an EXACT full-UUID match wins over a PEER's substring match", () => {
  // bravo (iterated FIRST) has bare '087e5978' which IS a substring of the full UUID;
  // alpha has the EXACT full-UUID chatId. Exact must win regardless of iteration order
  // -- else self-compact would resolve bravo and SendKeys /compact into a peer's window.
  const doc = { slots: {
    bravo: { chatId: "claude-087e5978", pid: 1, terminalWindowId: "tw-ps-1" },
    alpha: { chatId: "087e5978-f3ed-4657-820e-aed49ae8aa0d", pid: 2, terminalWindowId: "tw-ps-2" },
  } };
  assert.equal(resolveSlot(doc, { sessionId: "087e5978-f3ed-4657-820e-aed49ae8aa0d" }).slot, "alpha");
});

test("resolveSlot: lenient substring still resolves when NO exact match exists (back-compat)", () => {
  // A full harness UUID still resolves the short-form claude-<8hex> slot (Pass 2).
  const doc = { slots: { alpha: { chatId: "claude-087e5978", pid: 1, terminalWindowId: "tw-wt-x" } } };
  assert.equal(resolveSlot(doc, { sessionId: "087e5978-f3ed-4657-820e-aed49ae8aa0d" }).slot, "alpha");
});

test("twidToOwningPid: tw-ps / tw-pa carry a STABLE owning-window pid", () => {
  assert.equal(twidToOwningPid("tw-ps-6789"), 6789);
  assert.equal(twidToOwningPid("tw-pa-42100"), 42100);
});

test("twidToOwningPid: tw-wt (no pid) and tw-pp (transient) -> null (never sent to)", () => {
  // tw-wt = Windows Terminal GUID, no pid encoded; the safety-critical case.
  assert.equal(twidToOwningPid("tw-wt-982d5bd8-921b-423f-b868-802f8caebc9b"), null);
  // tw-pp = immediate parent (often a dead bash) -- doctrine excludes it.
  assert.equal(twidToOwningPid("tw-pp-46708"), null);
});

test("twidToOwningPid: malformed / non-string / zero / negative -> null", () => {
  assert.equal(twidToOwningPid(null), null);
  assert.equal(twidToOwningPid(undefined), null);
  assert.equal(twidToOwningPid(6789), null);
  assert.equal(twidToOwningPid("tw-ps-0"), null);
  assert.equal(twidToOwningPid("tw-ps--5"), null);
  assert.equal(twidToOwningPid("tw-ps-abc"), null);
  assert.equal(twidToOwningPid("garbage"), null);
});

test("decideAction: a valid hwnd -> send", () => {
  assert.equal(decideAction({ hwnd: 99999, disabled: false }).action, "send");
});

test("decideAction: no/invalid hwnd -> fallback (the 'if possible' clause: not possible)", () => {
  assert.equal(decideAction({ hwnd: null, disabled: false }).action, "fallback");
  assert.equal(decideAction({ hwnd: 0, disabled: false }).action, "fallback");
  assert.equal(decideAction({ hwnd: -5, disabled: false }).action, "fallback");
  assert.equal(decideAction({ hwnd: 1.5, disabled: false }).action, "fallback");
});

test("decideAction: disabled knob -> fallback even with a valid hwnd (operator keeps /compact manual)", () => {
  const d = decideAction({ hwnd: 99999, disabled: true });
  assert.equal(d.action, "fallback");
  assert.match(d.why, /DISABLE/);
});

test("fallbackMessage: tells the operator to /compact manually + names the native backstop", () => {
  const m = fallbackMessage("no window");
  assert.match(m, /\/compact/);
  assert.match(m, /no window/);
  assert.match(m, /autocompact/i); // names the ~95% native backstop
});

// --- isPidAlive (live process probe) ---

test("isPidAlive: this process is alive; an unused high pid is dead; junk is dead", () => {
  assert.equal(isPidAlive(process.pid), true);
  assert.equal(isPidAlive(2_000_000_000), false); // not a live pid on any real host
  assert.equal(isPidAlive(0), false);
  assert.equal(isPidAlive(-1), false);
  assert.equal(isPidAlive(1.5), false);
  assert.equal(isPidAlive(null), false);
});

// --- resolveOwnWindow (tiered: UIA tab-focus -> title -> owning-pid, injected deps) ---

const TW_PS = { terminalWindowId: "tw-ps-4242" };
const TW_WT = { terminalWindowId: "tw-wt-982d5bd8-921b" };
// Deps that make EVERY tier miss unless a test overrides one (isolates each tier).
const MISS = {
  focusTab: () => ({ ok: false, error: "no-wt-process" }),
  enumWindows: () => ({ ok: true, windows: [] }),
  matchByTitle: () => ({ ok: false, error: "no-match" }),
  isAlive: () => false,
  resolveHwnd: () => ({ ok: false, error: "process-not-found" }),
};

test("resolveOwnWindow Tier1: UIA focuses this chat's WT tab by slot -> the hwnd (works on tw-wt)", () => {
  const r = resolveOwnWindow("alpha", TW_WT, { ...MISS, focusTab: () => ({ ok: true, hwnd: 111, tabName: "PRISM alpha" }) });
  assert.equal(r.hwnd, 111);
  assert.equal(r.tier, "uia");
});

test("resolveOwnWindow Tier2: no WT -> title-match 'PRISM <slot>' window -> the hwnd", () => {
  const r = resolveOwnWindow("bravo", TW_WT, { ...MISS,
    focusTab: () => ({ ok: false, error: "no-wt-process" }),
    enumWindows: () => ({ ok: true, windows: [{ hwnd: 222, title: "PRISM bravo" }] }),
    matchByTitle: () => ({ ok: true, hwnd: 222, match: "exact" }) });
  assert.equal(r.hwnd, 222);
  assert.equal(r.tier, "title");
});

test("resolveOwnWindow Tier3: no WT, no title -> stable owning pid -> the hwnd", () => {
  const r = resolveOwnWindow("bravo", TW_PS, { ...MISS,
    focusTab: () => ({ ok: false, error: "no-wt-process" }),
    isAlive: () => true, resolveHwnd: () => ({ ok: true, hwnd: 333 }) });
  assert.equal(r.hwnd, 333);
  assert.equal(r.tier, "pid");
});

test("resolveOwnWindow SAFETY: WT present but tab AMBIGUOUS -> fallback, lower tiers NEVER tried (never guess)", () => {
  let touched = false;
  const r = resolveOwnWindow("alpha", TW_WT, { ...MISS,
    focusTab: () => ({ ok: false, error: "ambiguous-tab" }),
    enumWindows: () => { touched = true; return { ok: true, windows: [] }; },
    matchByTitle: () => { touched = true; return { ok: true, hwnd: 999 }; },
    resolveHwnd: () => { touched = true; return { ok: true, hwnd: 999 }; } });
  assert.equal(r.hwnd, null);
  assert.equal(touched, false, "must NOT consult lower tiers when WT is present but the tab is ambiguous");
  assert.match(r.why, /not safely targetable|refusing to guess/);
});

test("resolveOwnWindow SAFETY: multi-pane tab (pane-count) -> fallback, lower tiers NEVER tried (arms them to prove refusal)", () => {
  // Arm every lower tier to RETURN a window so this fails if the multi-pane error
  // ever wrongly falls through (mutation: adding ok-bad-pane-count to the fallthrough set).
  let touched = false;
  const r = resolveOwnWindow("alpha", TW_WT, { ...MISS,
    focusTab: () => ({ ok: false, error: "ok-bad-pane-count:2" }),
    enumWindows: () => { touched = true; return { ok: true, windows: [{ hwnd: 999, title: "PRISM alpha" }] }; },
    matchByTitle: () => { touched = true; return { ok: true, hwnd: 999, match: "exact" }; },
    isAlive: () => { touched = true; return true; },
    resolveHwnd: () => { touched = true; return { ok: true, hwnd: 999 }; } });
  assert.equal(r.hwnd, null);
  assert.equal(r.tier, null);
  assert.equal(touched, false, "multi-pane tab must NOT fall through to lower tiers (never guess another chat's window)");
});

test("resolveOwnWindow Tier3: owning pid present but DEAD -> falls through to fallback (never resolves a dead pid)", () => {
  const r = resolveOwnWindow("bravo", TW_PS, { ...MISS,
    focusTab: () => ({ ok: false, error: "no-wt-process" }),
    isAlive: () => false, resolveHwnd: () => { throw new Error("must not resolve a dead pid"); } });
  assert.equal(r.hwnd, null);
});

test("resolveOwnWindow: all tiers miss -> fallback null with a human why", () => {
  const r = resolveOwnWindow("alpha", TW_WT, MISS);
  assert.equal(r.hwnd, null);
  assert.match(r.why, /no safely-resolvable window/);
});

// --- actuate (decide + actuate, side effects injected, R12 honesty + dry-run safety) ---

test("actuate: unresolvable window -> fallback, NEVER calls sendKeys", () => {
  let sent = false;
  const { payload } = actuate({ slot: "alpha", win: { hwnd: null, why: "tw-wt tab" },
    disabled: false, dryRun: false, handoff: { wrote: false }, sendKeys: () => { sent = true; return { ok: true }; }, log: NO_LOG });
  assert.equal(payload.ok, false);
  assert.equal(payload.action, "fallback");
  assert.equal(sent, false, "must not SendKeys when no window resolved");
});

test("actuate: dry-run with a real hwnd -> action 'dry-run', NEVER calls sendKeys (safe pre-flight)", () => {
  let sent = false;
  const { payload } = actuate({ slot: "bravo", win: { hwnd: 123, why: "via tw-ps" },
    disabled: false, dryRun: true, handoff: { wrote: true }, sendKeys: () => { sent = true; return { ok: true }; }, log: NO_LOG });
  assert.equal(payload.action, "dry-run");
  assert.equal(payload.ok, true);
  assert.equal(sent, false, "dry-run must not actually send");
});

test("actuate: resolved window + sendKeys ok -> action 'sent' (ok:true)", () => {
  const { payload } = actuate({ slot: "bravo", win: { hwnd: 123, why: "via tw-ps" },
    disabled: false, dryRun: false, handoff: { wrote: true }, sendKeys: () => ({ ok: true, chars: 9 }), log: NO_LOG });
  assert.equal(payload.action, "sent");
  assert.equal(payload.ok, true);
  assert.match(payload.message, /SENT '\/compact'/);
  assert.match(payload.message, /End your turn now/);
});

test("actuate: sendKeys FAILS -> honest fallback (ok:false), no fake success (R12)", () => {
  const { payload } = actuate({ slot: "bravo", win: { hwnd: 123, why: "via tw-ps" },
    disabled: false, dryRun: false, handoff: { wrote: true }, sendKeys: () => ({ ok: false, error: "IsWindow-false" }), log: NO_LOG });
  assert.equal(payload.ok, false);
  assert.equal(payload.action, "fallback");
  assert.match(payload.message, /SendKeys failed: IsWindow-false/);
});

test("actuate: disabled knob -> fallback even with a real hwnd, NEVER calls sendKeys", () => {
  let sent = false;
  const { payload } = actuate({ slot: "bravo", win: { hwnd: 123, why: "via tw-ps" },
    disabled: true, dryRun: false, handoff: { wrote: true }, sendKeys: () => { sent = true; return { ok: true }; }, log: NO_LOG });
  assert.equal(payload.ok, false);
  assert.equal(payload.action, "fallback");
  assert.equal(sent, false);
  assert.match(payload.message, /DISABLE/);
});

// -- SELF-STARTUP-MS0 pairing: spawnAutostartWatcher --------------------------

test("spawnAutostartWatcher: spawns detached self-startup --watch with the slot + confirm + loop-active", () => {
  let captured = null;
  const fakeSpawn = (bin, args, opts) => { captured = { bin, args, opts }; return { pid: 4242, unref() {} }; };
  const r = spawnAutostartWatcher({ slot: "bravo", sessionId: "uuid-1", _spawn: fakeSpawn });
  assert.equal(r.spawned, true);
  assert.equal(r.pid, 4242);
  assert.ok(captured.args.includes("--watch"), "must run the watcher mode");
  assert.equal(captured.args[captured.args.indexOf("--slot") + 1], "bravo");
  assert.equal(captured.args[captured.args.indexOf("--session-id") + 1], "uuid-1");
  assert.ok(captured.args.includes("--confirm"), "the paired watcher must actuate (self-startup is dry-run-by-default)");
  assert.ok(!captured.args.includes("--dry-run"), "must NOT pass --dry-run -- that would override --confirm and silently no-op the re-entry");
  assert.ok(captured.args.includes("--loop-active"), "the model self-compacted => assume loop-active");
  assert.ok(captured.args.some((a) => a.replace(/\\/g, "/").endsWith("scripts/self-startup.mjs")), "must target self-startup.mjs");
  assert.equal(captured.opts.detached, true, "must be detached so self-compact can exit");
  assert.equal(captured.opts.stdio, "ignore");
});

test("spawnAutostartWatcher: PRISM_SELF_COMPACT_NO_AUTOSTART=1 opts out (no spawn)", () => {
  const prev = process.env.PRISM_SELF_COMPACT_NO_AUTOSTART;
  process.env.PRISM_SELF_COMPACT_NO_AUTOSTART = "1";
  try {
    let called = false;
    const r = spawnAutostartWatcher({ slot: "bravo", sessionId: "x", _spawn: () => { called = true; return { pid: 1, unref() {} }; } });
    assert.equal(r.spawned, false);
    assert.equal(called, false, "must NOT spawn when opted out");
  } finally {
    if (prev === undefined) delete process.env.PRISM_SELF_COMPACT_NO_AUTOSTART;
    else process.env.PRISM_SELF_COMPACT_NO_AUTOSTART = prev;
  }
});

test("spawnAutostartWatcher: a spawn throw is fail-soft (never breaks self-compact)", () => {
  const r = spawnAutostartWatcher({ slot: "bravo", sessionId: "x", _spawn: () => { throw new Error("boom"); } });
  assert.equal(r.spawned, false);
  assert.match(r.why, /boom/);
});

// --- U-SELFCOMPACT-SINGLETAB (2026-06-24): (A) single-tab owning-pid fallthrough ---
// When UIA cannot name-match this chat's WT tab (no-tab / ambiguous-tab) the
// owning-window pid is SAFE to use IFF its WT window hosts exactly ONE tab.

// Deps where the singletab path can engage: WT present (no-tab) + a live owning
// pid resolvable; the per-test override supplies the tab count + pid source.
const ST_MISS = {
  focusTab: () => ({ ok: false, error: "no-tab" }),
  enumWindows: () => ({ ok: true, windows: [] }),
  matchByTitle: () => ({ ok: false, error: "no-match" }),
  isAlive: () => false,
  resolveHwnd: () => ({ ok: false, error: "process-not-found" }),
  countTabs: () => ({ ok: false, error: "no-window" }),
  liveOwningPid: () => null,
};

test("resolveOwnWindow Tier1.5: no-tab + single-tab owning window -> singletab hwnd", () => {
  const r = resolveOwnWindow("charlie", { terminalWindowId: "tw-pa-999" }, {
    ...ST_MISS, liveOwningPid: () => 555, isAlive: (p) => p === 555,
    countTabs: (p) => (p === 555 ? { ok: true, hwnd: 7777, tabCount: 1 } : { ok: false }),
  });
  assert.equal(r.tier, "singletab");
  assert.equal(r.hwnd, 7777);
});

test("resolveOwnWindow Tier1.5 SAFETY: no-tab + MULTI-tab owning window -> REFUSE (null)", () => {
  let touchedLower = false;
  const r = resolveOwnWindow("charlie", { terminalWindowId: "tw-pa-999" }, {
    ...ST_MISS, liveOwningPid: () => 555, isAlive: (p) => p === 555,
    countTabs: () => ({ ok: true, hwnd: 7777, tabCount: 3 }),
    enumWindows: () => { touchedLower = true; return { ok: true, windows: [] }; },
  });
  assert.equal(r.hwnd, null);
  assert.equal(r.tier, null);
  assert.equal(touchedLower, false, "multi-tab owning window must NOT fall through to lower tiers");
  assert.match(r.why, /not single-tab|refusing to guess/);
});

test("resolveOwnWindow Tier1.5: ambiguous-tab + single-tab -> singletab (REAL PS envelope 'ambiguous-tab N')", () => {
  // The PS layer emits `FAIL ambiguous-tab <count>` -> parseFocusOutput yields the
  // error WITH the count ("ambiguous-tab 2"), NOT the bare token. Mock the REAL
  // production string (scrutiny arm A P3 / R9 contract-mock fix).
  const r = resolveOwnWindow("charlie", { terminalWindowId: "tw-pa-999" }, {
    ...ST_MISS, focusTab: () => ({ ok: false, error: "ambiguous-tab 2" }),
    liveOwningPid: () => 555, isAlive: (p) => p === 555,
    countTabs: () => ({ ok: true, hwnd: 8888, tabCount: 1 }),
  });
  assert.equal(r.tier, "singletab");
  assert.equal(r.hwnd, 8888);
});

// isSingleTabFallthroughError: the gate that decides which UIA errors qualify for
// the single-tab rescue. MUST match the REAL PS envelope, not a convenient bare token.
test("isSingleTabFallthroughError: no-tab (exact) + ambiguous-tab (with count) qualify", () => {
  assert.equal(isSingleTabFallthroughError("no-tab"), true);
  assert.equal(isSingleTabFallthroughError("ambiguous-tab 2"), true);   // REAL PS envelope
  assert.equal(isSingleTabFallthroughError("ambiguous-tab 17"), true);
  assert.equal(isSingleTabFallthroughError("ambiguous-tab"), true);      // bare form also accepted
});

test("isSingleTabFallthroughError: pane-count / matched-but-multipane / unrelated errors do NOT qualify", () => {
  assert.equal(isSingleTabFallthroughError("ok-bad-pane-count:2"), false); // name-MATCHED multi-pane -> hard stop
  assert.equal(isSingleTabFallthroughError("pane-count 3"), false);
  assert.equal(isSingleTabFallthroughError("no-wt-process"), false);       // handled by Tier2/3 fallthrough
  assert.equal(isSingleTabFallthroughError("no-select-pattern"), false);
  assert.equal(isSingleTabFallthroughError("disabled"), false);
  assert.equal(isSingleTabFallthroughError(""), false);
  assert.equal(isSingleTabFallthroughError(null), false);
  assert.equal(isSingleTabFallthroughError(undefined), false);
  assert.equal(isSingleTabFallthroughError(123), false);
});

test("resolveOwnWindow Tier1.5 SAFETY: pane-count error is NEVER a singletab candidate (hard stop)", () => {
  // pane-count means a name-MATCHED tab is multi-pane -- a different hazard. Even
  // with a live single-tab owning window it must keep the hard-stop refusal.
  let touchedLower = false;
  const r = resolveOwnWindow("charlie", { terminalWindowId: "tw-pa-999" }, {
    ...ST_MISS, focusTab: () => ({ ok: false, error: "ok-bad-pane-count:2" }),
    liveOwningPid: () => 555, isAlive: (p) => p === 555,
    countTabs: () => { touchedLower = true; return { ok: true, hwnd: 9, tabCount: 1 }; },
    enumWindows: () => { touchedLower = true; return { ok: true, windows: [] }; },
  });
  assert.equal(r.hwnd, null);
  assert.equal(r.tier, null);
  assert.equal(touchedLower, false, "pane-count must NOT consult countTabs or lower tiers");
});

test("resolveOwnWindow Tier1.5: no owning pid (explorer-launched chat) -> no singletab, falls to hard-stop", () => {
  // The genuinely-unresolvable case (no live PS ancestor, recorded pid dead):
  // singletab cannot engage; the no-tab hard-stop refusal stands -> fallback.
  let countCalled = false;
  const r = resolveOwnWindow("charlie", { terminalWindowId: "tw-pa-999", pid: 111 }, {
    ...ST_MISS, liveOwningPid: () => null, isAlive: () => false,
    countTabs: () => { countCalled = true; return { ok: true, hwnd: 1, tabCount: 1 }; },
  });
  assert.equal(r.hwnd, null);
  assert.equal(countCalled, false, "no owning pid -> countTabs never called");
  assert.match(r.why, /not safely targetable|refusing to guess/);
});

// LAZY pid resolution (scrutiny arm C P2): the expensive PS ancestry walk must fire
// ONLY when a tier needs a pid -- never on UIA-success nor on the pane-count hard-stop.
test("resolveOwnWindow LAZY: UIA success -> liveOwningPid (PS spawn) NEVER called", () => {
  let liveCalls = 0;
  const r = resolveOwnWindow("charlie", { terminalWindowId: "tw-pa-999", pid: 111 }, {
    ...ST_MISS, focusTab: () => ({ ok: true, hwnd: 42, tabName: "c" }),
    liveOwningPid: () => { liveCalls++; return 555; },
  });
  assert.equal(r.tier, "uia");
  assert.equal(liveCalls, 0, "UIA success must not trigger the live-pid PS walk");
});

test("resolveOwnWindow LAZY: pane-count hard-stop -> liveOwningPid (PS spawn) NEVER called", () => {
  let liveCalls = 0;
  const r = resolveOwnWindow("charlie", { terminalWindowId: "tw-pa-999", pid: 111 }, {
    ...ST_MISS, focusTab: () => ({ ok: false, error: "ok-bad-pane-count:2" }),
    liveOwningPid: () => { liveCalls++; return 555; },
  });
  assert.equal(r.tier, null);
  assert.equal(liveCalls, 0, "pane-count hard-stop must not trigger the live-pid PS walk");
});

test("resolveOwnWindow LAZY: pid resolved AT MOST ONCE across singletab + tier3 paths", () => {
  // A no-tab path that fails the singletab count then would reach... actually singletab
  // refuses on multi-tab; assert the resolver memoizes (no double PS spawn) for no-tab.
  let liveCalls = 0;
  resolveOwnWindow("charlie", { terminalWindowId: "tw-pa-999", pid: 111 }, {
    ...ST_MISS, focusTab: () => ({ ok: false, error: "no-tab" }),
    liveOwningPid: () => { liveCalls++; return 555; }, isAlive: (p) => p === 555,
    countTabs: () => ({ ok: true, hwnd: 7, tabCount: 1 }),
  });
  assert.equal(liveCalls, 1, "live-pid resolved exactly once (memoized), never per-tier");
});

// --- (B) resolveOwningPidForChat: live re-resolution preferred over stale recorded ---

test("resolveOwningPidForChat: live owning pid (alive) preferred over recorded", () => {
  const r = resolveOwningPidForChat({ pid: 111, terminalWindowId: "tw-pa-222" }, () => 333, (x) => x === 333);
  assert.equal(r, 333);
});

test("resolveOwningPidForChat: live dead -> falls back to recorded (alive)", () => {
  const r = resolveOwningPidForChat({ pid: 111, terminalWindowId: "tw-pa-222" }, () => 333, (x) => x === 222);
  assert.equal(r, 222);
});

test("resolveOwningPidForChat: both dead -> null (never returns a dead pid)", () => {
  const r = resolveOwningPidForChat({ pid: 111, terminalWindowId: "tw-pa-222" }, () => 333, () => false);
  assert.equal(r, null);
});

test("resolveOwningPidForChat: no live resolver + no recorded pid -> null", () => {
  assert.equal(resolveOwningPidForChat({ pid: 111 }, null, () => true), null);
  assert.equal(resolveOwningPidForChat({ pid: 111, terminalWindowId: "tw-wt-abc" }, () => null, () => true), null); // tw-wt has no pid
});

test("resolveOwningPidForChat: live resolver returns a non-positive/non-int -> ignored, recorded used", () => {
  assert.equal(resolveOwningPidForChat({ terminalWindowId: "tw-pa-222" }, () => 0, (x) => x === 222), 222);
  assert.equal(resolveOwningPidForChat({ terminalWindowId: "tw-pa-222" }, () => 1.5, (x) => x === 222), 222);
  assert.equal(resolveOwningPidForChat({ terminalWindowId: "tw-pa-222" }, () => -7, (x) => x === 222), 222);
});

// --- (B) resolveLiveOwningPid: walk from the chat's live pid to its shell host ---

test("resolveLiveOwningPid: missing/invalid entry.pid -> null (no walk)", () => {
  assert.equal(resolveLiveOwningPid({}), null);
  assert.equal(resolveLiveOwningPid({ pid: 0 }), null);
  assert.equal(resolveLiveOwningPid({ pid: -3 }), null);
  assert.equal(resolveLiveOwningPid({ pid: "abc" }), null);
  assert.equal(resolveLiveOwningPid(null), null);
});
