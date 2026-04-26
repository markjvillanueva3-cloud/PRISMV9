#!/usr/bin/env node
/**
 * session-gc.mjs — Garbage collect stale session entries from coordination files
 *
 * Problem: Hook processes create PID-based entries that pollute AGENT_COORDINATION_STATUS.md
 * Solution: Run GC at SessionStart to remove entries older than threshold
 */

import fs from "node:fs";
import path from "node:path";
import { writeAtomicSync } from "./atomic-write.mjs";

const PATHS = {
  coordStatus: "H:/prism/state/shared/AGENT_COORDINATION_STATUS.md",
  activeRegistry: "H:/prism/state/shared/ACTIVE_WORK_REGISTRY.json",
  handoffsDir: "H:/prism/state/shared/handoffs",
  survivalDir: "H:/prism/.claude/helpers",
};

const STALE_HOURS = 6;
const STALE_HOURS_SURVIVAL = 2;  // Survival files are more transient
const STALE_HOURS_HANDOFF = 4;   // Handoffs should be cleaned up relatively quickly

function now() {
  return new Date().toISOString();
}

function isStale(timestamp, hours = STALE_HOURS) {
  if (!timestamp) return true;
  try {
    const age = Date.now() - new Date(timestamp).getTime();
    return age > hours * 60 * 60 * 1000;
  } catch {
    return true;
  }
}

function gcCoordinationStatus() {
  try {
    const content = fs.readFileSync(PATHS.coordStatus, "utf-8");
    const lines = content.split("\n");
    const filteredLines = [];
    let removedCount = 0;
    let inAgentBlock = false;
    let currentBlock = [];
    let blockTimestamp = null;

    for (const line of lines) {
      // Detect agent entry blocks (### Agent-... or similar)
      if (line.startsWith("### Agent-") || line.startsWith("### Claude-") || line.match(/^### \w+@/)) {
        // Process previous block
        if (currentBlock.length > 0) {
          if (!blockTimestamp || !isStale(blockTimestamp)) {
            filteredLines.push(...currentBlock);
          } else {
            removedCount++;
          }
        }
        currentBlock = [line];
        blockTimestamp = null;
        inAgentBlock = true;
        continue;
      }

      if (inAgentBlock) {
        // Look for timestamp in block
        const timeMatch = line.match(/(?:updated|claimed_at|last_active|timestamp)[:\s]+(\d{4}-\d{2}-\d{2}T[\d:.]+Z?)/i);
        if (timeMatch) {
          blockTimestamp = timeMatch[1];
        }

        // End of block detection (empty line or new header)
        if (line.startsWith("## ") || line.startsWith("# ")) {
          // Save current block if not stale
          if (currentBlock.length > 0) {
            if (!blockTimestamp || !isStale(blockTimestamp)) {
              filteredLines.push(...currentBlock);
            } else {
              removedCount++;
            }
          }
          currentBlock = [];
          inAgentBlock = false;
          filteredLines.push(line);
          continue;
        }

        currentBlock.push(line);
        continue;
      }

      filteredLines.push(line);
    }

    // Handle last block
    if (currentBlock.length > 0) {
      if (!blockTimestamp || !isStale(blockTimestamp)) {
        filteredLines.push(...currentBlock);
      } else {
        removedCount++;
      }
    }

    if (removedCount > 0) {
      writeAtomicSync(PATHS.coordStatus, filteredLines.join("\n"));
      return { file: "AGENT_COORDINATION_STATUS.md", removed: removedCount };
    }

    return { file: "AGENT_COORDINATION_STATUS.md", removed: 0 };
  } catch (err) {
    return { file: "AGENT_COORDINATION_STATUS.md", error: err.message };
  }
}

function gcActiveRegistry() {
  try {
    const content = fs.readFileSync(PATHS.activeRegistry, "utf-8");
    const data = JSON.parse(content);

    if (!data.active || !Array.isArray(data.active)) {
      return { file: "ACTIVE_WORK_REGISTRY.json", removed: 0 };
    }

    const before = data.active.length;
    data.active = data.active.filter(entry => !isStale(entry.claimed_at));
    const removed = before - data.active.length;

    if (removed > 0) {
      data.updated = now();
      writeAtomicSync(PATHS.activeRegistry, JSON.stringify(data, null, 2) + "\n");
    }

    return { file: "ACTIVE_WORK_REGISTRY.json", removed };
  } catch (err) {
    return { file: "ACTIVE_WORK_REGISTRY.json", error: err.message };
  }
}

function gcHandoffs() {
  try {
    const files = fs.readdirSync(PATHS.handoffsDir).filter(f => f.startsWith("HANDOFF-"));
    let removed = 0;
    const archiveDir = path.join(PATHS.handoffsDir, "archive");

    for (const file of files) {
      const filePath = path.join(PATHS.handoffsDir, file);
      const stat = fs.statSync(filePath);
      const ageHours = (Date.now() - stat.mtimeMs) / (60 * 60 * 1000);

      if (ageHours > STALE_HOURS_HANDOFF) {
        fs.mkdirSync(archiveDir, { recursive: true });
        fs.renameSync(filePath, path.join(archiveDir, file));
        removed++;
      }
    }

    return { file: "handoffs/*", removed };
  } catch (err) {
    return { file: "handoffs/*", error: err.message };
  }
}

function gcSurvivalFiles() {
  try {
    const files = fs.readdirSync(PATHS.survivalDir).filter(f =>
      f.startsWith(".compaction-survival-Agent-") || f.startsWith(".compaction-survival-Claude-")
    );
    let removed = 0;

    for (const file of files) {
      const filePath = path.join(PATHS.survivalDir, file);
      const stat = fs.statSync(filePath);
      const ageHours = (Date.now() - stat.mtimeMs) / (60 * 60 * 1000);

      // Use shorter threshold for survival files (they're transient per-session)
      if (ageHours > STALE_HOURS_SURVIVAL) {
        fs.unlinkSync(filePath);
        removed++;
      }
    }

    return { file: "survival-files", removed };
  } catch (err) {
    return { file: "survival-files", error: err.message };
  }
}

function main() {
  const results = [
    gcCoordinationStatus(),
    gcActiveRegistry(),
    gcHandoffs(),
    gcSurvivalFiles(),
  ];

  const totalRemoved = results.reduce((sum, r) => sum + (r.removed || 0), 0);

  if (totalRemoved > 0) {
    console.log(`GC: removed ${totalRemoved} stale entries`);
    for (const r of results) {
      if (r.removed > 0) {
        console.log(`  - ${r.file}: ${r.removed}`);
      }
    }
  } else {
    console.log("GC: no stale entries");
  }
}

main().catch(() => { process.stdout.write(JSON.stringify({ continue: true })); });
