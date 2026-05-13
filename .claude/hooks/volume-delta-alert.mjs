#!/usr/bin/env node
// tier: T3
/**
 * volume-delta-alert.mjs — U-CUC06 PostToolUse hook
 *
 * Fires after CAD coverage matrix scanner runs. Compares new scan results
 * against the previous matrix snapshot. If any extension has >5% volume
 * change (up or down), emits structured alert to AGENT_CHAT.md so concurrent
 * sessions know the ground truth shifted.
 *
 * Trigger: PostToolUse on Bash when command contains "build-cad-coverage-matrix"
 */

import { readFileSync, writeFileSync, existsSync, statSync, appendFileSync } from "node:fs";
import path from "node:path";

const MATRIX_PATH = "H:/prism/mcp-server/data/state/CAD_COVERAGE_MATRIX.json";
const SNAPSHOT_PATH = "H:/prism/mcp-server/data/state/CAD_COVERAGE_MATRIX_PREV.json";
const AGENT_CHAT_PATH = "H:/prism/state/shared/AGENT_CHAT.md";
const DELTA_THRESHOLD = 0.05; // 5%

function readMatrix(filePath) {
  try {
    if (!existsSync(filePath)) return null;
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function computeDeltas(prev, curr) {
  if (!prev || !curr) return [];

  const prevByExt = new Map();
  for (const entry of prev.byExtension || []) {
    prevByExt.set(entry.ext, entry.count);
  }

  const deltas = [];
  for (const entry of curr.byExtension || []) {
    const prevCount = prevByExt.get(entry.ext) || 0;
    const currCount = entry.count;

    if (prevCount === 0 && currCount > 0) {
      // New extension appeared
      deltas.push({
        ext: entry.ext,
        prevCount: 0,
        currCount,
        deltaPercent: 100,
        type: "new",
      });
    } else if (prevCount > 0) {
      const deltaPercent = Math.abs(currCount - prevCount) / prevCount;
      if (deltaPercent >= DELTA_THRESHOLD) {
        deltas.push({
          ext: entry.ext,
          prevCount,
          currCount,
          deltaPercent: Math.round(deltaPercent * 100),
          type: currCount > prevCount ? "increase" : "decrease",
        });
      }
    }
  }

  // Check for removed extensions
  for (const [ext, prevCount] of prevByExt) {
    const currEntry = (curr.byExtension || []).find(e => e.ext === ext);
    if (!currEntry && prevCount > 0) {
      deltas.push({
        ext,
        prevCount,
        currCount: 0,
        deltaPercent: 100,
        type: "removed",
      });
    }
  }

  return deltas.sort((a, b) => b.deltaPercent - a.deltaPercent);
}

function emitAlert(deltas, prevGen, currGen) {
  const timestamp = new Date().toISOString();
  const deltaSummary = deltas.slice(0, 5).map(d => {
    const arrow = d.type === "increase" ? "↑" : d.type === "decrease" ? "↓" : d.type === "new" ? "🆕" : "❌";
    return `${d.ext}: ${d.prevCount}→${d.currCount} (${arrow}${d.deltaPercent}%)`;
  }).join(", ");

  const alert = `
---
## 🔄 CAD Coverage Volume Shift Detected
**Time:** ${timestamp}
**Previous scan:** ${prevGen}
**Current scan:** ${currGen}
**Deltas (>5%):** ${deltas.length} extensions changed

${deltaSummary}${deltas.length > 5 ? ` +${deltas.length - 5} more` : ""}

> All sessions should re-read CAD_COVERAGE_MATRIX.json for updated ground truth.
---
`;

  try {
    appendFileSync(AGENT_CHAT_PATH, alert);
    return true;
  } catch {
    return false;
  }
}

function saveSnapshot(matrix) {
  try {
    writeFileSync(SNAPSHOT_PATH, JSON.stringify(matrix, null, 2));
  } catch {
    // Ignore snapshot save errors
  }
}

function main() {
  const result = { continue: true, systemMessage: "" };

  try {
    // Read hook input
    let input;
    try {
      input = JSON.parse(readFileSync(0, "utf8"));
    } catch {
      console.log(JSON.stringify(result));
      return;
    }

    // Only fire on Bash commands that ran the scanner
    const toolName = input.tool_name || "";
    const toolInput = input.tool_input || {};
    const command = toolInput.command || "";

    if (toolName !== "Bash" || !command.includes("build-cad-coverage-matrix")) {
      console.log(JSON.stringify(result));
      return;
    }

    // Check if scanner succeeded (tool_response exists and no error)
    const toolResponse = input.tool_response || "";
    if (toolResponse.includes("Error") || toolResponse.includes("error:")) {
      console.log(JSON.stringify(result));
      return;
    }

    // Read current and previous matrices
    const curr = readMatrix(MATRIX_PATH);
    const prev = readMatrix(SNAPSHOT_PATH);

    if (!curr) {
      console.log(JSON.stringify(result));
      return;
    }

    // Compute deltas
    const deltas = computeDeltas(prev, curr);

    if (deltas.length > 0) {
      const prevGen = prev?.generatedAt || "unknown";
      const currGen = curr.generatedAt || "unknown";

      if (emitAlert(deltas, prevGen, currGen)) {
        result.systemMessage = `📊 VOLUME DELTA ALERT: ${deltas.length} CAD extensions changed >5%. Alert posted to AGENT_CHAT.md.`;
      }
    }

    // Save current as snapshot for next comparison
    saveSnapshot(curr);

    console.log(JSON.stringify(result));
  } catch (err) {
    result.systemMessage = `volume-delta-alert: ${err.message}`;
    console.log(JSON.stringify(result));
  }
}

main();
