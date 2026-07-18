#!/usr/bin/env node
/**
 * ollama-wedge-guard.mjs -- detect + auto-recover the Ollama "generate WEDGE"
 * (BRAVO AI-SYNERGY-SUBSTRATE-GUARD, slot:bravo 2026-06-13).
 *
 * THE GAP this closes: the existing health probes are blind to the wedge.
 *   - scripts/ollama-docker-health.mjs probes ONLY /api/tags (metadata) -> reports "up" while
 *     /api/generate hangs.
 *   - scripts/fleet-services-watchdog.mjs restarts ollama via the DOCKER launcher -> wrong for a
 *     host running NATIVE "PRISM Ollama Serve".
 * The wedge (observed TWICE in one session, 2026-06-13): /api/tags + /api/ps respond, but
 * /api/generate hangs for ANY model -- while system RAM (66GB free) AND GPU VRAM (94GB free) are
 * both free. Root cause = a wedged/orphaned llama-server runner (dead parent); the daemon's
 * generate path stalls. Recovery = reap the orphan runner (dead-parent gated) + restart the
 * native "PRISM Ollama Serve" scheduled task. See
 * [[reference_ollama_wedged_orphan_runner_recovery_2026_06_13]].
 *
 * This guard does that automatically. The CLASSIFIER is PURE (hermetically tested); the probe +
 * recovery are best-effort + fail-soft. It deliberately does NOT restart on "resource-starved"
 * (RAM/VRAM genuinely low) -- a restart cannot fix an OOM and would only thrash the host.
 *
 * RESIDENT-FIRST PROBE (slot:golf 2026-07-01, U-GOLF-WEDGE-PROBE-RESIDENT-FIRST): probing a
 * hardcoded tiny model is itself a false-positive source. With OLLAMA_MAX_LOADED_MODELS=2 and
 * both slots pinned by fleet traffic (keep_alive continuously refreshed), a generate for a THIRD
 * model queues behind an eviction that never happens -> the probe "hangs" -> classified "wedged"
 * -> --recover restarts a HEALTHY daemon and evicts ~51GB of hot models (the monitor became the
 * harm loop; observed live 2026-07-01: resident model answered in 3s while the 1.5b probe hung
 * 134s). Fix: probe a model that is ALREADY RESIDENT (/api/ps, smallest first) so the probe
 * tests the generate PATH without competing for a load slot; fall back to the configured tiny
 * model only when nothing is loaded (daemon idle -> a cold-load is then a fair probe). The
 * original 2026-06-13 wedge ("generate hangs for ANY model") is still caught -- a resident-model
 * hang is exactly that signal. See [[reference_ollama_gpu_wedge_guard_insufficient_2026_07_01]].
 *
 * Usage:
 *   node scripts/ollama-wedge-guard.mjs            # --status (probe + classify, NO action)
 *   node scripts/ollama-wedge-guard.mjs --status   # same
 *   node scripts/ollama-wedge-guard.mjs --recover   # if WEDGED -> reap orphan + restart, re-probe
 *   node scripts/ollama-wedge-guard.mjs --json      # machine-readable
 * Env: PRISM_OLLAMA_URL (default http://127.0.0.1:11434),
 *      PRISM_OLLAMA_WEDGE_PROBE_MODEL (fallback when nothing resident; default qwen2.5-coder:1.5b),
 *      PRISM_OLLAMA_WEDGE_PROBE_FORCE=1 (always probe PROBE_MODEL, skip resident-first),
 *      PRISM_OLLAMA_WEDGE_GEN_TIMEOUT_MS (default 45000),
 *      PRISM_OLLAMA_WEDGE_RAM_FLOOR_GB (default 4), PRISM_OLLAMA_WEDGE_VRAM_FLOOR_GB (default 2),
 *      PRISM_OLLAMA_SERVE_TASK (default "PRISM Ollama Serve").
 */
import os from "node:os";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { readGpuVram } from "./lib/gpu-vram-guard.mjs"; // multi-GPU-safe + tested (3-of-3 arm-C P1)

