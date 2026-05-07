#!/usr/bin/env node
/**
 * roadmap-to-queue.mjs — Sync PRISM Unified Master Roadmap → TASK_QUEUE.md
 *
 * Parses the roadmap, generates task entries for each unit,
 * merges with existing queue (dedup), and writes back.
 *
 * Usage:
 *   node roadmap-to-queue.mjs sync       # full sync
 *   node roadmap-to-queue.mjs diff       # show what would be added (dry run)
 *   node roadmap-to-queue.mjs count      # count units in roadmap
 */

import { readFileSync, writeFileSync, existsSync, renameSync, unlinkSync } from "fs";
import { randomBytes } from "crypto";
import { resolve } from "path";

function atomicWriteSync(filePath, data) {
  const tmpPath = `${filePath}.${process.pid}.${randomBytes(4).toString("hex")}.tmp`;
  try {
    writeFileSync(tmpPath, data);
    renameSync(tmpPath, filePath);
  } catch (err) {
    try { unlinkSync(tmpPath); } catch { /* tmp may not exist */ }
    throw err;
  }
}

const ROADMAP_PATH = resolve("H:/prism/PRISM-UNIFIED-MASTER-ROADMAP.md");
const QUEUE_PATH = resolve("H:/prism/state/shared/TASK_QUEUE.md");
const QUEUE_JSON_PATH = resolve("H:/prism/state/shared/TASK_QUEUE.json");
const PROGRESS_PATH = resolve("H:/prism/state/ROADMAP_PROGRESS.json");

// ── Parse roadmap into structured tasks ──────────────────────────────────────
function parseRoadmap() {
  const content = readFileSync(ROADMAP_PATH, "utf8");
  const tasks = [];

  // State machine to parse layers → branches → units
  let currentLayer = null;
  let currentLayerTitle = null;
  let currentBranch = null;
  let currentBranchTitle = null;
  let currentSessions = null;
  let currentDeps = null;

  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Match layer headers: # LAYER 0: CLEANUP & STABILIZATION
    const layerMatch = line.match(/^# LAYER (\d+): (.+)/);
    if (layerMatch) {
      currentLayer = parseInt(layerMatch[1]);
      currentLayerTitle = layerMatch[2].trim();

      // Look for dependencies in next few lines
      currentDeps = null;
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        const depMatch = lines[j].match(/Dependencies: (.+)/);
        if (depMatch) {
          currentDeps = depMatch[1].trim();
          break;
        }
      }
      continue;
    }

    // Match branch headers: ## Branch L0-B1: Build Hygiene
    const branchMatch = line.match(/^## Branch (L\d+-B\d+): (.+)/);
    if (branchMatch) {
      currentBranch = branchMatch[1];
      currentBranchTitle = branchMatch[2].replace(" [COMPLETE]", "").trim();

      // Look for sessions/units count
      const nextLine = lines[i + 1] || "";
      const sessMatch = nextLine.match(/Units: (\d+)\s*\|\s*Sessions: (\d+)/);
      currentSessions = sessMatch ? parseInt(sessMatch[2]) : 1;
      continue;
    }

    // Match units: - U01: description  OR  - [x] ~~U01~~: description (completed)
    const unitMatch = line.match(/^- (?:\[x\] ~~)?(U\d+)(?:~~)?:\s*(.+)/);
    if (unitMatch && currentBranch) {
      const unitNum = unitMatch[1];
      const desc = unitMatch[2].trim();
      const taskId = `${currentBranch}-${unitNum}`;

      // Priority based on layer (L0=P0, L1=P1, etc.)
      const priority = currentLayer;

      // Determine family (Claude for backend, Codex for frontend)
      const family = currentLayer >= 7 ? "Codex" : "Claude";

      // Blocked by previous layer completion
      const blockedBy = currentDeps && currentDeps !== "None"
        ? currentDeps
        : currentLayer > 0 ? `L${currentLayer - 1}` : null;

      tasks.push({
        id: taskId,
        branch: currentBranch,
        branchTitle: currentBranchTitle,
        layer: currentLayer,
        layerTitle: currentLayerTitle,
        unit: unitNum,
        description: desc,
        priority,
        family,
        sessions: currentSessions,
        blockedBy,
      });
    }
  }

  return tasks;
}

