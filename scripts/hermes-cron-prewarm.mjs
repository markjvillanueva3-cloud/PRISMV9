#!/usr/bin/env node
/**
 * hermes-cron-prewarm.mjs -- pre-load the Ollama model a Hermes cron job needs,
 * BEFORE its scheduled tick, so the local-model run never pays the cold-load stall.
 *
 * Hermes (C:/Users/<u>/AppData/Local/hermes/) runs scheduled cron jobs (morning
 * brief on gpt-oss:120b ~= 60GB, inbox sweep on gpt-oss:20b, weekly review on 120b).
 * On the Blackwell box the fleet cycles many models through VRAM (the offload route
 * gate warms qwen2.5-coder:32b, vision models load for OCR, ...), so the cron's model
 * is frequently COLD at tick time -- a cold gpt-oss:120b load is tens of seconds, which
 * stalls the chained run (morning-brief context_from inbox-sweep).
 *
 * This script reads cron/jobs.json, finds every ENABLED local-model job whose
 * `next_run_at` falls inside the next `--lead-minutes` window, and fires a detached
 * 1-token /api/generate with a keep_alive that covers the lead window -- so the model
 * is resident when the cron fires. Mirrors `.claude/hooks/ollama-prewarm-on-pipeline.mjs`
 * (clone-don't-fork): same detached-curl warm + warm-check, keyed to cron schedule
 * instead of a pipeline keyword.
 *
 * Fail-soft by design: missing jobs file, Ollama down, malformed job -> no-op, exit 0,
 * so a scheduled task / Stop hook can call it unconditionally.
 *
 * Usage:
 *   node scripts/hermes-cron-prewarm.mjs [--dry-run] [--lead-minutes N] [--json]
 *        [--jobs <path>]
 *
 * KILL SWITCH: PRISM_HERMES_PREWARM_DISABLE=1
 */

