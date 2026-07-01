// tier: T4
// ollama-cheap-tier-prime.mjs (slot:alpha 2026-06-25, U-ALPHA-OLLAMA-CHEAP-PRIME)
//
// DEMAND-DRIVEN activation for the per-mode cheap floor (U-ALPHA-OLLAMA-MODE-SUFFICIENCY).
//
// WHY: loadedPreferenceForMode makes ask-ollama prefer a WARM qwen2.5-coder:7b for summarize/explain
// -- but ONLY if 7b is actually resident. The fleet today keeps qwen2.5-coder:1.5b warm (BELOW the
// measured floor, deliberately excluded), so without this the lever is dormant: every summarize cold-
// loads 32b and 7b never gets warm. A blanket cron that always warms 7b wastes VRAM when there is no
// summarize/explain traffic. This primes ON DEMAND instead: after a measured-mode offload that did NOT
// land on the cheap floor (because it was cold), fire ONE detached, rate-limited, fail-soft warm of
// the floor model -- so the NEXT summarize/explain rides the warm cheap model. Self-limiting (no
// traffic -> no prime), demand-proportional, and it decays via keep_alive when traffic stops.
//
// PURE selection (shouldPrimeCheapTier) + injectable side-effect (primeCheapTier, fully mockable).
// Never throws into ask-ollama's hot path; never awaited (fire-and-forget).

import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { spawn as nodeSpawnImpl } from "node:child_process";
import { cheapFloorForMode } from "./ollama-mode-sufficiency.mjs";

export const PRIME_DISABLE_ENV = "PRISM_OLLAMA_CHEAP_PRIME_DISABLE";
const DEFAULT_COOLDOWN_MS = 10 * 60 * 1000; // 10 min per-model, mirrors ollama-prewarm-on-pipeline
const DEFAULT_KEEP_ALIVE = "10m";
const DEFAULT_OLLAMA_URL = "http://127.0.0.1:11434";
const DEFAULT_STAMP_DIR = "H:/prism/.claude/cache/ollama-cheap-prime";

/**
 * Decide whether to warm the cheap floor for `mode` given the model THIS call actually used.
 * Prime iff: the mode is measured (has a cheap floor) AND the floor model was NOT the pick -- i.e. it
 * was cold, so warming it benefits the next same-mode call. If the floor WAS the pick it is already
 * warm (no-op). Pure; returns the floor model name to warm, or null to skip.
 * @param {string} mode
 * @param {string} selectedModel  the model runRequest chose for this call
 * @returns {string|null} the floor model to warm, or null
 */
export function shouldPrimeCheapTier(mode, selectedModel) {
  const floor = cheapFloorForMode(mode);
  if (!floor) return null;                       // unmeasured mode -> never prime
  if (selectedModel === floor) return null;      // floor already warm (it was the pick) -> no-op
  return floor;
}

function defaultInCooldown(model, stampDir, cooldownMs, now) {
  try {
    const stamp = `${stampDir}/${model.replace(/[^a-z0-9.\-]/gi, "_")}.iso`;
    if (!existsSync(stamp)) return false;
    return now - statSync(stamp).mtimeMs < cooldownMs;
  } catch { return false; }
}

function defaultStamp(model, stampDir, now) {
  try {
    if (!existsSync(stampDir)) mkdirSync(stampDir, { recursive: true });
    const stamp = `${stampDir}/${model.replace(/[^a-z0-9.\-]/gi, "_")}.iso`;
    writeFileSync(stamp, new Date(now).toISOString());
  } catch { /* fail-soft */ }
}

/**
 * Fire-and-forget warm of the cheap floor model for `mode`, if warranted + not in cooldown. Returns a
 * verdict object (for tests/telemetry); NEVER throws, NEVER awaits the spawn. The spawn is a detached,
 * windowsHide curl /api/generate (1 token, keep_alive) -- identical pattern to ollama-prewarm-on-
 * pipeline.mjs. The cooldown stamp is written only after a successful spawn so a transient spawn
 * failure (Ollama down) is retried on the next call after the window, not suppressed for 10 min.
 *
 * @param {string} mode
 * @param {string} selectedModel  the model this call used
 * @param {object} [deps] injectable: { spawn, fs, now, env, ollamaUrl, stampDir, cooldownMs, keepAlive,
 *   inCooldown, stamp }
 * @returns {{primed: boolean, model: string|null, reason: string}}
 */
export function primeCheapTier(mode, selectedModel, deps = {}) {
  const env = deps.env || process.env;
  if (env[PRIME_DISABLE_ENV] === "1") return { primed: false, model: null, reason: "disabled" };

  const model = shouldPrimeCheapTier(mode, selectedModel);
  if (!model) return { primed: false, model: null, reason: "not-warranted" };

  const now = typeof deps.now === "number" ? deps.now : Date.now();
  const stampDir = deps.stampDir || DEFAULT_STAMP_DIR;
  const cooldownMs = typeof deps.cooldownMs === "number" ? deps.cooldownMs : DEFAULT_COOLDOWN_MS;
  const inCooldown = deps.inCooldown || ((m) => defaultInCooldown(m, stampDir, cooldownMs, now));
  if (inCooldown(model)) return { primed: false, model, reason: "cooldown" };

  const ollamaUrl = deps.ollamaUrl || env.OLLAMA_URL || DEFAULT_OLLAMA_URL;
  const keepAlive = deps.keepAlive || DEFAULT_KEEP_ALIVE;
  const body = JSON.stringify({
    model, prompt: "ok", stream: false, keep_alive: keepAlive, options: { num_predict: 1 },
  });
  const spawn = deps.spawn || nodeSpawnImpl;
  let ok = false;
  try {
    const child = spawn(
      "curl",
      ["-fsS", "-m", "30", "-X", "POST", "-H", "Content-Type: application/json",
       "-d", body, `${ollamaUrl}/api/generate`],
      { detached: true, stdio: "ignore", windowsHide: true },
    );
    if (child && typeof child.unref === "function") child.unref();
    ok = true;
  } catch { ok = false; }

  if (ok) (deps.stamp || ((m) => defaultStamp(m, stampDir, now)))(model);
  return { primed: ok, model, reason: ok ? "primed" : "spawn-failed" };
}
