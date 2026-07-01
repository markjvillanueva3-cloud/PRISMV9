#!/usr/bin/env node
/**
 * ollama-priority-lease.test.mjs -- RBA-INFERENCE-LANE-MS0 (slot:india)
 * Run: node scripts/lib/ollama-priority-lease.test.mjs
 *
 * R9: every assertion guards the fail-OPEN contract -- a bug here that made the
 * lease block/hang/over-yield would convert a latency mitigation into a fleet-wide
 * Ollama stall. The lease must ONLY ever reduce RBA's queue probability, never add latency.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  parseLease, isExpired, shouldYield, yieldDelayMs,
  activeLease, acquireLease, yieldToHigherPriority, PRIORITY,
} from "./ollama-priority-lease.mjs";

const tmp = () => path.join(os.tmpdir(), `opl-${process.pid}-${Math.floor(Math.random() * 1e9)}.json`);
const NOW = 1_000_000;

// ---- pure parsing / expiry / yield ----

test("parseLease: valid -> object; garbage/empty/missing-fields -> null", () => {
  assert.deepEqual(parseLease(JSON.stringify({ priority: 100, expiresAt: 5, holder: "rba" })), { priority: 100, expiresAt: 5, holder: "rba" });
  assert.equal(parseLease("not json"), null);
  assert.equal(parseLease(""), null);
  assert.equal(parseLease(JSON.stringify({ priority: 100 })), null, "missing expiresAt");
  assert.equal(parseLease(JSON.stringify({ expiresAt: "nope", priority: 1 })), null);
  assert.equal(parseLease(42), null);
});

test("isExpired: live=false, past=true, garbage=true", () => {
  assert.equal(isExpired({ expiresAt: NOW + 100 }, NOW), false);
  assert.equal(isExpired({ expiresAt: NOW - 1 }, NOW), true);
  assert.equal(isExpired({ expiresAt: NOW }, NOW), true, "boundary: at-expiry counts as expired");
  assert.equal(isExpired(null, NOW), true);
});

test("shouldYield: lower-pri caller yields to a live higher-pri lease", () => {
  const lease = { priority: PRIORITY.RBA, expiresAt: NOW + 1000 };
  assert.equal(shouldYield(lease, PRIORITY.BACKGROUND, NOW), true);
});

test("shouldYield: equal or higher priority never yields", () => {
  const lease = { priority: PRIORITY.RBA, expiresAt: NOW + 1000 };
  assert.equal(shouldYield(lease, PRIORITY.RBA, NOW), false, "equal pri does not yield");
  assert.equal(shouldYield(lease, PRIORITY.RBA + 1, NOW), false, "higher pri does not yield");
});

test("shouldYield: expired / absent / NaN-priority never yields (fail-open)", () => {
  assert.equal(shouldYield({ priority: 100, expiresAt: NOW - 1 }, 0, NOW), false, "expired");
  assert.equal(shouldYield(null, 0, NOW), false, "no lease");
  assert.equal(shouldYield({ priority: 100, expiresAt: NOW + 1000 }, Number.NaN, NOW), false, "unknown caller pri proceeds");
});

test("yieldDelayMs: 0 when not yielding; positive + capped when yielding", () => {
  assert.equal(yieldDelayMs(null, 0, NOW), 0);
  const near = { priority: 100, expiresAt: NOW + 200 };
  assert.equal(yieldDelayMs(near, 0, NOW), 200, "waits until lease expiry when short");
  const far = { priority: 100, expiresAt: NOW + 999999 };
  assert.equal(yieldDelayMs(far, 0, NOW), 1200, "capped at MAX_YIELD_MS (never an unbounded wait)");
});

// ---- real-fs lifecycle (fail-soft) ----

test("acquireLease writes a lease that activeLease reads back; release removes it", () => {
  const p = tmp();
  try {
    const h = acquireLease({ priority: PRIORITY.RBA, ttlMs: 5000, holder: "rba-test", nowMs: NOW, leasePath: p });
    assert.equal(h.wrote, true);
    const live = activeLease({ nowMs: NOW + 10, leasePath: p });
    assert.equal(live.priority, PRIORITY.RBA);
    assert.equal(live.holder, "rba-test");
    h.release();
    assert.equal(activeLease({ nowMs: NOW + 10, leasePath: p }), null, "released -> no active lease");
  } finally { fs.rmSync(p, { force: true }); }
});

test("activeLease returns null for an absent file and for an expired lease", () => {
  const p = tmp();
  assert.equal(activeLease({ nowMs: NOW, leasePath: p }), null, "absent");
  fs.writeFileSync(p, JSON.stringify({ priority: 100, expiresAt: NOW - 1, holder: "old" }));
  try { assert.equal(activeLease({ nowMs: NOW, leasePath: p }), null, "expired"); }
  finally { fs.rmSync(p, { force: true }); }
});

test("acquireLease is fail-open: an unwritable path yields a no-op handle, never throws", () => {
  // a path whose parent is a FILE (not a dir) cannot be written
  const f = tmp();
  fs.writeFileSync(f, "x");
  const badPath = path.join(f, "child", "lease.json"); // f is a file -> mkdir/write fails
  try {
    let h;
    assert.doesNotThrow(() => { h = acquireLease({ nowMs: NOW, leasePath: badPath }); });
    assert.equal(h.wrote, false, "could not write -> wrote:false");
    assert.doesNotThrow(() => h.release(), "release on a no-op handle is safe");
  } finally { fs.rmSync(f, { force: true }); }
});

test("release does NOT clobber a newer holder's lease (only removes its own)", () => {
  const p = tmp();
  try {
    const mine = acquireLease({ holder: "mine", ttlMs: 5000, nowMs: NOW, leasePath: p });
    // a newer holder overwrites the lease
    acquireLease({ holder: "newer", ttlMs: 5000, nowMs: NOW + 1, leasePath: p });
    mine.release();
    const live = activeLease({ nowMs: NOW + 10, leasePath: p });
    assert.ok(live && live.holder === "newer", "the newer holder's lease survives my release");
  } finally { fs.rmSync(p, { force: true }); }
});

// ---- consumer side: yieldToHigherPriority (the bridge back-off) ----

const NOW2 = 2_000_000;
const writeLease = (p, lease) => fs.writeFileSync(p, JSON.stringify(lease));

test("yieldToHigherPriority waits exactly until a live higher-priority lease expires (capped)", async () => {
  const p = tmp();
  writeLease(p, { priority: PRIORITY.RBA, expiresAt: NOW2 + 500, holder: "rba" });
  let slept = 0;
  try {
    const r = await yieldToHigherPriority({ myPriority: PRIORITY.BACKGROUND, leasePath: p, nowMs: NOW2, sleepFn: async (ms) => { slept = ms; }, env: {} });
    assert.equal(r.yielded, true);
    assert.equal(r.waitedMs, 500);
    assert.equal(slept, 500);
  } finally { fs.rmSync(p, { force: true }); }
});

test("yieldToHigherPriority is instant (sleepFn never called) when no lease file exists -- hot-path", async () => {
  const p = tmp(); // never written
  let slept = -1;
  const r = await yieldToHigherPriority({ leasePath: p, nowMs: NOW2, sleepFn: async (ms) => { slept = ms; }, env: {} });
  assert.equal(r.yielded, false);
  assert.equal(r.waitedMs, 0);
  assert.equal(slept, -1, "no parse, no sleep -> cheap on the background hot path");
});

test("yieldToHigherPriority does not wait on an expired lease", async () => {
  const p = tmp();
  writeLease(p, { priority: PRIORITY.RBA, expiresAt: NOW2 - 1, holder: "old" });
  try {
    const r = await yieldToHigherPriority({ leasePath: p, nowMs: NOW2, sleepFn: async () => { throw new Error("should not sleep"); }, env: {} });
    assert.equal(r.yielded, false);
  } finally { fs.rmSync(p, { force: true }); }
});

test("yieldToHigherPriority does not yield to an equal/lower-priority lease", async () => {
  const p = tmp();
  writeLease(p, { priority: PRIORITY.BACKGROUND, expiresAt: NOW2 + 500, holder: "bg" });
  try {
    const r = await yieldToHigherPriority({ myPriority: PRIORITY.BACKGROUND, leasePath: p, nowMs: NOW2, sleepFn: async () => {}, env: {} });
    assert.equal(r.yielded, false);
  } finally { fs.rmSync(p, { force: true }); }
});

test("yieldToHigherPriority self-skips under PRISM_RBA_IN_FLIGHT=1 (never yield to our own vote's lease)", async () => {
  const p = tmp();
  writeLease(p, { priority: PRIORITY.RBA, expiresAt: NOW2 + 500, holder: "rba" });
  try {
    const r = await yieldToHigherPriority({ leasePath: p, nowMs: NOW2, sleepFn: async () => {}, env: { PRISM_RBA_IN_FLIGHT: "1" } });
    assert.equal(r.yielded, false);
  } finally { fs.rmSync(p, { force: true }); }
});

test("yieldToHigherPriority honors the PRISM_OLLAMA_LEASE_CONSUMER_DISABLE kill switch", async () => {
  const p = tmp();
  writeLease(p, { priority: PRIORITY.RBA, expiresAt: NOW2 + 500, holder: "rba" });
  try {
    const r = await yieldToHigherPriority({ leasePath: p, nowMs: NOW2, sleepFn: async () => {}, env: { PRISM_OLLAMA_LEASE_CONSUMER_DISABLE: "1" } });
    assert.equal(r.yielded, false);
  } finally { fs.rmSync(p, { force: true }); }
});

test("yieldToHigherPriority is fail-open: a throwing sleepFn never propagates", async () => {
  const p = tmp();
  writeLease(p, { priority: PRIORITY.RBA, expiresAt: NOW2 + 500, holder: "rba" });
  try {
    let r;
    await assert.doesNotReject(async () => {
      r = await yieldToHigherPriority({ leasePath: p, nowMs: NOW2, sleepFn: async () => { throw new Error("sleep boom"); }, env: {} });
    });
    assert.equal(r.yielded, false, "a sleep fault degrades to no-yield, never a thrown background call");
  } finally { fs.rmSync(p, { force: true }); }
});
