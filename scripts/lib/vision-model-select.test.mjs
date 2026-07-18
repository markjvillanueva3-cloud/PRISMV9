// scripts/lib/vision-model-select.test.mjs
// Tests for the profile/VRAM-aware vision-model selector (U-XRAY-VISION-PROFILE).
// Pure core only — no GPU, no Ollama. Run: node --test <file>

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  isThinkingTrap,
  isJsonSafeVisionModel,
  classifyProfile,
  detectProfileFromEnv,
  parsePreferenceOverride,
  selectVisionModel,
  probeTotalVramGB,
  resolveVisionModelLive,
  SAFE_DEFAULT_VISION_MODEL,
  BIG_VISION_MIN_VRAM_GB,
  BIG_VISION_PREFERENCE,
  VISION_FAMILY_LEADERS,
  PROFILE_VRAM_GB,
} from "./vision-model-select.mjs";

// The safe default is single-sourced from the OCR lib — guard against drift.
test("SAFE_DEFAULT mirrors the OCR lib's qwen3-vl:8b-instruct", () => {
  assert.equal(SAFE_DEFAULT_VISION_MODEL, "qwen3-vl:8b-instruct");
});

// The OCR multi-VLM ensemble roster is now single-sourced here (was duplicated in
// vision-ensemble-extract.mjs + blueprint-ocr-training-loop.mjs). These two tests are
// the drift guard: they fail if anyone re-introduces a divergent roster literal.
test("VISION_FAMILY_LEADERS is the single-source ensemble roster (drift guard)", () => {
  assert.deepEqual(VISION_FAMILY_LEADERS, [SAFE_DEFAULT_VISION_MODEL, "qwen2.5vl:7b", "llama3.2-vision:11b"]);
});
test("VISION_FAMILY_LEADERS: frozen, anchored on the safe default, all JSON-safe (no thinking traps)", () => {
  assert.ok(Object.isFrozen(VISION_FAMILY_LEADERS), "roster must be frozen (single source, no mutation)");
  assert.equal(VISION_FAMILY_LEADERS[0], SAFE_DEFAULT_VISION_MODEL, "anchor must be the proven safe default");
  for (const m of VISION_FAMILY_LEADERS) {
    assert.ok(isJsonSafeVisionModel(m), `${m} must be JSON-safe (no thinking trap) for OCR`);
  }
});

// ── isThinkingTrap ────────────────────────────────────────────────────────────
test("isThinkingTrap: bare qwen3-vl tags are traps (no -instruct)", () => {
  assert.equal(isThinkingTrap("qwen3-vl:8b"), true);
  assert.equal(isThinkingTrap("qwen3-vl:30b"), true);   // the ModelRoutingEngine catalog entry
  assert.equal(isThinkingTrap("qwen3vl:8b"), true);     // alt punctuation
});
test("isThinkingTrap: -instruct qwen3-vl tags are safe", () => {
  assert.equal(isThinkingTrap("qwen3-vl:8b-instruct"), false);
  assert.equal(isThinkingTrap("qwen3-vl:32b-instruct"), false);
});
test("isThinkingTrap: 30B MoE (-a3b) variants classified correctly", () => {
  assert.equal(isThinkingTrap("qwen3-vl:30b-a3b-instruct"), false);        // real MoE instruct → safe
  assert.equal(isThinkingTrap("qwen3-vl:30b-a3b-instruct-q4_K_M"), false); // quant suffix still safe
  assert.equal(isThinkingTrap("qwen3-vl:30b-a3b-thinking"), true);         // explicit thinking → trap
  assert.equal(isThinkingTrap("qwen3-vl:30b-a3b"), true);                  // bare MoE → thinking-by-default
});
test("isThinkingTrap: -instruct must be a TERMINAL token (instructx is a trap, not false-safe)", () => {
  assert.equal(isThinkingTrap("qwen3-vl:8b-instructx"), true);
  assert.equal(isThinkingTrap("qwen3-vl:8b-instruct-q8_0"), false);
});
test("isThinkingTrap: any -thinking tag is a trap regardless of family", () => {
  assert.equal(isThinkingTrap("llama3.2-vision:11b-thinking"), true);
  assert.equal(isThinkingTrap("qwen2.5vl:7b-thinking"), true);
});
test("isThinkingTrap: non-qwen3vl vision families are safe", () => {
  assert.equal(isThinkingTrap("qwen2.5vl:7b"), false);
  assert.equal(isThinkingTrap("qwen2.5vl:32b"), false);
  assert.equal(isThinkingTrap("llama3.2-vision:11b"), false);
  assert.equal(isThinkingTrap("moondream:1.8b"), false);
});
test("isThinkingTrap: case-insensitive", () => {
  assert.equal(isThinkingTrap("QWEN3-VL:8B"), true);
  assert.equal(isThinkingTrap("Qwen3-VL:8B-Instruct"), false);
});
test("isThinkingTrap: junk inputs are not traps (false, not throw)", () => {
  assert.equal(isThinkingTrap(null), false);
  assert.equal(isThinkingTrap(undefined), false);
  assert.equal(isThinkingTrap(""), false);
  assert.equal(isThinkingTrap(42), false);
  assert.equal(isThinkingTrap({}), false);
});