const OLLAMA_URL = (process.env.PRISM_OLLAMA_URL || "http://127.0.0.1:11434").replace(/\/+$/, "");
const PROBE_MODEL = process.env.PRISM_OLLAMA_WEDGE_PROBE_MODEL || "qwen2.5-coder:1.5b";
const PROBE_FORCE = process.env.PRISM_OLLAMA_WEDGE_PROBE_FORCE === "1";
const GEN_TIMEOUT_MS = Number(process.env.PRISM_OLLAMA_WEDGE_GEN_TIMEOUT_MS) || 45000;
const RAM_FLOOR_GB = Number(process.env.PRISM_OLLAMA_WEDGE_RAM_FLOOR_GB) || 4;
const VRAM_FLOOR_GB = Number(process.env.PRISM_OLLAMA_WEDGE_VRAM_FLOOR_GB) || 2;
const SERVE_TASK = process.env.PRISM_OLLAMA_SERVE_TASK || "PRISM Ollama Serve";
const TAGS_TIMEOUT_MS = 8000;
const RECOVER_SETTLE_MS = 4000;

/**
 * PURE: classify Ollama health from probe + resource signals.
 *   - tags down                                       -> "down"            (daemon not responding at all)
 *   - generate ok                                     -> "healthy"
 *   - generate failed but RESPONDED (e.g. 404 model-missing) -> "probe-error" (daemon ALIVE; NOT a wedge)
 *   - generate HUNG (no response), RAM/VRAM low       -> "resource-starved" (restart won't help; no thrash)
 *   - generate HUNG (no response), resources free     -> "wedged"          (recoverable: reap orphan + restart)
 * Only "wedged" warrants a restart. A definitive HTTP error (generateHung=false) means the generate
 * path is ALIVE -- it is a probe/config issue (missing probe model), NEVER a reason to kill+restart
 * the daemon (the 3-of-3 arm-C false-positive: an uninstalled probe model must not trigger recovery).
 * Pure -> hermetically testable.
 */
export function classifyOllamaHealth({ tagsOk, generateOk, generateHung, freeRamGB, freeVramGB, ramFloorGB = RAM_FLOOR_GB, vramFloorGB = VRAM_FLOOR_GB } = {}) {
  if (!tagsOk) return "down";
  if (generateOk) return "healthy";
  if (!generateHung) return "probe-error"; // daemon answered (error/404) -> alive, not hung
  const ramLow = freeRamGB != null && Number.isFinite(freeRamGB) && freeRamGB < ramFloorGB;
  const vramLow = freeVramGB != null && Number.isFinite(freeVramGB) && freeVramGB < vramFloorGB;
  if (ramLow || vramLow) return "resource-starved";
  return "wedged";
}

/** PURE: does this health state warrant the reap+restart recovery? Only a wedge does. */
export function shouldRecover(health) {
  return health === "wedged";
}

/**
 * PURE: choose the generate-probe model. Resident-first (smallest resident from /api/ps so the
 * probe is fast AND never competes for a load slot -- the OLLAMA_MAX_LOADED_MODELS starvation
 * false-positive, 2026-07-01); fall back to the configured tiny model when nothing is resident
 * (daemon idle -> a load slot is free, cold-load is a fair probe). `force` (env
 * PRISM_OLLAMA_WEDGE_PROBE_FORCE=1) always uses the fallback -- the escape hatch if a resident
 * model itself misbehaves. Malformed /api/ps entries (no string name) are ignored.
 * Pure -> hermetically testable.
 */
export function pickProbeModel(residentModels, fallbackModel = PROBE_MODEL, force = PROBE_FORCE) {
  if (force || !Array.isArray(residentModels)) return fallbackModel;
  // Embedding models (nomic-embed-text etc.) are tiny -> would always sort first, but
  // /api/generate rejects them with a fast 400 (capability check, BEFORE the runner) ->
  // "probe-error" would mask a real wedge for as long as one is resident (scrutiny arm-A P1).
  const isEmbed = (m) =>
    /embed/i.test(m.name) ||
    (Array.isArray(m.details && m.details.families) && m.details.families.some((f) => /bert/i.test(String(f))));
  const usable = residentModels.filter((m) => m && typeof m.name === "string" && m.name.length > 0 && !isEmbed(m));
  if (usable.length === 0) return fallbackModel;
  usable.sort((a, b) => {
    const sa = Number.isFinite(a.size_vram) ? a.size_vram : Number.isFinite(a.size) ? a.size : Infinity;
    const sb = Number.isFinite(b.size_vram) ? b.size_vram : Number.isFinite(b.size) ? b.size : Infinity;
    return sa - sb;
  });
  return usable[0].name;
}

