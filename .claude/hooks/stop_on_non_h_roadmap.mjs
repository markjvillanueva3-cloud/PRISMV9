#!/usr/bin/env node
/**
 * stop_on_non_h_roadmap.mjs — Stop Hook
 *
 * Defense-in-depth companion to pre-write-roadmap-home.mjs (PreToolUse).
 * PreToolUse blocks writes BEFORE they happen. This Stop hook catches roadmap
 * files that slipped through (subagents, scripts, tools outside the matcher)
 * AT SESSION END.
 *
 * Scans well-known non-H: locations for roadmap-like files and blocks Stop
 * if any are found. The user must explicitly move/delete them.
 *
 * Scoped scan locations (kept narrow to avoid blowing up Stop latency):
 *   - C:/Users/[user]/Desktop/
 *   - C:/Users/[user]/Documents/
 *   - C:/temp, D:/temp
 *
 * Output:
 *   - No violations → exit 0 with {"continue": true}
 *   - Violations    → {"continue": false, "reason": ...}
 */
import { readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROADMAP_FILE_RE =
  /(?:^|[\\/])(?:[A-Z][A-Z0-9_-]*-?ROADMAP[A-Z0-9_-]*|roadmap-index|CURRENT_POSITION|MILESTONE-[A-Z0-9_-]+|[A-Z][A-Z0-9_-]*-MS\d+)\.(?:md|json)$/i;
const MAX_DEPTH = 3;
const REPORT_LIMIT = 8;

function walk(dir, cb, depth = 0) {
  if (depth > MAX_DEPTH) return;
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    try {
      if (entry.isDirectory()) {
        walk(full, cb, depth + 1);
      } else if (entry.isFile()) {
        cb(full);
      }
    } catch {
      // ignore permission errors
    }
  }
}

function getScanRoots() {
  const roots = [];
  try {
    const userHomes = readdirSync("C:/Users", { withFileTypes: true })
      .filter((d) => d.isDirectory() && !d.name.startsWith(".") && d.name !== "Public");
    for (const home of userHomes) {
      const base = join("C:/Users", home.name);
      for (const sub of ["Desktop", "Documents"]) {
        const target = join(base, sub).replace(/\\/g, "/");
        if (existsSync(target)) roots.push(target);
      }
    }
  } catch {
    // C:/Users not enumerable — give up on that branch
  }
  for (const tmp of ["C:/temp", "D:/temp"]) {
    if (existsSync(tmp)) roots.push(tmp);
  }
  return roots;
}

function findOrphanRoadmaps() {
  const orphans = [];
  for (const root of getScanRoots()) {
    walk(root, (file) => {
      const norm = file.replace(/\\/g, "/");
      if (ROADMAP_FILE_RE.test(norm)) orphans.push(norm);
    });
  }
  return orphans;
}

async function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", () => resolve(""));
  });
}

async function main() {
  try {
    JSON.parse(await readStdin());
  } catch {
    // tolerate missing stdin
  }

  const orphans = findOrphanRoadmaps();
  if (orphans.length === 0) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const shown = orphans.slice(0, REPORT_LIMIT);
  const extra =
    orphans.length > REPORT_LIMIT ? `\n  ...(${orphans.length - REPORT_LIMIT} more)` : "";

  console.log(
    JSON.stringify({
      continue: false,
      reason:
        `ROADMAP HOME VIOLATION — ${orphans.length} roadmap/milestone file(s) ` +
        `found outside H: this session. Plans/roadmaps must live on H: so ` +
        `every chat and every machine sees the same canonical plan.\n` +
        `Orphans:\n  - ${shown.join("\n  - ")}${extra}\n` +
        `Fix: move each file to H:/prism/ (or H:/prism/mcp-server/data/milestones/ ` +
        `for envelopes) and delete the non-H: copy. Or rename it so it does not ` +
        `match the roadmap pattern.`,
    }),
  );
}

main().catch(() => {
  // Never break Stop on our own errors — fail open.
  console.log(JSON.stringify({ continue: true }));
});
