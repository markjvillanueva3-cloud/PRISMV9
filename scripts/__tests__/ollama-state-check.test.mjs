import { test } from "node:test";
import assert from "node:assert/strict";
import { isOllamaChatDown, DEFAULT_STALE_MS } from "../lib/ollama-state-check.mjs";

const now = 1_000_000_000_000;

test("isOllamaChatDown: null state → not-down (fail-safe)", () => {
  assert.equal(isOllamaChatDown(null).down, false);
});

test("isOllamaChatDown: state without chatOk → not-down", () => {
  assert.equal(isOllamaChatDown({ lastProbeAt: now }).down, false);
});

test("isOllamaChatDown: fresh + chatOk=false → down", () => {
  const r = isOllamaChatDown({ lastProbeAt: now, chatOk: false, error: "timeout" }, { nowMs: now + 1000 });
  assert.equal(r.down, true);
  assert.ok(r.reason.includes("ollama-chat-dead"));
  assert.ok(r.reason.includes("timeout"));
});

test("isOllamaChatDown: fresh + chatOk=true → not-down", () => {
  const r = isOllamaChatDown({ lastProbeAt: now, chatOk: true, latencyMs: 1500 }, { nowMs: now + 1000 });
  assert.equal(r.down, false);
  assert.equal(r.reason, "ollama-chat-up");
});

test("isOllamaChatDown: stale state → not-down (fail-safe)", () => {
  const r = isOllamaChatDown(
    { lastProbeAt: now, chatOk: false, error: "timeout" },
    { nowMs: now + DEFAULT_STALE_MS + 1, staleMs: DEFAULT_STALE_MS }
  );
  assert.equal(r.down, false);
  assert.ok(r.reason.startsWith("stale"));
});

test("isOllamaChatDown: ageMs reported", () => {
  const r = isOllamaChatDown({ lastProbeAt: now, chatOk: false }, { nowMs: now + 30_000 });
  assert.equal(r.ageMs, 30_000);
});
