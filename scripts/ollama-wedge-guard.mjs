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
 * Usage:
 *   node scripts/ollama-wedge-guard.mjs            # --status (probe + classify, NO action)
 *   node scripts/ollama-wedge-guard.mjs --status   # same
 *   node scripts/ollama-wedge-guard.mjs --recover   # if WEDGED -> reap orphan + restart, re-probe
 *   node scripts/ollama-wedge-guard.mjs --json      # machine-readable
 * Env: PRISM_OLLAMA_URL (default http://127.0.0.1:11434),
 *      PRISM_OLLAMA_WEDGE_PROBE_MODEL (default qwen2.5-coder:1.5b),
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

/** Probe Ollama health (tags + generate) + resources. Returns the full signal + classification. */
export async function probeOllamaHealth() {
  const tags = await probe(`${OLLAMA_URL}/api/tags`, { timeoutMs: TAGS_TIMEOUT_MS });
  // Only bother with the (slow) generate probe if tags is up -- a dead daemon is already "down".
  const gen = tags.ok
    ? await probe(`${OLLAMA_URL}/api/generate`, { method: "POST", timeoutMs: GEN_TIMEOUT_MS, body: { model: PROBE_MODEL, prompt: "ok", stream: false, keep_alive: "30m" } })
    : { ok: false, error: "skipped (tags down)" };
  const ramGB = os.freemem() / 1e9;
  const vramGB = freeVramGB();
  const generateHung = tags.ok ? gen.responded !== true : false; // hung = daemon up but generate gave NO response
  const health = classifyOllamaHealth({ tagsOk: tags.ok, generateOk: gen.ok, generateHung, freeRamGB: ramGB, freeVramGB: vramGB });
  return { health, tagsOk: tags.ok, generateOk: gen.ok, generateHung, freeRamGB: Number(ramGB.toFixed(1)), freeVramGB: vramGB == null ? null : Number(vramGB.toFixed(1)), probeModel: PROBE_MODEL };
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
    process.stdout.write(`ollama-wedge-guard: health=${result.health} (tags=${result.tagsOk} generate=${result.generateOk} freeRAM=${result.freeRamGB}GB freeVRAM=${result.freeVramGB}GB)\n`);
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