// ── isJsonSafeVisionModel ───────────────────────────────────────────────────
test("isJsonSafeVisionModel: inverse of trap, empty is unsafe", () => {
  assert.equal(isJsonSafeVisionModel("qwen3-vl:8b-instruct"), true);
  assert.equal(isJsonSafeVisionModel("qwen3-vl:8b"), false);
  assert.equal(isJsonSafeVisionModel(""), false);
  assert.equal(isJsonSafeVisionModel(null), false);
});

// ── classifyProfile ─────────────────────────────────────────────────────────
test("classifyProfile: 96GB Blackwell is big, 16GB 4080 is standard", () => {
  assert.equal(classifyProfile(96), "big");
  assert.equal(classifyProfile(16), "standard");
  assert.equal(classifyProfile(10), "standard");
});
test("classifyProfile: threshold boundary is inclusive at BIG_VISION_MIN_VRAM_GB", () => {
  assert.equal(classifyProfile(BIG_VISION_MIN_VRAM_GB), "big");
  assert.equal(classifyProfile(BIG_VISION_MIN_VRAM_GB - 0.1), "standard");
});
test("classifyProfile: null/NaN VRAM is standard (fail-safe)", () => {
  assert.equal(classifyProfile(null), "standard");
  assert.equal(classifyProfile(undefined), "standard");
  assert.equal(classifyProfile(NaN), "standard");
});
test("classifyProfile: custom bigMinGB threshold honored", () => {
  assert.equal(classifyProfile(24, { bigMinGB: 20 }), "big");
  assert.equal(classifyProfile(24, { bigMinGB: 48 }), "standard");
});

// ── detectProfileFromEnv ──────────────────────────────────────────────────────
test("detectProfileFromEnv: explicit VRAM number wins", () => {
  const r = detectProfileFromEnv({ PRISM_VISION_VRAM_GB: "96", PRISM_HW_PROFILE: "home_4080" });
  assert.equal(r.vramGB, 96);
  assert.equal(r.source, "env:PRISM_VISION_VRAM_GB");
});
test("detectProfileFromEnv: named profile maps to PROFILE_VRAM_GB", () => {
  const r = detectProfileFromEnv({ PRISM_HW_PROFILE: "home_blackwell" });
  assert.equal(r.vramGB, PROFILE_VRAM_GB.home_blackwell);
  assert.equal(r.profile, "home_blackwell");
  assert.equal(r.source, "env:PRISM_HW_PROFILE");
});
test("detectProfileFromEnv: unknown profile name → none", () => {
  const r = detectProfileFromEnv({ PRISM_HW_PROFILE: "mystery_card" });
  assert.equal(r.vramGB, null);
  assert.equal(r.source, "none");
});
test("detectProfileFromEnv: empty env → none", () => {
  assert.deepEqual(detectProfileFromEnv({}), { vramGB: null, profile: null, source: "none" });
  assert.deepEqual(detectProfileFromEnv(), { vramGB: null, profile: null, source: "none" });
});
test("detectProfileFromEnv: blank/garbage VRAM falls through to profile then none", () => {
  assert.equal(detectProfileFromEnv({ PRISM_VISION_VRAM_GB: "  ", PRISM_HW_PROFILE: "work_3080" }).vramGB, PROFILE_VRAM_GB.work_3080);
  assert.equal(detectProfileFromEnv({ PRISM_VISION_VRAM_GB: "abc" }).source, "none");
});

