#!/usr/bin/env node
/**
 * sync-roadmap-queue.mjs — Bridge roadmap-index.json → TASK_QUEUE.json
 *
 * Reads the structured roadmap index (532 milestones) and generates a
 * TASK_QUEUE.json + TASK_QUEUE.md compatible with task-queue.mjs claim/release
 * operations for multi-terminal coordination.
 *
 * Usage:
 *   node sync-roadmap-queue.mjs          # run sync, print summary
 *   node sync-roadmap-queue.mjs --dry    # print what would be written, no writes
 *
 * Programmatic:
 *   import { syncRoadmapToQueue } from "./sync-roadmap-queue.mjs";
 *   const result = await syncRoadmapToQueue();
 */

import { promises as fs } from "node:fs";
import path from "node:path";

// ── Paths ─────────────────────────────────────────────────────────────────────

const ROADMAP_INDEX = "H:\\prism\\mcp-server\\data\\roadmap-index.json";
const TASK_QUEUE_JSON = "H:\\prism\\state\\shared\\TASK_QUEUE.json";
const TASK_QUEUE_MD = "H:\\prism\\state\\shared\\TASK_QUEUE.md";

// ── Helpers ───────────────────────────────────────────────────────────────────

function now() {
  return new Date().toISOString();
}

async function readJson(filePath, fallback = null) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function writeJson(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
}

async function writeText(filePath, text) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, text, "utf8");
}

/**
 * Build a short description from a milestone's units list.
 * Uses the first unit title, then appends a count if there are more.
 * Capped at 200 characters.
 */
function buildDescription(milestone) {
  const units = milestone.units || [];
  if (units.length === 0) return milestone.title || "";
  const first = units[0].title || "";
  const rest = units.length > 1 ? ` (+${units.length - 1} more units)` : "";
  const full = first + rest;
  return full.length > 200 ? full.slice(0, 197) + "..." : full;
}

// ── Core transform ────────────────────────────────────────────────────────────

/**
 * Convert the roadmap-index milestones array into task-queue tasks.
 *
 * Rules:
 * - Skip milestones with status === "complete"
 * - blocked_by: dependency milestone IDs that are NOT complete
 * - status:
 *     "in_progress"  — milestone.status === "in_progress" (no claimed_by)
 *     "claimed"      — milestone.claimed_by is set
 *     "blocked"      — has unresolved blocked_by entries
 *     "available"    — not_started with zero unresolved deps
 * - priority:
 *     1 — in_progress milestones
 *     2 — available (not_started, 0 unmet deps)
 *     3 — blocked
 */
function buildTasks(milestones) {
  // Build complete-status lookup once
  const completeIds = new Set(
    milestones
      .filter((m) => m.status === "complete")
      .map((m) => m.id)
  );

  const tasks = [];

  for (const ms of milestones) {
    if (ms.status === "complete") continue;

    // Resolve blocked_by: keep only deps that are NOT complete
    const blockedBy = (ms.dependencies || []).filter(
      (dep) => !completeIds.has(dep)
    );

    // Determine task status
    let status;
    if (ms.claimed_by) {
      status = "claimed";
    } else if (ms.status === "in_progress") {
      status = "in_progress";
    } else if (blockedBy.length > 0) {
      status = "blocked";
    } else {
      status = "available";
    }

    // Priority
    let priority;
    if (status === "in_progress" || status === "claimed") {
      priority = 1;
    } else if (status === "available") {
      priority = 2;
    } else {
      priority = 3; // blocked
    }

    const task = {
      id: ms.id,
      title: ms.title || ms.id,
      status,
      priority,
      blocked_by: blockedBy,
      preferred_family: "any",
      claim_policy: "open",
      description: buildDescription(ms),
      // Claim fields — preserved from roadmap if set, else null
      claimed_by: ms.claimed_by || null,
      claimed_at: ms.claimed_at || null,
      heartbeat_at: null,
      completed_at: null,
      completed_by: null,
      // Metadata
      track: ms.track || null,
      total_units: ms.total_units || (ms.units || []).length,
      completed_units: ms.completed_units || 0,
      sessions: ms.sessions || null,
      envelope_path: ms.envelope_path || null,
    };

    tasks.push(task);
  }

  return tasks;
}

// ── Markdown writer ───────────────────────────────────────────────────────────

