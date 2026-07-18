/**
 * self-startup.test.mjs -- hermetic coverage for the self-startup actuator
 * (SELF-STARTUP-MS0, the symmetric twin of self-compact). No real window, no real
 * spawn, no real transcript: every side effect is injected. Tests encode INTENT
 * (R9): the two safety gates (never interrupt a working chat, never restart a
 * stopped one) must FAIL the test if they regress.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  buildReentryText,
  isLoopActive,
  classifyStall,
  decideReentry,
  resolveDryRun,
  runOnce,
  runWatch,
} from "./self-startup.mjs";

// ── buildReentryText ─────────────────────────────────────────────────────────

test("buildReentryText: default is the full /startup /loop /goal re-entry", () => {
  assert.equal(buildReentryText("bravo"), "/startup-bravo /loop [10m] /goal");
});

test("buildReentryText: custom loopArg is honored", () => {
  assert.equal(buildReentryText("alpha", { loopArg: "[30m]" }), "/startup-alpha /loop [30m] /goal");
});

// ── isLoopActive ─────────────────────────────────────────────────────────────

test("isLoopActive: assume:true short-circuits regardless of content", () => {
  assert.equal(isLoopActive(null, { assume: true }), true);
  assert.equal(isLoopActive("", { assume: true }), true);
});

test("isLoopActive: a RESUME_LOOP section marks loop-active", () => {
  assert.equal(isLoopActive("## RESUME_LOOP\nkeep building C1"), true);
});

test("isLoopActive: a /loop ... /goal directive marks loop-active", () => {
  assert.equal(isLoopActive("Re-enter: /startup-bravo /loop [10m] /goal"), true);
});

test("isLoopActive: a deliberately-stopped handoff (no loop markers) is NOT active", () => {
  assert.equal(isLoopActive("## RESUME\nTask complete. Standing by for operator."), false);
});

test("isLoopActive: adversarial -- null/empty/non-string is not active", () => {
  assert.equal(isLoopActive(null), false);
  assert.equal(isLoopActive(""), false);
  assert.equal(isLoopActive(42), false);
  // /loop without /goal must NOT trip the directive heuristic.
  assert.equal(isLoopActive("mention of /loop only, no goal"), false);
});

// ── classifyStall (inverts classifyAccumulation) ─────────────────────────────

const snap = (sizeBytes, p = "x.jsonl", exists = true) => ({ exists, sizeBytes, mtimeMs: 1, path: p });

test("classifyStall: flat transcript over the window => stalled", () => {
  assert.equal(classifyStall(snap(1000), snap(1000)), "stalled");
});

test("classifyStall: transcript grew past the floor => working", () => {
  assert.equal(classifyStall(snap(1000), snap(1000 + 600)), "working");
});

test("classifyStall: a NEW transcript file appeared => working (fresh session)", () => {
  assert.equal(classifyStall(snap(1000, "old.jsonl"), snap(50, "new.jsonl")), "working");
});

test("classifyStall: adversarial -- a vanished/empty after-transcript => stalled", () => {
  assert.equal(classifyStall(snap(1000), { exists: false, sizeBytes: 0, mtimeMs: 0, path: null }), "stalled");
  assert.equal(classifyStall(snap(1000), snap(0)), "stalled");
});

// ── decideReentry (the two gates) ────────────────────────────────────────────

test("decideReentry: disabled => skip (never SendKeys)", () => {
  assert.equal(decideReentry({ stalled: true, loopActive: true, hwnd: 123, disabled: true }).action, "skip");
});

test("decideReentry: not loop-active => skip (never force-restart a stopped chat)", () => {
  const d = decideReentry({ stalled: true, loopActive: false, hwnd: 123, disabled: false });
  assert.equal(d.action, "skip");
  assert.match(d.why, /not loop-active/);
});

test("decideReentry: working (not stalled) => skip (never interrupt a producing chat)", () => {
  const d = decideReentry({ stalled: false, loopActive: true, hwnd: 123, disabled: false });
  assert.equal(d.action, "skip");
  assert.match(d.why, /accumulating/);
});

test("decideReentry: stalled + loop-active + window => send", () => {
  assert.equal(decideReentry({ stalled: true, loopActive: true, hwnd: 123, disabled: false }).action, "send");
});

test("decideReentry: stalled + loop-active but no window => fallback", () => {
  assert.equal(decideReentry({ stalled: true, loopActive: true, hwnd: null, disabled: false }).action, "fallback");
});

test("decideReentry: adversarial -- non-positive / non-integer hwnd => fallback", () => {
  for (const hwnd of [0, -5, 12.5, NaN, Infinity, "123"]) {
    assert.equal(decideReentry({ stalled: true, loopActive: true, hwnd, disabled: false }).action, "fallback", `hwnd=${hwnd}`);
  }
});

// ── resolveDryRun (the actuation gate -- dry-run BY DEFAULT) ──────────────────

test("resolveDryRun: bare invocation (no flags) is DRY-RUN (safe default)", () => {
  assert.equal(resolveDryRun({ confirm: false, dryRunFlag: false }), true);
  assert.equal(resolveDryRun({}), true);
});

test("resolveDryRun: --confirm actuates (dryRun=false)", () => {
  assert.equal(resolveDryRun({ confirm: true, dryRunFlag: false }), false);
});

test("resolveDryRun: explicit --dry-run ALWAYS wins, even with --confirm (hard safety override)", () => {
  assert.equal(resolveDryRun({ confirm: true, dryRunFlag: true }), true);
});

// ── runOnce (injected deps -- no real window/spawn) ──────────────────────────

const okWin = () => ({ hwnd: 99, why: "test-window" });
const noWin = () => ({ hwnd: null, why: "no window resolvable" });
const stalledPair = { before: snap(1000), after: snap(1000) };   // flat => stalled
const workingPair = { before: snap(1000), after: snap(1700) };   // +700 => working

test("runOnce: stalled + loop-active + window + confirm => SENT", () => {
  const events = [];
  let sentText = null;
  const r = runOnce({
    slot: "bravo", entry: {}, ...stalledPair, loopActive: true, dryRun: false,
    resolveWin: okWin,
    sendKeys: ({ text }) => { sentText = text; return { ok: true, chars: text.length }; },
    log: (e) => events.push(e),
  });
  assert.equal(r.payload.action, "sent");
  assert.equal(r.payload.ok, true);
  assert.equal(sentText, "/startup-bravo /loop [10m] /goal");
  assert.equal(events.at(-1).action, "send");
});

test("runOnce: dry-run never calls sendKeys (no real keystrokes)", () => {
  let called = false;
  const r = runOnce({
    slot: "bravo", entry: {}, ...stalledPair, loopActive: true, dryRun: true,
    resolveWin: okWin, sendKeys: () => { called = true; return { ok: true }; }, log: () => {},
  });
  assert.equal(r.payload.action, "dry-run");
  assert.equal(called, false, "dry-run MUST NOT actuate");
  assert.match(r.payload.message, /DRY-RUN: would SendKeys/);
});

test("runOnce: working chat => skip, sendKeys never called (the no-interrupt gate)", () => {
  let called = false;
  const r = runOnce({
    slot: "bravo", entry: {}, ...workingPair, loopActive: true, dryRun: false,
    resolveWin: okWin, sendKeys: () => { called = true; return { ok: true }; }, log: () => {},
  });
  assert.equal(r.payload.action, "skip");
  assert.equal(called, false, "a working chat MUST NOT be actuated");
});

test("runOnce: not-loop-active => skip even when stalled (the no-force-restart gate)", () => {
  let called = false;
  const r = runOnce({
    slot: "bravo", entry: {}, ...stalledPair, loopActive: false, dryRun: false,
    resolveWin: okWin, sendKeys: () => { called = true; return { ok: true }; }, log: () => {},
  });
  assert.equal(r.payload.action, "skip");
  assert.equal(called, false);
});

test("runOnce: stalled + loop-active but no window => fallback (no fabricated success)", () => {
  const r = runOnce({
    slot: "bravo", entry: {}, ...stalledPair, loopActive: true, dryRun: false,
    resolveWin: noWin, sendKeys: () => { throw new Error("must not send"); }, log: () => {},
  });
  assert.equal(r.payload.action, "fallback");
  assert.equal(r.payload.ok, false);
});

test("runOnce: SendKeys failure => fallback ok:false (R12, never fabricate sent)", () => {
  const r = runOnce({
    slot: "bravo", entry: {}, ...stalledPair, loopActive: true, dryRun: false,
    resolveWin: okWin, sendKeys: () => ({ ok: false, error: "spawn-threw" }), log: () => {},
  });
  assert.equal(r.payload.action, "fallback");
  assert.equal(r.payload.ok, false);
  assert.match(r.payload.sendError, /spawn-threw/);
});

test("runOnce: disabled => skip regardless of gates", () => {
  let called = false;
  const r = runOnce({
    slot: "bravo", entry: {}, ...stalledPair, loopActive: true, dryRun: false, disabled: true,
    resolveWin: okWin, sendKeys: () => { called = true; return { ok: true }; }, log: () => {},
  });
  assert.equal(r.payload.action, "skip");
  assert.equal(called, false);
});

// ── runWatch (injected sleep/stat -- deterministic, no timers) ───────────────

test("runWatch: post-compact STALL => re-enters (the core fix)", async () => {
  const sleeps = [];
  let sentText = null;
  // statFn returns the same flat snapshot both samples => stalled.
  const r = await runWatch({
    slot: "bravo", entry: {}, loopActive: true, dryRun: false,
    delayMs: 1, pollMs: 1,
    sleep: (ms) => { sleeps.push(ms); return Promise.resolve(); },
    statFn: () => snap(2000),
    resolveWin: okWin,
    sendKeys: ({ text }) => { sentText = text; return { ok: true }; },
    log: () => {},
  });
  assert.equal(r.payload.action, "sent");
  assert.equal(sentText, "/startup-bravo /loop [10m] /goal");
  assert.deepEqual(sleeps, [1, 1], "must sleep the settle delay then the poll window");
});

test("runWatch: chat auto-continued (growing transcript) => skip (no double-trigger)", async () => {
  let n = 0;
  let called = false;
  const r = await runWatch({
    slot: "bravo", entry: {}, loopActive: true, dryRun: false,
    delayMs: 1, pollMs: 1,
    sleep: () => Promise.resolve(),
    statFn: () => snap(1000 + (n++ * 1000)),   // grows between the two samples => working
    resolveWin: okWin,
    sendKeys: () => { called = true; return { ok: true }; },
    log: () => {},
  });
  assert.equal(r.payload.action, "skip");
  assert.equal(called, false, "an auto-continued chat MUST NOT be double-triggered");
});