/** Best-effort fetch with timeout. Returns {ok, status} | {ok:false, error}. */
async function probe(url, { method = "GET", body = null, timeoutMs = TAGS_TIMEOUT_MS } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
    if (method === "POST") {
      const j = await res.json().catch(() => null);
      // responded:true = the daemon gave an HTTP answer (even a 404/error) -> it is NOT hung.
      return { ok: res.ok && !!j && typeof j.response === "string", responded: true, status: res.status };
    }
    return { ok: res.ok, responded: true, status: res.status };
  } catch (e) {
    // abort/timeout/network = NO response = the daemon HUNG (the wedge signal).
    return { ok: false, responded: false, error: String(e && e.message) };
  } finally {
    clearTimeout(t);
  }
}

/** Free VRAM in GB via the canonical multi-GPU-safe reader (null if unavailable -> "not low"). */
function freeVramGB() {
  try {
    const r = readGpuVram(); // highest-pressure GPU; tested + injection-safe (R8 reuse, not inline)
    return r && r.ok && Number.isFinite(r.freeMb) ? r.freeMb / 1024 : null;
  } catch {
    return null;
  }
}

/** Fail-soft GET /api/ps -> resident models array ([] on any failure -> fallback probe model). */
async function fetchResidentModels() {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TAGS_TIMEOUT_MS);
  try {
    const res = await fetch(`${OLLAMA_URL}/api/ps`, { signal: ctrl.signal });
    if (!res.ok) return [];
    const j = await res.json().catch(() => null);
    return j && Array.isArray(j.models) ? j.models : [];
  } catch {
    return [];
  } finally {
    clearTimeout(t);
  }
}

/** Probe Ollama health (tags + generate) + resources. Returns the full signal + classification. */
export async function probeOllamaHealth() {
  const tags = await probe(`${OLLAMA_URL}/api/tags`, { timeoutMs: TAGS_TIMEOUT_MS });
  // Resident-first: probe a model already in VRAM so the probe never queues behind a model-load
  // slot that fleet traffic keeps pinned (the max-loaded-models starvation false-"wedged").
  const resident = tags.ok ? await fetchResidentModels() : [];
  let probeModel = pickProbeModel(resident);
  // Only bother with the (slow) generate probe if tags is up -- a dead daemon is already "down".
  // num_predict bounds the response so probing a resident 20B/32B model stays cheap+fast.
  // keep_alive "30m" is DELIBERATE on both paths: omitting it would RESET a resident model's
  // expiry to Ollama's 5m default (every generate rewrites the expiry) -- extending a hot fleet
  // model 30m is the least-harm option short of echoing its exact expires_at (arm-A/B P2).
  const genBody = (model) => ({ model, prompt: "ok", stream: false, keep_alive: "30m", options: { num_predict: 8 } });
  let gen = tags.ok
    ? await probe(`${OLLAMA_URL}/api/generate`, { method: "POST", timeoutMs: GEN_TIMEOUT_MS, body: genBody(probeModel) })
    : { ok: false, error: "skipped (tags down)" };
  // A RESIDENT pick that RESPONDED with an error (e.g. a capability-400 from a model the embed
  // filter missed) says nothing about the wedge -- re-probe once with the fallback model before
  // classifying, else a real wedge reads "probe-error" forever (scrutiny arm-A P1 self-heal).
  if (tags.ok && probeModel !== PROBE_MODEL && !gen.ok && gen.responded === true) {
    probeModel = PROBE_MODEL;
    gen = await probe(`${OLLAMA_URL}/api/generate`, { method: "POST", timeoutMs: GEN_TIMEOUT_MS, body: genBody(probeModel) });
  }
  const ramGB = os.freemem() / 1e9;
  const vramGB = freeVramGB();
  const generateHung = tags.ok ? gen.responded !== true : false; // hung = daemon up but generate gave NO response
  const health = classifyOllamaHealth({ tagsOk: tags.ok, generateOk: gen.ok, generateHung, freeRamGB: ramGB, freeVramGB: vramGB });
  return { health, tagsOk: tags.ok, generateOk: gen.ok, generateHung, freeRamGB: Number(ramGB.toFixed(1)), freeVramGB: vramGB == null ? null : Number(vramGB.toFixed(1)), probeModel, residentCount: resident.length };
}

