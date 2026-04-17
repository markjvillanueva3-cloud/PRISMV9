import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

// CPP-MS3-U-CPP23: Per-terminal compaction survival reader.
// Writers produce `.compaction-survival-<instance>.md` files; this reader
// globs them from SURVIVAL_DIR and picks the freshest one for THIS session,
// falling back to the legacy single `.compaction-survival.md` for
// one-session backward compat.
const SURVIVAL_FILE = "H:\\prism\\.claude\\helpers\\.compaction-survival.md"; // legacy
const SURVIVAL_DIR = "H:\\prism\\.claude\\helpers";
const SURVIVAL_PER_INSTANCE_PREFIX = ".compaction-survival-";
const SURVIVAL_PER_INSTANCE_SUFFIX = ".md";
const HANDOFFS_DIR = "H:\\prism\\state\\shared\\handoffs";
const SESSION_IDS_FILE = path.join(HANDOFFS_DIR, ".current-session-ids.json");
const POSITION_FILE = "H:\\prism\\state\\CURRENT_POSITION.md";
const PRISM_ROOT = "H:\\prism";

// Known placeholder RESUME strings that need fallback generation
const PLACEHOLDER_RESUMES = [
  "compacting — read per-agent handoff on restore",
  "check git log and roadmap for next steps.",
  "true",
  "unknown",
  "",
];

function isPlaceholderResume(resume) {
  if (!resume || resume.trim().length < 15) return true;
  return PLACEHOLDER_RESUMES.includes(resume.toLowerCase().trim());
}

function runGit(args) {
  const result = spawnSync("git", args, {
    cwd: PRISM_ROOT,
    encoding: "utf8",
    windowsHide: true,
  });
  return result.status === 0 ? (result.stdout ?? "").trim() : "";
}

/**
 * Generate a meaningful fallback RESUME when the stored one is a placeholder.
 */
async function generateFallbackResume() {
  const parts = [];

  // Read CURRENT_POSITION.md for phase info
  try {
    const position = await fs.readFile(POSITION_FILE, "utf8");
    const phaseMatch = position.match(/\*\*Phase:\*\*\s*(.+)/);
    if (phaseMatch?.[1]) {
      parts.push(`Phase: ${phaseMatch[1].trim()}`);
    }
    // Find in-progress milestones
    const lines = position.split(/\r?\n/);
    const inProgress = [];
    for (const line of lines) {
      if (line.includes("in progress") || line.includes("in_progress")) {
        const idMatch = line.match(/\b([A-Z][\w-]+-MS\w+)/);
        if (idMatch) inProgress.push(idMatch[1]);
      }
    }
    if (inProgress.length > 0) {
      parts.push(`In-progress: ${inProgress.slice(0, 3).join(", ")}`);
    }
  } catch { /* position file unavailable */ }

  // Recent git commits
  const recentCommits = runGit(["log", "--oneline", "-3", "--since=8 hours ago"]);
  if (recentCommits) {
    parts.push(`Last work: ${recentCommits.split("\n")[0]}`);
  }

  if (parts.length === 0) {
    const anyCommit = runGit(["log", "--oneline", "-1"]);
    return `Read CURRENT_POSITION.md and roadmap for next task. Last commit: ${anyCommit || "unknown"}`;
  }

  return parts.join(". ") + ". Check roadmap for next unblocked task.";
}