// ── Load existing queue to detect duplicates ─────────────────────────────────
function loadExistingIds() {
  if (!existsSync(QUEUE_PATH)) return new Set();
  const content = readFileSync(QUEUE_PATH, "utf8");
  const ids = new Set();
  const idPattern = /\*\*([A-Z0-9-]+)\*\*/g;
  let match;
  while ((match = idPattern.exec(content)) !== null) {
    ids.add(match[1]);
  }
  return ids;
}

// ── Load progress to mark completed ──────────────────────────────────────────
function loadProgress() {
  if (existsSync(PROGRESS_PATH)) {
    try { return JSON.parse(readFileSync(PROGRESS_PATH, "utf8")); }
    catch { /* fall through */ }
  }
  return { completed_units: [], completed_branches: [] };
}

// ── Generate queue markdown ──────────────────────────────────────────────────
function generateQueue(tasks) {
  const progress = loadProgress();
  const completedUnits = new Set(progress.completed_units);
  const completedBranches = new Set(progress.completed_branches);

  // Separate into completed, available, blocked
  const completed = [];
  const available = [];
  const blocked = [];

  for (const t of tasks) {
    if (completedUnits.has(t.id) || completedBranches.has(t.branch)) {
      completed.push(t);
    } else if (t.layer === 0 || (t.blockedBy && t.blockedBy === "None")) {
      available.push(t);
    } else {
      // Parse actual dependency from blockedBy string
      // Format: "L1 complete" or "L1 complete | PARALLEL-OK with L2"
      // The part BEFORE "PARALLEL-OK" is the real dependency
      let requiredLayer = t.layer - 1; // default: prior layer

      if (t.blockedBy) {
        // Extract "L1 complete" or "L1-B1, L1-B2" from before PARALLEL-OK
        const depPart = t.blockedBy.split("|")[0].trim();
        const layerRef = depPart.match(/L(\d+)/);
        if (layerRef) {
          requiredLayer = parseInt(layerRef[1]);
        }
      }

      const allBlockingComplete = tasks
        .filter(bt => bt.layer === requiredLayer)
        .every(bt => completedUnits.has(bt.id) || completedBranches.has(bt.branch));

      if (allBlockingComplete) {
        available.push(t);
      } else {
        blocked.push(t);
      }
    }
  }

  // Group by branch for readability
  const groupByBranch = (arr) => {
    const groups = {};
    for (const t of arr) {
      if (!groups[t.branch]) groups[t.branch] = { title: t.branchTitle, layer: t.layer, layerTitle: t.layerTitle, tasks: [] };
      groups[t.branch].tasks.push(t);
    }
    return groups;
  };

  let md = `# Task Queue (Unified Master Roadmap)\n\nUpdated: ${new Date().toISOString()}\nSource: PRISM-UNIFIED-MASTER-ROADMAP.md\nTotal: ${tasks.length} units | ${completed.length} complete | ${available.length} available | ${blocked.length} blocked\n\n`;

  // Completed
  md += `## COMPLETED (${completed.length})\n\n`;
  const cGroups = groupByBranch(completed);
  for (const [bid, g] of Object.entries(cGroups)) {
    md += `### ${bid}: ${g.title} (L${g.layer})\n`;
    for (const t of g.tasks) {
      md += `- **${t.id}** (${t.family}, P${t.priority}): ${t.description} -- DONE\n`;
    }
    md += "\n";
  }

  // Available
  md += `## AVAILABLE (${available.length})\n\n`;
  const aGroups = groupByBranch(available);
  for (const [bid, g] of Object.entries(aGroups).sort((a, b) => a[1].layer - b[1].layer)) {
    md += `### ${bid}: ${g.title} (L${g.layer}: ${g.layerTitle})\n`;
    for (const t of g.tasks) {
      md += `- **${t.id}** (${t.family}, P${t.priority}): ${t.description}\n`;
    }
    md += "\n";
  }

  // Blocked
  md += `## BLOCKED (${blocked.length})\n\n`;
  const bGroups = groupByBranch(blocked);
  for (const [bid, g] of Object.entries(bGroups).sort((a, b) => a[1].layer - b[1].layer)) {
    const priorLayerTasks = tasks.filter(pt => pt.layer === g.layer - 1);
    const blockRef = priorLayerTasks.length > 0 ? priorLayerTasks[priorLayerTasks.length - 1].id : `L${g.layer - 1}`;
    md += `### ${bid}: ${g.title} (L${g.layer}: ${g.layerTitle}) [blocks: ${blockRef}]\n`;
    for (const t of g.tasks) {
      md += `- **${t.id}** (${t.family}, P${t.priority}): ${t.description}\n`;
    }
    md += "\n";
  }

  return md;
}

