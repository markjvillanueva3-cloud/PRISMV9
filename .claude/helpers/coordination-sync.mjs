/**
 * PreCompact hook: coordination-sync.mjs
 *
 * Syncs the active agent session state to the shared coordination surfaces before every
 * compact. Updates AGENT_CHAT, AGENT_WORKBOARD, AGENT_COORDINATION_STATUS (via
 * agent-coordination.mjs post) and ROADMAP_COLLABORATION_STATE (via
 * roadmap-sync.mjs sync) so that both Claude and Codex always see current state.
 *
 * Hook protocol: reads stdin (ignored), writes {"continue": true} to stdout.
 * Must never block compaction — all errors are caught and logged to stderr.
 */

import { promises as fs } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import process from "node:process";
import { inferAgentIdentity } from "./agent-identity.mjs";

const execFileAsync = promisify(execFile);
const NODE_EXECUTABLE = process.execPath || "node";

// ── Paths ────────────────────────────────────────────────────────────────────

const PATHS = {
  handoff: "H:\\prism\\state\\HANDOFF.md",
  editCounter: "H:\\prism\\state\\session-edit-counter.json",
  mcpEditCounter: "H:\\prism\\mcp-server\\state\\session-edit-counter.json",
  sviCompact: "H:\\prism\\state\\shared\\SVI-compact.md",
  agentCoordination: "H:\\prism\\.claude\\helpers\\agent-coordination.mjs",
  roadmapSync: "H:\\prism\\.claude\\helpers\\roadmap-sync.mjs",
  taskQueue: "H:\\prism\\.claude\\helpers\\task-queue.mjs",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const parsed = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token.startsWith("--")) {
      const key = token.slice(2);
      const next = argv[index + 1];
      if (!next || next.startsWith("--")) {
        parsed[key] = true;
        continue;
      }
      parsed[key] = next;
      index += 1;
      continue;
    }
    parsed._.push(token);
  }
  return parsed;
}

async function readFileSafe(filePath) {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return "";
  }
}

