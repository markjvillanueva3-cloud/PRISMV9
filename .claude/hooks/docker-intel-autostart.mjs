#!/usr/bin/env node
// tier: T1
/**
 * docker-intel-autostart.mjs — Auto-start the PRISM intel-stack containers
 * (Qdrant + Ollama + nomic-embed-text preload) on every SessionStart.
 *
 * The intel stack is the embedder+vector backbone for PRISM's RAG +
 * tribal-search + memory-recall surface. When it's down, those surfaces
 * silently fall back to BM25-only / no-recall — degraded but functional.
 * This hook keeps it warm without operator action, so a fresh terminal
 * session lands with the embedder + Qdrant already responding.
 *
 * What it does (in order, fail-soft at every step):
 *   1. Skip if PRISM_DOCKER_INTEL_AUTOSTART_DISABLE=1 (kill switch).
 *   2. Throttle: skip if last successful run was < throttle window ago.
 *      Default 1h; override with PRISM_DOCKER_INTEL_AUTOSTART_THROTTLE_MS=N.
 *   3. Probe Docker — `docker info` with a 3s timeout. If Docker Desktop
 *      isn't running, bail SILENTLY (do not block SessionStart, do not nag).
 *   4. Probe containers — `docker ps --filter name=prism-qdrant ...`. If both
 *      `prism-qdrant` and `prism-ollama` are running, just refresh the
 *      sentinel and bail (the stack is already up — nothing to do).
 *   5. mkdir -p data/docker-volumes/{qdrant,ollama} (PREREQUISITE for the
 *      compose bind-mounts; the compose-up itself does NOT create these).
 *   6. Detach-spawn `docker compose -f docker-compose.yml -f
 *      docker-compose.intel.yml up -d qdrant ollama ollama-nomic-preload`.
 *      The hook does NOT wait for the up to complete — that would block the
 *      SessionStart event for tens of seconds. The spawn detaches; the
 *      compose-up runs in the background and the sentinel is written so the
 *      next SessionStart skips this branch.
 *   7. Emit a one-line advisory if PRISM_DOCKER_INTEL_AUTOSTART_VERBOSE=1.
 *
 * Failure policy (ALL paths):
 *   - Hook chain is critical infrastructure. Every catch returns SILENCE
 *     (`{continue:true,suppressOutput:true}`). The autostart is convenience;
 *     never block SessionStart over it.
 *   - Detach-spawn does NOT capture stderr — failures are logged to the
 *     compose service's own stdout/stderr, viewable via `docker compose logs`.
 *     The hook does not parrot subprocess errors back into SessionStart's
 *     additionalContext (would be noise for the operator on every fresh
 *     terminal). For diagnostics, set VERBOSE=1 and watch the sentinel state.
 *
 * Knobs:
 *   PRISM_DOCKER_INTEL_AUTOSTART_DISABLE=1   — kill switch (no-op the hook)
 *   PRISM_DOCKER_INTEL_AUTOSTART_VERBOSE=1   — emit a one-line confirmation
 *   PRISM_DOCKER_INTEL_AUTOSTART_THROTTLE_MS=N   — force-override throttle window in ms (default: status-aware, see THROTTLE_BY_STATUS)
 *   PRISM_DOCKER_INTEL_AUTOSTART_TIMEOUT_MS=N    — `docker info` probe timeout (default 3000)
 *   PRISM_DOCKER_INTEL_AUTOSTART_CONTAINER_PROBE_TIMEOUT_MS=N — `docker ps` probe timeout (default 3000)
 *   PRISM_DOCKER_INTEL_AUTOSTART_CONFIG_TIMEOUT_MS=N — `docker compose config --quiet` pre-spawn timeout (default 5000)
 *
 * Sentinel:  state/.docker-intel-autostart-sentinel.json
 *   { "lastRunAt": "<ISO>", "lastStatus": "up|already-running|docker-down|config-invalid|error", "host": "<hostname>" }
 *
 * Wiring: shipped wired in `C:/Users/<user>/.claude/settings.json` SessionStart
 *   matcher `*` (the c-to-h-mirror hook auto-replicates to H:/.claude/settings.json).
 *   Insertion point: after `session-start-terminal-pin.mjs` (similar T1
 *   auto-pin shape). To verify firing on this host:
 *     cat H:/prism/state/.docker-intel-autostart-sentinel.json
 *   should show a recent `lastRunAt` and `lastStatus` ∈ {up, already-running,
 *   docker-down, config-invalid}. For diagnostic detail set
 *   PRISM_DOCKER_INTEL_AUTOSTART_VERBOSE=1 for one session.
 *
 * Limitations (known, accepted):
 *   - `containersUp()` checks daemon-running state, NOT inference-readiness.
 *     If the preload service silently failed to pull `nomic-embed-text`, the
 *     hook still reports `already-running` and embedding queries 404 until
 *     someone re-runs the preload. Diagnose via `docker compose -f
 *     docker-compose.yml -f docker-compose.intel.yml logs ollama-nomic-preload`.
 *   - First-run compose-up pulls ~1.5GB of base images (qdrant + ollama + the
 *     nomic-embed-text model) and can take 5-15 minutes. Subsequent invocations
 *     against warm image caches complete in 10-30s. The hook detach-spawns so
 *     SessionStart never blocks regardless.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

const REPO_ROOT = "H:/prism";
const SENTINEL_PATH = path.join(REPO_ROOT, "state", ".docker-intel-autostart-sentinel.json");
const COMPOSE_BASE = "docker-compose.yml";
const COMPOSE_INTEL = "docker-compose.intel.yml";
const COMPOSE_SERVICES = ["qdrant", "ollama", "ollama-nomic-preload"];
const VOLUME_DIRS = ["data/docker-volumes/qdrant", "data/docker-volumes/ollama"];
const DEFAULT_THROTTLE_MS = 60 * 60 * 1000; // 1h fallback
// Worst-case cold-path probe budget = sum of the three timeouts. Must fit
// inside the settings.json wiring `timeout` ceiling (currently 8000ms) with
// slack, or the harness SIGTERMs the hook mid-probe and the docker-down
// sentinel never lands — defeating the throttle-on-docker-down design.
// Current budget: 2000 + 2000 + 3000 = 7000ms; wiring 8000ms → 1s slack.
const DEFAULT_PROBE_TIMEOUT_MS = 2000;
const DEFAULT_CONTAINER_PROBE_TIMEOUT_MS = 2000;
const DEFAULT_COMPOSE_CONFIG_TIMEOUT_MS = 3000;
// Status-aware throttle. Reflects how much we TRUST the prior status —
// `already-running` is daemon-verified (1h), `up` is spawn-launched-only (5m,
// re-verify quickly), `docker-down` is a Docker-Desktop-starting-up window
// (1m, retry soon), `error` / `config-invalid` is a fail-loud surface (1m).
const THROTTLE_BY_STATUS = {
  "already-running": 60 * 60 * 1000,   // 1h — daemon-verified
  "up":               5 * 60 * 1000,   // 5m — spawn launched, not verified
  "docker-down":      1 * 60 * 1000,   // 1m — re-probe quickly
  "config-invalid":   1 * 60 * 1000,   // 1m — pre-up validation failed
  "error":            1 * 60 * 1000,   // 1m — re-attempt
};
const SILENCE = { continue: true, suppressOutput: true };

function emit(obj) {
  try { process.stdout.write(JSON.stringify(obj)); } catch { /* ignore */ }
}