// ── parsePreferenceOverride ──────────────────────────────────────────────────
test("parsePreferenceOverride: comma + space separated", () => {
  assert.deepEqual(parsePreferenceOverride("a:1, b:2  c:3"), ["a:1", "b:2", "c:3"]);
});
test("parsePreferenceOverride: array input is cleaned", () => {
  assert.deepEqual(parsePreferenceOverride([" a ", "", "b"]), ["a", "b"]);
});
test("parsePreferenceOverride: empty/garbage → null", () => {
  assert.equal(parsePreferenceOverride(""), null);
  assert.equal(parsePreferenceOverride("   "), null);
  assert.equal(parsePreferenceOverride([]), null);
  assert.equal(parsePreferenceOverride(null), null);
  assert.equal(parsePreferenceOverride(123), null);
});

// ── selectVisionModel: the core decision ─────────────────────────────────────
test("select: standard tier → safe default, fallback", () => {
  const r = selectVisionModel({ vramGB: 16, availableModels: ["qwen3-vl:8b-instruct"] });
  assert.equal(r.model, SAFE_DEFAULT_VISION_MODEL);
  assert.equal(r.tier, "standard");
  assert.equal(r.fallback, true);
  assert.equal(r.unsafe, false);
});

test("select: big tier + a preferred model pulled → upgrade", () => {
  const r = selectVisionModel({
    vramGB: 96,
    availableModels: ["qwen3-vl:8b-instruct", "qwen3-vl:30b-a3b-instruct"],
  });
  assert.equal(r.model, "qwen3-vl:30b-a3b-instruct");
  assert.equal(r.tier, "big");
  assert.equal(r.fallback, false);
  assert.equal(r.unsafe, false);
});

test("select: big tier + NO preferred model pulled → safe default (today's real state)", () => {
  // Mirrors live ollama tags 2026-06-03: only the 8b-instruct is pulled.
  const r = selectVisionModel({
    vramGB: 96,
    availableModels: ["qwen3-vl:8b-instruct", "qwen3-vl:8b", "qwen2.5vl:7b", "llama3.2-vision:11b", "moondream:1.8b"],
  });
  assert.equal(r.model, SAFE_DEFAULT_VISION_MODEL);
  assert.equal(r.tier, "big");
  assert.equal(r.fallback, true);
  assert.match(r.reason, /no preferred upgrade model pulled/);
});

test("select: FAIL-SAFE — big tier but store un-enumerable (probe failed) → safe default, no 404 risk", () => {
  const r = selectVisionModel({ vramGB: 96, availableModels: [] });
  assert.equal(r.model, SAFE_DEFAULT_VISION_MODEL);
  assert.equal(r.fallback, true);
  // must NOT have optimistically picked an unconfirmed big model
  assert.ok(!BIG_VISION_PREFERENCE.includes(r.model));
});

test("select: highest-preference wins when multiple are pulled", () => {
  const r = selectVisionModel({
    vramGB: 96,
    availableModels: ["qwen2.5vl:32b", "qwen3-vl:32b-instruct", "qwen3-vl:30b-a3b-instruct"],
  });
  assert.equal(r.model, BIG_VISION_PREFERENCE[0]); // qwen3-vl:32b-instruct
});

test("select: a trap in a CUSTOM preference list is skipped", () => {
  const r = selectVisionModel({
    vramGB: 96,
    availableModels: ["qwen3-vl:30b-a3b", "qwen3-vl:30b-a3b-instruct"], // bare MoE is a trap
    preference: ["qwen3-vl:30b-a3b", "qwen3-vl:30b-a3b-instruct"],
  });
  assert.equal(r.model, "qwen3-vl:30b-a3b-instruct"); // trap skipped, instruct chosen
});