import { readFileSync, existsSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";

const KILL_SWITCH = "PRISM_HERMES_PREWARM_DISABLE";
const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const DEFAULT_JOBS = `${process.env.LOCALAPPDATA || "C:/Users/" + (process.env.USERNAME || "wompu") + "/AppData/Local"}/hermes/cron/jobs.json`;
const DEFAULT_LEAD_MIN = 15;
const PROBE_TIMEOUT_SEC = 2;
// Non-Ollama fallback models that must never be warmed against the Ollama server.
const NON_OLLAMA_RE = /claude|opus|sonnet|haiku|anthropic|gpt-4|^o[0-9]/i;

/**
 * PURE CORE (R9 testable): which distinct local models need warming right now?
 * @param {Array} jobs        parsed jobs.json array
 * @param {number} nowMs      current epoch ms
 * @param {number} leadMs     warm a job's model if its next_run_at is within this window ahead
 * @returns {string[]} distinct model names to warm (enabled, local, due-within-lead)
 */
export function selectModelsToWarm(jobs, nowMs, leadMs) {
  if (!Array.isArray(jobs)) return [];
  const out = new Set();
  const graceMs = 60_000; // tolerate a tick that just passed (script ran at the edge)
  for (const job of jobs) {
    if (!job || typeof job !== "object") continue;
    if (job.enabled === false) continue;
    const model = typeof job.model === "string" ? job.model.trim() : "";
    if (!model) continue;
    if (NON_OLLAMA_RE.test(model)) continue; // fallback/claude model -- not an Ollama load
    const nra = job.next_run_at || job.next_run || job.nextRun || job.next;
    if (!nra) continue;
    const t = Date.parse(nra);
    if (!Number.isFinite(t)) continue;
    // due within [now - grace, now + lead]
    if (t > nowMs + leadMs) continue;
    if (t < nowMs - graceMs) continue;
    out.add(model);
  }
  return [...out];
}

/** keep_alive string keeping the model resident through the lead window + a 30m run buffer. */
const RUN_BUFFER_MIN = 30;
export function keepAliveFor(leadMs) {
  return `${Math.ceil(leadMs / 60_000) + RUN_BUFFER_MIN}m`;
}

function readJobs(path) {
  try {
    if (!existsSync(path)) return null;
    const j = JSON.parse(readFileSync(path, "utf8"));
    return Array.isArray(j) ? j : (j.jobs || Object.values(j));
  } catch {
    return null;
  }
}

function ollamaUp() {
  const r = spawnSync("curl", ["-fsS", "-m", String(PROBE_TIMEOUT_SEC), `${OLLAMA_URL}/api/tags`],
    { encoding: "utf8", timeout: (PROBE_TIMEOUT_SEC + 1) * 1000 });
  return r.status === 0;
}

function loadWarmModels() {
  const r = spawnSync("curl", ["-fsS", "-m", String(PROBE_TIMEOUT_SEC), `${OLLAMA_URL}/api/ps`],
    { encoding: "utf8", timeout: (PROBE_TIMEOUT_SEC + 1) * 1000 });
  if (r.status !== 0) return [];
  try {
    const j = JSON.parse(r.stdout);
    if (Array.isArray(j.models)) return j.models.map(m => m.name || m.model).filter(Boolean);
  } catch { /* */ }
  return [];
}

function warmModel(model, keepAlive) {
  const body = JSON.stringify({ model, prompt: "ok", stream: false, keep_alive: keepAlive, options: { num_predict: 1 } });
  try {
    const child = spawn("curl",
      ["-fsS", "-m", "120", "-X", "POST", "-H", "Content-Type: application/json", "-d", body, `${OLLAMA_URL}/api/generate`],
      { detached: true, stdio: "ignore", windowsHide: true });
    child.unref();
    return true;
  } catch {
    return false;
  }
}

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const asJson = args.includes("--json");
  const leadIdx = args.indexOf("--lead-minutes");
  const leadMin = leadIdx >= 0 && args[leadIdx + 1] ? Number(args[leadIdx + 1]) : DEFAULT_LEAD_MIN;
  const jobsIdx = args.indexOf("--jobs");
  const jobsPath = jobsIdx >= 0 && args[jobsIdx + 1] ? args[jobsIdx + 1] : DEFAULT_JOBS;
  const leadMs = (Number.isFinite(leadMin) ? leadMin : DEFAULT_LEAD_MIN) * 60_000;

  const result = { ok: true, warmed: [], skipped: [], reason: "" };
  if (process.env[KILL_SWITCH] === "1") { result.reason = "kill-switch"; return emit(result, asJson); }

  const jobs = readJobs(jobsPath);
  if (!jobs) { result.reason = `no jobs file at ${jobsPath}`; return emit(result, asJson); }

  const want = selectModelsToWarm(jobs, Date.now(), leadMs);
  if (want.length === 0) { result.reason = `no cron job due within ${leadMin}m`; return emit(result, asJson); }

  if (dryRun) { result.warmed = want; result.reason = "dry-run"; return emit(result, asJson); }

  if (!ollamaUp()) { result.ok = false; result.reason = "ollama down (:11434 unreachable) -- cron will cold-load"; result.skipped = want; return emit(result, asJson); }

  const warm = loadWarmModels();
  const ka = keepAliveFor(leadMs);
  for (const model of want) {
    if (warm.some(w => w === model || w.startsWith(model + ":"))) { result.skipped.push(`${model} (already warm)`); continue; }
    if (warmModel(model, ka)) result.warmed.push(model); else result.skipped.push(`${model} (warm-spawn failed)`);
  }
  return emit(result, asJson);
}

function emit(result, asJson) {
  if (asJson) process.stdout.write(JSON.stringify(result) + "\n");
  else process.stdout.write(`[hermes-cron-prewarm] ${result.warmed.length ? "warmed " + result.warmed.join(",") : result.reason}${result.skipped.length ? " | skipped " + result.skipped.join(",") : ""}\n`);
}

// run unless imported by the test
import { fileURLToPath } from "node:url";
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
