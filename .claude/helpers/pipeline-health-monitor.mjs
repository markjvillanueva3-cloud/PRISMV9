#!/usr/bin/env node
/**
 * pipeline-health-monitor.mjs — SessionStart hook for orchestrator health
 *
 * Responsibilities:
 * 1. Checks orchestrator health (task queue, agent coordination)
 * 2. Reports dead-letter queue depth
 * 3. Warns on stale locks (older than 30 minutes)
 * 4. Reports overall pipeline health status
 *
 * Usage:
 *   node pipeline-health-monitor.mjs          # standalone health check
 *   node pipeline-health-monitor.mjs --json   # JSON output for scripts
 *   echo '{}' | node pipeline-health-monitor.mjs  # hook mode
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { CACHE_DIR, ensureCacheDir } from "./hook-cache.mjs";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const STATE_DIR = path.join(CACHE_DIR);
const LOCK_DIR = path.join(CACHE_DIR, "locks");
const DLQ_FILE = path.join(CACHE_DIR, "dead-letter-queue.json");
const HEALTH_REPORT = path.join(CACHE_DIR, "pipeline-health.json");

// Time thresholds
const STALE_LOCK_MS = 30 * 60 * 1000; // 30 minutes
const WARN_DLQ_DEPTH = 5;
const CRITICAL_DLQ_DEPTH = 20;

/**
 * Get list of lock files with metadata.
 */
async function getLocks() {
  try {
    await fs.mkdir(LOCK_DIR, { recursive: true });
    const files = await fs.readdir(LOCK_DIR);
    const locks = [];

    for (const file of files) {
      if (!file.endsWith(".lock")) continue;

      const lockPath = path.join(LOCK_DIR, file);
      try {
        const stat = await fs.stat(lockPath);
        const content = await fs.readFile(lockPath, "utf8").catch(() => "");
        const age = Date.now() - stat.mtimeMs;

        locks.push({
          name: file.replace(".lock", ""),
          path: lockPath,
          age,
          ageMinutes: Math.round(age / 60000),
          stale: age > STALE_LOCK_MS,
          holder: content.trim().split("\n")[0] || "unknown",
        });
      } catch {
        // Lock file disappeared — race condition, ignore
      }
    }

    return locks;
  } catch {
    return [];
  }
}

/**
 * Get dead-letter queue status.
 */
async function getDLQStatus() {
  try {
    const raw = await fs.readFile(DLQ_FILE, "utf8");
    const dlq = JSON.parse(raw);
    const items = Array.isArray(dlq) ? dlq : (dlq.items || []);

    return {
      depth: items.length,
      oldest: items.length > 0 ? items[0] : null,
      newest: items.length > 0 ? items[items.length - 1] : null,
      severity: items.length >= CRITICAL_DLQ_DEPTH
        ? "critical"
        : items.length >= WARN_DLQ_DEPTH
          ? "warning"
          : "ok",
    };
  } catch {
    return {
      depth: 0,
      oldest: null,
      newest: null,
      severity: "ok",
    };
  }
}

/**
 * Check task queue health.
 */
async function getTaskQueueStatus() {
  const queueFile = path.join(CACHE_DIR, "task-queue.json");

  try {
    const raw = await fs.readFile(queueFile, "utf8");
    const queue = JSON.parse(raw);

    const pending = (queue.tasks || []).filter((t) => t.status === "pending");
    const inProgress = (queue.tasks || []).filter((t) => t.status === "in_progress");
    const stuck = inProgress.filter((t) => {
      const started = t.started_at || t.updated_at || 0;
      return Date.now() - started > STALE_LOCK_MS;
    });

    return {
      total: (queue.tasks || []).length,
      pending: pending.length,
      inProgress: inProgress.length,
      stuck: stuck.length,
      stuckTasks: stuck.map((t) => ({
        id: t.id,
        title: t.title,
        ageMinutes: Math.round((Date.now() - (t.started_at || t.updated_at || Date.now())) / 60000),
      })),
    };
  } catch {
    return {
      total: 0,
      pending: 0,
      inProgress: 0,
      stuck: 0,
      stuckTasks: [],
    };
  }
}

/**
 * Check agent coordination status.
 */
async function getAgentStatus() {
  const agentsFile = path.join(CACHE_DIR, "agent-registry.json");

  try {
    const raw = await fs.readFile(agentsFile, "utf8");
    const registry = JSON.parse(raw);
    const agents = registry.agents || [];

    const now = Date.now();
    const active = agents.filter((a) => now - (a.last_seen || 0) < 5 * 60 * 1000);
    const stale = agents.filter((a) => {
      const lastSeen = a.last_seen || 0;
      return lastSeen > 0 && now - lastSeen > 30 * 60 * 1000;
    });

    return {
      total: agents.length,
      active: active.length,
      stale: stale.length,
      staleAgents: stale.map((a) => ({
        id: a.id,
        family: a.family,
        lastSeenMinutes: Math.round((now - (a.last_seen || 0)) / 60000),
      })),
    };
  } catch {
    return {
      total: 0,
      active: 0,
      stale: 0,
      staleAgents: [],
    };
  }
}

/**
 * Clean up stale locks.
 */