async function findMyHandoff() {
  try {
    // Find the most recently modified handoff file — that's likely ours
    const files = await fs.readdir(HANDOFFS_DIR);
    const handoffs = [];
    for (const f of files) {
      if (!f.startsWith("HANDOFF-") || !f.endsWith(".md")) continue;
      const fp = path.join(HANDOFFS_DIR, f);
      const stat = await fs.stat(fp);
      handoffs.push({ file: f, path: fp, mtime: stat.mtimeMs });
    }
    if (handoffs.length === 0) return null;
    // Sort by most recent
    handoffs.sort((a, b) => b.mtime - a.mtime);
    const newest = handoffs[0];
    const ageMin = Math.round((Date.now() - newest.mtime) / 60000);
    if (ageMin < 30) {
      // Only return if fresh (within 30 min — likely our session)
      const content = await fs.readFile(newest.path, "utf8");

      // Check if RESUME is a placeholder and replace with smart fallback
      const resumeMatch = content.match(/## RESUME\n([\s\S]*?)(?=\n##|\n$)/);
      const resume = resumeMatch?.[1]?.trim() || "";

      if (isPlaceholderResume(resume)) {
        // Generate a meaningful fallback RESUME
        const fallback = await generateFallbackResume();
        const enhanced = content.replace(
          /## RESUME\n[\s\S]*?(?=\n##|\n$)/,
          `## RESUME\n${fallback}\n(auto-generated fallback — /precompact was not run before /compact)`
        );
        return enhanced;
      }

      return content;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * CPP-MS3-U-CPP23: Resolve compaction-survival content from the per-instance
 * directory, falling back to the legacy single file.
 *
 * Strategy:
 *   1. Glob `.compaction-survival-*.md` in SURVIVAL_DIR
 *   2. Pick the freshest file (most recently modified within last 30 min)
 *      — that's our session's pre-compact write
 *   3. If none are fresh, fall back to legacy `.compaction-survival.md`
 *   4. If file is older than ~30 min, treat as stale but still readable
 */
async function readCompactionSurvival() {
  try {
    const entries = await fs.readdir(SURVIVAL_DIR);
    const perInstance = [];
    for (const name of entries) {
      if (!name.startsWith(SURVIVAL_PER_INSTANCE_PREFIX)) continue;
      if (!name.endsWith(SURVIVAL_PER_INSTANCE_SUFFIX)) continue;
      const fp = path.join(SURVIVAL_DIR, name);
      try {
        const stat = await fs.stat(fp);
        perInstance.push({ file: name, path: fp, mtime: stat.mtimeMs });
      } catch {
        // Skip unreadable entries.
      }
    }
    if (perInstance.length > 0) {
      perInstance.sort((a, b) => b.mtime - a.mtime);
      const freshest = perInstance[0];
      const ageMin = Math.round((Date.now() - freshest.mtime) / 60000);
      const content = await fs.readFile(freshest.path, "utf8");
      const header = ageMin < 30
        ? `## Compaction Survival (per-instance: ${freshest.file}, ${ageMin}m ago)\n`
        : `## Compaction Survival (per-instance: ${freshest.file}, stale ${ageMin}m)\n`;
      return header + content;
    }
  } catch {
    // Directory unreadable — fall through to legacy.
  }
  try {
    return await fs.readFile(SURVIVAL_FILE, "utf8");
  } catch {
    return null;
  }
}

async function main() {
  const parts = [];

  // 1. Read compaction survival (per-instance preferred, legacy fallback)
  const survival = await readCompactionSurvival();
  if (survival !== null) {
    parts.push(survival);
  } else {
    parts.push("No compaction survival data.");
  }

  // 2. Read per-session handoff (with smart RESUME fallback)
  const handoff = await findMyHandoff();
  if (handoff) {
    parts.push("\n## Per-Session Handoff (your session):");
    parts.push(handoff);
  } else {
    // No fresh handoff found — generate a standalone RESUME
    const fallback = await generateFallbackResume();
    parts.push("\n## Per-Session Handoff (auto-generated — no fresh handoff found):");
    parts.push(`## RESUME\n${fallback}`);
  }

  // 3. Read SESSION_ARTIFACTS.json for Feature Cascade
  try {
    const artifacts = await fs.readFile("H:\\prism\\state\\shared\\SESSION_ARTIFACTS.json", "utf8");
    const data = JSON.parse(artifacts);
    if (data.recent_additions) {
      const ra = data.recent_additions;
      const items = [];
      if (ra.new_engines?.length) items.push(`${ra.new_engines.length} new engines: ${ra.new_engines.join(", ")}`);
      if (ra.new_hooks?.length) items.push(`${ra.new_hooks.length} new hooks: ${ra.new_hooks.join(", ")}`);
      if (ra.new_skills?.length) items.push(`${ra.new_skills.length} new skills: ${ra.new_skills.join(", ")}`);
      if (items.length > 0) {
        parts.push("\n## Feature Cascade (from prior session):");
        parts.push(items.join("\n"));
      }
    }
  } catch { /* no artifacts */ }

  process.stdout.write(parts.join("\n"));
}

main().catch(() => {
  process.stdout.write("No compaction data");
});
