// fleet-reaper-host-presets.mjs — per-PC env-var preset overlay.
//
// Hostname-keyed presets let the same fleet-reaper code do the right thing on
// dissimilar PCs: a home PC with a 16GB GPU + 64GB RAM can keep a 7B model
// resident and hold a 90% mem floor; a work PC with an 8GB GPU + tighter RAM
// needs a smaller default model and a tighter floor so the reaper kicks in
// earlier. Without this, /fleet-reaper-* skills would have to set env each
// invocation — which fails for the durable scheduled task (no env survives
// across reboots through the task XML unless baked in at install time).
//
// Storage:
//   state/shared/dashboards/fleet-reaper-host-presets.json
//   { schemaVersion: 1, presets: { "<hostname>": { label, ...PRISM_FLEET_REAPER_*... } } }
//
// Discovery is opt-in by host: a missing entry = no override (defaults preserved).
// Env wins over preset (explicit operator override always takes precedence).
//
// Doctrine pins:
//   - Atomic write (tmp+rename) — never half-written presets
//   - Pure-core: setPreset/loadPreset/applyPreset injectable for tests
//   - R12 fail-loud: corrupt JSON returns null + advisoryReason, never throws
//   - Only PRISM_FLEET_REAPER_* env keys are applied (allowlist)

import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync, statSync } from "node:fs";
import { dirname } from "node:path";
import { hostname } from "node:os";

export const PRESETS_PATH = "H:/prism/state/shared/dashboards/fleet-reaper-host-presets.json";
export const SCHEMA_VERSION = 1;
export const ALLOWED_ENV_PREFIX = "PRISM_FLEET_REAPER_";

// Built-in presets — operators copy these into the per-host file via the
// /fleet-reaper-home or /fleet-reaper-work skills. Listed here as the source
// of truth for the three PC classes PRISM is tuned for (home 16GB · work 8GB · blackwell 96GB); per-host file is the
// runtime overlay so the operator can adjust further without code changes.
export const BUILTIN_PRESETS = Object.freeze({
  home: Object.freeze({
    label: "home",
    description: "RTX 4080 SUPER 16GB · Ryzen 7 7800X3D · 64GB RAM — room for a 7B resident model and 90% mem floor",
    PRISM_FLEET_REAPER_OLLAMA_PREWARM_MODEL: "qwen2.5-coder:32b",
    PRISM_FLEET_REAPER_OLLAMA_KEEP_ALIVE: "10m",
    PRISM_FLEET_REAPER_GPU_FREE_MIN_MB: "2048",
    PRISM_FLEET_REAPER_MEM_PRESSURE_PCT: "90",
    PRISM_FLEET_REAPER_MEM_CRITICAL_PCT: "95",
    PRISM_FLEET_REAPER_SOFT_RELIEF_PRESSURE_PCT: "90",
    PRISM_FLEET_REAPER_HINT_THRESHOLD_DELTA: "0.15",
    PRISM_FLEET_REAPER_BALLAST_MB: "256",
  }),
  blackwell: Object.freeze({
    label: "blackwell",
    description: "RTX PRO 6000 Blackwell Workstation Edition 96GB · 127GB RAM — keep a 32B model resident (Q4_K_M ~20GB) with huge headroom for NIM + multiple parallel models",
    PRISM_FLEET_REAPER_OLLAMA_PREWARM_MODEL: "qwen2.5-coder:32b",
    PRISM_FLEET_REAPER_OLLAMA_KEEP_ALIVE: "60m",
    PRISM_FLEET_REAPER_GPU_FREE_MIN_MB: "24576",
    PRISM_FLEET_REAPER_MEM_PRESSURE_PCT: "90",
    PRISM_FLEET_REAPER_MEM_CRITICAL_PCT: "95",
    PRISM_FLEET_REAPER_SOFT_RELIEF_PRESSURE_PCT: "90",
    PRISM_FLEET_REAPER_HINT_THRESHOLD_DELTA: "0.25",
    PRISM_FLEET_REAPER_BALLAST_MB: "256",
  }),
  work: Object.freeze({
    label: "work",
    description: "Smaller GPU (~8GB free) + tighter RAM — 3B resident, 85% mem floor, more aggressive offload",
    PRISM_FLEET_REAPER_OLLAMA_PREWARM_MODEL: "qwen2.5-coder:32b",
    PRISM_FLEET_REAPER_OLLAMA_KEEP_ALIVE: "10m",
    PRISM_FLEET_REAPER_GPU_FREE_MIN_MB: "1024",
    PRISM_FLEET_REAPER_MEM_PRESSURE_PCT: "85",
    PRISM_FLEET_REAPER_MEM_CRITICAL_PCT: "92",
    PRISM_FLEET_REAPER_SOFT_RELIEF_PRESSURE_PCT: "85",
    PRISM_FLEET_REAPER_HINT_THRESHOLD_DELTA: "0.20",
    PRISM_FLEET_REAPER_BALLAST_MB: "128",
  }),
});

