/**
 * Tests for ollama-wedge-guard.mjs (BRAVO AI-SYNERGY-SUBSTRATE-GUARD).
 * Pure-classifier tests. The probe + recovery are live/host-specific (validated separately).
 * Run: node --test scripts/ollama-wedge-guard.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyOllamaHealth, shouldRecover } from "./ollama-wedge-guard.mjs";

test("classifyOllamaHealth: tags down -> 'down' (daemon not responding at all)", () => {
  assert.equal(classifyOllamaHealth({ tagsOk: false, generateOk: false, freeRamGB: 60, freeVramGB: 90 }), "down");
  // generate flag is irrelevant when tags is down
  assert.equal(classifyOllamaHealth({ tagsOk: false, generateOk: true, freeRamGB: 60, freeVramGB: 90 }), "down");
});

test("classifyOllamaHealth: generate ok -> 'healthy'", () => {
  assert.equal(classifyOllamaHealth({ tagsOk: true, generateOk: true, freeRamGB: 60, freeVramGB: 90 }), "healthy");
});

test("classifyOllamaHealth: generate HUNG (no response) + resources FREE -> 'wedged' (the real bug)", () => {
  // The exact observed failure: /api/tags responds, /api/generate HANGS (no response), RAM+VRAM free.
  assert.equal(classifyOllamaHealth({ tagsOk: true, generateOk: false, generateHung: true, freeRamGB: 66, freeVramGB: 94 }), "wedged");
});

test("classifyOllamaHealth: generate RESPONDED with error (404 model-missing, NOT hung) -> 'probe-error' (never recover)", () => {
  // 3-of-3 arm-C false-positive fix: an uninstalled probe model answers 404 -> daemon ALIVE -> must NOT
  // be classified 'wedged' (which would kill+restart a healthy daemon). generateHung=false is the guard.
  assert.equal(classifyOllamaHealth({ tagsOk: true, generateOk: false, generateHung: false, freeRamGB: 66, freeVramGB: 94 }), "probe-error");
  // even with resources low, a RESPONDED error is still probe-error (daemon alive), not resource-starved
  assert.equal(classifyOllamaHealth({ tagsOk: true, generateOk: false, generateHung: false, freeRamGB: 1, freeVramGB: 1 }), "probe-error");
});

test("classifyOllamaHealth: generate HUNG + RAM low -> 'resource-starved' (do NOT thrash-restart)", () => {
  assert.equal(classifyOllamaHealth({ tagsOk: true, generateOk: false, generateHung: true, freeRamGB: 2, freeVramGB: 90 }), "resource-starved");
  // VRAM low alone also -> resource-starved
  assert.equal(classifyOllamaHealth({ tagsOk: true, generateOk: false, generateHung: true, freeRamGB: 60, freeVramGB: 1 }), "resource-starved");
});

test("classifyOllamaHealth: null/unknown resources treated as NOT-low -> a generate-HANG is still 'wedged'", () => {
  // nvidia-smi unavailable (freeVramGB null) must NOT mask a wedge as resource-starved.
  assert.equal(classifyOllamaHealth({ tagsOk: true, generateOk: false, generateHung: true, freeRamGB: 66, freeVramGB: null }), "wedged");
  assert.equal(classifyOllamaHealth({ tagsOk: true, generateOk: false, generateHung: true, freeRamGB: null, freeVramGB: null }), "wedged");
});

test("classifyOllamaHealth: floors are honored (custom thresholds)", () => {
  // 5GB free with an 8GB floor -> low -> resource-starved
  assert.equal(classifyOllamaHealth({ tagsOk: true, generateOk: false, generateHung: true, freeRamGB: 5, freeVramGB: 90, ramFloorGB: 8 }), "resource-starved");
  // 5GB free with the default 4GB floor -> NOT low -> wedged
  assert.equal(classifyOllamaHealth({ tagsOk: true, generateOk: false, generateHung: true, freeRamGB: 5, freeVramGB: 90 }), "wedged");
});

test("classifyOllamaHealth: no-arg defensive default does not throw", () => {
  // tagsOk undefined -> falsy -> 'down' (safe default; never throws).
  assert.equal(classifyOllamaHealth(), "down");
});

test("shouldRecover: ONLY a wedge warrants the reap+restart (never down/healthy/resource-starved)", () => {
  assert.equal(shouldRecover("wedged"), true);
  assert.equal(shouldRecover("healthy"), false);
  assert.equal(shouldRecover("down"), false);             // a dead daemon needs a different fix (the watchdog)
  assert.equal(shouldRecover("resource-starved"), false); // restart can't fix OOM -> would thrash
  assert.equal(shouldRecover("probe-error"), false);      // daemon ALIVE (404 etc.) -> never kill+restart
  assert.equal(shouldRecover("unknown"), false);
});