test("select: env override (safe) is honored above the upgrade path", () => {
  const r = selectVisionModel({
    vramGB: 96,
    availableModels: ["qwen3-vl:30b-instruct", "qwen2.5vl:7b"],
    envOverride: "qwen2.5vl:7b",
  });
  assert.equal(r.model, "qwen2.5vl:7b");
  assert.equal(r.unsafe, false);
  assert.equal(r.fallback, false);
  assert.match(r.reason, /override/);
});

test("select: env override (trap) is honored BUT flagged unsafe + warned (R12 fail-loud)", () => {
  const r = selectVisionModel({ vramGB: 96, availableModels: ["qwen3-vl:8b"], envOverride: "qwen3-vl:8b" });
  assert.equal(r.model, "qwen3-vl:8b");
  assert.equal(r.unsafe, true);
  assert.match(r.warning, /thinking-trap/);
});

test("select: env override not in store → availableMissing flagged", () => {
  const r = selectVisionModel({ vramGB: 96, availableModels: ["qwen3-vl:8b-instruct"], envOverride: "qwen3-vl:30b-a3b-instruct" });
  assert.equal(r.availableMissing, true);
  assert.match(r.warning, /not in the local ollama store/);
});

test("select: safe default known-absent → availableMissing + pull hint", () => {
  const r = selectVisionModel({ vramGB: 16, availableModels: ["some-other-model:1b"] });
  assert.equal(r.model, SAFE_DEFAULT_VISION_MODEL);
  assert.equal(r.availableMissing, true);
  assert.match(r.warning, /ollama pull qwen3-vl:8b-instruct/);
});

test("select: no args → safe default standard (never throws)", () => {
  const r = selectVisionModel();
  assert.equal(r.model, SAFE_DEFAULT_VISION_MODEL);
  assert.equal(r.tier, "standard");
});

test("select: default preference contains only JSON-safe, strictly-larger-than-8b models", () => {
  for (const m of BIG_VISION_PREFERENCE) {
    assert.ok(isJsonSafeVisionModel(m), `${m} must be JSON-safe`);
    assert.ok(!m.includes(":8b"), `${m} must be larger than the 8b safe default`);
  }
});

// ANTI-PHANTOM DRIFT GUARD — pins the registry-verified tag set so a future edit that
// re-introduces a phantom tag (e.g. "qwen3-vl:30b-instruct", which does NOT exist —
// the 30B is MoE-only "-a3b") is a conscious, reviewed change, not a silent no-op.
// (This is the gap that let the phantom slip the first pass: the JSON-safe check above
// verifies the GUARD logic but not that the literal is a REAL pullable tag.)
test("select: default preference is the registry-verified tag set (verified ollama 2026-06-03)", () => {
  assert.deepEqual([...BIG_VISION_PREFERENCE], [
    "qwen3-vl:32b-instruct",
    "qwen3-vl:30b-a3b-instruct",
    "qwen2.5vl:32b",
  ]);
});

test("select: every preference entry matches the ollama vision tag grammar", () => {
  // family + ":" + size + optional MoE "-aNNb" + optional "-instruct". The bare/thinking
  // forms are intentionally NOT matchable here — every preference entry must be JSON-safe.
  const grammar = /^[a-z0-9.-]*vl:\d+b(-a\d+b)?(-instruct)?$/;
  for (const m of BIG_VISION_PREFERENCE) assert.match(m, grammar, `${m} must match ollama tag grammar`);
});

// ── probeTotalVramGB (impure, injected spawnSync) ─────────────────────────────
test("probeTotalVramGB: parses nvidia-smi MiB → GB, max across GPUs", () => {
  const fakeSpawn = () => ({ status: 0, stdout: "16384\n97887\n" });
  assert.equal(probeTotalVramGB({ spawnSync: fakeSpawn }), 95.6); // 97887/1024 rounded to .1
});
test("probeTotalVramGB: non-zero exit → null", () => {
  assert.equal(probeTotalVramGB({ spawnSync: () => ({ status: 1, stdout: "" }) }), null);
});
test("probeTotalVramGB: spawn throws (no nvidia-smi) → null, no throw", () => {
  assert.equal(probeTotalVramGB({ spawnSync: () => { throw new Error("ENOENT"); } }), null);
});
test("probeTotalVramGB: garbage stdout → null", () => {
  assert.equal(probeTotalVramGB({ spawnSync: () => ({ status: 0, stdout: "not-a-number\n" }) }), null);
});

