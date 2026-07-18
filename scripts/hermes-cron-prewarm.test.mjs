// Tests for hermes-cron-prewarm.mjs pure core (R9: real behavior, not stubs).
// Run: node --test scripts/hermes-cron-prewarm.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { selectModelsToWarm, keepAliveFor } from "./hermes-cron-prewarm.mjs";

const NOW = Date.parse("2026-06-10T12:00:00-05:00");
const LEAD = 15 * 60_000;
const iso = (ms) => new Date(ms).toISOString();

test("includes an enabled local job due within the lead window", () => {
  const jobs = [{ id: "a", model: "gpt-oss:120b", enabled: true, next_run_at: iso(NOW + 10 * 60_000) }];
  assert.deepEqual(selectModelsToWarm(jobs, NOW, LEAD), ["gpt-oss:120b"]);
});

test("excludes a job due beyond the lead window", () => {
  const jobs = [{ id: "a", model: "gpt-oss:120b", enabled: true, next_run_at: iso(NOW + 2 * 60 * 60_000) }];
  assert.deepEqual(selectModelsToWarm(jobs, NOW, LEAD), []);
});

test("excludes a disabled job", () => {
  const jobs = [{ id: "a", model: "gpt-oss:20b", enabled: false, next_run_at: iso(NOW + 5 * 60_000) }];
  assert.deepEqual(selectModelsToWarm(jobs, NOW, LEAD), []);
});

test("excludes a non-Ollama fallback model (claude/opus)", () => {
  const jobs = [{ id: "a", model: "claude-opus-4-8", enabled: true, next_run_at: iso(NOW + 5 * 60_000) }];
  assert.deepEqual(selectModelsToWarm(jobs, NOW, LEAD), []);
});

test("dedups two due jobs sharing a model", () => {
  const jobs = [
    { id: "a", model: "gpt-oss:120b", enabled: true, next_run_at: iso(NOW + 3 * 60_000) },
    { id: "b", model: "gpt-oss:120b", enabled: true, next_run_at: iso(NOW + 8 * 60_000) },
  ];
  assert.deepEqual(selectModelsToWarm(jobs, NOW, LEAD), ["gpt-oss:120b"]);
});

test("excludes a job whose tick is well in the past", () => {
  const jobs = [{ id: "a", model: "gpt-oss:20b", enabled: true, next_run_at: iso(NOW - 10 * 60_000) }];
  assert.deepEqual(selectModelsToWarm(jobs, NOW, LEAD), []);
});

test("includes a tick that just passed within the 60s grace", () => {
  const jobs = [{ id: "a", model: "gpt-oss:20b", enabled: true, next_run_at: iso(NOW - 30_000) }];
  assert.deepEqual(selectModelsToWarm(jobs, NOW, LEAD), ["gpt-oss:20b"]);
});

test("excludes malformed / missing next_run_at", () => {
  const jobs = [
    { id: "a", model: "gpt-oss:20b", enabled: true, next_run_at: "not-a-date" },
    { id: "b", model: "gpt-oss:20b", enabled: true },
  ];
  assert.deepEqual(selectModelsToWarm(jobs, NOW, LEAD), []);
});

test("returns [] for empty / null / non-array input", () => {
  assert.deepEqual(selectModelsToWarm([], NOW, LEAD), []);
  assert.deepEqual(selectModelsToWarm(null, NOW, LEAD), []);
  assert.deepEqual(selectModelsToWarm(undefined, NOW, LEAD), []);
});

test("mixed fleet: keeps only the enabled local model due within lead", () => {
  const jobs = [
    { id: "sweep", model: "gpt-oss:20b", enabled: true, next_run_at: iso(NOW + 5 * 60_000) },   // due -> in
    { id: "brief", model: "gpt-oss:120b", enabled: true, next_run_at: iso(NOW + 18 * 60 * 60_000) }, // tomorrow -> out
    { id: "weekly", model: "gpt-oss:120b", enabled: true, next_run_at: iso(NOW + 4 * 24 * 60 * 60_000) }, // out
    { id: "fb", model: "claude-opus-4-8", enabled: true, next_run_at: iso(NOW + 1 * 60_000) },  // non-ollama -> out
  ];
  assert.deepEqual(selectModelsToWarm(jobs, NOW, LEAD), ["gpt-oss:20b"]);
});

test("keepAliveFor = lead minutes + 30m run buffer (never below the buffer)", () => {
  assert.equal(keepAliveFor(15 * 60_000), "45m");
  assert.equal(keepAliveFor(60 * 60_000), "90m");
  assert.equal(keepAliveFor(0), "30m");
});