function readSentinel() {
  try {
    const buf = fs.readFileSync(SENTINEL_PATH, "utf8");
    return JSON.parse(buf);
  } catch { return null; }
}

function writeSentinel(status) {
  try {
    const dir = path.dirname(SENTINEL_PATH);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(SENTINEL_PATH, JSON.stringify({
      lastRunAt: new Date().toISOString(),
      lastStatus: status,
      host: os.hostname(),
    }, null, 2));
  } catch { /* never fail SessionStart over sentinel write */ }
}

function parseMs(envVar, defaultMs) {
  const v = process.env[envVar];
  if (!v) return defaultMs;
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 ? n : defaultMs;
}

function dockerAvailable(timeoutMs) {
  try {
    const r = spawnSync("docker", ["info", "--format", "{{.ServerVersion}}"], {
      timeout: timeoutMs,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    return r.status === 0 && r.stdout && r.stdout.toString().trim().length > 0;
  } catch { return false; }
}

function containersUp(timeoutMs) {
  // Returns true iff BOTH prism-qdrant and prism-ollama are running.
  // The preload service is one-shot — its `exited (0)` state is success;
  // it's not part of the daemon-up signal, only the inference-readiness one
  // (a separate concern — see Limitations in the docstring header).
  try {
    const r = spawnSync("docker", [
      "ps", "--filter", "status=running",
      "--format", "{{.Names}}",
    ], { timeout: timeoutMs, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    if (r.status !== 0) return false;
    const names = (r.stdout?.toString() || "").split("\n").map(s => s.trim()).filter(Boolean);
    return names.includes("prism-qdrant") && names.includes("prism-ollama");
  } catch { return false; }
}

function composeConfigValid(timeoutMs) {
  // Cheap pre-spawn validation. `docker compose ... config --quiet` parses
  // the layered YAML + merge but does NOT pull images or start services
  // (~500-800ms). Catches the "edited compose file silently broken; nothing
  // comes up; sentinel lies" class fail-loud per R12. Detach-spawn loses
  // stderr — this is the only place we'd ever surface a YAML/merge defect.
  try {
    const r = spawnSync("docker", [
      "compose",
      "-f", COMPOSE_BASE,
      "-f", COMPOSE_INTEL,
      "config", "--quiet",
    ], { cwd: REPO_ROOT, timeout: timeoutMs, windowsHide: true, stdio: "ignore" });
    return r.status === 0;
  } catch { return false; }
}

function ensureVolumeDirs() {
  for (const rel of VOLUME_DIRS) {
    try { fs.mkdirSync(path.join(REPO_ROOT, rel), { recursive: true }); }
    catch { /* if the dir can't be created, the compose-up will fail loudly later */ }
  }
}

function detachComposeUp() {
  // Detach-spawn: do NOT block SessionStart on a 30-60s compose-up.
  // The child runs to completion in the background; failures surface via
  // `docker compose logs` (and the next SessionStart will re-attempt
  // after the throttle window).
  try {
    const args = [
      "compose",
      "-f", COMPOSE_BASE,
      "-f", COMPOSE_INTEL,
      "up", "-d",
      ...COMPOSE_SERVICES,
    ];
    const child = spawn("docker", args, {
      cwd: REPO_ROOT,
      detached: true,
      windowsHide: true,
      stdio: "ignore",
    });
    child.unref();
    return true;
  } catch { return false; }
}

function main() {
  // 1. Kill switch
  if (process.env.PRISM_DOCKER_INTEL_AUTOSTART_DISABLE === "1") {
    return emit(SILENCE);
  }

  // 2. Status-aware throttle. The env override takes absolute precedence
  // (override is a knob); otherwise the per-status table picks the right
  // cadence (1h for verified-up, 5m for launched-not-verified, 1m for
  // docker-down / error / config-invalid). This is the fix for the
  // sentinel-lies-on-spawn-success class: a launched-but-broken up will
  // be re-attempted within 5 minutes and the next pass's containersUp()
  // probe records the actual state.
  const envThrottle = process.env.PRISM_DOCKER_INTEL_AUTOSTART_THROTTLE_MS;
  const sentinel = readSentinel();
  if (sentinel && sentinel.lastRunAt) {
    const lastAt = Date.parse(sentinel.lastRunAt);
    const statusThrottle = THROTTLE_BY_STATUS[sentinel.lastStatus] ?? DEFAULT_THROTTLE_MS;
    const throttleMs = envThrottle ? parseMs("PRISM_DOCKER_INTEL_AUTOSTART_THROTTLE_MS", statusThrottle) : statusThrottle;
    if (Number.isFinite(lastAt) && (Date.now() - lastAt) < throttleMs) {
      return emit(SILENCE);
    }
  }

  // 3. Docker availability probe
  const probeTimeout = parseMs("PRISM_DOCKER_INTEL_AUTOSTART_TIMEOUT_MS", DEFAULT_PROBE_TIMEOUT_MS);
  if (!dockerAvailable(probeTimeout)) {
    writeSentinel("docker-down");
    return emit(SILENCE);
  }

  // 4. Already-running short-circuit
  const containerProbeTimeout = parseMs("PRISM_DOCKER_INTEL_AUTOSTART_CONTAINER_PROBE_TIMEOUT_MS", DEFAULT_CONTAINER_PROBE_TIMEOUT_MS);
  if (containersUp(containerProbeTimeout)) {
    writeSentinel("already-running");
    if (process.env.PRISM_DOCKER_INTEL_AUTOSTART_VERBOSE === "1") {
      return emit({
        continue: true,
        suppressOutput: false,
        hookSpecificOutput: {
          hookEventName: "SessionStart",
          additionalContext: "✓ docker-intel-autostart: prism-qdrant + prism-ollama already running",
        },
      });
    }
    return emit(SILENCE);
  }

  // 5. Volume dirs
  ensureVolumeDirs();

  // 6. Pre-spawn config validation (R12 fail-loud). Detach-spawn loses
  // stderr — without this probe a malformed compose merge would silently
  // never come up. ~500-800ms cost, runs only on cold-path (post-throttle).
  const configTimeout = parseMs("PRISM_DOCKER_INTEL_AUTOSTART_CONFIG_TIMEOUT_MS", DEFAULT_COMPOSE_CONFIG_TIMEOUT_MS);
  if (!composeConfigValid(configTimeout)) {
    writeSentinel("config-invalid");
    if (process.env.PRISM_DOCKER_INTEL_AUTOSTART_VERBOSE === "1") {
      return emit({
        continue: true,
        suppressOutput: false,
        hookSpecificOutput: {
          hookEventName: "SessionStart",
          additionalContext: "⚠ docker-intel-autostart: `docker compose -f docker-compose.yml -f docker-compose.intel.yml config` failed — fix the YAML/merge before retry. Sentinel: state/.docker-intel-autostart-sentinel.json",
        },
      });
    }
    return emit(SILENCE);
  }

  // 7. Detach-spawn compose-up
  const launched = detachComposeUp();
  writeSentinel(launched ? "up" : "error");

  // 8. Verbose advisory
  if (process.env.PRISM_DOCKER_INTEL_AUTOSTART_VERBOSE === "1") {
    return emit({
      continue: true,
      suppressOutput: false,
      hookSpecificOutput: {
        hookEventName: "SessionStart",
        additionalContext: launched
          ? "⚙ docker-intel-autostart: detach-spawned `docker compose -f docker-compose.yml -f docker-compose.intel.yml up -d` (runs in background; first-run pulls ~1.5GB and can take 5-15min, warm runs 10-30s)"
          : "⚠ docker-intel-autostart: spawn failed — check `docker compose logs` and sentinel state/.docker-intel-autostart-sentinel.json",
      },
    });
  }
  return emit(SILENCE);
}

try { main(); } catch { emit(SILENCE); }