// ── resolveVisionModelLive (the canonical seam; injected probes) ──────────────
// deps.probeVram / deps.fetchModels stand in for nvidia-smi + ollama so the resolver
// is exercised end-to-end with zero real I/O — this is the function every OCR
// consumer now calls, so its contract is the load-bearing one.
const bigProbe = (gb) => () => gb;
const tags = (...m) => async () => m;

test("resolveLive: explicit model is honored verbatim (operator force), never probed", async () => {
  let probed = false;
  const r = await resolveVisionModelLive("qwen2.5vl:32b", {}, "http://x", {
    probeVram: () => { probed = true; return 96; },
    fetchModels: async () => { probed = true; return []; },
  });
  assert.equal(r.model, "qwen2.5vl:32b");
  assert.equal(r.fallback, false);
  assert.equal(r.unsafe, false);
  assert.equal(probed, false, "explicit model must short-circuit BEFORE any probe");
  assert.match(r.reason, /operator force/);
});

test("resolveLive: explicit thinking-trap model honored BUT flagged unsafe + warned (R12)", async () => {
  const r = await resolveVisionModelLive("qwen3-vl:8b", {}, undefined, { probeVram: bigProbe(96), fetchModels: tags() });
  assert.equal(r.model, "qwen3-vl:8b");
  assert.equal(r.unsafe, true);
  assert.match(r.warning, /thinking-trap/);
});

test("resolveLive: blank explicit → auto-resolve; big tier + preferred pulled → upgrade", async () => {
  const r = await resolveVisionModelLive("", {}, "http://x", {
    probeVram: bigProbe(96),
    fetchModels: tags("qwen3-vl:8b-instruct", "qwen3-vl:32b-instruct"),
  });
  assert.equal(r.model, "qwen3-vl:32b-instruct");
  assert.equal(r.tier, "big");
  assert.equal(r.fallback, false);
  assert.equal(r.vramGB, 96);
});

test("resolveLive: big tier but only the 8b pulled (today's real Blackwell state) → safe default", async () => {
  const r = await resolveVisionModelLive(null, {}, "http://x", {
    probeVram: bigProbe(96),
    fetchModels: tags("qwen3-vl:8b-instruct", "qwen2.5vl:7b", "llama3.2-vision:11b"),
  });
  assert.equal(r.model, SAFE_DEFAULT_VISION_MODEL);
  assert.equal(r.tier, "big");
  assert.equal(r.fallback, true);
});

test("resolveLive: probe failure (no GPU, no tags) degrades to safe default, never throws", async () => {
  const r = await resolveVisionModelLive(null, {}, "http://x", {
    probeVram: () => null,
    fetchModels: async () => [],
  });
  assert.equal(r.model, SAFE_DEFAULT_VISION_MODEL);
  assert.equal(r.tier, "standard");
  assert.equal(r.vramGB, null);
});

test("resolveLive: env PRISM_VISION_MODEL override flows through the auto path", async () => {
  const r = await resolveVisionModelLive(null, { PRISM_VISION_MODEL: "qwen2.5vl:7b" }, "http://x", {
    probeVram: bigProbe(96),
    fetchModels: tags("qwen3-vl:32b-instruct", "qwen2.5vl:7b"),
  });
  assert.equal(r.model, "qwen2.5vl:7b");
  assert.match(r.reason, /override/);
});

test("resolveLive: env PRISM_VISION_PREFERENCE reorders the upgrade walk", async () => {
  const r = await resolveVisionModelLive(null, { PRISM_VISION_PREFERENCE: "qwen2.5vl:32b, qwen3-vl:32b-instruct" }, "http://x", {
    probeVram: bigProbe(96),
    fetchModels: tags("qwen3-vl:32b-instruct", "qwen2.5vl:32b"),
  });
  assert.equal(r.model, "qwen2.5vl:32b", "custom preference puts qwen2.5vl:32b first");
});