async function cleanStaleLocks(locks) {
  const cleaned = [];

  for (const lock of locks.filter((l) => l.stale)) {
    try {
      await fs.unlink(lock.path);
      cleaned.push(lock.name);
    } catch {
      // Failed to clean — might be in use
    }
  }

  return cleaned;
}

/**
 * Generate health report.
 */
async function generateHealthReport() {
  const [locks, dlq, taskQueue, agents] = await Promise.all([
    getLocks(),
    getDLQStatus(),
    getTaskQueueStatus(),
    getAgentStatus(),
  ]);

  const staleLocks = locks.filter((l) => l.stale);

  // Calculate overall health
  let health = "healthy";
  const issues = [];

  if (dlq.severity === "critical") {
    health = "critical";
    issues.push(`Dead-letter queue depth: ${dlq.depth} (critical threshold: ${CRITICAL_DLQ_DEPTH})`);
  } else if (dlq.severity === "warning") {
    health = health === "healthy" ? "warning" : health;
    issues.push(`Dead-letter queue depth: ${dlq.depth} (warning threshold: ${WARN_DLQ_DEPTH})`);
  }

  if (staleLocks.length > 0) {
    health = health === "healthy" ? "warning" : health;
    issues.push(`Stale locks: ${staleLocks.map((l) => `${l.name} (${l.ageMinutes}m)`).join(", ")}`);
  }

  if (taskQueue.stuck > 0) {
    health = health === "healthy" ? "warning" : health;
    issues.push(`Stuck tasks: ${taskQueue.stuckTasks.map((t) => `${t.id} (${t.ageMinutes}m)`).join(", ")}`);
  }

  if (agents.stale > 0) {
    // Stale agents are informational, not critical
    issues.push(`Stale agents: ${agents.stale}`);
  }

  const report = {
    timestamp: new Date().toISOString(),
    health,
    issues,
    locks: {
      total: locks.length,
      stale: staleLocks.length,
      staleLocks: staleLocks.map((l) => ({ name: l.name, ageMinutes: l.ageMinutes, holder: l.holder })),
    },
    dlq,
    taskQueue,
    agents,
  };

  // Save report
  await ensureCacheDir();
  await fs.writeFile(HEALTH_REPORT, JSON.stringify(report, null, 2), "utf8");

  return report;
}

/**
 * Read stdin for hook mode.
 */
function readStdin() {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) {
      resolve("");
      return;
    }
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (c) => { data += c; });
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", () => resolve(""));
    setTimeout(() => resolve(data), 150);
  });
}

/**
 * Format report for display.
 */
function formatReport(report) {
  const lines = [];
  const icon = report.health === "healthy" ? "OK" : report.health === "warning" ? "WARN" : "CRIT";

  lines.push(`[pipeline-health] Status: ${icon}`);

  if (report.issues.length > 0) {
    for (const issue of report.issues) {
      lines.push(`  - ${issue}`);
    }
  }

  // Summary line
  const parts = [];
  if (report.locks.total > 0) parts.push(`${report.locks.total} locks`);
  if (report.dlq.depth > 0) parts.push(`DLQ: ${report.dlq.depth}`);
  if (report.taskQueue.pending > 0) parts.push(`${report.taskQueue.pending} pending tasks`);
  if (report.agents.active > 0) parts.push(`${report.agents.active} active agents`);

  if (parts.length > 0) {
    lines.push(`  Summary: ${parts.join(", ")}`);
  }

  return lines.join("\n");
}

/**
 * Main entry point.
 */
async function main() {
  const args = process.argv.slice(2);

  // Generate health report
  const report = await generateHealthReport();

  // CLI mode
  if (args.includes("--json")) {
    console.log(JSON.stringify(report, null, 2));
    process.exit(report.health === "healthy" ? 0 : 1);
    return;
  }

  if (args.includes("--clean")) {
    const locks = await getLocks();
    const cleaned = await cleanStaleLocks(locks);
    console.log(JSON.stringify({ cleaned }));
    return;
  }

  // Standalone mode: print formatted report
  if (process.stdin.isTTY && args.length === 0) {
    console.log(formatReport(report));
    process.exit(report.health === "healthy" ? 0 : 1);
    return;
  }

  // Hook mode: drain stdin and provide context
  await readStdin();

  // Auto-clean stale locks
  const locks = await getLocks();
  const cleaned = await cleanStaleLocks(locks);

  // Build response
  if (report.health !== "healthy" || cleaned.length > 0) {
    const context = [];

    if (cleaned.length > 0) {
      context.push(`Cleaned ${cleaned.length} stale lock(s): ${cleaned.join(", ")}`);
    }

    if (report.issues.length > 0) {
      context.push(`Pipeline issues: ${report.issues.join("; ")}`);
    }

    process.stdout.write(JSON.stringify({
      additionalContext: `[pipeline-health] ${context.join(". ")}`,
    }));
  } else {
    process.stdout.write(JSON.stringify({ continue: true }));
  }
}

main().catch((err) => {
  // Silent failure — never block session start on health check errors
  process.stderr.write(`[pipeline-health-monitor] Error: ${err.message}\n`);
  process.stdout.write(JSON.stringify({ continue: true }));
});
