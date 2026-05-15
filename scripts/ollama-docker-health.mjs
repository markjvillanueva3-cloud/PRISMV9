#!/usr/bin/env node
// tier: T3
/**
 * ollama-docker-health.mjs — single-shot health probe for Ollama + Docker services
 *
 * Surfaces a tight one-line / JSON status of:
 *   - Ollama daemon (port 11434, model list)
 *   - Docker Desktop / engine
 *   - Postgres (postgres-prism)
 *   - Qdrant (qdrant)
 *   - Prometheus (prometheus)
 *
 * Called by:
 *   - /checkin §6e   — surface in §Report (--text default)
 *   - /forge-audit   — gate (--require ollama,qdrant)
 *   - /rgs           — pre-flight check (--text)
 *   - Stop hook      — telemetry record (--json)
 *
 * Fail-soft: every probe is bounded; "down" is a status, never a crash.
 *
 * Usage:
 *   node H:/prism/scripts/ollama-docker-health.mjs                  # --text default
 *   node H:/prism/scripts/ollama-docker-health.mjs --json
 *   node H:/prism/scripts/ollama-docker-health.mjs --require ollama,qdrant
 *
 * Exit codes:
 *   0  — probe completed (regardless of service health)
 *   1  — --require list had a service that was DOWN (gate use)
 *   2  — internal error (rare)
 */
import { spawnSync } from "node:child_process";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const PROBE_TIMEOUT_MS = 4000;
const FAST_PROBE_TIMEOUT_MS = 2500;
const DOCKER_TIMEOUT_MS = 4000;
const POSTGRES_TIMEOUT_MS = 3000;
const ERROR_DETAIL_MAX_CHARS = 120;
const STDERR_DETAIL_MAX_CHARS = 100;

const args = process.argv.slice(2);
const wantJson = args.includes("--json");
const wantText = !wantJson;
const requireIdx = args.indexOf("--require");
const requireList =
  requireIdx >= 0 && args[requireIdx + 1]
    ? args[requireIdx + 1].split(",").map(s => s.trim().toLowerCase()).filter(Boolean)
    : [];

// Use curl subprocess. node's fetch (undici) and even http.get suffer from
// connection-pool starvation on Windows when multiple probes fire concurrently
// against localhost — observed empirically: a single http.get returns in 152ms
// while 6 parallel probes all time out at 4s. curl per call sidesteps this.
function probeUrl(url, timeoutMs = PROBE_TIMEOUT_MS) {
  const timeoutSec = Math.max(1, Math.round(timeoutMs / 1000));
  const r = spawnSync(
    "curl",
    ["-fsS", "-m", String(timeoutSec), url],
    { encoding: "utf8", timeout: timeoutMs + 500 }
  );
  if (r.error) return { ok: false, error: String(r.error.message || r.error).slice(0, ERROR_DETAIL_MAX_CHARS) };
  if (r.status !== 0) return { ok: false, error: (r.stderr || `exit ${r.status}`).slice(0, ERROR_DETAIL_MAX_CHARS) };
  return { ok: true, body: r.stdout };
}

async function probeOllama() {
  const r = await probeUrl(`${OLLAMA_URL}/api/tags`);
  if (!r.ok) return { up: false, models: [], detail: r.error || `http ${r.status}` };
  let models = [];
  try {
    const j = JSON.parse(r.body);
    if (Array.isArray(j.models)) models = j.models.map(m => m.name || m.model).filter(Boolean);
  } catch { /* keep models empty */ }
  return { up: true, models, count: models.length };
}

async function probeOllamaPs() {
  // Which models are CURRENTLY LOADED in VRAM (warm)?
  const r = await probeUrl(`${OLLAMA_URL}/api/ps`);
  if (!r.ok) return { warm: [], count: 0 };
  try {
    const j = JSON.parse(r.body);
    if (Array.isArray(j.models)) {
      const warm = j.models.map(m => m.name || m.model).filter(Boolean);
      return { warm, count: warm.length };
    }
  } catch { /* keep empty */ }
  return { warm: [], count: 0 };
}

