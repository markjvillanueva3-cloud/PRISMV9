#!/usr/bin/env node
/**
 * rba-lane-integration.test.mjs -- RBA-INFERENCE-LANE-MS0 (slot:india)
 * Run: node scripts/lib/rba-lane-integration.test.mjs
 *
 * R15 step-2: proves the CONSUMER wiring works through the REAL bridge code paths
 * (ollama-fanout.callOllamaOnce + ask-ollama.callOllama), not just the lease lib in
 * isolation. With a HIGH-priority lease present, a background generate must yield;
 * with none, it must be instant (the hot path is not slowed when RBA is off).
 *
 * Isolation: PRISM_OLLAMA_LEASE_PATH is pointed at a temp file BEFORE the lease lib
 * first loads (it reads the env at module-load), so this never touches the live lease.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const LEASE = path.join(os.tmpdir(), `rba-lane-itest-${process.pid}.json`);
process.env.PRISM_OLLAMA_LEASE_PATH = LEASE; // MUST be set before the lib loads (first bridge call)

const { callOllamaOnce } = await import("./ollama-fanout.mjs");
const { callOllama } = await import("../ask-ollama.mjs");
const { PRIORITY } = await import("./ollama-priority-lease.mjs");

// Stub Ollama /api/generate: resolve immediately so the ONLY measurable latency is the yield.
const stubFetch = async () => ({ ok: true, status: 200, json: async () => ({ response: "ok", eval_count: 1, done: true }) });

function writeLease(ttlMs) {
  fs.mkdirSync(path.dirname(LEASE), { recursive: true });
  fs.writeFileSync(LEASE, JSON.stringify({ priority: PRIORITY.RBA, expiresAt: Date.now() + ttlMs, holder: "itest-rba" }));
}
const clear = () => fs.rmSync(LEASE, { force: true });

test("ollama-fanout.callOllamaOnce YIELDS to a present higher-priority lease (real wiring)", async () => {
  writeLease(300);
  const t0 = Date.now();
  await callOllamaOnce("hi", { fetchImpl: stubFetch });
  const dt = Date.now() - t0;
  clear();
  assert.ok(dt >= 250, `expected to yield ~300ms to the RBA lease, waited only ${dt}ms`);
});

test("ollama-fanout.callOllamaOnce is INSTANT when no lease is present (hot path not slowed)", async () => {
  clear();
  const t0 = Date.now();
  await callOllamaOnce("hi", { fetchImpl: stubFetch });
  const dt = Date.now() - t0;
  assert.ok(dt < 200, `expected instant background call, took ${dt}ms`);
});

test("ask-ollama.callOllama YIELDS to a present higher-priority lease (real wiring)", async () => {
  writeLease(300);
  const t0 = Date.now();
  await callOllama("m", "hi", { fetchImpl: stubFetch });
  const dt = Date.now() - t0;
  clear();
  assert.ok(dt >= 250, `expected to yield ~300ms to the RBA lease, waited only ${dt}ms`);
});

test("ask-ollama.callOllama is INSTANT when no lease is present", async () => {
  clear();
  const t0 = Date.now();
  await callOllama("m", "hi", { fetchImpl: stubFetch });
  const dt = Date.now() - t0;
  assert.ok(dt < 200, `expected instant background call, took ${dt}ms`);
});

test("a background caller does NOT yield to its own RBA context (PRISM_RBA_IN_FLIGHT round-trip)", async () => {
  writeLease(300);
  const prev = process.env.PRISM_RBA_IN_FLIGHT;
  process.env.PRISM_RBA_IN_FLIGHT = "1";
  try {
    const t0 = Date.now();
    await callOllamaOnce("hi", { fetchImpl: stubFetch });
    const dt = Date.now() - t0;
    assert.ok(dt < 200, `in-flight RBA context must NOT yield to its own lease, but waited ${dt}ms`);
  } finally {
    if (prev === undefined) delete process.env.PRISM_RBA_IN_FLIGHT;
    else process.env.PRISM_RBA_IN_FLIGHT = prev;
    clear();
  }
});
