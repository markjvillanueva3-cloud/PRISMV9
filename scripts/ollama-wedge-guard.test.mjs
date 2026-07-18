/**
 * Tests for ollama-wedge-guard.mjs (BRAVO AI-SYNERGY-SUBSTRATE-GUARD).
 * Pure-classifier tests. The probe + recovery are live/host-specific (validated separately).
 * Run: node --test scripts/ollama-wedge-guard.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyOllamaHealth, shouldRecover, buildRecoveryScript, pickProbeModel, probeOllamaHealth } from "./ollama-wedge-guard.mjs";

/**
 * Hermetic fetch mock for the probeOllamaHealth seam tests (scrutiny arm-B deferred P2,
 * U-GOLF-WEDGE-PROBE-RESIDENT-FIRST): the fetchResidentModels -> pickProbeModel -> generate-body
 * wiring's failure mode is SILENT (a refactor passing the raw /api/ps JSON instead of j.models
 * would fail-soft to the fallback model and quietly reintroduce the starvation false positive
 * while every pure-function test stays green). These tests pin the wiring itself.
 * Returns {calls, restore}; routes by URL suffix; generate handler may be an array (per-call).
 */
function mockFetch({ psModels, generateHandlers }) {
  const calls = { tags: 0, ps: 0, generateBodies: [] };
  const original = globalThis.fetch;
  let genIdx = 0;
  globalThis.fetch = async (url, opts = {}) => {
    const u = String(url);
    if (u.endsWith("/api/tags")) {
      calls.tags++;
      return { ok: true, status: 200, json: async () => ({ models: [] }) };
    }
    if (u.endsWith("/api/ps")) {
      calls.ps++;
      return { ok: true, status: 200, json: async () => ({ models: psModels }) };
    }
    if (u.endsWith("/api/generate")) {
      const body = JSON.parse(opts.body);
      calls.generateBodies.push(body);
      const h = generateHandlers[Math.min(genIdx++, generateHandlers.length - 1)];
      return { ok: h.ok, status: h.status, json: async () => h.payload };
    }
    throw new Error(`unexpected fetch: ${u}`);
  };
  return { calls, restore: () => { globalThis.fetch = original; } };
}

test("probeOllamaHealth seam: generate is sent the RESIDENT pick, not the fallback (wiring pin)", async () => {
  const { calls, restore } = mockFetch({
    psModels: [
      { name: "qwen2.5-coder:32b", size_vram: 37526846832 },
      { name: "gpt-oss:20b", size_vram: 13376421887 },
    ],
    generateHandlers: [{ ok: true, status: 200, payload: { response: "ok" } }],
  });
  try {
    const r = await probeOllamaHealth();
    assert.equal(r.health, "healthy");
    assert.equal(calls.generateBodies.length, 1);
    assert.equal(calls.generateBodies[0].model, "gpt-oss:20b", "generate body must carry the smallest resident, not the fallback");
    assert.equal(r.probeModel, "gpt-oss:20b");
    assert.equal(r.residentCount, 2);
    assert.equal(calls.generateBodies[0].options.num_predict, 8, "probe must stay output-bounded");
  } finally {
    restore();
  }
});

test("probeOllamaHealth seam: nothing resident -> generate is sent the fallback model", async () => {
  const { calls, restore } = mockFetch({
    psModels: [],
    generateHandlers: [{ ok: true, status: 200, payload: { response: "ok" } }],
  });
  try {
    const r = await probeOllamaHealth();
    assert.equal(r.health, "healthy");
    assert.equal(calls.generateBodies[0].model, "qwen2.5-coder:1.5b", "idle daemon -> fallback cold-load probe");
    assert.equal(r.residentCount, 0);
  } finally {
    restore();
  }
});