// ── Generate JSON queue for task-queue.mjs compatibility ─────────────────────
function generateJsonQueue(tasks) {
  const progress = loadProgress();
  const completedUnits = new Set(progress.completed_units);
  const completedBranches = new Set(progress.completed_branches);

  const now = new Date().toISOString();

  // Build blocked_by with actual task IDs (last unit of prior layer's last branch)
  const layerLastUnits = {};
  for (const t of tasks) {
    layerLastUnits[t.layer] = t.id; // keeps overwriting, last one wins
  }

  const jsonTasks = tasks.map(t => {
    const isDone = completedUnits.has(t.id) || completedBranches.has(t.branch);
    const isLayer0 = t.layer === 0;

    // blocked_by: reference the last unit of the prior layer
    const blockedByIds = [];
    if (!isLayer0 && t.layer > 0) {
      const priorLayer = t.layer - 1;
      const priorTasks = tasks.filter(pt => pt.layer === priorLayer);
      if (priorTasks.length > 0) {
        // Get last branch of prior layer
        const lastBranch = priorTasks[priorTasks.length - 1].branch;
        const lastBranchTasks = priorTasks.filter(pt => pt.branch === lastBranch);
        if (lastBranchTasks.length > 0) {
          blockedByIds.push(lastBranchTasks[lastBranchTasks.length - 1].id);
        }
      }
    }

    // Determine status
    let status = "available";
    if (isDone) status = "complete";
    else if (blockedByIds.length > 0) {
      const allBlocksDone = blockedByIds.every(bid => completedUnits.has(bid) || tasks.find(bt => bt.id === bid && completedBranches.has(bt.branch)));
      if (!allBlocksDone) status = "blocked";
    }

    return {
      id: t.id,
      title: `${t.branch}: ${t.description.slice(0, 80)}`,
      sprint: `L${t.layer}`,
      owner_family: t.family,
      status,
      blocked_by: blockedByIds,
      claimed_by: null,
      claimed_at: null,
      heartbeat_at: null,
      completed_at: isDone ? now : null,
      completed_by: isDone ? "Claude" : null,
      priority: t.priority,
      estimated_loc: 500,
      files: [],
      description: t.description,
      notes: `Branch: ${t.branch} (${t.branchTitle}). Layer ${t.layer}: ${t.layerTitle}.`,
    };
  });

  return {
    version: "2.0",
    updated: now,
    source: "PRISM-UNIFIED-MASTER-ROADMAP.md",
    total: jsonTasks.length,
    tasks: jsonTasks,
  };
}

// ── Main ─────────────────────────────────────────────────────────────────────
const cmd = process.argv[2];

if (cmd === "count") {
  const tasks = parseRoadmap();
  const byLayer = {};
  for (const t of tasks) {
    byLayer[`L${t.layer}`] = (byLayer[`L${t.layer}`] || 0) + 1;
  }
  console.log(JSON.stringify({ ok: true, total: tasks.length, byLayer }));

} else if (cmd === "diff") {
  const tasks = parseRoadmap();
  const existing = loadExistingIds();
  const newTasks = tasks.filter(t => !existing.has(t.id));
  console.log(JSON.stringify({
    ok: true,
    total_roadmap: tasks.length,
    existing_queue: existing.size,
    new_tasks: newTasks.length,
    sample: newTasks.slice(0, 10).map(t => `${t.id}: ${t.description.slice(0, 60)}`),
  }));

} else if (cmd === "sync") {
  const tasks = parseRoadmap();
  const md = generateQueue(tasks);
  atomicWriteSync(QUEUE_PATH, md);

  // Also write JSON for task-queue.mjs compatibility
  const jsonQueue = generateJsonQueue(tasks);
  atomicWriteSync(QUEUE_JSON_PATH, JSON.stringify(jsonQueue, null, 2));

  console.log(JSON.stringify({
    ok: true,
    total_tasks: tasks.length,
    queue_written: QUEUE_PATH,
    queue_json_written: QUEUE_JSON_PATH,
    byLayer: Object.fromEntries(
      Array.from({ length: 9 }, (_, i) => [`L${i}`, tasks.filter(t => t.layer === i).length])
    ),
  }));

} else {
  console.log(JSON.stringify({
    usage: "roadmap-to-queue.mjs [sync|diff|count]",
    sync: "Generate full task queue from roadmap",
    diff: "Show what would be added (dry run)",
    count: "Count units per layer",
  }));
}