function probeDocker() {
  // `docker ps -q` is the cheapest test that the engine is responsive.
  const r = spawnSync("docker", ["ps", "-q"], { encoding: "utf8", timeout: DOCKER_TIMEOUT_MS });
  if (r.error || r.status !== 0) {
    return { up: false, detail: r.error?.message || (r.stderr || "").slice(0, STDERR_DETAIL_MAX_CHARS) };
  }
  const ids = r.stdout.split(/\r?\n/).filter(Boolean);
  return { up: true, containerCount: ids.length };
}

async function probeQdrant() {
  // Default qdrant port 6333
  const r = await probeUrl("http://127.0.0.1:6333/", FAST_PROBE_TIMEOUT_MS);
  return { up: r.ok };
}

async function probePostgres() {
  // pg-isready isn't always on PATH on Windows; fall back to docker exec
  const r = spawnSync(
    "docker",
    ["exec", "postgres-prism", "pg_isready", "-U", "postgres"],
    { encoding: "utf8", timeout: POSTGRES_TIMEOUT_MS }
  );
  if (r.error || r.status !== 0) return { up: false };
  return { up: true };
}

async function probePrometheus() {
  // Default port 9090
  const r = await probeUrl("http://127.0.0.1:9090/-/ready", FAST_PROBE_TIMEOUT_MS);
  return { up: r.ok };
}

(async () => {
  // Probe everything in parallel — fail-soft per probe
  const [ollama, ps, docker, qdrant, postgres, prometheus] = await Promise.all([
    probeOllama(),
    probeOllamaPs(),
    probeDocker(),
    probeQdrant(),
    probePostgres().catch(() => ({ up: false })),
    probePrometheus(),
  ]);

  const report = {
    schemaVersion: 1,
    probedAt: new Date().toISOString(),
    ollama: { ...ollama, warmModels: ps.warm, warmCount: ps.count },
    docker,
    services: { qdrant, postgres, prometheus },
  };

  if (wantJson) {
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  } else {
    const ok = "✓";
    const x = "✗";
    const oll = report.ollama.up
      ? `${ok} Ollama ${report.ollama.count} models · ${report.ollama.warmCount} warm`
      : `${x} Ollama ${report.ollama.detail || "down"}`;
    const dk = report.docker.up
      ? `${ok} Docker ${report.docker.containerCount} ctr`
      : `${x} Docker ${report.docker.detail || "down"}`;
    const qd = report.services.qdrant.up ? `${ok} Qdrant` : `${x} Qdrant`;
    const pg = report.services.postgres.up ? `${ok} Postgres` : `${x} Postgres`;
    const pr = report.services.prometheus.up ? `${ok} Prometheus` : `${x} Prometheus`;
    process.stdout.write(`local-compute: ${oll} · ${dk} · ${qd} · ${pg} · ${pr}\n`);
    if (report.ollama.up && report.ollama.warmCount === 0) {
      process.stdout.write(
        "  hint: no models warm in VRAM — first hook call will cold-start (3-5s latency)\n"
      );
    }
  }

  // --require gate: exit 1 if any required service is down
  if (requireList.length > 0) {
    const states = {
      ollama: report.ollama.up,
      docker: report.docker.up,
      qdrant: report.services.qdrant.up,
      postgres: report.services.postgres.up,
      prometheus: report.services.prometheus.up,
    };
    const missing = requireList.filter(name => !states[name]);
    if (missing.length > 0) {
      process.stderr.write(`REQUIRE_FAIL: ${missing.join(", ")}\n`);
      process.exit(1);
    }
  }

  process.exit(0);
})().catch(err => {
  process.stderr.write(`ollama-docker-health: ${err && err.message || err}\n`);
  process.exit(2);
});
