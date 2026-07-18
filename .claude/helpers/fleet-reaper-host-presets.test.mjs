// fleet-reaper-host-presets.test.mjs — unit tests for the per-PC preset overlay.
// Run: node --test H:/prism/.claude/helpers/fleet-reaper-host-presets.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  BUILTIN_PRESETS,
  PRESETS_PATH,
  SCHEMA_VERSION,
  ALLOWED_ENV_PREFIX,
  loadPresetFile,
  getPresetForHost,
  applyPresetToEnv,
  applyHostPresetForCurrent,
  setPresetForHost,
} from "./fleet-reaper-host-presets.mjs";

const TEST_DIR_PREFIX = `prism-fr-presets-test-${process.pid}`;

function makeTmpDir() {
  const dir = join(tmpdir(), `${TEST_DIR_PREFIX}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

// ── Constants ──

test("BUILTIN_PRESETS has home, work, and blackwell presets", () => {
  assert.ok(BUILTIN_PRESETS.home, "home preset must exist");
  assert.ok(BUILTIN_PRESETS.work, "work preset must exist");
  assert.ok(BUILTIN_PRESETS.blackwell, "blackwell preset must exist");
  assert.equal(BUILTIN_PRESETS.home.label, "home");
  assert.equal(BUILTIN_PRESETS.work.label, "work");
  assert.equal(BUILTIN_PRESETS.blackwell.label, "blackwell");
});

test("BUILTIN_PRESETS.home and work prewarm the kept 32b floor (retired 7b/3b re-pointed)", () => {
  // The small qwen2.5-coder:3b/7b tags were retired fleet-wide (Blackwell host
  // deleted them); every hardcoded prewarm default now points at the always-
  // installed qwen2.5-coder:32b floor so no host can cold-fail on a missing model.
  assert.equal(BUILTIN_PRESETS.home.PRISM_FLEET_REAPER_OLLAMA_PREWARM_MODEL, "qwen2.5-coder:32b");
  assert.equal(BUILTIN_PRESETS.work.PRISM_FLEET_REAPER_OLLAMA_PREWARM_MODEL, "qwen2.5-coder:32b");
});

test("BUILTIN_PRESETS.blackwell tunes for RTX PRO 6000 Blackwell 96GB (32b resident, 24GB GPU floor)", () => {
  // 96GB card keeps a 32B model warm; the GPU_FREE_MIN floor is sized so the
  // coordinator only prewarms when the ~20GB 32B model actually fits in VRAM.
  assert.equal(BUILTIN_PRESETS.blackwell.PRISM_FLEET_REAPER_OLLAMA_PREWARM_MODEL, "qwen2.5-coder:32b");
  assert.equal(BUILTIN_PRESETS.blackwell.PRISM_FLEET_REAPER_GPU_FREE_MIN_MB, "24576");
  assert.equal(BUILTIN_PRESETS.blackwell.PRISM_FLEET_REAPER_OLLAMA_KEEP_ALIVE, "60m");
  // blackwell floor must exceed the 16GB-class home floor (it must fit a bigger model).
  assert.ok(
    Number(BUILTIN_PRESETS.blackwell.PRISM_FLEET_REAPER_GPU_FREE_MIN_MB) >
      Number(BUILTIN_PRESETS.home.PRISM_FLEET_REAPER_GPU_FREE_MIN_MB),
    "blackwell GPU floor must exceed home (16GB) floor",
  );
});

test("BUILTIN_PRESETS.home holds 90% mem floor, work tightens to 85%", () => {
  assert.equal(BUILTIN_PRESETS.home.PRISM_FLEET_REAPER_MEM_PRESSURE_PCT, "90");
  assert.equal(BUILTIN_PRESETS.work.PRISM_FLEET_REAPER_MEM_PRESSURE_PCT, "85");
});

test("BUILTIN_PRESETS values are env-shape strings (preserved through process.env)", () => {
  for (const preset of Object.values(BUILTIN_PRESETS)) {
    for (const [k, v] of Object.entries(preset)) {
      if (!k.startsWith(ALLOWED_ENV_PREFIX)) continue;
      assert.equal(typeof v, "string", `${k} must be string (env-shape), got ${typeof v}`);
    }
  }
});

test("BUILTIN_PRESETS are frozen (regression guard against mutation)", () => {
  assert.ok(Object.isFrozen(BUILTIN_PRESETS));
  assert.ok(Object.isFrozen(BUILTIN_PRESETS.home));
  assert.ok(Object.isFrozen(BUILTIN_PRESETS.work));
  assert.ok(Object.isFrozen(BUILTIN_PRESETS.blackwell));
});

// ── loadPresetFile ──

test("loadPresetFile: missing file returns advisoryReason file-missing", () => {
  const r = loadPresetFile({ path: "/nonexistent/path/zzz.json" });
  assert.deepEqual(r.presets, {});
  assert.equal(r.advisoryReason, "file-missing");
});

test("loadPresetFile: corrupt JSON returns parse-error advisory + empty presets", () => {
  const dir = makeTmpDir();
  const path = join(dir, "bad.json");
  writeFileSync(path, "{not valid json");
  try {
    const r = loadPresetFile({ path });
    assert.deepEqual(r.presets, {});
    assert.match(r.advisoryReason, /parse-error/);
  } finally {
    try { rmSync(dir, { recursive: true, force: true }); } catch {}
  }
});

test("loadPresetFile: schema mismatch returns advisoryReason + empty presets", () => {
  const dir = makeTmpDir();
  const path = join(dir, "wrong-schema.json");
  writeFileSync(path, JSON.stringify({ schemaVersion: 999, presets: { foo: {} } }));
  try {
    const r = loadPresetFile({ path });
    assert.deepEqual(r.presets, {});
    assert.match(r.advisoryReason, /schema-mismatch/);
  } finally {
    try { rmSync(dir, { recursive: true, force: true }); } catch {}
  }
});

test("loadPresetFile: valid file returns presets map", () => {
  const dir = makeTmpDir();
  const path = join(dir, "good.json");
  writeFileSync(path, JSON.stringify({ schemaVersion: SCHEMA_VERSION, presets: { "DESKTOP-N7MI1VB": { label: "home" } } }));
  try {
    const r = loadPresetFile({ path });
    assert.deepEqual(r.presets, { "DESKTOP-N7MI1VB": { label: "home" } });
    assert.equal(r.advisoryReason, undefined);
  } finally {
    try { rmSync(dir, { recursive: true, force: true }); } catch {}
  }
});

// ── getPresetForHost ──

test("getPresetForHost: case-insensitive hostname match", () => {
  const presets = { "DESKTOP-N7MI1VB": { label: "home" }, "MARKV": { label: "work" } };
  assert.equal(getPresetForHost("desktop-n7mi1vb", presets).label, "home");
  assert.equal(getPresetForHost("MarkV", presets).label, "work");
  assert.equal(getPresetForHost("markv", presets).label, "work");
});

test("getPresetForHost: missing host returns null", () => {
  const presets = { "MARKV": { label: "work" } };
  assert.equal(getPresetForHost("OtherPC", presets), null);
});

test("getPresetForHost: empty inputs return null safely", () => {
  assert.equal(getPresetForHost(null, {}), null);
  assert.equal(getPresetForHost("MarkV", null), null);
  assert.equal(getPresetForHost("", {}), null);
});

// ── applyPresetToEnv ──

test("applyPresetToEnv: applies only PRISM_FLEET_REAPER_* keys", () => {
  const env = {};
  const preset = { label: "home", description: "...", PRISM_FLEET_REAPER_MEM_PRESSURE_PCT: "90" };
  const r = applyPresetToEnv(preset, env);
  assert.deepEqual(r.appliedKeys, ["PRISM_FLEET_REAPER_MEM_PRESSURE_PCT"]);
  assert.ok(r.skippedKeys.includes("label"));
  assert.ok(r.skippedKeys.includes("description"));
  assert.equal(env.PRISM_FLEET_REAPER_MEM_PRESSURE_PCT, "90");
  assert.equal(env.label, undefined);
});

test("applyPresetToEnv: existing env value WINS (operator override preserved)", () => {
  const env = { PRISM_FLEET_REAPER_MEM_PRESSURE_PCT: "75" };
  const preset = { PRISM_FLEET_REAPER_MEM_PRESSURE_PCT: "90" };
  const r = applyPresetToEnv(preset, env);
  assert.deepEqual(r.appliedKeys, []);
  assert.deepEqual(r.conflictKeys, ["PRISM_FLEET_REAPER_MEM_PRESSURE_PCT"]);
  assert.equal(env.PRISM_FLEET_REAPER_MEM_PRESSURE_PCT, "75");
});

test("applyPresetToEnv: empty-string env counts as unset (preset applies)", () => {
  const env = { PRISM_FLEET_REAPER_MEM_PRESSURE_PCT: "" };
  const preset = { PRISM_FLEET_REAPER_MEM_PRESSURE_PCT: "90" };
  const r = applyPresetToEnv(preset, env);
  assert.deepEqual(r.appliedKeys, ["PRISM_FLEET_REAPER_MEM_PRESSURE_PCT"]);
  assert.equal(env.PRISM_FLEET_REAPER_MEM_PRESSURE_PCT, "90");
});

test("applyPresetToEnv: null preset is safe", () => {
  const env = {};
  const r = applyPresetToEnv(null, env);
  assert.deepEqual(r.appliedKeys, []);
  assert.deepEqual(env, {});
});

// ── applyHostPresetForCurrent ──

test("applyHostPresetForCurrent: end-to-end on a fixture", () => {
  const dir = makeTmpDir();
  const path = join(dir, "presets.json");
  writeFileSync(path, JSON.stringify({
    schemaVersion: SCHEMA_VERSION,
    presets: {
      "TestHost": { label: "home", PRISM_FLEET_REAPER_MEM_PRESSURE_PCT: "90" },
    },
  }));
  try {
    const env = {};
    const r = applyHostPresetForCurrent({ path, host: "TestHost", env });
    assert.equal(r.applied, true);
    assert.equal(r.host, "TestHost");
    assert.equal(r.label, "home");
    assert.deepEqual(r.appliedKeys, ["PRISM_FLEET_REAPER_MEM_PRESSURE_PCT"]);
    assert.equal(env.PRISM_FLEET_REAPER_MEM_PRESSURE_PCT, "90");
  } finally {
    try { rmSync(dir, { recursive: true, force: true }); } catch {}
  }
});

test("applyHostPresetForCurrent: host with no preset returns applied:false", () => {
  const dir = makeTmpDir();
  const path = join(dir, "presets.json");
  writeFileSync(path, JSON.stringify({ schemaVersion: SCHEMA_VERSION, presets: {} }));
  try {
    const r = applyHostPresetForCurrent({ path, host: "Unknown", env: {} });
    assert.equal(r.applied, false);
    assert.equal(r.label, null);
    assert.equal(r.reason, "no-preset-for-host");
  } finally {
    try { rmSync(dir, { recursive: true, force: true }); } catch {}
  }
});

// ── setPresetForHost (atomic write) ──

test("setPresetForHost: writes a new file with the home preset", () => {
  const dir = makeTmpDir();
  const path = join(dir, "presets.json");
  try {
    const r = setPresetForHost({ host: "TestHost", label: "home", presetBody: BUILTIN_PRESETS.home, path });
    assert.equal(r.ok, true);
    assert.equal(r.previousLabel, null);
    const doc = JSON.parse(readFileSync(path, "utf8"));
    assert.equal(doc.schemaVersion, SCHEMA_VERSION);
    assert.equal(doc.presets.TestHost.label, "home");
    assert.equal(doc.presets.TestHost.PRISM_FLEET_REAPER_OLLAMA_PREWARM_MODEL, "qwen2.5-coder:32b");
  } finally {
    try { rmSync(dir, { recursive: true, force: true }); } catch {}
  }
});

test("setPresetForHost: switching home → work preserves other hosts + updates label", () => {
  const dir = makeTmpDir();
  const path = join(dir, "presets.json");
  try {
    setPresetForHost({ host: "WorkPC", label: "work", presetBody: BUILTIN_PRESETS.work, path });
    setPresetForHost({ host: "HomePC", label: "home", presetBody: BUILTIN_PRESETS.home, path });
    // Now flip HomePC to a "work" preset
    const r = setPresetForHost({ host: "HomePC", label: "work", presetBody: BUILTIN_PRESETS.work, path });
    assert.equal(r.ok, true);
    assert.equal(r.previousLabel, "home");
    const doc = JSON.parse(readFileSync(path, "utf8"));
    assert.equal(doc.presets.HomePC.label, "work");
    assert.equal(doc.presets.WorkPC.label, "work"); // untouched
  } finally {
    try { rmSync(dir, { recursive: true, force: true }); } catch {}
  }
});

test("setPresetForHost: rejects unknown label", () => {
  const dir = makeTmpDir();
  const path = join(dir, "presets.json");
  try {
    const r = setPresetForHost({ host: "X", label: "bogus", presetBody: { foo: "bar" }, path });
    assert.equal(r.ok, false);
    assert.match(r.error, /unknown label/);
  } finally {
    try { rmSync(dir, { recursive: true, force: true }); } catch {}
  }
});

test("setPresetForHost: accepts custom label (operator-defined)", () => {
  const dir = makeTmpDir();
  const path = join(dir, "presets.json");
  try {
    const r = setPresetForHost({
      host: "Laptop",
      label: "custom",
      presetBody: { PRISM_FLEET_REAPER_MEM_PRESSURE_PCT: "80" },
      path,
    });
    assert.equal(r.ok, true);
    const doc = JSON.parse(readFileSync(path, "utf8"));
    assert.equal(doc.presets.Laptop.label, "custom");
  } finally {
    try { rmSync(dir, { recursive: true, force: true }); } catch {}
  }
});

test("setPresetForHost: accepts blackwell label (new 96GB GPU class)", () => {
  const dir = makeTmpDir();
  const path = join(dir, "presets.json");
  try {
    const r = setPresetForHost({ host: "BlackwellPC", label: "blackwell", presetBody: BUILTIN_PRESETS.blackwell, path });
    assert.equal(r.ok, true);
    const doc = JSON.parse(readFileSync(path, "utf8"));
    assert.equal(doc.presets.BlackwellPC.label, "blackwell");
    assert.equal(doc.presets.BlackwellPC.PRISM_FLEET_REAPER_OLLAMA_PREWARM_MODEL, "qwen2.5-coder:32b");
  } finally {
    try { rmSync(dir, { recursive: true, force: true }); } catch {}
  }
});

test("setPresetForHost: missing required fields returns ok:false", () => {
  const r1 = setPresetForHost({});
  assert.equal(r1.ok, false);
  const r2 = setPresetForHost({ host: "X" });
  assert.equal(r2.ok, false);
  const r3 = setPresetForHost({ host: "X", label: "home" });
  assert.equal(r3.ok, false);
});

// ── Round-trip: write + load + apply ──

test("round-trip: setPresetForHost → loadPresetFile → applyPresetToEnv", () => {
  const dir = makeTmpDir();
  const path = join(dir, "presets.json");
  try {
    setPresetForHost({ host: "MyPC", label: "work", presetBody: BUILTIN_PRESETS.work, path });
    const r = applyHostPresetForCurrent({ path, host: "MyPC", env: {} });
    assert.equal(r.applied, true);
    assert.equal(r.label, "work");
    assert.ok(r.appliedKeys.includes("PRISM_FLEET_REAPER_OLLAMA_PREWARM_MODEL"));
    assert.ok(r.appliedKeys.includes("PRISM_FLEET_REAPER_MEM_PRESSURE_PCT"));
  } finally {
    try { rmSync(dir, { recursive: true, force: true }); } catch {}
  }
});