test("probeOllamaHealth seam: resident pick responds-with-error -> ONE fallback re-probe (arm-A self-heal)", async () => {
  const { calls, restore } = mockFetch({
    // a non-embed-named model that still rejects generate (slipped the embed filter)
    psModels: [{ name: "weird-vectorizer:latest", size_vram: 3e8 }],
    generateHandlers: [
      { ok: false, status: 400, payload: { error: "does not support generate" } },
      { ok: true, status: 200, payload: { response: "ok" } },
    ],
  });
  try {
    const r = await probeOllamaHealth();
    assert.equal(calls.generateBodies.length, 2, "must re-probe exactly once");
    assert.equal(calls.generateBodies[0].model, "weird-vectorizer:latest");
    assert.equal(calls.generateBodies[1].model, "qwen2.5-coder:1.5b", "re-probe must use the fallback");
    assert.equal(r.health, "healthy", "a healthy daemon with one misbehaving resident must not read wedged/probe-error");
    assert.equal(r.probeModel, "qwen2.5-coder:1.5b", "reported probeModel reflects the re-probe");
  } finally {
    restore();
  }
});

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

test("buildRecoveryScript: ENABLES the serve task BEFORE starting it (the 2026-06-23 disabled-task fix)", () => {
  // Live bug: the serve task was DISABLED -> Stop+Start left `start-fail: The task is disabled` and
  // Ollama DOWN. The fix is an idempotent Enable-ScheduledTask immediately before Start-ScheduledTask.
  const s = buildRecoveryScript("PRISM Ollama Serve");
  const enableAt = s.indexOf("Enable-ScheduledTask -TaskName 'PRISM Ollama Serve'");
  const startAt = s.indexOf("Start-ScheduledTask -TaskName 'PRISM Ollama Serve'");
  assert.ok(enableAt > -1, "recovery must Enable-ScheduledTask (re-enable a disabled task)");
  assert.ok(startAt > -1, "recovery must Start-ScheduledTask");
  assert.ok(enableAt < startAt, "Enable MUST precede Start, else a disabled task bricks Ollama down");
});

test("buildRecoveryScript: still reaps the dead-parent orphan + stops the task first (no regression)", () => {
  const s = buildRecoveryScript("PRISM Ollama Serve");
  assert.ok(/llama-server\.exe/.test(s), "must still reap the orphan llama-server runner");
  assert.ok(s.indexOf("Stop-ScheduledTask") < s.indexOf("Start-ScheduledTask"), "must Stop before Start");
  assert.ok(s.indexOf("Stop-ScheduledTask") < s.indexOf("Enable-ScheduledTask"), "Stop happens before the enable+start phase");
});

test("buildRecoveryScript: interpolates a custom serve-task name (env override path)", () => {
  const s = buildRecoveryScript("Custom Ollama Task");
  assert.ok(s.includes("Enable-ScheduledTask -TaskName 'Custom Ollama Task'"));
  assert.ok(s.includes("Start-ScheduledTask -TaskName 'Custom Ollama Task'"));
});

