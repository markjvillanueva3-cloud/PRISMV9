#!/usr/bin/env node
/**
 * pre-write-roadmap-home.mjs — PreToolUse hook
 *
 * Hard-blocks writes of roadmap/milestone/position files to anywhere other
 * than the H: drive (the shared canonical home for cross-machine work).
 *
 * The user's pain: roadmaps were ending up in C:/Users/<...>/ on one machine
 * and never made it to the other. Result: peer chats and Codex sessions on
 * a different PC followed a stale plan.
 *
 * Companion to h-drive-enforcement.mjs (which covers .claude/*) and the
 * stop_on_non_h_roadmap.mjs Stop hook (which catches escapes at session end).
 *
 * What counts as "roadmap-like":
 *   - filename: anything containing ROADMAP plus .md/.json, roadmap-index.json/md,
 *               CURRENT_POSITION.md, name matching X-MS<digits>.json/md, MILESTONE-*.json/md
 *   - directory: any path segment named "milestones" or "roadmap"
 *
 * What counts as "H: home":
 *   - H:/, H:\, /h/, /mnt/h/  (case-insensitive on the drive letter)
 *
 * BLOCKING: yes — PreToolUse decision: "block".
 * BYPASS:   none. If you have a legitimate non-H: reason (e.g. exporting a
 *           public copy), explicitly route through a non-roadmap filename.
 */
import fs from "node:fs";

function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return "";
    return fs.readFileSync(0, "utf-8");
  } catch {
    return "";
  }
}

const ROADMAP_FILE_RE =
  /(?:^|[\\/])(?:[A-Z][A-Z0-9_-]*-?ROADMAP[A-Z0-9_-]*|roadmap-index|CURRENT_POSITION|MILESTONE-[A-Z0-9_-]+|[A-Z][A-Z0-9_-]*-MS\d+)\.(?:md|json)$/i;
const ROADMAP_DIR_RE = /(?:^|[\\/])(?:milestones|roadmap)[\\/]/i;
const H_HOME_RE = /^(?:[Hh]:[\\/]|\/[Hh][\\/]|\/mnt\/[Hh][\\/])/;

function isRoadmapPath(filePath) {
  if (!filePath) return false;
  const norm = String(filePath).replace(/\\/g, "/");
  return ROADMAP_FILE_RE.test(norm) || ROADMAP_DIR_RE.test(norm);
}

function isHHome(filePath) {
  return H_HOME_RE.test(String(filePath).trim());
}

function suggestHPath(filePath) {
  // Best-effort suggestion: replace leading drive letter or /c/ with /h/ equivalent.
  const norm = String(filePath).replace(/\\/g, "/");
  const m =
    norm.match(/^([A-Za-z]):[/](.*)$/) ||
    norm.match(/^\/([a-zA-Z])\/(.*)$/) ||
    norm.match(/^\/mnt\/([a-zA-Z])\/(.*)$/);
  if (!m) return "H:/prism/" + norm.replace(/^\.\.?\//, "");
  return `H:/${m[2]}`;
}

async function main() {
  const input = readStdinSafe();
  let payload;
  try {
    payload = JSON.parse(input);
  } catch {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const toolName = payload.tool_name || payload.toolName || "";
  if (!["Edit", "Write", "MultiEdit"].includes(toolName)) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const toolInput = payload.tool_input || payload.toolInput || {};
  const filePath = toolInput.file_path || toolInput.filePath || "";

  if (!isRoadmapPath(filePath)) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  if (isHHome(filePath)) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const suggested = suggestHPath(filePath);
  console.log(
    JSON.stringify({
      decision: "block",
      reason:
        `ROADMAP HOME ENFORCEMENT — BLOCKED\n\n` +
        `Roadmap/milestone/position files MUST live under H: so every chat ` +
        `and every machine sees the same canonical plan.\n\n` +
        `Attempted target: ${filePath}\n` +
        `Suggested target: ${suggested}\n\n` +
        `If you genuinely need a non-H: copy (e.g. public export), use a ` +
        `non-roadmap filename so this hook does not match.`,
    }),
  );
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
});