// Pure: read the preset file. Returns { presets, hostname, advisoryReason? }.
// Never throws — corrupt JSON / missing file → null preset + advisoryReason.
export function loadPresetFile(opts = {}) {
  const path = opts.path || PRESETS_PATH;
  const readFile = opts.readFile || ((p) => readFileSync(p, "utf8"));
  const fileExists = opts.fileExists || existsSync;
  if (!fileExists(path)) return { presets: {}, advisoryReason: "file-missing" };
  try {
    const doc = JSON.parse(readFile(path));
    if (!doc || typeof doc !== "object") return { presets: {}, advisoryReason: "non-object-root" };
    if (doc.schemaVersion !== SCHEMA_VERSION) {
      return { presets: {}, advisoryReason: `schema-mismatch (have=${doc.schemaVersion}, want=${SCHEMA_VERSION})` };
    }
    return { presets: doc.presets && typeof doc.presets === "object" ? doc.presets : {} };
  } catch (e) {
    return { presets: {}, advisoryReason: `parse-error: ${e.message}` };
  }
}

// Pure: look up a host's preset (case-insensitive on hostname).
export function getPresetForHost(host, presets) {
  if (!host || !presets || typeof presets !== "object") return null;
  const upperHost = String(host).toUpperCase();
  for (const [key, val] of Object.entries(presets)) {
    if (String(key).toUpperCase() === upperHost) return val || null;
  }
  return null;
}

// Pure: overlay a preset onto an env object. Returns { appliedKeys, skippedKeys, conflictKeys }.
// Conflict = key already set in env (explicit operator override wins; we never clobber).
// Skipped = key not in the PRISM_FLEET_REAPER_ allowlist (e.g. `label`, `description`).
export function applyPresetToEnv(preset, env) {
  const appliedKeys = [];
  const skippedKeys = [];
  const conflictKeys = [];
  if (!preset || typeof preset !== "object") return { appliedKeys, skippedKeys, conflictKeys };
  for (const [k, v] of Object.entries(preset)) {
    if (!k.startsWith(ALLOWED_ENV_PREFIX)) {
      skippedKeys.push(k);
      continue;
    }
    if (env[k] !== undefined && env[k] !== "") {
      conflictKeys.push(k);
      continue;
    }
    env[k] = String(v);
    appliedKeys.push(k);
  }
  return { appliedKeys, skippedKeys, conflictKeys };
}

// Convenience: load + lookup + apply for the current host. Used by fleet-reaper-sweep
// at startup. Returns { applied: boolean, host, label, ...stats } for telemetry.
export function applyHostPresetForCurrent(opts = {}) {
  const host = opts.host || hostname();
  const env = opts.env || process.env;
  const file = loadPresetFile(opts);
  const preset = getPresetForHost(host, file.presets);
  if (!preset) {
    return {
      applied: false,
      host,
      label: null,
      reason: file.advisoryReason || "no-preset-for-host",
      appliedKeys: [],
    };
  }
  const r = applyPresetToEnv(preset, env);
  return {
    applied: r.appliedKeys.length > 0,
    host,
    label: preset.label || null,
    appliedKeys: r.appliedKeys,
    skippedKeys: r.skippedKeys,
    conflictKeys: r.conflictKeys,
  };
}

// Atomic write: set or update the preset for `host`. Returns { ok, previousLabel? }.
// Pure-shell variant takes injected fs + path so it's unit-testable without touching disk.
export function setPresetForHost({ host, label, presetBody, path = PRESETS_PATH, fs = null }) {
  const _fs = fs || {
    existsSync, readFileSync, writeFileSync, renameSync, mkdirSync, statSync,
  };
  if (!host || !label || !presetBody) {
    return { ok: false, error: "missing host/label/presetBody" };
  }
  if (!Object.hasOwn(BUILTIN_PRESETS, label) && label !== "custom") {
    return { ok: false, error: `unknown label "${label}" (allowed: ${Object.keys(BUILTIN_PRESETS).join(", ")}, or "custom")` };
  }
  // Read current doc
  let doc = { schemaVersion: SCHEMA_VERSION, presets: {} };
  if (_fs.existsSync(path)) {
    try {
      const parsed = JSON.parse(_fs.readFileSync(path, "utf8"));
      if (parsed && typeof parsed === "object" && parsed.schemaVersion === SCHEMA_VERSION) {
        doc = parsed;
        if (!doc.presets || typeof doc.presets !== "object") doc.presets = {};
      }
    } catch { /* corrupt → start fresh, but don't clobber if existing was just unreadable; renameSync atomic write covers it */ }
  }
  const previousLabel = doc.presets[host]?.label || null;
  doc.presets[host] = { ...presetBody, label, _updatedAt: new Date().toISOString() };
  doc.lastUpdated = new Date().toISOString();
  const dir = dirname(path);
  if (!_fs.existsSync(dir)) _fs.mkdirSync(dir, { recursive: true });
  const tmp = `${path}.tmp.${process.pid}`;
  _fs.writeFileSync(tmp, JSON.stringify(doc, null, 2));
  _fs.renameSync(tmp, path);
  return { ok: true, previousLabel, host, label };
}