test("buildRecoveryScript: escapes single quotes in the serve-task name (PS literal break-out guard)", () => {
  // PRISM_OLLAMA_SERVE_TASK is env-overridable; a raw ' would break out of the single-quoted literal.
  const s = buildRecoveryScript("Bad'Name");
  assert.ok(s.includes("'Bad''Name'"), "a single quote must be doubled for a PS single-quoted literal");
  assert.ok(!/[^']'Bad'Name'/.test(s), "the raw unescaped quote must not survive into the script");
});

// ---- pickProbeModel (resident-first probe, U-GOLF-WEDGE-PROBE-RESIDENT-FIRST 2026-07-01) ----
// The live false-positive: OLLAMA_MAX_LOADED_MODELS=2, both slots pinned by fleet traffic, the
// hardcoded 1.5b probe (a 3rd model) queued forever behind an eviction that never happened ->
// "wedged" -> --recover restarted a HEALTHY daemon every ~10min, evicting ~51GB of hot models.

test("pickProbeModel: picks the SMALLEST resident model (the live 2026-07-01 reference case)", () => {
  // Exactly what /api/ps returned live: gpt-oss:20b 13.4GB + qwen2.5-coder:32b 37.5GB resident.
  const resident = [
    { name: "qwen2.5-coder:32b", size: 37526846832, size_vram: 37526846832 },
    { name: "gpt-oss:20b", size: 13376421887, size_vram: 13376421887 },
  ];
  assert.equal(pickProbeModel(resident, "qwen2.5-coder:1.5b", false), "gpt-oss:20b");
});

test("pickProbeModel: nothing resident -> the configured fallback (idle daemon: cold-load is a fair probe)", () => {
  assert.equal(pickProbeModel([], "qwen2.5-coder:1.5b", false), "qwen2.5-coder:1.5b");
  assert.equal(pickProbeModel(null, "qwen2.5-coder:1.5b", false), "qwen2.5-coder:1.5b");
  assert.equal(pickProbeModel(undefined, "qwen2.5-coder:1.5b", false), "qwen2.5-coder:1.5b");
});

test("pickProbeModel: force=true always uses the fallback even with residents (escape hatch)", () => {
  const resident = [{ name: "gpt-oss:20b", size_vram: 13376421887 }];
  assert.equal(pickProbeModel(resident, "qwen2.5-coder:1.5b", true), "qwen2.5-coder:1.5b");
});

test("pickProbeModel: malformed /api/ps entries are ignored (adversarial input)", () => {
  // no-name / empty-name / null entries must never be returned as a probe model
  const resident = [null, {}, { name: "" }, { name: 42 }, { name: "gpt-oss:20b", size_vram: 13376421887 }];
  assert.equal(pickProbeModel(resident, "fb", false), "gpt-oss:20b");
  // ALL entries malformed -> fallback, never a crash
  assert.equal(pickProbeModel([null, {}, { name: "" }], "fb", false), "fb");
  // non-array garbage -> fallback, never a crash
  assert.equal(pickProbeModel("not-an-array", "fb", false), "fb");
  assert.equal(pickProbeModel({ models: [] }, "fb", false), "fb");
});

test("pickProbeModel: embedding residents are NEVER picked (arm-A P1 -- a generate on an embed model 400s fast -> 'probe-error' would mask a real wedge)", () => {
  // nomic-embed-text (~274MB) is ALWAYS the smallest resident when loaded (tribal-embed cron
  // runs it through the same daemon) -- it must lose to a generate-capable model of any size.
  const resident = [
    { name: "nomic-embed-text:latest", size_vram: 274e6, details: { families: ["nomic-bert"] } },
    { name: "gpt-oss:20b", size_vram: 13376421887 },
  ];
  assert.equal(pickProbeModel(resident, "fb", false), "gpt-oss:20b");
  // family-only signal (name without 'embed') is also excluded
  const familyOnly = [
    { name: "custom-vectorizer", size_vram: 1e8, details: { families: ["bert"] } },
    { name: "gpt-oss:20b", size_vram: 13376421887 },
  ];
  assert.equal(pickProbeModel(familyOnly, "fb", false), "gpt-oss:20b");
  // ONLY embed models resident -> fallback cold-load probe (a fair probe; load slot pressure is low)
  assert.equal(pickProbeModel([{ name: "nomic-embed-text:latest", size_vram: 274e6 }], "fb", false), "fb");
});

test("pickProbeModel: missing size_vram falls back to size, missing both still eligible (any resident beats a cold-load)", () => {
  // size_vram absent -> sort by size
  const bySize = [
    { name: "big", size: 30e9 },
    { name: "small", size: 1e9 },
  ];
  assert.equal(pickProbeModel(bySize, "fb", false), "small");
  // both absent -> still resident, still preferred over the fallback
  assert.equal(pickProbeModel([{ name: "only-resident" }], "fb", false), "only-resident");
  // sized entry beats an unsized (Infinity) one
  const mixed = [{ name: "unsized" }, { name: "sized", size_vram: 5e9 }];
  assert.equal(pickProbeModel(mixed, "fb", false), "sized");
});
