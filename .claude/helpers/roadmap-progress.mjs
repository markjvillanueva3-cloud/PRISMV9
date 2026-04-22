#!/usr/bin/env node
/**
 * roadmap-progress.mjs — Auto-update PRISM Unified Master Roadmap on completion triggers
 *
 * Usage:
 *   node roadmap-progress.mjs mark --unit "L0-B1-U01" --status complete
 *   node roadmap-progress.mjs mark --branch "L0-B1" --status complete
 *   node roadmap-progress.mjs status                    # show current progress
 *   node roadmap-progress.mjs next                      # show next available unit
 *
 * Called by Notification hook when Claude says "UNIT COMPLETE" or "BRANCH COMPLETE"
 */

import { readFileSync, writeFileSync, existsSync, renameSync, unlinkSync } from "fs";
import { randomBytes } from "crypto";
import { resolve } from "path";

// Atomic write — tmp + rename. Roadmap + position files are read/written
// from multiple concurrent terminals; raw writeFileSync risks torn writes.
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
const POSITION_PATH = resolve("H:/prism/state/CURRENT_POSITION.md");
const PROGRESS_PATH = resolve("H:/prism/state/ROADMAP_PROGRESS.json");

// ── Load / save progress JSON ────────────────────────────────────────────────
function loadProgress() {
  if (existsSync(PROGRESS_PATH)) {
    try { return JSON.parse(readFileSync(PROGRESS_PATH, "utf8")); }
    catch { /* fall through */ }
  }
  return { updated: new Date().toISOString(), completed_units: [], completed_branches: [], current_branch: null, current_unit: null };
}

function saveProgress(p) {
  p.updated = new Date().toISOString();
  atomicWriteSync(PROGRESS_PATH, JSON.stringify(p, null, 2));
}

// ── Mark unit/branch complete ────────────────────────────────────────────────
function markUnit(unitId) {
  const p = loadProgress();
  if (!p.completed_units.includes(unitId)) {
    p.completed_units.push(unitId);
  }
  // Advance current_unit pointer
  p.current_unit = unitId;
  saveProgress(p);

  // Update roadmap markdown — add checkmark
  updateRoadmapMark(unitId);

  return { ok: true, action: "unit_complete", unit: unitId, total_complete: p.completed_units.length };
}

function markBranch(branchId) {
  const p = loadProgress();
  if (!p.completed_branches.includes(branchId)) {
    p.completed_branches.push(branchId);
  }
  p.current_branch = branchId;
  saveProgress(p);

  // Update roadmap markdown
  updateRoadmapBranchMark(branchId);

  // Update CURRENT_POSITION.md
  updatePosition(branchId);

  return { ok: true, action: "branch_complete", branch: branchId, total_branches: p.completed_branches.length };
}

// ── Update roadmap .md with completion marks ─────────────────────────────────
function updateRoadmapMark(unitId) {
  if (!existsSync(ROADMAP_PATH)) return;
  let content = readFileSync(ROADMAP_PATH, "utf8");

  // Match pattern like "- U01:" or "- U02:" and prepend checkmark
  // Extract unit number from full ID like "L0-B1-U01" → "U01"
  const parts = unitId.split("-");
  const unitNum = parts[parts.length - 1]; // e.g., "U01"
  const branchId = parts.slice(0, 2).join("-"); // e.g., "L0-B1"

  // Find the branch section and mark the unit
  // Use (?:.|\n) for cross-line matching (template literal [\s\S] unreliable in new RegExp)
  const branchPattern = new RegExp(`(## Branch ${branchId}(?:.|\\n)*?)(- ${unitNum}:)`);
  const match = content.match(branchPattern);
  if (match) {
    content = content.replace(branchPattern, `$1- [x] ~~${unitNum}~~:`);
    atomicWriteSync(ROADMAP_PATH, content);
  }
}

function updateRoadmapBranchMark(branchId) {
  if (!existsSync(ROADMAP_PATH)) return;
  let content = readFileSync(ROADMAP_PATH, "utf8");

  // Add COMPLETE marker to branch header
  const headerPattern = new RegExp(`(## Branch ${branchId}:.*)`, "m");
  const match = content.match(headerPattern);
  if (match && !match[1].includes("COMPLETE")) {
    content = content.replace(headerPattern, `$1 [COMPLETE]`);
    atomicWriteSync(ROADMAP_PATH, content);
  }
}

