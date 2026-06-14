// Tests for the model-invokable self-compact actuator's pure logic. node --test.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  resolveSlot, twidToOwningPid, decideAction, fallbackMessage,
  isPidAlive, resolveOwnWindow, actuate,
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