/**
 * PURE: build the PowerShell recovery script. ENABLE-then-start so a DISABLED serve task
 * (observed live 2026-06-23, slot:zulu: the task was disabled -> the old Stop+Start left
 * `start-fail: The task is disabled` and Ollama DOWN, worse than wedged) is re-enabled
 * rather than bricked. `Enable-ScheduledTask` is idempotent -> behavior-neutral when already
 * enabled. Pure -> the enable-before-start ordering is hermetically testable.
 */
export function buildRecoveryScript(serveTask = SERVE_TASK) {
  // Escape single quotes for the PS single-quoted string literals (defense-in-depth: the task
  // name is env-overridable via PRISM_OLLAMA_SERVE_TASK; a `'` would otherwise break out).
  const t = String(serveTask).replace(/'/g, "''");
  return `
Get-CimInstance Win32_Process -Filter "Name='llama-server.exe'" | ForEach-Object {
  $alive = Get-Process -Id $_.ParentProcessId -ErrorAction SilentlyContinue
  if (-not $alive) { try { Stop-Process -Id $_.ProcessId -Force; Write-Output ('reaped-orphan ' + $_.ProcessId) } catch {} }
}
try { Stop-ScheduledTask -TaskName '${t}' -ErrorAction Stop } catch {}
Start-Sleep -Seconds 2
Get-Process ollama,'llama-server' -ErrorAction SilentlyContinue | ForEach-Object { try { Stop-Process -Id $_.Id -Force } catch {} }
Start-Sleep -Seconds 2
try { Enable-ScheduledTask -TaskName '${t}' -ErrorAction SilentlyContinue | Out-Null } catch {}
try { Start-ScheduledTask -TaskName '${t}' -ErrorAction Stop; Write-Output 'serve-restarted' } catch { Write-Output ('start-fail: ' + $_.Exception.Message) }
`;
}

/** Best-effort native recovery: reap orphan llama-server (dead parent) + enable+restart the serve task. */
function recover() {
  const r = spawnSync("powershell", ["-NoProfile", "-Command", buildRecoveryScript()], { encoding: "utf8", timeout: 60000, windowsHide: true });
  return { ok: r.status === 0, out: String(r.stdout || "").trim(), err: String(r.stderr || "").trim() };
}

async function main() {
  const argv = process.argv.slice(2);
  const doRecover = argv.includes("--recover");
  const asJson = argv.includes("--json");
  let result = await probeOllamaHealth();
  let recovery = null;
  if (doRecover && shouldRecover(result.health)) {
    recovery = recover();
    await new Promise((r) => setTimeout(r, RECOVER_SETTLE_MS));
    const after = await probeOllamaHealth();
    recovery.afterHealth = after.health;
    result = { ...result, recovered: after.health === "healthy", afterHealth: after.health };
  }
  if (asJson) {
    process.stdout.write(JSON.stringify({ ...result, recovery }, null, 2) + "\n");
  } else {
    process.stdout.write(`ollama-wedge-guard: health=${result.health} (tags=${result.tagsOk} generate=${result.generateOk} probe=${result.probeModel} resident=${result.residentCount} freeRAM=${result.freeRamGB}GB freeVRAM=${result.freeVramGB}GB)\n`);
    if (recovery) process.stdout.write(`  recovery: ${recovery.out || recovery.err || "(no output)"} -> afterHealth=${recovery.afterHealth}\n`);
    else if (shouldRecover(result.health)) process.stdout.write(`  WEDGED -- run with --recover to reap orphan + restart "${SERVE_TASK}"\n`);
  }
  // exit 0 healthy/recovered; 1 wedged-and-not-recovered or down (so a scheduled task can alert).
  const ok = result.health === "healthy" || result.recovered === true;
  process.exit(ok ? 0 : 1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { process.stderr.write(`ollama-wedge-guard error: ${e && e.message}\n`); process.exit(1); });
}