function updatePosition(branchId) {
  // Parse branch to determine next branch
  const layerMatch = branchId.match(/L(\d+)-B(\d+)/);
  if (!layerMatch) return;
  const layer = parseInt(layerMatch[1]);
  const branch = parseInt(layerMatch[2]);

  // Patch existing CURRENT_POSITION.md instead of overwriting
  if (existsSync(POSITION_PATH)) {
    let content = readFileSync(POSITION_PATH, "utf8");
    // Update the "Phase:" line if it exists
    if (content.includes("**Phase:**")) {
      content = content.replace(/\*\*Phase:\*\*.*/, `**Phase:** L${layer}-B${branch + 1} (after completing ${branchId})`);
    }
    // Update the date
    content = content.replace(/## Updated: \d{4}-\d{2}-\d{2}/, `## Updated: ${new Date().toISOString().split("T")[0]}`);
    // Append roadmap progress if not present
    if (!content.includes("## Unified Roadmap Progress")) {
      content += `\n## Unified Roadmap Progress\n**Last Completed:** ${branchId}\n**Next:** L${layer}-B${branch + 1} (or L${layer + 1}-B1 if layer complete)\n`;
    } else {
      content = content.replace(/\*\*Last Completed:\*\*.*/, `**Last Completed:** ${branchId}`);
      content = content.replace(/\*\*Next:\*\*.*/, `**Next:** L${layer}-B${branch + 1} (or L${layer + 1}-B1 if layer complete)`);
    }
    atomicWriteSync(POSITION_PATH, content);
  } else {
    // Only create new if missing
    const posContent = `# CURRENT POSITION\n## Updated: ${new Date().toISOString().split("T")[0]}\n\n**Roadmap:** PRISM-UNIFIED-MASTER-ROADMAP.md\n\n## Unified Roadmap Progress\n**Last Completed:** ${branchId}\n**Next:** L${layer}-B${branch + 1} (or L${layer + 1}-B1 if layer complete)\n**Build:** PASS\n`;
    writeFileSync(POSITION_PATH, posContent);
  }
}

// ── Show status ──────────────────────────────────────────────────────────────
function showStatus() {
  const p = loadProgress();
  return {
    ok: true,
    completed_units: p.completed_units.length,
    completed_branches: p.completed_branches.length,
    current_branch: p.current_branch,
    current_unit: p.current_unit,
    updated: p.updated,
    branches: p.completed_branches,
  };
}

// ── Find next unit ───────────────────────────────────────────────────────────
function findNext() {
  const p = loadProgress();
  if (!existsSync(ROADMAP_PATH)) return { ok: false, error: "Roadmap not found" };

  const content = readFileSync(ROADMAP_PATH, "utf8");

  // Parse all branches and units from the roadmap
  const branchPattern = /## Branch (L\d+-B\d+): (.+)/g;
  let match;
  const branches = [];
  while ((match = branchPattern.exec(content)) !== null) {
    branches.push({ id: match[1], title: match[2].replace(" [COMPLETE]", "") });
  }

  // Find first incomplete branch
  for (const b of branches) {
    if (!p.completed_branches.includes(b.id)) {
      return { ok: true, next_branch: b.id, title: b.title };
    }
  }
  return { ok: true, next_branch: null, message: "All branches complete!" };
}

// ── Extract completion trigger from notification text ─────────────────────────
function parseNotification(text) {
  // Match patterns like:
  //   "UNIT COMPLETE: L0-B1-U01"
  //   "BRANCH COMPLETE: L0-B1"
  //   "finished L0-B1-U01"
  //   "completed L0-B1"
  //   "done with L0-B1-U03"

  const unitMatch = text.match(/(?:UNIT COMPLETE|finished|completed|done with)[:\s]+(L\d+-B\d+-U\d+)/i);
  if (unitMatch) return { type: "unit", id: unitMatch[1] };

  const branchMatch = text.match(/(?:BRANCH COMPLETE|branch finished|branch done)[:\s]+(L\d+-B\d+)/i);
  if (branchMatch) return { type: "branch", id: branchMatch[1] };

  return null;
}

// ── Main ─────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const cmd = args[0];

if (cmd === "mark") {
  const unitIdx = args.indexOf("--unit");
  const branchIdx = args.indexOf("--branch");

  if (unitIdx !== -1 && args[unitIdx + 1]) {
    const result = markUnit(args[unitIdx + 1]);
    console.log(JSON.stringify(result));
  } else if (branchIdx !== -1 && args[branchIdx + 1]) {
    const result = markBranch(args[branchIdx + 1]);
    console.log(JSON.stringify(result));
  } else {
    console.log(JSON.stringify({ ok: false, error: "Provide --unit or --branch" }));
  }
} else if (cmd === "status") {
  console.log(JSON.stringify(showStatus()));
} else if (cmd === "next") {
  console.log(JSON.stringify(findNext()));
} else if (cmd === "parse") {
  // Parse notification text from stdin or arg
  const text = args.slice(1).join(" ") || "";
  if (!text) {
    // Read from stdin
    let input = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => { input += chunk; });
    process.stdin.on("end", () => {
      const parsed = parseNotification(input);
      if (parsed) {
        const result = parsed.type === "unit" ? markUnit(parsed.id) : markBranch(parsed.id);
        console.log(JSON.stringify({ ...result, trigger: parsed }));
      } else {
        console.log(JSON.stringify({ ok: false, noMatch: true }));
      }
    });
  } else {
    const parsed = parseNotification(text);
    if (parsed) {
      const result = parsed.type === "unit" ? markUnit(parsed.id) : markBranch(parsed.id);
      console.log(JSON.stringify({ ...result, trigger: parsed }));
    } else {
      console.log(JSON.stringify({ ok: false, noMatch: true }));
    }
  }
} else {
  console.log(JSON.stringify({
    usage: "roadmap-progress.mjs [mark|status|next|parse]",
    examples: [
      'mark --unit "L0-B1-U01"',
      'mark --branch "L0-B1"',
      "status",
      "next",
      'parse "UNIT COMPLETE: L0-B1-U01"',
    ],
  }));
}