function buildMarkdown(queue) {
  const ts = queue.updated_at || now();
  const lines = [
    "# Task Queue",
    "",
    `Updated: ${ts}`,
    `Source: ${queue.source}`,
    "",
  ];

  const groups = {
    in_progress: [],
    claimed: [],
    available: [],
    blocked: [],
  };

  for (const t of queue.tasks) {
    const bucket = groups[t.status];
    if (bucket) bucket.push(t);
  }

  const icons = {
    in_progress: "[IN PROGRESS]",
    claimed: "[CLAIMED]",
    available: "[AVAILABLE]",
    blocked: "[BLOCKED]",
  };

  for (const [status, bucket] of Object.entries(groups)) {
    if (bucket.length === 0) continue;
    const sorted = [...bucket].sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));
    lines.push(`## ${icons[status]} ${status.toUpperCase()} (${bucket.length})`);
    lines.push("");
    for (const t of sorted) {
      const claimNote = t.claimed_by ? ` -- claimed by ${t.claimed_by}` : "";
      const depNote =
        t.blocked_by && t.blocked_by.length > 0
          ? ` [needs: ${t.blocked_by.join(", ")}]`
          : "";
      const track = t.track ? `${t.track} | ` : "";
      lines.push(
        `- **${t.id}** (${track}any, open, P${t.priority}): ${t.title}${claimNote}${depNote}`
      );
      if (t.description) {
        lines.push(`  ${t.description}`);
      }
    }
    lines.push("");
  }

  // Footer summary
  const total = queue.tasks.length;
  const ip = groups.in_progress.length;
  const cl = groups.claimed.length;
  const av = groups.available.length;
  const bl = groups.blocked.length;
  lines.push("---");
  lines.push(
    `Total: ${total} | In-Progress: ${ip} | Claimed: ${cl} | Available: ${av} | Blocked: ${bl}`
  );
  lines.push("");

  return lines.join("\n");
}

// ── Main sync function ────────────────────────────────────────────────────────

/**
 * syncRoadmapToQueue() — reads roadmap-index.json, writes TASK_QUEUE.json +
 * TASK_QUEUE.md, returns a summary object.
 *
 * @param {{ dry?: boolean }} [opts]
 * @returns {Promise<{ok: boolean, total: number, by_status: Record<string,number>, written: string[]}>}
 */
export async function syncRoadmapToQueue(opts = {}) {
  const dry = opts.dry === true;

  // 1. Read roadmap index
  const index = await readJson(ROADMAP_INDEX);
  if (!index || !Array.isArray(index.milestones)) {
    throw new Error(`Failed to read roadmap-index.json at ${ROADMAP_INDEX}`);
  }

  const milestones = index.milestones;

  // 2. Transform milestones → tasks (skip complete)
  const tasks = buildTasks(milestones);

  // 3. Build queue document
  const ts = now();
  const queue = {
    version: 1,
    updated_at: ts,
    updated: ts,
    source: `roadmap-index.json (${milestones.length} milestones)`,
    roadmap_version: index.version || "unknown",
    total: tasks.length,
    tasks,
  };

  // 4. Summary counts
  const by_status = {};
  for (const t of tasks) {
    by_status[t.status] = (by_status[t.status] || 0) + 1;
  }

  const written = [];

  if (!dry) {
    // 5. Write TASK_QUEUE.json
    await writeJson(TASK_QUEUE_JSON, queue);
    written.push(TASK_QUEUE_JSON);

    // 6. Write TASK_QUEUE.md
    const md = buildMarkdown(queue);
    await writeText(TASK_QUEUE_MD, md);
    written.push(TASK_QUEUE_MD);
  }

  return {
    ok: true,
    total_milestones: milestones.length,
    skipped_complete: milestones.length - tasks.length,
    total: tasks.length,
    by_status,
    written,
    dry,
  };
}

// ── Standalone entry point ────────────────────────────────────────────────────

// Use fileURLToPath for cross-platform Windows/Unix compatibility
import { fileURLToPath } from "node:url";

function isDirectInvocation() {
  if (!process.argv[1]) return false;
  try {
    const scriptFile = fileURLToPath(import.meta.url);
    // Normalise both to lowercase + forward slashes to handle Windows drive letter case
    const normalise = (p) => path.resolve(p).replace(/\\/g, "/").toLowerCase();
    return normalise(process.argv[1]) === normalise(scriptFile);
  } catch {
    // Fallback: basename comparison
    return path.basename(process.argv[1]) === "sync-roadmap-queue.mjs";
  }
}

const isDirect = isDirectInvocation();

if (isDirect) {
  const dry = process.argv.includes("--dry");

  syncRoadmapToQueue({ dry })
    .then((result) => {
      // Print summary to stdout
      const { total, by_status, skipped_complete, written, dry: wasDry } = result;
      console.log("\n=== sync-roadmap-queue ===");
      console.log(`Roadmap milestones:  ${result.total_milestones}`);
      console.log(`Skipped (complete):  ${skipped_complete}`);
      console.log(`Tasks written:       ${total}`);
      console.log("");
      console.log("By status:");
      for (const [s, n] of Object.entries(by_status).sort((a, b) => a[0].localeCompare(b[0]))) {
        console.log(`  ${s.padEnd(14)} ${n}`);
      }
      if (wasDry) {
        console.log("\n[DRY RUN] No files written.");
      } else {
        console.log("\nFiles written:");
        for (const f of written) console.log(`  ${f}`);
      }
      console.log("");
    })
    .catch((err) => {
      console.error("sync-roadmap-queue FAILED:", err.message);
      process.exit(1);
    });
}
