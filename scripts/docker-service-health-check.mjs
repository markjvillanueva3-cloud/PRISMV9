#!/usr/bin/env node
/**
 * docker-service-health-check.mjs — detect downed prism-* Docker services.
 *
 * Closes a recurring fleet-hygiene gap (golf): the local compute stack's named
 * services (qdrant/postgres/prometheus/grafana) can silently go DOWN with no
 * alert — Qdrant alone has done it 3× (2026-05-24, -05-28, -06-08), each time
 * degrading semantic vector search (the CAG-router `qdrant://...` substrate /
 * a PSN leg) until a human noticed. `fleet-task-health-watch.mjs` audits
 * SCHEDULED TASKS, not Docker containers; nothing watched the app containers.
 *
 * It also handles the exact failure mode seen 2026-06-08: a name-conflict
 * leaves the container RENAMED to `<hexid>_<service>` (Docker's collision
 * rename) stuck in "Created" state, so `docker start prism-qdrant` fails with
 * "No such container" — you must start it by the REAL renamed name.
 *
 * Usage:
 *   node scripts/docker-service-health-check.mjs            # report (exit 0 healthy / 1 degraded)
 *   node scripts/docker-service-health-check.mjs --json
 *   node scripts/docker-service-health-check.mjs --fix      # `docker start` each downed service by its real name
 *
 * Pure core (`parseDockerRows`, `classifyServices`, `summarize`) is exported for
 * the hermetic suite — no Docker needed to test the classification logic.
 */
import { execFileSync } from "node:child_process";
import path from "node:path";

// The always-on local-compute stack (the goal's docker/qdrant surface). Override
// via PRISM_DOCKER_EXPECTED_SERVICES="a,b,c".
export const EXPECTED_SERVICES = (process.env.PRISM_DOCKER_EXPECTED_SERVICES
  ? process.env.PRISM_DOCKER_EXPECTED_SERVICES.split(",").map((s) => s.trim()).filter(Boolean)
  : ["prism-qdrant", "prism-postgres", "prism-prometheus", "prism-grafana"]);

/**
 * Parse `docker ps -a --format "{{.Names}}\t{{.State}}\t{{.Status}}"` output
 * into rows. Tolerates blank lines + extra tabs in the status field.
 */
export function parseDockerRows(stdout) {
  return String(stdout || "")
    .trim()
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const parts = l.split("\t");
      return { name: parts[0] || "", state: (parts[1] || "").toLowerCase(), status: parts.slice(2).join("\t") };
    });
}

/**
 * Pure classifier. For each expected service, find its row by exact name OR the
 * collision-rename suffix form `<id>_<service>`, and decide healthy vs the fix.
 * `running` is keyed off State==="running" (authoritative) with a Status "Up…"
 * fallback. A downed-but-present service is fixed by `docker start <realName>`;
 * a genuinely-absent one needs the launcher (volume data persists regardless).
 */
export function classifyServices(rows, expected = EXPECTED_SERVICES) {
  return expected.map((svc) => {
    const suffix = "_" + svc;
    const match = rows.find((r) => r.name === svc || r.name.endsWith(suffix));
    if (!match) {
      return {
        service: svc, state: "absent", healthy: false, realName: null, renamed: false,
        fix: `node mcp-server/scripts/ollama-docker-launcher.mjs --services=${svc.replace(/^prism-/, "")} --skip-pull`,
      };
    }
    const running = match.state === "running" || /^up\b/i.test(match.status);
    return {
      service: svc,
      state: running ? "running" : (match.state || "stopped"),
      healthy: running,
      realName: match.name,
      renamed: match.name !== svc,
      fix: running ? null : `docker start ${match.name}`,
    };
  });
}

export function summarize(classified) {
  const down = classified.filter((c) => !c.healthy);
  return { healthy: down.length === 0, total: classified.length, downCount: down.length, down, all: classified };
}

// ── IO shell (only runs as a CLI) ──────────────────────────────────────────
function dockerPsAll() {
  const out = execFileSync("docker", ["ps", "-a", "--format", "{{.Names}}\t{{.State}}\t{{.Status}}"],
    { encoding: "utf8", timeout: 15000 });
  return parseDockerRows(out);
}

function dockerStart(realName) {
  try {
    execFileSync("docker", ["start", realName], { encoding: "utf8", timeout: 30000 });
    return { ok: true };
  } catch (e) { return { ok: false, error: String((e && e.message) || e).slice(0, 160) }; }
}

function main() {
  const json = process.argv.includes("--json");
  const fix = process.argv.includes("--fix");
  let rows;
  try { rows = dockerPsAll(); }
  catch (e) {
    const msg = `docker unavailable: ${String((e && e.message) || e).slice(0, 120)}`;
    if (json) process.stdout.write(JSON.stringify({ ok: false, error: msg }));
    else process.stdout.write(`[docker-health] ${msg}\n`);
    process.exit(2);
  }
  const result = summarize(classifyServices(rows));

  if (fix) {
    for (const d of result.down) {
      if (d.realName) {
        const r = dockerStart(d.realName);
        d.fixAttempted = true; d.fixOk = r.ok; if (!r.ok) d.fixError = r.error;
      } else { d.fixAttempted = false; } // absent → needs launcher, not a start
    }
  }

  if (json) { process.stdout.write(JSON.stringify(result)); process.exit(result.healthy ? 0 : 1); }

  process.stdout.write(`[docker-health] ${result.healthy ? "✓ all services up" : `⚠ ${result.downCount}/${result.total} DOWN`}\n`);
  for (const c of result.all) {
    const tag = c.healthy ? "✓" : "✗";
    let line = `  ${tag} ${c.service.padEnd(18)} ${c.state}${c.renamed ? ` (renamed: ${c.realName})` : ""}`;
    if (!c.healthy) {
      if (c.fixAttempted) line += c.fixOk ? "  → started ✓" : `  → start FAILED: ${c.fixError}`;
      else if (c.fix) line += `  → fix: ${c.fix}`;
    }
    process.stdout.write(line + "\n");
  }
  process.exit(result.healthy ? 0 : 1);
}

// Run main ONLY when invoked directly — compare against the entry point's
// basename (process.argv[1]), NOT this module's own name (which is always a
// match and would fire on import, killing a test run via process.exit).
if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) main();