async function readJsonSafe(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/**
 * Extract a markdown section between `## HEADING` and the next `##` or EOF.
 * Returns the trimmed body text (without the heading line itself).
 */
function extractSection(markdown, heading) {
  const pattern = new RegExp(
    `^##\\s+${heading}\\s*$([\\s\\S]*?)(?=^##\\s|$(?!\\s))`,
    "m",
  );
  const match = markdown.match(pattern);
  if (!match) {
    return "";
  }
  return match[1].trim();
}

/**
 * Truncate a string to maxLen characters, appending "..." if truncated.
 */
function truncate(value, maxLen) {
  if (value.length <= maxLen) {
    return value;
  }
  return `${value.slice(0, maxLen - 3)}...`;
}

// ── Data Extraction ──────────────────────────────────────────────────────────

async function readHandoff() {
  const content = await readFileSafe(PATHS.handoff);
  if (!content) {
    return { state: "unknown", resume: "unknown" };
  }
  const state = extractSection(content, "STATE") || "unknown";
  const resume = extractSection(content, "RESUME") || "unknown";
  return { state, resume };
}

async function readEditCounter() {
  // Try mcp-server path first (more commonly updated), then root state
  let data = await readJsonSafe(PATHS.mcpEditCounter, null);
  if (!data) {
    data = await readJsonSafe(PATHS.editCounter, null);
  }
  if (!data) {
    return {
      enginesWritten: [],
      testFilesWritten: [],
      editCount: 0,
      reviewNote: "",
    };
  }
  return {
    enginesWritten: Array.isArray(data.engines_written) ? data.engines_written : [],
    testFilesWritten: Array.isArray(data.test_files_written) ? data.test_files_written : [],
    editCount: typeof data.edit_count === "number" ? data.edit_count : 0,
    reviewNote: typeof data.review_note === "string" ? data.review_note : "",
  };
}

async function readPsi() {
  const content = await readFileSafe(PATHS.sviCompact);
  if (!content) {
    return "N/A";
  }
  // Look in the first 5 lines for the Psi percentage
  const lines = content.split(/\r?\n/).slice(0, 5);
  for (const line of lines) {
    const match = line.match(/\*?\*?Reachability\s*\(?.*?\)?\*?\*?[:\s]+(\d+(?:\.\d+)?)%/i);
    if (match) {
      return match[1];
    }
  }
  // Fallback: try any percentage on the first few lines
  for (const line of lines) {
    const match = line.match(/(\d+(?:\.\d+)?)%/);
    if (match) {
      return match[1];
    }
  }
  return "N/A";
}

// ── Identity ─────────────────────────────────────────────────────────────────

function inferIdentity(parsedArgs) {
  return inferAgentIdentity({
    agent: typeof parsedArgs.agent === "string" ? parsedArgs.agent : "",
    family: typeof parsedArgs["agent-family"] === "string" ? parsedArgs["agent-family"] : "",
    instance: typeof parsedArgs["agent-instance"] === "string" ? parsedArgs["agent-instance"] : "",
  });
}

// ── Message Construction ─────────────────────────────────────────────────────

function buildSummaryMessage(editCounter, psi, handoff, taskSync) {
  const engineCount = editCounter.enginesWritten.length;
  const testCount = editCounter.testFilesWritten.length;
  const parts = [
    `Pre-compact sync: ${editCounter.editCount} edits`,
    `${engineCount} engine${engineCount !== 1 ? "s" : ""}`,
    `${testCount} test file${testCount !== 1 ? "s" : ""}`,
  ];
  if (taskSync.active_refreshed_count > 0) {
    parts.push(`${taskSync.active_refreshed_count} task heartbeat${taskSync.active_refreshed_count !== 1 ? "s" : ""}`);
  }
  if (taskSync.reconciled_count > 0) {
    parts.push(`${taskSync.reconciled_count} queue task${taskSync.reconciled_count !== 1 ? "s" : ""} completed`);
  }
  const summary = parts.join(", ");
  const stateSnippet = truncate(handoff.state.replace(/\r?\n/g, " "), 120);
  const resumeSnippet = truncate(handoff.resume.replace(/\r?\n/g, " "), 120);
  return `${summary} | Psi=${psi}% | State: ${stateSnippet} | Resume: ${resumeSnippet}`;
}

function buildDoneItems(editCounter, taskSync) {
  const items = [];
  if (taskSync.reconciled_records.length > 0) {
    items.push(...taskSync.reconciled_records.map((task) => task.id));
  }
  if (editCounter.enginesWritten.length > 0) {
    items.push(...editCounter.enginesWritten);
  }
  return items;
}

function buildRoadmapDone(editCounter, taskSync) {
  const doneParts = [];

  if (taskSync.reconciled_records.length > 0) {
    doneParts.push(
      `Tasks completed: ${truncate(taskSync.reconciled_records.map((task) => `${task.id} ${task.title}`).join("; "), 240)}`,
    );
  }

  if (editCounter.enginesWritten.length > 0) {
    doneParts.push(`Files edited: ${truncate(editCounter.enginesWritten.join(", "), 180)}`);
  }

  return doneParts.join(" || ");
}

// ── Subprocess Execution ─────────────────────────────────────────────────────

async function runAgentCoordination(identity, editCounter, handoff, message, taskSync) {
  const stateSnippet = truncate(handoff.state.replace(/\r?\n/g, " "), 200);
  const resumeSnippet = truncate(handoff.resume.replace(/\r?\n/g, " "), 200);
  const doneItems = buildDoneItems(editCounter, taskSync);

  const args = [
    PATHS.agentCoordination,
    "post",
    "--agent", identity.family,
    "--agent-instance", identity.instance,
    "--status", "compacting",
    "--current", stateSnippet || "unknown",
    "--next", resumeSnippet || "unknown",
    "--message", message,
  ];

  if (doneItems.length > 0) {
    args.push("--done", doneItems.join(", "));
  }

  return execFileAsync(NODE_EXECUTABLE, args, {
    timeout: 5000,
    windowsHide: true,
    env: { ...process.env },
  });
}

async function runRoadmapSync(identity, editCounter, handoff, taskSync) {
  const stateSnippet = truncate(handoff.state.replace(/\r?\n/g, " "), 200);
  const resumeSnippet = truncate(handoff.resume.replace(/\r?\n/g, " "), 200);
  const enginesDone = editCounter.enginesWritten.join(", ");
  const completedTaskIds = taskSync.reconciled_records.map((task) => task.id);
  const activeTaskIds = taskSync.active_refreshed.map((task) => task.id);
  const doneText = buildRoadmapDone(editCounter, taskSync);

  const noteText = [
    `Pre-compact: ${editCounter.editCount} edits`,
    completedTaskIds.length > 0
      ? `${completedTaskIds.length} completed task${completedTaskIds.length !== 1 ? "s" : ""} (${truncate(completedTaskIds.join(", "), 100)})`
      : null,
    activeTaskIds.length > 0
      ? `${activeTaskIds.length} active task heartbeat${activeTaskIds.length !== 1 ? "s" : ""} refreshed (${truncate(activeTaskIds.join(", "), 100)})`
      : null,
    editCounter.enginesWritten.length > 0
      ? `${editCounter.enginesWritten.length} engines (${truncate(enginesDone, 100)})`
      : null,
    editCounter.testFilesWritten.length > 0
      ? `${editCounter.testFilesWritten.length} test files`
      : null,
    `Resume: ${resumeSnippet}`,
  ]
    .filter(Boolean)
    .join(". ");

  const args = [
    PATHS.roadmapSync,
    "sync",
    "--agent", identity.family,
    "--agent-instance", identity.instance,
    "--note", noteText,
    "--current", stateSnippet || "unknown",
    "--next", resumeSnippet || "unknown",
    "--status", "compacting",
  ];

  if (doneText) {
    args.push("--done", doneText);
  }

  return execFileAsync(NODE_EXECUTABLE, args, {
    timeout: 5000,
    windowsHide: true,
    env: { ...process.env },
  });
}

async function runTaskQueueCompactSync(identity) {
  return execFileAsync(NODE_EXECUTABLE, [
    PATHS.taskQueue,
    "compact-sync",
    "--agent-family",
    identity.family,
    "--agent-instance",
    identity.instance,
  ], {
    timeout: 10000,
    windowsHide: true,
    env: { ...process.env },
  });
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // Consume stdin (hook protocol requires reading it even if unused)
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }

  const parsedArgs = parseArgs(process.argv.slice(2));
  const identity = inferIdentity(parsedArgs);

  // Read all three data sources in parallel
  const [handoff, editCounter, psi] = await Promise.all([
    readHandoff(),
    readEditCounter(),
    readPsi(),
  ]);

  const taskSync = {
    active_refreshed_count: 0,
    active_refreshed: [],
    reconciled_count: 0,
    reconciled: [],
    reconciled_records: [],
  };
  const errors = [];

  try {
    const compactSyncResult = await runTaskQueueCompactSync(identity);
    if (compactSyncResult?.stderr?.trim()) {
      errors.push(`task-queue-compact-sync stderr: ${compactSyncResult.stderr.trim()}`);
    }
    if (compactSyncResult?.stdout?.trim()) {
      const parsed = JSON.parse(compactSyncResult.stdout.trim());
      taskSync.active_refreshed_count = parsed.active_refreshed_count ?? 0;
      taskSync.active_refreshed = Array.isArray(parsed.active_refreshed) ? parsed.active_refreshed : [];
      taskSync.reconciled_count = parsed.reconciled_count ?? 0;
      taskSync.reconciled = Array.isArray(parsed.reconciled) ? parsed.reconciled : [];
      taskSync.reconciled_records = Array.isArray(parsed.reconciled_records) ? parsed.reconciled_records : [];
    }
  } catch (error) {
    errors.push(`task-queue-compact-sync: ${error instanceof Error ? error.message : String(error)}`);
  }

  const message = buildSummaryMessage(editCounter, psi, handoff, taskSync);

  // Run coordination updates after the compact-specific task sync so roadmap state can include completions
  const results = await Promise.allSettled([
    runAgentCoordination(identity, editCounter, handoff, message, taskSync),
    runRoadmapSync(identity, editCounter, handoff, taskSync),
  ]);

  const labels = ["agent-coordination", "roadmap-sync"];
  let taskSyncMsg = "";
  if (taskSync.reconciled_count > 0) {
    taskSyncMsg += ` | Completed ${taskSync.reconciled_count} tasks: ${taskSync.reconciled.join(", ")}`;
  }
  if (taskSync.active_refreshed_count > 0) {
    taskSyncMsg += ` | Refreshed ${taskSync.active_refreshed_count} active task heartbeats: ${taskSync.active_refreshed.map((task) => task.id).join(", ")}`;
  }

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const label = labels[i] || `step-${i}`;
    if (result.status === "rejected") {
      errors.push(`${label}: ${result.reason?.message ?? String(result.reason)}`);
    } else if (result.value?.stderr?.trim()) {
      errors.push(`${label} stderr: ${result.value.stderr.trim()}`);
    }
  }

  if (errors.length > 0) {
    process.stderr.write(`[coordination-sync] Warnings: ${errors.join(" | ")}\n`);
  }

  // Build the compact summary for the systemMessage
  const engineCount = editCounter.enginesWritten.length;
  const testCount = editCounter.testFilesWritten.length;
  const shortSummary = [
    `${editCounter.editCount} edits`,
    engineCount > 0 ? `${engineCount} engines` : null,
    testCount > 0 ? `${testCount} tests` : null,
    taskSync.reconciled_count > 0 ? `${taskSync.reconciled_count} tasks completed` : null,
    taskSync.active_refreshed_count > 0 ? `${taskSync.active_refreshed_count} task heartbeat${taskSync.active_refreshed_count !== 1 ? "s" : ""}` : null,
    `Psi=${psi}%`,
  ]
    .filter(Boolean)
    .join(", ");

  // Output hook result — must be valid JSON with "continue": true
  const hookOutput = {
    systemMessage: `Coordination synced: ${shortSummary}${taskSyncMsg}`,
    continue: true,
  };

  process.stdout.write(JSON.stringify(hookOutput));
}

main().catch((error) => {
  // Coordination sync must NEVER block compaction
  process.stderr.write(
    `[coordination-sync] Fatal error: ${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.stdout.write(JSON.stringify({ continue: true }));
});
